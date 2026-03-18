import api from "./api";

export interface Notification {
  _id: string;
  user: string;
  message: string;
  type: "task" | "comment" | "workspace";
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export const notificationService = {
  // Get all notifications for the current user
  getNotifications: async (): Promise<Notification[]> => {
    const response = await api.get("/notifications");
    return response.data;
  },

  // Mark a notification as read
  markAsRead: async (notificationId: string): Promise<void> => {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  // Mark multiple notifications as read
  markMultipleAsRead: async (notificationIds: string[]): Promise<void> => {
    await Promise.all(
      notificationIds.map((id) => notificationService.markAsRead(id)),
    );
  },
};
