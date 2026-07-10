import httpx
import json
from config import settings


class LLMService:
    def __init__(self):
        self.api_key = settings.openrouter_api_key
        self.model = settings.openrouter_model
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"

    async def generate_sql(
        self, schema_prompt: str, user_question: str, conversation_history: list[dict] = None
    ) -> str:
        if not self.api_key:
            return "SELECT 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in .env';"

        system_prompt = """You are a SQL generation assistant. Given a database schema and a user question, generate ONE valid, read-only SQL SELECT query that answers it.

Rules:
- Only generate SELECT statements. Never DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE, CREATE, or any other DDL/DML.
- Use only the exact table and column names provided in the schema.
- If the question is ambiguous, make a reasonable assumption.
- Always include a LIMIT clause (default 100) unless the user explicitly requests more rows.
- Use standard SQL that works with SQLite.
- Return ONLY the raw SQL query text, no explanation, no markdown formatting, no code fences."""

        messages = [{"role": "system", "content": system_prompt}]

        if conversation_history:
            for msg in conversation_history[-6:]:
                messages.append(msg)

        messages.append({
            "role": "user",
            "content": f"Schema:\n{schema_prompt}\n\nQuestion: {user_question}"
        })

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.1,
                        "max_tokens": 1000,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            except Exception as e:
                return f"SELECT 'LLM Error: {str(e)}' AS error"

    async def generate_summary(self, question: str, sql: str, results_preview: str) -> str:
        if not self.api_key:
            return ""

        prompt = f"""Given the user question, SQL query, and results preview, provide a brief natural language summary of the answer.

Question: {question}
SQL: {sql}
Results: {results_preview}

Keep it concise (1-3 sentences). Focus on the key insight from the data."""

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "openai/gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 300,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            except Exception:
                return ""


llm_service = LLMService()
