import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <nav className="w-56 shrink-0 bg-slate-900 text-white p-5 flex flex-col">
        <h1 className="text-xl font-bold mb-8 tracking-tight">DocuChat</h1>
        <div className="flex flex-col gap-1">
          <NavLink to="/chat" active={location.pathname === "/chat"}>
            Chat
          </NavLink>
          <NavLink to="/documents" active={location.pathname === "/documents"}>
            Documents
          </NavLink>
        </div>
      </nav>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={`block px-3 py-2.5 rounded-md text-sm transition-colors ${
        active
          ? "bg-blue-600 text-white font-semibold"
          : "text-slate-400 hover:text-white hover:bg-slate-800"
      }`}
    >
      {children}
    </Link>
  );
}
