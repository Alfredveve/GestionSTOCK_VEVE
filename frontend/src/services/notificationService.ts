import api from './api';

export interface Notification {
  id: number;
  recipient: number;
  title: string;
  message: string;
  notification_type: 'info' | 'warning' | 'success' | 'error';
  link: string;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const response = await api.get('/notifications/');
    // API returns paginated response: {count, next, previous, results}
    return response.data.results || response.data || [];
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread_count/');
    return response.data.count;
  },

  async markAsRead(id: number): Promise<void> {
    await api.post(`/notifications/${id}/mark_read/`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/mark_all_read/');
  },
};
