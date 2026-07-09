from fastapi import APIRouter, HTTPException
from models import SchemaInfo
from services.session_manager import session_manager

router = APIRouter(prefix="/api", tags=["session"])


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return {
        "session_id": session["id"],
        "source_type": session["source_type"],
        "source_name": session["source_name"],
        "tables": session["tables"],
        "query_history": session["query_history"][-20:],
    }


@router.get("/schema/{session_id}")
async def get_schema(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if not session["schema"]:
        raise HTTPException(404, "No schema available")
    return session["schema"]


@router.post("/session/new")
async def new_session():
    session = session_manager.create_session()
    return {"session_id": session["id"]}
