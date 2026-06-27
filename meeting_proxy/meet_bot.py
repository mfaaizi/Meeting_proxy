from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import tempfile
import os
import threading
os.environ["PATH"] = r"C:\ffmpeg\bin" + os.pathsep + os.environ.get("PATH", "")
from dotenv import load_dotenv

# ── Real-time pipeline imports ────────────────────────────────────────────────
# start_listening / stop_listening control the VAD microphone loop.
from realtime_listener import start_listening, stop_listening, set_avatar_speaking

# set_user_context stores the user's bio for GPT to use in every answer.
# start_realtime_pipeline queues the GPT → D-ID → ffmpeg chain in a thread.
# Y4M_PATH / MP4_PATH are the disk locations Chrome and ffmpeg use.
from realtime_pipeline import (
    set_user_context,
    start_realtime_pipeline,
)
from video_utils import (
    download_video,
    MP4_PATH,
)
from obs_service import (
    connect_obs, set_browser_source,
    set_idle_photo, get_video_duration,
    disconnect_obs, prewarm_obs
)

_user_image_url = ""

# Load values from .env so the bot can read login credentials and the Meet link.
load_dotenv()

# Read the Google account email from the environment.
GOOGLE_EMAIL = os.getenv("GOOGLE_EMAIL")

# Read the Google account password from the environment.
GOOGLE_PASSWORD = os.getenv("GOOGLE_PASSWORD")

# Read the Meet link from the environment.
MEET_LINK = os.getenv("MEET_LINK")

# Global driver instance — keeps track of running bot
_driver = None

# Global variables — accessible from other modules
_user_image_url = ""
_current_user_id = None  # User ID for current meeting session
_session_videos = {}     # Videos for current session


def create_driver() -> webdriver.Chrome:
    """
    Launches Chrome with OBS Virtual Camera as webcam.
    OBS handles all video and audio routing to Meet.
    """
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager

    print("Initializing Chrome driver...")

    # Create Chrome options object
    options = Options()

    # Auto-allow camera and mic without popup
    options.add_argument('--use-fake-ui-for-media-stream')

    # Hide selenium detection from websites
    options.add_argument(
        '--disable-blink-features=AutomationControlled'
    )

    # Start browser maximized
    options.add_argument('--start-maximized')

    # Required for running in some environments
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')

    # Allow autoplay of audio and video without user gesture
    options.add_argument(
        '--autoplay-policy=no-user-gesture-required'
    )

    # Auto-allow camera and microphone permissions
    options.add_experimental_option("prefs", {
        "profile.default_content_setting_values.media_stream_camera": 1,
        "profile.default_content_setting_values.media_stream_mic": 1,
    })

    # Install correct ChromeDriver automatically
    service = Service(ChromeDriverManager().install())

    # Launch Chrome with our options
    driver = webdriver.Chrome(
        service=service,
        options=options
    )
    print("[Driver] Chrome launched successfully!")
    return driver


def play_avatar_audio(video_path: str) -> None:
    """
    Plays the avatar video audio using ffplay so
    Google Meet microphone picks it up.
    
    This works by playing the sound through the system default output.
    If the system is set to "Stereo Mix" or a Virtual Cable as the 
    microphone, Google Meet will hear this audio.
    """
    import subprocess
    try:
        # Play audio from the mp4 file using ffplay
        # -nodisp = no video window
        # -autoexit = close when done
        subprocess.Popen([
            "ffplay",
            "-nodisp",
            "-autoexit",
            "-volume", "100",
            video_path
        ])
        print(f"[Bot] Playing avatar audio from: {video_path}")
    except Exception as e:
        print(f"[Bot] Audio play error: {e}")


def play_and_wait(video_path: str) -> None:
    """
    Plays a video in OBS and waits for it to finish.
    Accepts full file path — extracts filename for OBS.
    """
    import subprocess
    import time
    import os

    try:
        print(f"[Bot] Playing via OBS: {video_path}")

        # Always use just the filename for OBS
        # The /library-video/ route will find it
        filename = os.path.basename(video_path)

        # Get video duration
        result = subprocess.run([
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path
        ], capture_output=True, text=True)

        try:
            duration = float(result.stdout.strip())
        except:
            duration = 10.0

        print(f"[Bot] Duration: {duration:.1f}s")

        # Tell OBS to play this filename
        # /library-video/{filename} will find it
        # in library, session folder, or user folder
        from obs_service import set_browser_source
        set_browser_source(filename)

        # Wait for video to finish
        wait_time = max(duration - 0.5, 1.0)
        print(f"[Bot] Waiting {wait_time:.1f}s...")
        time.sleep(wait_time)
        print("[Bot] Playback complete!")

    except Exception as e:
        print(f"[Bot] Playback error: {e}")
        time.sleep(3)


def create_idle_from_photo(image_url: str) -> None:
    """
    Shows static photo in OBS as idle avatar state.
    No lip movement, no sound — truly idle.
    
    This is called when we want to set the avatar to a
    listening state without any video playback.
    """
    print("[Bot] Setting OBS idle photo...")
    from realtime_pipeline import set_idle_state
    set_idle_state(image_url)
    print("[Bot] Idle photo set in OBS!")


def configure_meet_devices(driver) -> None:
    """
    Selects OBS Virtual Camera and CABLE Output
    on the Google Meet PRE-JOIN screen.
    This is more reliable than doing it after joining.
    """
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    import time

    print("[Bot] Configuring devices on pre-join screen...")

    # Give pre-join controls a moment to fully render before selection.
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
    except Exception:
        pass

    # --- CAMERA SELECTION ---
    try:
        # Find camera dropdown/control on pre-join screen.
        # Pre-join UI often uses simpler buttons/listboxes than in-call UI.
        cam_selectors = [
            '[data-devicetype="videoinput"]',
            'button[aria-label*="camera" i]',
            '[jsname*="camera" i]',
            'div[data-is-tooltip-wrapper="true"] button',
        ]

        for selector in cam_selectors:
            try:
                elements = driver.find_elements(
                    By.CSS_SELECTOR, selector
                )
                for el in elements:
                    label = el.get_attribute('aria-label') or ''
                    if 'camera' in label.lower():
                        # Use JavaScript click to bypass overlays/intercepts.
                        driver.execute_script(
                            "arguments[0].click();", el
                        )
                        print(f"[Bot] Camera btn clicked: {label}")
                        time.sleep(1)

                        # Find and select OBS camera from dropdown list.
                        obs_items = driver.find_elements(
                            By.XPATH,
                            '//*[contains(text(), "OBS")]'
                        )
                        if obs_items:
                            driver.execute_script(
                                "arguments[0].click();",
                                obs_items[0]
                            )
                            print("[Bot] OBS camera selected!")
                            time.sleep(1)
                            break
            except Exception:
                continue

    except Exception as e:
        print(f"[Bot] Camera config failed: {e}")

    # --- MICROPHONE SELECTION ---
    try:
        # Find mic dropdown/control on pre-join screen.
        mic_selectors = [
            '[data-devicetype="audioinput"]',
            'button[aria-label*="microphone" i]',
            'button[aria-label*="audio" i]',
        ]

        for selector in mic_selectors:
            try:
                elements = driver.find_elements(
                    By.CSS_SELECTOR, selector
                )
                for el in elements:
                    label = el.get_attribute('aria-label') or ''
                    if ('mic' in label.lower() or
                            'audio' in label.lower()):
                        # Use JavaScript click to avoid click interception.
                        driver.execute_script(
                            "arguments[0].click();", el
                        )
                        print(f"[Bot] Mic btn clicked: {label}")
                        time.sleep(1)

                        # Find and select CABLE/Virtual Cable device.
                        cable_items = driver.find_elements(
                            By.XPATH,
                            '//*[contains(text(), "CABLE") or '
                            'contains(text(), "Virtual Cable")]'
                        )
                        if cable_items:
                            driver.execute_script(
                                "arguments[0].click();",
                                cable_items[0]
                            )
                            print("[Bot] CABLE mic selected!")
                            time.sleep(1)
                            break
            except Exception:
                continue

    except Exception as e:
        print(f"[Bot] Mic config failed: {e}")

    print("[Bot] Device config complete!")
    print("[Bot] If wrong devices: manually select in Meet")


def create_nodding_video(image_url: str) -> str:
    """
    Creates a short looping nodding animation video
    using D-ID API with a neutral listening script.
    Saves to response_library/nodding_idle.mp4
    Returns the path to the nodding video.
    """
    import os

    nodding_path = os.path.join(
        os.getcwd(),
        "response_library",
        "nodding_idle.mp4"
    )

    # If already exists, reuse it (saves D-ID credits)
    if os.path.exists(nodding_path):
        print("[Bot] Nodding video already exists, reusing!")
        return nodding_path

    try:
        print("[Bot] Generating nodding idle video...")
        from did_service import generate_avatar_video
        from video_utils import download_video

        # Short neutral phrase that creates natural
        # head movement without saying much
        video_url = generate_avatar_video(
            image_url,
            "Mm-hmm. I see. Please go ahead."
        )

        download_video(video_url, nodding_path)
        print(f"[Bot] Nodding video saved: {nodding_path}")
        return nodding_path

    except Exception as e:
        print(f"[Bot] Nodding video failed: {e}")
        return None


def set_idle_state(image_url: str) -> None:
    """
    Sets avatar to static photo idle state.
    NO video, NO sound, NO lip movement.
    """
    from obs_service import set_idle_photo
    from meet_bot import _user_image_url

    # Always use static photo — never a video for idle
    photo_url = image_url or _user_image_url
    if photo_url:
        print("[Idle] ✅ Static photo idle — no sound")
        from realtime_pipeline import clear_meeting_transcript
    
        clear_meeting_transcript()
        set_idle_photo(photo_url)
    else:
        print("[Idle] ⚠️ No image URL for idle state")


def login_google(driver) -> None:
    """
    Logs into Google account using Selenium.
    Uses explicit waits to ensure elements are ready
    before interacting with them.
    """
    from selenium.webdriver.common.keys import Keys

    print(f"Navigating to Google login... (Email: {GOOGLE_EMAIL})")
    driver.get("https://accounts.google.com")

    # Give the page a moment to fully render before looking for fields
    time.sleep(3)

    try:
        # ── Step 1: Enter email ──────────────────────────────────────────
        print("Waiting for email field...")

        # Wait until the email input field is clickable (not just present)
        # This prevents "not interactable" errors on slow page loads
        email_input = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.ID, "identifierId"))
        )
        email_input.click()
        time.sleep(0.5)
        email_input.clear()
        email_input.send_keys(GOOGLE_EMAIL)
        time.sleep(0.5)

        # Click the Next button to advance to the password step
        next_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "identifierNext"))
        )
        next_btn.click()
        print("Email entered, clicked Next")
        time.sleep(3)

        # ── Step 2: Enter password ───────────────────────────────────────
        print("Waiting for password field...")

        # Wait for the password field to be clickable
        # Google hides and animates this field — we must wait for it
        password_input = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((
                By.CSS_SELECTOR,
                "input[type='password']"
            ))
        )

        # Scroll the password field into view to avoid off-screen click errors
        driver.execute_script(
            "arguments[0].scrollIntoView(true);",
            password_input
        )
        time.sleep(1)

        # Click the field first to focus it, then send keystrokes
        password_input.click()
        time.sleep(0.5)
        password_input.send_keys(GOOGLE_PASSWORD)
        time.sleep(0.5)

        # Click the Sign in / Next button to submit the password
        password_next = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "passwordNext"))
        )
        password_next.click()
        print("Password entered, clicked Sign in")
        time.sleep(5)

        # ── Step 3: Handle any post-login prompts ────────────────────────
        current_url = driver.current_url
        print(f"Post-login URL: {current_url}")

        # Some Google accounts show a "Stay signed in?" or consent screen
        # Try to dismiss them automatically so the bot can continue
        try:
            stay_signed = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    '//button[contains(text(), "Yes") or '
                    'contains(text(), "Continue") or '
                    'contains(text(), "I agree")]'
                ))
            )
            stay_signed.click()
            print("Handled post-login prompt")
            time.sleep(3)
        except:
            # No prompt appeared — this is normal, just continue
            pass

        print(f"Login complete! URL: {driver.current_url}")

    except Exception as e:
        # If login fails, save a screenshot so we can see what went wrong
        print(f"Login error: {e}")
        driver.save_screenshot("login_error.png")
        print("Screenshot saved: login_error.png")

        # Do not crash the bot — Google may already be signed in
        # from a previous session stored in the browser profile
        print("Continuing despite login error...")


def join_meet(driver, meet_link: str) -> None:
    """
    Open the Google Meet page, mute devices if possible, and click the join button.
    """
    # Validate the Meet link before trying to open it.
    if not meet_link:
        raise ValueError("MEET_LINK is missing from environment variables.")

    # Navigate to the target Google Meet room.
    print(f"Navigating to Meet link: {meet_link}", flush=True)
    driver.get(meet_link)

    # Wait a few seconds so the Meet pre-join UI has time to load.
    print("Waiting for Meet UI to load...", flush=True)
    time.sleep(7)

    # Try to find and click the microphone button so the bot joins muted.
    try:
        print("Attempting to mute microphone...", flush=True)
        mic_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((
                By.XPATH,
                "//button[contains(translate(@aria-label,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'microphone')]"
            ))
        )
        mic_button.click()
        print("Microphone muted.", flush=True)
    except Exception:
        print("Microphone button not found or already muted.", flush=True)

    # Try to find and click the camera button so the bot joins with camera ON.
    try:
        print("Ensuring camera is ENABLED...", flush=True)
        camera_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((
                By.XPATH,
                "//button[contains(translate(@aria-label,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'camera')]"
            ))
        )
        # Check if the button is currently in a "turned off" state.
        # In Google Meet, the aria-label changes to "Turn on camera" or similar.
        current_label = camera_button.get_attribute("aria-label").lower()
        if "turn on" in current_label or "camera off" in current_label:
            print("Camera is off, clicking to turn ON.", flush=True)
            camera_button.click()
        else:
            print("Camera is already ON.", flush=True)
    except Exception:
        print("Camera button not found.", flush=True)

    # Configure camera/mic devices before joining while pre-join UI is simpler.
    configure_meet_devices(driver)
    time.sleep(2)

    # Pause briefly after toggling controls and device selection so UI settles.
    time.sleep(3)

    # Try the common "Join now" button first.
    try:
        print("Looking for 'Join now' button...", flush=True)
        join_now_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((
                By.XPATH,
                "//button[contains(., 'Join now')] | //span[contains(text(), 'Join now')]/ancestor::button"
            ))
        )
        join_now_button.click()
        print("Clicked 'Join now'.", flush=True)
    except Exception:
        # If "Join now" is not available, try the "Ask to join" button instead.
        try:
            print("'Join now' not found, looking for 'Ask to join' button...", flush=True)
            ask_to_join_button = WebDriverWait(driver, 8).until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    "//button[contains(., 'Ask to join')] | //span[contains(text(), 'Ask to join')]/ancestor::button"
                ))
            )
            ask_to_join_button.click()
            print("Clicked 'Ask to join'.", flush=True)
        except Exception:
            # If still not found, check if it's already in the call and shows 'Switch here'
            try:
                print("'Ask to join' not found, looking for 'Switch here' button...", flush=True)
                switch_here_button = WebDriverWait(driver, 8).until(
                    EC.element_to_be_clickable((
                        By.XPATH,
                        "//button[contains(., 'Switch here')] | //span[contains(text(), 'Switch here')]/ancestor::button"
                    ))
                )
                switch_here_button.click()
                print("Clicked 'Switch here'.", flush=True)
            except Exception as e:
                print(f"Could not find any join or switch buttons. Current URL: {driver.current_url}", flush=True)
                driver.save_screenshot("join_status.png")
                print("Saved join_status.png for debugging.", flush=True)
                raise e

    # Wait a few seconds after joining so the meeting screen finishes loading.
    print("Waiting for meeting to load after join...", flush=True)
    time.sleep(5)


def enable_tab_audio_sharing(driver) -> None:
    """
    Placeholder for tab audio sharing.
    Google Meet tab audio sharing requires manual interaction.
    For now we skip this and use speaker audio instead.
    """
    print("[Bot] Tab audio sharing skipped for now")
    pass


def show_avatar_video(driver, video_url: str) -> None:
    """
    Injects the D-ID avatar video as a fake camera into
    Google Meet using JavaScript canvas stream override.
    """
    # Switch to the first browser tab because that is the Google Meet tab.
    driver.switch_to.window(driver.window_handles[0])

    # Wait a short moment so the current page finishes rendering before injection starts.
    time.sleep(3)

    # Build the JavaScript that creates the avatar video and converts it into a canvas camera stream.
    js_inject = """
    async function injectAvatar(videoUrl) {

        // Create a hidden video element that will load the D-ID avatar clip.
        const vid = document.createElement('video');
        // Point the hidden element at the remote avatar video URL.
        vid.src = videoUrl;
        // Allow the browser to use the remote video without credentials.
        vid.crossOrigin = 'anonymous';
        // Loop the avatar video so the camera stream never stops.
        vid.loop = true;
        // Mute the helper video so the page itself does not echo audio.
        vid.muted = true;
        // Start the helper video automatically when possible.
        vid.autoplay = true;
        // Move the helper video off-screen so users never see it directly.
        vid.style.cssText = 'position:fixed;top:-9999px';
        // Add the helper video to the page so the browser can play it.
        document.body.appendChild(vid);

        // Wait until the video can actually play frames.
        await new Promise((resolve) => {
            // Resolve the promise as soon as the browser says the video can play.
            vid.oncanplay = resolve;
            // Force the browser to start loading the video resource.
            vid.load();
        });
        // Start video playback so frames are available for the canvas.
        await vid.play();

        // Create a canvas that will behave like the fake webcam surface.
        const canvas = document.createElement('canvas');
        // Use a common webcam width for the fake camera output.
        canvas.width = 640;
        // Use a common webcam height for the fake camera output.
        canvas.height = 480;
        // Get the 2D drawing context used to paint video frames onto the canvas.
        const ctx = canvas.getContext('2d');

        // Copy avatar video frames onto the canvas about 30 times per second.
        setInterval(() => {
            // Only draw while the avatar video is actively playing.
            if (!vid.paused && !vid.ended) {
                // Paint the current avatar frame onto the full canvas area.
                ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
            }
        }, 33);

        // Give the canvas a short moment to receive its first frames.
        await new Promise(r => setTimeout(r, 500));

        // Capture the canvas as a MediaStream that will act like a webcam.
        const fakeStream = canvas.captureStream(30);

        // Keep a reference to the original browser getUserMedia implementation.
        const origGetUserMedia =
            navigator.mediaDevices.getUserMedia.bind(
                navigator.mediaDevices
            );

        // Override getUserMedia so Google Meet receives the avatar stream for video.
        navigator.mediaDevices.getUserMedia = async (constraints) => {
            // Log the intercepted media request for easier browser-side debugging.
            console.log('getUserMedia intercepted:', constraints);

            // Intercept any request that asks for video.
            if (constraints && constraints.video) {
                // Start with no audio track in case microphone access fails.
                let audioTrack = null;
                try {
                    // Request the real microphone so the bot can still send live audio.
                    const audioStream = await origGetUserMedia(
                        { audio: true, video: false }
                    );
                    // Grab the first available microphone track.
                    audioTrack = audioStream.getAudioTracks()[0];
                } catch(e) {
                    // Log the microphone failure without breaking avatar video injection.
                    console.log('No mic available:', e);
                }

                // Create a combined stream that will be returned to Google Meet.
                const combined = new MediaStream();
                // Add every avatar video track from the fake canvas stream.
                fakeStream.getVideoTracks().forEach(t =>
                    combined.addTrack(t)
                );
                // Add the real microphone track when one exists.
                if (audioTrack) combined.addTrack(audioTrack);

                // Tell the console that the avatar camera stream is being returned.
                console.log('Returning avatar stream to Meet!');
                // Return the avatar-video-plus-mic stream to Meet.
                return combined;
            }

            // For non-video requests, fall back to the original browser behavior.
            return origGetUserMedia(constraints);
        };

        // Print a success message in the page console when injection is ready.
        console.log('Avatar injection complete! Ready for Meet.');
        // Store a simple flag on window so manual debugging can confirm injection happened.
        window._avatarInjected = true;
    }

    injectAvatar(arguments[0]);
    """

    # Execute the JavaScript injection and pass the avatar URL into it.
    driver.execute_script(js_inject, video_url)
    # Print a terminal message so the backend shows that injection was triggered.
    print("Avatar injection script executed", flush=True)

    # Wait briefly so the avatar override settles before the join flow continues.
    time.sleep(2)


def join_meet_after_injection(driver) -> None:
    """
    Joins the meeting after avatar has been injected.
    Just clicks the join button — navigation already done.
    """
    try:
        # Try to find the direct "Join now" button on the pre-join screen.
        join_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((
                By.XPATH,
                '//button[.//span[contains(text(), "Join now")]]'
            ))
        )
        # Click the "Join now" button once it becomes clickable.
        join_btn.click()
        # Print a message so the terminal shows that joining succeeded.
        print("Clicked Join now!", flush=True)
    except Exception:
        try:
            # Fall back to the "Ask to join" button when direct joining is not available.
            ask_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    '//button[.//span[contains(text(), "Ask to join")]]'
                ))
            )
            # Click the "Ask to join" button if it is the available action.
            ask_btn.click()
            # Print a message so the terminal shows that the fallback path worked.
            print("Clicked Ask to join!", flush=True)
        except Exception as e:
            # Print the exact join-button error so it is visible in the terminal.
            print(f"Could not find join button: {e}", flush=True)

    # Wait a few seconds so the meeting can finish the join flow.
    time.sleep(5)


def run_meet_bot(
    video_url: str,
    context: str = "",
    image_url: str = "",
    user_id: int = None,
    meet_link: str = None,
    session_videos: dict = None,
    voice_id: str = None
):
    """
    Main entry point for starting the Google Meet bot.
    Now also initializes the real-time background listener pipeline.
    """
    # Declare all globals at the very top of the function
    global _driver
    global _user_image_url
    global _current_user_id  # User ID for database lookups
    global _session_videos   # Session-specific videos

    # Store session-specific videos and user ID globally for the pipeline to use
    _session_videos = session_videos or {}
    _current_user_id = user_id
    
    print(f"[Bot] Session videos loaded: {len(_session_videos)}")
    print(f"[Bot] User ID set: {_current_user_id}")

    # ── Step 0: Cleanup any existing Chrome session ───────────────
    # This ensures we don't have multiple browser windows or listeners
    # running if the bot is restarted.
    if _driver is not None:
        try:
            print("[Bot] Cleaning up previous session...")
            stop_listening()
            _driver.quit()
        except:
            pass
        _driver = None

    # ── Main bot logic ──────────────────────────────────────────────
    try:
        # ── Step 1: Store user context ────────────────────────────────
        # This saves context/image_url for the real-time pipeline threads
        # that run every time someone speaks in the meeting.
        print("[Bot] Step 1: Storing user context...")

        # If image_url is empty use fallback 
        if not image_url or len(image_url) < 10: 
            image_url = ( 
                "https://create-images-results.d-id.com/" 
                "DefaultPresenters/Noelle_f/image.png" 
            ) 
            print(f"[Bot] Using fallback image") 

        # Store image for pipeline use 
        _user_image_url = image_url 

        # Save context and validated image URL
        set_user_context(context, image_url, voice_id=voice_id)

        # Generate nodding idle video in background 
        import threading as _threading 
        def generate_nodding_background():
            nodding_path = os.path.join(
                os.getcwd(),
                "response_library",
                "nodding_idle.mp4"
            )
            if not os.path.exists(nodding_path):
                # Use avatar_image which is validated later, 
                # but we need it here, so let's use image_url for now
                create_nodding_video(image_url)
            else:
                print("[Bot] Nodding video already ready!")

        nodding_thread = _threading.Thread(
            target=generate_nodding_background,
            daemon=True
        )
        nodding_thread.start()



        # A reliable default image in case the user's upload failed or is missing.
        FALLBACK_IMAGE = (
            "https://create-images-results.d-id.com/"
            "DefaultPresenters/Noelle_f/image.png"
        )

        # Validate that the image_url ends with or contains a proper image extension.
        # D-ID requires the URL to point to a valid image format (JPG or PNG).
        valid_extensions = ('.jpg', '.jpeg', '.png')
        avatar_image = (
            image_url
            if image_url
            and image_url.startswith("https://")
            and len(image_url) > 30
            and any(ext in image_url.lower() for ext in valid_extensions)
            else FALLBACK_IMAGE
        )
        print(f"[Bot] Using image: {avatar_image[:80]}...")

        # Extract first name from context for personalization
        # Simple approach: take first word of context
        name = context.split()[0] if context else "Rafeh"

        # Pre-generate library videos in background thread
        # so bot can join meeting while generation happens
        print("[Bot] Starting library pre-generation...")
        from response_library import pregenerate_library

        def generate_library_background():
            from app import app, db
            from database import User
            with app.app_context():
                user = db.session.get(User, user_id) if user_id else None
                vid_voice_id = user.voice_id if user and user.voice_provider == "elevenlabs" else None
                
            pregenerate_library(
                image_url=avatar_image,
                context=context,
                name=name,
                voice_id=vid_voice_id
            )

        lib_thread = _threading.Thread(
            target=generate_library_background,
            daemon=True
        )
        lib_thread.start()
        print("[Bot] Library generation running in background!")

        # Step 2: Get greeting video from library
        # Works even if video_url is 'use_library' or expired
        print("[Bot] Step 2: Getting greeting from library...")
        # Always use library — skip URL download entirely
        # video_url parameter is ignored, library is always used

        from response_library import (
            LIBRARY_FOLDER, load_library_index
        )

        # Load existing library index
        library_index = load_library_index()

        greeting_mp4 = None

        # Try to find a greeting video in this priority order
        priority_questions = [
            "tell me about yourself",
            "what is your name",
            "how does it work",
        ]

        # First, check the user's active session_videos
        if _session_videos:
            for q in priority_questions:
                for sq, path in _session_videos.items():
                    if q in sq.lower() and os.path.exists(path):
                        greeting_mp4 = path
                        print(f"[Bot] Using session video for greeting: '{sq}'")
                        break
                if greeting_mp4:
                    break
            
            # If no priority match, pick any session video
            if not greeting_mp4:
                for sq, path in _session_videos.items():
                    if sq != "__idle__" and os.path.exists(path):
                        greeting_mp4 = path
                        print(f"[Bot] Using fallback session video for greeting: '{sq}'")
                        break

        # Only fall back to global library if session videos didn't have one
        if not greeting_mp4:
            for q in priority_questions:
                if q in library_index:
                    path = library_index[q]
                    if os.path.exists(path):
                        greeting_mp4 = path
                        print(f"[Bot] Using global library video: '{q}'")
                        break

            if not greeting_mp4:
                for q, path in library_index.items():
                    if os.path.exists(path):
                        greeting_mp4 = path
                        print(f"[Bot] Using fallback global library video: '{q}'")
                        break

            if not greeting_mp4:
                lib_folder = LIBRARY_FOLDER
                if os.path.exists(lib_folder):
                    mp4_files = [f for f in os.listdir(lib_folder) if f.endswith('.mp4')]
                    if mp4_files:
                        greeting_mp4 = os.path.join(lib_folder, mp4_files[0])
                        print(f"[Bot] Using folder video: {mp4_files[0]}")

        if not greeting_mp4:
            raise Exception(
                "No library videos found! "
                "Please run Pre-generate Library first."
            )

        print(f"[Bot] Greeting video: {greeting_mp4}")

        # Step 3: Copy greeting video to main mp4 path
        print("[Bot] Step 3: Preparing greeting video...")
        import shutil
        shutil.copy2(greeting_mp4, MP4_PATH)
        print("[Bot] Greeting video ready!")

        # Connect to OBS WebSocket
        print("[Bot] Connecting to OBS...")
        from obs_service import connect_obs
        if not connect_obs():
            raise Exception(
                "Could not connect to OBS! "
                "Make sure OBS is open with WebSocket enabled "
                "(Tools → WebSocket Server Settings)"
            )
        print("[Bot] OBS connected!")
        prewarm_obs()

        # Step 5: Launch Chrome with OBS Virtual Camera
        print("[Bot] Step 5: Launching Chrome...")
        _driver = create_driver()
        print("[Bot] Chrome launched!")

        # Step 6: Login to Google
        print("[Bot] Step 6: Logging into Google...")
        login_google(_driver)
        print("[Bot] Logged in!")

        # Step 7: Join Google Meet
        print("[Bot] Step 7: Joining Google Meet...")
        join_meet(_driver, MEET_LINK)
        time.sleep(3)
        configure_meet_devices(_driver)
        print("[Bot] Joined meeting and configured devices!")

        # After joining meeting successfully
        print("[Bot] Bot is in meeting!")

        # After joining meeting, switch to OBS Virtual Camera
        print("[Bot] Switching to OBS Virtual Camera...")
        _driver.execute_script("""
            // Find the camera selector and switch to OBS
            async function switchToOBS() {
                try {
                    const devices = await navigator.mediaDevices
                        .enumerateDevices();
                    const obsCamera = devices.find(d =>
                        d.kind === 'videoinput' &&
                        d.label.includes('OBS')
                    );
                    if (obsCamera) {
                        console.log('OBS camera found:',
                            obsCamera.label);
                        window._obsCameraId = obsCamera.deviceId;
                    } else {
                        console.log('OBS camera not found in:',
                            devices.filter(d =>
                                d.kind === 'videoinput'
                            ).map(d => d.label)
                        );
                    }
                } catch(e) {
                    console.error('Camera enum error:', e);
                }
            }
            switchToOBS();
        """)
        time.sleep(2)

        # Set static idle face — use user's actual photo
        print("[Bot] Setting static idle face...")
        from realtime_pipeline import set_idle_state
        set_idle_state(_user_image_url or avatar_image)

        # Play greeting
        # print("[Bot] Playing greeting...")
        # set_avatar_speaking(True)
        # play_and_wait(greeting_mp4)
        # set_avatar_speaking(False)

        # Return to idle after greeting
        from realtime_pipeline import set_idle_state
        set_idle_state(_user_image_url or avatar_image)

        # Start listener
        print("[Bot] Step 9: Starting listener...")
        start_listening(
            on_question_detected=start_realtime_pipeline
        )

        return {
            "success": True,
            "message": "Bot joined and listening!"
        }

    except Exception as e:
        # Import traceback to print the exact line numbers where the bot crashed.
        import traceback
        print(f"[Bot] FATAL ERROR: {e}")
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}
