module.exports = {
  ROLES: {
    USER: 'user',
    ORGANIZATION: 'organization',
    MODERATOR: 'moderator',
    ADMIN: 'admin',
  },

  VERIFICATION_STATUS: {
    NONE: 'none',
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },

  PUBLICATION_STATUS: {
    ACTIVE: 'active',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    EXPIRED: 'expired',
  },

  MODERATION_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },

  PUBLICATION_TYPE: {
    LOST: 'lost',
    FOUND: 'found',
  },

  MAIN_CATEGORIES: [
    'person',
    'object',
    'animal',
    'document',
    'electronics',
    'vehicle',
    'other',
  ],

  CHAT_REQUEST_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
  },

  MESSAGE_TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    AUDIO: 'audio',
    VIDEO: 'video',
    SYSTEM: 'system',
  },

  ORGANIZATION_TYPES: [
    'school',
    'university',
    'training_center',
    'hospital',
    'government_office',
    'transport_station',
    'business',
    'ngo',
    'religious_org',
    'other',
  ],

  ACCOUNT_TYPES: {
    INDIVIDUAL: 'individual',
    ORGANIZATION: 'organization',
  },

  DEFAULT_PASSWORD: 'AgooAlert2024!',
};
