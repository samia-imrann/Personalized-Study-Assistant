from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentCreate(BaseModel):
    title: str = "Untitled Document"


class DocumentOut(BaseModel):
    id: UUID
    title: str
    owner_id: UUID
    created_at: datetime
    updated_at: datetime
    is_owner: bool = False
    model_config = {"from_attributes": True}


class DocumentDetailOut(DocumentOut):
    content: str


class InviteRequest(BaseModel):
    email: str


class CollabMessage(BaseModel):
    type: str          # "init" | "edit" | "user_joined" | "user_left" | "cursor"
    payload: dict
