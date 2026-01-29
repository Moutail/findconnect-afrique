const express = require('express');
const { body, param, query } = require('express-validator');
const User = require('../models/User');
const Report = require('../models/Report');
const Organization = require('../models/Organization');
const VerificationRequest = require('../models/VerificationRequest');
const { auth, isModerator, isAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// ============ MODERATION DES SIGNALEMENTS ============

// GET /api/admin/reports/pending - Signalements en attente de modération
router.get('/reports/pending', auth, isModerator, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const [reports, total] = await Promise.all([
      Report.find({ moderationStatus: 'pending' })
        .populate('createdBy', 'displayName photoURL email verificationStatus')
        .sort({ createdAt: 1 }) // Plus anciens d'abord
        .skip(skip)
        .limit(limit),
      Report.countDocuments({ moderationStatus: 'pending' }),
    ]);
    
    res.json({
      reports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Erreur get pending reports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// PUT /api/admin/reports/:id/moderate - Modérer un signalement
router.put('/reports/:id/moderate', auth, isModerator, [
  param('id').isMongoId().withMessage('ID invalide'),
  body('status').isIn(['approved', 'rejected']).withMessage('Statut invalide'),
], validate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Signalement non trouvé' });
    }
    
    report.moderationStatus = req.body.status;
    report.moderatedAt = new Date();
    report.moderatedBy = req.userId;
    report.moderationNotes = req.body.notes;
    
    await report.save();
    
    // Notifier le créateur
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${report.createdBy}`).emit('report_moderated', {
        reportId: report._id,
        status: req.body.status,
      });
    }
    
    res.json({ message: `Signalement ${req.body.status === 'approved' ? 'approuvé' : 'rejeté'}`, report });
  } catch (error) {
    console.error('Erreur moderate report:', error);
    res.status(500).json({ error: 'Erreur lors de la modération' });
  }
});

// ============ VERIFICATION DES UTILISATEURS ============

// GET /api/admin/verifications/pending - Demandes de vérification en attente
router.get('/verifications/pending', auth, isModerator, async (req, res) => {
  try {
    const requests = await VerificationRequest.find({
      status: { $in: ['pending', 'more_info_needed'] },
    })
      .populate('userId', 'displayName email photoURL createdAt')
      .sort({ createdAt: 1 });
    
    res.json({ requests });
  } catch (error) {
    console.error('Erreur get verification requests:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// PUT /api/admin/verifications/:id - Traiter une demande de vérification
router.put('/verifications/:id', auth, isModerator, [
  param('id').isMongoId().withMessage('ID invalide'),
  body('status').isIn(['approved', 'rejected', 'more_info_needed']).withMessage('Statut invalide'),
], validate, async (req, res) => {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    request.status = req.body.status;
    request.reviewedBy = req.userId;
    request.reviewedAt = new Date();
    request.reviewNotes = req.body.notes;
    
    if (req.body.status === 'rejected') {
      request.rejectionReason = req.body.rejectionReason;
    }
    
    if (req.body.status === 'more_info_needed') {
      request.additionalInfoRequested = req.body.additionalInfoRequested;
    }
    
    await request.save();
    
    // Mettre à jour le statut de l'utilisateur
    const user = await User.findById(request.userId);
    if (user) {
      if (req.body.status === 'approved') {
        user.verificationStatus = 'approved';
        user.verifiedAt = new Date();
        user.verifiedBy = req.userId;
      } else if (req.body.status === 'rejected') {
        user.verificationStatus = 'rejected';
      }
      await user.save();
      
      // Notifier l'utilisateur
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${user._id}`).emit('verification_update', {
          status: req.body.status,
        });
      }
    }
    
    res.json({ message: 'Demande traitée', request });
  } catch (error) {
    console.error('Erreur process verification:', error);
    res.status(500).json({ error: 'Erreur lors du traitement' });
  }
});

// ============ VERIFICATION DES ORGANISATIONS ============

// GET /api/admin/organizations/pending - Organisations en attente
router.get('/organizations/pending', auth, isModerator, async (req, res) => {
  try {
    const organizations = await Organization.find({
      verificationStatus: 'pending',
    })
      .populate('createdBy', 'displayName email')
      .sort({ createdAt: 1 });
    
    res.json({ organizations });
  } catch (error) {
    console.error('Erreur get pending organizations:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// PUT /api/admin/organizations/:id/verify - Vérifier une organisation
router.put('/organizations/:id/verify', auth, isModerator, [
  param('id').isMongoId().withMessage('ID invalide'),
  body('status').isIn(['approved', 'rejected']).withMessage('Statut invalide'),
], validate, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }
    
    organization.verificationStatus = req.body.status;
    organization.verifiedAt = new Date();
    organization.verifiedBy = req.userId;
    
    if (req.body.status === 'approved') {
      organization.canPost = true;
    }
    
    await organization.save();
    
    res.json({ message: `Organisation ${req.body.status === 'approved' ? 'vérifiée' : 'rejetée'}`, organization });
  } catch (error) {
    console.error('Erreur verify organization:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// ============ GESTION DES UTILISATEURS (Admin) ============

// GET /api/admin/users - Liste des utilisateurs
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const filter = {};
    
    if (search) {
      filter.$or = [
        { displayName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }
    
    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'banned') filter.isBanned = true;
    
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);
    
    res.json({
      users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Erreur get users:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// PUT /api/admin/users/:id/role - Changer le rôle d'un utilisateur
router.put('/users/:id/role', auth, isAdmin, [
  param('id').isMongoId().withMessage('ID invalide'),
  body('role').isIn(['user', 'moderator', 'admin']).withMessage('Rôle invalide'),
], validate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json({ message: 'Rôle mis à jour', user });
  } catch (error) {
    console.error('Erreur update role:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// PUT /api/admin/users/:id/ban - Bannir/Débannir un utilisateur
router.put('/users/:id/ban', auth, isAdmin, [
  param('id').isMongoId().withMessage('ID invalide'),
  body('banned').isBoolean().withMessage('Valeur invalide'),
], validate, async (req, res) => {
  try {
    const update = {
      isBanned: req.body.banned,
    };
    
    if (req.body.banned) {
      update.banReason = req.body.reason;
    } else {
      update.banReason = null;
    }
    
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json({ message: req.body.banned ? 'Utilisateur banni' : 'Utilisateur débanni', user });
  } catch (error) {
    console.error('Erreur ban user:', error);
    res.status(500).json({ error: 'Erreur lors de l\'opération' });
  }
});

// ============ STATISTIQUES ============

// GET /api/admin/stats - Statistiques globales
router.get('/stats', auth, isModerator, async (req, res) => {
  try {
    const [
      totalUsers,
      totalReports,
      pendingReports,
      totalOrganizations,
      pendingOrganizations,
      pendingVerifications,
      reportsToday,
      usersToday,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Report.countDocuments(),
      Report.countDocuments({ moderationStatus: 'pending' }),
      Organization.countDocuments(),
      Organization.countDocuments({ verificationStatus: 'pending' }),
      VerificationRequest.countDocuments({ status: 'pending' }),
      Report.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);
    
    // Statistiques par catégorie
    const reportsByCategory = await Report.aggregate([
      { $match: { moderationStatus: 'approved' } },
      { $group: { _id: '$mainCategory', count: { $sum: 1 } } },
    ]);
    
    res.json({
      users: {
        total: totalUsers,
        today: usersToday,
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
        today: reportsToday,
        byCategory: reportsByCategory,
      },
      organizations: {
        total: totalOrganizations,
        pending: pendingOrganizations,
      },
      verifications: {
        pending: pendingVerifications,
      },
    });
  } catch (error) {
    console.error('Erreur get stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

module.exports = router;
