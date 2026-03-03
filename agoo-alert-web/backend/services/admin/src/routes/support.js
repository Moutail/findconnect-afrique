const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const SupportRequest = require('../../../../shared/models/SupportRequest');
const Publication = require('../../../../shared/models/Publication');
const { authenticate, isAdmin } = require('../../../../shared/middleware');

// POST /api/support/request - Créer une demande de support (pour les personnes illettrées ou autres)
router.post('/request', [
  body('contactPhone').notEmpty().withMessage('Le numéro de téléphone est requis'),
  body('contactName').notEmpty().withMessage('Le nom est requis'),
  body('requestType').isIn(['publication_help', 'account_help', 'history_request', 'other'])
    .withMessage('Type de demande invalide'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contactPhone, contactName, requestType, description } = req.body;

    const supportRequest = new SupportRequest({
      userId: req.body.userId || null,
      contactPhone,
      contactName,
      requestType,
      description,
    });

    await supportRequest.save();

    res.status(201).json({
      message: 'Demande de support créée. Un agent vous contactera bientôt.',
      supportRequest: {
        id: supportRequest._id,
        status: supportRequest.status,
        createdAt: supportRequest.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la demande' });
  }
});

// POST /api/support/history-request - Demande d'historique d'objet trouvé
router.post('/history-request', [
  body('contactPhone').notEmpty().withMessage('Le numéro de téléphone est requis'),
  body('contactName').notEmpty().withMessage('Le nom est requis'),
  body('description').notEmpty().withMessage('Décrivez l\'objet recherché'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contactPhone, contactName, description } = req.body;

    // Rechercher dans les publications résolues
    const matchingPublications = await Publication.find({
      status: 'resolved',
      $text: { $search: description },
    })
      .limit(10)
      .sort({ resolvedAt: -1 });

    const supportRequest = new SupportRequest({
      contactPhone,
      contactName,
      requestType: 'history_request',
      description,
    });
    await supportRequest.save();

    res.json({
      message: matchingPublications.length > 0
        ? 'Résultats trouvés dans l\'historique'
        : 'Aucun résultat trouvé. Votre demande a été enregistrée, un agent vous contactera.',
      results: matchingPublications,
      supportRequest: { id: supportRequest._id },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/support/requests - Liste des demandes de support (admin)
router.get('/requests', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.requestType = type;

    const total = await SupportRequest.countDocuments(filter);
    const requests = await SupportRequest.find(filter)
      .populate('userId', 'firstName lastName phone')
      .populate('assignedTo', 'firstName lastName')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      supportRequests: requests,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/support/requests/:id - Mettre à jour une demande de support
router.put('/requests/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const request = await SupportRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Demande non trouvée' });

    if (status) request.status = status;
    if (notes) request.notes = notes;
    if (!request.assignedTo) request.assignedTo = req.user.id;
    if (status === 'resolved') request.resolvedAt = new Date();

    await request.save();

    res.json({ message: 'Demande mise à jour', supportRequest: request });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
