import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProjects, createProject } from "../services/projectService";

interface Project {
  _id: string;
  name: string;
  description?: string;
}

function WorkspacePage() {
  const { workspaceId } = useParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const fetchProjects = useCallback(async (): Promise<Project[]> => {
    try {
      if (!workspaceId) return [];
      const data = await getProjects(workspaceId);
      return data;
    } catch (error) {
      console.error(error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchProjects().then((data) => {
      setProjects(data);
    });
  }, [fetchProjects]);

  const handleCreate = async () => {
    const projectName = name.trim();
    if (!projectName || !workspaceId || isCreating) return;

    try {
      setIsCreating(true);
      await createProject(workspaceId, { name: projectName });
      setName("");
      const data = await fetchProjects();
      setProjects(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Projects</h1>
      <p className="mb-5 text-sm text-gray-500">
        Select a project to open its task board, or create a new one below.
      </p>

      {/* Create Project */}
      <div className="mb-6 flex items-center gap-2">
        <input
          type="text"
          placeholder="New project"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void handleCreate();
            }
          }}
          className="w-full max-w-sm rounded border border-gray-300 bg-white p-2 text-gray-900"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="rounded bg-indigo-600 px-4 py-2 font-medium text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          disabled={!name.trim() || !workspaceId || isCreating}
        >
          {isCreating ? "Creating..." : "Create Project"}
        </button>
      </div>

      {/* Project List */}
      {isLoading ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          Loading projects...
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <div
              key={p._id}
              onClick={() => navigate(`/project/${p._id}`)}
              className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <h2 className="text-lg font-semibold text-gray-900">{p.name}</h2>
              <p className="text-sm text-gray-500">{p.description}</p>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
              No projects yet. Create your first project above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkspacePage;
