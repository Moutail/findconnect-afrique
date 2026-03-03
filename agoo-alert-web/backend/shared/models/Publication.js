const mongoose = require('../mongoose');

const publicationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true,
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères'],
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    maxlength: [2000, 'La description ne peut pas dépasser 2000 caractères'],
  },

  type: {
    type: String,
    required: true,
    enum: ['lost', 'found'],
  },

  mainCategory: {
    type: String,
    required: true,
    enum: ['person', 'object', 'animal', 'document', 'electronics', 'vehicle', 'other'],
  },

  details: {
    personDetails: {
      firstName: String,
      lastName: String,
      age: Number,
      gender: { type: String, enum: ['male', 'female', 'other'] },
      height: String,
      weight: String,
      eyeColor: String,
      hairColor: String,
      clothing: String,
      lastSeenDate: Date,
      lastSeenLocation: String,
      distinctiveFeatures: String,
    },
    objectDetails: {
      brand: String,
      model: String,
      color: String,
      condition: String,
      serialNumber: String,
      distinctiveFeatures: String,
    },
    animalDetails: {
      species: String,
      breed: String,
      name: String,
      age: Number,
      size: { type: String, enum: ['small', 'medium', 'large'] },
      gender: { type: String, enum: ['male', 'female', 'unknown'] },
      color: String,
      microchipId: String,
      distinctiveFeatures: String,
    },
    documentDetails: {
      documentType: String,
      documentNumber: String,
      issuingAuthority: String,
      ownerName: String,
    },
    vehicleDetails: {
      vehicleType: String,
      make: String,
      model: String,
      year: Number,
      color: String,
      licensePlate: String,
      distinctiveFeatures: String,
    },
  },

  location: {
    address: String,
    city: String,
    region: String,
    country: { type: String, default: 'Togo' },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },

  images: [{
    url: String,
    thumbnail: String,
  }],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  publishedBy: {
    type: String,
    enum: ['individual', 'organization'],
    default: 'individual',
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
  },
  organizationName: String,

  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  moderatedAt: Date,
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  moderationNotes: String,
  rejectionReason: String,

  status: {
    type: String,
    enum: ['active', 'resolved', 'closed', 'expired'],
    default: 'active',
  },
  resolvedAt: Date,

  contactPreference: {
    type: String,
    enum: ['chat', 'phone', 'both'],
    default: 'chat',
  },
  contactPhone: String,

  reward: {
    offered: { type: Boolean, default: false },
    amount: Number,
    currency: { type: String, default: 'XOF' },
    description: String,
  },

  incidentDate: Date,
  views: { type: Number, default: 0 },
  expiresAt: Date,
}, {
  timestamps: true,
});

publicationSchema.index({ type: 1, mainCategory: 1, moderationStatus: 1, status: 1 });
publicationSchema.index({ createdBy: 1 });
publicationSchema.index({ organizationId: 1 });
publicationSchema.index({ title: 'text', description: 'text' });
publicationSchema.index({ createdAt: -1 });
publicationSchema.index({ 'location.city': 1 });

module.exports = mongoose.model('Publication', publicationSchema);
