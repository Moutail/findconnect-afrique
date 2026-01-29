const mongoose = require('mongoose');

const permissionsSchema = new mongoose.Schema({
  canPublish: { type: Boolean, default: false },
  canEditOrg: { type: Boolean, default: false },
  canManageMembers: { type: Boolean, default: false },
  canViewAnalytics: { type: Boolean, default: false },
  canDeletePosts: { type: Boolean, default: false },
}, { _id: false });

const organizationMemberSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Rôle
  role: {
    type: String,
    enum: ['owner', 'admin', 'moderator', 'publisher', 'viewer'],
    default: 'viewer',
  },
  
  // Permissions
  permissions: {
    type: permissionsSchema,
    default: () => ({
      canPublish: false,
      canEditOrg: false,
      canManageMembers: false,
      canViewAnalytics: false,
      canDeletePosts: false,
    }),
  },
  
  // Invitation
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  invitedAt: Date,
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  
  // Statut
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'active',
  },
  
}, {
  timestamps: true,
});

// Index composé unique
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('OrganizationMember', organizationMemberSchema);
