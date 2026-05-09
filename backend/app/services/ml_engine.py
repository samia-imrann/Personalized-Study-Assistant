"""
ML Performance Analysis & Recommendation Engine
Implements:
  - Feature vector building (per-topic average scores)
  - Weak topic detection (avg < 60%)
  - Content-based recommendation using cosine similarity
  - Fallback: top-rated materials from DB when model unavailable
"""

from __future__ import annotations

import os
import pickle
from pathlib import Path
from typing import Optional
from uuid import UUID

import numpy as np
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

MODEL_PATH = Path(__file__).parent.parent.parent.parent / "ml" / "model" / "recommender.pkl"
WEAK_THRESHOLD = 0.60  # below 60% = weak topic


class ContentBasedRecommender:
    """Cosine-similarity recommender over topic–material space."""

    def __init__(self, topic_matrix: np.ndarray, topic_ids: list[int], material_ids: list[int], t_idx: dict, topic_material_map: dict):
        from sklearn.metrics.pairwise import cosine_similarity
        self.topic_matrix = topic_matrix
        self.topic_ids = topic_ids
        self.material_ids = material_ids
        self._t_idx = t_idx
        self._topic_material_map = topic_material_map
        self._sim = cosine_similarity(topic_matrix)

    def predict(self, weak_topic_ids: list[int], top_k: int = 8) -> list[int]:
        """Return ranked material IDs for the given weak topics."""
        material_scores = np.zeros(len(self.material_ids))

        for tid in weak_topic_ids:
            idx = self._t_idx.get(tid)
            if idx is None:
                for mid in self._topic_material_map.get(tid, []):
                    if mid in self.material_ids:
                        material_scores[self.material_ids.index(mid)] += 1.0
                continue
            sim_row = self._sim[idx]
            for other_idx, sim_score in enumerate(sim_row):
                other_tid = self.topic_ids[other_idx]
                for mid in self._topic_material_map.get(other_tid, []):
                    if mid in self.material_ids:
                        material_scores[self.material_ids.index(mid)] += sim_score

        ranked_indices = np.argsort(material_scores)[::-1]
        return [self.material_ids[i] for i in ranked_indices[:top_k] if material_scores[i] > 0]


def load_model():
    """Load serialised sklearn recommender if available."""
    if MODEL_PATH.exists():
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)
    return None


_model = None


def get_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model


async def get_topic_performance(student_id: UUID, db: AsyncSession) -> list[dict]:
    """Return avg score per topic for the last 90 days."""
    sql = text("""
        SELECT
            t.id   AS topic_id,
            t.name AS topic_name,
            s.name AS subject_name,
            AVG(COALESCE((qa.topic_scores->>(t.id::text))::float, 0.0)) AS avg_score
        FROM quiz_attempts qa
        JOIN quizzes  q ON q.id = qa.quiz_id
        JOIN topics   t ON t.id = q.topic_id
        JOIN subjects s ON s.id = t.subject_id
        WHERE qa.student_id = :student_id
          AND qa.attempted_at >= NOW() - INTERVAL '90 days'
        GROUP BY t.id, t.name, s.name
        ORDER BY avg_score ASC
    """)
    result = await db.execute(sql, {"student_id": str(student_id)})
    rows = result.mappings().all()
    return [dict(r) for r in rows]


async def get_weak_topics(student_id: UUID, db: AsyncSession) -> list[dict]:
    """Return topics where avg_score < WEAK_THRESHOLD."""
    performance = await get_topic_performance(student_id, db)
    return [p for p in performance if p["avg_score"] < WEAK_THRESHOLD]


async def get_progress_data(student_id: UUID, db: AsyncSession) -> list[dict]:
    """Time-series score data for the progress chart."""
    sql = text("""
        SELECT
            DATE(qa.attempted_at)::text AS attempt_date,
            t.name                      AS topic_name,
            AVG(qa.score::float / NULLIF(qa.total_questions, 0)) AS daily_pct
        FROM quiz_attempts qa
        JOIN quizzes q ON q.id = qa.quiz_id
        JOIN topics  t ON t.id = q.topic_id
        WHERE qa.student_id = :student_id
          AND qa.total_questions > 0
        GROUP BY DATE(qa.attempted_at), t.name
        ORDER BY attempt_date ASC
    """)
    result = await db.execute(sql, {"student_id": str(student_id)})
    rows = result.mappings().all()
    return [dict(r) for r in rows]


async def get_recommendations(student_id: UUID, db: AsyncSession) -> dict:
    """
    Main recommendation function.
    Returns weak_topics, recommended study materials, and recommended quizzes.
    """
    weak_topics = await get_weak_topics(student_id, db)
    weak_topic_ids = [w["topic_id"] for w in weak_topics]

    if not weak_topic_ids:
        # Student is doing well — recommend top-rated general materials
        sql = text("""
            SELECT sm.id, sm.title, sm.description, sm.url, sm.material_type,
                   t.name AS topic_name
            FROM study_materials sm
            JOIN topics t ON t.id = sm.topic_id
            ORDER BY sm.id
            LIMIT 6
        """)
    else:
        model = get_model()
        if model is not None:
            # Use cosine-similarity model to rank materials
            try:
                ranked_ids = model.predict(weak_topic_ids)
                sql = text("""
                    SELECT sm.id, sm.title, sm.description, sm.url, sm.material_type,
                           t.name AS topic_name
                    FROM study_materials sm
                    JOIN topics t ON t.id = sm.topic_id
                    WHERE sm.id = ANY(:ids)
                    ORDER BY array_position(:ids, sm.id)
                """)
                result = await db.execute(sql, {"ids": list(ranked_ids)})
                materials = [dict(r) for r in result.mappings().all()]
            except Exception:
                materials = await _fallback_materials(weak_topic_ids, db)
        else:
            materials = await _fallback_materials(weak_topic_ids, db)

        # Recommended quizzes (easy/medium difficulty on weak topics)
        quiz_sql = text("""
            SELECT DISTINCT qz.id AS quiz_id, qz.title, t.name AS topic_name,
                COUNT(CASE WHEN q.difficulty = 'easy'   THEN 1 END) AS easy_count,
                COUNT(CASE WHEN q.difficulty = 'medium' THEN 1 END) AS medium_count
            FROM quizzes  qz
            JOIN questions q ON q.quiz_id  = qz.id
            JOIN topics   t ON t.id        = qz.topic_id
            WHERE qz.topic_id = ANY(:weak_ids)
              AND q.difficulty IN ('easy', 'medium')
            GROUP BY qz.id, qz.title, t.name
            ORDER BY t.name, qz.id
            LIMIT 6
        """)
        quiz_result = await db.execute(quiz_sql, {"weak_ids": weak_topic_ids})
        quizzes = [dict(r) for r in quiz_result.mappings().all()]

        return {
            "weak_topics": weak_topics,
            "study_materials": materials,
            "recommended_quizzes": quizzes,
        }

    # No weak topics path
    result = await db.execute(sql)
    materials = [dict(r) for r in result.mappings().all()]
    return {
        "weak_topics": [],
        "study_materials": materials,
        "recommended_quizzes": [],
    }


async def _fallback_materials(weak_topic_ids: list[int], db: AsyncSession) -> list[dict]:
    """Fallback: fetch materials directly for weak topic IDs."""
    sql = text("""
        SELECT sm.id, sm.title, sm.description, sm.url, sm.material_type,
               t.name AS topic_name
        FROM study_materials sm
        JOIN topics t ON t.id = sm.topic_id
        WHERE sm.topic_id = ANY(:ids)
        ORDER BY sm.topic_id, sm.material_type
        LIMIT 10
    """)
    result = await db.execute(sql, {"ids": weak_topic_ids})
    return [dict(r) for r in result.mappings().all()]
