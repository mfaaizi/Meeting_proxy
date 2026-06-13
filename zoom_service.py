import os
import time
import jwt
from dotenv import load_dotenv

# Load environment variables from .env so we can access Zoom credentials
load_dotenv()

def generate_zoom_signature(meeting_number: str, role: int) -> str:
    """
    Generates a Zoom Web SDK signature (JWT) for joining a meeting.
    Returns the signed JWT string.
    """
    # Remove any spaces from meeting number
    meeting_number = meeting_number.replace(" ", "")
    
    # Get Zoom SDK credentials from environment variables
    sdk_key = os.getenv("ZOOM_SDK_KEY")
    sdk_secret = os.getenv("ZOOM_SDK_SECRET")

    # Basic validation to ensure keys exist
    if not sdk_key or not sdk_secret:
        raise ValueError("ZOOM_SDK_KEY or ZOOM_SDK_SECRET is missing from environment variables.")

    # Get the current UNIX timestamp in seconds
    current_time = int(time.time())

    # Build the JWT payload according to Zoom's requirements for v5.1.4
    payload = {
        "appKey": sdk_key,      # use clientId as appKey
        "mn": meeting_number,   # meeting number without spaces
        "role": role,
        "iat": current_time,
        "exp": current_time + 3600,       # Token valid for 1 hour
        "tokenExp": current_time + 3600    # Token expiration for SDK
    }

    # Sign the JWT using HS256 with your SDK secret
    token = jwt.encode(payload, sdk_secret, algorithm="HS256")

    # Return the encoded token string (PyJWT returns str on modern versions)
    return token
