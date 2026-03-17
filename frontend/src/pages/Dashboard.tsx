import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWorkspaces, createWorkspace } from "../services/workspaceService";

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
  const navigate = useNavigate();

  const fetchWorkspaces = async (): Promise<Workspace[]> => {
    try {
      const data = await getWorkspaces();
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  useEffect(() => {
    void fetchWorkspaces().then((data) => {
      setWorkspaces(data);
    });
  }, []);

  const handleCreate = async () => {
    if (!name) return;

    try {
      await createWorkspace(name);
      setName("");
      const data = await fetchWorkspaces();
      setWorkspaces(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Workspaces</h1>

      {/* Create Workspace */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="New workspace"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2"
        />
        <button
          onClick={handleCreate}
          className="bg-indigo-500 text-white px-4"
        >
          Create
        </button>
      </div>

      {/* Workspace List */}
      <div className="grid gap-4">
        {workspaces.map((w) => (
          <div
            key={w.workspace._id}
            onClick={() => navigate(`/workspaces/${w.workspace._id}`)}
            className="p-4 border rounded shadow cursor-pointer hover:bg-gray-100"
          >
            <h2 className="text-lg font-semibold">{w.workspace.name}</h2>
            <p className="text-sm text-gray-500">Role: {w.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
