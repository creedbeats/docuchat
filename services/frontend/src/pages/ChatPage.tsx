import { useState, useRef, useEffect } from "react";
import { api } from "../api/client";

interface Message {
  role: string;
  content: string;
}

interface Source {
  document_id: number;
  page: number;
  preview: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [sources, setSources] = useState<Source[]>([]);
  const [conversations, setConversations] = useState<{ id: number; title: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getConversations().then(setConversations).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversation(id: number) {
    const msgs = await api.getMessages(id);
    setMessages(msgs);
    setConversationId(id);
    setSources([]);
  }

  function startNew() {
    setMessages([]);
    setConversationId(undefined);
    setSources([]);
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const question = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const result = await api.ask(question, conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
      setSources(result.sources);
      setConversationId(result.conversation_id);

      // Refresh sidebar
      api.getConversations().then(setConversations).catch(() => {});
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 24, height: "calc(100vh - 64px)" }}>
      {/* Conversation sidebar */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <button className="btn-primary" onClick={startNew} style={{ width: "100%", marginBottom: 12 }}>
          New Chat
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => loadConversation(c.id)}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                background: c.id === conversationId ? "#e0e7ff" : "transparent",
                borderRadius: 6,
                fontSize: 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            background: "white",
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {messages.length === 0 && (
            <p style={{ color: "#94a3b8", textAlign: "center", marginTop: 40 }}>
              Upload documents, then ask questions about them.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                background: msg.role === "user" ? "#eff6ff" : "#f8fafc",
                maxWidth: "80%",
                marginLeft: msg.role === "user" ? "auto" : 0,
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                {msg.role === "user" ? "You" : "DocuChat"}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div style={{ color: "#64748b", padding: 12 }}>Thinking...</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Sources */}
        {sources.length > 0 && (
          <div style={{ marginBottom: 12, fontSize: 12, color: "#64748b" }}>
            <strong>Sources:</strong>{" "}
            {sources.map((s, i) => (
              <span key={i}>
                Doc {s.document_id} (p.{s.page})
                {i < sources.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question about your documents..."
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={handleSend} disabled={loading}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
