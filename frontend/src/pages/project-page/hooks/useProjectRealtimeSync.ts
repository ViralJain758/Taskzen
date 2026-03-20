import { useCallback, useEffect, useRef, useState } from "react";
import socket, {
  joinProjectRoom,
  leaveProjectRoom,
} from "../../../sockets/socket";
import type { TaskComment } from "../../../services/taskService";
import type {
  CommentCreatedEvent,
  CommentDeletedEvent,
  Task,
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskUpdatedEvent,
} from "../types";

interface UseProjectRealtimeSyncParams {
  projectId?: string;
  setTasksCache: (updater: (previous: Task[]) => Task[]) => void;
  setCommentsByTask: React.Dispatch<
    React.SetStateAction<Record<string, TaskComment[]>>
  >;
  preloadedCommentTaskIdsRef: React.MutableRefObject<Set<string>>;
  isLatencyToolsEnabled: boolean;
}

export function useProjectRealtimeSync({
  projectId,
  setTasksCache,
  setCommentsByTask,
  preloadedCommentTaskIdsRef,
  isLatencyToolsEnabled,
}: UseProjectRealtimeSyncParams) {
  const [latency, setLatency] = useState<number | null>(null);
  const [latencySource, setLatencySource] = useState<"socket" | "http" | null>(
    null,
  );
  const [latencyStatus, setLatencyStatus] = useState<
    "idle" | "testing" | "success" | "timeout" | "disconnected"
  >("idle");
  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const latencyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const runHttpLatencyFallback = useCallback(async () => {
    try {
      const apiBase =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const pingUrl = apiBase.replace(/\/api\/?$/, "/");
      const start = performance.now();
      await fetch(pingUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      return Math.round(performance.now() - start);
    } catch {
      return null;
    }
  }, []);

  const testLatency = useCallback(async () => {
    setIsTestingLatency(true);
    setLatencyStatus("testing");

    const applySuccess = (value: number, source: "socket" | "http") => {
      setLatency(value);
      setLatencySource(source);
      setLatencyStatus("success");

      if (latencyTimeoutRef.current) {
        clearTimeout(latencyTimeoutRef.current);
      }

      latencyTimeoutRef.current = setTimeout(() => {
        setLatency(null);
        setLatencySource(null);
      }, 3000);
    };

    const fallbackLatency = await runHttpLatencyFallback();

    if (!socket.connected) {
      if (fallbackLatency !== null) {
        applySuccess(fallbackLatency, "http");
      } else {
        setLatency(null);
        setLatencySource(null);
        setLatencyStatus("disconnected");
      }
      setIsTestingLatency(false);
      return;
    }

    const start = Date.now();

    await new Promise<void>((resolve) => {
      let settled = false;

      const finalize = (
        value: number | null,
        source: "socket" | "http" | null,
      ) => {
        if (settled) return;
        settled = true;

        if (value !== null && source) {
          applySuccess(value, source);
        } else {
          setLatency(null);
          setLatencySource(null);
          setLatencyStatus("timeout");
        }

        setIsTestingLatency(false);
        resolve();
      };

      const onResponseFallback = (startTimeFromEvent: number) => {
        clearTimeout(timeout);
        socket.off("latency:response", onResponseFallback);
        finalize(Date.now() - startTimeFromEvent, "socket");
      };

      const timeout = setTimeout(async () => {
        socket.off("latency:response", onResponseFallback);
        const httpLatency = await runHttpLatencyFallback();
        if (httpLatency !== null) {
          finalize(httpLatency, "http");
          return;
        }
        finalize(null, null);
      }, 5000);

      socket.on("latency:response", onResponseFallback);

      socket.emit(
        "latency:test",
        start,
        (payload?: { startTime?: number; serverTime?: number }) => {
          if (settled) return;
          clearTimeout(timeout);
          socket.off("latency:response", onResponseFallback);

          const ackStartTime = payload?.startTime;
          if (typeof ackStartTime === "number") {
            finalize(Date.now() - ackStartTime, "socket");
            return;
          }

          finalize(Date.now() - start, "socket");
        },
      );
    });
  }, [runHttpLatencyFallback]);

  useEffect(() => {
    if (!projectId) return;

    const joinCurrentProject = () => {
      joinProjectRoom(projectId);
    };

    if (socket.connected) {
      joinCurrentProject();
      if (isLatencyToolsEnabled) {
        void testLatency();
      }
    }

    const handleConnect = () => {
      joinCurrentProject();
      if (isLatencyToolsEnabled) {
        void testLatency();
      }
    };

    socket.on("connect", handleConnect);

    const handleTaskCreated = (event: TaskCreatedEvent) => {
      if (event.projectId !== projectId) return;
      const { task } = event;

      setTasksCache((prev) => {
        const exists = prev.find((t) => t._id === task._id);
        if (exists) return prev;

        const filtered = prev.filter((t) => !t._id.startsWith("temp-"));

        return [task, ...filtered];
      });
    };

    const handleTaskUpdated = (event: TaskUpdatedEvent) => {
      if (event.projectId !== projectId) return;
      const { task } = event;

      setTasksCache((prev) => {
        const exists = prev.some((t) => t._id === task._id);
        if (!exists) return [task, ...prev];
        return prev.map((t) => (t._id === task._id ? task : t));
      });
    };

    const handleTaskDeleted = (event: TaskDeletedEvent) => {
      if (event.projectId !== projectId) return;
      setTasksCache((prev) => prev.filter((t) => t._id !== event.taskId));
      setCommentsByTask((prev) => {
        const next = { ...prev };
        delete next[event.taskId];
        return next;
      });
      preloadedCommentTaskIdsRef.current.delete(event.taskId);
    };

    const handleCommentCreated = (event: CommentCreatedEvent) => {
      if (event.projectId !== projectId) return;
      setCommentsByTask((prev) => {
        if (!prev[event.taskId]) return prev;
        const exists = prev[event.taskId].some(
          (comment) => comment._id === event.comment._id,
        );
        if (exists) return prev;

        return {
          ...prev,
          [event.taskId]: [event.comment, ...prev[event.taskId]],
        };
      });
    };

    const handleCommentDeleted = (event: CommentDeletedEvent) => {
      if (event.projectId !== projectId) return;
      setCommentsByTask((prev) => {
        if (!prev[event.taskId]) return prev;
        return {
          ...prev,
          [event.taskId]: prev[event.taskId].filter(
            (comment) => comment._id !== event.commentId,
          ),
        };
      });
    };

    socket.on("project:task_created", handleTaskCreated);
    socket.on("project:task_updated", handleTaskUpdated);
    socket.on("project:task_deleted", handleTaskDeleted);
    socket.on("project:comment_created", handleCommentCreated);
    socket.on("project:comment_deleted", handleCommentDeleted);

    return () => {
      leaveProjectRoom(projectId);
      socket.off("connect", handleConnect);
      socket.off("project:task_created", handleTaskCreated);
      socket.off("project:task_updated", handleTaskUpdated);
      socket.off("project:task_deleted", handleTaskDeleted);
      socket.off("project:comment_created", handleCommentCreated);
      socket.off("project:comment_deleted", handleCommentDeleted);

      if (latencyTimeoutRef.current) {
        clearTimeout(latencyTimeoutRef.current);
      }
    };
  }, [
    isLatencyToolsEnabled,
    preloadedCommentTaskIdsRef,
    projectId,
    setCommentsByTask,
    setTasksCache,
    testLatency,
  ]);

  return {
    latency,
    latencySource,
    latencyStatus,
    isTestingLatency,
    testLatency,
  };
}
