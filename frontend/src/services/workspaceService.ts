import api from "./api";

export const getWorkspaces = async () => {
  const res = await api.get("/workspaces");
  return res.data;
};

export const createWorkspace = async (name: string) => {
  const res = await api.post("/workspaces", { name });
  return res.data;
};

export const deleteWorkspace = async (workspaceId: string) => {
  const res = await api.delete(`/workspaces/${workspaceId}`);
  return res.data;
};
