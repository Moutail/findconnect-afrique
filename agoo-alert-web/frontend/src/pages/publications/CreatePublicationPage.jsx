import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { publicationAPI, uploadAPI } from '../../lib/api';
import { CATEGORY_LABELS } from '../../lib/utils';
import { ChevronRight, ChevronLeft, Upload, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 1, title: 'Type', description: 'Perdu ou trouvé ?' },
  { id: 2, title: 'Catégorie', description: 'Quel type d\'élément ?' },
  { id: 3, title: 'Détails', description: 'Décrivez l\'élément' },
  { id: 4, title: 'Localisation', description: 'Où ?' },
  { id: 5, title: 'Photos', description: 'Ajoutez des images' },
  { id: 6, title: 'Confirmation', description: 'Vérifiez et publiez' },
];

export default function CreatePublicationPage() {
  const { user, isOrganization } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [formData, setFormData] = useState({
    type: '',
    mainCategory: '',
    title: '',
    description: '',
    details: {
      personDetails: {
        firstName: '',
        lastName: '',
        age: '',
        gender: '',
        height: '',
        weight: '',
        eyeColor: '',
        hairColor: '',
        clothing: '',
        lastSeenDate: '',
        lastSeenLocation: '',
        distinctiveFeatures: '',
      },
      objectDetails: {
        brand: '',
        model: '',
        color: '',
        condition: '',
        serialNumber: '',
        distinctiveFeatures: '',
      },
      animalDetails: {
        species: '',
        breed: '',
        name: '',
        age: '',
        size: '',
        gender: '',
        color: '',
        microchipId: '',
        distinctiveFeatures: '',
      },
      documentDetails: {
        documentType: '',
        documentNumber: '',
        issuingAuthority: '',
        ownerName: '',
      },
      vehicleDetails: {
        vehicleType: '',
        make: '',
        model: '',
        year: '',
        color: '',
        licensePlate: '',
        distinctiveFeatures: '',
      },
    },
    incidentDate: '',
    location: { address: '', city: '', region: '', country: 'Togo' },
    contactPreference: 'chat',
    contactPhone: '',
    reward: { offered: false, amount: '', description: '' },
  });

  // Check verification for simple users
  if (!isOrganization && user?.verificationStatus !== 'approved') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Vérification requise</h1>
        <p className="text-gray-500 mb-6">
          Vous devez vérifier votre identité avant de pouvoir publier une déclaration.
        </p>
        <a href="/verification" className="btn-primary">Vérifier mon identité</a>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, location: { ...prev.location, [name]: value } }));
  };

  const handleDetailsChange = (group, field) => (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        [group]: {
          ...prev.details[group],
          [field]: value,
        },
      },
    }));
  };

  const normalizeDetailsForPayload = () => {
    const { mainCategory, details } = formData;
    const map = {
      person: 'personDetails',
      animal: 'animalDetails',
      document: 'documentDetails',
      vehicle: 'vehicleDetails',
      object: 'objectDetails',
      electronics: 'objectDetails',
      other: 'objectDetails',
    };
    const key = map[mainCategory] || 'objectDetails';
    const raw = details?.[key] || {};

    const cleaned = Object.fromEntries(
      Object.entries(raw)
        .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    );

    if (Object.keys(cleaned).length === 0) return undefined;

    const out = {};
    out[key] = cleaned;

    if (key === 'personDetails') {
      if (out.personDetails.age !== undefined) out.personDetails.age = Number(out.personDetails.age);
    }
    if (key === 'animalDetails') {
      if (out.animalDetails.age !== undefined) out.animalDetails.age = Number(out.animalDetails.age);
    }
    if (key === 'vehicleDetails') {
      if (out.vehicleDetails.year !== undefined) out.vehicleDetails.year = Number(out.vehicleDetails.year);
    }

    return out;
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (imageFiles.length + files.length > 5) {
      return toast.error('Maximum 5 images');
    }
    setImageFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const [orgBlockError, setOrgBlockError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setOrgBlockError(null);
    try {
      // Upload images first
      let images = [];
      if (imageFiles.length > 0) {
        const { data } = await uploadAPI.multiple(imageFiles);
        images = data.files.map(f => ({ url: f.url, thumbnail: f.thumbnail }));
      }

      const { data } = await publicationAPI.create({
        ...formData,
        details: normalizeDetailsForPayload(),
        images,
        reward: formData.reward.offered ? formData.reward : undefined,
      });

      toast.success(data.message);
      navigate('/my-publications');
    } catch (error) {
      const errData = error.response?.data;
      if (errData?.code === 'ORG_NOT_APPROVED') {
        setOrgBlockError(errData);
        setStep(1);
      } else {
        toast.error(errData?.error || 'Erreur lors de la création');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Nouvelle déclaration</h1>
      <p className="text-gray-500 mb-6">Suivez les étapes pour créer votre publication</p>

      {orgBlockError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-red-800 text-sm">Organisation non autorisée à publier</p>
            <p className="text-sm text-red-700 mt-1">{orgBlockError.error}</p>
            {orgBlockError.rejectionReason && (
              <p className="text-sm text-red-600 mt-1">Raison : <strong>{orgBlockError.rejectionReason}</strong></p>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              s.id <= step ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-gray-100 text-gray-400'
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                s.id < step ? 'bg-primary-600 text-white' : s.id === step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{s.id}</span>
              <span className="hidden sm:inline">{s.title}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`w-4 h-0.5 ${s.id < step ? 'bg-primary-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="card">
        {/* Step 1: Type */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Quel est le type de déclaration ?</h2>
            <div className="grid grid-cols-2 gap-4">
              {[{ value: 'lost', label: 'J\'ai perdu', color: 'border-red-300 bg-red-50 text-red-700' },
                { value: 'found', label: 'J\'ai trouvé', color: 'border-green-300 bg-green-50 text-green-700' }].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: opt.value }))}
                  className={`p-6 rounded-xl border-2 text-center font-semibold text-lg transition-all ${
                    formData.type === opt.value ? opt.color + ' ring-2 ring-offset-2' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Category */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Quelle catégorie ?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, mainCategory: key }))}
                  className={`p-4 rounded-xl border-2 text-center font-medium transition-all ${
                    formData.mainCategory === key
                      ? 'border-primary-400 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Décrivez l'élément</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la publication</label>
              <input type="text" name="title" className="input-field" placeholder="Ex: Téléphone Samsung perdu au marché" value={formData.title} onChange={handleChange} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description détaillée</label>
              <textarea name="description" className="input-field" rows="5" placeholder="Décrivez l'objet, la personne ou l'animal en détail..." value={formData.description} onChange={handleChange} required />
            </div>

            {(formData.mainCategory === 'person') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input className="input-field" value={formData.details.personDetails.firstName} onChange={handleDetailsChange('personDetails', 'firstName')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input className="input-field" value={formData.details.personDetails.lastName} onChange={handleDetailsChange('personDetails', 'lastName')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Âge</label>
                  <input type="number" min="0" className="input-field" value={formData.details.personDetails.age} onChange={handleDetailsChange('personDetails', 'age')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                  <select className="input-field" value={formData.details.personDetails.gender} onChange={handleDetailsChange('personDetails', 'gender')}>
                    <option value="">Sélectionner</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
                  <input className="input-field" value={formData.details.personDetails.height} onChange={handleDetailsChange('personDetails', 'height')} placeholder="Ex: 1m70" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poids</label>
                  <input className="input-field" value={formData.details.personDetails.weight} onChange={handleDetailsChange('personDetails', 'weight')} placeholder="Ex: 65kg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur des yeux</label>
                  <input className="input-field" value={formData.details.personDetails.eyeColor} onChange={handleDetailsChange('personDetails', 'eyeColor')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur des cheveux</label>
                  <input className="input-field" value={formData.details.personDetails.hairColor} onChange={handleDetailsChange('personDetails', 'hairColor')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vêtements (au moment)</label>
                  <input className="input-field" value={formData.details.personDetails.clothing} onChange={handleDetailsChange('personDetails', 'clothing')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dernière date vue</label>
                  <input type="date" className="input-field" value={formData.details.personDetails.lastSeenDate} onChange={handleDetailsChange('personDetails', 'lastSeenDate')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dernier lieu vu</label>
                  <input className="input-field" value={formData.details.personDetails.lastSeenLocation} onChange={handleDetailsChange('personDetails', 'lastSeenLocation')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signes distinctifs</label>
                  <textarea className="input-field" rows="2" value={formData.details.personDetails.distinctiveFeatures} onChange={handleDetailsChange('personDetails', 'distinctiveFeatures')} />
                </div>
              </div>
            )}

            {(formData.mainCategory === 'animal') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Espèce</label>
                  <input className="input-field" value={formData.details.animalDetails.species} onChange={handleDetailsChange('animalDetails', 'species')} placeholder="Ex: chien" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Race</label>
                  <input className="input-field" value={formData.details.animalDetails.breed} onChange={handleDetailsChange('animalDetails', 'breed')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input className="input-field" value={formData.details.animalDetails.name} onChange={handleDetailsChange('animalDetails', 'name')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Âge</label>
                  <input type="number" min="0" className="input-field" value={formData.details.animalDetails.age} onChange={handleDetailsChange('animalDetails', 'age')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
                  <select className="input-field" value={formData.details.animalDetails.size} onChange={handleDetailsChange('animalDetails', 'size')}>
                    <option value="">Sélectionner</option>
                    <option value="small">Petit</option>
                    <option value="medium">Moyen</option>
                    <option value="large">Grand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                  <select className="input-field" value={formData.details.animalDetails.gender} onChange={handleDetailsChange('animalDetails', 'gender')}>
                    <option value="">Sélectionner</option>
                    <option value="male">Mâle</option>
                    <option value="female">Femelle</option>
                    <option value="unknown">Inconnu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                  <input className="input-field" value={formData.details.animalDetails.color} onChange={handleDetailsChange('animalDetails', 'color')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID microchip</label>
                  <input className="input-field" value={formData.details.animalDetails.microchipId} onChange={handleDetailsChange('animalDetails', 'microchipId')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signes distinctifs</label>
                  <textarea className="input-field" rows="2" value={formData.details.animalDetails.distinctiveFeatures} onChange={handleDetailsChange('animalDetails', 'distinctiveFeatures')} />
                </div>
              </div>
            )}

            {(formData.mainCategory === 'document') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de document</label>
                  <input className="input-field" value={formData.details.documentDetails.documentType} onChange={handleDetailsChange('documentDetails', 'documentType')} placeholder="Ex: carte d'identité" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro</label>
                  <input className="input-field" value={formData.details.documentDetails.documentNumber} onChange={handleDetailsChange('documentDetails', 'documentNumber')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Autorité émettrice</label>
                  <input className="input-field" value={formData.details.documentDetails.issuingAuthority} onChange={handleDetailsChange('documentDetails', 'issuingAuthority')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du propriétaire</label>
                  <input className="input-field" value={formData.details.documentDetails.ownerName} onChange={handleDetailsChange('documentDetails', 'ownerName')} />
                </div>
              </div>
            )}

            {(formData.mainCategory === 'vehicle') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de véhicule</label>
                  <input className="input-field" value={formData.details.vehicleDetails.vehicleType} onChange={handleDetailsChange('vehicleDetails', 'vehicleType')} placeholder="Ex: moto" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                  <input className="input-field" value={formData.details.vehicleDetails.make} onChange={handleDetailsChange('vehicleDetails', 'make')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                  <input className="input-field" value={formData.details.vehicleDetails.model} onChange={handleDetailsChange('vehicleDetails', 'model')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                  <input type="number" min="0" className="input-field" value={formData.details.vehicleDetails.year} onChange={handleDetailsChange('vehicleDetails', 'year')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                  <input className="input-field" value={formData.details.vehicleDetails.color} onChange={handleDetailsChange('vehicleDetails', 'color')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plaque</label>
                  <input className="input-field" value={formData.details.vehicleDetails.licensePlate} onChange={handleDetailsChange('vehicleDetails', 'licensePlate')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signes distinctifs</label>
                  <textarea className="input-field" rows="2" value={formData.details.vehicleDetails.distinctiveFeatures} onChange={handleDetailsChange('vehicleDetails', 'distinctiveFeatures')} />
                </div>
              </div>
            )}

            {(formData.mainCategory === 'object' || formData.mainCategory === 'electronics' || formData.mainCategory === 'other') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                  <input className="input-field" value={formData.details.objectDetails.brand} onChange={handleDetailsChange('objectDetails', 'brand')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                  <input className="input-field" value={formData.details.objectDetails.model} onChange={handleDetailsChange('objectDetails', 'model')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                  <input className="input-field" value={formData.details.objectDetails.color} onChange={handleDetailsChange('objectDetails', 'color')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">État</label>
                  <input className="input-field" value={formData.details.objectDetails.condition} onChange={handleDetailsChange('objectDetails', 'condition')} placeholder="Ex: neuf / utilisé" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de série</label>
                  <input className="input-field" value={formData.details.objectDetails.serialNumber} onChange={handleDetailsChange('objectDetails', 'serialNumber')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signes distinctifs</label>
                  <textarea className="input-field" rows="2" value={formData.details.objectDetails.distinctiveFeatures} onChange={handleDetailsChange('objectDetails', 'distinctiveFeatures')} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de l'incident (optionnel)</label>
              <input type="date" name="incidentDate" className="input-field" value={formData.incidentDate} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Préférence de contact</label>
              <select name="contactPreference" className="input-field" value={formData.contactPreference} onChange={handleChange}>
                <option value="chat">Chat uniquement</option>
                <option value="phone">Téléphone</option>
                <option value="both">Chat et téléphone</option>
              </select>
            </div>
            {formData.contactPreference !== 'chat' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
                <input type="tel" name="contactPhone" className="input-field" value={formData.contactPhone} onChange={handleChange} />
              </div>
            )}
          </div>
        )}

        {/* Step 4: Location */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Où a eu lieu l'incident ?</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse / Lieu</label>
              <input type="text" name="address" className="input-field" placeholder="Ex: Marché de Hédzranawoé" value={formData.location.address} onChange={handleLocationChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input type="text" name="city" className="input-field" placeholder="Lomé" value={formData.location.city} onChange={handleLocationChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Région</label>
                <input type="text" name="region" className="input-field" placeholder="Maritime" value={formData.location.region} onChange={handleLocationChange} />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Photos */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Ajoutez des photos (optionnel)</h2>
            <p className="text-sm text-gray-500 mb-4">Ajoutez jusqu'à 5 photos pour aider à identifier l'élément</p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {imagePreviews.map((preview, i) => (
                <div key={i} className="relative">
                  <img src={preview} alt="" className="w-full h-32 object-cover rounded-lg" />
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {imageFiles.length < 5 && (
                <label className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-400">Ajouter</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Step 6: Confirmation */}
        {step === 6 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Vérifiez votre publication</h2>
            <dl className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium">{formData.type === 'lost' ? 'Perdu' : 'Trouvé'}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500">Catégorie</dt>
                <dd className="font-medium">{CATEGORY_LABELS[formData.mainCategory]}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500">Titre</dt>
                <dd className="font-medium">{formData.title}</dd>
              </div>
              <div className="py-2 border-b border-gray-100">
                <dt className="text-gray-500 mb-1">Description</dt>
                <dd className="text-sm">{formData.description}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500">Lieu</dt>
                <dd className="font-medium">{formData.location.city}, {formData.location.region}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-gray-500">Photos</dt>
                <dd className="font-medium">{imageFiles.length} image(s)</dd>
              </div>
            </dl>

            {!isOrganization && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 text-sm text-blue-700">
                Votre publication sera soumise à validation par un administrateur avant d'être visible.
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-4 border-t border-gray-200">
          {step > 1 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
          ) : <div />}

          {step < 6 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !formData.type) || (step === 2 && !formData.mainCategory) || (step === 3 && (!formData.title || !formData.description))}
              className="btn-primary flex items-center gap-1"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Publier la déclaration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
