from pydantic import BaseModel
from typing import Optional, Any


class UploadResponse(BaseModel):
    session_id: str
    table_name: str
    columns: list[str]
    row_count: int
    preview: list[dict[str, Any]]


class DBConnectRequest(BaseModel):
    session_id: str
    connection_string: str


class DBConnectResponse(BaseModel):
    session_id: str
    tables: list[str]
    message: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    conversation_history: Optional[list[dict]] = None


class ChatResponse(BaseModel):
    reply: str
    sql_query: str
    columns: list[str]
    rows: list[list[Any]]
    chart_data: Optional[dict] = None
    error: Optional[str] = None


class QueryHistoryItem(BaseModel):
    question: str
    sql: str
    timestamp: str


class SchemaInfo(BaseModel):
    table_name: str
    columns: list[dict]
    sample_rows: list[dict]
