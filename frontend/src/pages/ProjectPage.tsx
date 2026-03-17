import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getTasks,
  createTask,
  updateTaskStatus,
} from "../services/taskService";
import socket, { joinProjectRoom, leaveProjectRoom } from "../sockets/socket";

interface Task {
  _id: string;
  title: string;
  status: string;
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

const columns = ["todo", "in_progress", "completed"];

function ProjectPage() {
  const { projectId } = useParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  const fetchTasks = useCallback(async (): Promise<Task[]> => {
    try {
      if (!projectId) return [];
      const data = await getTasks(projectId);
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  }, [projectId]);

  useEffect(() => {
    void fetchTasks().then((data) => {
      setTasks(data);
    });
  }, [fetchTasks]);

  const handleCreate = async () => {
    const taskTitle = title.trim();
    if (!taskTitle || !projectId) return;

    const tempId = `temp-${Date.now()}`;

    const optimisticTask: Task = {
      _id: tempId,
      title: taskTitle,
      status: "todo",
    };

    setTasks((prev) => [optimisticTask, ...prev]);
    setTitle("");

    try {
      const res = await createTask(projectId, { title: taskTitle });

      if (res.task) {
        const createdTask = res.task;

        setTasks((prev) =>
          prev.map((t) => (t._id === tempId ? createdTask : t)),
        );
      }
      const freshTasks = await fetchTasks();
      setTasks(freshTasks);
    } catch (error) {
      console.error(error);
      setTasks((prev) => prev.filter((t) => t._id !== tempId));
    }
  };

  const moveTask = async (taskId: string, status: string) => {
    const previous = tasks;

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
    }
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

      {/* Create Task */}
      <div className="mb-6 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task"
          className="border p-2"
        />
        <button
          onClick={handleCreate}
          className="bg-indigo-500 text-white px-4"
        >
          Add
        </button>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col} className="bg-gray-100 p-4 rounded">
            <h2 className="font-semibold mb-2 uppercase">{col}</h2>

            {tasks
              .filter((t) => t.status === col)
              .map((task) => (
                <div
                  key={task._id}
                  className="bg-white p-2 mb-2 shadow rounded"
                >
                  <p>{task.title}</p>

                  <div className="flex gap-1 mt-2">
                    {columns.map((c) => (
                      <button
                        key={c}
                        onClick={() => moveTask(task._id, c)}
                        className="text-xs bg-gray-200 px-2"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectPage;
