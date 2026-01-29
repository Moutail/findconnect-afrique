const express = require('express');
const { body, param, query } = require('express-validator');
const Report = require('../models/Report');
const ChatRequest = require('../models/ChatRequest');
const Conversation = require('../models/Conversation');
const { auth, optionalAuth, isModerator } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/reports/moderation - Liste des signalements pour modération
router.get('/moderation', auth, isModerator, [
  query('status').optional().isIn(['pending', 'approved', 'rejected']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req, res) => {
  try {
    const moderationStatus = req.query.status || 'pending';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = { moderationStatus };

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('createdBy', 'displayName photoURL verificationStatus phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
    ]);

    res.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur get moderation reports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des signalements (modération)' });
  }
});

// GET /api/reports - Liste des signalements
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('category').optional(),
  query('status').optional(),
  query('city').optional(),
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat(),
  query('radius').optional().isFloat({ min: 1, max: 100 }),
], validate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Construire le filtre
    const filter = {
      moderationStatus: 'approved',
      status: 'active',
    };
    
    if (req.query.category) {
      filter.mainCategory = req.query.category;
    }
    
    if (req.query.city) {
      filter['location.city'] = new RegExp(req.query.city, 'i');
    }
    
    // Recherche géographique
    if (req.query.lat && req.query.lng) {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      const radius = parseFloat(req.query.radius) || 10; // km
      
      filter['location.coordinates'] = {
        $geoWithin: {
          $centerSphere: [[lng, lat], radius / 6378.1], // Rayon de la Terre en km
        },
      };
    }
    
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('createdBy', 'displayName photoURL verificationStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
    ]);
    
    res.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur get reports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des signalements' });
  }
});

// PUT /api/reports/:id/moderation - Modifier l'état de modération (approve/reject)
router.put('/:id/moderation', auth, isModerator, [
  param('id').isMongoId().withMessage('ID invalide'),
  body('moderationStatus').isIn(['pending', 'approved', 'rejected']).withMessage('Statut de modération invalide'),
  body('rejectionReason').optional().isString().isLength({ max: 500 }),
], validate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Signalement non trouvé' });
    }

    report.moderationStatus = req.body.moderationStatus;
    report.moderatedAt = new Date();
    report.moderatedBy = req.userId;
    report.rejectionReason =
      req.body.moderationStatus === 'rejected' ? (req.body.rejectionReason || 'rejected') : null;

    await report.save();
    await report.populate('createdBy', 'displayName photoURL verificationStatus');

    res.json({ message: 'Modération mise à jour', report });
  } catch (error) {
    console.error('Erreur update moderation:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la modération' });
  }
});

// GET /api/reports/my - Mes signalements
router.get('/my', auth, async (req, res) => {
  try {
    const reports = await Report.find({ createdBy: req.userId })
      .sort({ createdAt: -1 });
    
    res.json({ reports });
    
  } catch (error) {
    console.error('Erreur get my reports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de vos signalements' });
  }
});

// GET /api/reports/search - Recherche
router.get('/search', optionalAuth, [
  query('q').notEmpty().withMessage('Terme de recherche requis'),
], validate, async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filter = {
      $text: { $search: q },
      moderationStatus: 'approved',
      status: 'active',
    };
    
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('createdBy', 'displayName photoURL')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
    ]);
    
    res.json({
      reports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
    
  } catch (error) {
    console.error('Erreur search reports:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

// GET /api/reports/:id - Détail d'un signalement
router.get('/:id', optionalAuth, [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('createdBy', 'displayName photoURL verificationStatus phone')
      .populate('organizationId', 'name logo verificationStatus');
    
    if (!report) {
      return res.status(404).json({ error: 'Signalement non trouvé' });
    }
    
    // Vérifier l'accès
    const isOwner = req.userId && report.createdBy._id.toString() === req.userId.toString();
    const isMod = req.user && (req.user.role === 'moderator' || req.user.role === 'admin');
    
    if (report.moderationStatus !== 'approved' && !isOwner && !isMod) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    // Incrémenter les vues
    if (!isOwner) {
      await Report.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    }
    
    res.json({ report, isOwner });
    
  } catch (error) {
    console.error('Erreur get report:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du signalement' });
  }
});

// POST /api/reports - Créer un signalement
router.post('/', auth, [
  body('title').trim().notEmpty().withMessage('Le titre est requis'),
  body('description').trim().notEmpty().withMessage('La description est requise'),
  body('mainCategory').isIn(['lost', 'found', 'person', 'pet', 'vehicle', 'document', 'electronics', 'other']),
], validate, async (req, res) => {
  try {
    const {
      title,
      description,
      mainCategory,
      categoryMetadata,
      location,
      images,
      contactPreference,
      contactPhone,
      reward,
      incidentDate,
    } = req.body;

    const normalizedLocation = location && typeof location === 'object' ? { ...location } : undefined;
    const lat = normalizedLocation?.coordinates?.latitude;
    const lng = normalizedLocation?.coordinates?.longitude;
    if (typeof lat === 'number' && typeof lng === 'number') {
      normalizedLocation.geo = {
        type: 'Point',
        coordinates: [lng, lat],
      };
    }
    
    const report = new Report({
      title,
      description,
      mainCategory,
      categoryMetadata: { mainCategory, ...categoryMetadata },
      location: normalizedLocation,
      images: images || [],
      createdBy: req.userId,
      publishedBy: 'user',
      contactPreference: contactPreference || 'chat',
      contactPhone,
      reward,
      incidentDate,
      // Auto-approuver pour les utilisateurs vérifiés
      moderationStatus: req.user.verificationStatus === 'approved' ? 'approved' : 'pending',
    });
    
    await report.save();
    
    // Mettre à jour les stats utilisateur
    req.user.stats.reportsCreated += 1;
    await req.user.save();
    
    await report.populate('createdBy', 'displayName photoURL verificationStatus');
    
    res.status(201).json({
      message: 'Signalement créé avec succès',
      report,
    });
    
  } catch (error) {
    console.error('Erreur create report:', error);
    res.status(500).json({ error: 'Erreur lors de la création du signalement' });
  }
});

// PUT /api/reports/:id - Modifier un signalement
router.put('/:id', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Signalement non trouvé' });
    }
    
    const isOwner = report.createdBy.toString() === req.userId.toString();
    const isMod = req.user.role === 'moderator' || req.user.role === 'admin';
    
    if (!isOwner && !isMod) {
      return res.status(403).json({ error: 'Non autorisé à modifier ce signalement' });
    }
    
    // Champs modifiables
    const allowedFields = ['title', 'description', 'categoryMetadata', 'location', 'images', 'contactPreference', 'contactPhone', 'reward', 'incidentDate'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        report[field] = req.body[field];
      }
    });
    
    // Remettre en modération si modifié par le propriétaire
    if (isOwner && !isMod && report.moderationStatus === 'approved') {
      report.moderationStatus = 'pending';
    }
    
    await report.save();
    
    res.json({
      message: 'Signalement mis à jour',
      report,
    });
    
  } catch (error) {
    console.error('Erreur update report:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du signalement' });
  }
});

// PUT /api/reports/:id/status - Changer le statut (résolu, fermé)
router.put('/:id/status', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
  body('status').isIn(['active', 'resolved', 'closed']).withMessage('Statut invalide'),
], validate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Signalement non trouvé' });
    }
    
    const isOwner = report.createdBy.toString() === req.userId.toString();
    const isMod = req.user.role === 'moderator' || req.user.role === 'admin';
    
    if (!isOwner && !isMod) {
      return res.status(403).json({ error: 'Non autorisé' });
    }
    
    report.status = req.body.status;
    
    if (req.body.status === 'resolved') {
      report.resolvedAt = new Date();
      req.user.stats.reportsResolved += 1;
      await req.user.save();
    }
    
    await report.save();
    
    res.json({ message: 'Statut mis à jour', report });
    
  } catch (error) {
    console.error('Erreur update status:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
});

// DELETE /api/reports/:id - Supprimer un signalement
router.delete('/:id', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Signalement non trouvé' });
    }
    
    const isOwner = report.createdBy.toString() === req.userId.toString();
    const isMod = req.user.role === 'moderator' || req.user.role === 'admin';
    
    if (!isOwner && !isMod) {
      return res.status(403).json({ error: 'Non autorisé à supprimer ce signalement' });
    }
    
    await report.deleteOne();
    
    res.json({ message: 'Signalement supprimé' });
    
  } catch (error) {
    console.error('Erreur delete report:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du signalement' });
  }
});

// ============ CHAT REQUESTS ============

// POST /api/reports/:id/chat-request - Demander à discuter
router.post('/:id/chat-request', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
  body('message').optional().trim().isLength({ max: 500 }),
], validate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Signalement non trouvé' });
    }
    
    // Ne pas pouvoir demander sur son propre signalement
    if (report.createdBy.toString() === req.userId.toString()) {
      return res.status(400).json({ error: 'Vous ne pouvez pas demander à discuter sur votre propre signalement' });
    }
    
    // Vérifier si une demande existe déjà
    const existingRequest = await ChatRequest.findOne({
      reportId: req.params.id,
      requesterId: req.userId,
    });
    
    if (existingRequest) {
      return res.status(400).json({
        error: 'Vous avez déjà envoyé une demande',
        status: existingRequest.status,
      });
    }
    
    const chatRequest = new ChatRequest({
      reportId: req.params.id,
      requesterId: req.userId,
      message: req.body.message,
    });
    
    await chatRequest.save();
    
    // Notifier le propriétaire du signalement via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${report.createdBy}`).emit('new_chat_request', {
        reportId: report._id,
        reportTitle: report.title,
        requesterId: req.userId,
        requesterName: req.user.displayName,
      });
    }
    
    res.status(201).json({
      message: 'Demande de discussion envoyée',
      chatRequest,
    });
    
  } catch (error) {
    console.error('Erreur chat request:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de la demande' });
  }
});

// GET /api/reports/:id/chat-requests - Liste des demandes de chat (pour le propriétaire)
router.get('/:id/chat-requests', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Signalement non trouvé' });
    }
    
    if (report.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Non autorisé' });
    }
    
    const requests = await ChatRequest.find({ reportId: req.params.id })
      .populate('requesterId', 'displayName photoURL verificationStatus')
      .sort({ createdAt: -1 });
    
    res.json({ requests });
    
  } catch (error) {
    console.error('Erreur get chat requests:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes' });
  }
});

// PUT /api/reports/:id/chat-requests/:requestId - Répondre à une demande
router.put('/:id/chat-requests/:requestId', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
  param('requestId').isMongoId().withMessage('ID de demande invalide'),
  body('status').isIn(['accepted', 'rejected']).withMessage('Statut invalide'),
], validate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Signalement non trouvé' });
    }
    
    if (report.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Non autorisé' });
    }
    
    const chatRequest = await ChatRequest.findById(req.params.requestId);
    
    if (!chatRequest || chatRequest.reportId.toString() !== req.params.id) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    if (chatRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée' });
    }
    
    chatRequest.status = req.body.status;
    chatRequest.respondedAt = new Date();
    chatRequest.responseMessage = req.body.responseMessage;
    
    // Si acceptée, créer une conversation
    if (req.body.status === 'accepted') {
      const conversation = new Conversation({
        participants: [req.userId, chatRequest.requesterId],
        reportId: report._id,
      });
      
      await conversation.save();
      chatRequest.conversationId = conversation._id;
    }
    
    await chatRequest.save();
    
    // Notifier le demandeur
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${chatRequest.requesterId}`).emit('chat_request_response', {
        reportId: report._id,
        reportTitle: report.title,
        status: req.body.status,
        conversationId: chatRequest.conversationId,
      });
    }
    
    res.json({
      message: req.body.status === 'accepted' ? 'Demande acceptée' : 'Demande refusée',
      chatRequest,
    });
    
  } catch (error) {
    console.error('Erreur respond chat request:', error);
    res.status(500).json({ error: 'Erreur lors de la réponse à la demande' });
  }
});

module.exports = router;
