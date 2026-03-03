import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import { Users, FileText, ShieldCheck, Building2, MessageSquare, Clock, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const { data } = await adminAPI.getStats();
      setStats(data.stats);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const mainCards = [
    {
      label: 'Utilisateurs', value: stats?.totalUsers || 0,
      icon: Users, iconBg: 'bg-primary-100', iconColor: 'text-primary-700',
      border: 'border-primary-100', link: '/admin/users',
    },
    {
      label: 'Organisations', value: stats?.totalOrganizations || 0,
      icon: Building2, iconBg: 'bg-accent-100', iconColor: 'text-accent-700',
      border: 'border-accent-100', link: '/admin/organizations',
    },
    {
      label: 'Publications totales', value: stats?.totalPublications || 0,
      icon: FileText, iconBg: 'bg-sky-100', iconColor: 'text-sky-700',
      border: 'border-sky-100', link: '/admin/publications',
    },
    {
      label: 'Conversations', value: stats?.totalConversations || 0,
      icon: MessageSquare, iconBg: 'bg-violet-100', iconColor: 'text-violet-700',
      border: 'border-violet-100', link: '/admin/conversations',
    },
  ];

  const subCards = [
    {
      label: 'Publications actives', value: stats?.activePublications || 0,
      icon: TrendingUp, color: 'text-primary-700 bg-primary-50 border-primary-100',
      link: '/admin/publications',
    },
    {
      label: 'Résolues', value: stats?.resolvedPublications || 0,
      icon: CheckCircle, color: 'text-green-700 bg-green-50 border-green-100',
      link: '/admin/publications',
    },
    {
      label: 'En attente validation', value: stats?.pendingPublications || 0,
      icon: Clock, color: 'text-accent-700 bg-accent-50 border-accent-100',
      link: '/admin/publications',
    },
    {
      label: 'Vérifications en attente', value: stats?.pendingVerifications || 0,
      icon: ShieldCheck, color: 'text-red-700 bg-red-50 border-red-100',
      link: '/admin/verifications',
    },
  ];

  const hasActions = (stats?.pendingPublications || 0) > 0 || (stats?.pendingVerifications || 0) > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de la plateforme Agoo Alert</p>
      </div>

      {/* Actions requises */}
      {hasActions && (
        <div className="bg-accent-50 border border-accent-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <div className="w-9 h-9 bg-accent-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-accent-700" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-accent-900 text-sm mb-2">Actions requises</p>
            <div className="space-y-1.5">
              {(stats?.pendingPublications || 0) > 0 && (
                <Link to="/admin/publications" className="flex items-center gap-2 text-sm text-accent-700 hover:text-accent-900 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {stats.pendingPublications} publication(s) en attente de validation
                </Link>
              )}
              {(stats?.pendingVerifications || 0) > 0 && (
                <Link to="/admin/verifications" className="flex items-center gap-2 text-sm text-accent-700 hover:text-accent-900 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {stats.pendingVerifications} vérification(s) d'identité en attente
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {mainCards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className={`bg-white rounded-2xl shadow-sm border ${card.border} p-5 hover:shadow-md transition-all group`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <span className="text-3xl font-black text-gray-900 group-hover:text-primary-700 transition-colors">
                {card.value}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-500">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Sub stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {subCards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className={`rounded-2xl border p-4 hover:shadow-sm transition-all ${card.color}`}
          >
            <div className="flex items-center gap-2.5">
              <card.icon className="w-4 h-4 shrink-0" />
              <span className="text-2xl font-black">{card.value}</span>
            </div>
            <p className="text-xs font-semibold mt-1.5 opacity-80">{card.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
