import { useLocation, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === "/";

  return (
    <aside className="surface-card border-b border-r border-slate-200/80 bg-white/80 px-4 py-4 md:w-64 md:border-b-0">
      <h2 className="mb-6 text-lg font-extrabold tracking-tight text-slate-800 md:text-xl">
        Taskzen
      </h2>

      <nav className="space-y-2">
        <button
          onClick={() => navigate("/")}
          className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            isDashboard
              ? "bg-sky-100 text-sky-900"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          Dashboard
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
