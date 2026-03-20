import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getTaskComments,
  type TaskComment,
} from "../../../services/taskService";
import {
  getPendingOfflineAddedCommentIdsByTask,
  getPendingOfflineActionCount,
  syncOfflineActions,
} from "../../../utils";

interface UseProjectOfflineSyncParams {
  projectId?: string;
  refetchTasks: () => Promise<unknown>;
  setCommentsByTask: React.Dispatch<
    React.SetStateAction<Record<string, TaskComment[]>>
  >;
  preloadedCommentTaskIdsRef: React.MutableRefObject<Set<string>>;
}

export function useProjectOfflineSync({
  projectId,
  refetchTasks,
  setCommentsByTask,
  preloadedCommentTaskIdsRef,
}: UseProjectOfflineSyncParams) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof window === "undefined" ? true : window.navigator.onLine,
  );
  const [isSyncingOfflineActions, setIsSyncingOfflineActions] = useState(false);
  const [pendingOfflineActions, setPendingOfflineActions] = useState(0);
  const [pendingOfflineCommentIdsByTask, setPendingOfflineCommentIdsByTask] =
    useState<Record<string, string[]>>({});

  const refreshPendingOfflineActions = useCallback(() => {
    if (!projectId) {
      setPendingOfflineActions(0);
      setPendingOfflineCommentIdsByTask({});
      return;
    }

    setPendingOfflineActions(getPendingOfflineActionCount(projectId));
    setPendingOfflineCommentIdsByTask(
      getPendingOfflineAddedCommentIdsByTask(projectId),
    );
  }, [projectId]);

  useEffect(() => {
    refreshPendingOfflineActions();
  }, [refreshPendingOfflineActions]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
    };

    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const runOfflineSync = useCallback(async () => {
    if (!projectId || !isOnline || isSyncingOfflineActions) return;

    const queuedCount = getPendingOfflineActionCount(projectId);
    if (queuedCount === 0) return;

    const pendingCommentIdsByTaskBeforeSync =
      getPendingOfflineAddedCommentIdsByTask(projectId);
    const commentTaskIdsToRefresh = Object.keys(
      pendingCommentIdsByTaskBeforeSync,
    );

    setIsSyncingOfflineActions(true);

    try {
      const result = await syncOfflineActions(projectId);

      if (result.syncedCount > 0) {
        await refetchTasks();

        if (commentTaskIdsToRefresh.length > 0) {
          const refreshedComments = await Promise.all(
            commentTaskIdsToRefresh.map(async (taskId) => ({
              taskId,
              comments: await getTaskComments(taskId),
            })),
          );

          setCommentsByTask((prev) => {
            const next = { ...prev };
            refreshedComments.forEach(({ taskId, comments }) => {
              next[taskId] = comments;
              preloadedCommentTaskIdsRef.current.add(taskId);
            });
            return next;
          });
        }
      }

      refreshPendingOfflineActions();

      if (result.syncedCount > 0) {
        toast.success(`Synced ${result.syncedCount} offline change(s)`);
      }

      if (result.conflictCount > 0) {
        toast(
          `${result.conflictCount} change(s) resolved with last-write-wins`,
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncingOfflineActions(false);
      refreshPendingOfflineActions();
    }
  }, [
    isOnline,
    isSyncingOfflineActions,
    preloadedCommentTaskIdsRef,
    projectId,
    refetchTasks,
    refreshPendingOfflineActions,
    setCommentsByTask,
  ]);

  useEffect(() => {
    if (!isOnline) return;
    void runOfflineSync();
  }, [isOnline, runOfflineSync]);

  return {
    isOnline,
    isSyncingOfflineActions,
    pendingOfflineActions,
    pendingOfflineCommentIdsByTask,
    refreshPendingOfflineActions,
  };
}
