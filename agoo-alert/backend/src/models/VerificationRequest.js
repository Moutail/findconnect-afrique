const mongoose = require('mongoose');

const verificationRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Documents de vérification
  documents: {
    idCard: String, // URL de la carte d'identité
    selfie: String, // URL du selfie avec la carte
    proofOfAddress: String, // URL de justificatif de domicile
    other: [String],
  },
  
  // Informations personnelles
  personalInfo: {
    fullName: String,
    dateOfBirth: Date,
    nationality: String,
    address: String,
    city: String,
    phone: String,
  },
  
  // Statut
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'more_info_needed'],
    default: 'pending',
  },
  
  // Modération
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
  reviewNotes: String,
  rejectionReason: String,
  
  // Demandes d'informations supplémentaires
  additionalInfoRequested: String,
  additionalInfoProvided: String,
  
}, {
  timestamps: true,
});

// Index
verificationRequestSchema.index({ userId: 1 });
verificationRequestSchema.index({ status: 1 });

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);
