import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProjects,
  createProject,
  deleteProject,
} from "../services/projectService";
import {
  getWorkspaceActivities,
  type ActivityItem,
  type PaginationMeta as ActivityPaginationMeta,
} from "../services/activityService";
import {
  getWorkspaceMembers,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  type PaginationMeta as MembersPaginationMeta,
} from "../services/workspaceService";
import socket, {
  joinWorkspaceRoom,
  leaveWorkspaceRoom,
} from "../sockets/socket";
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
  const [membersPage, setMembersPage] = useState(1);
  const [membersLimit] = useState(8);
  const [membersPagination, setMembersPagination] =
    useState<MembersPaginationMeta>({
      page: 1,
      limit: 8,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
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
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesLimit] = useState(10);
  const [activitiesPagination, setActivitiesPagination] =
    useState<ActivityPaginationMeta>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
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
      setIsLoadingMembers(true);
      if (!workspaceId) {
        setMembers([]);
        setCanManageMembers(false);
        setMembersPagination({
          page: 1,
          limit: membersLimit,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        });
        return;
      }

      const data = await getWorkspaceMembers(
        workspaceId,
        membersPage,
        membersLimit,
      );
      setMembers(data.members || []);
      setCanManageMembers(Boolean(data.canManageMembers));
      setCanManageRoles(Boolean(data.canManageRoles));
      if (data.pagination) {
        if (membersPage > data.pagination.totalPages) {
          setMembersPage(data.pagination.totalPages);
          return;
        }
        setMembersPagination(data.pagination);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load workspace members");
    } finally {
      setIsLoadingMembers(false);
    }
  }, [workspaceId, membersPage, membersLimit]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoadingActivities(true);
        if (!workspaceId) {
          setActivities([]);
          setActivitiesPagination({
            page: 1,
            limit: activitiesLimit,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          });
          return;
        }

        const data = await getWorkspaceActivities(
          workspaceId,
          activitiesPage,
          activitiesLimit,
        );
        setActivities(data.activities || []);
        if (data.pagination) {
          if (activitiesPage > data.pagination.totalPages) {
            setActivitiesPage(data.pagination.totalPages);
            return;
          }
          setActivitiesPagination(data.pagination);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load activity feed");
      } finally {
        setIsLoadingActivities(false);
      }
    };

    void fetchActivities();
  }, [workspaceId, activitiesPage, activitiesLimit]);

  useEffect(() => {
    if (!workspaceId) return;

    const joinCurrentWorkspace = () => {
      joinWorkspaceRoom(workspaceId);
    };

    if (socket.connected) {
      joinCurrentWorkspace();
    }

    const handleActivityCreated = (event: {
      workspaceId: string;
      activity: ActivityItem;
    }) => {
      if (event.workspaceId !== workspaceId) return;

      setActivities((prev) => {
        const exists = prev.some((item) => item._id === event.activity._id);
        if (exists) return prev;

        if (activitiesPage !== 1) {
          setActivitiesPagination((meta) => ({
            ...meta,
            total: meta.total + 1,
            totalPages: Math.max(1, Math.ceil((meta.total + 1) / meta.limit)),
          }));
          return prev;
        }

        const next = [event.activity, ...prev].slice(0, activitiesLimit);
        setActivitiesPagination((meta) => ({
          ...meta,
          total: meta.total + 1,
          totalPages: Math.max(1, Math.ceil((meta.total + 1) / meta.limit)),
        }));
        return next;
      });
    };

    socket.on("connect", joinCurrentWorkspace);
    socket.on("workspace:activity_created", handleActivityCreated);

    return () => {
      leaveWorkspaceRoom(workspaceId);
      socket.off("connect", joinCurrentWorkspace);
      socket.off("workspace:activity_created", handleActivityCreated);
    };
  }, [workspaceId, activitiesPage, activitiesLimit]);

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
      setMembersPage(1);
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
      toast.success("Member removed");
      setMemberToRemove(null);
      await fetchMembers();
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
    <div className="fade-up space-y-4 sm:space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          Workspace
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Projects
        </h1>
      </div>
      <p className="text-xs text-slate-600 sm:text-sm">
        Select a project to open its task board, or create a new one below.
      </p>

      <div className="surface-card flex flex-col gap-2 rounded-2xl p-3 sm:gap-3 sm:p-4 lg:flex-row lg:items-start">
        <div className="w-full space-y-2 sm:max-w-md">
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
            className="w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 sm:px-3 sm:py-2.5 sm:text-sm"
          />
          <textarea
            placeholder="Project description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 sm:px-3 sm:py-2.5 sm:text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:px-4 sm:py-2.5 sm:text-sm"
          disabled={!name.trim() || !workspaceId || isCreating}
        >
          {isCreating ? "Creating..." : "Create Project"}
        </button>
      </div>

      <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold uppercase tracking-[0.14em] text-sky-900">
            Project List
          </h2>
          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            {projects.length} projects
          </span>
        </div>

        {isLoading ? (
          <div className="surface-card rounded-2xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 sm:p-6 sm:text-sm">
            Loading projects...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {projects.map((p) => (
              <div
                key={p._id}
                onClick={() => navigate(`/project/${p._id}`)}
                className="surface-card cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg sm:p-5"
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    {p.name}
                  </h2>
                  {canManageMembers && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete({ id: p._id, name: p.name });
                      }}
                      className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
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
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="order-1 xl:order-2 surface-card rounded-2xl p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Activity Feed</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {activitiesPagination.total} events
            </span>
          </div>

          {isLoadingActivities ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Loading activity...
            </p>
          ) : activities.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No activity yet in this workspace.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {activities.map((activity) => (
                <div
                  key={activity._id}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <p className="text-sm text-slate-900">{activity.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActivitiesPage((prev) => Math.max(1, prev - 1))}
              disabled={!activitiesPagination.hasPrevPage}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-slate-600">
              Page {activitiesPagination.page} of{" "}
              {activitiesPagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setActivitiesPage((prev) => prev + 1)}
              disabled={!activitiesPagination.hasNextPage}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>

        <section className="order-2 xl:order-1 surface-card rounded-2xl p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Members</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {membersPagination.total} total
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
                    <p className="text-xs text-slate-500">
                      {member.user.email}
                    </p>
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

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMembersPage((prev) => Math.max(1, prev - 1))}
              disabled={!membersPagination.hasPrevPage}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-slate-600">
              Page {membersPagination.page} of {membersPagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setMembersPage((prev) => prev + 1)}
              disabled={!membersPagination.hasNextPage}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      </div>

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
