"""
Collaboration Service — WebSocket connection manager + Redis pub/sub.
"""

from __future__ import annotations

import json
from typing import Optional

from fastapi import WebSocket

from app.redis_client import redis_client



class ConnectionManager:
    """Manages active WebSocket connections grouped by document ID."""

    def __init__(self):
        # doc_id (str) -> {user_id (str): WebSocket}
        self._rooms: dict[str, dict[str, WebSocket]] = {}
        # Track pending document changes for throttled database auto-save
        self._pending_saves: dict[str, str] = {}
        self._auto_save_task: Optional[asyncio.Task] = None

    def _room(self, doc_id: str) -> dict[str, WebSocket]:
        return self._rooms.setdefault(doc_id, {})

    async def connect(self, doc_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self._room(doc_id)[user_id] = websocket

        # Start background auto-save loop if not already running
        import asyncio
        if self._auto_save_task is None or self._auto_save_task.done():
            self._auto_save_task = asyncio.create_task(self._auto_save_loop())

    def disconnect(self, doc_id: str, user_id: str):
        room = self._rooms.get(doc_id, {})
        room.pop(user_id, None)
        if not room:
            self._rooms.pop(doc_id, None)

    def active_users(self, doc_id: str) -> list[str]:
        return list(self._rooms.get(doc_id, {}).keys())

    def has_active_users(self, doc_id: str) -> bool:
        return bool(self._rooms.get(doc_id))

    async def broadcast(self, doc_id: str, message: dict, exclude_user: Optional[str] = None):
        """Send a message to all users in a room (optionally exclude sender)."""
        room = self._rooms.get(doc_id, {})
        dead = []
        for uid, ws in list(room.items()):
            if uid == exclude_user:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            room.pop(uid, None)

    async def send_personal(self, doc_id: str, user_id: str, message: dict):
        ws = self._rooms.get(doc_id, {}).get(user_id)
        if ws:
            await ws.send_json(message)

    def queue_save(self, doc_id: str, content: str):
        """Queue a document's latest content for debounced database auto-save."""
        self._pending_saves[doc_id] = content

    async def _auto_save_loop(self):
        """Periodically persist modified documents to PostgreSQL to optimize DB performance."""
        import asyncio
        while True:
            await asyncio.sleep(3.0)  # Throttled write delay (save at most once every 3 seconds)
            if not self._pending_saves:
                continue

            # Take a snapshot and clear the pending queue
            saves_to_run = list(self._pending_saves.items())
            self._pending_saves.clear()

            from app.db.session import AsyncSessionLocal
            async with AsyncSessionLocal() as db:
                for doc_id, content in saves_to_run:
                    try:
                        await persist_doc(doc_id, db, content=content)
                    except Exception as e:
                        print(f"Auto-save failed for document {doc_id}: {e}")


# Singleton used by the collab route
manager = ConnectionManager()


async def get_or_load_doc(doc_id: str, db) -> str:
    """Load document content from PostgreSQL first to guarantee data integrity, then cache in Redis."""
    from sqlalchemy import select
    from app.models.document import Document
    import uuid

    result = await db.execute(
        select(Document).where(Document.id == uuid.UUID(doc_id))
    )
    doc = result.scalar_one_or_none()
    content = doc.content if doc else ""

    try:
        # Cache in Redis with a 1-hour TTL so stale keys don't linger
        await redis_client.set(f"doc:{doc_id}", content, ex=3600)
    except Exception as e:
        print(f"Redis set failed in get_or_load_doc: {e}")
    return content


async def apply_and_broadcast(doc_id: str, user_id: str, delta: dict, db=None):
    """Apply a text delta to Redis state, broadcast instantly, and queue for throttled auto-save."""
    new_content = delta.get("content", "")
    try:
        # Store in Redis with a 1-hour TTL
        await redis_client.set(f"doc:{doc_id}", new_content, ex=3600)
    except Exception as e:
        print(f"Redis set failed in edit: {e}")

    # Broadcast to all connected users except the sender
    message = {
        "type": "edit",
        "payload": {
            "delta": delta,
            "userId": user_id,
            "activeUsers": manager.active_users(doc_id),
        },
    }
    await manager.broadcast(doc_id, message, exclude_user=user_id)

    try:
        # Also publish via Redis pub/sub (for multi-instance scaling)
        await redis_client.publish(f"room:{doc_id}", json.dumps(message))
    except Exception as e:
        print(f"Redis publish failed: {e}")

    # Queue for throttled auto-save to optimize DB write performance and prevent typing lag!
    manager.queue_save(doc_id, new_content)


async def persist_doc(doc_id: str, db, content: Optional[str] = None):
    """Write current state back to PostgreSQL."""
    import uuid
    from sqlalchemy import update
    from app.models.document import Document

    if content is None:
        try:
            content = await redis_client.get(f"doc:{doc_id}")
        except Exception as e:
            print(f"Redis get failed in persist: {e}")

    # Fallback to in-memory pending queue if Redis is not populated or offline
    if content is None:
        content = manager._pending_saves.get(doc_id)

    if content is None:
        return
    stmt = (
        update(Document)
        .where(Document.id == uuid.UUID(doc_id))
        .values(content=content)
    )
    await db.execute(stmt)
    await db.commit()