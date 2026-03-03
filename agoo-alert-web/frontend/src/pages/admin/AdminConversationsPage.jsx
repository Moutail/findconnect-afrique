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
      <div className="mb-7">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-700" />
          </div>
          Conversations
          <span className="ml-1 text-sm font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-xl">{conversations.length}</span>
        </h1>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucune conversation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => (
            <div key={conv._id || conv.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => toggleMessages(conv._id || conv.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-warm-50 transition-colors"
              >
                <div className="flex -space-x-2 flex-shrink-0">
                  {conv.participants?.map((p, i) => (
                    <div key={i} className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center border-2 border-white">
                      <span className="text-xs font-bold text-primary-700">{p.firstName?.[0]?.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">
                    {conv.participants?.map(p => `${p.firstName} ${p.lastName}`).join(' ↔ ')}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.lastMessage?.content || 'Pas de message'}
                  </p>
                  {conv.publicationId && (
                    <p className="text-xs text-primary-600 mt-0.5">Re : {conv.publicationId.title}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{conv.lastMessage?.sentAt ? timeAgo(conv.lastMessage.sentAt) : ''}</span>
                {expandedId === (conv._id || conv.id)
                  ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
              </button>

              {expandedId === (conv._id || conv.id) && (
                <div className="border-t border-gray-100 p-4 max-h-96 overflow-y-auto bg-warm-50">
                  {messagesLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Aucun message</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map(msg => (
                        <div key={msg._id || msg.id} className="flex gap-2">
                          <div className="w-7 h-7 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary-700">
                              {msg.senderId?.firstName?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-700">
                                {msg.senderId?.firstName} {msg.senderId?.lastName}
                              </span>
                              <span className="text-xs text-gray-400">{timeAgo(msg.createdAt)}</span>
                              {msg.type !== 'text' && (
                                <span className="flex items-center gap-0.5 text-xs text-accent-700 bg-accent-50 px-1.5 py-0.5 rounded-lg">
                                  {typeIcon[msg.type]} {msg.type}
                                </span>
                              )}
                            </div>
                            {msg.type === 'text' && (
                              <p className="text-sm text-gray-600 mt-0.5">{msg.content}</p>
                            )}
                            {msg.type === 'image' && msg.attachment && (
                              <img src={msg.attachment.thumbnail || msg.attachment.url} alt="" className="mt-1 max-w-[200px] rounded-xl cursor-pointer hover:opacity-90" onClick={() => window.open(msg.attachment.url, '_blank')} />
                            )}
                            {msg.type === 'audio' && msg.attachment && (
                              <audio controls className="mt-1 max-w-full" style={{ height: 32 }}>
                                <source src={msg.attachment.url} type={msg.attachment.type} />
                              </audio>
                            )}
                            {msg.type === 'video' && msg.attachment && (
                              <video controls className="mt-1 max-w-[250px] rounded-xl" style={{ maxHeight: 180 }}>
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
