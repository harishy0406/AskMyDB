import sqlite3
import pandas as pd
from pathlib import Path
from config import settings


class FileProcessor:
    ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".db", ".sqlite", ".sqlite3"}

    def process(self, file_path: str, session_db_path: str) -> tuple[str, str, int]:
        ext = Path(file_path).suffix.lower()
        if ext == ".csv":
            return self._process_csv(file_path, session_db_path)
        elif ext in (".xlsx", ".xls"):
            return self._process_excel(file_path, session_db_path)
        elif ext in (".db", ".sqlite", ".sqlite3"):
            return self._process_sqlite(file_path, session_db_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    def _process_csv(self, file_path: str, session_db_path: str) -> tuple[str, str, int]:
        df = pd.read_csv(file_path, nrows=10000)
        table_name = Path(file_path).stem.replace(" ", "_").replace("-", "_").lower()
        if not table_name or not table_name[0].isalpha():
            table_name = "data_" + table_name

        conn = sqlite3.connect(session_db_path)
        df.to_sql(table_name, conn, index=False, if_exists="replace")
        row_count = len(df)
        conn.close()

        return session_db_path, table_name, row_count

    def _process_excel(self, file_path: str, session_db_path: str) -> tuple[str, str, int]:
        xl = pd.ExcelFile(file_path)
        sheet_name = xl.sheet_names[0]
        df = pd.read_excel(file_path, sheet_name=sheet_name, nrows=10000)
        table_name = Path(file_path).stem.replace(" ", "_").replace("-", "_").lower()
        if not table_name or not table_name[0].isalpha():
            table_name = "data_" + table_name

        conn = sqlite3.connect(session_db_path)
        df.to_sql(table_name, conn, index=False, if_exists="replace")
        row_count = len(df)
        conn.close()

        return session_db_path, table_name, row_count

    def _process_sqlite(self, file_path: str, session_db_path: str) -> tuple[str, str, int]:
        import shutil
        shutil.copy2(file_path, session_db_path)

        conn = sqlite3.connect(session_db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        conn.close()

        table_name = tables[0][0] if tables else "unknown"
        return session_db_path, table_name, 0


file_processor = FileProcessor()
