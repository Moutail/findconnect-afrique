const mongoose = require('../mongoose');

const verificationRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  documents: {
    facePhoto: { type: String, required: true },
    idDocument: { type: String, required: true },
    idDocumentType: {
      type: String,
      enum: ['carte_identite', 'passport', 'permis_conduire', 'autre'],
      required: true,
    },
  },

  personalInfo: {
    fullName: String,
    dateOfBirth: Date,
    nationality: String,
    address: String,
    city: String,
    phone: String,
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'more_info_needed'],
    default: 'pending',
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
  reviewNotes: String,
  rejectionReason: String,
}, {
  timestamps: true,
});

verificationRequestSchema.index({ userId: 1 });
verificationRequestSchema.index({ status: 1 });

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);
