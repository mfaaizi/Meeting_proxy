import obsws_python as obs
import time
import os

# OBS WebSocket connection settings
OBS_HOST = "localhost"
OBS_PORT = 4455
OBS_PASSWORD = ""
BROWSER_SOURCE_NAME = "Browser"

# Flask server URL for serving videos
FLASK_URL = "http://127.0.0.1:5000"

# Global OBS client
_obs_client = None

def connect_obs() -> bool:
    """
    Connects to OBS via WebSocket.
    Returns True if connected, False if failed.
    """
    global _obs_client
    try:
        _obs_client = obs.ReqClient(
            host=OBS_HOST,
            port=OBS_PORT,
            password=OBS_PASSWORD,
            timeout=5
        )
        version = _obs_client.get_version().obs_version
        print(f"[OBS] Connected! OBS version: {version}")
        return True
    except Exception as e:
        print(f"[OBS] Connection failed: {e}")
        print("[OBS] Make sure OBS is open with WebSocket enabled!")
        _obs_client = None
        return False

def disconnect_obs() -> None:
    """Disconnects from OBS WebSocket."""
    global _obs_client
    if _obs_client:
        try:
            _obs_client.base_client.ws.close()
        except:
            pass
        _obs_client = None
        print("[OBS] Disconnected")

def prewarm_obs() -> None:
    """
    Pre-loads the browser source in OBS so the first 
    video switch is instant instead of loading cold.
    """
    try:
        if _obs_client is None:
            connect_obs()

        # Load a blank page first to initialize browser
        _obs_client.set_input_settings(
            name=BROWSER_SOURCE_NAME,
            settings={
                'url': 'about:blank',
                'width': 640,
                'height': 480,
            },
            overlay=True
        )
        print("[OBS] Browser pre-warmed!")
    except Exception as e:
        print(f"[OBS] Prewarm failed: {e}")

def set_browser_source(video_filename: str) -> bool:
    """
    Updates the OBS Browser source to show a specific video.
    video_filename: just the filename e.g. 'what_is_your_name.mp4'
    
    The video is served by Flask at:
    /library-video/<filename> for library videos
    /avatar-video for the current avatar video
    """
    global _obs_client

    if _obs_client is None:
        print("[OBS] Not connected — reconnecting...")
        if not connect_obs():
            return False

    try:
        # Build the video URL
        if video_filename == "avatar_video.mp4":
            video_url = f"{FLASK_URL}/avatar-video"
        else:
            video_url = f"{FLASK_URL}/library-video/{video_filename}"

        # HTML page that autoplays the video fullscreen
        # with audio enabled
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ background: black; overflow: hidden; width: 100vw; height: 100vh; }}
            video {{
                width: 100vw;
                height: 100vh;
                object-fit: cover;
                display: block;
            }}
        </style>
        </head>
        <body>
            <video id="v" autoplay playsinline loop>
                <source src="{video_url}?t={int(time.time())}"
                        type="video/mp4">
            </video>
            <script>
                const v = document.getElementById('v');
                // Unmute and set full volume
                v.muted = false;
                v.volume = 1.0;
                // Play immediately
                v.play().then(() => {{
                    console.log('Playing with audio!');
                }}).catch(e => {{
                    console.log('Autoplay blocked, retrying...');
                    // Retry with user interaction simulation
                    document.addEventListener('click', () => v.play());
                    // Force play after short delay
                    setTimeout(() => {{
                        v.muted = false;
                        v.play();
                    }}, 500);
                }});
            </script>
        </body>
        </html>
        """

        # Save HTML to a temp file served by Flask
        html_path = os.path.join(
            os.getcwd(), "static", "avatar_player.html"
        )
        os.makedirs(os.path.dirname(html_path), exist_ok=True)
        with open(html_path, 'w') as f:
            f.write(html_content)

        # Update OBS browser source to load our HTML page
        page_url = f"{FLASK_URL}/avatar-player?t={int(time.time())}"

        _obs_client.set_input_settings(
            name=BROWSER_SOURCE_NAME,
            settings={
                'url': page_url,
                'width': 640,
                'height': 480,
                'css': '',
                'restart_when_active': True,
                'shutdown': False,
                'reroute_audio': True,
            },
            overlay=True
        )

        # Small pause to ensure OBS registers the new settings
        time.sleep(1)

        # Refresh the browser source
        try:
            _obs_client.press_input_properties_button(
                input_name=BROWSER_SOURCE_NAME,
                prop_name='refreshnocache'
            )
        except:
            pass

        print(f"[OBS] Browser source updated: {video_filename}")
        return True

    except Exception as e:
        print(f"[OBS] Update failed: {e}")
        _obs_client = None
        return False

def set_idle_photo(image_url: str) -> bool:
    """
    Shows a static photo in OBS — truly idle state.
    No lip movement, no sound, just a still image.
    Perfect for when avatar is listening.
    
    This creates an HTML page that displays the image
    and serves it through Flask so OBS can show it.
    """
    global _obs_client

    if _obs_client is None:
        if not connect_obs():
            return False

    try:
        import time

        # Create HTML content that shows just the static image
        # No video, no audio, no animations
        html_content = f"""<!DOCTYPE html>
<html>
<head>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
    background: #000;  /* Black background */
    overflow: hidden;  /* No scrollbars */
    width: 100vw;     /* Full viewport width */
    height: 100vh;    /* Full viewport height */
    display: flex;    /* Center the image */
    align-items: center;
    justify-content: center;
}}
img {{
    width: 100vw;     /* Image fills screen */
    height: 100vh;
    object-fit: cover;  /* Maintain aspect ratio */
    display: block;     /* No extra spacing */
}}
</style>
</head>
<body>
    <img src="{image_url}?t={int(time.time())}"
         alt="avatar idle"/>
</body>
</html>"""

        # Save the HTML to a file that Flask can serve
        html_path = os.path.join(
            os.getcwd(), "static", "idle_player.html"
        )
        os.makedirs(os.path.dirname(html_path), exist_ok=True)
        with open(html_path, 'w') as f:
            f.write(html_content)

        # Tell OBS to show this HTML page
        page_url = (
            f"http://127.0.0.1:5000/idle-player"
            f"?t={int(time.time())}"
        )

        _obs_client.set_input_settings(
            name=BROWSER_SOURCE_NAME,
            settings={
                'url': page_url,      # The HTML page URL
                'width': 640,         # Video dimensions
                'height': 480,
                'css': '',            # No extra CSS
                'reroute_audio': False,  # IMPORTANT: No audio!
            },
            overlay=True
        )

        # Force OBS to refresh the page
        try:
            _obs_client.press_input_properties_button(
                input_name=BROWSER_SOURCE_NAME,
                prop_name='refreshnocache'
            )
        except:
            pass

        print("[OBS] Static idle photo set — no sound!")
        return True

    except Exception as e:
        print(f"[OBS] Idle photo failed: {e}")
        return False

    except Exception as e:
        print(f"[OBS] Idle photo failed: {e}")
        return False

def get_video_duration(video_path: str) -> float:
    """Gets video duration in seconds using ffprobe."""
    import subprocess
    try:
        result = subprocess.run([
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path
        ], capture_output=True, text=True)
        return float(result.stdout.strip())
    except:
        return 10.0
