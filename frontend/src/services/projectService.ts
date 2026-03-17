import api from "./api";

export const getProjects = async (workspaceId: string) => {
  const res = await api.get(`/projects/${workspaceId}`);
  return res.data;
};

export const createProject = async (
  workspaceId: string,
  data: { name: string; description?: string },
) => {
  const res = await api.post(`/projects/${workspaceId}`, data);
  return res.data;
};

export const deleteProject = async (workspaceId: string, projectId: string) => {
  const res = await api.delete(`/projects/${workspaceId}/${projectId}`);
  return res.data;
};
