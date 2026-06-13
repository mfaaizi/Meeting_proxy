// Import Zoom Meeting SDK
import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded'

// Create the Zoom embedded client
const client = ZoomMtgEmbedded.createClient()

// joinMeeting — called from meeting.html
export async function joinMeeting(signature, sdkKey, meetingNumber, passcode, userName) {
  try {
    // Get the div where Zoom will render
    const meetingContainer = document.getElementById('zmmtg-root')

    // Initialize the embedded Zoom client
    await client.init({
      zoomAppRoot: meetingContainer,
      language: 'en-US',
      patchJsMedia: true,
      customize: {
        // Hide Zoom's default toolbar to keep UI clean
        toolbar: {
          buttons: []
        }
      }
    })

    // Join the meeting with credentials
    await client.join({
      signature: signature,
      meetingNumber: meetingNumber,
      password: passcode,
      userName: userName,
    })

    console.log('Joined meeting successfully')
    return { success: true }

  } catch (error) {
    console.error('Zoom join error:', error)
    return { success: false, error: error.message }
  }
}

// injectAvatarVideo — streams D-ID video as camera into Zoom
export async function injectAvatarVideo(videoUrl) {
  try {
    // Get the hidden video and canvas elements
    const video = document.getElementById('avatarVideo')
    const canvas = document.getElementById('avatarCanvas')
    const ctx = canvas.getContext('2d')

    // Set video source to D-ID result URL
    video.src = videoUrl
    video.crossOrigin = 'anonymous'
    
    // Wrap video.play() in a promise to ensure it's playing before we draw
    await new Promise((resolve, reject) => {
        video.onplaying = resolve;
        video.onerror = reject;
        video.play().catch(reject);
    });

    // Draw video frames onto canvas at 30fps
    setInterval(() => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    }, 33)

    // Capture canvas as a video stream
    const canvasStream = canvas.captureStream(30)
    const videoTrack = canvasStream.getVideoTracks()[0]

    // Capture audio from the D-ID video
    const audioStream = video.captureStream
      ? video.captureStream()
      : video.mozCaptureStream()
    const audioTrack = audioStream.getAudioTracks()[0]

    // Switch Zoom camera to our canvas stream
    // Using the Embedded SDK's startVideo method
    await client.startVideo({
        videoElement: canvas,
        captureWidth: 512,
        captureHeight: 512
    })

    // Switch Zoom microphone to avatar audio
    if (audioTrack) {
        await client.startAudio({
            mediaStream: new MediaStream([audioTrack])
        })
    }

    console.log('Avatar injected into Zoom successfully')
    return { success: true }

  } catch (error) {
    console.error('Avatar injection error:', error)
    return { success: false, error: error.message }
  }
}

// Expose functions globally so meeting.html can call them
window.joinMeeting = joinMeeting
window.injectAvatarVideo = injectAvatarVideo
