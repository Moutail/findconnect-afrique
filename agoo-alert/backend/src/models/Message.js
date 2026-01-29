const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Contenu
  content: {
    type: String,
    required: [true, 'Le contenu du message est requis'],
    maxlength: [2000, 'Le message ne peut pas dépasser 2000 caractères'],
  },
  
  // Type de message
  type: {
    type: String,
    enum: ['text', 'image', 'location', 'system'],
    default: 'text',
  },
  
  // Pièce jointe (image, etc.)
  attachment: {
    url: String,
    type: String,
    name: String,
  },
  
  // Localisation partagée
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  
  // Statut de lecture
  readBy: [{
    userId: mongoose.Schema.Types.ObjectId,
    readAt: Date,
  }],
  
  // Suppression
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  
}, {
  timestamps: true,
});

// Index
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

module.exports = mongoose.model('Message', messageSchema);
