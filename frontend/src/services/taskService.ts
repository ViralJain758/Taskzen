import api from "./api";

export interface ProjectAssignee {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface TaskComment {
  _id: string;
  content: string;
  task: string;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export const getTasks = async (projectId: string) => {
  const res = await api.get(`/tasks/${projectId}`);
  return res.data;
};

export const createTask = async (
  projectId: string,
  data: { title: string; description?: string; assignee?: string | null },
) => {
  const res = await api.post(`/tasks/${projectId}`, data);
  return res.data;
};

export const getProjectAssignees = async (
  projectId: string,
): Promise<ProjectAssignee[]> => {
  const res = await api.get(`/tasks/${projectId}/assignees`);
  return res.data;
};

export const updateTaskStatus = async (taskId: string, status: string) => {
  const res = await api.patch(`/tasks/${taskId}/status`, { status });
  return res.data;
};

export const updateTaskAssignee = async (
  taskId: string,
  assignee: string | null,
) => {
  const res = await api.patch(`/tasks/${taskId}`, { assignee });
  return res.data;
};

export const deleteTask = async (taskId: string) => {
  const res = await api.delete(`/tasks/${taskId}`);
  return res.data;
};

export const getTaskComments = async (
  taskId: string,
): Promise<TaskComment[]> => {
  const res = await api.get(`/comments/${taskId}`);
  return res.data;
};

export const addTaskComment = async (taskId: string, content: string) => {
  const res = await api.post(`/comments/${taskId}`, { content });
  return res.data;
};

export const deleteTaskComment = async (commentId: string) => {
  const res = await api.delete(`/comments/${commentId}`);
  return res.data;
};
