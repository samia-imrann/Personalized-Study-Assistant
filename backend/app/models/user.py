import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    is_admin: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    quiz_attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="student", lazy="select")
    notes: Mapped[list["Note"]] = relationship(back_populates="uploader", lazy="select")
    reviews: Mapped[list["Review"]] = relationship(back_populates="reviewer", lazy="select")
    documents: Mapped[list["Document"]] = relationship(back_populates="owner", lazy="select")
