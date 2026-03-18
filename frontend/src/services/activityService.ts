import api from "./api";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ActivityItem {
  _id: string;
  workspace: string;
  project?: string;
  projectName?: string;
  actor: string;
  actorName: string;
  message: string;
  type:
    | "project_created"
    | "project_deleted"
    | "task_created"
    | "task_deleted"
    | "task_assigned"
    | "task_status"
    | "comment_added"
    | "comment_deleted"
    | "member_added"
    | "member_removed"
    | "member_role_updated";
  task?: string;
  taskTitle?: string;
  fromStatus?: "todo" | "in_progress" | "completed";
  toStatus?: "todo" | "in_progress" | "completed";
  targetUser?: string;
  targetUserName?: string;
  createdAt: string;
  updatedAt: string;
}

export const getProjectActivities = async (
  projectId: string,
): Promise<ActivityItem[]> => {
  const res = await api.get(`/activities/${projectId}`);
  return res.data;
};

export const getWorkspaceActivities = async (
  workspaceId: string,
  page = 1,
  limit = 10,
): Promise<{ activities: ActivityItem[]; pagination: PaginationMeta }> => {
  const res = await api.get(`/activities/workspace/${workspaceId}`, {
    params: { page, limit },
  });
  return res.data;
};
