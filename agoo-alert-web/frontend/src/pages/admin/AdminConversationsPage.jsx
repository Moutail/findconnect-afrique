import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { MessageSquare, User, Eye, ChevronDown, ChevronUp, Image, Mic, Video } from 'lucide-react';
import { timeAgo } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data } = await adminAPI.getConversations({ limit: 50 });
      setConversations(data.conversations);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMessages = async (convId) => {
    if (expandedId === convId) {
      setExpandedId(null);
      setMessages([]);
      return;
    }
    setExpandedId(convId);
    setMessagesLoading(true);
    try {
      const { data } = await adminAPI.getConversationMessages(convId, { limit: 100 });
      setMessages(data.messages);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const typeIcon = {
    image: <Image className="w-3 h-3" />,
    audio: <Mic className="w-3 h-3" />,
    video: <Video className="w-3 h-3" />,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6" /> Conversations ({conversations.length})
      </h1>

      {conversations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune conversation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => (
            <div key={conv._id || conv.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <button
                onClick={() => toggleMessages(conv._id || conv.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex -space-x-2 flex-shrink-0">
                  {conv.participants?.map((p, i) => (
                    <div key={i} className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center border-2 border-white">
                      <span className="text-xs font-bold text-primary-600">{p.firstName?.[0]}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">
                    {conv.participants?.map(p => `${p.firstName} ${p.lastName}`).join(' ↔ ')}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {conv.lastMessage?.content || 'Pas de message'}
                  </p>
                  {conv.publicationId && (
                    <p className="text-xs text-primary-500">Re: {conv.publicationId.title}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">{conv.lastMessage?.sentAt ? timeAgo(conv.lastMessage.sentAt) : ''}</span>
                {expandedId === (conv._id || conv.id) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {/* Expanded messages */}
              {expandedId === (conv._id || conv.id) && (
                <div className="border-t border-gray-200 p-4 max-h-96 overflow-y-auto bg-gray-50">
                  {messagesLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center">Aucun message</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map(msg => (
                        <div key={msg._id || msg.id} className="flex gap-2">
                          <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary-600">
                              {msg.senderId?.firstName?.[0] || '?'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-700">
                                {msg.senderId?.firstName} {msg.senderId?.lastName}
                              </span>
                              <span className="text-xs text-gray-400">{timeAgo(msg.createdAt)}</span>
                              {msg.type !== 'text' && (
                                <span className="flex items-center gap-0.5 text-xs text-blue-500">
                                  {typeIcon[msg.type]} {msg.type}
                                </span>
                              )}
                            </div>

                            {msg.type === 'text' && (
                              <p className="text-sm text-gray-600 mt-0.5">{msg.content}</p>
                            )}

                            {msg.type === 'image' && msg.attachment && (
                              <img src={msg.attachment.thumbnail || msg.attachment.url} alt="" className="mt-1 max-w-[200px] rounded-lg cursor-pointer" onClick={() => window.open(msg.attachment.url, '_blank')} />
                            )}

                            {msg.type === 'audio' && msg.attachment && (
                              <audio controls className="mt-1 max-w-full" style={{ height: 32 }}>
                                <source src={msg.attachment.url} type={msg.attachment.type} />
                              </audio>
                            )}

                            {msg.type === 'video' && msg.attachment && (
                              <video controls className="mt-1 max-w-[250px] rounded-lg" style={{ maxHeight: 180 }}>
                                <source src={msg.attachment.url} type={msg.attachment.type} />
                              </video>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
