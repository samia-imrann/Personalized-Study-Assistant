"""
Collaboration Service — WebSocket connection manager + Redis pub/sub.
"""

from __future__ import annotations

import asyncio
import json
from typing import Optional
from uuid import UUID

from fastapi import WebSocket

from app.redis_client import redis_client


class ConnectionManager:
    """Manages active WebSocket connections grouped by document ID."""

    def __init__(self):
        # doc_id (str) -> {user_id (str): WebSocket}
        self._rooms: dict[str, dict[str, WebSocket]] = {}

    def _room(self, doc_id: str) -> dict[str, WebSocket]:
        return self._rooms.setdefault(doc_id, {})

    async def connect(self, doc_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self._room(doc_id)[user_id] = websocket

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


# Singleton used by the collab route
manager = ConnectionManager()


async def get_or_load_doc(doc_id: str, db) -> str:
    """Load document content from Redis or fall back to PostgreSQL."""
    cached = await redis_client.get(f"doc:{doc_id}")
    if cached is not None:
        return cached

    from sqlalchemy import select
    from app.models.document import Document
    import uuid

    result = await db.execute(
        select(Document).where(Document.id == uuid.UUID(doc_id))
    )
    doc = result.scalar_one_or_none()
    content = doc.content if doc else ""
    await redis_client.set(f"doc:{doc_id}", content)
    return content


async def apply_and_broadcast(doc_id: str, user_id: str, delta: dict, db):
    """Apply a text delta to Redis state and broadcast via pub/sub."""
    # Apply delta — simple replacement strategy (client sends full new content)
    new_content = delta.get("content", "")
    await redis_client.set(f"doc:{doc_id}", new_content)

    # Broadcast to all connected users except sender
    message = {
        "type": "edit",
        "payload": {
            "delta": delta,
            "userId": user_id,
            "activeUsers": manager.active_users(doc_id),
        },
    }
    await manager.broadcast(doc_id, message, exclude_user=user_id)

    # Also publish via Redis pub/sub (for multi-instance scaling)
    await redis_client.publish(f"room:{doc_id}", json.dumps(message))


async def persist_doc(doc_id: str, db):
    """Write current Redis state back to PostgreSQL."""
    import uuid
    from sqlalchemy import update
    from app.models.document import Document

    content = await redis_client.get(f"doc:{doc_id}")
    if content is None:
        return
    stmt = (
        update(Document)
        .where(Document.id == uuid.UUID(doc_id))
        .values(content=content)
    )
    await db.execute(stmt)
    await db.commit()
