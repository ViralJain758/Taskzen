import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { getApiErrorMessage } from "../utils";
import socket, {
  joinWorkspaceRoom,
  leaveWorkspaceRoom,
} from "../sockets/socket";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadErrorCard from "../components/LoadErrorCard";
import type {
  ActivitiesQueryData,
  MembersQueryData,
  Project,
  WorkspaceMember,
} from "./workspace-page/types";

function WorkspacePage() {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();
  const projectsQueryKey = useMemo(
    () => ["workspace-projects", workspaceId] as const,
    [workspaceId],
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [updatingRoleMemberId, setUpdatingRoleMemberId] = useState<
    string | null
  >(null);
  const [membersPage, setMembersPage] = useState(1);
  const [membersLimit] = useState(4);
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
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesLimit] = useState(4);
  const navigate = useNavigate();

  const membersQueryKey = useMemo(
    () =>
      ["workspace-members", workspaceId, membersPage, membersLimit] as const,
    [workspaceId, membersPage, membersLimit],
  );
  const activitiesQueryKey = useMemo(
    () =>
      [
        "workspace-activities",
        workspaceId,
        activitiesPage,
        activitiesLimit,
      ] as const,
    [workspaceId, activitiesPage, activitiesLimit],
  );

  const {
    data: projects = [],
    isLoading,
    error: projectsQueryError,
    refetch: refetchProjects,
  } = useQuery<Project[], unknown>({
    queryKey: projectsQueryKey,
    queryFn: async () => {
      if (!workspaceId) return [];
      return getProjects(workspaceId);
    },
    enabled: Boolean(workspaceId),
  });

  const projectsLoadError = projectsQueryError
    ? getApiErrorMessage(projectsQueryError, "Failed to load projects. Retry?")
    : null;

  const {
    data: membersData,
    isLoading: isLoadingMembers,
    error: membersQueryError,
    refetch: refetchMembers,
  } = useQuery<MembersQueryData, unknown>({
    queryKey: membersQueryKey,
    queryFn: async () => {
      if (!workspaceId) {
        return {
          members: [],
          canManageMembers: false,
          canManageRoles: false,
          pagination: {
            page: 1,
            limit: membersLimit,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }

      const data = await getWorkspaceMembers(
        workspaceId,
        membersPage,
        membersLimit,
      );
      return {
        members: data.members || [],
        canManageMembers: Boolean(data.canManageMembers),
        canManageRoles: Boolean(data.canManageRoles),
        pagination: data.pagination || {
          page: membersPage,
          limit: membersLimit,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    },
    enabled: Boolean(workspaceId),
  });

  const membersLoadError = membersQueryError
    ? getApiErrorMessage(membersQueryError, "Failed to load members. Retry?")
    : null;
  const members = membersData?.members || [];
  const membersPagination =
    membersData?.pagination ||
    ({
      page: 1,
      limit: membersLimit,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    } as MembersPaginationMeta);
  const canManageMembers = Boolean(membersData?.canManageMembers);
  const canManageRoles = Boolean(membersData?.canManageRoles);

  useEffect(() => {
    if (membersPage > membersPagination.totalPages) {
      setMembersPage(membersPagination.totalPages);
    }
  }, [membersPage, membersPagination.totalPages]);

  const {
    data: activitiesData,
    isLoading: isLoadingActivities,
    error: activitiesQueryError,
    refetch: refetchActivities,
  } = useQuery<ActivitiesQueryData, unknown>({
    queryKey: activitiesQueryKey,
    queryFn: async () => {
      if (!workspaceId) {
        return {
          activities: [],
          pagination: {
            page: 1,
            limit: activitiesLimit,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }

      const data = await getWorkspaceActivities(
        workspaceId,
        activitiesPage,
        activitiesLimit,
      );
      return {
        activities: data.activities || [],
        pagination: data.pagination || {
          page: activitiesPage,
          limit: activitiesLimit,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    },
    enabled: Boolean(workspaceId),
  });

  const activitiesLoadError = activitiesQueryError
    ? getApiErrorMessage(
        activitiesQueryError,
        "Failed to load activity feed. Retry?",
      )
    : null;
  const activities = activitiesData?.activities || [];
  const activitiesPagination =
    activitiesData?.pagination ||
    ({
      page: 1,
      limit: activitiesLimit,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    } as ActivityPaginationMeta);

  useEffect(() => {
    if (activitiesPage > activitiesPagination.totalPages) {
      setActivitiesPage(activitiesPagination.totalPages);
    }
  }, [activitiesPage, activitiesPagination.totalPages]);

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

      queryClient.setQueryData<ActivitiesQueryData>(
        activitiesQueryKey,
        (previous) => {
          if (!previous) return previous;

          const exists = previous.activities.some(
            (item) => item._id === event.activity._id,
          );
          if (exists) return previous;

          const nextTotal = previous.pagination.total + 1;
          const nextPagination = {
            ...previous.pagination,
            total: nextTotal,
            totalPages: Math.max(
              1,
              Math.ceil(nextTotal / previous.pagination.limit),
            ),
          };

          if (activitiesPage !== 1) {
            return {
              ...previous,
              pagination: nextPagination,
            };
          }

          return {
            activities: [event.activity, ...previous.activities].slice(
              0,
              activitiesLimit,
            ),
            pagination: nextPagination,
          };
        },
      );
    };

    socket.on("connect", joinCurrentWorkspace);
    socket.on("workspace:activity_created", handleActivityCreated);

    return () => {
      leaveWorkspaceRoom(workspaceId);
      socket.off("connect", joinCurrentWorkspace);
      socket.off("workspace:activity_created", handleActivityCreated);
    };
  }, [
    activitiesLimit,
    activitiesPage,
    activitiesQueryKey,
    queryClient,
    workspaceId,
  ]);

  const handleCreate = async () => {
    const projectName = name.trim();
    const projectDescription = description.trim();
    if (!projectName || !workspaceId || isCreating) return;

    const tempProjectId = `temp-project-${Date.now()}`;
    const optimisticProject: Project = {
      _id: tempProjectId,
      name: projectName,
      description: projectDescription || undefined,
    };

    try {
      setIsCreating(true);

      queryClient.setQueryData<Project[]>(projectsQueryKey, (previous) => [
        optimisticProject,
        ...(previous || []),
      ]);

      const response = await createProject(workspaceId, {
        name: projectName,
        description: projectDescription || undefined,
      });
      setName("");
      setDescription("");

      const createdProject =
        typeof response === "object" &&
        response !== null &&
        "project" in response &&
        typeof (response as { project?: unknown }).project === "object"
          ? ((response as { project: Project }).project as Project)
          : null;

      if (!createdProject) {
        throw new Error("Project response missing project payload");
      }

      queryClient.setQueryData<Project[]>(projectsQueryKey, (previous) =>
        (previous || []).map((project) =>
          project._id === tempProjectId ? createdProject : project,
        ),
      );

      toast.success("Project created");
    } catch (error) {
      console.error(error);
      queryClient.setQueryData<Project[]>(projectsQueryKey, (previous) =>
        (previous || []).filter((project) => project._id !== tempProjectId),
      );
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
      queryClient.setQueryData<Project[]>(projectsQueryKey, (previous) =>
        (previous || []).filter(
          (project) => project._id !== projectToDelete.id,
        ),
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

    const optimisticMemberId = `temp-member-${Date.now()}`;
    const optimisticMember: WorkspaceMember = {
      user: {
        _id: optimisticMemberId,
        name: email.split("@")[0] || "New member",
        email,
      },
      role: inviteRole,
    };

    const firstPageMembersKey = [
      "workspace-members",
      workspaceId,
      1,
      membersLimit,
    ] as const;

    const previousFirstPageMembers =
      queryClient.getQueryData<MembersQueryData>(firstPageMembersKey);

    try {
      setIsInviting(true);
      setMembersPage(1);
      queryClient.setQueryData<MembersQueryData>(
        firstPageMembersKey,
        (current) => {
          if (!current) {
            return {
              members: [optimisticMember],
              canManageMembers: true,
              canManageRoles: true,
              pagination: {
                page: 1,
                limit: membersLimit,
                total: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
              },
            };
          }

          const nextTotal = current.pagination.total + 1;
          const nextTotalPages = Math.max(
            1,
            Math.ceil(nextTotal / current.pagination.limit),
          );

          return {
            ...current,
            members: [optimisticMember, ...current.members].slice(
              0,
              current.pagination.limit,
            ),
            pagination: {
              ...current.pagination,
              total: nextTotal,
              totalPages: nextTotalPages,
              hasNextPage: nextTotalPages > 1,
            },
          };
        },
      );

      const response = await inviteWorkspaceMember(workspaceId, {
        email,
        role: inviteRole,
      });

      const returnedMember =
        typeof response === "object" &&
        response !== null &&
        "member" in response &&
        typeof (response as { member?: unknown }).member === "object"
          ? ((response as { member: WorkspaceMember })
              .member as WorkspaceMember)
          : null;

      if (returnedMember) {
        queryClient.setQueryData<MembersQueryData>(
          firstPageMembersKey,
          (current) => {
            if (!current) return current;

            return {
              ...current,
              members: current.members.map((member) =>
                member.user._id === optimisticMemberId
                  ? returnedMember
                  : member,
              ),
            };
          },
        );
      }

      setInviteEmail("");
      setInviteRole("member");
      toast.success("Member added to workspace");
    } catch (error) {
      console.error(error);
      queryClient.setQueryData(firstPageMembersKey, previousFirstPageMembers);
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
      queryClient.setQueryData<MembersQueryData>(
        membersQueryKey,
        (previous) => {
          if (!previous) return previous;

          const nextMembers = previous.members.filter(
            (member) => member.user._id !== memberToRemove.id,
          );
          const nextTotal = Math.max(0, previous.pagination.total - 1);

          return {
            ...previous,
            members: nextMembers,
            pagination: {
              ...previous.pagination,
              total: nextTotal,
              totalPages: Math.max(
                1,
                Math.ceil(nextTotal / previous.pagination.limit),
              ),
            },
          };
        },
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
    queryClient.setQueryData<MembersQueryData>(membersQueryKey, (current) => {
      if (!current) return current;

      return {
        ...current,
        members: current.members.map((member) =>
          member.user._id === memberId ? { ...member, role: nextRole } : member,
        ),
      };
    });

    try {
      await updateWorkspaceMemberRole(workspaceId, memberId, nextRole);
      toast.success("Member role updated");
    } catch (error) {
      console.error(error);
      queryClient.setQueryData<MembersQueryData>(membersQueryKey, (current) => {
        if (!current) return current;

        return {
          ...current,
          members: previous,
        };
      });
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="surface-card rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="shimmer-skeleton h-4 w-3/4 rounded" />
                <div className="shimmer-skeleton mt-3 h-3 w-full rounded" />
                <div className="shimmer-skeleton mt-2 h-3 w-5/6 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {projectsLoadError && (
              <div className="mb-4">
                <LoadErrorCard
                  title="Failed to load projects"
                  message={projectsLoadError}
                  onRetry={() => {
                    void refetchProjects();
                  }}
                />
              </div>
            )}
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
              {projects.length === 0 && !projectsLoadError && (
                <p className="surface-card rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                  No projects yet. Create your first project above.
                </p>
              )}
            </div>
          </>
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
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="shimmer-skeleton h-3 w-11/12 rounded" />
                  <div className="shimmer-skeleton mt-2 h-2.5 w-1/3 rounded" />
                </div>
              ))}
            </div>
          ) : activitiesLoadError ? (
            <LoadErrorCard
              title="Failed to load activity feed"
              message={activitiesLoadError}
              onRetry={() => {
                void refetchActivities();
              }}
            />
          ) : activities.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No activity yet in this workspace.
            </p>
          ) : (
            <div className="space-y-2">
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
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="shimmer-skeleton h-3.5 w-1/2 rounded" />
                      <div className="shimmer-skeleton mt-2 h-2.5 w-2/3 rounded" />
                    </div>
                    <div className="shimmer-skeleton h-6 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : membersLoadError ? (
            <LoadErrorCard
              title="Failed to load members"
              message={membersLoadError}
              onRetry={() => {
                void refetchMembers();
              }}
            />
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
