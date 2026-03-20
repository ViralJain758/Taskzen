import type {
  ActivityItem,
  PaginationMeta as ActivityPaginationMeta,
} from "../../services/activityService";
import type { PaginationMeta as MembersPaginationMeta } from "../../services/workspaceService";

export interface Project {
  _id: string;
  name: string;
  description?: string;
}

export interface WorkspaceMember {
  user: {
    _id: string;
    name: string;
    email: string;
  };
  role: "owner" | "admin" | "member";
}

export interface MembersQueryData {
  members: WorkspaceMember[];
  canManageMembers: boolean;
  canManageRoles: boolean;
  pagination: MembersPaginationMeta;
}

export interface ActivitiesQueryData {
  activities: ActivityItem[];
  pagination: ActivityPaginationMeta;
}
