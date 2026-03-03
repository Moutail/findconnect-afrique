const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const Conversation = require('../../../../shared/models/Conversation');
const Message = require('../../../../shared/models/Message');
const { authenticate } = require('../../../../shared/middleware');

// GET /api/conversations - Liste des conversations
router.get('/', authenticate, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
      status: { $ne: 'blocked' },
    })
      .populate('participants', 'firstName lastName photoURL')
      .populate('publicationId', 'title type mainCategory')
      .sort({ updatedAt: -1 });

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/conversations/:id - Détails d'une conversation
router.get('/:id', authenticate, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'firstName lastName photoURL phone')
      .populate('publicationId', 'title type mainCategory images');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    // Vérifier que l'utilisateur fait partie de la conversation
    const isParticipant = conversation.participants.some(
      p => p._id.toString() === req.user.id
    );
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/conversations/:id/messages - Messages d'une conversation
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === req.user.id
    );
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const total = await Message.countDocuments({
      conversationId: req.params.id,
      isDeleted: false,
    });

    const messages = await Message.find({
      conversationId: req.params.id,
      isDeleted: false,
    })
      .populate('senderId', 'firstName lastName photoURL')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Marquer comme lus
    await Message.updateMany(
      {
        conversationId: req.params.id,
        senderId: { $ne: req.user.id },
        'readBy.userId': { $ne: req.user.id },
      },
      {
        $push: { readBy: { userId: req.user.id, readAt: new Date() } },
      }
    );

    // Réinitialiser le compteur de non-lus
    conversation.unreadCount.set(req.user.id, 0);
    await conversation.save();

    res.json({
      messages: messages.reverse(),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/conversations/:id/messages - Envoyer un message
router.post('/:id/messages', authenticate, [
  body('type').isIn(['text', 'image', 'audio', 'video']).withMessage('Type de message invalide'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === req.user.id
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    if (conversation.status === 'blocked') {
      return res.status(403).json({ error: 'Cette conversation est bloquée' });
    }

    const { type, content, attachment } = req.body;

    // Validation selon le type
    if (type === 'text' && (!content || content.trim() === '')) {
      return res.status(400).json({ error: 'Le contenu du message est requis' });
    }
    if (['image', 'audio', 'video'].includes(type) && !attachment) {
      return res.status(400).json({ error: 'Le fichier est requis pour ce type de message' });
    }

    const message = new Message({
      conversationId: conversation._id,
      senderId: req.user.id,
      content: content || '',
      type,
      attachment,
    });

    await message.save();

    // Mettre à jour la conversation
    conversation.lastMessage = {
      content: type === 'text' ? content : `[${type}]`,
      type,
      senderId: req.user.id,
      sentAt: new Date(),
    };

    // Incrémenter le compteur de non-lus pour l'autre participant
    const otherParticipant = conversation.getOtherParticipant(req.user.id);
    if (otherParticipant) {
      const currentCount = conversation.unreadCount.get(otherParticipant.toString()) || 0;
      conversation.unreadCount.set(otherParticipant.toString(), currentCount + 1);
    }

    await conversation.save();

    // Peupler le message pour la réponse
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'firstName lastName photoURL');

    // Notifier via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversation._id}`).emit('new_message', {
        message: populatedMessage,
      });

      if (otherParticipant) {
        io.to(`user_${otherParticipant}`).emit('message_notification', {
          conversationId: conversation._id,
          message: populatedMessage,
        });
      }
    }

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

module.exports = router;
