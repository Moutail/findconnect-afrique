import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, Bell, Menu, X, User, LogOut, MessageSquare,
  PlusCircle, Home, FileText, Shield, HelpCircle, Building2,
  MapPin, Phone,
} from 'lucide-react';
import { useState } from 'react';

export default function MainLayout() {
  const { isAuthenticated, user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const navLink = (to, label) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`text-sm font-semibold transition-colors px-1 pb-0.5 border-b-2 ${
          active ? 'text-primary-700 border-primary-700' : 'text-gray-600 hover:text-primary-700 border-transparent'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-warm-50">
      {/* Bande tricolore togolaise subtile */}
      <div className="togo-accent-bar w-full" />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-[3px] z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 bg-primary-700 rounded-xl flex items-center justify-center shadow-sm">
                <Search className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-gray-900">
                Agoo<span className="text-primary-700">Alert</span>
              </span>
            </Link>

            {/* Nav desktop */}
            <nav className="hidden md:flex items-center gap-7">
              {navLink('/publications', 'Publications')}
              {navLink('/about', 'À propos')}
              {navLink('/support', 'Support')}
            </nav>

            {/* Actions desktop */}
            <div className="hidden md:flex items-center gap-2.5">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/publications/create"
                    className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold py-2 px-4 rounded-xl shadow-sm transition-all"
                  >
                    <PlusCircle className="w-4 h-4" /> Déclarer
                  </Link>
                  <Link to="/conversations" className="p-2 text-gray-500 hover:text-primary-700 rounded-xl hover:bg-primary-50 transition-colors" title="Messages">
                    <MessageSquare className="w-5 h-5" />
                  </Link>
                  <Link to="/chat-requests" className="p-2 text-gray-500 hover:text-primary-700 rounded-xl hover:bg-primary-50 transition-colors" title="Invitations">
                    <Bell className="w-5 h-5" />
                  </Link>

                  {/* User dropdown */}
                  <div className="relative group">
                    <button className="flex items-center gap-2 py-1.5 px-3 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all">
                      <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {user?.firstName?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{user?.firstName}</span>
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                      <Link to="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-warm-50 hover:text-primary-700 transition-colors">
                        <Home className="w-4 h-4" /> Tableau de bord
                      </Link>
                      <Link to="/my-publications" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-warm-50 hover:text-primary-700 transition-colors">
                        <FileText className="w-4 h-4" /> Mes publications
                      </Link>
                      <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-warm-50 hover:text-primary-700 transition-colors">
                        <User className="w-4 h-4" /> Mon profil
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors">
                          <Shield className="w-4 h-4" /> Administration
                        </Link>
                      )}
                      <div className="my-1 border-t border-gray-100" />
                      <button onClick={handleLogout} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full transition-colors">
                        <LogOut className="w-4 h-4" /> Déconnexion
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary text-sm !py-2 !px-4">Connexion</Link>
                  <Link to="/register" className="btn-primary text-sm !py-2 !px-4">S'inscrire</Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-md">
            <nav className="px-4 py-3 space-y-1">
              <Link to="/publications" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-semibold rounded-xl hover:bg-warm-50">Publications</Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-semibold rounded-xl hover:bg-warm-50">À propos</Link>
              <Link to="/support" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-semibold rounded-xl hover:bg-warm-50">Support</Link>
              {isAuthenticated ? (
                <>
                  <div className="border-t border-gray-100 my-2" />
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-semibold rounded-xl hover:bg-warm-50"><Home className="w-4 h-4" /> Tableau de bord</Link>
                  <Link to="/publications/create" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-accent-700 font-semibold rounded-xl hover:bg-accent-50"><PlusCircle className="w-4 h-4" /> Déclarer une perte</Link>
                  <Link to="/conversations" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-semibold rounded-xl hover:bg-warm-50"><MessageSquare className="w-4 h-4" /> Messages</Link>
                  <Link to="/chat-requests" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-semibold rounded-xl hover:bg-warm-50"><Bell className="w-4 h-4" /> Invitations</Link>
                  <Link to="/my-publications" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-semibold rounded-xl hover:bg-warm-50"><FileText className="w-4 h-4" /> Mes publications</Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-semibold rounded-xl hover:bg-warm-50"><User className="w-4 h-4" /> Mon profil</Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-amber-700 font-semibold rounded-xl hover:bg-amber-50"><Shield className="w-4 h-4" /> Administration</Link>
                  )}
                  <button onClick={handleLogout} className="flex items-center gap-2 py-2.5 px-3 text-red-600 font-semibold w-full rounded-xl hover:bg-red-50"><LogOut className="w-4 h-4" /> Déconnexion</button>
                </>
              ) : (
                <>
                  <div className="border-t border-gray-100 my-2" />
                  <div className="flex gap-2 px-1 pt-1 pb-2">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 btn-secondary text-center text-sm !py-2">Connexion</Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1 btn-primary text-center text-sm !py-2">S'inscrire</Link>
                  </div>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-primary-950 text-primary-200 mt-auto">
        {/* Bande tricolore en haut du footer */}
        <div className="togo-accent-bar w-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-black text-white">Agoo<span className="text-accent-400">Alert</span></span>
              </div>
              <p className="text-sm text-primary-300 leading-relaxed max-w-sm">
                Plateforme communautaire de signalement de pertes — personnes, objets, animaux. Ensemble, retrouvons ce qui compte.
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-primary-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>Lomé, Togo</span>
              </div>
            </div>

            {/* Liens */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Navigation</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/publications" className="hover:text-accent-400 transition-colors">Publications</Link></li>
                <li><Link to="/about" className="hover:text-accent-400 transition-colors">À propos</Link></li>
                <li><Link to="/privacy" className="hover:text-accent-400 transition-colors">Confidentialité</Link></li>
              </ul>
            </div>

            {/* Aide */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Aide</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/support" className="hover:text-accent-400 transition-colors">Support & contact</Link></li>
                <li><Link to="/register" className="hover:text-accent-400 transition-colors">Créer un compte</Link></li>
                <li><Link to="/register-organization" className="hover:text-accent-400 transition-colors">Inscrire une organisation</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-primary-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-primary-400">
            <span>&copy; {new Date().getFullYear()} Agoo Alert. Tous droits réservés.</span>
            <span className="flex items-center gap-1">Fait avec ❤️ au Togo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
