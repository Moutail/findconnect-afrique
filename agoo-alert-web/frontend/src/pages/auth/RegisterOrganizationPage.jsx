import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Phone, Lock, User, Mail, Eye, EyeOff, MapPin, Globe, ChevronRight, ChevronLeft } from 'lucide-react';
import { ORGANIZATION_TYPE_LABELS } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function RegisterOrganizationPage() {
  const { registerOrganization } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '',
    organization: {
      name: '', legalName: '', type: '', email: '', phone: '', website: '',
      description: '',
      address: { street: '', city: '', region: '', country: 'Togo' },
      verificationDocuments: { registrationNumber: '', taxId: '' },
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOrgChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      organization: { ...prev.organization, [name]: value },
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      organization: {
        ...prev.organization,
        address: { ...prev.organization.address, [name]: value },
      },
    }));
  };

  const handleDocsChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      organization: {
        ...prev.organization,
        verificationDocuments: { ...prev.organization.verificationDocuments, [name]: value },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Les mots de passe ne correspondent pas');
    }
    setLoading(true);
    try {
      await registerOrganization({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email || undefined,
        password: formData.password,
        organization: formData.organization,
      });
      toast.success('Organisation créée avec succès !');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-7 h-7 text-accent-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Inscrire une organisation</h1>
          <p className="text-gray-500 mt-2">Étape {step} sur 3</p>
          <div className="flex gap-2 mt-4 max-w-xs mx-auto">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-accent-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            {/* Étape 1: Responsable */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Informations du responsable</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                    <input type="text" name="firstName" className="input-field" value={formData.firstName} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <input type="text" name="lastName" className="input-field" value={formData.lastName} onChange={handleChange} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="tel" name="phone" className="input-field" placeholder="+228 90 00 00 00" value={formData.phone} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (optionnel)</label>
                  <input type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} name="password" className="input-field pr-10" value={formData.password} onChange={handleChange} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                  <input type="password" name="confirmPassword" className="input-field" value={formData.confirmPassword} onChange={handleChange} required />
                </div>
              </div>
            )}

            {/* Étape 2: Organisation */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Informations de l'organisation</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'organisation</label>
                  <input type="text" name="name" className="input-field" value={formData.organization.name} onChange={handleOrgChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom légal</label>
                  <input type="text" name="legalName" className="input-field" value={formData.organization.legalName} onChange={handleOrgChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type d'organisation</label>
                  <select name="type" className="input-field" value={formData.organization.type} onChange={handleOrgChange} required>
                    <option value="">Sélectionner...</option>
                    {Object.entries(ORGANIZATION_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email de l'organisation</label>
                    <input type="email" name="email" className="input-field" value={formData.organization.email} onChange={handleOrgChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input type="tel" name="phone" className="input-field" value={formData.organization.phone} onChange={handleOrgChange} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site web (optionnel)</label>
                  <input type="url" name="website" className="input-field" value={formData.organization.website} onChange={handleOrgChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea name="description" className="input-field" rows="3" value={formData.organization.description} onChange={handleOrgChange} />
                </div>
              </div>
            )}

            {/* Étape 3: Adresse & Documents */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Adresse et documents</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input type="text" name="street" className="input-field" placeholder="Rue / Quartier" value={formData.organization.address.street} onChange={handleAddressChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                    <input type="text" name="city" className="input-field" value={formData.organization.address.city} onChange={handleAddressChange} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Région</label>
                    <input type="text" name="region" className="input-field" value={formData.organization.address.region} onChange={handleAddressChange} />
                  </div>
                </div>
                <hr className="my-4" />
                <h3 className="font-medium text-gray-700">Documents vérifiables</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro d'enregistrement</label>
                  <input type="text" name="registrationNumber" className="input-field" value={formData.organization.verificationDocuments.registrationNumber} onChange={handleDocsChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro fiscal (IFU)</label>
                  <input type="text" name="taxId" className="input-field" value={formData.organization.verificationDocuments.taxId} onChange={handleDocsChange} />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Précédent
                </button>
              ) : <div />}

              {step < 3 ? (
                <button type="button" onClick={() => setStep(step + 1)} className="btn-accent flex items-center gap-1">
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={loading} className="btn-accent flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Créer l\'organisation'}
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Déjà un compte ? <Link to="/login" className="text-primary-600 font-medium">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
