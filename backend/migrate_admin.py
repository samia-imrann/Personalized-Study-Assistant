import os
import sys
from pathlib import Path

# Allow importing app modules
sys.path.insert(0, str(Path(__file__).parent))

import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from urllib.parse import unquote

def connect_kwargs() -> dict:
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


def run_migration():
    kw = connect_kwargs()
    print(f"Connecting to {kw['host']}:{kw['port']}/{kw['dbname']} as {kw['user']}")
    conn = psycopg2.connect(**kw)
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
