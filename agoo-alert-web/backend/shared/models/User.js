const mongoose = require('../mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Le numéro de téléphone est requis'],
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false,
  },
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères'],
  },
  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères'],
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
  },
  photoURL: String,

  accountType: {
    type: String,
    enum: ['individual', 'organization'],
    default: 'individual',
  },

  role: {
    type: String,
    enum: ['user', 'organization', 'moderator', 'admin'],
    default: 'user',
  },

  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
  },

  verificationStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none',
  },
  verificationDocuments: {
    facePhoto: String,
    idDocument: String,
    idDocumentType: {
      type: String,
      enum: ['carte_identite', 'passport', 'permis_conduire', 'autre'],
    },
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  preferredLocation: {
    city: String,
    region: String,
    country: { type: String, default: 'Togo' },
  },

  stats: {
    publicationsCreated: { type: Number, default: 0 },
    publicationsResolved: { type: Number, default: 0 },
  },

  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: String,

  lastLoginAt: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, {
  timestamps: true,
});

userSchema.index({ phone: 1 });
userSchema.index({ firstName: 'text', lastName: 'text' });
userSchema.index({ role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    photoURL: this.photoURL,
    accountType: this.accountType,
    verificationStatus: this.verificationStatus,
    createdAt: this.createdAt,
  };
};

userSchema.methods.toFullProfile = function () {
  return {
    id: this._id,
    phone: this.phone,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    photoURL: this.photoURL,
    accountType: this.accountType,
    role: this.role,
    organizationId: this.organizationId,
    verificationStatus: this.verificationStatus,
    preferredLocation: this.preferredLocation,
    stats: this.stats,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);
