import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth-context";
import { SidebarContext } from "../context/SidebarContext";
import { setAuthToken } from "../services/api";
import toast from "react-hot-toast";
import { NotificationBell } from "./NotificationBell";

function Topbar() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const sidebarContext = useContext(SidebarContext);

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
    <header className="surface-card relative z-[900] flex min-h-14 items-center justify-between border-b border-slate-200/80 bg-white/75 px-3 py-2 sm:px-4 sm:py-3 md:px-6">
      <button
        type="button"
        onClick={() => sidebarContext?.toggleSidebar()}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        aria-label="Toggle menu"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <h1 className="hidden text-lg font-extrabold tracking-tight text-slate-900 sm:block">
        Taskzen
      </h1>

      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell />
        <button
          onClick={handleLogout}
          className="hidden rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:block"
        >
          Logout
        </button>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:hidden"
          title="Logout"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default Topbar;
