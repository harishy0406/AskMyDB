from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import sqlite3

from config import settings
from models import UploadResponse
from services.session_manager import session_manager
from services.file_processor import file_processor
from utils.schema_extractor import extract_schema

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...), session_id: str = Form("")):

    # Create or get session
    if not session_id:
        session_id = session_manager.create_session()
    else:
        session = session_manager.get_session(session_id)
        if not session:
            session_id = session_manager.create_session()

    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in file_processor.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}"
        )

    # Save uploaded file
    upload_path = Path(settings.upload_dir) / session_id / file.filename
    upload_path.parent.mkdir(parents=True, exist_ok=True)

    content = await file.read()

    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.max_file_size_mb}MB limit"
        )

    with open(upload_path, "wb") as f:
        f.write(content)

    # Get database path
    session_data = session_manager.get_session(session_id)
    db_path = session_data["db_path"]

    # Process file
    try:
        db_path, table_name, row_count = file_processor.process(
            str(upload_path),
            db_path
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

    # Extract schema
    schema = extract_schema(db_path, table_name)

    # Preview data
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute(f"SELECT * FROM '{table_name}' LIMIT 5")

    columns = [col[0] for col in cursor.description]
    preview = [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]

    conn.close()

    # Update session
    session_manager.update_session(
        session_id,
        {
            "db_path": db_path,
            "source_type": "file",
            "source_name": file.filename,
            "tables": [table_name],
            "schema": schema,
        },
    )

    return UploadResponse(
        session_id=session_id,
        table_name=table_name,
        columns=columns,
        row_count=row_count,
        preview=preview,
    )