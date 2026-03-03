import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { ShieldCheck, Check, X, Eye, User } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [viewingId, setViewingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    loadRequests();
  }, [status]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getVerifications({ status, limit: 50 });
      setRequests(data.verificationRequests);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminAPI.processVerification(id, { status: 'approved' });
      toast.success('Vérification approuvée');
      loadRequests();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) return toast.error('Raison requise');
    try {
      await adminAPI.processVerification(id, { status: 'rejected', rejectionReason: rejectReason });
      toast.success('Vérification rejetée');
      setRejectingId(null);
      setRejectReason('');
      loadRequests();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const tabLabels = { pending: 'En attente', approved: 'Approuvées', rejected: 'Rejetées' };

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary-700" />
          </div>
          Vérifications d'identité
        </h1>
      </div>

      <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit">
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              status === s ? 'bg-primary-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            {tabLabels[s]}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <ShieldCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucune demande de vérification</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req._id || req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary-700" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    {req.userId?.firstName} {req.userId?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{req.userId?.phone}</p>
                  <p className="text-xs text-gray-400 mt-1">Soumis le {formatDate(req.createdAt)}</p>
                  <p className="text-sm text-gray-600 mt-1">Type: <span className="font-semibold">{req.documents?.idDocumentType}</span></p>
                </div>
              </div>

              {/* Documents */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Photo du visage</p>
                  {req.documents?.facePhoto ? (
                    <img src={req.documents.facePhoto} alt="Face" className="w-full h-40 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(req.documents.facePhoto, '_blank')} />
                  ) : (
                    <div className="w-full h-40 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-sm border border-gray-100">Non disponible</div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Pièce d'identité</p>
                  {req.documents?.idDocument ? (
                    <img src={req.documents.idDocument} alt="ID" className="w-full h-40 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(req.documents.idDocument, '_blank')} />
                  ) : (
                    <div className="w-full h-40 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-sm border border-gray-100">Non disponible</div>
                  )}
                </div>
              </div>

              {/* Reject form */}
              {rejectingId === (req._id || req.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <textarea className="input-field text-sm" rows="2" placeholder="Raison du rejet..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => handleReject(req._id || req.id)} className="btn-danger text-sm">Confirmer</button>
                    <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="btn-secondary text-sm">Annuler</button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {status === 'pending' && rejectingId !== (req._id || req.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                  <button onClick={() => handleApprove(req._id || req.id)} className="flex items-center gap-1 text-sm text-primary-700 hover:bg-primary-50 px-4 py-2 rounded-xl font-semibold transition-colors border border-primary-200">
                    <Check className="w-4 h-4" /> Approuver
                  </button>
                  <button onClick={() => setRejectingId(req._id || req.id)} className="flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl font-semibold transition-colors border border-red-200">
                    <X className="w-4 h-4" /> Rejeter
                  </button>
                </div>
              )}

              {req.rejectionReason && (
                <div className="mt-3 p-3 bg-red-50 rounded-xl text-sm text-red-700 border border-red-100">
                  <strong>Raison du rejet :</strong> {req.rejectionReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
