from database import CustomQA, db

def add_custom_qa(user, question, answer):
    """
    Adds a custom Q&A pair to the database for a user.
    """
    qa = CustomQA(
        user_id=user.id,
        question=question,
        answer=answer
    )
    db.session.add(qa)
    db.session.commit()
    return qa

def get_user_library_index(user) -> dict:
    """
    Builds an index of question -> video_path mappings
    from the user's library videos in the database.
    """
    import os
    from database import LibraryVideo

    index = {}

    try:
        library_videos = LibraryVideo.query.filter_by(
            user_id=user.id,
            status="ready"
        ).all()

        for video in library_videos:
            if video.question and video.video_path:
                question_lower = video.question.lower().strip()
                index[question_lower] = video.video_path

    except Exception as e:
        print(f"[UserService] Error building library index: {e}")

    return index

def get_video_for_user_question(
    user, question: str
) -> str | None:
    """
    Finds a matching video in user's personal library.
    Checks library index and custom Q&A database.
    """
    import os
    from database import CustomQA

    question_lower = question.lower().strip()

    # Check library index
    index = get_user_library_index(user)

    # Exact match
    if question_lower in index:
        path = index[question_lower]
        if path and os.path.exists(path):
            return path

    # Fuzzy match
    for key, path in index.items():
        if not path:
            continue
        if (key in question_lower or
                question_lower in key):
            if os.path.exists(path):
                return path

    # Check custom Q&A
    try:
        qa_list = CustomQA.query.filter_by(
            user_id=user.id
        ).all()
        for qa in qa_list:
            q = qa.question.lower()
            if (q in question_lower or
                    question_lower in q):
                if qa.video_path and os.path.exists(
                    qa.video_path
                ):
                    return qa.video_path
    except Exception as e:
        print(f"[UserService] Error: {e}")

    return None
