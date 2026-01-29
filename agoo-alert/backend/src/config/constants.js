// Constantes de l'application

module.exports = {
  // Statuts de modération
  MODERATION_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },

  // Statuts de vérification
  VERIFICATION_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended',
  },

  // Rôles utilisateur
  USER_ROLES: {
    USER: 'user',
    MODERATOR: 'moderator',
    ADMIN: 'admin',
  },

  // Catégories principales
  MAIN_CATEGORIES: [
    'lost',
    'found',
    'person',
    'pet',
    'vehicle',
    'document',
    'electronics',
    'other',
  ],

  // Types d'organisation
  ORGANIZATION_TYPES: [
    'transport_station',
    'education_institution',
    'healthcare_facility',
    'government_office',
    'business',
    'ngo',
    'religious_org',
    'media',
    'other',
  ],

  // Rôles de membre d'organisation
  MEMBER_ROLES: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    PUBLISHER: 'publisher',
    VIEWER: 'viewer',
  },

  // Statuts de demande de chat
  CHAT_REQUEST_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
  },

  // Limites
  LIMITS: {
    MAX_IMAGES_PER_REPORT: 5,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_REPORTS_PER_DAY: 10,
    REPORTS_PER_PAGE: 20,
  },

  // Permissions par défaut selon le rôle
  DEFAULT_PERMISSIONS: {
    owner: {
      canPublish: true,
      canEditOrg: true,
      canManageMembers: true,
      canViewAnalytics: true,
      canDeletePosts: true,
    },
    admin: {
      canPublish: true,
      canEditOrg: true,
      canManageMembers: true,
      canViewAnalytics: true,
      canDeletePosts: true,
    },
    moderator: {
      canPublish: true,
      canEditOrg: false,
      canManageMembers: false,
      canViewAnalytics: true,
      canDeletePosts: true,
    },
    publisher: {
      canPublish: true,
      canEditOrg: false,
      canManageMembers: false,
      canViewAnalytics: false,
      canDeletePosts: false,
    },
    viewer: {
      canPublish: false,
      canEditOrg: false,
      canManageMembers: false,
      canViewAnalytics: false,
      canDeletePosts: false,
    },
  },
};
