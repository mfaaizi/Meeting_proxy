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
    text: str
) -> str:
    """
    Creates a D-ID talk using a specific API key.
    Returns talk ID on success.
    Raises exception on failure.
    """
    headers = get_headers(api_key)
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

    response = requests.post(
        f"{DID_API_URL}/talks",
        headers=headers,
        json=payload
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

def poll_talk_with_key(
    api_key: str,
    talk_id: str,
    max_wait: int = 90
) -> str:
    """
    Polls D-ID for talk completion using specific API key.
    Returns result_url when done.
    """
    headers = get_headers(api_key)
    elapsed = 0

    while elapsed < max_wait:
        response = requests.get(
            f"{DID_API_URL}/talks/{talk_id}",
            headers=headers
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
        elapsed += 3

    raise TimeoutError("D-ID video generation timed out")

def create_talk(image_url: str, text: str) -> str:
    """
    Creates a D-ID talk with automatic API key fallback.
    Tries all available API keys until one works.
    """
    keys = get_all_api_keys()

    if not keys:
        raise Exception(
            "No D-ID API keys found in .env! "
            "Add DID_API_KEY_1, DID_API_KEY_2 etc."
        )

    last_error = None

    for i, key in enumerate(keys):
        try:
            print(f"[D-ID] Trying API key {i+1}/{len(keys)}...")
            talk_id = create_talk_with_key(key, image_url, text)
            print(f"[D-ID] Talk created with key {i+1}!")

            # Store the working key index for polling
            os.environ['DID_ACTIVE_KEY_INDEX'] = str(i)
            return talk_id

        except Exception as e:
            error_msg = str(e)
            if "CREDITS_EXHAUSTED" in error_msg:
                print(f"[D-ID] Key {i+1} out of credits, trying next...")
                last_error = e
                continue
            elif "AUTH_FAILED" in error_msg:
                print(f"[D-ID] Key {i+1} auth failed, trying next...")
                last_error = e
                continue
            else:
                print(f"[D-ID] Key {i+1} error: {error_msg[:80]}")
                last_error = e
                continue

    raise Exception(
        f"All {len(keys)} D-ID API keys failed. "
        f"Last error: {str(last_error)[:100]}"
    )

def poll_talk_status(talk_id: str, max_wait: int = 90) -> str:
    """
    Polls for talk completion using the active API key.
    Falls back to other keys if needed.
    """
    keys = get_all_api_keys()
    active_index = int(
        os.environ.get('DID_ACTIVE_KEY_INDEX', '0')
    )

    # Try with active key first
    key = keys[active_index] if active_index < len(keys) else keys[0]

    try:
        return poll_talk_with_key(key, talk_id, max_wait)
    except Exception as e:
        print(f"[D-ID] Polling failed with active key: {e}")
        # Try other keys for polling
        for i, k in enumerate(keys):
            if i != active_index:
                try:
                    return poll_talk_with_key(k, talk_id, max_wait)
                except:
                    continue
        raise

def generate_avatar_video(image_url: str, text: str) -> str:
    """
    Main function: generates a talking avatar video.
    Automatically tries all API keys until one works.
    Returns the final video URL.
    """
    print(f"[D-ID] Generating video...")
    print(f"[D-ID] Text: {text[:60]}...")

    talk_id = create_talk(image_url, text)
    print(f"[D-ID] Talk ID: {talk_id} — polling...")

    video_url = poll_talk_status(talk_id)
    print(f"[D-ID] Video ready!")
    return video_url

