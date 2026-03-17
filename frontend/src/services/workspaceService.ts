import api from "./api";

export const getWorkspaces = async () => {
  const res = await api.get("/workspaces");
  return res.data;
};

export const createWorkspace = async (name: string) => {
  const res = await api.post("/workspaces", { name });
  return res.data;
};
