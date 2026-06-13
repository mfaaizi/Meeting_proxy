import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def transcribe_audio(audio_file) -> str:
    """
    Transcribes the given audio file using OpenAI's Whisper API.
    Returns the transcribed text string.
    """
    # Get the OpenAI API key from the environment
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set in the environment variables.")

    try:
        # Create an OpenAI client instance
        client = OpenAI(api_key=api_key)
        
        # Call the audio transcription endpoint
        # model="whisper-1" is the standard Whisper model
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        
        # Return the text from the transcript object
        return transcript.text
        
    except Exception as e:
        # If any error occurs, raise an exception with the error message
        raise Exception(f"Transcription failed: {str(e)}")
