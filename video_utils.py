import os
import requests
import subprocess

# Paths used across the project
MP4_PATH = os.path.join(os.getcwd(), "avatar_video.mp4")
Y4M_PATH = os.path.join(os.getcwd(), "avatar_video.y4m")

def download_video(video_url: str, save_path: str) -> None:
    """
    Downloads a video from a URL and saves it to disk.
    Used by both response_library and realtime_pipeline.
    """
    print(f"[Utils] Downloading video...")
    response = requests.get(video_url, stream=True, timeout=60)
    response.raise_for_status()

    with open(save_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
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
