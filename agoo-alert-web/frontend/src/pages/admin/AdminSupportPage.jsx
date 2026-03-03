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
    pending: 'bg-accent-100 text-accent-700',
    in_progress: 'bg-primary-100 text-primary-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-500',
  };

  const statusLabels = {
    pending: 'En attente',
    in_progress: 'En cours',
    resolved: 'Résolu',
    closed: 'Fermé',
  };

  const tabs = [
    { key: 'pending', label: 'En attente' },
    { key: 'in_progress', label: 'En cours' },
    { key: 'resolved', label: 'Résolu' },
    { key: 'closed', label: 'Fermé' },
    { key: '', label: 'Toutes' },
  ];

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <div className="w-9 h-9 bg-accent-100 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-accent-700" />
          </div>
          Demandes de support
        </h1>
      </div>

      <div className="flex gap-1.5 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setStatusFilter(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === t.key ? 'bg-primary-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <HelpCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucune demande de support</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req._id || req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-accent-100 rounded-xl flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-accent-700" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{req.contactName}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {req.contactPhone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <span className="badge bg-gray-100 text-gray-600 text-xs">
                    {REQUEST_TYPE_LABELS[req.requestType]}
                  </span>
                  <span className={`badge text-xs ${statusBadge[req.status]}`}>
                    {statusLabels[req.status]}
                  </span>
                </div>
              </div>

              {req.description && (
                <p className="text-sm text-gray-600 bg-warm-50 rounded-xl p-3 mb-3 leading-relaxed">{req.description}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatDateTime(req.createdAt)}
                </p>
                <div className="flex gap-2">
                  {req.status === 'pending' && (
                    <button onClick={() => handleUpdateStatus(req._id || req.id, 'in_progress')}
                      className="text-xs text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded-xl font-semibold border border-primary-200 transition-colors">
                      Prendre en charge
                    </button>
                  )}
                  {req.status === 'in_progress' && (
                    <button onClick={() => handleUpdateStatus(req._id || req.id, 'resolved')}
                      className="text-xs text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-xl font-semibold border border-green-200 transition-colors flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Résolu
                    </button>
                  )}
                  {(req.status === 'pending' || req.status === 'in_progress') && (
                    <button onClick={() => handleUpdateStatus(req._id || req.id, 'closed')}
                      className="text-xs text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-xl font-semibold border border-gray-200 transition-colors">
                      Fermer
                    </button>
                  )}
                </div>
              </div>

              {req.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Notes : {req.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
