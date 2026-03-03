import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { conversationAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, User } from 'lucide-react';
import { timeAgo } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ConversationsPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data } = await conversationAPI.list();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500">Aucune conversation</h3>
          <p className="text-gray-400 mt-1">Vos conversations apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => {
            const other = conv.participants?.find(p => (p._id || p.id) !== user?.id);
            const unread = conv.unreadCount?.[user?.id] || 0;

            return (
              <Link
                key={conv._id || conv.id}
                to={`/conversations/${conv._id || conv.id}`}
                className="card flex items-center gap-4 hover:shadow-md transition-shadow !p-4"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {other?.photoURL ? (
                    <img src={other.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-primary-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 truncate">
                      {other ? `${other.firstName} ${other.lastName}` : 'Utilisateur'}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {conv.lastMessage?.sentAt ? timeAgo(conv.lastMessage.sentAt) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-gray-500 truncate">
                      {conv.lastMessage?.content || 'Démarrer la conversation'}
                    </p>
                    {unread > 0 && (
                      <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {unread}
                      </span>
                    )}
                  </div>
                  {conv.publicationId && (
                    <p className="text-xs text-primary-500 mt-1 truncate">
                      Re: {conv.publicationId.title || 'Publication'}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
