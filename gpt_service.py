import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def generate_answer(question: str, context: str) -> str:
    """
    Generates a natural answer using GPT-4o based on the user's context and question.
    Returns the answer text.
    """
    # Get the OpenAI API key from the environment
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set in the environment variables.")

    try:
        # Create an OpenAI client instance
        client = OpenAI(api_key=api_key)
        
        # Prepare the system prompt to define the AI's persona
        system_prompt = (
            "You are a professional meeting proxy representing a person in a meeting. "
            "Answer questions naturally and confidently based only on the context provided. "
            "Keep answers concise — 2 to 4 sentences max. Sound human, not robotic."
        )
        
        # Prepare the user prompt with context and question
        user_prompt = f"Context about me:\n{context}\n\nQuestion asked in meeting:\n{question}"
        
        # Call the chat completions endpoint (using gpt-4o-mini for cost efficiency)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=200,
            temperature=0.7
        )
        
        # Extract the answer from the response
        answer = response.choices[0].message.content
        return answer
        
    except Exception as e:
        # If any error occurs, raise an exception with the error message
        raise Exception(f"GPT answer generation failed: {str(e)}")
