import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import { FileText, Check, X, Eye, Trash2, CheckCircle, Clock, Search } from 'lucide-react';
import { PUBLICATION_TYPE_LABELS, CATEGORY_LABELS, MODERATION_LABELS, timeAgo } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminPublicationsPage() {
  const [tab, setTab] = useState('pending');
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    loadPublications();
  }, [tab, page]);

  const loadPublications = async () => {
    setLoading(true);
    try {
      let data;
      if (tab === 'pending') {
        const res = await adminAPI.getPendingPublications({ page, limit: 20 });
        data = res.data;
      } else {
        const res = await adminAPI.getPublicationHistory({ page, limit: 20, ...(tab !== 'all' && { status: tab }) });
        data = res.data;
      }
      setPublications(data.publications);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminAPI.approvePublication(id, {});
      toast.success('Publication approuvée');
      loadPublications();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) return toast.error('Veuillez indiquer une raison');
    try {
      await adminAPI.rejectPublication(id, { reason: rejectReason });
      toast.success('Publication rejetée');
      setRejectingId(null);
      setRejectReason('');
      loadPublications();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleResolve = async (id) => {
    try {
      await adminAPI.resolvePublication(id);
      toast.success('Marquée comme résolue');
      loadPublications();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer définitivement ?')) return;
    try {
      await adminAPI.deletePublication(id);
      toast.success('Publication supprimée');
      loadPublications();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const tabs = [
    { key: 'pending', label: 'En attente' },
    { key: 'all', label: 'Toutes' },
    { key: 'active', label: 'Actives' },
    { key: 'resolved', label: 'Résolues' },
  ];

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-sky-700" />
          </div>
          Gestion des publications
        </h1>
      </div>

      <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-primary-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : publications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucune publication</p>
        </div>
      ) : (
        <div className="space-y-4">
          {publications.map(pub => (
            <div key={pub._id || pub.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start gap-4">
                {pub.images?.[0] ? (
                  <img src={pub.images[0].thumbnail || pub.images[0].url} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100">
                    <FileText className="w-6 h-6 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`badge text-xs ${pub.type === 'lost' ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'}`}>
                      {PUBLICATION_TYPE_LABELS[pub.type]}
                    </span>
                    <span className="badge bg-gray-100 text-gray-600 text-xs">{CATEGORY_LABELS[pub.mainCategory]}</span>
                    <span className={`badge text-xs ${pub.moderationStatus === 'approved' ? 'bg-primary-100 text-primary-700' : pub.moderationStatus === 'pending' ? 'bg-accent-100 text-accent-700' : 'bg-red-100 text-red-700'}`}>
                      {MODERATION_LABELS[pub.moderationStatus]}
                    </span>
                    {pub.publishedBy === 'organization' && (
                      <span className="badge bg-violet-100 text-violet-700 text-xs">{pub.organizationName || 'Organisation'}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900">{pub.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">{pub.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Par : {pub.createdBy?.firstName} {pub.createdBy?.lastName} ({pub.createdBy?.phone})</span>
                    <span>{timeAgo(pub.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Reject form */}
              {rejectingId === (pub._id || pub.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <textarea className="input-field text-sm" rows="2" placeholder="Raison du rejet..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => handleReject(pub._id || pub.id)} className="btn-danger text-sm">Confirmer le rejet</button>
                    <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="btn-secondary text-sm">Annuler</button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {rejectingId !== (pub._id || pub.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2 flex-wrap">
                  {pub.moderationStatus === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(pub._id || pub.id)} className="flex items-center gap-1.5 text-sm text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded-xl font-semibold border border-primary-200 transition-colors">
                        <Check className="w-4 h-4" /> Approuver
                      </button>
                      <button onClick={() => setRejectingId(pub._id || pub.id)} className="flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl font-semibold border border-red-200 transition-colors">
                        <X className="w-4 h-4" /> Rejeter
                      </button>
                    </>
                  )}
                  {pub.status === 'active' && pub.moderationStatus === 'approved' && (
                    <button onClick={() => handleResolve(pub._id || pub.id)} className="flex items-center gap-1.5 text-sm text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded-xl font-semibold border border-primary-100 transition-colors">
                      <CheckCircle className="w-4 h-4" /> Marquer résolu
                    </button>
                  )}
                  <Link to={`/publications/${pub._id || pub.id}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-xl font-semibold border border-gray-100 transition-colors">
                    <Eye className="w-4 h-4" /> Voir
                  </Link>
                  <button onClick={() => handleDelete(pub._id || pub.id)} className="flex items-center gap-1.5 text-sm text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-xl font-semibold border border-red-100 transition-colors ml-auto">
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
