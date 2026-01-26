import { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Search, 
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  notificationService, 
  type Notification 
} from '@/services/notificationService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Impossible de charger les notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number, link?: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      if (link) {
        // Handle deep links that might be slightly broken (like /products/:id)
        if (link.startsWith('/products/')) {
           navigate('/products');
        } else {
           navigate(link);
        }
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || n.notification_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-rose-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2 bg-primary/5 text-primary border-primary/10 font-black uppercase text-[10px] tracking-widest px-3 py-1">Centre de Messagerie</Badge>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Notifications</h1>
          <p className="text-muted-foreground font-medium mt-1">Restez informé des activités importantes de votre stock et de vos ventes.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleMarkAllAsRead}
            disabled={!notifications.some(n => !n.is_read)}
            className="rounded-xl font-bold text-xs h-10 border-muted/20"
          >
            <CheckCheck className="mr-2 h-4 w-4 text-emerald-500" />
            Tout marquer comme lu
          </Button>
          <Button 
            variant="secondary" 
            onClick={fetchNotifications}
            className="rounded-xl font-bold text-xs h-10"
          >
            <Bell className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl bg-white/60 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher dans les notifications..." 
                className="pl-10 h-12 bg-muted/30 border-none rounded-2xl font-bold"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex bg-muted/20 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto">
              {['all', 'info', 'success', 'warning', 'error'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    filterType === type ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type === 'all' ? 'Toutes' : type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="py-20 text-center space-y-4">
                <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="text-sm font-bold text-muted-foreground animate-pulse">Chargement de vos notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-20 text-center bg-muted/10 rounded-4xl border border-dashed border-muted">
                <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground opacity-30" />
                </div>
                <h3 className="font-bold text-lg">Aucune notification trouvée</h3>
                <p className="text-sm text-muted-foreground">Vous êtes à jour ! Rien de nouveau pour le moment.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                <AnimatePresence>
                  {filteredNotifications.map((n) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                    >
                      <button
                        onClick={() => handleMarkAsRead(n.id, n.link)}
                        className={`w-full group relative overflow-hidden flex items-start gap-4 p-5 rounded-3xl transition-all border text-left ${
                          n.is_read 
                            ? "bg-white/40 border-muted h-24 items-center" 
                            : "bg-white border-primary/10 shadow-lg shadow-primary/5 ring-1 ring-primary/5"
                        } hover:border-primary/30 hover:shadow-xl`}
                      >
                        {!n.is_read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                        )}
                        
                        <div className={`shrink-0 p-3 rounded-2xl transition-colors ${
                          n.is_read ? "bg-muted" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white"
                        }`}>
                          {getIcon(n.notification_type)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                             <h4 className={`font-black tracking-tight truncate ${n.is_read ? "text-muted-foreground text-sm" : "text-foreground"}`}>
                               {n.title}
                             </h4>
                             <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                               {formatDate(n.created_at)}
                             </span>
                          </div>
                          <p className={`text-sm leading-relaxed line-clamp-2 ${n.is_read ? "text-muted-foreground/60" : "text-muted-foreground font-medium"}`}>
                            {n.message}
                          </p>
                        </div>

                        {n.link && (
                          <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <ChevronRight className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
