const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const ChatRequest = require('../../../../shared/models/ChatRequest');
const Conversation = require('../../../../shared/models/Conversation');
const Publication = require('../../../../shared/models/Publication');
const User = require('../../../../shared/models/User');
const { authenticate } = require('../../../../shared/middleware');

// POST /api/chat/requests - Envoyer une invitation de chat (celui qui a trouvé -> celui qui a perdu)
router.post('/requests', authenticate, [
  body('publicationId').notEmpty().withMessage('L\'ID de la publication est requis'),
  body('message').optional().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { publicationId, message } = req.body;

    const publication = await Publication.findById(publicationId);
    if (!publication) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }

    // Ne peut pas s'envoyer une invitation à soi-même
    if (publication.createdBy.toString() === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas envoyer une invitation pour votre propre publication' });
    }

    // Vérifier qu'une demande n'existe pas déjà
    const existing = await ChatRequest.findOne({
      publicationId,
      requesterId: req.user.id,
    });
    if (existing) {
      return res.status(409).json({ error: 'Vous avez déjà envoyé une invitation pour cette publication' });
    }

    const chatRequest = new ChatRequest({
      publicationId,
      requesterId: req.user.id,
      targetUserId: publication.createdBy,
      message,
    });

    await chatRequest.save();

    // Notifier via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${publication.createdBy}`).emit('new_chat_request', {
        chatRequest: await chatRequest.populate('requesterId', 'firstName lastName photoURL'),
      });
    }

    res.status(201).json({
      message: 'Invitation envoyée avec succès',
      chatRequest,
    });
  } catch (error) {
    console.error('Chat request error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'invitation' });
  }
});

// GET /api/chat/requests/received - Invitations reçues
router.get('/requests/received', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { targetUserId: req.user.id };
    if (status) filter.status = status;

    const total = await ChatRequest.countDocuments(filter);
    const requests = await ChatRequest.find(filter)
      .populate('requesterId', 'firstName lastName photoURL')
      .populate('publicationId', 'title type mainCategory images')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      requests,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/chat/requests/sent - Invitations envoyées
router.get('/requests/sent', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { requesterId: req.user.id };
    if (status) filter.status = status;

    const total = await ChatRequest.countDocuments(filter);
    const requests = await ChatRequest.find(filter)
      .populate('targetUserId', 'firstName lastName photoURL')
      .populate('publicationId', 'title type mainCategory images')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      requests,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/chat/requests/:id/accept - Accepter une invitation
router.put('/requests/:id/accept', authenticate, [
  body('responseMessage').optional().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const chatRequest = await ChatRequest.findById(req.params.id);
    if (!chatRequest) {
      return res.status(404).json({ error: 'Invitation non trouvée' });
    }

    if (chatRequest.targetUserId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    if (chatRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Cette invitation a déjà été traitée' });
    }

    // Créer la conversation
    const conversation = new Conversation({
      participants: [chatRequest.requesterId, chatRequest.targetUserId],
      publicationId: chatRequest.publicationId,
      chatRequestId: chatRequest._id,
    });
    await conversation.save();

    // Mettre à jour la demande
    chatRequest.status = 'accepted';
    chatRequest.respondedAt = new Date();
    chatRequest.responseMessage = req.body.responseMessage;
    chatRequest.conversationId = conversation._id;
    await chatRequest.save();

    // Notifier le demandeur via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${chatRequest.requesterId}`).emit('chat_request_accepted', {
        chatRequest,
        conversation,
      });
    }

    res.json({
      message: 'Invitation acceptée',
      conversation,
      chatRequest,
    });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/chat/requests/:id/reject - Rejeter une invitation
router.put('/requests/:id/reject', authenticate, [
  body('responseMessage').optional().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const chatRequest = await ChatRequest.findById(req.params.id);
    if (!chatRequest) {
      return res.status(404).json({ error: 'Invitation non trouvée' });
    }

    if (chatRequest.targetUserId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    if (chatRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Cette invitation a déjà été traitée' });
    }

    chatRequest.status = 'rejected';
    chatRequest.respondedAt = new Date();
    chatRequest.responseMessage = req.body.responseMessage;
    await chatRequest.save();

    res.json({ message: 'Invitation rejetée', chatRequest });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
