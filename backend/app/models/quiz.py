from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    topics: Mapped[list["Topic"]] = relationship(back_populates="subject", lazy="select")


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"))

    subject: Mapped["Subject"] = relationship(back_populates="topics", lazy="select")
    quizzes: Mapped[list["Quiz"]] = relationship(back_populates="topic", lazy="select")
    study_materials: Mapped[list["StudyMaterial"]] = relationship(back_populates="topic", lazy="select")


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    topic: Mapped["Topic"] = relationship(back_populates="quizzes", lazy="select")
    questions: Mapped[list["Question"]] = relationship(back_populates="quiz", lazy="select")
    attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="quiz", lazy="select")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"))
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[dict] = mapped_column(JSONB, nullable=False)
    correct_index: Mapped[int] = mapped_column(Integer, nullable=False)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"))
    difficulty: Mapped[str] = mapped_column(String(10), default="medium", nullable=False)

    quiz: Mapped["Quiz"] = relationship(back_populates="questions", lazy="select")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"))
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    topic_scores: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    answers_submitted: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    student: Mapped["User"] = relationship(back_populates="quiz_attempts", lazy="select")
    quiz: Mapped["Quiz"] = relationship(back_populates="attempts", lazy="select")


class StudyMaterial(Base):
    __tablename__ = "study_materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"))
    material_type: Mapped[str] = mapped_column(String(50), default="article", nullable=False)

    topic: Mapped["Topic"] = relationship(back_populates="study_materials", lazy="select")
