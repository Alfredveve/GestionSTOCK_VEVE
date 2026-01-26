import { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { notificationService, type Notification } from '@/services/notificationService';
import { useNavigate } from 'react-router-dom';

// Safe date formatting function
function formatNotificationDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString || 'Date inconnue';
  }
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await notificationService.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
      
      const count = await notificationService.getUnreadCount();
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Impossible de charger les notifications');
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await notificationService.markAsRead(notification.id);
      if (notification.link) {
        navigate(notification.link);
      }
      await fetchNotifications();
      setIsOpen(false);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const colors = {
      info: 'text-blue-500',
      warning: 'text-orange-500',
      success: 'text-green-500',
      error: 'text-red-500',
    };
    return colors[type as keyof typeof colors] || 'text-gray-500';
  };

  return (
    <DropdownMenuPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          title="Notifications"
          aria-label="Voir les notifications"
          className="relative p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className="w-96 bg-card border border-border rounded-xl shadow-xl z-50 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 max-h-[500px] overflow-hidden flex flex-col"
          align="end"
          sideOffset={8}
        >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex flex-col">
                <h3 className="font-semibold text-lg">Notifications</h3>
                <button 
                  onClick={() => { navigate('/notifications'); setIsOpen(false); }}
                  className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider text-left"
                >
                  Voir tout le centre de messagerie
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="h-4 w-4" />
                  Tout lu
                </button>
              )}
            </div>

          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>Chargement...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">
                <p>{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleMarkAsRead(notification)}
                    className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                      !notification.is_read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${getNotificationIcon(notification.notification_type)}`}>
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{notification.title || 'Sans titre'}</p>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message || 'Pas de message'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatNotificationDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
