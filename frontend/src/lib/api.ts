const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function uploadFile(file: File, sessionId?: string): Promise<any> {
  const form = new FormData();
  form.append("file", file);
  if (sessionId) form.append("session_id", sessionId);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

export async function sendChat(
  sessionId: string,
  message: string,
  history: { role: string; content: string }[] = []
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message, conversation_history: history }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Chat failed" }));
    throw new Error(err.detail || "Chat failed");
  }

  return res.json();
}

export async function createSession(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/session/new`, {
    method: "POST",
  });
  const data = await res.json();
  return data.session_id;
}

export async function getSession(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/${sessionId}`);
  if (!res.ok) throw new Error("Session not found");
  return res.json();
}

export async function getSchema(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/schema/${sessionId}`);
  if (!res.ok) throw new Error("Schema not found");
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/session/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete session");
  return res.json();
}

export async function connectDatabase(sessionId: string, connectionString: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/connect-db`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, connection_string: connectionString }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Connection failed" }));
    throw new Error(err.detail || "Connection failed");
  }
  return res.json();
}

export async function executeSql(sessionId: string, sqlQuery: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/execute-sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, sql_query: sqlQuery }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Query execution failed" }));
    throw new Error(err.detail || "Query execution failed");
  }
  return res.json();
}

export async function getTableProfile(sessionId: string, tableName: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/table-profile/${sessionId}/${encodeURIComponent(tableName)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to load table profile" }));
    throw new Error(err.detail || "Failed to load table profile");
  }
  return res.json();
}


