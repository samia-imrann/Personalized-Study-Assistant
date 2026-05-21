import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_db, get_current_admin
from app.models.user import User
from app.models.quiz import Quiz, Question, StudyMaterial, Subject, Topic
from app.models.note import Note
from app.schemas.auth import UserOut
from app.schemas.quiz import (
    QuizOut,
    QuizCreate,
    StudyMaterialOut,
    StudyMaterialCreate,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
async def get_stats(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve platform-wide statistics for the admin dashboard."""
    user_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    quiz_count = (await db.execute(select(func.count(Quiz.id)))).scalar_one()
    material_count = (await db.execute(select(func.count(StudyMaterial.id)))).scalar_one()
    note_count = (await db.execute(select(func.count(Note.id)))).scalar_one()
    
    return {
        "users": user_count,
        "quizzes": quiz_count,
        "study_materials": material_count,
        "notes": note_count,
    }


@router.get("/users", response_model=list[UserOut])
async def list_users(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all registered users on the platform."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/users/{user_id}/toggle-admin", response_model=UserOut)
async def toggle_admin(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Toggle a user's administrative privileges (preventing revocation of the primary super-admin)."""
    try:
        target_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    result = await db.execute(select(User).where(User.id == target_uuid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Enforce protection of super-admin
    if user.email == "admin@adaptiq.com":
        raise HTTPException(
            status_code=400,
            detail="Cannot revoke permissions from the primary super-admin"
        )

    user.is_admin = not user.is_admin
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/quizzes", response_model=QuizOut)
async def create_quiz(
    body: QuizCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new quiz alongside all associated questions."""
    topic_res = await db.execute(select(Topic).where(Topic.id == body.topic_id))
    if not topic_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Topic not found")

    quiz = Quiz(title=body.title, topic_id=body.topic_id)
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)

    for q in body.questions:
        question = Question(
            quiz_id=quiz.id,
            question_text=q.question_text,
            options=q.options,
            correct_index=q.correct_index,
            difficulty=q.difficulty,
            topic_id=body.topic_id,
        )
        db.add(question)
    
    await db.commit()
    return quiz


@router.delete("/quizzes/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a quiz from the database."""
    from sqlalchemy import delete
    from app.models.quiz import QuizAttempt, Question
    
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    # Manually delete dependent records to avoid Foreign Key constraint errors 
    # on cloud databases where ON DELETE CASCADE might not be properly migrated
    await db.execute(delete(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id))
    await db.execute(delete(Question).where(Question.quiz_id == quiz_id))
    
    await db.delete(quiz)
    await db.commit()


@router.post("/study-materials", response_model=StudyMaterialOut)
async def create_study_material(
    body: StudyMaterialCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new study material resource linked to a topic."""
    topic_res = await db.execute(select(Topic).where(Topic.id == body.topic_id))
    topic = topic_res.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    material = StudyMaterial(
        title=body.title,
        description=body.description,
        url=body.url,
        topic_id=body.topic_id,
        material_type=body.material_type,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    material.topic_name = topic.name
    return material


@router.delete("/study-materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_study_material(
    material_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a study material resource."""
    result = await db.execute(select(StudyMaterial).where(StudyMaterial.id == material_id))
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Study material not found")
    await db.delete(material)
    await db.commit()


@router.get("/study-materials", response_model=list[StudyMaterialOut])
async def list_study_materials(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all study materials registered on the platform."""
    result = await db.execute(
        select(StudyMaterial, Topic.name.label("topic_name"))
        .join(Topic, Topic.id == StudyMaterial.topic_id)
        .order_by(StudyMaterial.id.desc())
    )
    rows = result.all()
    out = []
    for mat, topic_name in rows:
        mat.topic_name = topic_name
        out.append(mat)
    return out


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove inappropriate or obsolete community notes."""
    from app.services.notes_service import delete_file
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    try:
        delete_file(note.file_path)
    except Exception as e:
        print(f"Failed to delete note file: {e}")
    await db.delete(note)
    await db.commit()
