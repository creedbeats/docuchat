const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
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

export interface Doc {
  id: number;
  filename: string;
  page_count: number;
  status: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

export const api = {
  // Documents
  getDocuments(skip = 0, limit = 50) {
    return request<Paginated<Doc>>(
      `/api/documents/?skip=${skip}&limit=${limit}`
    );
  },

  uploadDocument(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<Doc>("/api/documents/upload", {
      method: "POST",
      body: form,
    });
  },

  deleteDocument(id: number) {
    return request(`/api/documents/${id}`, { method: "DELETE" });
  },

  // Chat
  ask(question: string, conversation_id?: number, signal?: AbortSignal) {
    return request<{
      answer: string;
      sources: { document_id: number; page: number; preview: string }[];
      conversation_id: number;
    }>("/api/chat/ask", {
      method: "POST",
      body: JSON.stringify({ question, conversation_id }),
      signal,
    });
  },

  getConversations(skip = 0, limit = 50) {
    return request<Paginated<{ id: number; title: string }>>(
      `/api/chat/conversations?skip=${skip}&limit=${limit}`
    );
  },

  renameConversation(conversationId: number, title: string) {
    return request<{ id: number; title: string }>(`/api/chat/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  },

  deleteConversation(conversationId: number) {
    return request(`/api/chat/conversations/${conversationId}`, { method: "DELETE" });
  },

  getMessages(conversationId: number) {
    return request<{ role: string; content: string }[]>(
      `/api/chat/conversations/${conversationId}/messages`
    );
  },

  // SSE for document updates
  onDocumentEvents(onUpdate: (doc: Doc) => void) {
    const eventSource = new EventSource(`${API_URL}/api/documents/events`);
    eventSource.addEventListener("update", (event: MessageEvent) => {
      try {
        const doc = JSON.parse(event.data);
        onUpdate(doc);
      } catch {
        // Ignore malformed SSE data
      }
    });
    return () => eventSource.close();
  },
};
