from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.performance import (
    ProgressPoint,
    RecommendationOut,
    TopicPerformance,
    WeakTopic,
)
from app.services import ml_engine

router = APIRouter(prefix="/performance", tags=["Performance"])


@router.get("/summary", response_model=list[TopicPerformance])
async def performance_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await ml_engine.get_topic_performance(current_user.id, db)
    return [
        TopicPerformance(
            topic_id=d["topic_id"],
            topic_name=d["topic_name"],
            subject_name=d["subject_name"],
            avg_score=round(float(d["avg_score"]), 4),
        )
        for d in data
    ]


@router.get("/weak-topics", response_model=list[WeakTopic])
async def weak_topics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await ml_engine.get_weak_topics(current_user.id, db)
    return [
        WeakTopic(
            topic_id=d["topic_id"],
            topic_name=d["topic_name"],
            avg_score=round(float(d["avg_score"]), 4),
        )
        for d in data
    ]


@router.get("/recommendations", response_model=RecommendationOut)
async def recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await ml_engine.get_recommendations(current_user.id, db)
    return RecommendationOut(
        weak_topics=[
            WeakTopic(
                topic_id=w["topic_id"],
                topic_name=w["topic_name"],
                avg_score=round(float(w["avg_score"]), 4),
            )
            for w in data["weak_topics"]
        ],
        study_materials=data["study_materials"],
        recommended_quizzes=data["recommended_quizzes"],
    )


@router.get("/progress", response_model=list[ProgressPoint])
async def progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await ml_engine.get_progress_data(current_user.id, db)
    return [
        ProgressPoint(
            attempt_date=d["attempt_date"],
            topic_name=d["topic_name"],
            daily_pct=round(float(d["daily_pct"]) * 100, 1) if d["daily_pct"] else 0.0,
        )
        for d in data
    ]
