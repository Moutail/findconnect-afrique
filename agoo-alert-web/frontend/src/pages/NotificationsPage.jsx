import { useState, useEffect } from 'react';
import { notificationAPI } from '../lib/api';
import { Bell, CheckCheck, Clock, ShieldCheck, FileText, MessageSquare, Building2, Info } from 'lucide-react';
import { timeAgo } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  verification_approved: { icon: ShieldCheck, bg: 'bg-primary-100', color: 'text-primary-700' },
  verification_rejected: { icon: ShieldCheck, bg: 'bg-red-100', color: 'text-red-700' },
  publication_approved: { icon: FileText, bg: 'bg-primary-100', color: 'text-primary-700' },
  publication_rejected: { icon: FileText, bg: 'bg-red-100', color: 'text-red-700' },
  chat_request: { icon: MessageSquare, bg: 'bg-violet-100', color: 'text-violet-700' },
  organization_approved: { icon: Building2, bg: 'bg-primary-100', color: 'text-primary-700' },
  organization_rejected: { icon: Building2, bg: 'bg-red-100', color: 'text-red-700' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await notificationAPI.list({ limit: 50 });
      setNotifications(data.notifications || []);
      const unread = (data.notifications || []).filter(n => !n.readAt).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id || n.id === id) ? { ...n, readAt: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.readAt);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(n => notificationAPI.markRead(n._id || n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      toast.success('Toutes les notifications marquées comme lues');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-700" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-accent-700 font-semibold">{unreadCount} non lue(s)</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-sm text-primary-700 font-semibold hover:text-primary-900 transition-colors"
            >
              <CheckCheck className="w-4 h-4" /> Tout marquer lu
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold">Aucune notification</p>
            <p className="text-gray-400 text-sm mt-1">Vous êtes à jour !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const typeConf = TYPE_CONFIG[notif.type] || { icon: Info, bg: 'bg-gray-100', color: 'text-gray-600' };
              const Icon = typeConf.icon;
              const id = notif._id || notif.id;
              const isRead = !!notif.readAt;
              return (
                <div
                  key={id}
                  className={`bg-white rounded-2xl border p-4 transition-all ${
                    isRead ? 'border-gray-100' : 'border-primary-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeConf.bg}`}>
                      <Icon className={`w-5 h-5 ${typeConf.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                          {notif.message || notif.title}
                        </p>
                        {!isRead && (
                          <span className="w-2.5 h-2.5 bg-accent-500 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      {notif.rejectionReason && (
                        <div className="mt-2 px-3 py-2 bg-red-50 rounded-xl text-xs text-red-700 border border-red-100">
                          <strong>Raison :</strong> {notif.rejectionReason}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" /> {timeAgo(notif.createdAt)}
                        </span>
                        {!isRead && (
                          <button
                            onClick={() => handleMarkRead(id)}
                            className="text-xs text-primary-700 font-semibold hover:text-primary-900 transition-colors"
                          >
                            Marquer lu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
