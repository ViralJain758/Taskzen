import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getTasks,
  createTask,
  updateTaskStatus,
} from "../services/taskService";

interface Task {
  _id: string;
  title: string;
  status: string;
}

const columns = ["todo", "in_progress", "completed"];

function ProjectPage() {
  const { projectId } = useParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  const fetchTasks = useCallback(async (): Promise<Task[]> => {
    if (!projectId) return [];
    const data = await getTasks(projectId);
    return data;
  }, [projectId]);

  useEffect(() => {
    void fetchTasks().then((data) => {
      setTasks(data);
    });
  }, [fetchTasks]);

  const handleCreate = async () => {
    if (!title || !projectId) return;

    await createTask(projectId, { title });
    setTitle("");
    const data = await fetchTasks();
    setTasks(data);
  };

  const moveTask = async (taskId: string, status: string) => {
    await updateTaskStatus(taskId, status);
    const data = await fetchTasks();
    setTasks(data);
  };

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
