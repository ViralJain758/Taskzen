import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth-context";
import { setAuthToken } from "../services/api";
import toast from "react-hot-toast";

function Topbar() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    auth?.setUser(null);
    auth?.setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuthToken(null);
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <header className="surface-card flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/75 px-4 py-3 md:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Workspace Hub
        </p>
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
          Taskzen
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {auth?.user?.name || "Guest"}
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Topbar;
