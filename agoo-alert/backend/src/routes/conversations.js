const express = require('express');
const { body, param } = require('express-validator');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/conversations - Liste des conversations
router.get('/', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
      status: { $ne: 'blocked' },
    })
      .populate('participants', 'displayName photoURL verificationStatus')
      .populate('reportId', 'title mainCategory')
      .sort({ updatedAt: -1 });
    
    // Ajouter les informations de l'autre participant
    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(
        p => p._id.toString() !== req.userId.toString()
      );
      
      return {
        id: conv._id,
        otherParticipant,
        report: conv.reportId,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount.get(req.userId.toString()) || 0,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
      };
    });
    
    res.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Erreur get conversations:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des conversations' });
  }
});

// GET /api/conversations/:id - Détail d'une conversation
router.get('/:id', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'displayName photoURL verificationStatus phone')
      .populate('reportId', 'title mainCategory images');
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }
    
    // Vérifier que l'utilisateur est participant
    const isParticipant = conversation.participants.some(
      p => p._id.toString() === req.userId.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    // Marquer comme lu
    conversation.unreadCount.set(req.userId.toString(), 0);
    await conversation.save();
    
    const otherParticipant = conversation.participants.find(
      p => p._id.toString() !== req.userId.toString()
    );
    
    res.json({
      conversation: {
        id: conversation._id,
        otherParticipant,
        report: conversation.reportId,
        status: conversation.status,
        createdAt: conversation.createdAt,
      },
    });
  } catch (error) {
    console.error('Erreur get conversation:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la conversation' });
  }
});

// GET /api/conversations/:id/messages - Messages d'une conversation
router.get('/:id/messages', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }
    
    const isParticipant = conversation.participants.some(
      p => p.toString() === req.userId.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const [messages, total] = await Promise.all([
      Message.find({
        conversationId: req.params.id,
        isDeleted: false,
      })
        .populate('senderId', 'displayName photoURL')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({
        conversationId: req.params.id,
        isDeleted: false,
      }),
    ]);
    
    // Marquer les messages comme lus
    await Message.updateMany(
      {
        conversationId: req.params.id,
        senderId: { $ne: req.userId },
        'readBy.userId': { $ne: req.userId },
      },
      {
        $push: { readBy: { userId: req.userId, readAt: new Date() } },
      }
    );
    
    // Reset le compteur non lu
    conversation.unreadCount.set(req.userId.toString(), 0);
    await conversation.save();
    
    res.json({
      messages: messages.reverse(), // Ordre chronologique
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Erreur get messages:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
});

// POST /api/conversations/:id/messages - Envoyer un message
router.post('/:id/messages', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
  body('content').trim().notEmpty().withMessage('Le message ne peut pas être vide'),
], validate, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }
    
    const isParticipant = conversation.participants.some(
      p => p.toString() === req.userId.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    if (conversation.status === 'blocked') {
      return res.status(403).json({ error: 'Cette conversation est bloquée' });
    }
    
    const message = new Message({
      conversationId: req.params.id,
      senderId: req.userId,
      content: req.body.content,
      type: req.body.type || 'text',
      attachment: req.body.attachment,
      location: req.body.location,
    });
    
    await message.save();
    await message.populate('senderId', 'displayName photoURL');
    
    // Mettre à jour la conversation
    conversation.lastMessage = {
      content: req.body.content,
      senderId: req.userId,
      sentAt: new Date(),
    };
    
    // Incrémenter le compteur non lu pour l'autre participant
    const otherParticipantId = conversation.participants.find(
      p => p.toString() !== req.userId.toString()
    );
    
    const currentUnread = conversation.unreadCount.get(otherParticipantId.toString()) || 0;
    conversation.unreadCount.set(otherParticipantId.toString(), currentUnread + 1);
    
    await conversation.save();
    
    // Émettre via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${req.params.id}`).emit('new_message', {
        conversationId: req.params.id,
        message,
      });
      
      // Notifier l'autre participant
      io.to(`user_${otherParticipantId}`).emit('message_notification', {
        conversationId: req.params.id,
        senderName: req.user.displayName,
        preview: req.body.content.substring(0, 50),
      });
    }
    
    res.status(201).json({ message });
  } catch (error) {
    console.error('Erreur send message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

// DELETE /api/conversations/:id/messages/:messageId - Supprimer un message
router.delete('/:id/messages/:messageId', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
  param('messageId').isMongoId().withMessage('ID message invalide'),
], validate, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message || message.conversationId.toString() !== req.params.id) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }
    
    if (message.senderId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres messages' });
    }
    
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'Message supprimé';
    await message.save();
    
    // Notifier via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${req.params.id}`).emit('message_deleted', {
        conversationId: req.params.id,
        messageId: req.params.messageId,
      });
    }
    
    res.json({ message: 'Message supprimé' });
  } catch (error) {
    console.error('Erreur delete message:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du message' });
  }
});

// PUT /api/conversations/:id/block - Bloquer une conversation
router.put('/:id/block', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }
    
    const isParticipant = conversation.participants.some(
      p => p.toString() === req.userId.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    conversation.status = 'blocked';
    conversation.blockedBy = req.userId;
    await conversation.save();
    
    res.json({ message: 'Conversation bloquée' });
  } catch (error) {
    console.error('Erreur block conversation:', error);
    res.status(500).json({ error: 'Erreur lors du blocage' });
  }
});

// POST /api/conversations/start - Démarrer une nouvelle conversation
router.post('/start', auth, [
  body('userId').isMongoId().withMessage('ID utilisateur invalide'),
], validate, async (req, res) => {
  try {
    const { userId, reportId } = req.body;
    
    if (userId === req.userId.toString()) {
      return res.status(400).json({ error: 'Vous ne pouvez pas démarrer une conversation avec vous-même' });
    }
    
    // Vérifier si une conversation existe déjà
    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, userId] },
      ...(reportId && { reportId }),
    });
    
    if (conversation) {
      return res.json({ conversation, existing: true });
    }
    
    // Créer une nouvelle conversation
    conversation = new Conversation({
      participants: [req.userId, userId],
      reportId,
    });
    
    await conversation.save();
    await conversation.populate('participants', 'displayName photoURL');
    
    res.status(201).json({ conversation, existing: false });
  } catch (error) {
    console.error('Erreur start conversation:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la conversation' });
  }
});

module.exports = router;
