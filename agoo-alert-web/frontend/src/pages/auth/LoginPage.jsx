import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Phone, Lock, Eye, EyeOff, Search, MapPin, Shield, Users, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(formData.phone, formData.password);
      toast.success('Connexion réussie !');
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-67px)] flex">
      {/* Panneau gauche — branding */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 relative overflow-hidden flex-col justify-between p-12">
        {/* Cercles décoratifs */}
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
            Retrouvez vos proches,<br />vos objets, vos animaux
          </h2>
          <p className="text-primary-200 text-sm leading-relaxed mb-10">
            La plateforme communautaire togolaise de signalement de pertes. Rejoignez des milliers de citoyens et d'organisations.
          </p>

          <div className="space-y-4">
            {[
              { icon: Users, label: 'Particuliers vérifiés', val: '8 000+' },
              { icon: Building2, label: 'Organisations actives', val: '120+' },
              { icon: Shield, label: 'Publications résolues', val: '870+' },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
                <div className="w-9 h-9 bg-accent-500/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-4 h-4 text-accent-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{val}</p>
                  <p className="text-primary-300 text-xs">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-1.5 text-xs text-primary-400">
          <MapPin className="w-3.5 h-3.5" /> Lomé, Togo
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 bg-warm-50">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-gray-900">Agoo<span className="text-primary-700">Alert</span></span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900">Connexion</h1>
            <p className="text-gray-500 mt-1.5">Bienvenue, connectez-vous à votre compte.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Numéro de téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  className="input-field pl-11"
                  placeholder="+228 90 00 00 00"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pl-11 pr-11"
                  placeholder="Votre mot de passe"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 !py-3 !text-base">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><LogIn className="w-5 h-5" /> Se connecter</>
              )}
            </button>
          </form>

          <div className="mt-7 space-y-3">
            <div className="flex items-center gap-3">
              <hr className="flex-1 border-gray-200" />
              <span className="text-xs text-gray-400 font-medium">ou</span>
              <hr className="flex-1 border-gray-200" />
            </div>
            <p className="text-sm text-gray-500 text-center">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-primary-700 font-bold hover:text-primary-900">S'inscrire</Link>
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
