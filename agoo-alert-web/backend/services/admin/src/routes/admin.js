const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const User = require('../../../../shared/models/User');
const Organization = require('../../../../shared/models/Organization');
const Publication = require('../../../../shared/models/Publication');
const Conversation = require('../../../../shared/models/Conversation');
const Message = require('../../../../shared/models/Message');
const VerificationRequest = require('../../../../shared/models/VerificationRequest');
const Notification = require('../../../../shared/models/Notification');
const { authenticate, isAdmin } = require('../../../../shared/middleware');
const { DEFAULT_PASSWORD } = require('../../../../shared/constants');

// ===================== GESTION DES UTILISATEURS =====================

// GET /api/admin/users - Liste des utilisateurs
router.get('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, status } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'banned') filter.isBanned = true;
    if (status === 'inactive') filter.isActive = false;
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      users: users.map(u => u.toFullProfile()),
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

// GET /api/admin/users/:id - Détails d'un utilisateur
router.get('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    let organization = null;
    if (user.organizationId) {
      organization = await Organization.findById(user.organizationId);
    }

    const publicationCount = await Publication.countDocuments({ createdBy: user._id });

    res.json({
      user: user.toFullProfile(),
      organization,
      stats: { publicationCount },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/users/:id/ban - Bannir/Débannir un utilisateur
router.put('/users/:id/ban', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Impossible de bannir un administrateur' });
    }

    user.isBanned = !user.isBanned;
    user.banReason = req.body.reason || '';
    if (user.isBanned) user.isActive = false;
    else user.isActive = true;
    await user.save();

    res.json({
      message: user.isBanned ? 'Utilisateur banni' : 'Utilisateur débanni',
      user: user.toFullProfile(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/users/:id/reset-password - Réinitialiser le mot de passe
router.put('/users/:id/reset-password', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    user.password = DEFAULT_PASSWORD;
    await user.save();

    res.json({
      message: `Mot de passe réinitialisé au mot de passe par défaut: ${DEFAULT_PASSWORD}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// DELETE /api/admin/users/:id - Supprimer un utilisateur
router.delete('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Impossible de supprimer un administrateur' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ===================== GESTION DES ORGANISATIONS =====================

// GET /api/admin/organizations - Liste des organisations
router.get('/organizations', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const filter = {};

    if (status) filter.verificationStatus = status;
    if (search) filter.$text = { $search: search };

    const total = await Organization.countDocuments(filter);
    const organizations = await Organization.find(filter)
      .populate('createdBy', 'firstName lastName phone')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      organizations,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/organizations/:id/verify - Approuver/Rejeter une organisation
router.put('/organizations/:id/verify', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, notes, rejectionReason } = req.body;
    if (!['approved', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organisation non trouvée' });

    org.verificationStatus = status;
    org.verifiedAt = new Date();
    org.verifiedBy = req.user.id;
    org.canPost = status === 'approved';
    if (status === 'rejected' || status === 'suspended') {
      org.rejectionReason = rejectionReason || notes || org.rejectionReason;
    } else if (status === 'approved') {
      org.rejectionReason = null;
    }
    await org.save();

    if (org.createdBy) {
      const title = status === 'approved'
        ? 'Organisation approuvée'
        : status === 'rejected'
          ? 'Organisation rejetée'
          : 'Organisation suspendue';
      const message = status === 'approved'
        ? `Votre organisation "${org.name}" a été approuvée.`
        : `Votre organisation "${org.name}" a été ${status === 'rejected' ? 'rejetée' : 'suspendue'}${org.rejectionReason ? ` : ${org.rejectionReason}` : ''}.`;

      await Notification.create({
        userId: org.createdBy,
        type: 'organization_verification',
        title,
        message,
        data: { organizationId: org._id, status, rejectionReason: org.rejectionReason },
      });
    }

    res.json({ message: `Organisation ${status}`, organization: org });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===================== VÉRIFICATIONS D'IDENTITÉ =====================

// GET /api/admin/verifications - Liste des demandes de vérification
router.get('/verifications', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total = await VerificationRequest.countDocuments(filter);
    const requests = await VerificationRequest.find(filter)
      .populate('userId', 'firstName lastName phone photoURL')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      verificationRequests: requests,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/verifications/:id - Traiter une demande de vérification
router.put('/verifications/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, rejectionReason, reviewNotes } = req.body;
    if (!['approved', 'rejected', 'more_info_needed'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const request = await VerificationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Demande non trouvée' });

    request.status = status;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason;
    request.reviewNotes = reviewNotes;
    await request.save();

    // Mettre à jour le statut de l'utilisateur
    const user = await User.findById(request.userId);
    if (user) {
      user.verificationStatus = status === 'more_info_needed' ? 'rejected' : status;
      if (status === 'approved') {
        user.verifiedAt = new Date();
        user.verifiedBy = req.user.id;
      }
      await user.save();

      const title = status === 'approved'
        ? 'Vérification d\'identité approuvée'
        : 'Vérification d\'identité rejetée';
      const message = status === 'approved'
        ? 'Votre identité a été vérifiée avec succès.'
        : `Votre demande de vérification a été rejetée${rejectionReason ? ` : ${rejectionReason}` : ''}. Veuillez soumettre une nouvelle demande.`;

      await Notification.create({
        userId: user._id,
        type: 'identity_verification',
        title,
        message,
        data: { verificationRequestId: request._id, status, rejectionReason },
      });
    }

    res.json({ message: `Demande ${status}`, verificationRequest: request });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===================== CONVERSATIONS (accès admin à toutes les discussions) =====================

// GET /api/admin/conversations - Toutes les conversations
router.get('/conversations', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const total = await Conversation.countDocuments();
    const conversations = await Conversation.find()
      .populate('participants', 'firstName lastName photoURL phone')
      .populate('publicationId', 'title type')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ updatedAt: -1 });

    res.json({
      conversations,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/conversations/:id/messages - Messages d'une conversation (admin)
router.get('/conversations/:id/messages', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const total = await Message.countDocuments({ conversationId: req.params.id });
    const messages = await Message.find({ conversationId: req.params.id })
      .populate('senderId', 'firstName lastName photoURL')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      messages: messages.reverse(),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===================== STATISTIQUES DASHBOARD =====================

// GET /api/admin/stats - Statistiques générales
router.get('/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalOrganizations,
      totalPublications,
      pendingPublications,
      pendingVerifications,
      activePublications,
      resolvedPublications,
      totalConversations,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Organization.countDocuments(),
      Publication.countDocuments(),
      Publication.countDocuments({ moderationStatus: 'pending' }),
      VerificationRequest.countDocuments({ status: 'pending' }),
      Publication.countDocuments({ status: 'active', moderationStatus: 'approved' }),
      Publication.countDocuments({ status: 'resolved' }),
      Conversation.countDocuments(),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalOrganizations,
        totalPublications,
        pendingPublications,
        pendingVerifications,
        activePublications,
        resolvedPublications,
        totalConversations,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
