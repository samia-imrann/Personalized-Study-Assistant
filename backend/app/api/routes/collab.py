import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.core.security import decode_token
from app.models.document import Document, DocumentCollaborator
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentDetailOut, DocumentOut, InviteRequest
from app.services.collab_service import (
    apply_and_broadcast,
    get_or_load_doc,
    manager,
    persist_doc,
)

router = APIRouter(prefix="/documents", tags=["Collaboration"])


@router.post("/", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def create_document(
    body: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = Document(title=body.title, owner_id=current_user.id)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return DocumentOut(
        id=doc.id,
        title=doc.title,
        owner_id=doc.owner_id,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        is_owner=True,
    )


@router.get("/", response_model=list[DocumentOut])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = current_user.id
    result = await db.execute(
        select(Document)
        .where(
            (Document.owner_id == uid)
            | Document.id.in_(
                select(DocumentCollaborator.document_id).where(
                    DocumentCollaborator.user_id == uid
                )
            )
        )
        .order_by(Document.updated_at.desc())
    )
    docs = result.scalars().all()
    return [
        DocumentOut(
            id=d.id,
            title=d.title,
            owner_id=d.owner_id,
            created_at=d.created_at,
            updated_at=d.updated_at,
            is_owner=(d.owner_id == uid),
        )
        for d in docs
    ]


@router.get("/{doc_id}", response_model=DocumentDetailOut)
async def get_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await _require_access(doc_id, current_user.id, db)
    return DocumentDetailOut(
        id=doc.id,
        title=doc.title,
        owner_id=doc.owner_id,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        content=doc.content,
        is_owner=(doc.owner_id == current_user.id),
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this document")
    await db.delete(doc)
    await db.commit()


@router.post("/{doc_id}/invite", status_code=status.HTTP_200_OK)
async def invite_collaborator(
    doc_id: uuid.UUID,
    body: InviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc or doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can invite collaborators")

    # Find invitee
    user_res = await db.execute(select(User).where(User.email == body.email))
    invitee = user_res.scalar_one_or_none()
    if not invitee:
        raise HTTPException(status_code=404, detail="User with that email not found")

    # Avoid duplicate
    dup = await db.execute(
        select(DocumentCollaborator).where(
            (DocumentCollaborator.document_id == doc_id)
            & (DocumentCollaborator.user_id == invitee.id)
        )
    )
    if not dup.scalar_one_or_none():
        collab = DocumentCollaborator(document_id=doc_id, user_id=invitee.id)
        db.add(collab)
        await db.commit()

    return {"detail": f"{invitee.username} added as collaborator"}


# ─── WebSocket Endpoint ───────────────────────────────────────────────────────

@router.websocket("/ws/{doc_id}")
async def collab_ws(
    doc_id: str,
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
):
    # Authenticate via query param token
    token = websocket.query_params.get("token")
    user_id = decode_token(token) if token else None
    if not user_id:
        await websocket.close(code=4001)
        return

    # Verify document access
    try:
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        await websocket.close(code=4002)
        return

    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    doc = result.scalar_one_or_none()
    if not doc:
        await websocket.close(code=4004)
        return

    # Get user info
    user_result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = user_result.scalar_one_or_none()
    if not user:
        await websocket.close(code=4001)
        return

    # Connect user to room
    await manager.connect(doc_id, user_id, websocket)

    try:
        # Send initial document state
        content = await get_or_load_doc(doc_id, db)
        await websocket.send_json({
            "type": "init",
            "payload": {
                "content": content,
                "activeUsers": manager.active_users(doc_id),
                "docId": doc_id,
                "title": doc.title,
            },
        })

        # Notify others
        await manager.broadcast(doc_id, {
            "type": "user_joined",
            "payload": {"userId": user_id, "username": user.username, "activeUsers": manager.active_users(doc_id)},
        }, exclude_user=user_id)

        # Listen for messages
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "edit":
                delta = data.get("payload", {})
                await apply_and_broadcast(doc_id, user_id, delta, db)

            elif msg_type == "cursor":
                await manager.broadcast(doc_id, {
                    "type": "cursor",
                    "payload": {
                        "userId": user_id,
                        "username": user.username,
                        "position": data.get("payload", {}).get("position", 0),
                    },
                }, exclude_user=user_id)

    except WebSocketDisconnect:
        manager.disconnect(doc_id, user_id)
        await manager.broadcast(doc_id, {
            "type": "user_left",
            "payload": {"userId": user_id, "username": user.username, "activeUsers": manager.active_users(doc_id)},
        })
        # Final persist if no active users remain
        if not manager.has_active_users(doc_id):
            await persist_doc(doc_id, db)


# ─── Helper ───────────────────────────────────────────────────────────────────

async def _require_access(doc_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Document:
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.owner_id == user_id:
        return doc

    collab = await db.execute(
        select(DocumentCollaborator).where(
            (DocumentCollaborator.document_id == doc_id)
            & (DocumentCollaborator.user_id == user_id)
        )
    )
    if not collab.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")
    return doc
