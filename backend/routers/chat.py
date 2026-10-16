from fastapi import APIRouter, HTTPException
import sqlite3
import json
from typing import Any
from sqlalchemy import create_engine, text

from models import ChatRequest, ChatResponse
from services.session_manager import session_manager
from services.llm_service import llm_service
from utils.sql_validator import validate_sql, sanitize_sql, inject_limit
from utils.schema_extractor import build_schema_prompt
from utils.chart_builder import build_chart_data
from config import settings


router = APIRouter(prefix="/api", tags=["chat"])


def execute_session_query(session: dict, sql: str) -> tuple[list[str], list[list[Any]]]:
    source_type = session.get("source_type")
    if source_type == "database" and session.get("connection_string"):
        conn_str = session["connection_string"]
        connect_args = {}
        if "mysql" in conn_str or "postgres" in conn_str:
            connect_args["connect_timeout"] = 5
        engine = create_engine(
            conn_str,
            pool_pre_ping=True,
            connect_args=connect_args,
        )
        try:
            with engine.connect() as conn:
                dialect_name = session.get("dialect", "").lower()
                if "postgres" in dialect_name:
                    try:
                        conn.execute(text("SET TRANSACTION READ ONLY;"))
                    except Exception:
                        pass
                result = conn.execute(text(sql))
                if result.returns_rows:
                    columns = list(result.keys())
                    rows = [list(row) for row in result.fetchall()]
                else:
                    columns = []
                    rows = []
                return columns, rows
        finally:
            engine.dispose()

    else:
        conn = sqlite3.connect(session["db_path"])
        conn.execute("PRAGMA query_only = ON;")
        cursor = conn.cursor()
        cursor.execute(sql)
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = [list(row) for row in cursor.fetchall()]
        conn.close()
        return columns, rows


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    session = session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(404, "Session not found. Please upload a file or connect a database first.")

    if not session["schema"]:
        raise HTTPException(400, "No schema found. Please upload a file or connect a database.")

    dialect = session.get("dialect", "sqlite")
    schema_prompt = build_schema_prompt(session["schema"], dialect=dialect)

    history = request.conversation_history or []
    raw_sql = await llm_service.generate_sql(schema_prompt, request.message, history, dialect=dialect)

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

    final_sql = inject_limit(cleaned_sql, settings.default_limit, dialect=dialect)

    try:
        columns, rows = execute_session_query(session, final_sql)
    except Exception as e:
        error_str = str(e)
        retry_message = (
            f"The previous query failed with database error: {error_str}.\n"
            f"The query was: {final_sql}\n"
            f"Please fix the SQL query to work with {dialect} and avoid this error."
        )
        
        try:
            raw_retry_sql = await llm_service.generate_sql(schema_prompt, retry_message, history, dialect=dialect)
            cleaned_retry_sql = sanitize_sql(raw_retry_sql)
            is_valid_retry, error_msg_retry = validate_sql(cleaned_retry_sql, session["tables"])
            
            if not is_valid_retry:
                return ChatResponse(
                    reply=f"I tried to fix the query but encountered a validation error: {error_msg_retry}",
                    sql_query=cleaned_retry_sql,
                    columns=[],
                    rows=[],
                    error=error_msg_retry,
                )
                
            final_sql = inject_limit(cleaned_retry_sql, settings.default_limit, dialect=dialect)
            columns, rows = execute_session_query(session, final_sql)
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

