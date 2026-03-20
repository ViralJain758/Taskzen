import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  getTasks,
  createTask,
  getProjectAssignees,
  type ProjectAssignee,
  type TaskComment,
  updateTaskAssignee,
  updateTaskStatus,
  deleteTask,
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
  updateTaskPriority,
} from "../services/taskService";
import socket, { joinProjectRoom, leaveProjectRoom } from "../sockets/socket";
import toast from "react-hot-toast";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  defaultAnimateLayoutChanges,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ConfirmDialog from "../components/ConfirmDialog";
import SmartInsightsPanel from "../components/SmartInsightsPanel";
import LoadErrorCard from "../components/LoadErrorCard";
import {
  getApiErrorMessage,
  enqueueCommentAction,
  enqueueTaskAction,
  getPendingOfflineAddedCommentIdsByTask,
  getPendingOfflineActionCount,
  syncOfflineActions,
} from "../utils";

const latencyToggleRaw = import.meta.env.VITE_SHOW_LATENCY_BUTTON;
const latencyToggleValue = String(latencyToggleRaw || "")
  .trim()
  .toLowerCase();

// If variable exists, default to enabled unless explicitly turned off.
const isLatencyToolsEnabled =
  latencyToggleRaw !== undefined &&
  !["false", "0", "off", "no"].includes(latencyToggleValue);

type TaskStatus = "todo" | "in_progress" | "completed";
type TaskPriority = "low" | "medium" | "high";

const kanbanCollisionDetection = (
  args: Parameters<typeof pointerWithin>[0],
) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    return pointerHits;
  }

  const intersectionHits = rectIntersection(args);
  if (intersectionHits.length > 0) {
    return intersectionHits;
  }

  return closestCorners(args);
};

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  assignee?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface TaskCreatedEvent {
  projectId: string;
  task: Task;
}

interface TaskUpdatedEvent {
  projectId: string;
  task: Task;
}

interface TaskDeletedEvent {
  projectId: string;
  taskId: string;
}

interface CommentCreatedEvent {
  projectId: string;
  taskId: string;
  comment: TaskComment;
}

interface CommentDeletedEvent {
  projectId: string;
  taskId: string;
  commentId: string;
}

interface PendingTaskDelete {
  id: string;
  title: string;
}

const columns: TaskStatus[] = ["todo", "in_progress", "completed"];
const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
};

const statusStyles: Record<TaskStatus, string> = {
  todo: "bg-orange-50/80 border-orange-200",
  in_progress: "bg-sky-50/80 border-sky-200",
  completed: "bg-emerald-50/80 border-emerald-200",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const priorityBadgeStyles: Record<TaskPriority, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
};

const SortableTaskCard = ({
  task,
  onAssigneeChange,
  onDelete,
  assignees,
  isUpdating,
  comments,
  commentsExpanded,
  commentsLoading,
  addingComment,
  deletingCommentId,
  currentUserId,
  canModerateComments,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  statusMenuTaskId,
  onStatusMenuOpen,
  onStatusChange,
  onPriorityChange,
  pendingOfflineCommentIds,
}: {
  task: Task;
  onAssigneeChange: (
    taskId: string,
    assigneeId: string | null,
  ) => Promise<void>;
  onDelete: (taskId: string) => void;
  assignees: ProjectAssignee[];
  isUpdating: boolean;
  comments: TaskComment[];
  commentsExpanded: boolean;
  commentsLoading: boolean;
  addingComment: boolean;
  deletingCommentId: string | null;
  currentUserId: string | null;
  canModerateComments: boolean;
  onToggleComments: (taskId: string) => void;
  onAddComment: (taskId: string, content: string) => Promise<void>;
  onDeleteComment: (taskId: string, commentId: string) => Promise<void>;
  statusMenuTaskId: string | null;
  onStatusMenuOpen: (taskId: string | null) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onPriorityChange: (taskId: string, priority: TaskPriority) => Promise<void>;
  pendingOfflineCommentIds: string[];
}) => {
  const [newComment, setNewComment] = useState("");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: { status: task.status },
    animateLayoutChanges: (args) =>
      defaultAnimateLayoutChanges({ ...args, wasDragging: true }),
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      className={`surface-card mb-3 cursor-grab rounded-xl p-3 transition active:cursor-grabbing ${
        isDragging
          ? "opacity-40 ring-2 ring-sky-300"
          : "hover:-translate-y-0.5 hover:border-sky-200 hover:shadow"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{task.title}</p>
        <button
          type="button"
          onClick={() => {
            void onDelete(task._id);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          disabled={isUpdating}
        >
          Delete
        </button>
      </div>

      <div className="mb-2 block md:hidden">
        <button
          type="button"
          onClick={() =>
            onStatusMenuOpen(statusMenuTaskId === task._id ? null : task._id)
          }
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          className="w-full rounded-md border border-sky-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
          disabled={isUpdating}
        >
          {statusLabels[task.status]}
        </button>
        {statusMenuTaskId === task._id && (
          <div className="mt-1 space-y-1">
            {columns
              .filter((status) => status !== task.status)
              .map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    void onStatusChange(task._id, status);
                    onStatusMenuOpen(null);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Move to {statusLabels[status]}
                </button>
              ))}
          </div>
        )}
      </div>

      {task.description && (
        <p className="mb-2 text-xs text-slate-600">{task.description}</p>
      )}

      <div
        className={`mb-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${priorityBadgeStyles[task.priority]}`}
      >
        {priorityLabels[task.priority]} priority
      </div>

      {task.createdBy && (
        <p className="mb-2 text-xs text-slate-500">
          Created by: {task.createdBy.name}
        </p>
      )}

      {task.assignee && (
        <p className="mb-2 text-xs text-slate-500">
          Assigned to: {task.assignee.name}
        </p>
      )}

      <select
        value={task.assignee?._id || ""}
        onChange={(e) =>
          void onAssigneeChange(task._id, e.target.value || null)
        }
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        disabled={isUpdating}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      >
        <option value="">Unassigned</option>
        {assignees.map((assignee) => (
          <option key={assignee._id} value={assignee._id}>
            {assignee.name}
          </option>
        ))}
      </select>

      <select
        value={task.priority}
        onChange={(e) =>
          void onPriorityChange(task._id, e.target.value as TaskPriority)
        }
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        disabled={isUpdating}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      >
        <option value="low">Low priority</option>
        <option value="medium">Medium priority</option>
        <option value="high">High priority</option>
      </select>

      <button
        type="button"
        onClick={() => onToggleComments(task._id)}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        {commentsExpanded
          ? "Hide comments"
          : `Show comments (${comments.length})`}
      </button>

      {commentsExpanded && (
        <div
          className="mt-2 rounded-lg border border-slate-200 bg-white p-2"
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="mb-2 flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment"
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="button"
              disabled={!newComment.trim() || addingComment}
              onClick={() => {
                void onAddComment(task._id, newComment.trim()).then(() => {
                  setNewComment("");
                });
              }}
              className="rounded-md bg-sky-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {addingComment ? "..." : "Add"}
            </button>
          </div>

          {commentsLoading ? (
            <p className="text-xs text-slate-500">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-500">No comments yet.</p>
          ) : (
            <div className="max-h-32 space-y-2 overflow-auto">
              {comments.map((comment) => {
                const canDeleteComment =
                  canModerateComments || comment.author._id === currentUserId;
                const isPendingOffline = pendingOfflineCommentIds.includes(
                  comment._id,
                );

                return (
                  <div
                    key={comment._id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-semibold text-slate-700">
                          {comment.author.name}
                        </p>
                        {isPendingOffline && (
                          <span className="rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            Pending sync
                          </span>
                        )}
                      </div>
                      {canDeleteComment && (
                        <button
                          type="button"
                          disabled={deletingCommentId === comment._id}
                          onClick={() => {
                            void onDeleteComment(task._id, comment._id);
                          }}
                          className="text-[11px] font-semibold text-rose-700 transition hover:text-rose-800 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-700">{comment.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DragGhostCard = ({ task }: { task: Task }) => {
  return (
    <div className="kanban-ghost surface-card w-[300px] rounded-xl border border-sky-300 bg-white/95 p-3">
      <p className="text-sm font-semibold text-slate-900">{task.title}</p>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-600">
          {task.description}
        </p>
      )}
      <div className="mt-2 inline-flex rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
        {statusLabels[task.status]}
      </div>
    </div>
  );
};

const DroppableColumn = ({
  status,
  children,
  isBoardDragging,
}: {
  status: TaskStatus;
  children: React.ReactNode;
  isBoardDragging: boolean;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
    data: { status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-4 transition ${statusStyles[status]} ${
        isBoardDragging
          ? "border-sky-200/90 bg-gradient-to-b from-white/90 to-sky-50/55"
          : ""
      } ${
        isOver
          ? "kanban-drop-active ring-2 ring-sky-400 shadow-xl shadow-sky-200/70 scale-[1.015]"
          : ""
      }`}
    >
      {children}
    </div>
  );
};

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
  const [latency, setLatency] = useState<number | null>(null);
  const [latencySource, setLatencySource] = useState<"socket" | "http" | null>(
    null,
  );
  const [latencyStatus, setLatencyStatus] = useState<
    "idle" | "testing" | "success" | "timeout" | "disconnected"
  >("idle");
  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const latencyTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<ProjectAssignee[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<PendingTaskDelete | null>(
    null,
  );
  const [commentsByTask, setCommentsByTask] = useState<
    Record<string, TaskComment[]>
  >({});
  const [expandedComments, setExpandedComments] = useState<
    Record<string, boolean>
  >({});
  const [loadingCommentsTaskId, setLoadingCommentsTaskId] = useState<
    string | null
  >(null);
  const [addingCommentTaskId, setAddingCommentTaskId] = useState<string | null>(
    null,
  );
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [statusMenuTaskId, setStatusMenuTaskId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof window === "undefined" ? true : window.navigator.onLine,
  );
  const [isSyncingOfflineActions, setIsSyncingOfflineActions] = useState(false);
  const [pendingOfflineActions, setPendingOfflineActions] = useState(0);
  const [pendingOfflineCommentIdsByTask, setPendingOfflineCommentIdsByTask] =
    useState<Record<string, string[]>>({});
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

  const refreshPendingOfflineActions = useCallback(() => {
    if (!projectId) {
      setPendingOfflineActions(0);
      setPendingOfflineCommentIdsByTask({});
      return;
    }
    setPendingOfflineActions(getPendingOfflineActionCount(projectId));
    setPendingOfflineCommentIdsByTask(
      getPendingOfflineAddedCommentIdsByTask(projectId),
    );
  }, [projectId]);

  useEffect(() => {
    refreshPendingOfflineActions();
  }, [refreshPendingOfflineActions]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
    };

    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const runOfflineSync = useCallback(async () => {
    if (!projectId || !isOnline || isSyncingOfflineActions) return;

    const queuedCount = getPendingOfflineActionCount(projectId);
    if (queuedCount === 0) return;

    const pendingCommentIdsByTaskBeforeSync =
      getPendingOfflineAddedCommentIdsByTask(projectId);
    const commentTaskIdsToRefresh = Object.keys(
      pendingCommentIdsByTaskBeforeSync,
    );

    setIsSyncingOfflineActions(true);

    try {
      const result = await syncOfflineActions(projectId);

      if (result.syncedCount > 0) {
        await refetchTasks();

        if (commentTaskIdsToRefresh.length > 0) {
          const refreshedComments = await Promise.all(
            commentTaskIdsToRefresh.map(async (taskId) => ({
              taskId,
              comments: await getTaskComments(taskId),
            })),
          );

          setCommentsByTask((prev) => {
            const next = { ...prev };
            refreshedComments.forEach(({ taskId, comments }) => {
              next[taskId] = comments;
              preloadedCommentTaskIdsRef.current.add(taskId);
            });
            return next;
          });
        }
      }

      refreshPendingOfflineActions();

      if (result.syncedCount > 0) {
        toast.success(`Synced ${result.syncedCount} offline change(s)`);
      }

      if (result.conflictCount > 0) {
        toast(
          `${result.conflictCount} change(s) resolved with last-write-wins`,
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncingOfflineActions(false);
      refreshPendingOfflineActions();
    }
  }, [
    isOnline,
    isSyncingOfflineActions,
    projectId,
    refetchTasks,
    refreshPendingOfflineActions,
  ]);

  useEffect(() => {
    if (!isOnline) return;
    void runOfflineSync();
  }, [isOnline, runOfflineSync]);

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

  const moveTask = async (taskId: string, status: TaskStatus) => {
    const previous = tasks;
    const currentTask = tasks.find((t) => t._id === taskId);
    if (!currentTask || currentTask.status === status) return;

    setUpdatingTaskId(taskId);

    setTasksCache((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status } : t)),
    );

    if (!projectId) {
      setUpdatingTaskId(null);
      return;
    }

    if (!isOnline) {
      enqueueTaskAction({
        projectId,
        type: "UPDATE_TASK_STATUS",
        taskId,
        payload: { status },
      });
      setUpdatingTaskId(null);
      refreshPendingOfflineActions();
      toast("Saved offline. Status change will sync.");
      return;
    }

    try {
      const res = await updateTaskStatus(taskId, status);

      if (res.task) {
        setTasksCache((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, ...res.task } : t)),
        );
      }
    } catch (error) {
      console.error(error);

      const isNetworkLikeError =
        typeof error === "object" && error !== null && !("response" in error);

      if (isNetworkLikeError && projectId) {
        enqueueTaskAction({
          projectId,
          type: "UPDATE_TASK_STATUS",
          taskId,
          payload: { status },
        });
        refreshPendingOfflineActions();
        toast("Saved offline. Status change will sync.");
      } else {
        queryClient.setQueryData(tasksQueryKey, previous);
        toast.error("Unable to update task status");
      }
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const changeTaskAssignee = async (
    taskId: string,
    nextAssigneeId: string | null,
  ) => {
    const previous = tasks;
    const selectedAssignee = nextAssigneeId
      ? assignees.find((a) => a._id === nextAssigneeId)
      : undefined;

    setUpdatingTaskId(taskId);
    setTasksCache((prev) =>
      prev.map((task) =>
        task._id === taskId
          ? {
              ...task,
              assignee: selectedAssignee
                ? {
                    _id: selectedAssignee._id,
                    name: selectedAssignee.name,
                    email: selectedAssignee.email,
                  }
                : undefined,
            }
          : task,
      ),
    );

    if (!projectId) {
      setUpdatingTaskId(null);
      return;
    }

    if (!isOnline) {
      enqueueTaskAction({
        projectId,
        type: "UPDATE_TASK_ASSIGNEE",
        taskId,
        payload: { assignee: nextAssigneeId },
      });
      setUpdatingTaskId(null);
      refreshPendingOfflineActions();
      toast("Saved offline. Assignee update will sync.");
      return;
    }

    try {
      const res = await updateTaskAssignee(taskId, nextAssigneeId);

      if (res.task) {
        setTasksCache((prev) =>
          prev.map((task) =>
            task._id === taskId ? { ...task, ...res.task } : task,
          ),
        );
      }
    } catch (error) {
      console.error(error);
      queryClient.setQueryData(tasksQueryKey, previous);
      toast.error("Unable to update assignee");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const changeTaskPriority = async (
    taskId: string,
    nextPriority: TaskPriority,
  ) => {
    const previous = tasks;
    const task = tasks.find((item) => item._id === taskId);
    if (!task || task.priority === nextPriority) return;

    setUpdatingTaskId(taskId);
    setTasksCache((prev) =>
      prev.map((item) =>
        item._id === taskId ? { ...item, priority: nextPriority } : item,
      ),
    );

    if (!projectId) {
      setUpdatingTaskId(null);
      return;
    }

    if (!isOnline) {
      enqueueTaskAction({
        projectId,
        type: "UPDATE_TASK_PRIORITY",
        taskId,
        payload: { priority: nextPriority },
      });
      setUpdatingTaskId(null);
      refreshPendingOfflineActions();
      toast("Saved offline. Priority update will sync.");
      return;
    }

    try {
      const res = await updateTaskPriority(taskId, nextPriority);

      if (res.task) {
        setTasksCache((prev) =>
          prev.map((item) =>
            item._id === taskId ? { ...item, ...res.task } : item,
          ),
        );
      }
    } catch (error) {
      console.error(error);
      queryClient.setQueryData(tasksQueryKey, previous);
      toast.error("Unable to update priority");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const requestDeleteTask = (taskId: string) => {
    const task = tasks.find((item) => item._id === taskId);
    if (!task) return;
    setTaskToDelete({ id: task._id, title: task.title });
  };

  const fetchCommentsForTask = async (taskId: string) => {
    try {
      setLoadingCommentsTaskId(taskId);
      const comments = await getTaskComments(taskId);
      setCommentsByTask((prev) => ({
        ...prev,
        [taskId]: comments,
      }));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load comments");
    } finally {
      setLoadingCommentsTaskId(null);
    }
  };

  const toggleComments = (taskId: string) => {
    setExpandedComments((prev) => {
      const nextOpen = !prev[taskId];

      if (nextOpen && !prev[taskId] && !commentsByTask[taskId]) {
        void fetchCommentsForTask(taskId);
      }

      return {
        ...prev,
        [taskId]: nextOpen,
      };
    });
  };

  const handleAddComment = async (taskId: string, content: string) => {
    if (!content.trim()) return;
    const trimmedContent = content.trim();

    if (!projectId) return;

    if (!isOnline) {
      const tempCommentId = `temp-comment-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const optimisticComment: TaskComment = {
        _id: tempCommentId,
        content: trimmedContent,
        task: taskId,
        author: {
          _id: currentUserId || "offline-user",
          name: currentUser?.name || "You",
          email: currentUser?.email || "offline@local",
        },
        createdAt: new Date().toISOString(),
      };

      setCommentsByTask((prev) => {
        const existing = prev[taskId] || [];
        return {
          ...prev,
          [taskId]: [optimisticComment, ...existing],
        };
      });
      preloadedCommentTaskIdsRef.current.add(taskId);

      enqueueCommentAction({
        projectId,
        type: "ADD_COMMENT",
        taskId,
        commentId: tempCommentId,
        payload: { content: trimmedContent },
      });

      refreshPendingOfflineActions();
      toast("Saved offline. Comment will sync.");
      return;
    }

    try {
      setAddingCommentTaskId(taskId);
      const res = await addTaskComment(taskId, trimmedContent);
      if (res.comment) {
        setCommentsByTask((prev) => {
          const existing = prev[taskId] || [];
          const alreadyExists = existing.some(
            (comment) => comment._id === res.comment._id,
          );

          if (alreadyExists) {
            return prev;
          }

          return {
            ...prev,
            [taskId]: [res.comment, ...existing],
          };
        });
      }
      toast.success("Comment added");
    } catch (error) {
      console.error(error);
      toast.error("Unable to add comment");
    } finally {
      setAddingCommentTaskId(null);
    }
  };

  const handleDeleteComment = async (taskId: string, commentId: string) => {
    if (!projectId) return;

    try {
      setDeletingCommentId(commentId);

      if (!isOnline) {
        setCommentsByTask((prev) => ({
          ...prev,
          [taskId]: (prev[taskId] || []).filter(
            (comment) => comment._id !== commentId,
          ),
        }));

        enqueueCommentAction({
          projectId,
          type: "DELETE_COMMENT",
          taskId,
          commentId,
          payload: {},
        });

        refreshPendingOfflineActions();
        toast("Saved offline. Comment deletion will sync.");
        return;
      }

      await deleteTaskComment(commentId);
      setCommentsByTask((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter(
          (comment) => comment._id !== commentId,
        ),
      }));
      toast.success("Comment deleted");
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    const previous = tasks;
    setIsDeletingTask(true);
    setUpdatingTaskId(taskToDelete.id);
    setTasksCache((prev) =>
      prev.filter((task) => task._id !== taskToDelete.id),
    );

    if (!projectId) {
      setIsDeletingTask(false);
      setUpdatingTaskId(null);
      return;
    }

    if (!isOnline) {
      enqueueTaskAction({
        projectId,
        type: "DELETE_TASK",
        taskId: taskToDelete.id,
        payload: {},
      });
      setCommentsByTask((prev) => {
        const next = { ...prev };
        delete next[taskToDelete.id];
        return next;
      });
      preloadedCommentTaskIdsRef.current.delete(taskToDelete.id);
      setTaskToDelete(null);
      setIsDeletingTask(false);
      setUpdatingTaskId(null);
      refreshPendingOfflineActions();
      toast("Saved offline. Task deletion will sync.");
      return;
    }

    try {
      await deleteTask(taskToDelete.id);
      setCommentsByTask((prev) => {
        const next = { ...prev };
        delete next[taskToDelete.id];
        return next;
      });
      preloadedCommentTaskIdsRef.current.delete(taskToDelete.id);
      toast.success("Task deleted");
      setTaskToDelete(null);
    } catch (error) {
      console.error(error);
      queryClient.setQueryData(tasksQueryKey, previous);
      toast.error("Unable to delete task");
    } finally {
      setIsDeletingTask(false);
      setUpdatingTaskId(null);
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

  const runHttpLatencyFallback = useCallback(async () => {
    try {
      const apiBase =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const pingUrl = apiBase.replace(/\/api\/?$/, "/");
      const start = performance.now();
      await fetch(pingUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      return Math.round(performance.now() - start);
    } catch {
      return null;
    }
  }, []);

  const testLatency = useCallback(async () => {
    setIsTestingLatency(true);
    setLatencyStatus("testing");

    const applySuccess = (value: number, source: "socket" | "http") => {
      setLatency(value);
      setLatencySource(source);
      setLatencyStatus("success");

      if (latencyTimeoutRef.current) {
        clearTimeout(latencyTimeoutRef.current);
      }

      latencyTimeoutRef.current = setTimeout(() => {
        setLatency(null);
        setLatencySource(null);
      }, 3000);
    };

    const fallbackLatency = await runHttpLatencyFallback();

    if (!socket.connected) {
      if (fallbackLatency !== null) {
        applySuccess(fallbackLatency, "http");
      } else {
        setLatency(null);
        setLatencySource(null);
        setLatencyStatus("disconnected");
      }
      setIsTestingLatency(false);
      return;
    }

    const start = Date.now();

    await new Promise<void>((resolve) => {
      let settled = false;

      const finalize = (
        value: number | null,
        source: "socket" | "http" | null,
      ) => {
        if (settled) return;
        settled = true;

        if (value !== null && source) {
          applySuccess(value, source);
        } else {
          setLatency(null);
          setLatencySource(null);
          setLatencyStatus("timeout");
        }

        setIsTestingLatency(false);
        resolve();
      };

      const onResponseFallback = (startTimeFromEvent: number) => {
        clearTimeout(timeout);
        socket.off("latency:response", onResponseFallback);
        finalize(Date.now() - startTimeFromEvent, "socket");
      };

      const timeout = setTimeout(async () => {
        socket.off("latency:response", onResponseFallback);
        const httpLatency = await runHttpLatencyFallback();
        if (httpLatency !== null) {
          finalize(httpLatency, "http");
          return;
        }
        finalize(null, null);
      }, 5000);

      socket.on("latency:response", onResponseFallback);

      socket.emit(
        "latency:test",
        start,
        (payload?: { startTime?: number; serverTime?: number }) => {
          if (settled) return;
          clearTimeout(timeout);
          socket.off("latency:response", onResponseFallback);

          const ackStartTime = payload?.startTime;
          if (typeof ackStartTime === "number") {
            finalize(Date.now() - ackStartTime, "socket");
            return;
          }

          finalize(Date.now() - start, "socket");
        },
      );
    });
  }, [runHttpLatencyFallback]);

  useEffect(() => {
    if (!projectId) return;

    const joinCurrentProject = () => {
      joinProjectRoom(projectId);
    };

    if (socket.connected) {
      joinCurrentProject();
      if (isLatencyToolsEnabled) {
        // Test latency when component mounts if socket is connected
        void testLatency();
      }
    }

    const handleConnect = () => {
      joinCurrentProject();
      if (isLatencyToolsEnabled) {
        // Test latency on reconnection
        void testLatency();
      }
    };

    socket.on("connect", handleConnect);

    const handleTaskCreated = (event: TaskCreatedEvent) => {
      if (event.projectId !== projectId) return;
      const { task } = event;

      setTasksCache((prev) => {
        const exists = prev.find((t) => t._id === task._id);
        if (exists) return prev;

        // remove temp tasks
        const filtered = prev.filter((t) => !t._id.startsWith("temp-"));

        return [task, ...filtered];
      });
    };

    const handleTaskUpdated = (event: TaskUpdatedEvent) => {
      if (event.projectId !== projectId) return;
      const { task } = event;

      setTasksCache((prev) => {
        const exists = prev.some((t) => t._id === task._id);
        if (!exists) return [task, ...prev];
        return prev.map((t) => (t._id === task._id ? task : t));
      });
    };

    const handleTaskDeleted = (event: TaskDeletedEvent) => {
      if (event.projectId !== projectId) return;
      setTasksCache((prev) => prev.filter((t) => t._id !== event.taskId));
      setCommentsByTask((prev) => {
        const next = { ...prev };
        delete next[event.taskId];
        return next;
      });
      preloadedCommentTaskIdsRef.current.delete(event.taskId);
    };

    const handleCommentCreated = (event: CommentCreatedEvent) => {
      if (event.projectId !== projectId) return;
      setCommentsByTask((prev) => {
        if (!prev[event.taskId]) return prev;
        const exists = prev[event.taskId].some(
          (comment) => comment._id === event.comment._id,
        );
        if (exists) return prev;

        return {
          ...prev,
          [event.taskId]: [event.comment, ...prev[event.taskId]],
        };
      });
    };

    const handleCommentDeleted = (event: CommentDeletedEvent) => {
      if (event.projectId !== projectId) return;
      setCommentsByTask((prev) => {
        if (!prev[event.taskId]) return prev;
        return {
          ...prev,
          [event.taskId]: prev[event.taskId].filter(
            (comment) => comment._id !== event.commentId,
          ),
        };
      });
    };

    socket.on("project:task_created", handleTaskCreated);
    socket.on("project:task_updated", handleTaskUpdated);
    socket.on("project:task_deleted", handleTaskDeleted);
    socket.on("project:comment_created", handleCommentCreated);
    socket.on("project:comment_deleted", handleCommentDeleted);

    return () => {
      leaveProjectRoom(projectId);
      socket.off("connect", handleConnect);
      socket.off("project:task_created", handleTaskCreated);
      socket.off("project:task_updated", handleTaskUpdated);
      socket.off("project:task_deleted", handleTaskDeleted);
      socket.off("project:comment_created", handleCommentCreated);
      socket.off("project:comment_deleted", handleCommentDeleted);
      // Clean up latency timeout if pending
      if (latencyTimeoutRef.current) {
        clearTimeout(latencyTimeoutRef.current);
      }
    };
  }, [projectId, setTasksCache, testLatency]);

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
