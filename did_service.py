import os
import time
import base64      # ADD THIS
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the D-ID API key from the environment
raw_key = os.getenv("DID_API_KEY")

# Base64 encode it — D-ID key is email:secret format, Basic auth needs it encoded
DID_API_KEY = base64.b64encode(raw_key.encode()).decode()

def create_talk(image_url: str, text: str) -> str:
    """
    Creates a new talk on D-ID platform.
    Returns the talk ID.
    """
    # D-ID Talks API endpoint
    url = "https://api.d-id.com/talks"
    
    # Setup headers with Basic Authentication using the API key
    headers = {
        "Authorization": f"Basic {DID_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Define the payload as per the requirements
    payload = {
        "source_url": image_url,
        "script": {
            "type": "text",
            "input": text,
            "provider": {
                "type": "microsoft",
                "voice_id": "en-US-JennyNeural"
            }
        }
    }
    
    # Make the POST request to create the talk
    response = requests.post(url, json=payload, headers=headers)
    print("Status code:", response.status_code)
    print("D-ID error:", response.text)
    response.raise_for_status()  # Raise an error if the request failed
    
    data = response.json()
    return data.get("id")

def poll_talk_status(talk_id: str, max_wait: int = 60) -> str:
    """
    Polls the D-ID API to check the status of a talk.
    Returns the final video result_url when done.
    """
    # Endpoint for a specific talk
    url = f"https://api.d-id.com/talks/{talk_id}"
    
    # Setup headers with Basic Authentication
    headers = {
        "Authorization": f"Basic {DID_API_KEY}"
    }
    
    start_time = time.time()
    
    # Loop until max_wait time is exceeded
    while time.time() - start_time < max_wait:
        # Make the GET request to check status
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        status = data.get("status")
        
        # Check if the talk is done generating
        if status == "done":
            return data.get("result_url")
            
        # Check if there was an error in generation
        if status == "error":
            raise Exception(f"Error generating talk: {data}")
            
        # Wait for 3 seconds before polling again
        time.sleep(3)
        
    # Raise TimeoutError if it took too long
    raise TimeoutError(f"Talk generation exceeded {max_wait} seconds")

def generate_avatar_video(image_url: str, text: str) -> str:
    """
    Main function to generate the video end-to-end.
    Calls create_talk, then poll_talk_status, and logs progress.
    """
    print("Step 1: Creating talk...")
    # Call the create_talk function
    talk_id = create_talk(image_url, text)
    print(f"Talk created successfully! Talk ID: {talk_id}")
    
    print("Step 2: Polling for completion status...")
    # Poll until the video is ready
    video_url = poll_talk_status(talk_id)
    print(f"Video generated successfully! URL: {video_url}")
    
    return video_url
