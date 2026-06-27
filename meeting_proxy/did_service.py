import os
import time
import base64
import requests
from dotenv import load_dotenv

load_dotenv()

# D-ID API endpoint
DID_API_URL = "https://api.d-id.com"

def get_all_api_keys() -> list:
    """
    Returns all available D-ID API keys from .env.
    Tries DID_API_KEY_1, DID_API_KEY_2, DID_API_KEY_3
    and also DID_API_KEY as fallback.
    Filters out empty/missing keys.
    """
    keys = []

    # Try numbered keys first (1-5 for flexibility)
    for i in range(1, 6):
        key = os.getenv(f'DID_API_KEY_{i}')
        if key and key.strip():
            keys.append(key.strip())

    # Also try the main key if not already included
    main_key = os.getenv('DID_API_KEY')
    if main_key and main_key.strip() and main_key not in keys:
        keys.append(main_key.strip())

    print(f"[D-ID] Found {len(keys)} API key(s)")
    return keys

def encode_key(raw_key: str) -> str:
    """
    Base64 encodes a D-ID API key if it contains a colon
    (email:secret format). Already encoded keys are returned
    as-is.
    """
    if ':' in raw_key:
        return base64.b64encode(raw_key.encode()).decode()
    return raw_key

def get_headers(api_key: str) -> dict:
    """Returns request headers for D-ID API."""
    encoded = encode_key(api_key)
    return {
        "Authorization": f"Basic {encoded}",
        "Content-Type": "application/json"
    }

def create_talk_with_key(
    api_key: str,
    image_url: str,
    text: str,
    audio_url: str = None,
    max_retries: int = 3
) -> str:
    """
    Creates a D-ID talk using a specific API key.
    Returns talk ID on success.

    When audio_url is provided, D-ID does lip-sync only (no TTS).
    When audio_url is None, D-ID uses Microsoft TTS (original behavior).

    Retries on transient network errors (ConnectionResetError, etc.)
    Raises exception on permanent failure.
    """
    """
    Creates a D-ID talk using a specific API key.
    Returns talk ID on success.
    Retries on transient network errors (ConnectionResetError, etc.)
    Raises exception on permanent failure.
    """
    headers = get_headers(api_key)

    # Build the payload based on whether we have custom audio
    if audio_url:
        # Audio mode: D-ID only does lip-sync, no TTS
        payload = {
            "source_url": image_url,
            "script": {
                "type": "audio",
                "audio_url": audio_url,
            },
            "config": {
                "fluent": True,
                "pad_audio": 0.0,
                "stitch": True
            }
        }
        print(f"[D-ID] Using custom audio URL for lip-sync")
    else:
        # Text mode: D-ID uses Microsoft TTS (original behavior)
        payload = {
            "source_url": image_url,
            "script": {
                "type": "text",
                "input": text,
                "provider": {
                    "type": "microsoft",
                    "voice_id": "en-US-JennyNeural",
                    "voice_config": {
                        "style": "Friendly"
                    }
                }
            },
            "config": {
                "fluent": True,
                "pad_audio": 0.0,
                "stitch": True
            }
        }

    for attempt in range(max_retries):
        try:
            response = requests.post(
                f"{DID_API_URL}/talks",
                headers=headers,
                json=payload,
                timeout=30
            )

            print(f"[D-ID] Status: {response.status_code}")

            # Check for credit exhaustion
            if response.status_code == 402:
                raise Exception("CREDITS_EXHAUSTED")

            # Check for auth failure
            if response.status_code == 401:
                raise Exception("AUTH_FAILED")

            response.raise_for_status()
            data = response.json()
            return data["id"]

        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout,
                ConnectionResetError) as e:
            wait_time = 5 * (2 ** attempt)  # 5s, 10s, 20s
            print(f"[D-ID] Connection error (attempt {attempt+1}/{max_retries}): {str(e)[:80]}")
            if attempt < max_retries - 1:
                print(f"[D-ID] Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise

        except Exception as e:
            error_msg = str(e)
            if "CREDITS_EXHAUSTED" in error_msg or "AUTH_FAILED" in error_msg:
                raise
            # For other errors, retry
            if attempt < max_retries - 1:
                wait_time = 5 * (2 ** attempt)
                print(f"[D-ID] Error (attempt {attempt+1}/{max_retries}): {error_msg[:80]}")
                print(f"[D-ID] Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise


def poll_talk_with_key(
    api_key: str,
    talk_id: str,
    max_wait: int = 120
) -> str:
    """
    Polls D-ID for talk completion using specific API key.
    Returns result_url when done.
    """
    headers = get_headers(api_key)
    import time as _time
    start_time = _time.time()

    while (_time.time() - start_time) < max_wait:
        response = requests.get(
            f"{DID_API_URL}/talks/{talk_id}",
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        status = data.get("status")

        if status == "done":
            result_url = data.get("result_url")
            audio_url = data.get("audio_url")
            print(f"[D-ID] Video URL: {result_url[:50] if result_url else 'None'}")
            print(f"[D-ID] Audio URL: {audio_url[:50] if audio_url else 'None (embedded)'}")
            return result_url
        elif status == "error":
            raise Exception(f"D-ID talk failed: {data}")

        time.sleep(3)

    raise TimeoutError(f"D-ID video generation timed out after {max_wait}s")

def create_talk(
    image_url: str,
    text: str,
    api_key: str,
    audio_url: str = None
) -> str:
    """
    Creates a D-ID talk using a specific API key.
    """
    return create_talk_with_key(api_key, image_url, text, audio_url=audio_url)

def poll_talk_status(talk_id: str, max_wait: int = 120, api_key: str = None) -> str:
    """
    Polls for talk completion using the provided API key.
    """
    if not api_key:
        keys = get_all_api_keys()
        active_index = int(os.environ.get('DID_ACTIVE_KEY_INDEX', '0'))
        api_key = keys[active_index] if active_index < len(keys) else keys[0]

    return poll_talk_with_key(api_key, talk_id, max_wait)

def generate_avatar_video(
    image_url: str,
    text: str,
    voice_id: str = None
) -> str:
    """
    Main function: generates a talking avatar video.
    Automatically tries all API keys until one works.

    When voice_id is provided:
      1. ElevenLabs generates audio from text
      2. Audio is uploaded to Cloudinary
      3. D-ID creates lip-synced video from audio

    When voice_id is None:
      D-ID uses built-in Microsoft TTS (original behavior).

    Returns the final video URL.
    """
    print(f"[D-ID] Generating video...")
    print(f"[D-ID] Text: {text[:60]}...")

    audio_url = None

    # If user has a custom ElevenLabs voice, generate audio first
    if voice_id:
        try:
            print(f"[D-ID] Using ElevenLabs voice: {voice_id}")

            from elevenlabs_service import generate_speech
            from cloudinary_service import upload_audio

            # Step 1: Generate audio with ElevenLabs
            audio_path = generate_speech(text, voice_id)

            # Step 2: Upload audio to Cloudinary for public URL
            audio_url = upload_audio(audio_path)

            # Step 3: Clean up local audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
                print(f"[D-ID] Cleaned up temp audio file")

        except Exception as e:
            print(f"[D-ID] ElevenLabs failed: {e}")
            print(f"[D-ID] Falling back to Microsoft TTS...")
            audio_url = None  # Fall back to Microsoft TTS

    keys = get_all_api_keys()
    if not keys:
        raise Exception("No D-ID API keys found in .env!")

    last_error = None
    
    # Try the entire generation process with each key
    for i, key in enumerate(keys):
        try:
            print(f"[D-ID] Attempt {i+1}/{len(keys)}: Creating talk...")
            talk_id = create_talk(image_url, text, api_key=key, audio_url=audio_url)
            print(f"[D-ID] Talk ID: {talk_id} — polling...")

            video_url = poll_talk_status(talk_id, api_key=key)
            print(f"[D-ID] Video ready!")
            
            # Save working index
            os.environ['DID_ACTIVE_KEY_INDEX'] = str(i)
            return video_url

        except TimeoutError as e:
            print(f"[D-ID] Key {i+1} timed out (likely expired/no credits). Trying next key...")
            last_error = e
            continue
        except Exception as e:
            error_msg = str(e)
            print(f"[D-ID] Key {i+1} failed: {error_msg[:80]}. Trying next key...")
            last_error = e
            continue

    raise Exception(f"All {len(keys)} D-ID API keys failed. Last error: {str(last_error)[:100]}")

