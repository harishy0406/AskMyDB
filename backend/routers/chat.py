from fastapi import APIRouter, HTTPException
import sqlite3
import json

from models import ChatRequest, ChatResponse
from services.session_manager import session_manager
from services.llm_service import llm_service
from utils.sql_validator import validate_sql, sanitize_sql, inject_limit
from utils.schema_extractor import build_schema_prompt
from utils.chart_builder import build_chart_data
from config import settings

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    session = session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(404, "Session not found. Please upload a file or connect a database first.")

    if not session["schema"]:
        raise HTTPException(400, "No schema found. Please upload a file or connect a database.")

    schema_prompt = build_schema_prompt(session["schema"])

    history = request.conversation_history or []
    raw_sql = await llm_service.generate_sql(schema_prompt, request.message, history)

    cleaned_sql = sanitize_sql(raw_sql)
    is_valid, error_msg = validate_sql(cleaned_sql, session["tables"])

    if not is_valid:
        return ChatResponse(
            reply=f"I couldn't generate a valid SQL query. Error: {error_msg}",
            sql_query=cleaned_sql,
            columns=[],
            rows=[],
            error=error_msg,
        )

    final_sql = inject_limit(cleaned_sql, settings.default_limit)

    try:
        conn = sqlite3.connect(session["db_path"])
        conn.execute("PRAGMA query_only = ON;")
        cursor = conn.cursor()
        cursor.execute(final_sql)
        columns = [desc[0] for desc in cursor.description]
        rows = [list(row) for row in cursor.fetchall()]
        conn.close()
    except Exception as e:
        error_str = str(e)
        retry_sql = f"SELECT 'Query error: {error_str}'"
        try:
            conn = sqlite3.connect(session["db_path"])
            cursor = conn.cursor()
            cursor.execute(final_sql)
            columns = [desc[0] for desc in cursor.description]
            rows = [list(row) for row in cursor.fetchall()]
            conn.close()
        except Exception:
            return ChatResponse(
                reply=f"Sorry, I encountered an error executing the query: {error_str}",
                sql_query=final_sql,
                columns=[],
                rows=[],
                error=error_str,
            )

    chart_data = build_chart_data(columns, rows)

    results_preview = json.dumps(rows[:3], default=str)
    summary = await llm_service.generate_summary(request.message, final_sql, results_preview)

    session_manager.add_query_history(session["id"], {
        "question": request.message,
        "sql": final_sql,
    })

    return ChatResponse(
        reply=summary or f"Query returned {len(rows)} row(s).",
        sql_query=final_sql,
        columns=columns,
        rows=rows,
        chart_data=chart_data,
    )
