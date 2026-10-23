import sqlite3
import pandas as pd
from pathlib import Path
from sqlalchemy import inspect, text


def extract_schema(db_path: str, table_name: str = None) -> dict:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    if table_name:
        tables = [table_name]
    else:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]

    schema = {}
    for table in tables:
        cursor.execute(f"PRAGMA table_info('{table}');")
        columns = [
            {"name": row[1], "type": row[2], "nullable": not row[3]}
            for row in cursor.fetchall()
        ]

        cursor.execute(f"SELECT * FROM '{table}' LIMIT 3;")
        sample_rows = [dict(zip([c["name"] for c in columns], row)) for row in cursor.fetchall()]

        schema[table] = {
            "columns": columns,
            "sample_rows": sample_rows,
        }

    conn.close()
    return schema


def extract_db_schema(engine) -> dict:
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    schema = {}
    with engine.connect() as conn:
        for table in table_names:
            cols = []
            for col in inspector.get_columns(table):
                cols.append({
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": bool(col.get("nullable", True)),
                })

            sample_rows = []
            try:
                res = conn.execute(text(f"SELECT * FROM {table} LIMIT 3"))
                col_names = list(res.keys())
                for r in res.fetchall():
                    sample_rows.append(dict(zip(col_names, [str(v) if v is not None else None for v in r])))
            except Exception:
                sample_rows = []

            schema[table] = {
                "columns": cols,
                "sample_rows": sample_rows,
            }
    return schema


def build_schema_prompt(schema: dict, dialect: str = "SQLite") -> str:
    parts = [f"Please generate {dialect} compatible SQL for the following schema:"]
    for table_name, table_info in schema.items():
        cols_desc = ", ".join(
            [f"{c['name']} ({c['type']})" for c in table_info["columns"]]
        )
        parts.append(f"Table: {table_name}\nColumns: {cols_desc}")

        if table_info["sample_rows"]:
            sample_str = "\n".join([str(r) for r in table_info["sample_rows"]])
            parts.append(f"Sample rows:\n{sample_str}")

    return "\n\n".join(parts)


def generate_table_profile(session: dict, table_name: str) -> dict:
    source_type = session.get("source_type")

    def run_query(sql_str: str):
        if source_type == "database" and session.get("connection_string"):
            engine = create_engine(session["connection_string"], pool_pre_ping=True)
            try:
                with engine.connect() as conn:
                    res = conn.execute(text(sql_str))
                    if res.returns_rows:
                        cols = list(res.keys())
                        rows = [list(r) for r in res.fetchall()]
                        return cols, rows
                    return [], []
            finally:
                engine.dispose()
        else:
            conn = sqlite3.connect(session["db_path"])
            cur = conn.cursor()
            cur.execute(sql_str)
            cols = [d[0] for d in cur.description] if cur.description else []
            rows = [list(r) for r in cur.fetchall()]
            conn.close()
            return cols, rows

    escaped_table = f"'{table_name}'" if source_type != "database" else table_name

    row_count = 0
    try:
        _, rows = run_query(f"SELECT COUNT(*) FROM {escaped_table}")
        if rows and rows[0]:
            row_count = int(rows[0][0])
    except Exception:
        row_count = 0

    table_schema = session.get("schema", {}).get(table_name, {})
    schema_cols = table_schema.get("columns", [])

    column_stats = []
    for col in schema_cols:
        col_name = col["name"]
        col_type = col.get("type", "TEXT").upper()
        escaped_col = f"'{col_name}'" if source_type != "database" else col_name

        stat = {
            "name": col_name,
            "type": col_type,
            "nullable": col.get("nullable", True),
            "null_count": 0,
            "distinct_count": 0,
            "sample_values": [],
            "min": None,
            "max": None,
            "avg": None,
        }

        try:
            _, null_res = run_query(f"SELECT COUNT(*) FROM {escaped_table} WHERE {escaped_col} IS NULL")
            if null_res and null_res[0]:
                stat["null_count"] = int(null_res[0][0])
        except Exception:
            pass

        try:
            _, dist_res = run_query(f"SELECT COUNT(DISTINCT {escaped_col}) FROM {escaped_table}")
            if dist_res and dist_res[0]:
                stat["distinct_count"] = int(dist_res[0][0])
        except Exception:
            pass

        try:
            _, samp_res = run_query(f"SELECT DISTINCT {escaped_col} FROM {escaped_table} WHERE {escaped_col} IS NOT NULL LIMIT 4")
            if samp_res:
                stat["sample_values"] = [str(r[0]) for r in samp_res if r[0] is not None]
        except Exception:
            pass

        is_numeric = any(t in col_type for t in ["INT", "FLOAT", "DOUBLE", "NUMERIC", "DECIMAL", "REAL"])
        if is_numeric:
            try:
                _, num_res = run_query(f"SELECT MIN({escaped_col}), MAX({escaped_col}), AVG({escaped_col}) FROM {escaped_table} WHERE {escaped_col} IS NOT NULL")
                if num_res and num_res[0]:
                    min_val, max_val, avg_val = num_res[0]
                    stat["min"] = round(float(min_val), 2) if min_val is not None else None
                    stat["max"] = round(float(max_val), 2) if max_val is not None else None
                    stat["avg"] = round(float(avg_val), 2) if avg_val is not None else None
            except Exception:
                pass

        column_stats.append(stat)

    suggested_prompts = []
    numeric_cols = [c["name"] for c in column_stats if c.get("avg") is not None]
    text_cols = [c["name"] for c in column_stats if c.get("avg") is None and c["distinct_count"] > 1]

    if numeric_cols and text_cols:
        suggested_prompts.append(f"Show the top 5 {text_cols[0]} by total {numeric_cols[0]}")
        suggested_prompts.append(f"What is the average {numeric_cols[0]} grouped by {text_cols[0]}?")
    elif numeric_cols:
        suggested_prompts.append(f"What is the average, min, and max of {numeric_cols[0]}?")

    suggested_prompts.append(f"Show 10 recent records from {table_name}")

    return {
        "table_name": table_name,
        "row_count": row_count,
        "column_count": len(column_stats),
        "columns": column_stats,
        "suggested_prompts": suggested_prompts,
    }

