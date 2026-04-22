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
  async getNotifications(limit?: number): Promise<Notification[]> {
    const url = limit ? `/notifications/?page_size=${limit}` : '/notifications/';
    const response = await api.get(url);
    
    // DRF returns results in .results when paginated, or as a direct array otherwise
    if (response.data && response.data.results && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  },

  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get('/notifications/unread_count/');
      return typeof response.data.count === 'number' ? response.data.count : 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  async markAsRead(id: number): Promise<void> {
    await api.post(`/notifications/${id}/mark_read/`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/mark_all_read/');
  },
};
