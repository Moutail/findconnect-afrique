import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicationAPI, chatAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, Clock, Eye, User, Building2, MessageSquare, ArrowLeft, Tag, Phone } from 'lucide-react';
import { PUBLICATION_TYPE_LABELS, CATEGORY_LABELS, formatDate, timeAgo } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function PublicationDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [publication, setPublication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);

  useEffect(() => {
    loadPublication();
  }, [id]);

  const loadPublication = async () => {
    try {
      const { data } = await publicationAPI.getById(id);
      setPublication(data.publication);
    } catch (error) {
      toast.error('Publication non trouvée');
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatRequest = async () => {
    setSending(true);
    try {
      await chatAPI.sendRequest({
        publicationId: publication._id || publication.id,
        message: chatMessage,
      });
      toast.success('Invitation envoyée avec succès !');
      setShowChatModal(false);
      setChatMessage('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!publication) return <div className="text-center py-16 text-gray-500">Publication non trouvée</div>;

  const isOwner = user && (publication.createdBy?._id === user.id || publication.createdBy?.id === user.id);

  const renderDetailRow = (label, value) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
        <span className="text-sm text-gray-500 font-medium shrink-0">{label}</span>
        <span className="text-sm text-gray-800 text-right break-words font-semibold">{value}</span>
      </div>
    );
  };

  const detailsMap = {
    person: 'personDetails',
    animal: 'animalDetails',
    document: 'documentDetails',
    vehicle: 'vehicleDetails',
    object: 'objectDetails',
    electronics: 'objectDetails',
    other: 'objectDetails',
  };

  const detailsKey = detailsMap[publication.mainCategory];
  const details = detailsKey ? publication.details?.[detailsKey] : null;
  const hasDetails = details && Object.values(details).some(v => v !== undefined && v !== null && v !== '');

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/publications" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-primary-700 mb-6 text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour aux publications
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`badge ${publication.type === 'lost' ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'}`}>
                  {PUBLICATION_TYPE_LABELS[publication.type]}
                </span>
                <span className="badge bg-gray-100 text-gray-600">{CATEGORY_LABELS[publication.mainCategory]}</span>
                {publication.publishedBy === 'organization' && (
                  <span className="badge bg-accent-100 text-accent-700 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {publication.organizationName}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-black text-gray-900 mb-3">{publication.title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {publication.location?.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    {publication.location.city}{publication.location.region ? `, ${publication.location.region}` : ''}
                  </span>
                )}
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {timeAgo(publication.createdAt)}</span>
                <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {publication.views} vue(s)</span>
              </div>
            </div>

            {/* Images */}
            {publication.images && publication.images.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {publication.images.map((img, i) => (
                    <img key={i} src={img.url} alt={`${publication.title} ${i + 1}`}
                      className="w-full h-48 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(img.url, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-primary-700 rounded-full" />
                Description
              </h2>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{publication.description}</p>
            </div>

            {/* Category details */}
            {hasDetails && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-accent-600 rounded-full" />
                  Détails
                </h2>
                <div className="space-y-2.5">
                  {publication.mainCategory === 'person' && (
                    <>
                      {renderDetailRow('Prénom', details.firstName)}
                      {renderDetailRow('Nom', details.lastName)}
                      {renderDetailRow('Âge', details.age)}
                      {renderDetailRow('Genre', details.gender === 'male' ? 'Homme' : details.gender === 'female' ? 'Femme' : details.gender === 'other' ? 'Autre' : details.gender)}
                      {renderDetailRow('Taille', details.height)}
                      {renderDetailRow('Poids', details.weight)}
                      {renderDetailRow('Couleur des yeux', details.eyeColor)}
                      {renderDetailRow('Couleur des cheveux', details.hairColor)}
                      {renderDetailRow('Vêtements', details.clothing)}
                      {renderDetailRow('Dernière date vue', details.lastSeenDate ? formatDate(details.lastSeenDate) : null)}
                      {renderDetailRow('Dernier lieu vu', details.lastSeenLocation)}
                      {renderDetailRow('Signes distinctifs', details.distinctiveFeatures)}
                    </>
                  )}
                  {publication.mainCategory === 'animal' && (
                    <>
                      {renderDetailRow('Espèce', details.species)}
                      {renderDetailRow('Race', details.breed)}
                      {renderDetailRow('Nom', details.name)}
                      {renderDetailRow('Âge', details.age)}
                      {renderDetailRow('Taille', details.size === 'small' ? 'Petit' : details.size === 'medium' ? 'Moyen' : details.size === 'large' ? 'Grand' : details.size)}
                      {renderDetailRow('Genre', details.gender === 'male' ? 'Mâle' : details.gender === 'female' ? 'Femelle' : details.gender === 'unknown' ? 'Inconnu' : details.gender)}
                      {renderDetailRow('Couleur', details.color)}
                      {renderDetailRow('ID microchip', details.microchipId)}
                      {renderDetailRow('Signes distinctifs', details.distinctiveFeatures)}
                    </>
                  )}
                  {publication.mainCategory === 'document' && (
                    <>
                      {renderDetailRow('Type de document', details.documentType)}
                      {renderDetailRow('Numéro', details.documentNumber)}
                      {renderDetailRow('Autorité émettrice', details.issuingAuthority)}
                      {renderDetailRow('Nom du propriétaire', details.ownerName)}
                    </>
                  )}
                  {publication.mainCategory === 'vehicle' && (
                    <>
                      {renderDetailRow('Type de véhicule', details.vehicleType)}
                      {renderDetailRow('Marque', details.make)}
                      {renderDetailRow('Modèle', details.model)}
                      {renderDetailRow('Année', details.year)}
                      {renderDetailRow('Couleur', details.color)}
                      {renderDetailRow('Plaque', details.licensePlate)}
                      {renderDetailRow('Signes distinctifs', details.distinctiveFeatures)}
                    </>
                  )}
                  {(publication.mainCategory === 'object' || publication.mainCategory === 'electronics' || publication.mainCategory === 'other') && (
                    <>
                      {renderDetailRow('Marque', details.brand)}
                      {renderDetailRow('Modèle', details.model)}
                      {renderDetailRow('Couleur', details.color)}
                      {renderDetailRow('État', details.condition)}
                      {renderDetailRow('Numéro de série', details.serialNumber)}
                      {renderDetailRow('Signes distinctifs', details.distinctiveFeatures)}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Side column */}
          <div className="space-y-4">
            {/* Author card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Publié par</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                  {publication.publishedBy === 'organization'
                    ? <Building2 className="w-5 h-5 text-primary-700" />
                    : <User className="w-5 h-5 text-primary-700" />}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {publication.createdBy?.firstName} {publication.createdBy?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">Publié {timeAgo(publication.createdAt)}</p>
                </div>
              </div>

              {isAuthenticated && !isOwner && (
                <button
                  onClick={() => setShowChatModal(true)}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <MessageSquare className="w-4 h-4" /> Contacter
                </button>
              )}
              {!isAuthenticated && (
                <Link to="/login" className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                  Connectez-vous pour contacter
                </Link>
              )}
            </div>

            {/* Incident date */}
            {publication.incidentDate && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Date de l'incident</h3>
                <p className="text-gray-800 font-semibold text-sm">{formatDate(publication.incidentDate)}</p>
              </div>
            )}

            {/* Reward */}
            {publication.reward?.offered && (
              <div className="bg-accent-50 rounded-2xl border border-accent-200 p-5">
                <h3 className="font-bold text-accent-800 mb-1">Récompense offerte 🌟</h3>
                {publication.reward.amount && (
                  <p className="text-accent-700 font-black text-lg">{publication.reward.amount.toLocaleString()} {publication.reward.currency}</p>
                )}
                {publication.reward.description && (
                  <p className="text-sm text-accent-700 mt-1">{publication.reward.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat request modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-gray-900 mb-1">Envoyer une invitation</h3>
            <p className="text-sm text-gray-500 mb-5">
              Expliquez pourquoi vous souhaitez discuter à propos de cette publication.
            </p>
            <textarea
              className="input-field mb-4"
              rows="4"
              placeholder="Bonjour, je pense avoir trouvé/perdu cet objet..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowChatModal(false)} className="btn-secondary text-sm">Annuler</button>
              <button onClick={handleSendChatRequest} disabled={sending} className="btn-primary text-sm flex items-center gap-2">
                {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Envoyer l'invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
