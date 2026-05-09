import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(200), default="Untitled Document", nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    owner: Mapped["User"] = relationship(back_populates="documents", lazy="select")
    collaborators: Mapped[list["DocumentCollaborator"]] = relationship(
        back_populates="document", lazy="select", cascade="all, delete-orphan"
    )
    operations: Mapped[list["DocumentOperation"]] = relationship(
        back_populates="document", lazy="select", cascade="all, delete-orphan"
    )


class DocumentCollaborator(Base):
    __tablename__ = "document_collaborators"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    added_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    document: Mapped["Document"] = relationship(back_populates="collaborators", lazy="select")


class DocumentOperation(Base):
    __tablename__ = "document_operations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    delta: Mapped[dict] = mapped_column(JSONB, nullable=False)
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    document: Mapped["Document"] = relationship(back_populates="operations", lazy="select")
