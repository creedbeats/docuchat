import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  const location = useLocation();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        style={{
          width: 220,
          background: "#1a1a2e",
          color: "white",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 32, fontWeight: 700 }}>DocuChat</h1>
        <NavLink to="/chat" active={location.pathname === "/chat"}>
          Chat
        </NavLink>
        <NavLink to="/documents" active={location.pathname === "/documents"}>
          Documents
        </NavLink>
      </nav>
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        display: "block",
        padding: "10px 12px",
        borderRadius: 6,
        marginBottom: 4,
        color: active ? "white" : "#94a3b8",
        background: active ? "#2563eb" : "transparent",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </Link>
  );
}
