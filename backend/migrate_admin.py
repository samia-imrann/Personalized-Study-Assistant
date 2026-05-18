import os
import sys
from pathlib import Path

# Allow importing app modules
sys.path.insert(0, str(Path(__file__).parent))

import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

DB_URL = os.environ.get(
    "DATABASE_URL_SYNC",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/adaptiq",
)
dsn = DB_URL.replace("postgresql+psycopg2://", "postgresql://")


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
