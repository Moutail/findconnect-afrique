const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const Organization = require('../../../../shared/models/Organization');
const User = require('../../../../shared/models/User');
const { authenticate } = require('../../../../shared/middleware');

// GET /api/organizations/:id - Détails d'une organisation
router.get('/:id', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).populate('createdBy', 'firstName lastName phone');
    if (!org) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    res.json({ organization: org });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/organizations/:id/verification/submit - (Re)soumettre les documents de vérification
router.post('/:id/verification/submit', authenticate, [
  body('registrationNumber').optional().trim(),
  body('taxId').optional().trim(),
  body('documentUrls').isArray().withMessage('documentUrls doit être un tableau'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    const isMember = org.members.find(
      m => m.userId.toString() === req.user.id && (m.role === 'owner' || m.role === 'admin')
    );
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { registrationNumber, taxId, documentUrls } = req.body;

    org.verificationDocuments = {
      registrationNumber: registrationNumber || org.verificationDocuments?.registrationNumber,
      taxId: taxId || org.verificationDocuments?.taxId,
      documentUrls,
    };
    org.verificationStatus = 'pending';
    org.canPost = false;
    org.rejectionReason = null;
    org.verifiedAt = null;
    org.verifiedBy = null;
    await org.save();

    res.status(201).json({
      message: 'Demande de vérification soumise',
      organization: org,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/organizations/:id - Modifier une organisation
router.put('/:id', authenticate, [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
], async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    // Vérifier que l'utilisateur est propriétaire ou admin
    const isMember = org.members.find(
      m => m.userId.toString() === req.user.id && (m.role === 'owner' || m.role === 'admin')
    );
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const allowedFields = ['name', 'legalName', 'description', 'phone', 'email', 'website', 'address', 'logo', 'banner', 'emergencyContact'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        org[field] = req.body[field];
      }
    });

    await org.save();
    res.json({ message: 'Organisation mise à jour', organization: org });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// GET /api/organizations - Liste des organisations (publiques, approuvées)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, city, search } = req.query;
    const filter = { verificationStatus: 'approved', status: 'active' };

    if (type) filter.type = type;
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (search) filter.$text = { $search: search };

    const total = await Organization.countDocuments(filter);
    const organizations = await Organization.find(filter)
      .select('name type logo address description stats')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      organizations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
