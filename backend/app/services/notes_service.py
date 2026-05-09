"""
Notes Service — file handling and full-text search query building.
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile

from app.core.config import settings


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".pptx", ".png", ".jpg", ".jpeg"}
MAX_BYTES = settings.max_upload_mb * 1024 * 1024


async def save_upload(file: UploadFile, uploader_id: str) -> str:
    """
    Save an uploaded file to disk.
    Returns the relative path stored in the DB (e.g. 'uploads/<uid>/<filename>').
    """
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type '{suffix}' is not allowed.")

    dest_dir = Path(settings.upload_dir) / str(uploader_id)
    dest_dir.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4()}{suffix}"
    dest_path = dest_dir / unique_name

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise ValueError(f"File exceeds maximum size of {settings.max_upload_mb} MB.")

    async with aiofiles.open(dest_path, "wb") as f:
        await f.write(content)

    # Return a web-accessible relative path
    return f"uploads/{uploader_id}/{unique_name}"


def delete_file(file_path: str) -> None:
    """Delete a file from the local filesystem."""
    p = Path(file_path)
    if p.exists():
        p.unlink()
