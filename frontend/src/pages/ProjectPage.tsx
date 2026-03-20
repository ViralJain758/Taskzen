import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  getTasks,
  createTask,
  getProjectAssignees,
  type ProjectAssignee,
  type TaskComment,
  getTaskComments,
} from "../services/taskService";
import toast from "react-hot-toast";
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import ConfirmDialog from "../components/ConfirmDialog";
import SmartInsightsPanel from "../components/SmartInsightsPanel";
import LoadErrorCard from "../components/LoadErrorCard";
import { getApiErrorMessage, enqueueTaskAction } from "../utils";
import {
  columns,
  kanbanCollisionDetection,
  statusLabels,
} from "./project-page/types";
import { SortableTaskCard } from "./project-page/components/SortableTaskCard";
import { DragGhostCard } from "./project-page/components/DragGhostCard";
import { DroppableColumn } from "./project-page/components/DroppableColumn";
import { useProjectOfflineSync } from "./project-page/hooks/useProjectOfflineSync";
import { useProjectRealtimeSync } from "./project-page/hooks/useProjectRealtimeSync";
import { useProjectTaskActions } from "./project-page/hooks/useProjectTaskActions";
import type { Task, TaskPriority, TaskStatus } from "./project-page/types";

const latencyToggleRaw = import.meta.env.VITE_SHOW_LATENCY_BUTTON;
const latencyToggleValue = String(latencyToggleRaw || "")
  .trim()
  .toLowerCase();

// If variable exists, default to enabled unless explicitly turned off.
const isLatencyToolsEnabled =
  latencyToggleRaw !== undefined &&
  !["false", "0", "off", "no"].includes(latencyToggleValue);

function ProjectPage() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const tasksQueryKey = useMemo(
    () => ["project-tasks", projectId] as const,
    [projectId],
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [assignees, setAssignees] = useState<ProjectAssignee[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [commentsByTask, setCommentsByTask] = useState<
    Record<string, TaskComment[]>
  >({});
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [statusMenuTaskId, setStatusMenuTaskId] = useState<string | null>(null);
  const preloadedCommentTaskIdsRef = useRef<Set<string>>(new Set());

  const currentUser = useMemo(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser) as {
        _id?: string;
        name?: string;
        email?: string;
      };
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const currentUserId = currentUser?._id || null;

  const currentUserWorkspaceRole = useMemo(() => {
    if (!currentUserId) return null;
    const me = assignees.find((assignee) => assignee._id === currentUserId);
    return me?.role || null;
  }, [assignees, currentUserId]);

  const canModerateComments =
    currentUserWorkspaceRole === "owner" ||
    currentUserWorkspaceRole === "admin";

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const {
    data: tasks = [],
    isLoading,
    error: tasksQueryError,
    refetch: refetchTasks,
  } = useQuery<Task[], unknown>({
    queryKey: tasksQueryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return getTasks(projectId);
    },
    enabled: Boolean(projectId),
  });

  const tasksLoadError = tasksQueryError
    ? getApiErrorMessage(tasksQueryError, "Failed to load tasks. Retry?")
    : null;

  const setTasksCache = useCallback(
    (updater: (previous: Task[]) => Task[]) => {
      if (!projectId) return;
      queryClient.setQueryData<Task[]>(tasksQueryKey, (previous) =>
        updater(previous || []),
      );
    },
    [projectId, queryClient, tasksQueryKey],
  );

  const {
    isOnline,
    isSyncingOfflineActions,
    pendingOfflineActions,
    pendingOfflineCommentIdsByTask,
    refreshPendingOfflineActions,
  } = useProjectOfflineSync({
    projectId,
    refetchTasks,
    setCommentsByTask,
    preloadedCommentTaskIdsRef,
  });

  const {
    updatingTaskId,
    isDeletingTask,
    taskToDelete,
    setTaskToDelete,
    expandedComments,
    loadingCommentsTaskId,
    addingCommentTaskId,
    deletingCommentId,
    moveTask,
    changeTaskAssignee,
    changeTaskPriority,
    requestDeleteTask,
    toggleComments,
    handleAddComment,
    handleDeleteComment,
    handleDeleteTask,
  } = useProjectTaskActions({
    tasks,
    assignees,
    commentsByTask,
    setCommentsByTask,
    projectId,
    isOnline,
    currentUser,
    currentUserId,
    refreshPendingOfflineActions,
    setTasksCache,
    queryClient,
    tasksQueryKey,
    preloadedCommentTaskIdsRef,
  });

  const {
    latency,
    latencySource,
    latencyStatus,
    isTestingLatency,
    testLatency,
  } = useProjectRealtimeSync({
    projectId,
    setTasksCache,
    setCommentsByTask,
    preloadedCommentTaskIdsRef,
    isLatencyToolsEnabled,
  });

  useEffect(() => {
    const taskIdsInBoard = new Set(tasks.map((task) => task._id));

    // Keep preloaded cache aligned with current task set to avoid stale ids.
    for (const preloadedId of preloadedCommentTaskIdsRef.current) {
      if (!taskIdsInBoard.has(preloadedId)) {
        preloadedCommentTaskIdsRef.current.delete(preloadedId);
      }
    }

    const taskIdsToPreload = tasks
      .map((task) => task._id)
      .filter(
        (taskId) =>
          !taskId.startsWith("temp-") &&
          !preloadedCommentTaskIdsRef.current.has(taskId),
      );

    if (taskIdsToPreload.length === 0) return;

    let cancelled = false;

    const preloadCommentCounts = async () => {
      const loadedEntries = await Promise.all(
        taskIdsToPreload.map(async (taskId) => {
          const comments = await getTaskComments(taskId);
          return { taskId, comments };
        }),
      );

      if (cancelled) return;

      setCommentsByTask((prev) => {
        const next = { ...prev };

        loadedEntries.forEach(({ taskId, comments }) => {
          next[taskId] = comments;
          preloadedCommentTaskIdsRef.current.add(taskId);
        });

        return next;
      });
    };

    void preloadCommentCounts();

    return () => {
      cancelled = true;
    };
  }, [tasks]);

  useEffect(() => {
    const fetchAssignees = async () => {
      try {
        if (!projectId) return;
        const data = await getProjectAssignees(projectId);
        setAssignees(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load assignees");
      }
    };

    void fetchAssignees();
  }, [projectId]);

  const handleCreate = async () => {
    const taskTitle = title.trim();
    const taskDescription = description.trim();
    if (!taskTitle || !projectId || isCreating) return;
    const createPayload = {
      title: taskTitle,
      description: taskDescription || undefined,
      assignee: assigneeId || undefined,
      priority,
    };

    let optimisticCreator: Task["createdBy"];
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as {
          _id: string;
          name: string;
          email: string;
        };

        optimisticCreator = {
          _id: parsed._id,
          name: parsed.name,
          email: parsed.email,
        };
      }
    } catch {
      optimisticCreator = undefined;
    }

    const tempId = `temp-${Date.now()}`;

    const optimisticTask: Task = {
      _id: tempId,
      title: taskTitle,
      description: taskDescription || undefined,
      status: "todo",
      priority,
      createdBy: optimisticCreator,
    };

    setTasksCache((prev) => [optimisticTask, ...prev]);
    setTitle("");
    setIsCreating(true);

    if (!isOnline) {
      enqueueTaskAction({
        projectId,
        type: "CREATE_TASK",
        taskId: tempId,
        payload: createPayload,
      });
      setAssigneeId("");
      setDescription("");
      setPriority("medium");
      setIsCreating(false);
      refreshPendingOfflineActions();
      toast("Saved offline. Task will sync automatically.");
      return;
    }

    try {
      const res = await createTask(projectId, createPayload);

      if (res.task) {
        const createdTask = res.task;

        setTasksCache((prev) =>
          prev.map((t) => (t._id === tempId ? createdTask : t)),
        );
      }
      setAssigneeId("");
      setDescription("");
      setPriority("medium");
      toast.success("Task created");
    } catch (error) {
      console.error(error);
      setTasksCache((prev) => prev.filter((t) => t._id !== tempId));
      toast.error("Unable to create task");
    } finally {
      setIsCreating(false);
    }
  };

  const tasksByColumn = useMemo(
    () =>
      columns.reduce(
        (acc, status) => {
          acc[status] = tasks.filter((task) => task.status === status);
          return acc;
        },
        { todo: [], in_progress: [], completed: [] } as Record<
          TaskStatus,
          Task[]
        >,
      ),
    [tasks],
  );

  const insightsRefreshSignal = useMemo(
    () =>
      tasks
        .map((task) => {
          const assigneeId = task.assignee?._id || "";
          return `${task._id}:${task.status}:${task.priority}:${assigneeId}`;
        })
        .join("|"),
    [tasks],
  );

  const hasNoTasks = !isLoading && tasks.length === 0;
  const hasNoAssignees = assignees.length === 0;
  const activeTask = activeTaskId
    ? tasks.find((task) => task._id === activeTaskId) || null
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
    setDragOverStatus(null);
  };

  const handleDragCancel = () => {
    setActiveTaskId(null);
    setDragOverStatus(null);
  };

  const resolveStatusFromOver = (
    overIdRaw: string,
    overData?: {
      status?: TaskStatus;
      sortable?: { containerId?: string };
    },
  ): TaskStatus | undefined => {
    const overId = String(overIdRaw);

    if (columns.includes(overId as TaskStatus)) {
      return overId as TaskStatus;
    }

    const taskFromOverId = tasks.find((task) => task._id === overId);
    if (taskFromOverId) {
      return taskFromOverId.status;
    }

    const fromDroppableData = overData?.status;
    if (fromDroppableData) {
      return fromDroppableData;
    }

    const containerId = overData?.sortable?.containerId;
    if (containerId && columns.includes(containerId as TaskStatus)) {
      return containerId as TaskStatus;
    }

    return undefined;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) return;

    const overStatus = resolveStatusFromOver(
      String(over.id),
      over.data.current as
        | {
            status?: TaskStatus;
            sortable?: { containerId?: string };
          }
        | undefined,
    );

    if (overStatus) {
      setDragOverStatus(overStatus);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over) {
      setDragOverStatus(null);
      return;
    }

    const activeTaskId = String(active.id);
    const activeTask = tasks.find((task) => task._id === activeTaskId);
    if (!activeTask) return;

    const overStatus =
      resolveStatusFromOver(
        String(over.id),
        over.data.current as
          | {
              status?: TaskStatus;
              sortable?: { containerId?: string };
            }
          | undefined,
      ) || dragOverStatus;

    if (!overStatus) return;
    setDragOverStatus(null);
    void moveTask(activeTaskId, overStatus);
  };

  return (
    <div className="fade-up space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            Project
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Task Board
          </h1>
        </div>
        {isLatencyToolsEnabled && (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => void testLatency()}
              disabled={isTestingLatency}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isTestingLatency ? "Testing..." : "Test Latency"}
            </button>
            <span className="text-xs font-semibold text-slate-600">
              {latencyStatus === "testing" && "Testing latency..."}
              {latencyStatus === "success" &&
                latency !== null &&
                `🔗 ${latency}ms${latencySource === "http" ? " (http fallback)" : " (socket)"}`}
              {latencyStatus === "timeout" && "Latency timeout (no response)"}
              {latencyStatus === "disconnected" && "Socket disconnected"}
              {latencyStatus === "idle" && "Latency not tested yet"}
            </span>
          </div>
        )}
      </div>
      <p className="text-sm text-slate-600">
        Drag tasks across columns and assign owners directly from each card.
      </p>

      {!isOnline && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          You are offline - changes will sync automatically once reconnected.
          {pendingOfflineActions > 0
            ? ` Pending: ${pendingOfflineActions}`
            : ""}
        </div>
      )}

      {isOnline && pendingOfflineActions > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          {isSyncingOfflineActions
            ? "Back online - syncing your offline changes..."
            : `${pendingOfflineActions} offline change(s) queued. Sync will run automatically.`}
        </div>
      )}

      <div className="surface-card flex flex-col gap-2 rounded-2xl p-3 md:flex-row md:items-start md:p-4">
        <div className="flex w-full max-w-md flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleCreate();
              }
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 md:w-64"
        >
          <option value="">Unassigned</option>
          {hasNoAssignees && (
            <option value="" disabled>
              No members available
            </option>
          )}
          {assignees.map((assignee) => (
            <option key={assignee._id} value={assignee._id}>
              {assignee.name} ({assignee.role})
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 md:w-48"
        >
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>
        <button
          onClick={handleCreate}
          disabled={!title.trim() || isCreating}
          className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isCreating ? "Adding..." : "Add Task"}
        </button>
      </div>

      {hasNoAssignees && (
        <p className="surface-card rounded-xl border border-dashed border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
          No workspace members are available to assign yet. You can still create
          unassigned tasks.
        </p>
      )}

      <SmartInsightsPanel
        projectId={projectId}
        refreshSignal={insightsRefreshSignal}
      />

      {tasksLoadError && !isLoading && (
        <LoadErrorCard
          title="Failed to load tasks"
          message={tasksLoadError}
          onRetry={() => {
            void refetchTasks();
          }}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {[0, 1, 2].map((column) => (
            <div
              key={column}
              className="surface-card rounded-2xl border border-slate-200 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="shimmer-skeleton h-3 w-24 rounded" />
                <div className="shimmer-skeleton h-5 w-8 rounded-full" />
              </div>
              <div className="space-y-3">
                {[0, 1].map((card) => (
                  <div
                    key={`${column}-${card}`}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="shimmer-skeleton h-3.5 w-3/4 rounded" />
                    <div className="shimmer-skeleton mt-2 h-2.5 w-full rounded" />
                    <div className="shimmer-skeleton mt-2 h-2.5 w-5/6 rounded" />
                    <div className="shimmer-skeleton mt-3 h-5 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {hasNoTasks && (
            <div className="surface-card rounded-2xl border border-dashed border-sky-300 bg-sky-50 p-6 text-center">
              <h3 className="text-base font-semibold text-sky-900">
                No tasks yet
              </h3>
              <p className="mt-1 text-sm text-sky-700">
                Create your first task above. You can add details, assign it,
                and then drag it across columns.
              </p>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={kanbanCollisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              {columns.map((status) => (
                <DroppableColumn
                  key={status}
                  status={status}
                  isBoardDragging={Boolean(activeTaskId)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                      {statusLabels[status]}
                    </h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                      {tasksByColumn[status].length}
                    </span>
                  </div>

                  <SortableContext
                    id={status}
                    items={tasksByColumn[status].map((task) => task._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {tasksByColumn[status].map((task) => (
                      <SortableTaskCard
                        key={task._id}
                        task={task}
                        onAssigneeChange={changeTaskAssignee}
                        onDelete={requestDeleteTask}
                        assignees={assignees}
                        isUpdating={updatingTaskId === task._id}
                        comments={commentsByTask[task._id] || []}
                        commentsExpanded={Boolean(expandedComments[task._id])}
                        commentsLoading={loadingCommentsTaskId === task._id}
                        addingComment={addingCommentTaskId === task._id}
                        deletingCommentId={deletingCommentId}
                        currentUserId={currentUserId}
                        canModerateComments={canModerateComments}
                        onToggleComments={toggleComments}
                        onAddComment={handleAddComment}
                        onDeleteComment={handleDeleteComment}
                        statusMenuTaskId={statusMenuTaskId}
                        onStatusMenuOpen={setStatusMenuTaskId}
                        onStatusChange={moveTask}
                        onPriorityChange={changeTaskPriority}
                        pendingOfflineCommentIds={
                          pendingOfflineCommentIdsByTask[task._id] || []
                        }
                      />
                    ))}
                  </SortableContext>

                  {tasksByColumn[status].length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-3 text-center text-xs text-slate-500">
                      Drop task here
                    </div>
                  )}
                </DroppableColumn>
              ))}
            </div>

            <DragOverlay adjustScale={false}>
              {activeTask ? <DragGhostCard task={activeTask} /> : null}
            </DragOverlay>
          </DndContext>
        </>
      )}

      <ConfirmDialog
        open={Boolean(taskToDelete)}
        title="Delete task?"
        message={`"${taskToDelete?.title || ""}" will be permanently removed.`}
        confirmLabel="Delete task"
        isProcessing={isDeletingTask}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          void handleDeleteTask();
        }}
      />
    </div>
  );
}

export default ProjectPage;
