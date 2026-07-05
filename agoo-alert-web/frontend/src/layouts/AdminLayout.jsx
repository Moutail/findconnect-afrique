import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, FileText, ShieldCheck, Building2,
  MessageSquare, HelpCircle, LogOut, ArrowLeft, ChevronRight,
} from 'lucide-react';

const sidebarLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
  { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { to: '/admin/publications', icon: FileText, label: 'Publications' },
  { to: '/admin/verifications', icon: ShieldCheck, label: 'Vérifications' },
  { to: '/admin/organizations', icon: Building2, label: 'Organisations' },
  { to: '/admin/conversations', icon: MessageSquare, label: 'Conversations' },
  { to: '/admin/support', icon: HelpCircle, label: 'Support' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-warm-50">
      {/* Sidebar */}
      <aside className="w-64 bg-primary-950 text-white flex flex-col fixed h-full z-40">
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-primary-800/60">
          <Link to="/" className="flex items-center gap-2.5 mb-1">
            <img src="/logo.jpg" alt="AgooAlert" className="h-8 w-auto rounded-lg" />
            <span className="text-lg font-black text-white">
              Agoo<span className="text-accent-400">Alert</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
            <p className="text-xs text-primary-400 font-semibold tracking-wider uppercase">Administration</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {sidebarLinks.map(({ to, icon: Icon, label, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'text-primary-300 hover:bg-primary-800/60 hover:text-white'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 w-5 h-5 shrink-0 ${active ? 'text-accent-400' : ''}`} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 text-accent-400/60" />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-primary-800/60">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="w-9 h-9 bg-accent-500 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0">
              {user?.firstName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-primary-400">Administrateur</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/dashboard"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 px-2 rounded-xl bg-primary-800/60 text-primary-300 hover:bg-primary-700 hover:text-white transition-colors font-semibold"
            >
              <ArrowLeft className="w-3 h-3" /> Site
            </Link>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 px-2 rounded-xl bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors font-semibold"
            >
              <LogOut className="w-3 h-3" /> Quitter
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-64 min-h-screen">
        {/* Top bar */}
        <div className="h-1 togo-accent-bar sticky top-0 z-30" />
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
