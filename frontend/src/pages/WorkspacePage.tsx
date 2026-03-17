import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProjects,
  createProject,
  deleteProject,
} from "../services/projectService";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const navigate = useNavigate();

  const fetchProjects = useCallback(async (): Promise<Project[]> => {
    try {
      if (!workspaceId) return [];
      const data = await getProjects(workspaceId);
      return data;
    } catch (error) {
      console.error(error);
      toast.error("Failed to load projects");
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
      toast.success("Project created");
    } catch (error) {
      console.error(error);
      toast.error("Unable to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!workspaceId) return;
    if (!projectToDelete) return;

    try {
      setIsDeleting(true);
      await deleteProject(workspaceId, projectToDelete.id);
      setProjects((prev) =>
        prev.filter((project) => project._id !== projectToDelete.id),
      );
      toast.success("Project deleted");
      setProjectToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fade-up space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          Workspace
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Projects
        </h1>
      </div>
      <p className="text-sm text-slate-600">
        Select a project to open its task board, or create a new one below.
      </p>

      <div className="surface-card flex flex-col gap-2 rounded-2xl p-3 md:flex-row md:items-center md:p-4">
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
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 md:max-w-md"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={!name.trim() || !workspaceId || isCreating}
        >
          {isCreating ? "Creating..." : "Create Project"}
        </button>
      </div>

      {isLoading ? (
        <div className="surface-card rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Loading projects...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p._id}
              onClick={() => navigate(`/project/${p._id}`)}
              className="surface-card cursor-pointer rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">{p.name}</h2>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete({ id: p._id, name: p.name });
                  }}
                  className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Delete
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {p.description || "No description yet"}
              </p>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="surface-card rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
              No projects yet. Create your first project above.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(projectToDelete)}
        title="Delete project?"
        message={`"${projectToDelete?.name || ""}" and all tasks in it will be removed.`}
        confirmLabel="Delete project"
        isProcessing={isDeleting}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => {
          void handleDeleteProject();
        }}
      />
    </div>
  );
}

export default WorkspacePage;
