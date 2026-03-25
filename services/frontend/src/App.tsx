import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import DocumentsPage from "./pages/DocumentsPage";
import ChatPage from "./pages/ChatPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/chat" />} />
      </Routes>
    </Layout>
  );
}
