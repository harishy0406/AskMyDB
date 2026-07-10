import sqlglot
from sqlglot import exp


BLOCKED_KEYWORDS = [
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE",
    "CREATE", "REPLACE", "ATTACH", "DETACH", "PRAGMA",
    "EXECUTE", "EXEC", "CALL", "MERGE", "UPSERT",
    "GRANT", "REVOKE", "LOAD", "VACUUM", "REINDEX",
]


def validate_sql(query: str, allowed_tables: list[str] = None) -> tuple[bool, str]:
    if not query or not query.strip():
        return False, "Empty query"

    query_upper = query.strip().upper()

    for kw in BLOCKED_KEYWORDS:
        if kw in query_upper.split():
            return False, f"Blocked keyword detected: {kw}"

    try:
        parsed = sqlglot.parse_one(query)
    except Exception as e:
        return False, f"SQL parsing error: {str(e)}"

    if not isinstance(parsed, exp.Select):
        return False, "Only SELECT statements are allowed"

    if isinstance(parsed, exp.Union):
        for select in parsed.expressions:
            if not isinstance(select, exp.Select):
                return False, "Only SELECT statements are allowed in UNION"

    has_from = parsed.find(exp.From)
    has_table = parsed.find(exp.Table)
    if not has_from and not has_table:
        return False, "Query must reference a table"

    if allowed_tables:
        for table in parsed.find_all(exp.Table):
            if table.name not in allowed_tables:
                return False, f"Table '{table.name}' is not in the allowed schema"

    return True, "Valid"


def inject_limit(query: str, default_limit: int = 100) -> str:
    try:
        parsed = sqlglot.parse_one(query)
        if isinstance(parsed, exp.Select):
            if not parsed.args.get("limit"):
                parsed = parsed.limit(default_limit)
            return parsed.sql(dialect="sqlite")
    except Exception:
        pass
    return query


def sanitize_sql(query: str) -> str:
    query = query.strip()
    if query.startswith("```") and query.endswith("```"):
        lines = query.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        query = "\n".join(lines).strip()
    if query.upper().startswith("SQL"):
        query = query[3:].strip()
    return query
