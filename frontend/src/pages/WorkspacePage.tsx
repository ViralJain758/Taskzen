import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProjects,
  createProject,
  deleteProject,
} from "../services/projectService";
import {
  getWorkspaceMembers,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "../services/workspaceService";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";

interface Project {
  _id: string;
  name: string;
  description?: string;
}

interface WorkspaceMember {
  user: {
    _id: string;
    name: string;
    email: string;
  };
  role: "owner" | "admin" | "member";
}

function WorkspacePage() {
  const { workspaceId } = useParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [updatingRoleMemberId, setUpdatingRoleMemberId] = useState<
    string | null
  >(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
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

  const fetchMembers = useCallback(async () => {
    try {
      if (!workspaceId) {
        setMembers([]);
        setCanManageMembers(false);
        return;
      }

      const data = await getWorkspaceMembers(workspaceId);
      setMembers(data.members || []);
      setCanManageMembers(Boolean(data.canManageMembers));
      setCanManageRoles(Boolean(data.canManageRoles));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load workspace members");
    } finally {
      setIsLoadingMembers(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const handleCreate = async () => {
    const projectName = name.trim();
    const projectDescription = description.trim();
    if (!projectName || !workspaceId || isCreating) return;

    try {
      setIsCreating(true);
      await createProject(workspaceId, {
        name: projectName,
        description: projectDescription || undefined,
      });
      setName("");
      setDescription("");
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
    if (!canManageMembers) {
      toast.error("Only admin and owner can delete projects");
      return;
    }

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

  const handleInviteMember = async () => {
    if (!workspaceId || isInviting) return;

    const email = inviteEmail.trim();
    if (!email) return;

    try {
      setIsInviting(true);
      await inviteWorkspaceMember(workspaceId, {
        email,
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteRole("member");
      toast.success("Member added to workspace");
      await fetchMembers();
    } catch (error) {
      console.error(error);
      toast.error("Unable to add member");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!workspaceId || !memberToRemove) return;

    try {
      setIsRemovingMember(true);
      await removeWorkspaceMember(workspaceId, memberToRemove.id);
      setMembers((prev) =>
        prev.filter((member) => member.user._id !== memberToRemove.id),
      );
      toast.success("Member removed");
      setMemberToRemove(null);
    } catch (error) {
      console.error(error);
      toast.error("Unable to remove member");
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleChangeMemberRole = async (
    memberId: string,
    nextRole: "admin" | "member",
  ) => {
    if (!workspaceId) return;

    const previous = members;
    setUpdatingRoleMemberId(memberId);
    setMembers((prev) =>
      prev.map((member) =>
        member.user._id === memberId ? { ...member, role: nextRole } : member,
      ),
    );

    try {
      await updateWorkspaceMemberRole(workspaceId, memberId, nextRole);
      toast.success("Member role updated");
    } catch (error) {
      console.error(error);
      setMembers(previous);
      toast.error("Unable to update member role");
    } finally {
      setUpdatingRoleMemberId(null);
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

      <div className="surface-card flex flex-col gap-2 rounded-2xl p-3 md:flex-row md:items-start md:p-4">
        <div className="w-full max-w-md space-y-2">
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
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
          <textarea
            placeholder="Project description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
        </div>
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
                {canManageMembers && (
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
                )}
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

      <section className="surface-card rounded-2xl p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Members</h2>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {members.length} total
          </span>
        </div>

        {canManageMembers && (
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
            <input
              type="email"
              placeholder="Member email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 md:max-w-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "admin" | "member")
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              onClick={() => {
                void handleInviteMember();
              }}
              disabled={!inviteEmail.trim() || isInviting}
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isInviting ? "Adding..." : "Add Member"}
            </button>
          </div>
        )}

        {isLoadingMembers ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Loading members...
          </p>
        ) : members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No members found in this workspace.
          </p>
        ) : (
          <div className="grid gap-2">
            {members.map((member) => (
              <div
                key={member.user._id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {member.user.name}
                  </p>
                  <p className="text-xs text-slate-500">{member.user.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  {canManageRoles && member.role !== "owner" ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        void handleChangeMemberRole(
                          member.user._id,
                          e.target.value as "admin" | "member",
                        )
                      }
                      disabled={updatingRoleMemberId === member.user._id}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {member.role}
                    </span>
                  )}
                  {canManageMembers && member.role !== "owner" && (
                    <button
                      type="button"
                      onClick={() =>
                        setMemberToRemove({
                          id: member.user._id,
                          name: member.user.name,
                        })
                      }
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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

      <ConfirmDialog
        open={Boolean(memberToRemove)}
        title="Remove member?"
        message={`"${memberToRemove?.name || ""}" will be removed from this workspace.`}
        confirmLabel="Remove member"
        isProcessing={isRemovingMember}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => {
          void handleRemoveMember();
        }}
      />
    </div>
  );
}

export default WorkspacePage;
