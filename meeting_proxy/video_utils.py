import os
import requests
import subprocess

# Paths used across the project
MP4_PATH = os.path.join(os.getcwd(), "avatar_video.mp4")
Y4M_PATH = os.path.join(os.getcwd(), "avatar_video.y4m")

def download_video(video_url: str, save_path: str) -> None:
    """
    Downloads a video from a URL and saves it to disk.
    Verifies audio stream exists after download.
    Used by both response_library and realtime_pipeline.
    """
    print(f"[Utils] Downloading video...")
    response = requests.get(video_url, stream=True, timeout=60)
    response.raise_for_status()

    with open(save_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    file_size = os.path.getsize(save_path)
    print(f"[Utils] Downloaded: {file_size} bytes")

    # Verify audio exists
    info = check_video_audio(save_path)
    if not info.get('has_audio'):
        print(f"[Utils] ⚠️ WARNING: No audio in downloaded video!")
        print(f"[Utils] Attempting to re-encode with audio...")

        # Try to fix missing audio by re-encoding
        temp_path = save_path + ".temp.mp4"
        result = subprocess.run([
            "ffmpeg", "-y",
            "-i", save_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "128k",
            temp_path
        ], capture_output=True, text=True)

        if result.returncode == 0:
            import shutil
            shutil.move(temp_path, save_path)
            print("[Utils] ✅ Audio re-encoded successfully!")
        else:
            print(f"[Utils] Re-encode failed: {result.stderr[-100:]}")
            if os.path.exists(temp_path):
                os.remove(temp_path)
    else:
        print(f"[Utils] ✅ Audio verified: {info['audio_codec']}")

    print(f"[Utils] Video saved to: {save_path}")

def convert_mp4_to_y4m(mp4_path: str, y4m_path: str) -> None:
    """
    Converts MP4 to Y4M format using ffmpeg.
    Chrome uses Y4M as a fake webcam feed.
    Uses tempfile to avoid FFmpeg errors with spaces in paths.
    """
    print(f"[Utils] Running ffmpeg conversion...")
    print(f"[Utils] Input: {mp4_path}")
    print(f"[Utils] Output: {y4m_path}")

    # Use a temp directory without spaces to avoid FFmpeg issues
    import tempfile
    temp_dir = tempfile.gettempdir()  # e.g. C:\Users\Dell\AppData\Local\Temp
    temp_y4m = os.path.join(temp_dir, "avatar_temp.y4m")

    print(f"[Utils] Temp file: {temp_y4m}")

    result = subprocess.run([
        "ffmpeg", "-y",
        "-i", mp4_path,
        "-pix_fmt", "yuv420p",
        "-vf", "scale=640:480",
        "-r", "25",
        temp_y4m
    ], capture_output=True, text=True)

    print(f"[Utils] FFmpeg return code: {result.returncode}")

    if result.returncode != 0:
        print(f"[Utils] FFmpeg error: {result.stderr[-300:]}")
        raise Exception(f"FFmpeg failed: {result.stderr[-100:]}")

    # Copy from temp location to final destination
    import shutil
    try:
        shutil.copy2(temp_y4m, y4m_path)
        os.remove(temp_y4m)
        print(f"[Utils] Y4M conversion successful!")
    except Exception as e:
        print(f"[Utils] Copy warning: {e}")
        # Try force copy
        try:
            with open(temp_y4m, 'rb') as src:
                with open(y4m_path, 'wb') as dst:
                    dst.write(src.read())
            os.remove(temp_y4m)
            print(f"[Utils] Y4M force copy successful!")
        except Exception as e2:
            raise Exception(f"Y4M copy failed: {e2}")

    # Verify the output file exists and has content
    if os.path.exists(y4m_path):
        size = os.path.getsize(y4m_path)
        print(f"[Utils] Y4M verified: {size} bytes")
    else:
        print(f"[Utils] WARNING: Y4M file missing!")


def check_video_audio(video_path: str) -> dict:
    """
    Checks if a video file has an audio stream.
    Returns info dict with has_audio, has_video, audio_codec, duration.
    Uses ffprobe to inspect video without re-encoding.
    """
    try:
        result = subprocess.run([
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            video_path
        ], capture_output=True, text=True)

        import json
        data = json.loads(result.stdout)
        streams = data.get('streams', [])

        # Check for audio and video streams
        has_audio = any(
            s.get('codec_type') == 'audio'
            for s in streams
        )
        has_video = any(
            s.get('codec_type') == 'video'
            for s in streams
        )
        
        # Get audio codec name
        audio_codec = next(
            (s.get('codec_name') for s in streams
             if s.get('codec_type') == 'audio'),
            None
        )
        
        # Get video duration
        duration = next(
            (s.get('duration') for s in streams
             if s.get('codec_type') == 'video'),
            '0'
        )

        print(f"[Video Check] {os.path.basename(video_path)}")
        print(f"  Has video: {has_video}")
        print(f"  Has audio: {has_audio}")
        print(f"  Audio codec: {audio_codec}")
        print(f"  Duration: {duration}s")

        return {
            'has_audio': has_audio,
            'has_video': has_video,
            'audio_codec': audio_codec,
            'duration': duration
        }
    except Exception as e:
        print(f"[Video Check] Error checking {os.path.basename(video_path)}: {e}")
        return {'has_audio': False, 'error': str(e)}
