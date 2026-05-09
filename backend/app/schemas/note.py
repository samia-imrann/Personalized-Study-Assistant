from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ReviewIn(BaseModel):
    star_rating: int
    text: str = ""


class ReviewOut(BaseModel):
    id: int
    note_id: int
    reviewer_id: UUID
    reviewer_username: str
    star_rating: int
    text: str
    created_at: datetime
    model_config = {"from_attributes": True}


class NoteOut(BaseModel):
    id: int
    title: str
    description: str
    subject: str
    course: str
    topic: str
    uploader_id: UUID
    uploader_username: str
    average_rating: float
    created_at: datetime
    file_path: str
    model_config = {"from_attributes": True}


class NoteDetailOut(NoteOut):
    reviews: list[ReviewOut] = []
