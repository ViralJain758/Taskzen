import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWorkspaces, createWorkspace } from "../services/workspaceService";
import toast from "react-hot-toast";

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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Workspaces</h1>
      <p className="mb-5 text-sm text-gray-500">
        Create a workspace to organize projects and collaborate with your team.
      </p>

      {/* Create Workspace */}
      <div className="mb-6 flex gap-2">
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
          className="w-full max-w-md rounded-xl border border-gray-300 bg-white p-2"
        />
        <button
          onClick={handleCreate}
          disabled={!name.trim() || isCreating}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isCreating ? "Creating..." : "Create"}
        </button>
      </div>

      {/* Workspace List */}
      {isLoading ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          Loading workspaces...
        </div>
      ) : (
        <div className="grid gap-4">
          {workspaces.map((w) => (
            <div
              key={w.workspace._id}
              onClick={() => navigate(`/workspace/${w.workspace._id}`)}
              className="cursor-pointer rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <h2 className="text-lg font-semibold text-gray-900">
                {w.workspace.name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">Role: {w.role}</p>
            </div>
          ))}

          {workspaces.length === 0 && (
            <p className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
              No workspaces yet. Create one to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
