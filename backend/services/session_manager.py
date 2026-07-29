import uuid
import os
import shutil
from pathlib import Path
from config import settings


class SessionManager:
    def __init__(self):
        self.sessions: dict[str, dict] = {}

    def create_session(self) -> str:
        session_id = str(uuid.uuid4())
        session_dir = Path(settings.upload_dir) / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        db_path = session_dir / "data.db"

        self.sessions[session_id] = {
            "id": session_id,
            "db_path": str(db_path),
            "source_type": None,
            "source_name": None,
            "tables": [],
            "schema": {},
            "query_history": [],
            "connection_string": None,
        }
        return session_id

    def get_session(self, session_id: str) -> dict | None:
        return self.sessions.get(session_id)

    def update_session(self, session_id: str, data: dict):
        if session_id in self.sessions:
            self.sessions[session_id].update(data)

    def add_query_history(self, session_id: str, entry: dict):
        if session_id in self.sessions:
            self.sessions[session_id]["query_history"].append(entry)

    def cleanup_session(self, session_id: str):
        if session_id in self.sessions:
            session_dir = Path(settings.upload_dir) / session_id
            if session_dir.exists():
                shutil.rmtree(session_dir)
            del self.sessions[session_id]


session_manager = SessionManager()
