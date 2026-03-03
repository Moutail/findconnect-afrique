import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText, PlusCircle, MessageSquare, Bell, ShieldCheck,
  Building2, User, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { VERIFICATION_LABELS } from '../lib/utils';

export default function DashboardPage() {
  const { user, organization, isOrganization } = useAuth();

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

      {/* Verification alert for simple users */}
      {!isOrganization && user?.verificationStatus !== 'approved' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-800">Vérification d'identité requise</p>
            <p className="text-sm text-yellow-700 mt-1">
              Pour publier des déclarations, vous devez d'abord vérifier votre identité avec une photo de votre visage et une pièce d'identité.
            </p>
            <Link to="/verification" className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900">
              <ShieldCheck className="w-4 h-4" /> Vérifier mon identité
            </Link>
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
                  organization.verificationStatus === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {organization.verificationStatus === 'approved' ? 'Vérifié' : 'En attente'}
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
