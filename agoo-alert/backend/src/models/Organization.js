const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  region: String,
  country: { type: String, default: 'Togo' },
  postalCode: String,
  coordinates: {
    latitude: Number,
    longitude: Number,
  },
}, { _id: false });

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères'],
  },
  legalName: {
    type: String,
    required: [true, 'Le nom légal est requis'],
    trim: true,
  },
  
  // Type et catégorie
  type: {
    type: String,
    required: true,
    enum: [
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
  },
  category: {
    type: String,
    enum: ['transport', 'education', 'health', 'government', 'commerce', 'nonprofit', 'religion', 'media', 'other'],
  },
  
  // Informations de contact
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
  address: addressSchema,
  
  // Médias
  logo: String,
  banner: String,
  photos: [String],
  
  // Description
  description: {
    type: String,
    maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères'],
  },
  
  // Vérification
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
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Permissions de publication
  canPost: {
    type: Boolean,
    default: false,
  },
  canVerify: {
    type: Boolean,
    default: false,
  },
  maxPostsPerDay: {
    type: Number,
    default: 5,
  },
  
  // Hiérarchie d'organisation
  parentOrgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
  },
  childOrgIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
  }],
  
  // Statistiques
  stats: {
    totalPosts: { type: Number, default: 0 },
    totalFollowers: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
  },
  
  // Contact d'urgence
  emergencyContact: {
    name: String,
    phone: String,
    email: String,
  },
  
  // Créateur
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Statut
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  
}, {
  timestamps: true,
});

// Index
organizationSchema.index({ name: 'text', legalName: 'text' });
organizationSchema.index({ type: 1, verificationStatus: 1 });
organizationSchema.index({ 'address.city': 1 });

module.exports = mongoose.model('Organization', organizationSchema);
