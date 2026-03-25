import { useEffect, useState, useRef } from "react";
import { api, Doc } from "../api/client";

const PAGE_SIZE = 20;

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocs();
    const unsubscribe = api.onDocumentEvents((doc: Doc) => {
      setDocs((prevDocs) => {
        const exists = prevDocs.find((d) => d.id === doc.id);
        if (exists) {
          return prevDocs.map((d) => (d.id === doc.id ? { ...d, ...doc } : d));
        } else {
          return [doc, ...prevDocs];
        }
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadDocs();
  }, [page]);

  async function loadDocs() {
    try {
      const result = await api.getDocuments(page * PAGE_SIZE, PAGE_SIZE);
      setDocs(result.items);
      setTotal(result.total);
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
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function dismissError() {
    setError("");
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusStyles: Record<string, string> = {
    ready: "bg-green-100 text-green-800",
    processing: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold text-slate-900 mb-6">Documents</h2>

      <div className="flex items-center gap-3 mb-6">
        <input
          type="file"
          accept=".pdf"
          ref={fileRef}
          className="text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-red-600 text-sm flex-1">{error}</span>
          <button
            onClick={dismissError}
            className="text-red-400 hover:text-red-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-100 text-left text-sm text-slate-500">
              <th className="px-4 py-3 font-medium">Filename</th>
              <th className="px-4 py-3 font-medium">Pages</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-900 font-medium">{doc.filename}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{doc.page_count}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusStyles[doc.status] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-md hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-400 text-sm">
                  No documents uploaded yet. Upload a PDF to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-slate-500">
            {total} document{total !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-slate-600">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
