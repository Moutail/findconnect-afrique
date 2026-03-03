import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { Building2, Check, X, Ban } from 'lucide-react';
import { formatDate, ORGANIZATION_TYPE_LABELS } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    loadOrganizations();
  }, [status]);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (status) params.status = status;
      const { data } = await adminAPI.getOrganizations(params);
      setOrganizations(data.organizations);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id, newStatus) => {
    try {
      await adminAPI.verifyOrganization(id, { status: newStatus });
      toast.success(`Organisation ${newStatus === 'approved' ? 'approuvée' : newStatus === 'rejected' ? 'rejetée' : 'suspendue'}`);
      loadOrganizations();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) return toast.error('Raison requise');
    try {
      await adminAPI.verifyOrganization(id, { status: 'rejected', rejectionReason: rejectReason });
      toast.success('Organisation rejetée');
      setRejectingId(null);
      setRejectReason('');
      loadOrganizations();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const statusBadge = {
    pending: 'bg-accent-100 text-accent-700',
    approved: 'bg-primary-100 text-primary-700',
    rejected: 'bg-red-100 text-red-700',
    suspended: 'bg-gray-100 text-gray-600',
  };
  const statusLabel = { pending: 'En attente', approved: 'Approuvée', rejected: 'Rejetée', suspended: 'Suspendue' };
  const tabs = [{ key: '', label: 'Toutes' }, { key: 'pending', label: 'En attente' }, { key: 'approved', label: 'Approuvées' }, { key: 'rejected', label: 'Rejetées' }];

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <div className="w-9 h-9 bg-accent-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-accent-700" />
          </div>
          Organisations
        </h1>
      </div>

      <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setStatus(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              status === t.key ? 'bg-primary-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : organizations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucune organisation</p>
        </div>
      ) : (
        <div className="space-y-4">
          {organizations.map(org => (
            <div key={org._id || org.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-accent-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-accent-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-gray-900">{org.name}</h3>
                      <span className={`badge text-xs ${statusBadge[org.verificationStatus] || ''}`}>
                        {statusLabel[org.verificationStatus] || org.verificationStatus}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{org.legalName}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                      <span>Type: <strong className="text-gray-700">{ORGANIZATION_TYPE_LABELS[org.type] || org.type}</strong></span>
                      {org.email && <span>Email: {org.email}</span>}
                      {org.phone && <span>Tél: {org.phone}</span>}
                    </div>
                    {org.address && (
                      <p className="text-xs text-gray-400 mt-1">{org.address.street}, {org.address.city}, {org.address.region}</p>
                    )}
                    {org.createdBy && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        Créé par : {org.createdBy.firstName} {org.createdBy.lastName} ({org.createdBy.phone}) — {formatDate(org.createdAt)}
                      </p>
                    )}
                    {org.verificationDocuments && (
                      <div className="mt-1 text-xs text-gray-400 flex gap-3">
                        {org.verificationDocuments.registrationNumber && <span>N° enreg.: <strong>{org.verificationDocuments.registrationNumber}</strong></span>}
                        {org.verificationDocuments.taxId && <span>IFU: <strong>{org.verificationDocuments.taxId}</strong></span>}
                      </div>
                    )}
                    {org.rejectionReason && (
                      <div className="mt-2 px-3 py-2 bg-red-50 rounded-xl text-xs text-red-700 border border-red-100">
                        <strong>Raison du rejet :</strong> {org.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2 flex-wrap">
                {org.verificationStatus === 'pending' && (
                  <>
                    <button onClick={() => handleVerify(org._id || org.id, 'approved')} className="flex items-center gap-1.5 text-sm text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded-xl font-semibold border border-primary-200 transition-colors">
                      <Check className="w-4 h-4" /> Approuver
                    </button>
                    <button onClick={() => setRejectingId(org._id || org.id)} className="flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl font-semibold border border-red-200 transition-colors">
                      <X className="w-4 h-4" /> Rejeter
                    </button>
                  </>
                )}
                {org.verificationStatus === 'approved' && (
                  <button onClick={() => handleVerify(org._id || org.id, 'suspended')} className="flex items-center gap-1.5 text-sm text-accent-700 hover:bg-accent-50 px-3 py-1.5 rounded-xl font-semibold border border-accent-200 transition-colors">
                    <Ban className="w-4 h-4" /> Suspendre
                  </button>
                )}
                {(org.verificationStatus === 'rejected' || org.verificationStatus === 'suspended') && (
                  <button onClick={() => handleVerify(org._id || org.id, 'approved')} className="flex items-center gap-1.5 text-sm text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded-xl font-semibold border border-primary-200 transition-colors">
                    <Check className="w-4 h-4" /> Ré-approuver
                  </button>
                )}
              </div>

              {rejectingId === (org._id || org.id) && (
                <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                  <label className="block text-xs font-bold text-red-700 mb-1.5">Raison du rejet</label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-300 bg-white"
                    placeholder="Ex : informations fausses / non vérifiables"
                  />
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={() => handleReject(org._id || org.id)} className="px-4 py-1.5 rounded-xl bg-red-600 text-white text-sm font-semibold">
                      Confirmer le rejet
                    </button>
                    <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="px-4 py-1.5 rounded-xl bg-white border border-red-200 text-red-700 text-sm font-semibold">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
