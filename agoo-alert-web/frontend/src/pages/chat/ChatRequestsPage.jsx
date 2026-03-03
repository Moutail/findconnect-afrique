import { useState, useEffect } from 'react';
import { chatAPI } from '../../lib/api';
import { Bell, Check, X, MessageSquare, User, Clock } from 'lucide-react';
import { timeAgo } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ChatRequestsPage() {
  const [tab, setTab] = useState('received');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    loadRequests();
  }, [tab]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = tab === 'received'
        ? await chatAPI.getReceivedRequests({ limit: 50 })
        : await chatAPI.getSentRequests({ limit: 50 });
      setRequests(data.requests);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await chatAPI.acceptRequest(id, { responseMessage });
      toast.success('Invitation acceptée');
      setSelectedId(null);
      setResponseMessage('');
      loadRequests();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleReject = async (id) => {
    try {
      await chatAPI.rejectRequest(id, { responseMessage });
      toast.success('Invitation rejetée');
      setSelectedId(null);
      setResponseMessage('');
      loadRequests();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Invitations de discussion</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('received')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'received' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Reçues
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'sent' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Envoyées
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500">Aucune invitation</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const person = tab === 'received' ? req.requesterId : req.targetUserId;
            const statusColors = {
              pending: 'badge-warning',
              accepted: 'badge-success',
              rejected: 'badge-danger',
            };

            return (
              <div key={req._id || req.id} className="card">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">
                        {person?.firstName} {person?.lastName}
                      </p>
                      <span className={`${statusColors[req.status]} text-xs`}>
                        {req.status === 'pending' ? 'En attente' : req.status === 'accepted' ? 'Acceptée' : 'Rejetée'}
                      </span>
                    </div>

                    {req.publicationId && (
                      <p className="text-sm text-primary-600 mt-1">
                        Re: {req.publicationId.title}
                      </p>
                    )}

                    {req.message && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-3">
                        "{req.message}"
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeAgo(req.createdAt)}
                    </p>

                    {/* Actions for received pending requests */}
                    {tab === 'received' && req.status === 'pending' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {selectedId === (req._id || req.id) ? (
                          <div className="space-y-2">
                            <textarea
                              className="input-field text-sm"
                              rows="2"
                              placeholder="Message de réponse (optionnel)"
                              value={responseMessage}
                              onChange={(e) => setResponseMessage(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <button onClick={() => handleAccept(req._id || req.id)} className="btn-primary text-sm flex items-center gap-1">
                                <Check className="w-4 h-4" /> Accepter
                              </button>
                              <button onClick={() => handleReject(req._id || req.id)} className="btn-danger text-sm flex items-center gap-1">
                                <X className="w-4 h-4" /> Rejeter
                              </button>
                              <button onClick={() => setSelectedId(null)} className="btn-secondary text-sm">Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setSelectedId(req._id || req.id)} className="text-sm text-primary-600 font-medium hover:text-primary-700">
                            Répondre à l'invitation →
                          </button>
                        )}
                      </div>
                    )}

                    {req.status === 'accepted' && req.conversationId && (
                      <a href={`/conversations/${req.conversationId}`} className="mt-2 inline-flex items-center gap-1 text-sm text-primary-600 font-medium">
                        <MessageSquare className="w-4 h-4" /> Ouvrir la conversation
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
