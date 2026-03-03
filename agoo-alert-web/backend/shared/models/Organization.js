const mongoose = require('../mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de l\'organisation est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères'],
  },
  legalName: {
    type: String,
    required: [true, 'Le nom légal est requis'],
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
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
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
  },
  website: String,

  address: {
    street: String,
    city: String,
    region: String,
    country: { type: String, default: 'Togo' },
    postalCode: String,
  },

  logo: String,
  banner: String,
  photos: [String],

  description: {
    type: String,
    maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères'],
  },

  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  verificationDocuments: {
    registrationNumber: String,
    taxId: String,
    documentUrls: [String],
  },
  rejectionReason: String,
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  canPost: { type: Boolean, default: false },
  maxPostsPerDay: { type: Number, default: 10 },

  stats: {
    totalPosts: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
  },

  emergencyContact: {
    name: String,
    phone: String,
    email: String,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  }],

  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
}, {
  timestamps: true,
});

organizationSchema.index({ name: 'text', legalName: 'text' });
organizationSchema.index({ type: 1, verificationStatus: 1 });
organizationSchema.index({ 'address.city': 1 });

module.exports = mongoose.model('Organization', organizationSchema);
