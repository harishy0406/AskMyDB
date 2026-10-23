from fastapi import APIRouter, HTTPException
from models import SchemaInfo
from services.session_manager import session_manager
from utils.schema_extractor import generate_table_profile

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


@router.get("/table-profile/{session_id}/{table_name}")
async def get_table_profile(session_id: str, table_name: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if table_name not in session.get("tables", []):
        raise HTTPException(404, f"Table '{table_name}' not found in active session")
    try:
        profile = generate_table_profile(session, table_name)
        return profile
    except Exception as e:
        raise HTTPException(500, f"Failed to generate table profile: {str(e)}")


@router.post("/session/new")
async def new_session():
    session_id = session_manager.create_session()
    return {"session_id": session_id}


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    session_manager.cleanup_session(session_id)
    return {"status": "success", "message": "Session deleted successfully"}

