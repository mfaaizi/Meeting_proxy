import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def upload_image(file) -> str:
    """
    Uploads a file to Cloudinary and returns the public secure URL.
    This URL can be used by D-ID to access the image.
    """
    
    # Configure Cloudinary with credentials from environment variables
    # These values must be set in your .env file
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET")
    )
    
    try:
        # Upload the file object directly to Cloudinary
        # 'file' comes from Flask's request.files
        upload_result = cloudinary.uploader.upload(file)
        
        # Extract the secure HTTPS URL from the response
        # This is the public link we need
        secure_url = upload_result.get("secure_url")
        
        return secure_url
        
    except Exception as e:
        # If upload fails, re-raise the exception to be handled by the caller
        raise Exception(f"Cloudinary upload failed: {str(e)}")


def upload_audio(file_path: str) -> str:
    """
    Uploads an audio file (MP3/WAV) to Cloudinary and returns the public URL.
    D-ID needs a publicly accessible URL to use custom audio for lip-sync.

    Cloudinary uses resource_type="video" for both video and audio files.

    Args:
        file_path: Local path to the audio file.

    Returns:
        Public HTTPS URL of the uploaded audio.
    """
    # Configure Cloudinary with credentials from environment variables
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET")
    )

    try:
        print(f"[Cloudinary] Uploading audio: {file_path}")

        # resource_type="video" is required for audio files in Cloudinary
        upload_result = cloudinary.uploader.upload(
            file_path,
            resource_type="video",
            folder="meeting_proxy_audio",
        )

        secure_url = upload_result.get("secure_url")
        print(f"[Cloudinary] Audio uploaded: {secure_url[:60]}...")
        return secure_url

    except Exception as e:
        raise Exception(f"Cloudinary audio upload failed: {str(e)}")
