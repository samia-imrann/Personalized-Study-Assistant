import os
import sys
from pathlib import Path

# Allow importing app modules
sys.path.insert(0, str(Path(__file__).parent))

import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

import re

# Build sync connection string from env (support both DATABASE_URL_SYNC and Render's default DATABASE_URL)
raw_db_url = os.environ.get("DATABASE_URL_SYNC") or os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/adaptiq",
)

def get_psycopg2_dsn(url: str) -> str:
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return re.sub(r"^postgresql\+[a-zA-Z0-9_]+://", "postgresql://", url)

dsn = get_psycopg2_dsn(raw_db_url)


def run_migration():
    print(f"Connecting to: {dsn.split('@')[-1]}")
    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        print("Adding is_admin column to users table...")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;")
        
        print("Elevating user 'johndoe' to admin... (if exists)")
        cur.execute("UPDATE users SET is_admin = TRUE WHERE username = 'johndoe';")
        
        print("✅ Migration successful!")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
