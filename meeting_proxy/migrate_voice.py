"""
Database Migration: Add Voice Settings Columns
================================================
Adds voice_id, voice_name, and voice_provider columns
to the users table for ElevenLabs custom voice support.

Run this once:
    python migrate_voice.py
"""

import sqlite3
import os

# Path to the SQLite database
DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "instance",
    "meeting_proxy.db"
)


def migrate():
    """Adds voice columns to the users table."""

    if not os.path.exists(DB_PATH):
        print(f"[Migration] Database not found at: {DB_PATH}")
        print("[Migration] It will be created when Flask starts.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check which columns already exist
    cursor.execute("PRAGMA table_info(users)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    migrations = [
        ("voice_id", "VARCHAR(200)"),
        ("voice_name", "VARCHAR(100)"),
        ("voice_provider", "VARCHAR(50) DEFAULT 'microsoft'"),
    ]

    for col_name, col_type in migrations:
        if col_name in existing_columns:
            print(f"[Migration] Column '{col_name}' already exists — skipping")
        else:
            sql = f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"
            cursor.execute(sql)
            print(f"[Migration] Added column: {col_name} ({col_type})")

    conn.commit()
    conn.close()
    print("[Migration] Voice columns migration complete!")


if __name__ == "__main__":
    migrate()
