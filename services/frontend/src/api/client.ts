const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Documents
  getDocuments() {
    return request<{ id: number; filename: string; page_count: number; status: string }[]>(
      "/api/documents/"
    );
  },

  uploadDocument(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<{ id: number; filename: string; status: string }>("/api/documents/upload", {
      method: "POST",
      body: form,
    });
  },

  deleteDocument(id: number) {
    return request(`/api/documents/${id}`, { method: "DELETE" });
  },

  // Chat
  ask(question: string, conversation_id?: number) {
    return request<{
      answer: string;
      sources: { document_id: number; page: number; preview: string }[];
      conversation_id: number;
    }>("/api/chat/ask", {
      method: "POST",
      body: JSON.stringify({ question, conversation_id }),
    });
  },

  getConversations() {
    return request<{ id: number; title: string }[]>("/api/chat/conversations");
  },

  getMessages(conversationId: number) {
    return request<{ role: string; content: string }[]>(
      `/api/chat/conversations/${conversationId}/messages`
    );
  },
};
