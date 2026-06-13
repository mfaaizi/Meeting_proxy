import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI client using API key from .env
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))


def generate_answer(question: str, context: str) -> str:
    """
    Generates a natural answer to a meeting question
    using OpenAI GPT-4o-mini and the user's context.

    question: the question asked in the meeting
    context: user's bio/background information
    """
    try:
        print(f"[GPT] Generating answer for: {question[:50]}")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional meeting proxy "
                        "representing a person in an online meeting. "
                        "Answer questions naturally and confidently "
                        "based ONLY on the context provided below. "
                        "Keep answers concise — 2 to 4 sentences max. "
                        "Sound human and professional, not robotic."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"Context about the person:\n{context}\n\n"
                        f"Question asked in the meeting:\n{question}"
                    )
                }
            ],
            max_tokens=200,
            temperature=0.7
        )

        answer = response.choices[0].message.content.strip()
        print(f"[GPT] Answer: {answer[:80]}...")
        return answer

    except Exception as e:
        print(f"[GPT] Error: {e}")
        raise Exception(f"OpenAI error: {str(e)}")
