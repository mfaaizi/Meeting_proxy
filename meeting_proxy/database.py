from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    """
    Stores registered users.
    Each user has their own photo, context and library.
    """

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    # Google OAuth fields
    google_id = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    profile_picture = db.Column(db.String(500), nullable=True)

    # User's meeting proxy settings
    photo_url = db.Column(db.String(500), nullable=True)
    context = db.Column(db.Text, nullable=True)
    meet_link = db.Column(db.String(300), nullable=True)

    # Account timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    library_videos = db.relationship(
        "LibraryVideo", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    meetings = db.relationship(
        "Meeting", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    meeting_sessions = db.relationship(
        "MeetingSession", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    def get_library_folder(self) -> str:
        """Returns path to this user's library folder."""
        import os

        folder = os.path.join(os.getcwd(), "users", str(self.id), "library")
        os.makedirs(folder, exist_ok=True)
        return folder

    def get_cache_folder(self) -> str:
        """Returns path to this user's cache folder."""
        import os

        folder = os.path.join(os.getcwd(), "users", str(self.id), "cache")
        os.makedirs(folder, exist_ok=True)
        return folder

    def to_dict(self) -> dict:
        """Converts user to dictionary for API responses."""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "profile_picture": self.profile_picture,
            "photo_url": self.photo_url,
            "context": self.context,
            "meet_link": self.meet_link,
            "created_at": self.created_at.isoformat(),
        }


class LibraryVideo(db.Model):
    """
    Stores pre-generated avatar videos for each user.
    Each user has their own set of library videos.
    """

    __tablename__ = "library_videos"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # Question this video answers
    question = db.Column(db.String(500), nullable=False)

    # The answer text spoken in the video
    answer = db.Column(db.Text, nullable=False)

    # Path to the MP4 file on disk
    video_path = db.Column(db.String(500), nullable=False)

    # Status of video generation
    status = db.Column(
        db.String(20), default="pending"
        # pending, generating, ready, failed
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "question": self.question,
            "answer": self.answer,
            "video_path": self.video_path,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }


class Meeting(db.Model):
    """
    Tracks meeting sessions for each user.
    Stores full session data including transcript and summary.
    """

    __tablename__ = "meetings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # Meeting details
    meet_link = db.Column(db.String(300), nullable=False)
    meeting_context = db.Column(db.Text, nullable=True)
    status = db.Column(
        db.String(20), default='pending'
    )

    # Stats
    questions_answered = db.Column(db.Integer, default=0)

    # Summary data
    transcript = db.Column(db.Text, nullable=True)
    summary = db.Column(db.Text, nullable=True)

    # Session reference for videos
    session_id = db.Column(db.String(50), nullable=True)

    # Timestamps
    scheduled_at = db.Column(db.DateTime, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    ended_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(
        db.DateTime, default=datetime.utcnow
    )

    def to_dict(self):
        return {
            'id': self.id,
            'meet_link': self.meet_link,
            'meeting_context': self.meeting_context,
            'status': self.status,
            'questions_answered': self.questions_answered,
            'transcript': self.transcript,
            'summary': self.summary,
            'session_id': self.session_id,
            'scheduled_at': self.scheduled_at.isoformat()
                if self.scheduled_at else None,
            'started_at': self.started_at.isoformat()
                if self.started_at else None,
            'ended_at': self.ended_at.isoformat()
                if self.ended_at else None,
            'created_at': self.created_at.isoformat()
        }



class MeetingSession(db.Model):
    """
    Stores a complete meeting preparation session.
    Includes questions, answers and video file paths.
    Videos persist on disk and are never deleted.
    """
    __tablename__ = 'meeting_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey('users.id'),
        nullable=False
    )

    # Unique session identifier
    session_id = db.Column(
        db.String(50), unique=True, nullable=False
    )

    # Meeting context used for this session
    meeting_context = db.Column(db.Text, nullable=True)

    # Q&A pairs stored as JSON string
    qa_pairs = db.Column(db.Text, nullable=True)

    # Path to session folder containing videos
    session_folder = db.Column(db.String(500), nullable=True)

    # Status of video generation
    status = db.Column(
        db.String(20), default='pending'
        # pending, generating, ready, failed
    )

    # How many videos are ready
    videos_ready = db.Column(db.Integer, default=0)
    videos_total = db.Column(db.Integer, default=10)

    created_at = db.Column(
        db.DateTime, default=datetime.utcnow
    )

    def to_dict(self):
        import json
        qa = []
        if self.qa_pairs:
            try:
                qa = json.loads(self.qa_pairs)
            except:
                pass
        return {
            'id': self.id,
            'session_id': self.session_id,
            'meeting_context': self.meeting_context,
            'qa_pairs': qa,
            'session_folder': self.session_folder,
            'status': self.status,
            'videos_ready': self.videos_ready,
            'videos_total': self.videos_total,
            'created_at': self.created_at.isoformat()
        }



class CustomQA(db.Model):
    """
    Stores custom Q&A pairs added by each user.
    These are questions the user expects to be asked.
    """

    __tablename__ = "custom_qa"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    question = db.Column(db.String(500), nullable=False)
    answer = db.Column(db.Text, nullable=False)
    video_path = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "question": self.question,
            "answer": self.answer,
            "video_path": self.video_path,
            "status": self.status,
        }

class PrepSession(db.Model):
    """
    Stores a meeting preparation session.
    Used to track video generation progress for session-specific videos.
    """
    __tablename__ = "prep_sessions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    meeting_context = db.Column(db.Text, nullable=False)
    meet_link = db.Column(db.String(300), nullable=True)
    
    # Store Q&A list as JSON string: [{"question": "...", "answer": "...", "video_path": "..."}]
    qa_data = db.Column(db.Text, nullable=True) 
    
    progress = db.Column(db.Integer, default=0)
    status_messages = db.Column(db.Text, default="[]") # JSON list of strings
    complete = db.Column(db.Boolean, default=False)
    error = db.Column(db.String(500), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        import json
        return {
            "id": self.id,
            "meeting_context": self.meeting_context,
            "meet_link": self.meet_link,
            "qa_data": json.loads(self.qa_data) if self.qa_data else [],
            "progress": self.progress,
            "status_messages": json.loads(self.status_messages) if self.status_messages else [],
            "complete": self.complete,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
        }
