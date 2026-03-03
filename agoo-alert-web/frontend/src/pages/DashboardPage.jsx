import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationAPI } from '../lib/api';
import {
  FileText, PlusCircle, MessageSquare, Bell, ShieldCheck,
  Building2, User, AlertTriangle, CheckCircle, XCircle,
} from 'lucide-react';
import { VERIFICATION_LABELS } from '../lib/utils';

export default function DashboardPage() {
  const { user, organization, isOrganization } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationAPI.list({ limit: 1, unread: 'true' })
      .then(({ data }) => setUnreadCount(data.pagination?.total || 0))
      .catch(() => {});
  }, []);

  const verificationColor = {
    none: 'text-gray-500 bg-gray-100',
    pending: 'text-yellow-700 bg-yellow-100',
    approved: 'text-green-700 bg-green-100',
    rejected: 'text-red-700 bg-red-100',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.firstName} !
        </h1>
        <p className="text-gray-500 mt-1">
          {isOrganization
            ? `Organisation : ${organization?.name || 'N/A'}`
            : 'Bienvenue sur votre tableau de bord Agoo Alert'}
        </p>
      </div>

      {/* Org rejected/suspended banner */}
      {isOrganization && organization && ['rejected', 'suspended'].includes(organization.verificationStatus) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-800">
              Organisation {organization.verificationStatus === 'rejected' ? 'rejetée' : 'suspendue'}
            </p>
            <p className="text-sm text-red-700 mt-1">
              Votre organisation ne peut pas publier de déclarations pour le moment.
            </p>
            {organization.rejectionReason && (
              <p className="text-sm text-red-600 mt-1">Raison : <strong>{organization.rejectionReason}</strong></p>
            )}
          </div>
        </div>
      )}

      {/* Org pending banner */}
      {isOrganization && organization?.verificationStatus === 'pending' && (
        <div className="bg-accent-50 border border-accent-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent-700 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-accent-800">Vérification en attente</p>
            <p className="text-sm text-accent-700 mt-1">
              Votre organisation est en cours de vérification. Vous pourrez publier des déclarations dès qu'elle sera approuvée.
            </p>
          </div>
        </div>
      )}

      {/* Verification alert for simple users */}
      {!isOrganization && user?.verificationStatus === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-800">Vérification d'identité rejetée</p>
            <p className="text-sm text-red-700 mt-1">
              Votre demande de vérification a été rejetée. Vous pouvez en soumettre une nouvelle.
            </p>
            <Link to="/verification" className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-red-800 hover:text-red-900">
              <ShieldCheck className="w-4 h-4" /> Renouveler ma demande
            </Link>
          </div>
        </div>
      )}
      {!isOrganization && user?.verificationStatus === 'none' && (
        <div className="bg-accent-50 border border-accent-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent-700 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-accent-800">Vérification d'identité requise</p>
            <p className="text-sm text-accent-700 mt-1">
              Pour publier des déclarations, vérifiez votre identité avec une photo de visage et une pièce d'identité.
            </p>
            <Link to="/verification" className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-accent-800 hover:text-accent-900">
              <ShieldCheck className="w-4 h-4" /> Vérifier mon identité
            </Link>
          </div>
        </div>
      )}
      {!isOrganization && user?.verificationStatus === 'pending' && (
        <div className="bg-warm-100 border border-warm-300 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary-700 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-primary-800">Vérification en cours</p>
            <p className="text-sm text-primary-700 mt-1">Votre demande est en cours de traitement. Vous serez notifié dès qu'elle est traitée.</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/publications/create" className="card hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <PlusCircle className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Nouvelle déclaration</p>
            <p className="text-sm text-gray-500">Perdu ou trouvé</p>
          </div>
        </Link>

        <Link to="/my-publications" className="card hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-accent-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Mes publications</p>
            <p className="text-sm text-gray-500">{user?.stats?.publicationsCreated || 0} publications</p>
          </div>
        </Link>

        <Link to="/conversations" className="card hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Messages</p>
            <p className="text-sm text-gray-500">Conversations</p>
          </div>
        </Link>

        <Link to="/chat-requests" className="card hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Invitations</p>
            <p className="text-sm text-gray-500">Demandes de chat</p>
          </div>
        </Link>

        <Link to="/notifications" className="card hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="relative w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-primary-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">Notifications</p>
            <p className="text-sm text-gray-500">{unreadCount > 0 ? `${unreadCount} non lue(s)` : 'À jour'}</p>
          </div>
        </Link>
      </div>

      {/* Profile info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" /> Mon profil
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500 text-sm">Nom complet</dt>
              <dd className="font-medium text-sm">{user?.firstName} {user?.lastName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 text-sm">Téléphone</dt>
              <dd className="font-medium text-sm">{user?.phone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 text-sm">Type de compte</dt>
              <dd className="font-medium text-sm">{isOrganization ? 'Organisation' : 'Particulier'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500 text-sm">Vérification</dt>
              <dd className={`text-xs font-medium px-2.5 py-1 rounded-full ${verificationColor[user?.verificationStatus] || ''}`}>
                {VERIFICATION_LABELS[user?.verificationStatus] || 'N/A'}
              </dd>
            </div>
          </dl>
          <Link to="/profile" className="mt-4 text-sm text-primary-600 font-medium inline-block hover:text-primary-700">
            Modifier mon profil →
          </Link>
        </div>

        {isOrganization && organization && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Mon organisation
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500 text-sm">Nom</dt>
                <dd className="font-medium text-sm">{organization.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 text-sm">Type</dt>
                <dd className="font-medium text-sm capitalize">{organization.type?.replace(/_/g, ' ')}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-500 text-sm">Statut</dt>
                <dd className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  organization.verificationStatus === 'approved' ? 'bg-primary-100 text-primary-700'
                  : organization.verificationStatus === 'rejected' ? 'bg-red-100 text-red-700'
                  : organization.verificationStatus === 'suspended' ? 'bg-gray-100 text-gray-600'
                  : 'bg-accent-100 text-accent-700'
                }`}>
                  {organization.verificationStatus === 'approved' ? 'Vérifiée'
                    : organization.verificationStatus === 'rejected' ? 'Rejetée'
                    : organization.verificationStatus === 'suspended' ? 'Suspendue'
                    : 'En attente'}
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-500 text-sm">Publication directe</dt>
                <dd>{organization.canPost ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-yellow-500" />}</dd>
              </div>
            </dl>
          </div>
        )}

        {!isOrganization && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Statistiques</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary-600">{user?.stats?.publicationsCreated || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Publications créées</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{user?.stats?.publicationsResolved || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Résolues</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
