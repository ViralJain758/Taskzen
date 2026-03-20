import { closestCorners, pointerWithin, rectIntersection } from "@dnd-kit/core";
import type { TaskComment } from "../../services/taskService";

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  assignee?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface TaskCreatedEvent {
  projectId: string;
  task: Task;
}

export interface TaskUpdatedEvent {
  projectId: string;
  task: Task;
}

export interface TaskDeletedEvent {
  projectId: string;
  taskId: string;
}

export interface CommentCreatedEvent {
  projectId: string;
  taskId: string;
  comment: TaskComment;
}

export interface CommentDeletedEvent {
  projectId: string;
  taskId: string;
  commentId: string;
}

export interface PendingTaskDelete {
  id: string;
  title: string;
}

export const columns: TaskStatus[] = ["todo", "in_progress", "completed"];

export const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
};

export const statusStyles: Record<TaskStatus, string> = {
  todo: "bg-orange-50/80 border-orange-200",
  in_progress: "bg-sky-50/80 border-sky-200",
  completed: "bg-emerald-50/80 border-emerald-200",
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const priorityBadgeStyles: Record<TaskPriority, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
};

export const kanbanCollisionDetection = (
  args: Parameters<typeof pointerWithin>[0],
) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    return pointerHits;
  }

  const intersectionHits = rectIntersection(args);
  if (intersectionHits.length > 0) {
    return intersectionHits;
  }

  return closestCorners(args);
};
