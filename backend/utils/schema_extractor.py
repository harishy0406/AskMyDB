import sqlite3
import pandas as pd
from pathlib import Path


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


def build_schema_prompt(schema: dict) -> str:
    parts = []
    for table_name, table_info in schema.items():
        cols_desc = ", ".join(
            [f"{c['name']} ({c['type']})" for c in table_info["columns"]]
        )
        parts.append(f"Table: {table_name}\nColumns: {cols_desc}")

        if table_info["sample_rows"]:
            sample_str = "\n".join([str(r) for r in table_info["sample_rows"]])
            parts.append(f"Sample rows:\n{sample_str}")

    return "\n\n".join(parts)
