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

export const getWorkspaceMembers = async (workspaceId: string) => {
  const res = await api.get(`/workspaces/${workspaceId}/members`);
  return res.data;
};

export const inviteWorkspaceMember = async (
  workspaceId: string,
  payload: { email: string; role: "admin" | "member" },
) => {
  const res = await api.post(`/workspaces/${workspaceId}/invite`, payload);
  return res.data;
};

export const removeWorkspaceMember = async (
  workspaceId: string,
  memberId: string,
) => {
  const res = await api.delete(
    `/workspaces/${workspaceId}/members/${memberId}`,
  );
  return res.data;
};

export const updateWorkspaceMemberRole = async (
  workspaceId: string,
  memberId: string,
  role: "admin" | "member",
) => {
  const res = await api.patch(
    `/workspaces/${workspaceId}/members/${memberId}/role`,
    {
      role,
    },
  );
  return res.data;
};

export const leaveWorkspace = async (workspaceId: string) => {
  const res = await api.delete(`/workspaces/${workspaceId}/leave`);
  return res.data;
};
