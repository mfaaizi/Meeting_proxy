import os
os.environ["PATH"] = r"C:\ffmpeg\bin" + os.pathsep + os.environ.get("PATH", "")
import time
import requests
import subprocess
import threading

# Import the existing service helpers so we don't duplicate their logic.
from gpt_service import generate_answer
from did_service import generate_avatar_video
from dotenv import load_dotenv
from response_library import get_video_for_question

from dotenv import load_dotenv
from response_library import get_video_for_question
from video_utils import download_video, MP4_PATH

# ──────────────────────────────────────────────
# FILE PATHS
# ──────────────────────────────────────────────

# Extra paths if needed for rotating (currently using temp-rename strategy)


# ──────────────────────────────────────────────
# GLOBAL STATE
# ──────────────────────────────────────────────

# Prevents two pipelines from running at the same time.
_pipeline_running = False
_answer_cache = {}
_user_context = ""
_image_url = ""
_voice_id = None

# Track last question to prevent double triggers
_last_question = ""
_last_question_time = 0

# NEW: Maintain a transcript of the current meeting session
_meeting_transcript = []

# ──────────────────────────────────────────────
# SETUP FUNCTIONS
# ──────────────────────────────────────────────

def clear_meeting_transcript() -> None:
    """Resets the transcript for a new meeting."""
    global _meeting_transcript
    _meeting_transcript = []
    print("[Pipeline] Transcript cleared for new meeting.")

def get_meeting_transcript() -> str:
    """Returns formatted transcript of current meeting."""
    global _meeting_transcript
    if not _meeting_transcript:
        return "No questions asked yet"
    lines = []
    for qa in _meeting_transcript:
        lines.append(f"[{qa['timestamp']}] Q: {qa['question']}")
        lines.append(f"A: {qa['answer']}")
        lines.append("")
    return "\n".join(lines)

def set_user_context(context: str, image_url: str, voice_id: str = None) -> None:
    """
    Stores the user's context string, photo URL, and voice_id into globals.

    Call this once before starting the real-time loop so every
    pipeline run has access to the same context and image.

    Args:
        context  : Free-text description of who the user is.
        image_url: Public Cloudinary URL of the user's photo.
        voice_id : ElevenLabs voice ID (optional).
    """
    global _user_context, _image_url, _voice_id

    # Save the context, image URL, and voice_id into the module-level globals.
    _user_context = context
    _image_url = image_url
    _voice_id = voice_id

    # Print the first 50 chars of context so the terminal confirms it was set.
    print(f"[Pipeline] Context set: {context[:50]}...")
    print(f"[Pipeline] Image URL  : {image_url}")
    print(f"[Pipeline] Voice ID   : {voice_id or 'Default (Microsoft)'}")


# ──────────────────────────────────────────────
# VIDEO MATCHING
# ──────────────────────────────────────────────

def get_library_video(transcript: str) -> str | None:
    """
    Finds the best matching video for a question.
    Priority order:
    1. Session-specific videos (from meeting prep) - highest priority
    2. User's custom library videos - personalized responses
    3. Default response library - generic fallback responses
    
    Uses intelligent matching that considers:
    - Exact matches (highest priority)
    - Substring matches
    - Word overlap with common words filtered out
    
    Returns the path to the best matching video, or None if no good match.
    """
    from meet_bot import _session_videos, _current_user_id

    # Convert question to lowercase and remove extra spaces for matching
    transcript_lower = transcript.lower().strip()

    # 1. Check session videos first (prepared for this specific meeting)
    if _session_videos:
        print(f"[Pipeline] Checking {len(_session_videos)} "
              f"session videos...")

        best_match = None
        best_score = 0

        for question, video_path in _session_videos.items():
            # Skip the idle video marker (not a real question)
            if question == '__idle__':
                continue
            # Skip if video file was deleted or moved
            if not os.path.exists(video_path):
                continue

            # Convert stored question to lowercase for comparison
            question_lower = question.lower().strip()
            
            # Calculate how well this stored question matches the asked question
            score = 0

            # Perfect match - user asked exactly what we prepared for
            if question_lower == transcript_lower:
                score = 100
            # User's question is contained in our prepared question
            elif transcript_lower in question_lower:
                score = 80
            # Our prepared question is contained in user's question
            elif question_lower in transcript_lower:
                score = 70
            else:
                # Count overlapping meaningful words (ignore common words)
                transcript_words = set(
                    transcript_lower.split()
                )
                question_words = set(
                    question_lower.split()
                )
                
                # Remove common words that don't help with matching
                stop_words = {
                    'the', 'a', 'an', 'is', 'are', 'was',
                    'were', 'will', 'would', 'could', 'should',
                    'do', 'does', 'did', 'have', 'has', 'had',
                    'i', 'you', 'we', 'they', 'it', 'this',
                    'that', 'what', 'how', 'why', 'when',
                    'where', 'which', 'who', 'can', 'your',
                    'my', 'our', 'their', 'about', 'for',
                    'with', 'in', 'on', 'at', 'to', 'of',
                    'and', 'or', 'but', 'not', 'be', 'been'
                }
                transcript_words -= stop_words
                question_words -= stop_words

                # Calculate similarity based on word overlap
                if transcript_words and question_words:
                    overlap = len(
                        transcript_words & question_words
                    )
                    total = len(
                        transcript_words | question_words
                    )
                    if total > 0:
                        # Scale to 0-60 points for partial matches
                        score = int(
                            (overlap / total) * 60
                        )

            # Keep track of the best match found so far
            if score > best_score:
                best_score = score
                best_match = (question, video_path, score)

        # Only use the match if it's good enough (lowered threshold for better matching)
        if best_match and best_score >= 20:
            question, video_path, score = best_match
            print(
                f"[Pipeline] ✅ SESSION VIDEO MATCH "
                f"(score: {score}/100)\n"
                f"  Q stored: '{question[:60]}'\n"
                f"  Q asked:  '{transcript[:60]}'\n"
                f"  Video:    {os.path.basename(video_path)}"
            )
            return video_path
        else:
            print(
                f"[Pipeline] ❌ No session match "
                f"(best: {best_score}/100)"
            )

    # 2. Check user library — WRAP IN APP CONTEXT to access database
    if _current_user_id:
        try:
            # Import Flask app to get application context for database access
            from app import app as flask_app
            with flask_app.app_context():
                from database import User
                from database import db
                # Get user from database by ID
                user = db.session.get(User, _current_user_id)
                if user:
                    from user_service import (
                        get_video_for_user_question
                    )
                    # Check if user has a custom video for this question
                    path = get_video_for_user_question(
                        user, transcript
                    )
                    if path:
                        print(
                            f"[Pipeline] ✅ USER LIBRARY MATCH\n"
                            f"  Video: {os.path.basename(path)}"
                        )
                        return path
        except Exception as e:
            print(f"[Pipeline] User library error: {e}")

    # 3. Check default response library (built-in generic responses)
    from response_library import get_video_for_question
    result = get_video_for_question(transcript)
    if result:
        print(
            f"[Pipeline] ✅ DEFAULT LIBRARY MATCH\n"
            f"  Video: {os.path.basename(result)}"
        )
    else:
        print(f"[Pipeline] ❌ NO MATCH — generating new video")
    return result


def set_idle_state(image_url: str) -> None:
    """
    Sets avatar to idle state — static photo only.
    No video, no sound, no lip movement.
    Truly passive listening state.
    
    This is better than video because:
    - No audio playback (D-ID always adds voice to videos)
    - No lip movement artifacts
    - Perfect for when avatar should appear to be listening quietly
    """
    from obs_service import set_idle_photo
    import os

    # Always use static photo for idle state
    # This guarantees no sound and no lip movement
    if image_url and image_url.startswith('http'):
        print("[Idle] Setting static photo idle state")
        set_idle_photo(image_url)
    else:
        # Fallback to user's Cloudinary photo if available
        from meet_bot import _user_image_url
        fallback = _user_image_url or image_url
        if fallback:
            print("[Idle] Setting fallback photo idle")
            set_idle_photo(fallback)
        else:
            print("[Idle] No image URL available for idle")


# ──────────────────────────────────────────────
# CORE PIPELINE
# ──────────────────────────────────────────────

def run_realtime_pipeline(transcript: str) -> None:
    global _pipeline_running
    global _answer_cache
    global _user_context
    global _image_url
    global _voice_id
    global _last_question
    global _last_question_time

    from realtime_listener import set_avatar_speaking
    from meet_bot import set_idle_state, _session_videos
    import time as _time

    # GUARD 1: Prevent pipeline running twice at same time.
    if _pipeline_running:
        print("[Pipeline] Already running — skipping")
        return

    # GUARD 2: Prevent same question triggering twice within 30 seconds.
    current_time = _time.time()
    normalized_q = transcript.lower().strip()

    if (normalized_q == _last_question and
            current_time - _last_question_time < 30):
        print(f"[Pipeline] Duplicate ignored: "
              f"'{transcript[:40]}'")
        return

    # Mark pipeline as running exactly once at a single control point.
    _pipeline_running = True
    _last_question = normalized_q
    _last_question_time = current_time

    try:
        # Log the incoming question with clear formatting
        print(f"\n{'='*55}")
        print(f"[Pipeline] 🎤 QUESTION RECEIVED")
        print(f"[Pipeline] Text: '{transcript}'")
        print(f"{'='*55}")

        # Mute listener immediately so avatar doesn't hear itself
        set_avatar_speaking(True)

        # Check for pre-generated video (highest priority)
        # This uses the new get_library_video function for smart matching
        library_video = get_library_video(transcript)

        if library_video:
            print(f"[Pipeline] 📼 USING PRE-GENERATED VIDEO")
            print(f"[Pipeline] File: {library_video}")
            print(f"[Pipeline] No D-ID API call needed ✅")
            # Log to meeting transcript
            _meeting_transcript.append({
                'question': transcript,
                'answer': 'Response from prep session',
                'timestamp': _time.strftime('%H:%M:%S')
            })
            from meet_bot import play_and_wait
            play_and_wait(library_video)
            import time
            time.sleep(0.5)
            from meet_bot import _user_image_url
            set_idle_state(_user_image_url)
            print(f"[Pipeline] ✅ Response complete!")
            return

        # No pre-generated video — must use D-ID API
        print(f"[Pipeline] 🌐 NO PRE-GENERATED VIDEO FOUND")
        print(f"[Pipeline] 💰 Calling D-ID API to generate new video...")

        # Check runtime cache before generating a new video
        cache_key = transcript.lower().strip()
        if cache_key in _answer_cache:
            cached_mp4 = _answer_cache[cache_key]
            if os.path.exists(cached_mp4):
                print(f"[Pipeline] 💾 USING CACHED VIDEO (from previous session)")
                # Log to meeting transcript
                _meeting_transcript.append({
                    'question': transcript,
                    'answer': 'Response from cache',
                    'timestamp': _time.strftime('%H:%M:%S')
                })
                from meet_bot import play_and_wait
                play_and_wait(cached_mp4)
                import time
                time.sleep(0.5)
                from meet_bot import _user_image_url
                set_idle_state(_user_image_url)
                return

        # Generate new response
        print(f"[Pipeline] 🤖 Generating GPT answer...")
        answer = generate_answer(transcript, _user_context)
        print(f"[Pipeline] 💬 Answer: {answer[:80]}...")

        # Add the first part of this answer to the dynamic avatar filter
        # so any echoed answer is ignored by the listener.
        answer_words = answer.split()[:10]
        answer_prefix = ' '.join(answer_words).lower()
        if len(answer_prefix) > 15:
            from realtime_listener import add_avatar_phrase
            add_avatar_phrase(answer_prefix)
            print(
                f"[Pipeline] Added echo filter: "
                f"'{answer_prefix[:40]}'"
            )

        print(f"[Pipeline] 🎬 Creating D-ID video...")

        try:
            video_url = generate_avatar_video(
                _image_url, answer, voice_id=_voice_id
            )
            import hashlib, shutil
            q_hash = hashlib.md5(
                cache_key.encode()
            ).hexdigest()[:8]
            cached_mp4 = os.path.join(
                os.getcwd(), f"cache_{q_hash}.mp4"
            )
            download_video(video_url, cached_mp4)
            shutil.copy2(cached_mp4, MP4_PATH)
            _answer_cache[cache_key] = cached_mp4

            # Log to meeting transcript
            _meeting_transcript.append({
                'question': transcript,
                'answer': answer,
                'timestamp': _time.strftime('%H:%M:%S')
            })

            print(f"[Pipeline] ✅ New video generated and cached!")
            from meet_bot import play_and_wait
            play_and_wait(cached_mp4)
            import time
            time.sleep(0.5)
            from meet_bot import _user_image_url
            set_idle_state(_user_image_url)
            print(f"[Pipeline] ✅ Response complete!")

        except Exception as e:
            print(f"[Pipeline] ❌ D-ID generation failed: {e}")
            # Fallback to first available library video if D-ID fails
            from response_library import load_library_index
            index = load_library_index()
            fallback = None
            for q, path in index.items():
                if os.path.exists(path):
                    fallback = path
                    break
            if fallback:
                print(f"[Pipeline] 🔄 Using fallback video")
                from meet_bot import play_and_wait
                play_and_wait(fallback)
            from meet_bot import _user_image_url
            set_idle_state(_user_image_url)

    except Exception as e:
        import traceback
        print(f"[Pipeline] ERROR: {e}")
        print(traceback.format_exc())

    finally:
        # Keep muted for extra time to let echo die down.
        # Avatar audio plays through CABLE and needs
        # time to stop before we listen again.
        import time as _time
        print("[Pipeline] Waiting for echo to clear...")
        _time.sleep(4)  # Wait 4 seconds after video ends
        set_avatar_speaking(False)
        _pipeline_running = False
        print("[Pipeline] Listener ready for next question!")


def start_realtime_pipeline(transcript: str) -> None:
    """
    Launches run_realtime_pipeline() in a daemon background thread.

    Running the pipeline in a thread means:
    - The listening loop can immediately go back to capturing audio.
    - Flask stays responsive to other HTTP requests.
    - Chrome / Selenium keep running without blocking.

    Args:
        transcript: The detected question text to process.
    """
    print(f"[Pipeline] Queuing pipeline for: '{transcript[:60]}...'")

    # Create a daemon thread so it doesn't block app shutdown.
    thread = threading.Thread(
        target=run_realtime_pipeline,
        args=(transcript,),
        daemon=True
    )
    thread.start()
