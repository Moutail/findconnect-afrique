const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const User = require('../../../../shared/models/User');
const VerificationRequest = require('../../../../shared/models/VerificationRequest');
const { authenticate } = require('../../../../shared/middleware');

// POST /api/verification/submit - Soumettre une demande de vérification d'identité
router.post('/submit', authenticate, [
  body('facePhoto').notEmpty().withMessage('La photo du visage est requise'),
  body('idDocument').notEmpty().withMessage('La photo de la pièce d\'identité est requise'),
  body('idDocumentType').isIn(['carte_identite', 'passport', 'permis_conduire', 'autre'])
    .withMessage('Type de document invalide'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.verificationStatus === 'approved') {
      return res.status(400).json({ error: 'Votre identité est déjà vérifiée' });
    }

    if (user.verificationStatus === 'pending') {
      return res.status(400).json({ error: 'Une demande de vérification est déjà en cours' });
    }

    const { facePhoto, idDocument, idDocumentType, personalInfo } = req.body;

    const verificationRequest = new VerificationRequest({
      userId: user._id,
      documents: {
        facePhoto,
        idDocument,
        idDocumentType,
      },
      personalInfo: personalInfo || {
        fullName: `${user.firstName} ${user.lastName}`,
        phone: user.phone,
      },
    });

    await verificationRequest.save();

    // Mettre à jour le statut de l'utilisateur
    user.verificationStatus = 'pending';
    user.verificationDocuments = { facePhoto, idDocument, idDocumentType };
    await user.save();

    res.status(201).json({
      message: 'Demande de vérification soumise avec succès',
      verificationRequest: {
        id: verificationRequest._id,
        status: verificationRequest.status,
        createdAt: verificationRequest.createdAt,
      },
    });
  } catch (error) {
    console.error('Verification submit error:', error);
    res.status(500).json({ error: 'Erreur lors de la soumission' });
  }
});

// GET /api/verification/status - Statut de la vérification
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const lastRequest = await VerificationRequest.findOne({ userId: user._id })
      .sort({ createdAt: -1 });

    res.json({
      verificationStatus: user.verificationStatus,
      lastRequest: lastRequest ? {
        id: lastRequest._id,
        status: lastRequest.status,
        rejectionReason: lastRequest.rejectionReason,
        createdAt: lastRequest.createdAt,
        reviewedAt: lastRequest.reviewedAt,
      } : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
