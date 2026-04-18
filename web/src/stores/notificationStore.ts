import { create } from 'zustand';
import { notificationAPI } from '../services/api';

interface Notification {
  id: number;
  type: string;
  content: string;
  related_id?: number;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (page?: number, unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (page = 1, unreadOnly = false) => {
    set({ isLoading: true });
    try {
      const response = await notificationAPI.getNotifications(page, unreadOnly);
      set({
        notifications: response.data.notifications,
        unreadCount: response.data.unread_count,
      });
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      set({ unreadCount: response.data.unread_count });
    } catch (error) {
      console.error('Fetch unread count error:', error);
    }
  },

  markAsRead: async (id: number) => {
    try {
      await notificationAPI.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationAPI.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  },

  deleteNotification: async (id: number) => {
    try {
      await notificationAPI.deleteNotification(id);
      set((state) => {
        const deleted = state.notifications.find((n) => n.id === id);
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: deleted && !deleted.is_read ? state.unreadCount - 1 : state.unreadCount,
        };
      });
    } catch (error) {
      console.error('Delete notification error:', error);
    }
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));