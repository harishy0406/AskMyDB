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
        retry_message = f"The previous query failed with error: {error_str}. Please correct it. The original query was: {final_sql}"
        
        try:
            raw_retry_sql = await llm_service.generate_sql(schema_prompt, retry_message, history)
            cleaned_retry_sql = sanitize_sql(raw_retry_sql)
            is_valid_retry, error_msg_retry = validate_sql(cleaned_retry_sql, session["tables"])
            
            if not is_valid_retry:
                return ChatResponse(
                    reply=f"I tried to fix the query but failed. Error: {error_msg_retry}",
                    sql_query=cleaned_retry_sql,
                    columns=[],
                    rows=[],
                    error=error_msg_retry,
                )
                
            final_sql = inject_limit(cleaned_retry_sql, settings.default_limit)
            
            conn = sqlite3.connect(session["db_path"])
            conn.execute("PRAGMA query_only = ON;")
            cursor = conn.cursor()
            cursor.execute(final_sql)
            columns = [desc[0] for desc in cursor.description]
            rows = [list(row) for row in cursor.fetchall()]
            conn.close()
        except Exception as retry_e:
            return ChatResponse(
                reply=f"Sorry, I encountered an error executing the query and couldn't fix it: {error_str}",
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
