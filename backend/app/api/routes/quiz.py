from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_db, get_current_user
from app.models.quiz import Quiz, Question, QuizAttempt, Subject, Topic
from app.models.user import User
from app.schemas.quiz import (
    AttemptRequest,
    AttemptResultOut,
    AttemptHistoryOut,
    QuizDetailOut,
    QuizOut,
    SubjectOut,
    TopicOut,
    TopicScoreOut,
)

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


@router.get("/subjects", response_model=list[SubjectOut])
async def list_subjects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subject).order_by(Subject.name))
    return result.scalars().all()


@router.get("/topics", response_model=list[TopicOut])
async def list_topics(
    subject_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Topic).order_by(Topic.name)
    if subject_id:
        q = q.where(Topic.subject_id == subject_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/", response_model=list[QuizOut])
async def list_quizzes(
    topic_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Quiz).order_by(Quiz.created_at.desc())
    if topic_id:
        q = q.where(Quiz.topic_id == topic_id)
    if subject_id:
        # Join topics to filter by subject
        q = q.join(Topic).where(Topic.subject_id == subject_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/attempts/history", response_model=list[AttemptHistoryOut])
async def attempt_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(QuizAttempt, Quiz.title)
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .where(QuizAttempt.student_id == current_user.id)
        .order_by(QuizAttempt.attempted_at.desc())
        .limit(50)
    )
    rows = result.all()
    out = []
    for attempt, title in rows:
        pct = round(attempt.score / attempt.total_questions * 100, 1) if attempt.total_questions else 0.0
        out.append(
            AttemptHistoryOut(
                id=attempt.id,
                quiz_id=attempt.quiz_id,
                quiz_title=title,
                score=attempt.score,
                total_questions=attempt.total_questions,
                percentage=pct,
                attempted_at=attempt.attempted_at,
            )
        )
    return out


@router.get("/{quiz_id}", response_model=QuizDetailOut)
async def get_quiz(quiz_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.post("/{quiz_id}/attempt", response_model=AttemptResultOut)
async def submit_attempt(
    quiz_id: int,
    body: AttemptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch quiz + questions
    result = await db.execute(
        select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    question_map: dict[int, Question] = {q.id: q for q in quiz.questions}
    score = 0
    topic_correct: dict[int, int] = {}
    topic_total: dict[int, int] = {}
    answers_submitted = []

    for ans in body.answers:
        q = question_map.get(ans.question_id)
        if not q:
            continue
        tid = q.topic_id
        topic_total[tid] = topic_total.get(tid, 0) + 1
        is_correct = ans.chosen_index == q.correct_index
        if is_correct:
            score += 1
            topic_correct[tid] = topic_correct.get(tid, 0) + 1
        else:
            topic_correct.setdefault(tid, 0)
        answers_submitted.append(
            {"question_id": ans.question_id, "chosen_index": ans.chosen_index}
        )

    total = len(quiz.questions)
    topic_scores = {
        str(tid): round(topic_correct.get(tid, 0) / topic_total[tid], 4)
        for tid in topic_total
    }

    attempt = QuizAttempt(
        student_id=current_user.id,
        quiz_id=quiz_id,
        score=score,
        total_questions=total,
        topic_scores=topic_scores,
        answers_submitted=answers_submitted,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    # Build topic breakdown for response
    topic_ids = list(topic_total.keys())
    topics_result = await db.execute(select(Topic).where(Topic.id.in_(topic_ids)))
    topics = {t.id: t.name for t in topics_result.scalars()}

    breakdown = [
        TopicScoreOut(
            topic_id=tid,
            topic_name=topics.get(tid, str(tid)),
            score=round(topic_correct.get(tid, 0) / topic_total[tid] * 100, 1),
            correct=topic_correct.get(tid, 0),
            total=topic_total[tid],
        )
        for tid in topic_total
    ]

    return AttemptResultOut(
        attempt_id=attempt.id,
        quiz_id=quiz_id,
        score=score,
        total_questions=total,
        percentage=round(score / total * 100, 1) if total else 0.0,
        topic_breakdown=breakdown,
    )
