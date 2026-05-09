import os
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_db, get_current_user
from app.models.note import Note, Review
from app.models.user import User
from app.schemas.note import NoteDetailOut, NoteOut, ReviewIn, ReviewOut
from app.services.notes_service import delete_file, save_upload

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.post("/", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def upload_note(
    title: str = Form(...),
    description: str = Form(""),
    subject: str = Form(""),
    course: str = Form(""),
    topic: str = Form(""),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        file_path = await save_upload(file, str(current_user.id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    note = Note(
        title=title,
        description=description,
        file_path=file_path,
        subject=subject,
        course=course,
        topic=topic,
        uploader_id=current_user.id,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    return _note_to_out(note, current_user.username)


@router.get("/", response_model=list[NoteOut])
async def search_notes(
    q: Optional[str] = Query(None, description="Full-text search query"),
    subject: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    sql = text("""
        SELECT
            n.id, n.title, n.description, n.subject, n.course, n.topic,
            n.file_path, n.average_rating, n.created_at,
            n.uploader_id,
            u.username AS uploader_username,
            CASE
                WHEN :query IS NOT NULL
                THEN ts_rank(n.search_vector, plainto_tsquery('english', :query))
                ELSE 0
            END AS relevance_score
        FROM notes n
        JOIN users u ON u.id = n.uploader_id
        WHERE
            (:query   IS NULL OR n.search_vector @@ plainto_tsquery('english', :query))
            AND (:subject IS NULL OR n.subject = :subject)
            AND (:course  IS NULL OR n.course  = :course)
            AND (:topic   IS NULL OR n.topic   = :topic)
        ORDER BY relevance_score DESC, n.average_rating DESC
        LIMIT 50
    """)
    result = await db.execute(
        sql,
        {
            "query": q if q else None,
            "subject": subject,
            "course": course,
            "topic": topic,
        },
    )
    rows = result.mappings().all()
    return [
        NoteOut(
            id=r["id"],
            title=r["title"],
            description=r["description"],
            subject=r["subject"],
            course=r["course"],
            topic=r["topic"],
            file_path=r["file_path"],
            uploader_id=r["uploader_id"],
            uploader_username=r["uploader_username"],
            average_rating=float(r["average_rating"]),
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.get("/{note_id}", response_model=NoteDetailOut)
async def get_note(note_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Note)
        .options(selectinload(Note.uploader), selectinload(Note.reviews).selectinload(Review.reviewer))
        .where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    reviews_out = [
        ReviewOut(
            id=r.id,
            note_id=r.note_id,
            reviewer_id=r.reviewer_id,
            reviewer_username=r.reviewer.username,
            star_rating=r.star_rating,
            text=r.text,
            created_at=r.created_at,
        )
        for r in note.reviews
    ]
    detail = NoteDetailOut(
        **_note_to_out(note, note.uploader.username).model_dump(),
        reviews=reviews_out,
    )
    return detail


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if str(note.uploader_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your note")
    delete_file(note.file_path)
    await db.delete(note)
    await db.commit()


@router.post("/{note_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def submit_review(
    note_id: int,
    body: ReviewIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not 1 <= body.star_rating <= 5:
        raise HTTPException(status_code=400, detail="star_rating must be between 1 and 5")

    # Check note exists
    note_res = await db.execute(select(Note).where(Note.id == note_id))
    if not note_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Note not found")

    # Check duplicate
    dup = await db.execute(
        select(Review).where(
            (Review.note_id == note_id) & (Review.reviewer_id == current_user.id)
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already reviewed this note")

    review = Review(
        note_id=note_id,
        reviewer_id=current_user.id,
        star_rating=body.star_rating,
        text=body.text,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    return ReviewOut(
        id=review.id,
        note_id=review.note_id,
        reviewer_id=review.reviewer_id,
        reviewer_username=current_user.username,
        star_rating=review.star_rating,
        text=review.text,
        created_at=review.created_at,
    )


@router.get("/{note_id}/reviews", response_model=list[ReviewOut])
async def list_reviews(note_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.reviewer))
        .where(Review.note_id == note_id)
        .order_by(Review.created_at.desc())
    )
    reviews = result.scalars().all()
    return [
        ReviewOut(
            id=r.id,
            note_id=r.note_id,
            reviewer_id=r.reviewer_id,
            reviewer_username=r.reviewer.username,
            star_rating=r.star_rating,
            text=r.text,
            created_at=r.created_at,
        )
        for r in reviews
    ]


# ─── Helper ───────────────────────────────────────────────────────────────────

def _note_to_out(note: Note, uploader_username: str) -> NoteOut:
    return NoteOut(
        id=note.id,
        title=note.title,
        description=note.description,
        subject=note.subject,
        course=note.course,
        topic=note.topic,
        file_path=note.file_path,
        uploader_id=note.uploader_id,
        uploader_username=uploader_username,
        average_rating=note.average_rating,
        created_at=note.created_at,
    )
