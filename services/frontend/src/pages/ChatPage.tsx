import { useState, useRef, useEffect } from "react";
import { api } from "../api/client";

let _msgId = 0;

interface Message {
  id: number;
  role: string;
  content: string;
  isError?: boolean;
}

function makeMsg(role: string, content: string, isError?: boolean): Message {
  return { id: ++_msgId, role, content, isError };
}

interface Source {
  document_id: number;
  page: number;
  preview: string;
}

interface Conversation {
  id: number;
  title: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [sources, setSources] = useState<Source[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getConversations().then((r) => setConversations(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (editingId !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  async function loadConversation(id: number) {
    try {
      const msgs = await api.getMessages(id);
      setMessages(msgs.map((m) => makeMsg(m.role, m.content)));
      setConversationId(id);
      setSources([]);
    } catch (err: any) {
      setMessages([makeMsg("assistant", `Error loading conversation: ${err.message}`, true)]);
    }
  }

  function startNew() {
    setMessages([]);
    setConversationId(undefined);
    setSources([]);
  }

  async function handleDeleteConversation(id: number) {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        startNew();
      }
    } catch {
      // Silently fail — conversation may already be gone
    }
  }

  function startEditing(c: Conversation) {
    setEditingId(c.id);
    setEditTitle(c.title);
  }

  async function saveTitle(id: number) {
    const trimmed = editTitle.trim();
    setEditingId(null);
    if (!trimmed) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
    );
    try {
      await api.renameConversation(id, trimmed);
    } catch {
      // Revert on failure by re-fetching
      api.getConversations().then((r) => setConversations(r.items)).catch(() => {});
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const question = input;
    setInput("");
    setMessages((prev) => [...prev, makeMsg("user", question)]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await api.ask(question, conversationId, controller.signal);
      setMessages((prev) => [...prev, makeMsg("assistant", result.answer)]);
      setSources(result.sources);

      if (!conversationId) {
        // New conversation — add it to the sidebar immediately
        const newConvo: Conversation = {
          id: result.conversation_id,
          title: question.slice(0, 100),
        };
        setConversations((prev) => [newConvo, ...prev]);
      }
      setConversationId(result.conversation_id);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          makeMsg("assistant", "Response cancelled.", true),
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          makeMsg("assistant", err.message, true),
        ]);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-64px)]">
      {/* Conversation sidebar */}
      <div className="w-52 shrink-0 flex flex-col">
        <button
          onClick={startNew}
          className="w-full px-4 py-2.5 mb-3 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          New Chat
        </button>
        <div className="flex flex-col gap-0.5 overflow-y-auto">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center rounded-md transition-colors ${
                c.id === conversationId
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {editingId === c.id ? (
                <input
                  ref={editInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => saveTitle(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle(c.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 px-3 py-1.5 mx-0.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <>
                  <button
                    onClick={() => loadConversation(c.id)}
                    onDoubleClick={() => startEditing(c)}
                    className={`flex-1 text-left px-3 py-2 text-sm truncate ${
                      c.id === conversationId ? "font-medium" : ""
                    }`}
                  >
                    {c.title}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.id); }}
                    className="hidden group-hover:block px-2 py-1 mr-1 text-slate-400 hover:text-red-500 text-xs"
                    title="Delete conversation"
                  >
                    &times;
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-4 bg-white rounded-lg border border-slate-200 mb-3">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400 text-sm">
                Upload documents, then ask questions about them.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-4 max-w-[80%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}
            >
              <div className="text-xs text-slate-400 mb-1">
                {msg.role === "user" ? "You" : "DocuChat"}
              </div>
              {msg.isError ? (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {msg.content}
                </div>
              ) : (
                <div
                  className={`px-4 py-3 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {msg.content}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm p-3">
              <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
              <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]" />
              <span className="ml-1">Thinking...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Sources */}
        {sources.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {sources.map((s, i) => (
              <span
                key={i}
                className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200"
              >
                Doc {s.document_id}, p.{s.page}
              </span>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question about your documents..."
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {loading ? (
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handleSend}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
