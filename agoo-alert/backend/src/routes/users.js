const express = require('express');
const { body, param } = require('express-validator');
const User = require('../models/User');
const VerificationRequest = require('../models/VerificationRequest');
const { auth, isModerator } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/users/profile - Obtenir son profil complet
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({ user: req.user.toFullProfile() });
  } catch (error) {
    console.error('Erreur get profile:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

// PUT /api/users/profile - Mettre à jour son profil
router.put('/profile', auth, [
  body('displayName').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('phone').optional().trim(),
  body('photoURL').optional().isURL().withMessage('URL invalide'),
], validate, async (req, res) => {
  try {
    const allowedFields = ['displayName', 'phone', 'photoURL', 'preferredLocation', 'notificationPreferences'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        req.user[field] = req.body[field];
      }
    });
    
    await req.user.save();
    
    res.json({
      message: 'Profil mis à jour',
      user: req.user.toFullProfile(),
    });
    
  } catch (error) {
    console.error('Erreur update profile:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

// POST /api/users/complete-onboarding - Marquer l'onboarding comme terminé
router.post('/complete-onboarding', auth, async (req, res) => {
  try {
    req.user.hasCompletedOnboarding = true;
    
    if (req.body.preferredLocation) {
      req.user.preferredLocation = req.body.preferredLocation;
    }
    
    await req.user.save();
    
    res.json({
      message: 'Onboarding terminé',
      user: req.user.toFullProfile(),
    });
    
  } catch (error) {
    console.error('Erreur complete onboarding:', error);
    res.status(500).json({ error: 'Erreur lors de la finalisation de l\'onboarding' });
  }
});

// POST /api/users/push-token - Enregistrer un push token
router.post('/push-token', auth, [
  body('pushToken').notEmpty().withMessage('Push token requis'),
], validate, async (req, res) => {
  try {
    const { pushToken } = req.body;
    
    if (!req.user.pushTokens.includes(pushToken)) {
      req.user.pushTokens.push(pushToken);
      await req.user.save();
    }
    
    res.json({ message: 'Push token enregistré' });
    
  } catch (error) {
    console.error('Erreur push token:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du push token' });
  }
});

// GET /api/users/:id - Obtenir le profil public d'un utilisateur
router.get('/:id', [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json({ user: user.toPublicProfile() });
    
  } catch (error) {
    console.error('Erreur get user:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
  }
});

// POST /api/users/verification-request - Soumettre une demande de vérification
router.post('/verification-request', auth, async (req, res) => {
  try {
    // Vérifier s'il y a déjà une demande en cours
    const existingRequest = await VerificationRequest.findOne({
      userId: req.userId,
      status: { $in: ['pending', 'more_info_needed'] },
    });
    
    if (existingRequest) {
      return res.status(400).json({ error: 'Une demande de vérification est déjà en cours' });
    }
    
    const { documents, personalInfo } = req.body;
    
    const verificationRequest = new VerificationRequest({
      userId: req.userId,
      documents,
      personalInfo,
    });
    
    await verificationRequest.save();
    
    // Mettre à jour le statut de l'utilisateur
    req.user.verificationStatus = 'pending';
    await req.user.save();
    
    res.status(201).json({
      message: 'Demande de vérification soumise',
      request: verificationRequest,
    });
    
  } catch (error) {
    console.error('Erreur verification request:', error);
    res.status(500).json({ error: 'Erreur lors de la soumission de la demande' });
  }
});

// GET /api/users/verification-request/status - Obtenir le statut de sa demande de vérification
router.get('/verification-request/status', auth, async (req, res) => {
  try {
    const request = await VerificationRequest.findOne({ userId: req.userId })
      .sort({ createdAt: -1 });
    
    if (!request) {
      return res.json({
        hasRequest: false,
        verificationStatus: req.user.verificationStatus,
      });
    }
    
    res.json({
      hasRequest: true,
      request: {
        id: request._id,
        status: request.status,
        rejectionReason: request.rejectionReason,
        additionalInfoRequested: request.additionalInfoRequested,
        createdAt: request.createdAt,
        reviewedAt: request.reviewedAt,
      },
      verificationStatus: req.user.verificationStatus,
    });
    
  } catch (error) {
    console.error('Erreur get verification status:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du statut' });
  }
});

// DELETE /api/users/account - Supprimer son compte
router.delete('/account', auth, [
  body('password').notEmpty().withMessage('Mot de passe requis pour confirmer'),
], validate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('+password');
    
    const isMatch = await user.comparePassword(req.body.password);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Mot de passe incorrect' });
    }
    
    // Désactiver le compte au lieu de le supprimer complètement
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();
    
    res.json({ message: 'Compte supprimé avec succès' });
    
  } catch (error) {
    console.error('Erreur delete account:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du compte' });
  }
});

module.exports = router;
