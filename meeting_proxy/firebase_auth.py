import firebase_admin
from firebase_admin import auth, credentials

# Initialize Firebase Admin SDK once
_firebase_initialized = False


def init_firebase():
    """
    Initializes Firebase Admin SDK.
    Called once when Flask app starts.
    """
    global _firebase_initialized
    if _firebase_initialized:
        return

    try:
        # Load service account key from JSON file in project root.
        cred = credentials.Certificate("firebase_admin_key.json")
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        print("[Firebase] Admin SDK initialized!")
    except Exception as e:
        print(f"[Firebase] Init error: {e}")
        raise


def verify_firebase_token(id_token: str) -> dict:
    """
    Verifies a Firebase ID token sent from the frontend.
    Returns the decoded token with user info if valid.
    Raises exception if token is invalid or expired.
    """
    try:
        # Verify the token with Firebase.
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"[Firebase] Token verification failed: {e}")
        raise


def require_firebase_auth(f):
    """
    Decorator that protects Flask routes.
    Expects 'Authorization: Bearer <firebase_token>'
    header in the request.
    """
    from functools import wraps
    from flask import jsonify, request, session

    @wraps(f)
    def decorated(*args, **kwargs):
        # First check session (already logged in).
        if session.get("user_id"):
            return f(*args, **kwargs)

        # Check Authorization header.
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Login required"}), 401

        # Extract and verify token.
        id_token = auth_header.split("Bearer ")[1]
        try:
            decoded = verify_firebase_token(id_token)

            # Get or create user in our database.
            from database import User, db

            google_id = decoded.get("uid")
            email = decoded.get("email")
            name = decoded.get("name", email)
            picture = decoded.get("picture", "")

            user = User.query.filter_by(google_id=google_id).first()

            if not user:
                user = User(
                    google_id=google_id,
                    email=email,
                    name=name,
                    profile_picture=picture,
                )
                db.session.add(user)
                db.session.commit()
                user.get_library_folder()
                user.get_cache_folder()
                print(f"[Firebase] New user: {email}")
            else:
                user.name = name
                user.profile_picture = picture
                db.session.commit()

            # Store in session for subsequent requests.
            session["user_id"] = user.id
            return f(*args, **kwargs)

        except Exception as e:
            return jsonify({"error": str(e)}), 401

    return decorated
