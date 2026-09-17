"""
AdaptIQ Database Seed Script
=============================
Applies database/adaptiq_schema.sql using psycopg2.

Usage:
    cd backend && python seed.py
"""

import os
import sys
from pathlib import Path
from urllib.parse import urlsplit, unquote

import psycopg2
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

SCHEMA_FILE = ROOT / "database" / "adaptiq_schema.sql"


def connect_kwargs() -> dict:
    """Resolve connection parameters without letting libpq parse a URI."""

    # Discrete vars win when present: no parsing, no escaping rules.
    if os.environ.get("PGHOST"):
        return dict(
            host=os.environ["PGHOST"],
            port=int(os.environ.get("PGPORT") or 5432),
            user=os.environ["PGUSER"],
            password=os.environ["PGPASSWORD"],
            dbname=os.environ["PGDATABASE"],
            sslmode=os.environ.get("PGSSLMODE", "require"),
        )

    url = (os.environ.get("DATABASE_URL_SYNC") or os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        sys.exit("DATABASE_URL_SYNC is not set. Refusing to silently fall back to localhost.")

    # Normalise the scheme: strip any SQLAlchemy driver suffix, accept postgres://
    scheme, sep, rest = url.partition("://")
    if not sep:
        sys.exit("Database URL has no '://' — is it a libpq keyword string?")
    scheme = scheme.split("+", 1)[0]
    if scheme == "postgres":
        scheme = "postgresql"
    if scheme != "postgresql":
        sys.exit(f"Unexpected scheme {scheme!r} in database URL.")

    parts = urlsplit(f"postgresql://{rest}")

    try:
        port = parts.port or 5432
    except ValueError:
        bad = parts.netloc.rsplit(":", 1)[-1]
        sys.exit(
            f"Malformed database URL: the port field holds {len(bad)} non-numeric "
            "characters. That is your password in the wrong slot, or a password "
            "containing an unescaped '/', '@' or ':'. Use PGHOST/PGPORT/PGUSER/"
            "PGPASSWORD/PGDATABASE instead, or percent-encode the credentials."
        )

    if not parts.hostname:
        sys.exit("Malformed database URL: no hostname could be parsed.")

    return dict(
        host=parts.hostname,
        port=port,
        user=unquote(parts.username or ""),
        password=unquote(parts.password or ""),
        dbname=unquote(parts.path.lstrip("/")) or "postgres",
        sslmode=os.environ.get("PGSSLMODE", "require"),
    )


def run_seed():
    if not SCHEMA_FILE.exists():
        sys.exit(f"Schema file not found: {SCHEMA_FILE}")

    kw = connect_kwargs()
    print(f"Connecting to {kw['host']}:{kw['port']}/{kw['dbname']} as {kw['user']}")

    conn = psycopg2.connect(**kw)
    conn.autocommit = True
    cur = conn.cursor()

    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    print("Applying schema + seed data …")

    try:
        cur.execute(sql)
        print("Schema applied — tables, indexes, triggers and seed data created.")
    except psycopg2.errors.DuplicateTable as e:
        print(f"Schema already exists, skipping: {e}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_seed()