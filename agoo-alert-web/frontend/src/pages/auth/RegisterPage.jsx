import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Phone, Lock, User, Mail, Eye, EyeOff, Search, MapPin, FileText, MessageSquare, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return toast.error('Les mots de passe ne correspondent pas');
    }

    if (formData.password.length < 6) {
      return toast.error('Le mot de passe doit contenir au moins 6 caractères');
    }

    setLoading(true);
    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email || undefined,
        password: formData.password,
      });
      toast.success('Compte créé avec succès !');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-67px)] flex">
      {/* Panneau gauche — branding */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-primary-500/20 blur-2xl" />

        <div className="relative">
          <Link to="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center shadow">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-white">Agoo<span className="text-accent-400">Alert</span></span>
          </Link>

          <h2 className="text-3xl font-black text-white leading-tight mb-4">
            Rejoignez la communauté<br />et agissez ensemble
          </h2>
          <p className="text-primary-200 text-sm leading-relaxed mb-10">
            En quelques minutes, créez votre compte et commencez à aider votre entourage à retrouver ce qui leur est cher.
          </p>

          <div className="space-y-3">
            {[
              { icon: FileText, text: 'Publiez des déclarations de perte ou de trouvaille' },
              { icon: MessageSquare, text: 'Discutez en toute sécurité avec les membres' },
              { icon: CheckCircle, text: 'Vérification d\'identité gratuite et rapide' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3 text-sm text-primary-200">
                <div className="w-7 h-7 bg-accent-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-accent-400" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-1.5 text-xs text-primary-400">
          <MapPin className="w-3.5 h-3.5" /> Lomé, Togo
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 bg-warm-50 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-gray-900">Agoo<span className="text-primary-700">Alert</span></span>
          </Link>

          <div className="mb-7">
            <h1 className="text-3xl font-black text-gray-900">Inscription</h1>
            <p className="text-gray-500 mt-1.5">Créez votre compte gratuitement.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prénom</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" name="firstName" className="input-field pl-10" placeholder="Prénom" value={formData.firstName} onChange={handleChange} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom</label>
                <input type="text" name="lastName" className="input-field" placeholder="Nom de famille" value={formData.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Numéro de téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" name="phone" className="input-field pl-10" placeholder="+228 90 00 00 00" value={formData.phone} onChange={handleChange} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" name="email" className="input-field pl-10" placeholder="email@exemple.com" value={formData.email} onChange={handleChange} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="input-field pl-10 pr-11"
                  placeholder="6 caractères minimum"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="password" name="confirmPassword" className="input-field pl-10" placeholder="Confirmez votre mot de passe" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 !py-3 !text-base">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><UserPlus className="w-5 h-5" /> Créer mon compte</>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3">
              <hr className="flex-1 border-gray-200" />
              <span className="text-xs text-gray-400 font-medium">ou</span>
              <hr className="flex-1 border-gray-200" />
            </div>
            <p className="text-sm text-gray-500 text-center">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-primary-700 font-bold hover:text-primary-900">Se connecter</Link>
            </p>
            <p className="text-sm text-gray-500 text-center">
              Vous êtes une organisation ?{' '}
              <Link to="/register-organization" className="text-accent-700 font-bold hover:text-accent-900">Inscrire une organisation</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
