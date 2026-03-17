import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getWorkspaces,
  createWorkspace,
  deleteWorkspace,
  leaveWorkspace,
} from "../services/workspaceService";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";

interface Workspace {
  workspace: {
    _id: string;
    name: string;
  };
  role: string;
}

function Dashboard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [workspaceToLeave, setWorkspaceToLeave] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const navigate = useNavigate();

  const fetchWorkspaces = async (): Promise<Workspace[]> => {
    try {
      const data = await getWorkspaces();
      return data;
    } catch (error) {
      console.error(error);
      toast.error("Failed to load workspaces");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchWorkspaces().then((data) => {
      setWorkspaces(data);
    });
  }, []);

  const handleCreate = async () => {
    const workspaceName = name.trim();
    if (!workspaceName || isCreating) return;

    try {
      setIsCreating(true);
      await createWorkspace(workspaceName);
      setName("");
      const data = await fetchWorkspaces();
      setWorkspaces(data);
      toast.success("Workspace created");
    } catch (error) {
      console.error(error);
      toast.error("Unable to create workspace");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;

    try {
      setIsDeleting(true);
      await deleteWorkspace(workspaceToDelete.id);
      setWorkspaces((prev) =>
        prev.filter((w) => w.workspace._id !== workspaceToDelete.id),
      );
      toast.success("Workspace deleted");
      setWorkspaceToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete workspace");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!workspaceToLeave) return;

    try {
      setIsLeaving(true);
      await leaveWorkspace(workspaceToLeave.id);
      setWorkspaces((prev) =>
        prev.filter((w) => w.workspace._id !== workspaceToLeave.id),
      );
      toast.success("You left the workspace");
      setWorkspaceToLeave(null);
    } catch (error) {
      console.error(error);
      toast.error("Unable to leave workspace");
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="fade-up space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          Overview
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Your Workspaces
        </h1>
      </div>
      <p className="text-sm text-slate-600">
        Create a workspace to organize projects and collaborate with your team.
      </p>

      <div className="surface-card flex flex-col gap-2 rounded-2xl p-3 md:flex-row md:items-center md:p-4">
        <input
          type="text"
          placeholder="New workspace"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void handleCreate();
            }
          }}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 md:max-w-lg"
        />
        <button
          onClick={handleCreate}
          disabled={!name.trim() || isCreating}
          className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isCreating ? "Creating..." : "Create"}
        </button>
      </div>

      {isLoading ? (
        <div className="surface-card rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Loading workspaces...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((w) => (
            <div
              key={w.workspace._id}
              onClick={() => navigate(`/workspace/${w.workspace._id}`)}
              className="surface-card cursor-pointer rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">
                  {w.workspace.name}
                </h2>
                <div className="flex items-center gap-2">
                  {w.role === "owner" ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkspaceToDelete({
                          id: w.workspace._id,
                          name: w.workspace.name,
                        });
                      }}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkspaceToLeave({
                          id: w.workspace._id,
                          name: w.workspace.name,
                        });
                      }}
                      className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Role: {w.role}
              </p>
            </div>
          ))}

          {workspaces.length === 0 && (
            <p className="surface-card rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
              No workspaces yet. Create one to get started.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(workspaceToDelete)}
        title="Delete workspace?"
        message={`"${workspaceToDelete?.name || ""}" will be removed along with all its projects and tasks.`}
        confirmLabel="Delete workspace"
        isProcessing={isDeleting}
        onClose={() => setWorkspaceToDelete(null)}
        onConfirm={() => {
          void handleDeleteWorkspace();
        }}
      />

      <ConfirmDialog
        open={Boolean(workspaceToLeave)}
        title="Leave workspace?"
        message={`You will lose access to "${workspaceToLeave?.name || ""}" unless someone invites you again.`}
        confirmLabel="Leave workspace"
        isProcessing={isLeaving}
        onClose={() => setWorkspaceToLeave(null)}
        onConfirm={() => {
          void handleLeaveWorkspace();
        }}
      />
    </div>
  );
}

export default Dashboard;
