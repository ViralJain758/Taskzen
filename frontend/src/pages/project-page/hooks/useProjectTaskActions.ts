import {
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  addTaskComment,
  deleteTask,
  deleteTaskComment,
  updateTaskAssignee,
  updateTaskPriority,
  updateTaskStatus,
  type ProjectAssignee,
  type TaskComment,
} from "../../../services/taskService";
import { enqueueCommentAction, enqueueTaskAction } from "../../../utils";
import type {
  PendingTaskDelete,
  Task,
  TaskPriority,
  TaskStatus,
} from "../types";

interface CurrentUser {
  _id?: string;
  name?: string;
  email?: string;
}

interface UseProjectTaskActionsParams {
  tasks: Task[];
  assignees: ProjectAssignee[];
  commentsByTask: Record<string, TaskComment[]>;
  setCommentsByTask: Dispatch<SetStateAction<Record<string, TaskComment[]>>>;
  projectId?: string;
  isOnline: boolean;
  currentUser: CurrentUser | null;
  currentUserId: string | null;
  refreshPendingOfflineActions: () => void;
  setTasksCache: (updater: (previous: Task[]) => Task[]) => void;
  queryClient: QueryClient;
  tasksQueryKey: readonly unknown[];
  preloadedCommentTaskIdsRef: MutableRefObject<Set<string>>;
}

export function useProjectTaskActions({
  tasks,
  assignees,
  commentsByTask,
  setCommentsByTask,
  projectId,
  isOnline,
  currentUser,
  currentUserId,
  refreshPendingOfflineActions,
  setTasksCache,
  queryClient,
  tasksQueryKey,
  preloadedCommentTaskIdsRef,
}: UseProjectTaskActionsParams) {
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<PendingTaskDelete | null>(
    null,
  );
  const [expandedComments, setExpandedComments] = useState<
    Record<string, boolean>
  >({});
  const [loadingCommentsTaskId, setLoadingCommentsTaskId] = useState<
    string | null
  >(null);
  const [addingCommentTaskId, setAddingCommentTaskId] = useState<string | null>(
    null,
  );
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );

  const moveTask = async (taskId: string, status: TaskStatus) => {
    const previous = tasks;
    const currentTask = tasks.find((t) => t._id === taskId);
    if (!currentTask || currentTask.status === status) return;

    setUpdatingTaskId(taskId);

    setTasksCache((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status } : t)),
    );

    if (!projectId) {
      setUpdatingTaskId(null);
      return;
    }

    if (!isOnline) {
      enqueueTaskAction({
        projectId,
        type: "UPDATE_TASK_STATUS",
        taskId,
        payload: { status },
      });
      setUpdatingTaskId(null);
      refreshPendingOfflineActions();
      toast("Saved offline. Status change will sync.");
      return;
    }

    try {
      const res = await updateTaskStatus(taskId, status);

      if (res.task) {
        setTasksCache((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, ...res.task } : t)),
        );
      }
    } catch (error) {
      console.error(error);

      const isNetworkLikeError =
        typeof error === "object" && error !== null && !("response" in error);

      if (isNetworkLikeError && projectId) {
        enqueueTaskAction({
          projectId,
          type: "UPDATE_TASK_STATUS",
          taskId,
          payload: { status },
        });
        refreshPendingOfflineActions();
        toast("Saved offline. Status change will sync.");
      } else {
        queryClient.setQueryData(tasksQueryKey, previous);
        toast.error("Unable to update task status");
      }
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const changeTaskAssignee = async (
    taskId: string,
    nextAssigneeId: string | null,
  ) => {
    const previous = tasks;
    const selectedAssignee = nextAssigneeId
      ? assignees.find((a) => a._id === nextAssigneeId)
      : undefined;

    setUpdatingTaskId(taskId);
    setTasksCache((prev) =>
      prev.map((task) =>
        task._id === taskId
          ? {
              ...task,
              assignee: selectedAssignee
                ? {
                    _id: selectedAssignee._id,
                    name: selectedAssignee.name,
                    email: selectedAssignee.email,
                  }
                : undefined,
            }
          : task,
      ),
    );

    if (!projectId) {
      setUpdatingTaskId(null);
      return;
    }

    if (!isOnline) {
      enqueueTaskAction({
        projectId,
        type: "UPDATE_TASK_ASSIGNEE",
        taskId,
        payload: { assignee: nextAssigneeId },
      });
      setUpdatingTaskId(null);
      refreshPendingOfflineActions();
      toast("Saved offline. Assignee update will sync.");
      return;
    }

    try {
      const res = await updateTaskAssignee(taskId, nextAssigneeId);

      if (res.task) {
        setTasksCache((prev) =>
          prev.map((task) =>
            task._id === taskId ? { ...task, ...res.task } : task,
          ),
        );
      }
    } catch (error) {
      console.error(error);
      queryClient.setQueryData(tasksQueryKey, previous);
      toast.error("Unable to update assignee");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const changeTaskPriority = async (
    taskId: string,
    nextPriority: TaskPriority,
  ) => {
    const previous = tasks;
    const task = tasks.find((item) => item._id === taskId);
    if (!task || task.priority === nextPriority) return;

    setUpdatingTaskId(taskId);
    setTasksCache((prev) =>
      prev.map((item) =>
        item._id === taskId ? { ...item, priority: nextPriority } : item,
      ),
    );

    if (!projectId) {
      setUpdatingTaskId(null);
      return;
    }

    if (!isOnline) {
      enqueueTaskAction({
        projectId,
        type: "UPDATE_TASK_PRIORITY",
        taskId,
        payload: { priority: nextPriority },
      });
      setUpdatingTaskId(null);
      refreshPendingOfflineActions();
      toast("Saved offline. Priority update will sync.");
      return;
    }

    try {
      const res = await updateTaskPriority(taskId, nextPriority);

      if (res.task) {
        setTasksCache((prev) =>
          prev.map((item) =>
            item._id === taskId ? { ...item, ...res.task } : item,
          ),
        );
      }
    } catch (error) {
      console.error(error);
      queryClient.setQueryData(tasksQueryKey, previous);
      toast.error("Unable to update priority");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const requestDeleteTask = (taskId: string) => {
    const task = tasks.find((item) => item._id === taskId);
    if (!task) return;
    setTaskToDelete({ id: task._id, title: task.title });
  };

  const fetchCommentsForTask = async (taskId: string) => {
    try {
      setLoadingCommentsTaskId(taskId);
      const { getTaskComments } = await import("../../../services/taskService");
      const comments = await getTaskComments(taskId);
      setCommentsByTask((prev) => ({
        ...prev,
        [taskId]: comments,
      }));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load comments");
    } finally {
      setLoadingCommentsTaskId(null);
    }
  };

  const toggleComments = (taskId: string) => {
    setExpandedComments((prev) => {
      const nextOpen = !prev[taskId];

      if (nextOpen && !prev[taskId] && !commentsByTask[taskId]) {
        void fetchCommentsForTask(taskId);
      }

      return {
        ...prev,
        [taskId]: nextOpen,
      };
    });
  };

  const handleAddComment = async (taskId: string, content: string) => {
    if (!content.trim()) return;
    const trimmedContent = content.trim();

    if (!projectId) return;

    if (!isOnline) {
      const tempCommentId = `temp-comment-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const optimisticComment: TaskComment = {
        _id: tempCommentId,
        content: trimmedContent,
        task: taskId,
        author: {
          _id: currentUserId || "offline-user",
          name: currentUser?.name || "You",
          email: currentUser?.email || "offline@local",
        },
        createdAt: new Date().toISOString(),
      };

      setCommentsByTask((prev) => {
        const existing = prev[taskId] || [];
        return {
          ...prev,
          [taskId]: [optimisticComment, ...existing],
        };
      });
      preloadedCommentTaskIdsRef.current.add(taskId);

      enqueueCommentAction({
        projectId,
        type: "ADD_COMMENT",
        taskId,
        commentId: tempCommentId,
        payload: { content: trimmedContent },
      });

      refreshPendingOfflineActions();
      toast("Saved offline. Comment will sync.");
      return;
    }

    try {
      setAddingCommentTaskId(taskId);
      const res = await addTaskComment(taskId, trimmedContent);
      if (res.comment) {
        setCommentsByTask((prev) => {
          const existing = prev[taskId] || [];
          const alreadyExists = existing.some(
            (comment) => comment._id === res.comment._id,
          );

          if (alreadyExists) {
            return prev;
          }

          return {
            ...prev,
            [taskId]: [res.comment, ...existing],
          };
        });
      }
      toast.success("Comment added");
    } catch (error) {
      console.error(error);
      toast.error("Unable to add comment");
    } finally {
      setAddingCommentTaskId(null);
    }
  };

  const handleDeleteComment = async (taskId: string, commentId: string) => {
    if (!projectId) return;

    try {
      setDeletingCommentId(commentId);

      if (!isOnline) {
        setCommentsByTask((prev) => ({
          ...prev,
          [taskId]: (prev[taskId] || []).filter(
            (comment) => comment._id !== commentId,
          ),
        }));

        enqueueCommentAction({
          projectId,
          type: "DELETE_COMMENT",
          taskId,
          commentId,
          payload: {},
        });

        refreshPendingOfflineActions();
        toast("Saved offline. Comment deletion will sync.");
        return;
      }

      await deleteTaskComment(commentId);
      setCommentsByTask((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter(
          (comment) => comment._id !== commentId,
        ),
      }));
      toast.success("Comment deleted");
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    const previous = tasks;
    setIsDeletingTask(true);
    setUpdatingTaskId(taskToDelete.id);
    setTasksCache((prev) =>
      prev.filter((task) => task._id !== taskToDelete.id),
    );

    if (!projectId) {
      setIsDeletingTask(false);
      setUpdatingTaskId(null);
      return;
    }

    if (!isOnline) {
      enqueueTaskAction({
        projectId,
        type: "DELETE_TASK",
        taskId: taskToDelete.id,
        payload: {},
      });
      setCommentsByTask((prev) => {
        const next = { ...prev };
        delete next[taskToDelete.id];
        return next;
      });
      preloadedCommentTaskIdsRef.current.delete(taskToDelete.id);
      setTaskToDelete(null);
      setIsDeletingTask(false);
      setUpdatingTaskId(null);
      refreshPendingOfflineActions();
      toast("Saved offline. Task deletion will sync.");
      return;
    }

    try {
      await deleteTask(taskToDelete.id);
      setCommentsByTask((prev) => {
        const next = { ...prev };
        delete next[taskToDelete.id];
        return next;
      });
      preloadedCommentTaskIdsRef.current.delete(taskToDelete.id);
      toast.success("Task deleted");
      setTaskToDelete(null);
    } catch (error) {
      console.error(error);
      queryClient.setQueryData(tasksQueryKey, previous);
      toast.error("Unable to delete task");
    } finally {
      setIsDeletingTask(false);
      setUpdatingTaskId(null);
    }
  };

  return {
    updatingTaskId,
    isDeletingTask,
    taskToDelete,
    setTaskToDelete,
    expandedComments,
    loadingCommentsTaskId,
    addingCommentTaskId,
    deletingCommentId,
    moveTask,
    changeTaskAssignee,
    changeTaskPriority,
    requestDeleteTask,
    toggleComments,
    handleAddComment,
    handleDeleteComment,
    handleDeleteTask,
  };
}
