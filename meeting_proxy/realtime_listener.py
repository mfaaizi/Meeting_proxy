import pyaudio
import wave
import webrtcvad
import collections
import difflib
import io
import os
import threading
import time
import requests
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables (e.g., OPENAI_API_KEY)
load_dotenv()

# ── AUDIO SETTINGS ───────────────────────────────────────────────
# These settings must match webrtcvad's strict requirements.
RATE = 16000          # 16kHz sample rate (required by webrtcvad)
CHANNELS = 1          # Mono audio
CHUNK_DURATION = 30   # milliseconds per chunk (must be 10, 20, or 30)
CHUNK_SIZE = int(RATE * CHUNK_DURATION / 1000)  # samples per chunk
VAD_AGGRESSIVENESS = 3  # Higher = filters out background noise better (0-3)
SILENCE_THRESHOLD = 25  # Lower = faster response (was 35)
MIN_SPEECH_CHUNKS = 8   # More chunks needed for transcription (was 6)
# Set to None to use default mic
# Set to device index number to use specific mic
# Run python -c "import pyaudio; print(pyaudio.PyAudio().get_device_info_by_index(i))" to see device list
# Device [23] = CABLE Output (VB-Audio Point)
# This captures all meeting audio including
# questions asked from phone or other participants
def find_cable_output_index() -> int | None:
    """
    Dynamically scans PyAudio devices to find the index of the 'CABLE Output'
    (VB-Audio Virtual Cable) or 'Stereo Mix' so the bot can capture meeting audio.
    """
    try:
        audio = pyaudio.PyAudio()
        device_count = audio.get_device_count()
        
        # Priority 1: VB-Audio Virtual Cable Output
        for i in range(device_count):
            try:
                info = audio.get_device_info_by_index(i)
                if info.get('maxInputChannels', 0) > 0:
                    name = info.get('name', '').lower()
                    if 'cable output' in name or 'vb-audio virtual' in name:
                        print(f"[STT] Auto-detected VB-Audio Cable at Index {i}: {info.get('name')}")
                        audio.terminate()
                        return i
            except Exception:
                continue
                
        # Priority 2: Stereo Mix (captures system sound directly)
        for i in range(device_count):
            try:
                info = audio.get_device_info_by_index(i)
                if info.get('maxInputChannels', 0) > 0:
                    name = info.get('name', '').lower()
                    if 'stereo mix' in name:
                        print(f"[STT] Auto-detected Stereo Mix at Index {i}: {info.get('name')}")
                        audio.terminate()
                        return i
            except Exception:
                continue
                
        audio.terminate()
    except Exception as e:
        print(f"[STT] Error scanning audio devices: {e}")
    return None

MIC_DEVICE_INDEX = find_cable_output_index()

# We use CABLE Output instead of physical mic because:
# 1. It captures Google Meet audio from all participants
# 2. Questions from phone are heard clearly
# 3. No need to repeat questions multiple times

# ── GLOBAL STATE ─────────────────────────────────────────────────
# Global flag to control the background listening loop
_listening = False
# Reference to the background thread so we can track it if needed
_listen_thread = None

# Trigger words that activate the avatar
# Avatar responds ONLY if one of these is in the question
AVATAR_TRIGGER_WORDS = [
    # Question words — most questions start with these
    "what",
    "how",
    "why",
    "when",
    "where",
    "which",
    "who",
    "are",
    "is",
    "can",
    "could",
    "would",
    "will",
    "do",
    "does",
    "did",
    "have",
    "has",

    # Direct address
    "avatar",
    "rafeh",
    "abdul",
    "proxy",
    "hey",
    "please",

    # Common question starters
    "tell me",
    "explain",
    "describe",
    "elaborate",
    "discuss",
    "talk about",
    "share",
    "give me",
    "show me",
    "define",
    "clarify",

    # Common topics
    "your name",
    "yourself",
    "your fyp",
    "your project",
    "your skills",
    "your experience",
    "technologies",
    "future scope",
    "thank you",
    "thanks",
    "introduce",
    "features",
    "capabilities",
    "grammar",
    "paraphras",
    "synonym",
    "writing",
    "tone",
    "style",
    "summariz",
    "implement",
    "dataset",
    "model",
    "train",
    "specific",
    "primary",
    "include",
    "envision",
    "consider",
    "plan",
]

# Set to True to require trigger words
# Set to False to answer all questions (current behavior)
REQUIRE_TRIGGER_WORD = True

# ── PAUSE SETTINGS (Optimization 2) ──────────────────────────────
# Flag to pause the microphone listener while the avatar is speaking.
# This prevents the bot from re-transcribing its own voice.
_avatar_speaking = False
_last_avatar_end_time = 0
_dynamic_avatar_phrases = []

def set_avatar_speaking(speaking: bool) -> None:
    """
    Updates the speaking flag. When True, the listener skips all audio processing.
    """
    global _avatar_speaking, _last_avatar_end_time
    _avatar_speaking = speaking
    if speaking:
        print("[STT] Pausing listener — avatar is currently speaking.")
    else:
        import time
        _last_avatar_end_time = time.time()
        print("[STT] Resuming listener — avatar finished speaking.")

def add_avatar_phrase(phrase: str) -> None:
    """
    Adds a phrase to the dynamic avatar filter.
    Called after each avatar answer to prevent
    that answer from being re-transcribed as a question.
    """
    global _dynamic_avatar_phrases
    phrase_lower = phrase.lower().strip()
    if phrase_lower and phrase_lower not in _dynamic_avatar_phrases:
        _dynamic_avatar_phrases.append(phrase_lower)
        print(f"[STT] Added dynamic filter: '{phrase_lower[:40]}'")

def is_speech(vad, audio_chunk: bytes) -> bool:
    """
    Uses webrtcvad to check if a specific audio chunk contains speech.
    
    Args:
        vad: The initialized webrtcvad object.
        audio_chunk: Raw audio bytes.
        
    Returns:
        True if the chunk is classified as speech, False if it's silence or an error occurs.
    """
    try:
        # Check if the chunk contains speech using the configured sample rate
        return vad.is_speech(audio_chunk, RATE)
    except Exception:
        # If the chunk is the wrong size or an error occurs, default to silence
        return False

def record_question(callback) -> None:
    """
    Continuously listens to the microphone audio.
    When speech is detected, it starts recording and collects audio chunks.
    When enough silence is detected, it stops recording and triggers the callback.
    
    Args:
        callback: A function to call with the recorded audio bytes (io.BytesIO).
    """
    global _listening

    # Initialize webrtcvad with the chosen aggressiveness level
    vad = webrtcvad.Vad(VAD_AGGRESSIVENESS)

    # Initialize pyaudio to capture data from the microphone
    audio = pyaudio.PyAudio()

    # Try to open the specified device, fallback to default
    stream = None
    devices_to_try = [MIC_DEVICE_INDEX, None]

    for device_index in devices_to_try:
        try:
            stream = audio.open(
                format=pyaudio.paInt16,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK_SIZE,
                input_device_index=device_index
            )
            print(f"[STT] Mic opened successfully (device: {device_index})")
            break
        except Exception as e:
            print(f"[STT] Device {device_index} failed: {e}")
            continue

    if stream is None:
        print("[STT] Could not open any microphone!")
        return

    print("Listening for questions...")

    # A ring buffer to keep recent audio chunks.
    # This helps capture the audio just before speech actually starts,
    # preventing the first fraction of a second from being cut off.
    ring_buffer = collections.deque(maxlen=20)

    # State variables for the recording logic
    triggered = False         # True when we are actively recording speech
    voiced_frames = []        # Collects the audio chunks for the current utterance
    silence_count = 0         # Counts consecutive silent chunks to know when to stop

    while _listening:
        # Read one chunk of audio from the microphone
        try:
            chunk = stream.read(
                CHUNK_SIZE,
                exception_on_overflow=False # Ignore overflow errors if we read too slowly
            )
        except Exception:
            continue # Skip this loop iteration if reading fails

        # Check if this specific chunk contains human speech
        speech_detected = is_speech(vad, chunk)

        if not triggered:
            # We are NOT currently recording.
            # Add the current chunk to our pre-roll ring buffer.
            ring_buffer.append((chunk, speech_detected))

            # Count how many of the recent chunks in the buffer contain speech
            num_voiced = len(
                [f for f, s in ring_buffer if s]
            )

            # If more than 90% of the ring buffer is speech, we should start recording
            if num_voiced > 0.9 * ring_buffer.maxlen:
                triggered = True
                voiced_frames = []
                silence_count = 0

                # Include all audio from the ring buffer so we don't miss the start of the word
                for f, s in ring_buffer:
                    voiced_frames.append(f)

                print("Speech detected — recording...")

        else:
            # We ARE currently recording.
            # Add the new chunk to our growing list of voiced frames.
            voiced_frames.append(chunk)

            # Check if this chunk was silence
            if not speech_detected:
                silence_count += 1
            else:
                silence_count = 0 # Reset silence counter if speech continues

            # If we've seen enough consecutive silent chunks, OR if we've recorded too long, process it
            MAX_SPEECH_CHUNKS = 500 # ~15 seconds max recording
            if silence_count > SILENCE_THRESHOLD or len(voiced_frames) > MAX_SPEECH_CHUNKS:
                triggered = False
                if len(voiced_frames) > MAX_SPEECH_CHUNKS:
                    print("Max recording limit reached — processing...")
                else:
                    print("Silence detected — processing...")

                # Only process the recording if it's long enough to be a real word
                if len(voiced_frames) >= MIN_SPEECH_CHUNKS:
                    # Convert the raw PCM frames into a WAV file format in memory
                    wav_buffer = io.BytesIO()
                    wf = wave.open(wav_buffer, 'wb')
                    wf.setnchannels(CHANNELS)
                    wf.setsampwidth(
                        audio.get_sample_size(pyaudio.paInt16)
                    )
                    wf.setframerate(RATE)
                    # Join all chunks together and write to the WAV buffer
                    wf.writeframes(b''.join(voiced_frames))
                    wf.close()
                    
                    # Rewind the buffer to the beginning so it can be read by the caller
                    wav_buffer.seek(0)

                    # Trigger the callback function, passing the recorded audio data
                    callback(wav_buffer)

                # Reset state for the next question
                voiced_frames = []
                ring_buffer.clear()
                print("Listening for next question...")

    # Cleanup: If the loop exits (listening stopped), release audio resources
    stream.stop_stream()
    stream.close()
    audio.terminate()
    print("Listening stopped.")

def transcribe_audio_bytes(audio_bytes: io.BytesIO) -> str:
    """
    Sends the recorded audio bytes to the OpenAI Whisper API for transcription.
    
    Args:
        audio_bytes: The WAV audio data in memory.
        
    Returns:
        The transcribed text as a string.
    """
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Whisper API expects a file-like object with a 'name' attribute
    audio_bytes.name = "question.wav"

    # Call the Whisper API
    try:
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_bytes,
            language="en" # Hinting English improves speed and accuracy
        )
        # Clean up whitespace from the transcript
        transcript = response.text.strip()
        print(f"Transcribed: {transcript}")
        return transcript
    except Exception as e:
        print(f"[STT] Transcription error (network issue?): {e}")
        return ""

def start_listening(on_question_detected) -> None:
    """
    Starts the continuous listening loop in a background thread.
    
    Args:
        on_question_detected: A callback function that takes a string (the transcript)
                              and is called whenever a question is successfully transcribed.
    """
    global _listening, _listen_thread
    _listening = True

    def listen_and_transcribe():
        """The core loop that runs in the background thread."""
        recent_transcripts = []  # Keep recent transcripts for echo detection

        def on_audio_ready(audio_bytes):
            # Skip if avatar is speaking
            if _avatar_speaking:
                print("[STT] Skipped — avatar speaking")
                return

            # Cooldown after avatar finishes speaking.
            # This prevents CABLE Output from picking up the
            # avatar's own audio as a new question.
            import time as _time
            cooldown_seconds = 4
            time_since_avatar = (
                _time.time() - _last_avatar_end_time
            )
            if time_since_avatar < cooldown_seconds:
                remaining = cooldown_seconds - time_since_avatar
                print(
                    f"[STT] Cooldown active "
                    f"({remaining:.1f}s remaining) — "
                    f"ignoring audio"
                )
                return

            # Check minimum length
            audio_bytes.seek(0, 2)
            size = audio_bytes.tell()
            audio_bytes.seek(0)
            if size < 32000:  # More lenient (was 64000 = 2 seconds)
                print("[STT] Too short — skipping")
                return

            transcript = transcribe_audio_bytes(audio_bytes)
            if not transcript:
                return

            normalized = transcript.lower().strip().rstrip('.')

            # Filter short/noise phrases
            noise_phrases = [
                'you', 'the', 'a', 'um', 'uh', 'hmm',
                'thank you', 'ok', 'okay', 'yes', 'no',
                'bye', 'hello', 'hi', 'hey', 'bye-bye',
                'thanks', 'sure', 'right', 'alright'
            ]

            if normalized in noise_phrases:
                print(f"[STT] Noise filtered: '{transcript}'")
                return

            if len(transcript) < 8:
                print(f"[STT] Too short: '{transcript}'")
                return

            # Check if this is the avatar speaking
            # by checking against known answer patterns
            transcript_lower_check = normalized

            # Skip very short transcripts (noise) — must be at least 5 meaningful words
            if len(transcript.split()) < 5:
                print(f"[STT] Too few words — noise: '{transcript}'")
                return

            # Skip avatar's own answers using phrase detection.
            # Only filter very specific full answer phrases,
            # not short fragments that could appear in user questions.
            avatar_answer_phrases = [
                # These are exact phrases from avatar answers
                # that would be unlikely to appear in user questions.
                "my name is i. i am a software",
                "i am a software engineering student",
                "you are welcome. it was great speaking",
                "it was great speaking with you today",
                "i represent abdul rafeh",
                "tone and style adjustments in sentence rewriting will be implemented",
                "by training the model on diverse datasets",
                "we might incorporate user preferences",
                "found in the context-aware serename",
                "the primary use cases for the writing assistant include",
                "paraphrasing, offering context-aware synonym",
                "making it versatile for both casual and professional",
                "through model fine-tuning",
                "exemplify various tones and styles",
            ]

            for phrase in avatar_answer_phrases:
                # Only filter if the phrase is long enough to be
                # clearly part of an avatar answer, not a user question.
                if (len(phrase) > 20 and
                        phrase.lower() in transcript_lower_check):
                    print(
                        f"[STT] Avatar answer filtered: "
                        f"'{transcript[:50]}'"
                    )
                    return

            word_count = len(transcript.split())
            if word_count > 150:
                print(
                    f"[STT] Long paragraph filtered "
                    f"({word_count} words) — likely echo: "
                    f"'{transcript[:60]}...'"
                )
                return

            # Also check any dynamically added avatar answer phrases.
            all_phrases = (
                avatar_answer_phrases + _dynamic_avatar_phrases
            )
            for phrase in all_phrases:
                if (len(phrase) > 15 and
                        phrase.lower() in transcript_lower_check):
                    print(
                        f"[STT] Avatar answer filtered: "
                        f"'{transcript[:50]}'"
                    )
                    return

            # Echo detection: ignore repeated transcripts that are
            # almost identical to something heard in the last 8 seconds.
            current_time = time.time()
            cutoff = current_time - 8
            recent_transcripts[:] = [
                (ts, text) for ts, text in recent_transcripts
                if ts >= cutoff
            ]

            transcript_lower = normalized
            for ts, previous_text in recent_transcripts:
                similarity = difflib.SequenceMatcher(
                    None,
                    previous_text,
                    transcript_lower
                ).ratio()
                if similarity > 0.90:
                    print(
                        "[STT] Echo detected — skipping similar transcript"
                    )
                    return

            recent_transcripts.append((current_time, transcript_lower))

            # Check if transcript contains a trigger word
            if REQUIRE_TRIGGER_WORD:
                transcript_lower = transcript.lower()
                transcript_words = transcript_lower.split()

                has_trigger = False

                # Check if any trigger word appears in transcript
                for trigger in AVATAR_TRIGGER_WORDS:
                    trigger_lower = trigger.lower()
                    # Simple substring match works better for things like "what's"
                    if trigger_lower in transcript_lower:
                        has_trigger = True
                        print(f"[STT] Trigger word matched: '{trigger}'")
                        break

                if not has_trigger:
                    print(
                        f"[STT] No trigger — ignoring: "
                        f"'{transcript[:50]}'"
                    )
                    return

            print(f"[STT] Valid question: '{transcript}'")
            on_question_detected(transcript)

        # Start the continuous recording loop
        record_question(on_audio_ready)

    # Create a daemon thread so it doesn't block the program from exiting
    _listen_thread = threading.Thread(
        target=listen_and_transcribe,
        daemon=True
    )
    _listen_thread.start()
    print("Listening thread started!")

def stop_listening() -> None:
    """
    Signals the listening loop to stop on its next iteration.
    """
    global _listening
    _listening = False
    print("Stopping listener...")
