import os
import json
import time
from did_service import generate_avatar_video
from video_utils import download_video, convert_mp4_to_y4m
from dotenv import load_dotenv

load_dotenv()

# Folder to store pre-generated videos
LIBRARY_FOLDER = os.path.join(os.getcwd(), "response_library")
os.makedirs(LIBRARY_FOLDER, exist_ok=True)

# Index file that maps question -> video file path
LIBRARY_INDEX = os.path.join(LIBRARY_FOLDER, "index.json")

# Predefined Q&A pairs — these get pre-generated at startup
PREDEFINED_QA = {
    "what is your name": None,
    "tell me about yourself": None,
    "what is your fyp about": None,
    "what technologies did you use": None,
    "what is your experience": None,
    "what are your skills": None,
    "why did you choose this project": None,
    "what is the future scope": None,
    "thank you": None,
    "how does it work": None,
    "what are your thoughts on using ai in meeting management": None,
    "how do you think the ai meeting proxy system could benefit students like you": None,
    "can you explain what specific features of the ai": None,
}

# Answers for each predefined question
# These will be customized with user context later
PREDEFINED_ANSWERS = {
    "what is your name":
        "My name is {name}. I am a software engineering student.",

    "tell me about yourself":
        "I am {name}. {context}",

    "what is your fyp about":
        "My FYP is a meeting proxy system that uses D-ID avatars, "
        "GPT-4o, and Whisper to represent me in meetings automatically.",

    "what technologies did you use":
        "I used Flask, D-ID API for avatar generation, OpenAI Whisper "
        "for speech recognition, GPT-4o for answers, Cloudinary for "
        "image hosting, and Selenium for Google Meet automation.",

    "what is your experience":
        "I have experience in Python, Flask, machine learning, and "
        "AI APIs. I have worked on projects involving computer vision "
        "and natural language processing.",

    "what are your skills":
        "My skills include Python, Flask, machine learning, deep "
        "learning, and working with AI APIs like OpenAI and D-ID.",

    "why did you choose this project":
        "I chose this project because it combines multiple AI "
        "technologies in a real-world use case. Meeting proxies "
        "are the future of remote work and AI representation.",

    "what is the future scope":
        "Future scope includes real-time streaming, emotion detection, "
        "multi-language support, and integration with more meeting "
        "platforms like Teams and Zoom.",

    "thank you":
        "You are welcome! It was great speaking with you today.",

    "how does it work":
        "When a question is asked, my system captures audio, "
        "transcribes it using Whisper, generates an answer using "
        "GPT-4o, and creates a talking avatar video using D-ID "
        "that plays as my camera feed in the meeting.",

    "what are your thoughts on using ai in meeting management":
        "I believe that integrating AI into meeting management can significantly enhance efficiency and productivity. It can help streamline the process by providing accurate summaries, tracking key action points, and facilitating better communication among participants. Overall, AI has the potential to transform how we manage and conduct meetings, making them more organized and effective.",

    "how do you think the ai meeting proxy system could benefit students like you":
        "The AI Meeting Proxy System could significantly benefit students by streamlining the note-taking process during lectures and group discussions. It can provide accurate summaries and highlight key action points, allowing us to focus more on understanding the material rather than worrying about missing details. Additionally, having a reliable assistant can help us manage our time more effectively and improve overall collaboration in team projects.",

    "can you explain what specific features of the ai":
        "The key features include real-time speech recognition using Whisper, intelligent answering using GPT-4o, and dynamic avatar video generation using D-ID, all integrated directly into Google Meet through a virtual camera.",
}

def load_library_index() -> dict:
    """
    Loads the library index from disk.
    Returns dict mapping question -> video file path.
    """
    if os.path.exists(LIBRARY_INDEX):
        with open(LIBRARY_INDEX, 'r') as f:
            return json.load(f)
    return {}

def save_library_index(index: dict) -> None:
    """Saves the library index to disk."""
    with open(LIBRARY_INDEX, 'w') as f:
        json.dump(index, f, indent=2)
    print(f"[Library] Index saved with {len(index)} entries")

def generate_session_videos(session_id: int, user_id: int, photo_url: str):
    """
    Background worker to generate 9 answer videos + 1 idle video for a prep session.
    Stored in: users/{user_id}/sessions/{session_id}/
    """
    from app import app, db
    from database import PrepSession
    import json
    
    with app.app_context():
        session_record = PrepSession.query.get(session_id)
        if not session_record:
            return
            
        try:
            # Create session folder
            session_folder = os.path.join(os.getcwd(), "users", str(user_id), "sessions", str(session_id))
            os.makedirs(session_folder, exist_ok=True)
            
            from database import User
            user = db.session.get(User, user_id)
            vid_voice_id = user.voice_id if user and user.voice_provider == "elevenlabs" else None
            
            qa_list = json.loads(session_record.qa_data)
            status_messages = json.loads(session_record.status_messages)
            
            # Step 1: Generate 9 answer videos
            for i, qa in enumerate(qa_list):
                msg = f"🎬 Generating video {i+1}/10: {qa['question'][:30]}..."
                status_messages.append(msg)
                session_record.status_messages = json.dumps(status_messages)
                session_record.progress = int(((i) / 10) * 100)
                db.session.commit()
                
                # Generate video using D-ID
                video_url = generate_avatar_video(photo_url, qa['answer'], voice_id=vid_voice_id)
                
                # Download and save to session folder
                filename = f"video_{i}.mp4"
                local_path = os.path.join(session_folder, filename)
                download_video(video_url, local_path)
                
                qa['video_path'] = local_path
            
            # Step 2: Generate 1 nodding/idle video (10th video)
            msg = "🎬 Generating video 10/10: Idle nodding..."
            status_messages.append(msg)
            session_record.status_messages = json.dumps(status_messages)
            session_record.progress = 90
            db.session.commit()
            
            # Generate a short nodding video with a subtle sound
            idle_video_url = generate_avatar_video(photo_url, "...", voice_id=None) 
            idle_filename = "idle.mp4"
            idle_local_path = os.path.join(session_folder, idle_filename)
            download_video(idle_video_url, idle_local_path)
            
            # Update session record
            session_record.qa_data = json.dumps(qa_list)
            # We can store the idle path in a separate column if we had one, 
            # or just rely on the filename 'idle.mp4' in that folder.
            # I'll add it to the status or just keep it in mind.
            
            session_record.progress = 100
            session_record.complete = True
            status_messages.append("✅ All 10 videos generated successfully!")
            session_record.status_messages = json.dumps(status_messages)
            db.session.commit()
            
        except Exception as e:
            session_record.error = str(e)
            db.session.commit()
            print(f"[PrepSession] Error: {e}")

def get_video_for_question(question: str) -> str | None:
    """
    Checks if a pre-generated video exists for this question.
    Uses fuzzy matching — checks if any library key is contained
    in the question or vice versa.
    Returns video file path if found, None otherwise.
    """
    index = load_library_index()
    question_lower = question.lower().strip()

    # Exact match first
    if question_lower in index:
        path = index[question_lower]
        if os.path.exists(path):
            print(f"[Library] Exact match: '{question_lower}'")
            return path

    # Fuzzy match — check if library key is in the question
    for key, path in index.items():
        if key in question_lower or question_lower in key:
            if os.path.exists(path):
                print(f"[Library] Fuzzy match: '{key}'")
                return path

    # Keyword match — check for key words (specific, not single generic words)
    keywords_map = {
        "your name": "what is your name",
        "about yourself": "tell me about yourself",
        "introduce yourself": "tell me about yourself",
        "fyp": "what is your fyp about",
        "final year": "what is your fyp about",
        "your project": "what is your fyp about",
        "technologies": "what technologies did you use",
        "tech stack": "what technologies did you use",
        "tools used": "what technologies did you use",
        "your experience": "what is your experience",
        "your skills": "what are your skills",
        "choose this": "why did you choose this project",
        "why this project": "why did you choose this project",
        "future scope": "what is the future scope",
        "future plans": "what is the future scope",
        "thank you": "thank you",
        "how does it work": "how does it work",
        "how it works": "how does it work",
        "how does this work": "how does it work",
        "thoughts on using ai": "what are your thoughts on using ai in meeting management",
        "ai in meeting management": "what are your thoughts on using ai in meeting management",
        "benefit students like you": "how do you think the ai meeting proxy system could benefit students like you",
        "specific features of the ai": "can you explain what specific features of the ai",
        "features of the ai": "can you explain what specific features of the ai",
    }

    for keyword, mapped_question in keywords_map.items():
        if keyword in question_lower:
            if mapped_question in index:
                path = index[mapped_question]
                if os.path.exists(path):
                    print(
                        f"[Library] Keyword match '{keyword}'"
                        f" -> '{mapped_question}'"
                    )
                    return path

    print(f"[Library] No match for: '{question_lower}'")
    return None

def pregenerate_library(image_url: str, context: str,
                        name: str = "Rafeh", voice_id: str = None) -> None:
    """
    Pre-generates avatar videos for all predefined questions.
    Skips questions that already have a video on disk.
    Call this at bot startup.
    
    image_url : Cloudinary URL of user photo
    context   : User's background/bio text
    name      : User's first name for personalizing answers
    """
    print("\n[Library] Starting pre-generation...")
    print(f"[Library] {len(PREDEFINED_ANSWERS)} questions to process")

    index = load_library_index()
    generated = 0
    skipped = 0

    for question, answer_template in PREDEFINED_ANSWERS.items():

        # Build safe filename from question
        safe_name = question.replace(" ", "_")[:30]
        video_path = os.path.join(
            LIBRARY_FOLDER, f"{safe_name}.mp4"
        )

        # Skip if video already exists on disk
        if question in index and os.path.exists(index[question]):
            print(f"[Library] Skip (exists): '{question}'")
            skipped += 1
            continue

        try:
            # Personalize the answer with user's name and context
            answer = answer_template.format(
                name=name,
                context=context[:100]  # limit context length
            )

            print(f"[Library] Generating: '{question}'")
            print(f"[Library] Answer: '{answer[:60]}...'")

            # Generate D-ID avatar video
            video_url = generate_avatar_video(image_url, answer, voice_id=voice_id)

            # Download to library folder
            download_video(video_url, video_path)

            # Add to index
            index[question] = video_path
            save_library_index(index)

            generated += 1
            print(f"[Library] ✅ Done: '{question}'")

            # Wait 5 seconds between D-ID calls to avoid rate limits
            time.sleep(5)

        except Exception as e:
            print(f"[Library] ❌ Failed '{question}': {e}")
            # If credits run out stop pre-generation
            if "402" in str(e) or "credits" in str(e).lower():
                print("[Library] ⚠️ Out of credits! Stopping.")
                break
            continue

    print(f"\n[Library] Pre-generation complete!")
    print(f"[Library] Generated: {generated}")
    print(f"[Library] Skipped (cached): {skipped}")
    print(f"[Library] Total in library: {len(index)}\n")
