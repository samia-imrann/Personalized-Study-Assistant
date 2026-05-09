"""
AdaptIQ Database Seed Script
=============================
Applies the SQL schema from database/adaptiq_schema.sql using psycopg2
(synchronous connection — no async needed for seeding).

Usage (run from project root with venv active):
    cd backend
    python seed.py

The schema already contains all INSERT statements for subjects, topics,
quizzes, questions, and study materials, so this script just executes it.
"""

import os
import sys
from pathlib import Path

# Allow importing app modules
sys.path.insert(0, str(Path(__file__).parent))

import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

SCHEMA_FILE = Path(__file__).parent.parent / "database" / "adaptiq_schema.sql"

# Build sync connection string from env
DB_URL = os.environ.get(
    "DATABASE_URL_SYNC",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/adaptiq",
)

# Convert SQLAlchemy URL to psycopg2 DSN
dsn = DB_URL.replace("postgresql+psycopg2://", "postgresql://")


def run_seed():
    print(f"Connecting to: {dsn.split('@')[-1]}")
    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    cur = conn.cursor()

    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    print("Applying schema + seed data …")

    try:
        cur.execute(sql)
        print("✅ Schema applied successfully — all tables, indexes, triggers, and seed data created.")
    except psycopg2.errors.DuplicateTable as e:
        print(f"⚠️  Schema already exists (run DROP SCHEMA public CASCADE first to reset): {e}")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_seed()
