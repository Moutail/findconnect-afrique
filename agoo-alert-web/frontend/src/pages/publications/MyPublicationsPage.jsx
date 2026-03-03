import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicationAPI } from '../../lib/api';
import { PUBLICATION_TYPE_LABELS, CATEGORY_LABELS, MODERATION_LABELS, STATUS_LABELS, timeAgo } from '../../lib/utils';
import { PlusCircle, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function MyPublicationsPage() {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublications();
  }, []);

  const loadPublications = async () => {
    try {
      const { data } = await publicationAPI.myList({ limit: 50 });
      setPublications(data.publications);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    if (!confirm('Marquer cette publication comme résolue ?')) return;
    try {
      await publicationAPI.resolve(id);
      toast.success('Publication marquée comme résolue');
      loadPublications();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette publication ?')) return;
    try {
      await publicationAPI.delete(id);
      toast.success('Publication supprimée');
      loadPublications();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const moderationIcon = {
    pending: <Clock className="w-4 h-4 text-yellow-500" />,
    approved: <CheckCircle className="w-4 h-4 text-green-500" />,
    rejected: <XCircle className="w-4 h-4 text-red-500" />,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes publications</h1>
        <Link to="/publications/create" className="btn-primary flex items-center gap-2 text-sm">
          <PlusCircle className="w-4 h-4" /> Nouvelle
        </Link>
      </div>

      {publications.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500">Aucune publication</h3>
          <p className="text-gray-400 mt-1">Créez votre première déclaration</p>
          <Link to="/publications/create" className="btn-primary mt-4 inline-block">Créer une publication</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {publications.map(pub => (
            <div key={pub._id || pub.id} className="card flex items-start gap-4">
              {pub.images?.[0] ? (
                <img src={pub.images[0].thumbnail || pub.images[0].url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge text-xs ${pub.type === 'lost' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {PUBLICATION_TYPE_LABELS[pub.type]}
                  </span>
                  <span className="badge bg-gray-100 text-gray-700 text-xs">{CATEGORY_LABELS[pub.mainCategory]}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    {moderationIcon[pub.moderationStatus]} {MODERATION_LABELS[pub.moderationStatus]}
                  </span>
                </div>
                <Link to={`/publications/${pub._id || pub.id}`} className="font-semibold text-gray-900 hover:text-primary-600 line-clamp-1">
                  {pub.title}
                </Link>
                <p className="text-sm text-gray-500 line-clamp-1">{pub.description}</p>
                <p className="text-xs text-gray-400 mt-1">{timeAgo(pub.createdAt)}</p>
                {pub.rejectionReason && (
                  <p className="text-xs text-red-500 mt-1">Raison du rejet: {pub.rejectionReason}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {pub.status === 'active' && (
                  <button onClick={() => handleResolve(pub._id || pub.id)} className="text-xs text-green-600 hover:text-green-700 font-medium">
                    Résolu
                  </button>
                )}
                <button onClick={() => handleDelete(pub._id || pub.id)} className="text-xs text-red-500 hover:text-red-600 font-medium">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
