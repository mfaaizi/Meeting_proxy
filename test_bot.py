"""
Meeting Proxy - Full Project Test Script
Tests all modules one by one and reports results clearly.
Run with: python test_project.py
"""

import os
import sys
import time
import traceback
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# COLORS FOR TERMINAL OUTPUT
# ============================================================
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

def ok(msg):
    print(f"{GREEN}✅ PASS{RESET} — {msg}")

def fail(msg, error=None):
    print(f"{RED}❌ FAIL{RESET} — {msg}")
    if error:
        print(f"         {YELLOW}Error: {error}{RESET}")

def info(msg):
    print(f"{BLUE}ℹ️  INFO{RESET} — {msg}")

def header(msg):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")

# ============================================================
# TEST 1 — ENVIRONMENT VARIABLES
# ============================================================
def test_env():
    header("TEST 1 — Environment Variables (.env)")

    required_keys = [
        "DID_API_KEY",
        "OPENAI_API_KEY",
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
        "GOOGLE_EMAIL",
        "GOOGLE_PASSWORD",
        "MEET_LINK",
    ]

    all_good = True
    for key in required_keys:
        val = os.getenv(key)
        if val and val != f"your_{key.lower()}_here":
            ok(f"{key} is set")
        else:
            fail(f"{key} is missing or placeholder")
            all_good = False

    return all_good

# ============================================================
# TEST 2 — IMPORTS
# ============================================================
def test_imports():
    header("TEST 2 — Package Imports")

    packages = {
        "flask": "Flask",
        "requests": "requests",
        "openai": "OpenAI",
        "cloudinary": "cloudinary",
        "selenium": "selenium",
        "webdriver_manager": "webdriver_manager",
        "webrtcvad": "webrtcvad",
        "pyaudio": "pyaudio",
        "jwt": "PyJWT",
        "dotenv": "python-dotenv",
    }

    all_good = True
    for module, package_name in packages.items():
        try:
            __import__(module)
            ok(f"{package_name} imported")
        except ImportError as e:
            fail(f"{package_name} not installed", str(e))
            all_good = False

    return all_good

# ============================================================
# TEST 3 — FFMPEG
# ============================================================
def test_ffmpeg():
    header("TEST 3 — FFmpeg Installation")

    import subprocess
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            ok(f"FFmpeg found: {version_line}")
            return True
        else:
            fail("FFmpeg returned error")
            return False
    except FileNotFoundError:
        fail("FFmpeg not found in PATH",
             "Install from gyan.dev and add C:\\ffmpeg\\bin to PATH")
        return False
    except Exception as e:
        fail("FFmpeg check failed", str(e))
        return False

# ============================================================
# TEST 4 — CLOUDINARY
# ============================================================
def test_cloudinary():
    header("TEST 4 — Cloudinary Upload")

    try:
        from cloudinary_service import upload_image

        # Create a tiny test image file
        test_image_path = "test_image.jpg"
        import requests
        img_data = requests.get(
            "https://create-images-results.d-id.com/"
            "DefaultPresenters/Noelle_f/image.png",
            timeout=10
        ).content

        with open(test_image_path, 'wb') as f:
            f.write(img_data)

        # Upload to Cloudinary
        with open(test_image_path, 'rb') as f:
            url = upload_image(f)

        os.remove(test_image_path)

        if url and url.startswith("https://"):
            ok(f"Cloudinary upload works")
            info(f"URL: {url[:60]}...")
            return url
        else:
            fail("Cloudinary returned invalid URL")
            return None

    except Exception as e:
        fail("Cloudinary upload failed", str(e))
        return None

# ============================================================
# TEST 5 — OPENAI GPT
# ============================================================
def test_gpt():
    header("TEST 5 — OpenAI GPT-4o")

    try:
        from gpt_service import generate_answer

        answer = generate_answer(
            question="What is your name?",
            context="I am Rafeh, a software engineering student "
                    "working on an AI meeting proxy FYP project."
        )

        if answer and len(answer) > 5:
            ok("GPT-4o responded successfully")
            info(f"Answer: {answer[:100]}...")
            return answer
        else:
            fail("GPT returned empty response")
            return None

    except Exception as e:
        fail("GPT-4o failed", str(e))
        return None

# ============================================================
# TEST 6 — OPENAI WHISPER
# ============================================================
def test_whisper():
    header("TEST 6 — OpenAI Whisper STT")

    try:
        from openai import OpenAI
        import wave
        import struct
        import math

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Generate a silent WAV file for testing
        # (just to check API connectivity)
        test_wav = "test_audio.wav"
        sample_rate = 16000
        duration = 1  # 1 second
        num_samples = sample_rate * duration

        with wave.open(test_wav, 'w') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            # Write near-silent audio (very low amplitude)
            for _ in range(num_samples):
                sample = int(100 * math.sin(
                    2 * math.pi * 440 * _ / sample_rate
                ))
                wf.writeframes(struct.pack('<h', sample))

        with open(test_wav, 'rb') as f:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language="en"
            )

        os.remove(test_wav)
        ok("Whisper API connected successfully")
        info(f"Transcript: '{response.text}' (short audio = ok)")
        return True

    except Exception as e:
        fail("Whisper STT failed", str(e))
        return False

# ============================================================
# TEST 7 — D-ID API
# ============================================================
def test_did(image_url=None):
    header("TEST 7 — D-ID Avatar Generation")

    try:
        from did_service import create_talk, poll_talk_status

        test_url = image_url or (
            "https://create-images-results.d-id.com/"
            "DefaultPresenters/Noelle_f/image.png"
        )

        info("Creating D-ID talk (this takes 15-30 seconds)...")
        talk_id = create_talk(
            test_url,
            "Hello! I am your AI meeting proxy. "
            "I am working correctly."
        )

        if not talk_id:
            fail("D-ID did not return a talk ID")
            return None

        ok(f"Talk created: {talk_id}")
        info("Polling for completion...")

        video_url = poll_talk_status(talk_id, max_wait=90)

        if video_url and video_url.startswith("https://"):
            ok("D-ID video generated successfully")
            info(f"Video URL: {video_url[:60]}...")
            return video_url
        else:
            fail("D-ID did not return video URL")
            return None

    except Exception as e:
        error_str = str(e)
        if "402" in error_str or "credits" in error_str.lower():
            fail("D-ID — Insufficient credits",
                 "Create a new D-ID account for fresh credits")
        elif "high traffic" in error_str.lower():
            fail("D-ID — Server overloaded",
                 "Wait 10-15 minutes and try again")
        elif "400" in error_str:
            fail("D-ID — Bad request (check API key format)")
        else:
            fail("D-ID failed", error_str)
        return None

# ============================================================
# TEST 8 — FFMPEG Y4M CONVERSION
# ============================================================
def test_y4m_conversion(video_url=None):
    header("TEST 8 — FFmpeg MP4 to Y4M Conversion")

    if not video_url:
        info("Skipping Y4M test — no video URL provided")
        info("(D-ID test must pass first)")
        return False

    try:
        import requests
        import subprocess

        mp4_path = "test_avatar.mp4"
        y4m_path = "test_avatar.y4m"

        # Download the video
        info("Downloading avatar video...")
        response = requests.get(video_url, stream=True, timeout=30)
        response.raise_for_status()

        with open(mp4_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        ok(f"Video downloaded ({os.path.getsize(mp4_path)} bytes)")

        # Convert to Y4M
        info("Converting to Y4M...")
        result = subprocess.run([
            "ffmpeg", "-y",
            "-i", mp4_path,
            "-pix_fmt", "yuv420p",
            "-vf", "scale=640:480",
            "-r", "25",
            y4m_path
        ], capture_output=True, text=True)

        if result.returncode == 0 and os.path.exists(y4m_path):
            size = os.path.getsize(y4m_path)
            ok(f"Y4M conversion successful ({size} bytes)")

            # Cleanup
            os.remove(mp4_path)
            os.remove(y4m_path)
            return True
        else:
            fail("Y4M conversion failed", result.stderr[-200:])
            return False

    except Exception as e:
        fail("Y4M conversion error", str(e))
        return False

# ============================================================
# TEST 9 — PYAUDIO MIC
# ============================================================
def test_microphone():
    header("TEST 9 — Microphone (PyAudio)")

    try:
        import pyaudio

        p = pyaudio.PyAudio()
        device_count = p.get_device_count()
        input_devices = []

        for i in range(device_count):
            info_dict = p.get_device_info_by_index(i)
            if info_dict['maxInputChannels'] > 0:
                input_devices.append(info_dict['name'])

        p.terminate()

        if input_devices:
            ok(f"Found {len(input_devices)} microphone(s)")
            for d in input_devices:
                info(f"Mic: {d}")
            return True
        else:
            fail("No microphones found")
            return False

    except Exception as e:
        fail("PyAudio failed", str(e))
        return False

# ============================================================
# TEST 10 — WEBRTCVAD
# ============================================================
def test_vad():
    header("TEST 10 — Voice Activity Detection (webrtcvad)")

    try:
        import webrtcvad
        import struct

        vad = webrtcvad.Vad(2)

        # Generate 30ms of silence at 16kHz
        # 16000 samples/sec * 0.030 sec = 480 samples
        silence = struct.pack('<' + 'h' * 480, *([0] * 480))

        result = vad.is_speech(silence, 16000)
        ok(f"webrtcvad works (silence detected as: {result})")
        return True

    except Exception as e:
        fail("webrtcvad failed", str(e))
        info("Fix: pip install webrtcvad-wheels")
        return False

# ============================================================
# TEST 11 — SELENIUM CHROME
# ============================================================
def test_selenium():
    header("TEST 11 — Selenium Chrome Driver")

    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        from webdriver_manager.chrome import ChromeDriverManager

        info("Launching Chrome (this may take a moment)...")
        options = Options()
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        # Run headless for testing only
        options.add_argument('--headless')

        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(
            service=service,
            options=options
        )

        driver.get("https://www.google.com")
        title = driver.title
        driver.quit()

        if "Google" in title:
            ok("Selenium Chrome works")
            return True
        else:
            fail("Chrome opened but unexpected page")
            return False

    except Exception as e:
        fail("Selenium failed", str(e))
        return False

# ============================================================
# MAIN — RUN ALL TESTS
# ============================================================
def main():
    print(f"\n{'='*60}")
    print("  MEETING PROXY — FULL PROJECT TEST SUITE")
    print(f"{'='*60}")

    results = {}
    cloudinary_url = None
    did_video_url = None

    # Run all tests
    results['env'] = test_env()
    results['imports'] = test_imports()
    results['ffmpeg'] = test_ffmpeg()
    results['cloudinary'] = bool(test_cloudinary())

    # Store cloudinary URL for D-ID test
    cloudinary_url = (
        "https://create-images-results.d-id.com/"
        "DefaultPresenters/Noelle_f/image.png"
    )

    results['gpt'] = bool(test_gpt())
    results['whisper'] = test_whisper()

    did_video_url = test_did(cloudinary_url)
    results['did'] = bool(did_video_url)

    results['y4m'] = test_y4m_conversion(did_video_url)
    results['microphone'] = test_microphone()
    results['vad'] = test_vad()
    results['selenium'] = test_selenium()

    # --------------------------------------------------------
    # FINAL SUMMARY
    # --------------------------------------------------------
    header("FINAL SUMMARY")

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, result in results.items():
        status = f"{GREEN}PASS{RESET}" if result \
            else f"{RED}FAIL{RESET}"
        print(f"  {status} — {test_name.upper()}")

    print(f"\n  Score: {passed}/{total} tests passed")

    if passed == total:
        print(f"\n{GREEN}🎉 ALL TESTS PASSED!"
              f" Your project is fully working!{RESET}")
    else:
        failed = [k.upper() for k, v in results.items() if not v]
        print(f"\n{RED}⚠️  Failed modules: "
              f"{', '.join(failed)}{RESET}")
        print(f"{YELLOW}Fix the failed modules above "
              f"and run this script again.{RESET}")

    print()

if __name__ == "__main__":
    main()