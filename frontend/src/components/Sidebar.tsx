import { useLocation, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === "/dashboard";
  const isWorkspacePage = location.pathname.startsWith("/workspace/");
  const isProjectPage = location.pathname.startsWith("/project/");

  const workspaceId = isWorkspacePage
    ? location.pathname.split("/")[2]
    : undefined;
  const projectId = isProjectPage ? location.pathname.split("/")[2] : undefined;

  return (
    <aside className="surface-card border-b border-r border-slate-200/80 bg-white/80 px-4 py-4 md:w-72 md:border-b-0">
      <div className="mb-6 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-orange-50 p-3">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-800 md:text-xl">
          Taskzen
        </h2>
        <p className="mt-1 text-xs text-slate-500">Plan, assign, deliver.</p>
      </div>

      <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Navigation
      </div>
      <nav className="space-y-2">
        <button
          onClick={() => navigate("/dashboard")}
          className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            isDashboard
              ? "bg-sky-100 text-sky-900"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          Dashboard
        </button>

        {(isWorkspacePage || isProjectPage) && (
          <button
            onClick={() => {
              if (workspaceId) {
                navigate(`/workspace/${workspaceId}`);
              }
            }}
            className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              isWorkspacePage
                ? "bg-sky-100 text-sky-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Workspace
          </button>
        )}

        {isProjectPage && projectId && (
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="block w-full rounded-xl bg-sky-100 px-3 py-2 text-left text-sm font-semibold text-sky-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Project Board
          </button>
        )}
      </nav>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
          Quick Hints
        </p>
        <ul className="mt-2 space-y-2 text-xs text-slate-600">
          <li>Drag tasks between columns to update status.</li>
          <li>Use member roles to manage access quickly.</li>
          <li>Add comments on cards for async updates.</li>
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
