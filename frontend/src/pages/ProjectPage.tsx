import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getTasks,
  createTask,
  getProjectAssignees,
  type ProjectAssignee,
  updateTaskAssignee,
  updateTaskStatus,
} from "../services/taskService";
import socket, { joinProjectRoom, leaveProjectRoom } from "../sockets/socket";
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

type TaskStatus = "todo" | "in_progress" | "completed";

interface Task {
  _id: string;
  title: string;
  status: TaskStatus;
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

const columns: TaskStatus[] = ["todo", "in_progress", "completed"];
const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
};

const statusStyles: Record<TaskStatus, string> = {
  todo: "bg-amber-50 border-amber-200",
  in_progress: "bg-sky-50 border-sky-200",
  completed: "bg-emerald-50 border-emerald-200",
};

const SortableTaskCard = ({
  task,
  onAssigneeChange,
  assignees,
  isUpdating,
}: {
  task: Task;
  onAssigneeChange: (taskId: string, assigneeId?: string) => Promise<void>;
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
      className={`mb-3 cursor-grab rounded-xl border bg-white p-3 shadow-sm transition active:cursor-grabbing ${
        isDragging ? "opacity-60 ring-2 ring-indigo-300" : "hover:shadow"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{task.title}</p>
      </div>

      {task.assignee && (
        <p className="mb-2 text-xs text-gray-500">
          Assigned to: {task.assignee.name}
        </p>
      )}

      <select
        value={task.assignee?._id || ""}
        onChange={(e) =>
          void onAssigneeChange(task._id, e.target.value || undefined)
        }
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        disabled={isUpdating}
        className="mt-2 w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
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
        isOver ? "ring-2 ring-indigo-300" : ""
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
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<ProjectAssignee[]>([]);
  const [assigneeId, setAssigneeId] = useState("");

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
      }
    };

    void fetchAssignees();
  }, [projectId]);

  const handleCreate = async () => {
    const taskTitle = title.trim();
    if (!taskTitle || !projectId || isCreating) return;

    const tempId = `temp-${Date.now()}`;

    const optimisticTask: Task = {
      _id: tempId,
      title: taskTitle,
      status: "todo",
    };

    setTasks((prev) => [optimisticTask, ...prev]);
    setTitle("");
    setIsCreating(true);

    try {
      const res = await createTask(projectId, {
        title: taskTitle,
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
    } catch (error) {
      console.error(error);
      setTasks((prev) => prev.filter((t) => t._id !== tempId));
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
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const changeTaskAssignee = async (
    taskId: string,
    nextAssigneeId?: string,
  ) => {
    const previous = tasks;
    const selectedAssignee = assignees.find((a) => a._id === nextAssigneeId);

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
    } finally {
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Task Board</h1>
      <p className="mb-5 text-sm text-gray-500">
        Drag tasks across columns and assign owners directly from each card.
      </p>

      {/* Create Task */}
      <div className="mb-6 flex flex-col gap-2 md:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void handleCreate();
            }
          }}
          className="w-full rounded-xl border border-gray-300 bg-white p-2 md:max-w-md"
        />
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="rounded-xl border border-gray-300 bg-white p-2 text-sm text-gray-700 md:w-64"
        >
          <option value="">Unassigned</option>
          {assignees.map((assignee) => (
            <option key={assignee._id} value={assignee._id}>
              {assignee.name} ({assignee.role})
            </option>
          ))}
        </select>
        <button
          onClick={handleCreate}
          disabled={!title.trim() || isCreating}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isCreating ? "Adding..." : "Add Task"}
        </button>
      </div>

      {/* Columns */}
      {isLoading ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-gray-500">
          Loading tasks...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {columns.map((status) => (
              <DroppableColumn key={status} status={status}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                    {statusLabels[status]}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600">
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
                      assignees={assignees}
                      isUpdating={updatingTaskId === task._id}
                    />
                  ))}
                </SortableContext>

                {tasksByColumn[status].length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white/70 p-3 text-center text-xs text-gray-500">
                    Drop task here
                  </div>
                )}
              </DroppableColumn>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}

export default ProjectPage;
