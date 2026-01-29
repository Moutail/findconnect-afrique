const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  geo: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: undefined,
    },
  },
  address: String,
  city: String,
  region: String,
  country: { type: String, default: 'Togo' },
}, { _id: false });

const categoryMetadataSchema = new mongoose.Schema({
  mainCategory: {
    type: String,
    required: true,
    enum: ['lost', 'found', 'person', 'pet', 'vehicle', 'document', 'electronics', 'other'],
  },
  subCategory: String,
  
  // Détails spécifiques aux objets
  itemDetails: {
    brand: String,
    model: String,
    color: String,
    condition: String,
    serialNumber: String,
    distinctiveFeatures: String,
  },
  
  // Détails spécifiques aux animaux
  petDetails: {
    type: String,
    breed: String,
    name: String,
    age: Number,
    ageUnit: String,
    size: String,
    gender: String,
    color: String,
    microchipId: String,
    vaccinated: Boolean,
    distinctiveFeatures: String,
  },
  
  // Détails spécifiques aux personnes
  personDetails: {
    type: String,
    firstName: String,
    lastName: String,
    age: Number,
    gender: String,
    height: Number,
    weight: Number,
    eyeColor: String,
    hairColor: String,
    lastSeenLocation: String,
    lastSeenDate: Date,
    clothing: String,
    distinctiveFeatures: String,
  },
  
  // Détails spécifiques aux véhicules
  vehicleDetails: {
    type: String,
    make: String,
    model: String,
    year: Number,
    color: String,
    licensePlate: String,
    vin: String,
    distinctiveFeatures: String,
  },
  
  // Détails spécifiques aux documents
  documentDetails: {
    documentType: String,
    documentNumber: String,
    issuingAuthority: String,
    ownerName: String,
  },
}, { _id: false });

const reportSchema = new mongoose.Schema({
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
  
  // Catégorie
  mainCategory: {
    type: String,
    required: true,
    enum: ['lost', 'found', 'person', 'pet', 'vehicle', 'document', 'electronics', 'other'],
  },
  categoryMetadata: categoryMetadataSchema,
  
  // Localisation
  location: locationSchema,
  
  // Images
  images: [{
    url: String,
    thumbnail: String,
  }],
  
  // Créateur
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Publication par organisation
  publishedBy: {
    type: String,
    enum: ['user', 'organization'],
    default: 'user',
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
  },
  organizationName: String,
  organizationLogo: String,
  isOfficialPost: {
    type: Boolean,
    default: false,
  },
  
  // Modération
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
  
  // Statut du signalement
  status: {
    type: String,
    enum: ['active', 'resolved', 'closed', 'expired'],
    default: 'active',
  },
  resolvedAt: Date,
  
  // Contact
  contactPreference: {
    type: String,
    enum: ['chat', 'phone', 'both'],
    default: 'chat',
  },
  contactPhone: String,
  
  // Récompense (optionnel)
  reward: {
    offered: { type: Boolean, default: false },
    amount: Number,
    currency: { type: String, default: 'XOF' },
    description: String,
  },
  
  // Date de l'incident
  incidentDate: Date,
  
  // Statistiques
  views: { type: Number, default: 0 },
  
  // Expiration
  expiresAt: Date,
  
}, {
  timestamps: true,
});

// Index pour la recherche géographique
reportSchema.index({ 'location.geo': '2dsphere' });
reportSchema.index({ mainCategory: 1, moderationStatus: 1, status: 1 });
reportSchema.index({ createdBy: 1 });
reportSchema.index({ organizationId: 1 });
reportSchema.index({ title: 'text', description: 'text' });
reportSchema.index({ createdAt: -1 });

// Méthode pour formater le rapport pour l'API
reportSchema.methods.toJSON = function() {
  const report = this.toObject();
  report.id = report._id;
  delete report._id;
  delete report.__v;
  return report;
};

// Méthode statique pour recherche géographique
reportSchema.statics.findNearby = function(coordinates, maxDistanceKm = 10, filters = {}) {
  const query = {
    'location.geo': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude],
        },
        $maxDistance: maxDistanceKm * 1000, // Convertir en mètres
      },
    },
    moderationStatus: 'approved',
    status: 'active',
    ...filters,
  };
  
  return this.find(query);
};

module.exports = mongoose.model('Report', reportSchema);
