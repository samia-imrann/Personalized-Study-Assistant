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
    """Resolve connection parameters safely supporting Render DATABASE_URL format and passwords with special characters."""

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
        sys.exit("DATABASE_URL / DATABASE_URL_SYNC is not set.")

    scheme, sep, rest = url.partition("://")
    if not sep:
        sys.exit("Database URL has no '://'")

    # Split userinfo and host:port/dbname from the LAST '@' in the authority
    if "@" in rest:
        userinfo, host_path = rest.rsplit("@", 1)
    else:
        userinfo, host_path = "", rest

    user, password = "", ""
    if ":" in userinfo:
        user, password = userinfo.split(":", 1)
    else:
        user = userinfo

    if "/" in host_path:
        host_port, db_and_query = host_path.split("/", 1)
    else:
        host_port, db_and_query = host_path, ""

    dbname = db_and_query.split("?")[0] if db_and_query else "postgres"

    if ":" in host_port:
        host, port_str = host_port.rsplit(":", 1)
        try:
            port = int(port_str)
        except ValueError:
            port = 5432
    else:
        host = host_port
        port = 5432

    return dict(
        host=host,
        port=port,
        user=unquote(user),
        password=unquote(password),
        dbname=unquote(dbname),
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