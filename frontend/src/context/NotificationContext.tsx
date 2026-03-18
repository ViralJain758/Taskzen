import {
  createContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type Notification,
  notificationService,
} from "../services/notificationService";
import { AuthContext } from "./auth-context";
import { useContext } from "react";
import socket from "../sockets/socket";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const auth = useContext(AuthContext);

  // Fetch notifications from server
  const refreshNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  // Initialize WebSocket connection and fetch initial notifications
  useEffect(() => {
    if (!auth?.user || !auth?.token) return;

    // Fetch initial notifications without synchronously setting state in the effect body.
    void notificationService
      .getNotifications()
      .then((data) => {
        setNotifications(data);
      })
      .catch((error) => {
        console.error("Failed to fetch notifications:", error);
      });

    const handleConnect = () => {
      console.log("Connected to notification service");
      void refreshNotifications();
    };

    // Listen for real-time notifications
    const handleNotification = (data: { message: string }) => {
      console.log("Real-time notification received:", data);
      // Refresh notifications when a new one arrives
      void refreshNotifications();
    };

    const handleDisconnect = () => {
      console.log("Disconnected from notification service");
    };

    const handleConnectError = (error: Error) => {
      console.error("Notification socket connection error:", error.message);
    };

    socket.on("connect", handleConnect);
    socket.on("notification", handleNotification);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("notification", handleNotification);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, [auth?.user, auth?.token, refreshNotifications]);

  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n,
        ),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);
    if (unreadNotifications.length === 0) return;

    try {
      await notificationService.markMultipleAsRead(
        unreadNotifications.map((n) => n._id),
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
