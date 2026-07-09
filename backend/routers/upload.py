from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil
import sqlite3
import json

from config import settings
from models import UploadResponse
from services.session_manager import session_manager
from services.file_processor import file_processor
from utils.schema_extractor import extract_schema

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...), session_id: str = ""):
    if not session_id:
        session = session_manager.create_session()
        session_id = session["id"]
    else:
        session = session_manager.get_session(session_id)
        if not session:
            session = session_manager.create_session()
            session_id = session["id"]

    ext = Path(file.filename).suffix.lower()
    if ext not in file_processor.ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    upload_path = Path(settings.upload_dir) / session_id / file.filename
    upload_path.parent.mkdir(parents=True, exist_ok=True)

    with open(upload_path, "wb") as f:
        content = await file.read()
        if len(content) > settings.max_file_size_mb * 1024 * 1024:
            raise HTTPException(400, f"File exceeds {settings.max_file_size_mb}MB limit")
        f.write(content)

    session_data = session_manager.get_session(session_id)
    db_path = session_data["db_path"] if session_data else str(Path(settings.upload_dir) / session_id / "data.db")

    try:
        db_path, table_name, row_count = file_processor.process(str(upload_path), db_path)
    except Exception as e:
        raise HTTPException(400, f"File processing error: {str(e)}")

    schema = extract_schema(db_path, table_name)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM '{table_name}' LIMIT 5;")
    columns = [desc[0] for desc in cursor.description]
    preview = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()

    session_manager.update_session(session_id, {
        "db_path": db_path,
        "source_type": "file",
        "source_name": file.filename,
        "tables": [table_name],
        "schema": schema,
    })

    return UploadResponse(
        session_id=session_id,
        table_name=table_name,
        columns=columns,
        row_count=row_count,
        preview=preview,
    )
