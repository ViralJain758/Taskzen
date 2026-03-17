import api from "./api";

export const getTasks = async (projectId: string) => {
  const res = await api.get(`/tasks/${projectId}`);
  return res.data;
};

export const createTask = async (
  projectId: string,
  data: { title: string },
) => {
  const res = await api.post(`/tasks/${projectId}`, data);
  return res.data;
};

export const updateTaskStatus = async (taskId: string, status: string) => {
  const res = await api.patch(`/tasks/${taskId}/status`, { status });
  return res.data;
};
