from typing import Optional
from pydantic import BaseModel


class TopicPerformance(BaseModel):
    topic_id: int
    topic_name: str
    subject_name: str
    avg_score: float


class WeakTopic(BaseModel):
    topic_id: int
    topic_name: str
    avg_score: float


class ProgressPoint(BaseModel):
    attempt_date: str
    topic_name: str
    daily_pct: float


class RecommendationOut(BaseModel):
    weak_topics: list[WeakTopic]
    study_materials: list[dict]
    recommended_quizzes: list[dict]
