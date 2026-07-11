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
