const mongoose = require('../mongoose');

const supportRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  contactPhone: {
    type: String,
    required: true,
  },
  contactName: {
    type: String,
    required: true,
  },

  requestType: {
    type: String,
    enum: ['publication_help', 'account_help', 'history_request', 'other'],
    required: true,
  },

  description: {
    type: String,
    maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères'],
  },

  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    default: 'pending',
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  notes: String,
  resolvedAt: Date,
}, {
  timestamps: true,
});

supportRequestSchema.index({ status: 1 });
supportRequestSchema.index({ userId: 1 });

module.exports = mongoose.model('SupportRequest', supportRequestSchema);
