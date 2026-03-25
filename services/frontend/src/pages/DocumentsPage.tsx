import { useEffect, useState, useRef } from "react";
import { api } from "../api/client";

interface Doc {
  id: number;
  filename: string;
  page_count: number;
  status: string;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocs();
  }, []);

  async function loadDocs() {
    try {
      setDocs(await api.getDocuments());
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await api.uploadDocument(file);
      await loadDocs();
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    await api.deleteDocument(id);
    setDocs(docs.filter((d) => d.id !== id));
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 22, marginBottom: 20 }}>Documents</h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <input type="file" accept=".pdf" ref={fileRef} />
        <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>
      </div>

      {error && <p style={{ color: "#ef4444", marginBottom: 12 }}>{error}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
            <th style={{ padding: "8px 12px" }}>Filename</th>
            <th style={{ padding: "8px 12px" }}>Pages</th>
            <th style={{ padding: "8px 12px" }}>Status</th>
            <th style={{ padding: "8px 12px" }}></th>
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => (
            <tr key={doc.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "8px 12px" }}>{doc.filename}</td>
              <td style={{ padding: "8px 12px" }}>{doc.page_count}</td>
              <td style={{ padding: "8px 12px" }}>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 12,
                    background: doc.status === "ready" ? "#dcfce7" : "#fef9c3",
                    color: doc.status === "ready" ? "#166534" : "#854d0e",
                  }}
                >
                  {doc.status}
                </span>
              </td>
              <td style={{ padding: "8px 12px" }}>
                <button className="btn-danger" onClick={() => handleDelete(doc.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {docs.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                No documents uploaded yet. Upload a PDF to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
