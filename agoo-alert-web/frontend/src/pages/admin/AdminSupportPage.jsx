import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { HelpCircle, Phone, User, Clock, CheckCircle } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const REQUEST_TYPE_LABELS = {
  publication_help: 'Aide publication',
  account_help: 'Aide compte',
  history_request: 'Historique',
  other: 'Autre',
};

export default function AdminSupportPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminAPI.getSupportRequests(params);
      setRequests(data.supportRequests);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await adminAPI.updateSupportRequest(id, { status });
      toast.success('Demande mise à jour');
      loadRequests();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const statusBadge = {
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-500',
  };

  const statusLabels = {
    pending: 'En attente',
    in_progress: 'En cours',
    resolved: 'Résolu',
    closed: 'Fermé',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <HelpCircle className="w-6 h-6" /> Demandes de support
      </h1>

      <div className="flex gap-2 mb-6">
        {['pending', 'in_progress', 'resolved', 'closed', ''].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}>
            {s ? statusLabels[s] : 'Toutes'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune demande de support</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req._id || req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{req.contactName}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {req.contactPhone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-gray-100 text-gray-700 text-xs">
                    {REQUEST_TYPE_LABELS[req.requestType]}
                  </span>
                  <span className={`badge text-xs ${statusBadge[req.status]}`}>
                    {statusLabels[req.status]}
                  </span>
                </div>
              </div>

              {req.description && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-3">{req.description}</p>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatDateTime(req.createdAt)}
                </p>
                <div className="flex gap-2">
                  {req.status === 'pending' && (
                    <button onClick={() => handleUpdateStatus(req._id || req.id, 'in_progress')}
                      className="text-xs text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg font-medium">
                      Prendre en charge
                    </button>
                  )}
                  {req.status === 'in_progress' && (
                    <button onClick={() => handleUpdateStatus(req._id || req.id, 'resolved')}
                      className="text-xs text-green-600 hover:bg-green-50 px-3 py-1 rounded-lg font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Résolu
                    </button>
                  )}
                  {(req.status === 'pending' || req.status === 'in_progress') && (
                    <button onClick={() => handleUpdateStatus(req._id || req.id, 'closed')}
                      className="text-xs text-gray-500 hover:bg-gray-50 px-3 py-1 rounded-lg font-medium">
                      Fermer
                    </button>
                  )}
                </div>
              </div>

              {req.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Notes: {req.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
