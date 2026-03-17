import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getTasks,
  createTask,
  getProjectAssignees,
  type ProjectAssignee,
  updateTaskAssignee,
  updateTaskStatus,
  deleteTask,
} from "../services/taskService";
import socket, { joinProjectRoom, leaveProjectRoom } from "../sockets/socket";
import toast from "react-hot-toast";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ConfirmDialog from "../components/ConfirmDialog";

type TaskStatus = "todo" | "in_progress" | "completed";

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
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

const SortableTaskCard = ({
  task,
  onAssigneeChange,
  onDelete,
  assignees,
  isUpdating,
}: {
  task: Task;
  onAssigneeChange: (
    taskId: string,
    assigneeId: string | null,
  ) => Promise<void>;
  onDelete: (taskId: string) => void;
  assignees: ProjectAssignee[];
  isUpdating: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { status: task.status } });

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
          ? "opacity-60 ring-2 ring-sky-300"
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

      {task.description && (
        <p className="mb-2 text-xs text-slate-600">{task.description}</p>
      )}

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
    </div>
  );
};

const DroppableColumn = ({
  status,
  children,
}: {
  status: TaskStatus;
  children: React.ReactNode;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
    data: { status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-4 transition ${statusStyles[status]} ${
        isOver ? "ring-2 ring-sky-300" : ""
      }`}
    >
      {children}
    </div>
  );
};

function ProjectPage() {
  const { projectId } = useParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<ProjectAssignee[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<PendingTaskDelete | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchTasks = useCallback(async (): Promise<Task[]> => {
    try {
      if (!projectId) return [];
      const data = await getTasks(projectId);
      return data;
    } catch (error) {
      console.error(error);
      toast.error("Failed to load tasks");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchTasks().then((data) => {
      setTasks(data);
    });
  }, [fetchTasks]);

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
      createdBy: optimisticCreator,
    };

    setTasks((prev) => [optimisticTask, ...prev]);
    setTitle("");
    setIsCreating(true);

    try {
      const res = await createTask(projectId, {
        title: taskTitle,
        description: taskDescription || undefined,
        assignee: assigneeId || undefined,
      });

      if (res.task) {
        const createdTask = res.task;

        setTasks((prev) =>
          prev.map((t) => (t._id === tempId ? createdTask : t)),
        );
      }
      const freshTasks = await fetchTasks();
      setTasks(freshTasks);
      setAssigneeId("");
      setDescription("");
      toast.success("Task created");
    } catch (error) {
      console.error(error);
      setTasks((prev) => prev.filter((t) => t._id !== tempId));
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

    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status } : t)),
    );

    try {
      const res = await updateTaskStatus(taskId, status);

      if (res.task) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, ...res.task } : t)),
        );
      }
      const freshTasks = await fetchTasks();
      setTasks(freshTasks);
    } catch (error) {
      console.error(error);
      setTasks(previous);
      toast.error("Unable to update task status");
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
    setTasks((prev) =>
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

    try {
      const res = await updateTaskAssignee(taskId, nextAssigneeId);

      if (res.task) {
        setTasks((prev) =>
          prev.map((task) =>
            task._id === taskId ? { ...task, ...res.task } : task,
          ),
        );
      }

      const freshTasks = await fetchTasks();
      setTasks(freshTasks);
    } catch (error) {
      console.error(error);
      setTasks(previous);
      toast.error("Unable to update assignee");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const requestDeleteTask = (taskId: string) => {
    const task = tasks.find((item) => item._id === taskId);
    if (!task) return;
    setTaskToDelete({ id: task._id, title: task.title });
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    const previous = tasks;
    setIsDeletingTask(true);
    setUpdatingTaskId(taskToDelete.id);
    setTasks((prev) => prev.filter((task) => task._id !== taskToDelete.id));

    try {
      await deleteTask(taskToDelete.id);
      toast.success("Task deleted");
      setTaskToDelete(null);
    } catch (error) {
      console.error(error);
      setTasks(previous);
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

  const hasNoTasks = !isLoading && tasks.length === 0;
  const hasNoAssignees = assignees.length === 0;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTaskId = String(active.id);
    const activeTask = tasks.find((task) => task._id === activeTaskId);
    if (!activeTask) return;

    const overStatus =
      (over.data.current?.status as TaskStatus | undefined) ||
      ((columns.includes(String(over.id) as TaskStatus)
        ? String(over.id)
        : undefined) as TaskStatus | undefined);

    if (!overStatus) return;
    void moveTask(activeTaskId, overStatus);
  };

  useEffect(() => {
    if (!projectId) return;

    const joinCurrentProject = () => {
      joinProjectRoom(projectId);
    };

    if (socket.connected) {
      joinCurrentProject();
    }

    socket.on("connect", joinCurrentProject);

    const handleTaskCreated = (event: TaskCreatedEvent) => {
      if (event.projectId !== projectId) return;
      const { task } = event;

      setTasks((prev) => {
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

      setTasks((prev) => {
        const exists = prev.some((t) => t._id === task._id);
        if (!exists) return [task, ...prev];
        return prev.map((t) => (t._id === task._id ? task : t));
      });
    };

    const handleTaskDeleted = (event: TaskDeletedEvent) => {
      if (event.projectId !== projectId) return;
      setTasks((prev) => prev.filter((t) => t._id !== event.taskId));
    };

    socket.on("project:task_created", handleTaskCreated);
    socket.on("project:task_updated", handleTaskUpdated);
    socket.on("project:task_deleted", handleTaskDeleted);

    return () => {
      leaveProjectRoom(projectId);
      socket.off("connect", joinCurrentProject);
      socket.off("project:task_created", handleTaskCreated);
      socket.off("project:task_updated", handleTaskUpdated);
      socket.off("project:task_deleted", handleTaskDeleted);
    };
  }, [projectId]);

  return (
    <div className="fade-up space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          Project
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Task Board
        </h1>
      </div>
      <p className="text-sm text-slate-600">
        Drag tasks across columns and assign owners directly from each card.
      </p>

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

      {isLoading ? (
        <div className="surface-card rounded-2xl border border-dashed border-slate-300 p-8 text-slate-500">
          Loading tasks...
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
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              {columns.map((status) => (
                <DroppableColumn key={status} status={status}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                      {statusLabels[status]}
                    </h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                      {tasksByColumn[status].length}
                    </span>
                  </div>

                  <SortableContext
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
