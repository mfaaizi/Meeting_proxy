"""
ElevenLabs Text-to-Speech Service
==================================
Provides custom voice synthesis for the D-ID avatar.

Key functions:
  - generate_speech()  → Text → MP3 file on disk
  - list_voices()      → All available voices (premade + cloned)
  - clone_voice()      → Instant voice clone from audio samples
  - delete_voice()     → Remove a cloned voice
  - preview_voice()    → Short audio preview of a voice
"""

import os
import tempfile
import time
from dotenv import load_dotenv

load_dotenv()

# ElevenLabs API key from environment
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

# Default model — Flash v2.5 has the lowest latency (~500ms)
DEFAULT_MODEL = "eleven_flash_v2_5"

# Fallback model if Flash is unavailable
FALLBACK_MODEL = "eleven_multilingual_v2"


def _get_client():
    """
    Creates and returns an ElevenLabs client instance.
    Lazy initialization so the import only happens when needed.
    """
    if not ELEVENLABS_API_KEY:
        raise Exception(
            "ELEVENLABS_API_KEY not set in .env! "
            "Get one at https://elevenlabs.io"
        )

    from elevenlabs.client import ElevenLabs
    return ElevenLabs(api_key=ELEVENLABS_API_KEY)


def generate_speech(
    text: str,
    voice_id: str,
    model: str = DEFAULT_MODEL,
    output_path: str = None
) -> str:
    """
    Converts text to speech using ElevenLabs.

    Args:
        text:        The text to speak.
        voice_id:    ElevenLabs voice ID to use.
        model:       Model ID (default: eleven_flash_v2_5 for speed).
        output_path: Where to save the MP3. Auto-generated if None.

    Returns:
        Path to the saved MP3 file.
    """
    client = _get_client()

    print(f"[ElevenLabs] Generating speech...")
    print(f"[ElevenLabs] Voice: {voice_id}")
    print(f"[ElevenLabs] Model: {model}")
    print(f"[ElevenLabs] Text: {text[:60]}...")

    start = time.time()

    try:
        # Use convert() to get the full audio at once (simpler for file saving)
        audio_generator = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id=model,
            output_format="mp3_44100_128",
        )

        # Collect all chunks into bytes
        audio_bytes = b""
        for chunk in audio_generator:
            if isinstance(chunk, bytes):
                audio_bytes += chunk

    except Exception as e:
        error_msg = str(e)
        # If Flash model fails, try fallback
        if model == DEFAULT_MODEL and "model" in error_msg.lower():
            print(f"[ElevenLabs] Flash model failed, trying fallback...")
            audio_generator = client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id=FALLBACK_MODEL,
                output_format="mp3_44100_128",
            )
            audio_bytes = b""
            for chunk in audio_generator:
                if isinstance(chunk, bytes):
                    audio_bytes += chunk
        else:
            raise

    elapsed = time.time() - start
    print(f"[ElevenLabs] Audio generated in {elapsed:.1f}s "
          f"({len(audio_bytes)} bytes)")

    # Save to file
    if output_path is None:
        # Create a temp file in the project's temp_audio directory
        temp_dir = os.path.join(os.getcwd(), "temp_audio")
        os.makedirs(temp_dir, exist_ok=True)
        output_path = os.path.join(
            temp_dir,
            f"elevenlabs_{int(time.time())}.mp3"
        )

    with open(output_path, "wb") as f:
        f.write(audio_bytes)

    print(f"[ElevenLabs] Saved to: {output_path}")
    return output_path


def list_voices() -> list:
    """
    Returns all voices available on the ElevenLabs account.

    Returns:
        List of dicts with keys:
        - voice_id, name, category, description, preview_url,
          labels (dict with accent, age, gender, etc.)
    """
    client = _get_client()

    print("[ElevenLabs] Fetching voice list...")
    response = client.voices.get_all()

    voices = []
    for v in response.voices:
        # Extract labels safely
        labels = {}
        if hasattr(v, 'labels') and v.labels:
            labels = dict(v.labels) if v.labels else {}

        voices.append({
            "voice_id": v.voice_id,
            "name": v.name,
            "category": getattr(v, 'category', 'premade'),
            "description": getattr(v, 'description', ''),
            "preview_url": getattr(v, 'preview_url', ''),
            "labels": labels,
        })

    print(f"[ElevenLabs] Found {len(voices)} voices")
    return voices


def clone_voice(name: str, audio_files: list) -> dict:
    """
    Creates an instant voice clone from audio sample(s).

    Args:
        name:        Display name for the cloned voice.
        audio_files: List of file paths (MP3/WAV) to use as samples.

    Returns:
        Dict with voice_id, name.
    """
    client = _get_client()

    print(f"[ElevenLabs] Cloning voice '{name}' "
          f"from {len(audio_files)} sample(s)...")

    # Open all audio files as file objects
    file_objects = []
    for path in audio_files:
        file_objects.append(open(path, "rb"))

    try:
        voice = client.voices.add(
            name=name,
            files=file_objects,
            description=f"Custom cloned voice: {name}",
        )

        result = {
            "voice_id": voice.voice_id,
            "name": name,
        }

        print(f"[ElevenLabs] Voice cloned! ID: {voice.voice_id}")
        return result

    finally:
        # Always close file handles
        for f in file_objects:
            f.close()


def delete_voice(voice_id: str) -> bool:
    """
    Deletes a cloned voice from ElevenLabs.

    Args:
        voice_id: The voice ID to delete.

    Returns:
        True if successful.
    """
    client = _get_client()

    print(f"[ElevenLabs] Deleting voice: {voice_id}")
    client.voices.delete(voice_id=voice_id)
    print(f"[ElevenLabs] Voice deleted!")
    return True


def preview_voice(voice_id: str, text: str = None) -> str:
    """
    Generates a short audio preview of a voice.

    Args:
        voice_id: Voice to preview.
        text:     Preview text (default: a standard greeting).

    Returns:
        Path to the preview MP3 file.
    """
    if text is None:
        text = (
            "Hello! This is a preview of how I sound. "
            "I can be your avatar's voice in meetings."
        )

    # Use a short preview text
    if len(text) > 200:
        text = text[:200]

    return generate_speech(
        text=text,
        voice_id=voice_id,
        output_path=os.path.join(
            os.getcwd(),
            "temp_audio",
            f"preview_{voice_id[:8]}.mp3"
        ),
    )
