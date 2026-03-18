import {
  addTaskComment,
  createTask,
  deleteTask,
  deleteTaskComment,
  updateTaskAssignee,
  updateTaskPriority,
  updateTaskStatus,
} from "../services/taskService";

type TaskStatus = "todo" | "in_progress" | "completed";
type TaskPriority = "low" | "medium" | "high";

type OfflineTaskAction =
  | {
      id: string;
      createdAt: number;
      projectId: string;
      type: "CREATE_TASK";
      taskId: string;
      payload: {
        title: string;
        description?: string;
        assignee?: string | null;
        priority?: TaskPriority;
      };
    }
  | {
      id: string;
      createdAt: number;
      projectId: string;
      type: "UPDATE_TASK_STATUS";
      taskId: string;
      payload: {
        status: TaskStatus;
      };
    }
  | {
      id: string;
      createdAt: number;
      projectId: string;
      type: "UPDATE_TASK_ASSIGNEE";
      taskId: string;
      payload: {
        assignee: string | null;
      };
    }
  | {
      id: string;
      createdAt: number;
      projectId: string;
      type: "UPDATE_TASK_PRIORITY";
      taskId: string;
      payload: {
        priority: TaskPriority;
      };
    }
  | {
      id: string;
      createdAt: number;
      projectId: string;
      type: "DELETE_TASK";
      taskId: string;
      payload: Record<string, never>;
    };

type OfflineCommentAction =
  | {
      id: string;
      createdAt: number;
      projectId: string;
      type: "ADD_COMMENT";
      taskId: string;
      commentId: string;
      payload: {
        content: string;
      };
    }
  | {
      id: string;
      createdAt: number;
      projectId: string;
      type: "DELETE_COMMENT";
      taskId: string;
      commentId: string;
      payload: Record<string, never>;
    };

type OfflineAction = OfflineTaskAction | OfflineCommentAction;

const STORAGE_KEY = "taskzen:offline-task-actions:v1";

const isTempTaskId = (taskId: string) => taskId.startsWith("temp-");
const isTempCommentId = (commentId: string) =>
  commentId.startsWith("temp-comment-");

const readQueue = (): OfflineAction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineAction[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const writeQueue = (actions: OfflineAction[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
};

const createActionId = () =>
  `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const compactQueue = (actions: OfflineAction[]): OfflineAction[] => {
  const sorted = [...actions].sort((a, b) => a.createdAt - b.createdAt);
  const compacted: OfflineAction[] = [];

  for (const action of sorted) {
    const existingForTaskIndexes = compacted
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) =>
          item.projectId === action.projectId && item.taskId === action.taskId,
      )
      .map(({ index }) => index);

    if (action.type === "DELETE_TASK") {
      if (existingForTaskIndexes.length > 0) {
        const existing = existingForTaskIndexes.map((idx) => compacted[idx]);
        const hasCreate = existing.some((item) => item.type === "CREATE_TASK");

        for (let i = existingForTaskIndexes.length - 1; i >= 0; i -= 1) {
          compacted.splice(existingForTaskIndexes[i], 1);
        }

        if (hasCreate && isTempTaskId(action.taskId)) {
          continue;
        }
      }

      compacted.push(action);
      continue;
    }

    if (action.type === "UPDATE_TASK_STATUS") {
      for (let i = compacted.length - 1; i >= 0; i -= 1) {
        const candidate = compacted[i];
        if (
          candidate.projectId === action.projectId &&
          candidate.taskId === action.taskId &&
          candidate.type === "UPDATE_TASK_STATUS"
        ) {
          compacted.splice(i, 1);
          break;
        }
      }

      compacted.push(action);
      continue;
    }

    if (action.type === "UPDATE_TASK_ASSIGNEE") {
      for (let i = compacted.length - 1; i >= 0; i -= 1) {
        const candidate = compacted[i];
        if (
          candidate.projectId === action.projectId &&
          candidate.taskId === action.taskId &&
          candidate.type === "UPDATE_TASK_ASSIGNEE"
        ) {
          compacted.splice(i, 1);
          break;
        }
      }

      compacted.push(action);
      continue;
    }

    if (action.type === "UPDATE_TASK_PRIORITY") {
      for (let i = compacted.length - 1; i >= 0; i -= 1) {
        const candidate = compacted[i];
        if (
          candidate.projectId === action.projectId &&
          candidate.taskId === action.taskId &&
          candidate.type === "UPDATE_TASK_PRIORITY"
        ) {
          compacted.splice(i, 1);
          break;
        }
      }

      compacted.push(action);
      continue;
    }

    if (action.type === "DELETE_COMMENT") {
      const matchingCommentIndexes = compacted
        .map((item, index) => ({ item, index }))
        .filter(
          ({ item }) =>
            item.projectId === action.projectId &&
            item.taskId === action.taskId &&
            "commentId" in item &&
            item.commentId === action.commentId,
        )
        .map(({ index }) => index);

      const existingForComment = matchingCommentIndexes.map(
        (idx) => compacted[idx],
      );
      const hasOfflineCreateForComment = existingForComment.some(
        (item) => item.type === "ADD_COMMENT",
      );

      for (let i = matchingCommentIndexes.length - 1; i >= 0; i -= 1) {
        compacted.splice(matchingCommentIndexes[i], 1);
      }

      if (hasOfflineCreateForComment && isTempCommentId(action.commentId)) {
        continue;
      }

      compacted.push(action);
      continue;
    }

    compacted.push(action);
  }

  return compacted;
};

export const getPendingOfflineActionCount = (projectId?: string): number => {
  const actions = readQueue();
  if (!projectId) return actions.length;
  return actions.filter((action) => action.projectId === projectId).length;
};

export const getPendingOfflineAddedCommentIdsByTask = (
  projectId: string,
): Record<string, string[]> => {
  const actions = readQueue();
  const pendingByTask: Record<string, string[]> = {};

  actions.forEach((action) => {
    if (action.projectId !== projectId || action.type !== "ADD_COMMENT") {
      return;
    }

    if (!pendingByTask[action.taskId]) {
      pendingByTask[action.taskId] = [];
    }

    pendingByTask[action.taskId].push(action.commentId);
  });

  return pendingByTask;
};

export const getPendingTaskActionCount = getPendingOfflineActionCount;

type TaskActionToQueue = Omit<OfflineTaskAction, "id" | "createdAt">;
type CommentActionToQueue = Omit<OfflineCommentAction, "id" | "createdAt">;

export const enqueueTaskAction = (action: TaskActionToQueue): void => {
  const nextAction = {
    ...action,
    id: createActionId(),
    createdAt: Date.now(),
  } as OfflineTaskAction;

  const compacted = compactQueue([...readQueue(), nextAction]);
  writeQueue(compacted);
};

export const enqueueCommentAction = (action: CommentActionToQueue): void => {
  const nextAction = {
    ...action,
    id: createActionId(),
    createdAt: Date.now(),
  } as OfflineCommentAction;

  const compacted = compactQueue([...readQueue(), nextAction]);
  writeQueue(compacted);
};

const getHttpStatus = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) return undefined;
  const maybeResponse = (error as { response?: { status?: number } }).response;
  return maybeResponse?.status;
};

interface SyncResult {
  syncedCount: number;
  remainingCount: number;
  conflictCount: number;
}

export const syncOfflineActions = async (
  projectId: string,
): Promise<SyncResult> => {
  const queue = readQueue();
  const toSync = queue
    .filter((action) => action.projectId === projectId)
    .sort((a, b) => a.createdAt - b.createdAt);
  const untouched = queue.filter((action) => action.projectId !== projectId);

  if (toSync.length === 0) {
    return { syncedCount: 0, remainingCount: 0, conflictCount: 0 };
  }

  const remaining: OfflineAction[] = [];
  const tempTaskIdMap = new Map<string, string>();
  const tempCommentIdMap = new Map<string, string>();
  let syncedCount = 0;
  let conflictCount = 0;

  for (let i = 0; i < toSync.length; i += 1) {
    const action = toSync[i];
    const resolvedTaskId = tempTaskIdMap.get(action.taskId) || action.taskId;

    try {
      if (action.type === "CREATE_TASK") {
        const response = await createTask(action.projectId, action.payload);
        if (response?.task?._id) {
          tempTaskIdMap.set(action.taskId, response.task._id);
        }
      }

      if (action.type === "UPDATE_TASK_STATUS") {
        if (isTempTaskId(resolvedTaskId) && !tempTaskIdMap.get(action.taskId)) {
          remaining.push(action, ...toSync.slice(i + 1));
          break;
        }

        await updateTaskStatus(resolvedTaskId, action.payload.status);
      }

      if (action.type === "UPDATE_TASK_ASSIGNEE") {
        if (isTempTaskId(resolvedTaskId) && !tempTaskIdMap.get(action.taskId)) {
          remaining.push(action, ...toSync.slice(i + 1));
          break;
        }

        await updateTaskAssignee(resolvedTaskId, action.payload.assignee);
      }

      if (action.type === "UPDATE_TASK_PRIORITY") {
        if (isTempTaskId(resolvedTaskId) && !tempTaskIdMap.get(action.taskId)) {
          remaining.push(action, ...toSync.slice(i + 1));
          break;
        }

        await updateTaskPriority(resolvedTaskId, action.payload.priority);
      }

      if (action.type === "DELETE_TASK") {
        if (isTempTaskId(resolvedTaskId) && !tempTaskIdMap.get(action.taskId)) {
          syncedCount += 1;
          continue;
        }

        await deleteTask(resolvedTaskId);
      }

      if (action.type === "ADD_COMMENT") {
        if (isTempTaskId(resolvedTaskId) && !tempTaskIdMap.get(action.taskId)) {
          remaining.push(action, ...toSync.slice(i + 1));
          break;
        }

        const response = await addTaskComment(
          resolvedTaskId,
          action.payload.content,
        );
        if (response?.comment?._id) {
          tempCommentIdMap.set(action.commentId, response.comment._id);
        }
      }

      if (action.type === "DELETE_COMMENT") {
        const resolvedCommentId =
          tempCommentIdMap.get(action.commentId) || action.commentId;

        if (
          isTempCommentId(resolvedCommentId) &&
          !tempCommentIdMap.get(action.commentId)
        ) {
          syncedCount += 1;
          continue;
        }

        await deleteTaskComment(resolvedCommentId);
      }

      syncedCount += 1;
    } catch (error) {
      const status = getHttpStatus(error);

      if (status === 404 || status === 409) {
        conflictCount += 1;
        syncedCount += 1;
        continue;
      }

      remaining.push(action, ...toSync.slice(i + 1));
      break;
    }
  }

  const nextQueue = compactQueue([...untouched, ...remaining]);
  writeQueue(nextQueue);

  return {
    syncedCount,
    remainingCount: remaining.length,
    conflictCount,
  };
};

export const syncTaskActions = syncOfflineActions;
