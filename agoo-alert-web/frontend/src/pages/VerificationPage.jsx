import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verificationAPI, uploadAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Camera, CreditCard, Upload, CheckCircle, Clock, XCircle } from 'lucide-react';
import { VERIFICATION_LABELS } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function VerificationPage() {
  const { user, loadUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [facePhoto, setFacePhoto] = useState(null);
  const [facePreview, setFacePreview] = useState(null);
  const [idDocument, setIdDocument] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [idDocumentType, setIdDocumentType] = useState('carte_identite');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const { data } = await verificationAPI.getStatus();
      setStatus(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (setter, previewSetter) => (e) => {
    const file = e.target.files[0];
    if (file) {
      setter(file);
      const reader = new FileReader();
      reader.onload = (ev) => previewSetter(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!facePhoto || !idDocument) {
      return toast.error('Les deux photos sont requises');
    }

    setSubmitting(true);
    try {
      const { data: faceData } = await uploadAPI.image(facePhoto, 'verification');
      const { data: idData } = await uploadAPI.image(idDocument, 'verification');

      await verificationAPI.submit({
        facePhoto: faceData.url,
        idDocument: idData.url,
        idDocumentType,
      });

      toast.success('Demande de vérification soumise !');
      await loadUser();
      loadStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const statusIcon = {
    none: null,
    pending: <Clock className="w-8 h-8 text-yellow-500" />,
    approved: <CheckCircle className="w-8 h-8 text-green-500" />,
    rejected: <XCircle className="w-8 h-8 text-red-500" />,
  };

  if (user?.verificationStatus === 'approved') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Identité vérifiée</h1>
        <p className="text-gray-500">Votre identité a été vérifiée avec succès. Vous pouvez maintenant publier des déclarations.</p>
      </div>
    );
  }

  if (user?.verificationStatus === 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Vérification en cours</h1>
        <p className="text-gray-500">Votre demande de vérification est en cours de traitement. Vous serez notifié dès qu'elle sera traitée.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <ShieldCheck className="w-12 h-12 text-primary-600 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900">Vérification d'identité</h1>
        <p className="text-gray-500 mt-2">
          Pour publier des déclarations, nous avons besoin de vérifier votre identité.
        </p>
      </div>

      {status?.lastRequest?.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700 font-medium">Demande précédente rejetée</p>
          <p className="text-sm text-red-600 mt-1">Raison: {status.lastRequest.rejectionReason}</p>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Face Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4" /> Photo de votre visage
            </label>
            <p className="text-xs text-gray-400 mb-3">Prenez une photo claire de votre visage, bien éclairée.</p>
            {facePreview ? (
              <div className="relative w-48 h-48 mx-auto">
                <img src={facePreview} alt="Face" className="w-full h-full object-cover rounded-xl" />
                <button type="button" onClick={() => { setFacePhoto(null); setFacePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs">✕</button>
              </div>
            ) : (
              <label className="block w-48 h-48 mx-auto border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-400">
                <Camera className="w-8 h-8 text-gray-300 mb-2" />
                <span className="text-sm text-gray-400">Ajouter la photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange(setFacePhoto, setFacePreview)} />
              </label>
            )}
          </div>

          {/* ID Document */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Pièce d'identité
            </label>
            <select className="input-field mb-3" value={idDocumentType} onChange={(e) => setIdDocumentType(e.target.value)}>
              <option value="carte_identite">Carte d'identité</option>
              <option value="passport">Passeport</option>
              <option value="permis_conduire">Permis de conduire</option>
              <option value="autre">Autre document officiel</option>
            </select>
            {idPreview ? (
              <div className="relative w-full max-w-sm mx-auto">
                <img src={idPreview} alt="ID" className="w-full h-48 object-cover rounded-xl" />
                <button type="button" onClick={() => { setIdDocument(null); setIdPreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs">✕</button>
              </div>
            ) : (
              <label className="block w-full max-w-sm mx-auto h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-400">
                <CreditCard className="w-8 h-8 text-gray-300 mb-2" />
                <span className="text-sm text-gray-400">Photo de la pièce d'identité</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange(setIdDocument, setIdPreview)} />
              </label>
            )}
          </div>

          <button type="submit" disabled={submitting || !facePhoto || !idDocument} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Upload className="w-5 h-5" /> Soumettre la vérification</>}
          </button>
        </form>
      </div>
    </div>
  );
}
