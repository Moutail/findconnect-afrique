const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Participants (2 utilisateurs)
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  
  // Rapport associé (optionnel - pour les conversations liées à un signalement)
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
  },
  
  // Dernier message (pour affichage dans la liste)
  lastMessage: {
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    sentAt: Date,
  },
  
  // Compteur de messages non lus par participant
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map(),
  },
  
  // Statut
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active',
  },
  
  // Qui a bloqué (si bloqué)
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
}, {
  timestamps: true,
});

// Index
conversationSchema.index({ participants: 1 });
conversationSchema.index({ reportId: 1 });
conversationSchema.index({ updatedAt: -1 });

// Méthode pour obtenir l'autre participant
conversationSchema.methods.getOtherParticipant = function(userId) {
  return this.participants.find(p => p.toString() !== userId.toString());
};

module.exports = mongoose.model('Conversation', conversationSchema);
