const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false, // Ne pas inclure par défaut dans les requêtes
  },
  displayName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères'],
  },
  phone: {
    type: String,
    trim: true,
  },
  photoURL: {
    type: String,
  },
  
  // Rôle et permissions
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user',
  },
  
  // Vérification d'identité
  verificationStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none',
  },
  verificationDocuments: [{
    type: String, // URLs des documents
  }],
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Localisation préférée
  preferredLocation: {
    city: String,
    region: String,
    country: { type: String, default: 'Togo' },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  
  // Préférences de notification
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
  
  // Push token pour notifications mobiles
  pushTokens: [String],
  
  // Statistiques
  stats: {
    reportsCreated: { type: Number, default: 0 },
    reportsResolved: { type: Number, default: 0 },
    helpfulResponses: { type: Number, default: 0 },
  },
  
  // Statut du compte
  isActive: {
    type: Boolean,
    default: true,
  },
  isBanned: {
    type: Boolean,
    default: false,
  },
  banReason: String,
  
  // Onboarding
  hasCompletedOnboarding: {
    type: Boolean,
    default: false,
  },
  
  // Token de réinitialisation de mot de passe
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Dernière connexion
  lastLoginAt: Date,
  
}, {
  timestamps: true, // createdAt, updatedAt
});

// Index pour la recherche
userSchema.index({ email: 1 });
userSchema.index({ displayName: 'text' });

// Hash du mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour générer le profil public (sans données sensibles)
userSchema.methods.toPublicProfile = function() {
  return {
    id: this._id,
    displayName: this.displayName,
    photoURL: this.photoURL,
    verificationStatus: this.verificationStatus,
    stats: this.stats,
    createdAt: this.createdAt,
  };
};

// Méthode pour le profil complet (pour l'utilisateur lui-même)
userSchema.methods.toFullProfile = function() {
  return {
    id: this._id,
    email: this.email,
    displayName: this.displayName,
    phone: this.phone,
    photoURL: this.photoURL,
    role: this.role,
    verificationStatus: this.verificationStatus,
    preferredLocation: this.preferredLocation,
    notificationPreferences: this.notificationPreferences,
    stats: this.stats,
    hasCompletedOnboarding: this.hasCompletedOnboarding,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);
