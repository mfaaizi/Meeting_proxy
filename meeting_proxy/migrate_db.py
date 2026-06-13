from app import app
from database import db
import sqlalchemy as sa

with app.app_context():
    # Add missing columns to meetings table
    with db.engine.connect() as conn:
        # Check and add each column if missing
        columns_to_add = [
            ("meeting_context", "TEXT"),
            ("transcript", "TEXT"),
            ("summary", "TEXT"),
            ("session_id", "VARCHAR(50)"),
            ("scheduled_at", "DATETIME"),
        ]

        for col_name, col_type in columns_to_add:
            try:
                conn.execute(sa.text(
                    f"ALTER TABLE meetings "
                    f"ADD COLUMN {col_name} {col_type}"
                ))
                conn.commit()
                print(f"✅ Added column: {col_name}")
            except Exception as e:
                if "duplicate column" in str(e).lower():
                    print(f"⏭️  Column exists: {col_name}")
                else:
                    print(f"❌ Error adding {col_name}: {e}")

    # Create any missing tables
    db.create_all()
    print("✅ All tables created/updated!")
    print("✅ Database migration complete!")