from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class SubjectOut(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class TopicOut(BaseModel):
    id: int
    name: str
    subject_id: int
    model_config = {"from_attributes": True}


class QuestionOut(BaseModel):
    id: int
    question_text: str
    options: list[str]
    topic_id: int
    difficulty: str
    model_config = {"from_attributes": True}


class QuizOut(BaseModel):
    id: int
    title: str
    topic_id: int
    created_at: datetime
    model_config = {"from_attributes": True}


class QuizDetailOut(QuizOut):
    questions: list[QuestionOut]


class AnswerIn(BaseModel):
    question_id: int
    chosen_index: int


class AttemptRequest(BaseModel):
    answers: list[AnswerIn]


class TopicScoreOut(BaseModel):
    topic_id: int
    topic_name: str
    score: float
    correct: int
    total: int


class AttemptResultOut(BaseModel):
    attempt_id: int
    quiz_id: int
    score: int
    total_questions: int
    percentage: float
    topic_breakdown: list[TopicScoreOut]


class AttemptHistoryOut(BaseModel):
    id: int
    quiz_id: int
    quiz_title: str
    score: int
    total_questions: int
    percentage: float
    attempted_at: datetime
    model_config = {"from_attributes": True}


class StudyMaterialOut(BaseModel):
    id: int
    title: str
    description: str
    url: str
    topic_id: int
    material_type: str
    topic_name: Optional[str] = None
    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    question_text: str
    options: list[str]
    correct_index: int
    difficulty: str = "medium"


class QuizCreate(BaseModel):
    title: str
    topic_id: int
    questions: list[QuestionCreate]


class StudyMaterialCreate(BaseModel):
    title: str
    description: str = ""
    url: str
    topic_id: int
    material_type: str = "article"
