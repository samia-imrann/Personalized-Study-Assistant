"""
AdaptIQ ML Training Script
===========================
Trains a lightweight content-based recommender:
  - Input:  weak topic IDs
  - Output: ranked list of study material IDs

Algorithm:
  - Build a topic × material binary matrix
  - For each weak topic, find cosine-similar topics
  - Return the top-K material IDs for those topics

Run from the project root:
    python ml/train_recommender.py
"""

import pickle
import sys
from pathlib import Path

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# ── Offline mapping: topic_id → list of material_ids ────────────────────────
# Based on the seed data in adaptiq_schema.sql
TOPIC_MATERIAL_MAP: dict[int, list[int]] = {
    1:  [1, 2],          # Arrays & Strings
    2:  [3],             # Linked Lists
    3:  [4],             # Stacks & Queues
    4:  [5],             # Trees & Binary Trees
    5:  [6],             # Graphs
    7:  [7],             # Classes & Objects
    8:  [8],             # Inheritance
    13: [9],             # Sorting Algorithms
    15: [10],            # Dynamic Programming
    19: [11],            # SQL Basics
    20: [12],            # Joins & Subqueries
    24: [13],            # Scheduling (OS)
    31: [14],            # Agile & Scrum
}

ALL_TOPIC_IDS = sorted(TOPIC_MATERIAL_MAP.keys())
ALL_MATERIAL_IDS = sorted({mid for mids in TOPIC_MATERIAL_MAP.values() for mid in mids})


def build_topic_matrix() -> np.ndarray:
    """topic_id × material_id binary matrix."""
    n_topics = len(ALL_TOPIC_IDS)
    n_materials = len(ALL_MATERIAL_IDS)
    mat = np.zeros((n_topics, n_materials), dtype=float)
    t_idx = {tid: i for i, tid in enumerate(ALL_TOPIC_IDS)}
    m_idx = {mid: j for j, mid in enumerate(ALL_MATERIAL_IDS)}
    for tid, mids in TOPIC_MATERIAL_MAP.items():
        if tid in t_idx:
            for mid in mids:
                if mid in m_idx:
                    mat[t_idx[tid], m_idx[mid]] = 1.0
    return mat


import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from app.services.ml_engine import ContentBasedRecommender


def train_and_save():
    matrix = build_topic_matrix()
    t_idx = {tid: i for i, tid in enumerate(ALL_TOPIC_IDS)}
    model = ContentBasedRecommender(matrix, ALL_TOPIC_IDS, ALL_MATERIAL_IDS, t_idx, TOPIC_MATERIAL_MAP)

    # Quick sanity check
    test = model.predict([1, 2])
    print(f"Sample prediction for weak topics [1,2]: material IDs {test}")

    out_dir = Path(__file__).parent / "model"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "recommender.pkl"
    with open(out_path, "wb") as f:
        pickle.dump(model, f)
    print(f"✅ Model saved to {out_path}")


if __name__ == "__main__":
    train_and_save()
