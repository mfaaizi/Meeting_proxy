import os

from flask import (
    Blueprint,
    jsonify,
    redirect,
    session as flask_session,
    url_for,
)
from authlib.integrations.flask_client import OAuth

from database import User, db

# Create auth blueprint
auth_bp = Blueprint("auth", __name__)

# OAuth object — configured in app.py
oauth = OAuth()


def init_oauth(app):
    """
    Initializes Google OAuth with the Flask app.
    Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
    """
    oauth.init_app(app)

    # Register Google as OAuth provider
    oauth.register(
        name="google",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        server_metadata_url=(
            "https://accounts.google.com/.well-known/"
            "openid-configuration"
        ),
        client_kwargs={
            "scope": "openid email profile",
        },
    )
    return oauth


@auth_bp.route("/auth/login")
def login():
    """
    Redirects user to Google OAuth login page.
    """
    redirect_uri = url_for("auth.google_callback", _external=True)
    return oauth.google.authorize_redirect(redirect_uri)


@auth_bp.route("/auth/google/callback")
def google_callback():
    """
    Handles Google OAuth callback after user logs in.
    Creates user in database if first time.
    """
    try:
        # Get token from Google
        token = oauth.google.authorize_access_token()

        # Get user info from Google
        user_info = token.get("userinfo")

        if not user_info:
            return jsonify({"error": "Failed to get user info"}), 400

        google_id = user_info.get("sub")
        email = user_info.get("email")
        name = user_info.get("name")
        picture = user_info.get("picture")

        # Check if user exists in database
        user = User.query.filter_by(google_id=google_id).first()

        if not user:
            # First time login — create new user
            user = User(
                google_id=google_id,
                email=email,
                name=name,
                profile_picture=picture,
            )
            db.session.add(user)
            db.session.commit()

            # Create user's folders
            user.get_library_folder()
            user.get_cache_folder()

            print(f"[Auth] New user created: {email}")
            # Redirect to onboarding for new users
            session["user_id"] = user.id
            return redirect("/onboarding")

        # Existing user — update their info
        user.name = name
        user.profile_picture = picture
        db.session.commit()
        print(f"[Auth] User logged in: {email}")

        # Store user ID in session
        session["user_id"] = user.id

        # Redirect to dashboard
        return redirect("/dashboard")

    except Exception as e:
        print(f"[Auth] OAuth error: {e}")
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/auth/logout")
def logout():
    """Logs out the current user."""
    session.clear()
    return redirect("/")


@auth_bp.route("/auth/me")
def get_current_user():
    """
    Returns current logged in user's data.
    Used by frontend to check if user is logged in.
    """
    user_id = flask_session.get("user_id")
    if not user_id:
        return jsonify({"user": None}), 200

    user = db.session.get(User, user_id)
    if not user:
        flask_session.clear()
        return jsonify({"user": None}), 200

    return jsonify({"user": user.to_dict()}), 200


def require_login(f):
    """
    Decorator that protects routes requiring login.
    Returns 401 if user is not logged in.
    """
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = flask_session.get("user_id")
        if not user_id:
            return jsonify({"error": "Login required"}), 401
        return f(*args, **kwargs)

    return decorated
