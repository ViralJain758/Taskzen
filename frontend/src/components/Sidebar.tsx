import { useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { SidebarContext } from "../context/SidebarContext";
import { getWorkspaces } from "../services/workspaceService";
import { getProjectById } from "../services/projectService";

interface WorkspaceListItem {
  role: string;
  workspace: {
    _id: string;
    name: string;
  };
}

interface ProjectDetails {
  _id: string;
  name: string;
  workspace: {
    _id: string;
    name: string;
  };
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarContext = useContext(SidebarContext);

  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [workspaceName, setWorkspaceName] = useState<string>("Workspace");
  const [projectName, setProjectName] = useState<string>("Project Board");
  const [resolvedWorkspaceId, setResolvedWorkspaceId] = useState<
    string | undefined
  >(undefined);

  const isDashboard = location.pathname === "/dashboard";
  const isWorkspacePage = location.pathname.startsWith("/workspace/");
  const isProjectPage = location.pathname.startsWith("/project/");

  const workspaceId = isWorkspacePage
    ? location.pathname.split("/")[2]
    : undefined;
  const projectId = isProjectPage ? location.pathname.split("/")[2] : undefined;

  useEffect(() => {
    let isMounted = true;

    const loadWorkspaces = async () => {
      try {
        setIsLoadingWorkspaces(true);
        const data = (await getWorkspaces()) as WorkspaceListItem[];
        if (isMounted) {
          setWorkspaces(data);
        }
      } catch {
        if (isMounted) {
          setWorkspaces([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingWorkspaces(false);
        }
      }
    };

    void loadWorkspaces();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSidebarNames = async () => {
      try {
        if (isWorkspacePage && workspaceId) {
          const matchedWorkspace = workspaces.find(
            (item) => item.workspace._id === workspaceId,
          );

          if (!isMounted) return;
          setWorkspaceName(matchedWorkspace?.workspace.name || "Workspace");
          setProjectName("Project Board");
          setResolvedWorkspaceId(workspaceId);
          return;
        }

        if (isProjectPage && projectId) {
          const project = (await getProjectById(projectId)) as ProjectDetails;

          if (!isMounted) return;
          setProjectName(project?.name || "Project Board");
          setWorkspaceName(project?.workspace?.name || "Workspace");
          setResolvedWorkspaceId(project?.workspace?._id);
          return;
        }

        if (!isMounted) return;
        setWorkspaceName("Workspace");
        setProjectName("Project Board");
        setResolvedWorkspaceId(undefined);
      } catch {
        if (!isMounted) return;
        setWorkspaceName("Workspace");
        setProjectName("Project Board");
        setResolvedWorkspaceId(workspaceId);
      }
    };

    void loadSidebarNames();

    return () => {
      isMounted = false;
    };
  }, [isWorkspacePage, isProjectPage, workspaceId, projectId, workspaces]);

  const handleNavClick = () => {
    sidebarContext?.closeSidebar();
  };

  const activeWorkspaceId = resolvedWorkspaceId || workspaceId;

  const navItemClass = (isActive: boolean) => {
    return `group block w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
      isActive
        ? "border-sky-300 bg-gradient-to-r from-sky-100 via-sky-50 to-white text-sky-900 shadow-sm"
        : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900"
    }`;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarContext?.isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={handleNavClick}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`surface-card fixed bottom-0 left-0 top-0 z-40 w-72 border-r border-slate-200/80 bg-white/95 px-4 py-4 overflow-y-auto transition-transform duration-300 md:relative md:bottom-auto md:left-auto md:top-auto md:z-0 md:w-72 md:translate-x-0 md:bg-white/80 ${
          sidebarContext?.isOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            navigate("/");
            handleNavClick();
          }}
          className="mb-6 block w-full rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-orange-50 p-3 text-left transition hover:border-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <h2 className="text-lg font-extrabold tracking-tight text-slate-800 md:text-xl">
            Taskzen
          </h2>
          <p className="mt-1 text-xs text-slate-500">Plan, assign, deliver.</p>
        </button>

        <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Core Navigation
        </div>
        <nav className="space-y-2">
          <button
            onClick={() => {
              navigate("/");
              handleNavClick();
            }}
            className={navItemClass(location.pathname === "/")}
          >
            Home
          </button>
          <button
            onClick={() => {
              navigate("/dashboard");
              handleNavClick();
            }}
            className={navItemClass(isDashboard)}
          >
            Dashboard
          </button>
        </nav>

        {(isWorkspacePage || isProjectPage) && (
          <>
            <div className="mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Current Context
            </div>
            <nav className="space-y-2">
              <button
                onClick={() => {
                  if (resolvedWorkspaceId) {
                    navigate(`/workspace/${resolvedWorkspaceId}`);
                    handleNavClick();
                  }
                }}
                className={navItemClass(isWorkspacePage)}
              >
                {workspaceName}
              </button>

              {isProjectPage && projectId && (
                <button
                  onClick={() => {
                    navigate(`/project/${projectId}`);
                    handleNavClick();
                  }}
                  className={navItemClass(true)}
                >
                  {projectName}
                </button>
              )}
            </nav>
          </>
        )}

        <div className="mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Workspace Switcher
        </div>
        <div className="space-y-2">
          {isLoadingWorkspaces ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-500">
              Loading workspaces...
            </p>
          ) : workspaces.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-500">
              No workspaces yet.
            </p>
          ) : (
            workspaces.map((item) => {
              const isActiveWorkspace =
                activeWorkspaceId === item.workspace._id &&
                (isWorkspacePage || isProjectPage);

              return (
                <button
                  key={item.workspace._id}
                  type="button"
                  onClick={() => {
                    navigate(`/workspace/${item.workspace._id}`);
                    handleNavClick();
                  }}
                  className={navItemClass(isActiveWorkspace)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{item.workspace.name}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                      {item.role}
                    </span>
                  </div>
                </button>
              );
            })
          )}

          <button
            type="button"
            onClick={() => {
              navigate("/dashboard");
              handleNavClick();
            }}
            className="micro-action mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            View all workspaces ({workspaces.length})
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
            Workflow Hints
          </p>
          <ul className="mt-2 space-y-2 text-xs text-slate-600">
            <li>Drag tasks between columns to update status.</li>
            <li>Use member roles to manage access quickly.</li>
            <li>Add comments on cards for async updates.</li>
          </ul>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
