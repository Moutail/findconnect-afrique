const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const Publication = require('../../../../shared/models/Publication');
const User = require('../../../../shared/models/User');
const Organization = require('../../../../shared/models/Organization');
const { authenticate, isVerified } = require('../../../../shared/middleware');

// GET /api/publications - Liste des publications approuvées et actives
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      city,
      search,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const filter = {
      moderationStatus: 'approved',
      status: 'active',
    };

    if (type) filter.type = type;
    if (category) filter.mainCategory = category;
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (search) filter.$text = { $search: search };

    const total = await Publication.countDocuments(filter);
    const publications = await Publication.find(filter)
      .populate('createdBy', 'firstName lastName photoURL accountType')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 });

    res.json({
      publications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasMore: parseInt(page) * parseInt(limit) < total,
      },
    });
  } catch (error) {
    console.error('List publications error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/publications/:id - Détails d'une publication
router.get('/:id', async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id)
      .populate('createdBy', 'firstName lastName photoURL accountType phone');

    if (!publication) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }

    // Incrémenter les vues
    publication.views += 1;
    await publication.save();

    res.json({ publication });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/publications - Créer une publication
router.post('/', authenticate, [
  body('title').notEmpty().trim().withMessage('Le titre est requis'),
  body('description').notEmpty().withMessage('La description est requise'),
  body('type').isIn(['lost', 'found']).withMessage('Le type doit être "lost" ou "found"'),
  body('mainCategory').isIn(['person', 'object', 'animal', 'document', 'electronics', 'vehicle', 'other'])
    .withMessage('Catégorie invalide'),
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

    const {
      title, description, type, mainCategory, details,
      location, images, contactPreference, contactPhone,
      reward, incidentDate, organizationId,
    } = req.body;

    let publishedBy = 'individual';
    let moderationStatus = 'pending';
    let orgName = null;

    // Si publication par une organisation
    if (user.accountType === 'organization' && (organizationId || user.organizationId)) {
      const orgId = organizationId || user.organizationId;
      const org = await Organization.findById(orgId);

      if (!org) {
        return res.status(404).json({ error: 'Organisation non trouvée' });
      }

      if (org.verificationStatus !== 'approved' || !org.canPost) {
        return res.status(403).json({
          error: 'Votre organisation doit être approuvée avant de publier',
          code: 'ORG_VERIFICATION_REQUIRED',
          verificationStatus: org.verificationStatus,
          rejectionReason: org.rejectionReason,
        });
      }

      publishedBy = 'organization';
      orgName = org.name;
      // Les organisations publient directement sans modération
      moderationStatus = 'approved';
    } else {
      // Utilisateur simple : vérifier que l'identité est confirmée
      if (user.verificationStatus !== 'approved') {
        return res.status(403).json({
          error: 'Vous devez d\'abord vérifier votre identité avant de publier',
          code: 'VERIFICATION_REQUIRED',
        });
      }
      // Publication d'un utilisateur simple = en attente de modération
      moderationStatus = 'pending';
    }

    const publication = new Publication({
      title,
      description,
      type,
      mainCategory,
      details,
      location,
      images: images || [],
      createdBy: user._id,
      publishedBy,
      organizationId: publishedBy === 'organization' ? (organizationId || user.organizationId) : undefined,
      organizationName: orgName,
      moderationStatus,
      contactPreference: contactPreference || 'chat',
      contactPhone,
      reward,
      incidentDate,
    });

    await publication.save();

    // Mettre à jour les stats
    user.stats.publicationsCreated += 1;
    await user.save();

    res.status(201).json({
      message: moderationStatus === 'approved'
        ? 'Publication créée et publiée avec succès'
        : 'Publication créée, en attente de validation par un administrateur',
      publication,
    });
  } catch (error) {
    console.error('Create publication error:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la publication' });
  }
});

// PUT /api/publications/:id - Modifier une publication
router.put('/:id', authenticate, async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }

    if (publication.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const allowedFields = [
      'title', 'description', 'details', 'location', 'images',
      'contactPreference', 'contactPhone', 'reward', 'incidentDate',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        publication[field] = req.body[field];
      }
    });

    // Si modifié par un utilisateur simple, repasser en modération
    if (req.user.role !== 'admin' && publication.publishedBy === 'individual') {
      publication.moderationStatus = 'pending';
    }

    await publication.save();
    res.json({ message: 'Publication mise à jour', publication });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// PUT /api/publications/:id/resolve - Marquer comme trouvé/résolu
router.put('/:id/resolve', authenticate, async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }

    if (publication.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    publication.status = 'resolved';
    publication.resolvedAt = new Date();
    await publication.save();

    // Mettre à jour les stats de l'utilisateur
    const user = await User.findById(publication.createdBy);
    if (user) {
      user.stats.publicationsResolved += 1;
      await user.save();
    }

    res.json({ message: 'Publication marquée comme résolue', publication });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/publications/:id - Supprimer une publication
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }

    if (publication.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await Publication.findByIdAndDelete(req.params.id);
    res.json({ message: 'Publication supprimée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// GET /api/publications/my/list - Mes publications
router.get('/my/list', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { createdBy: req.user.id };
    if (status) filter.status = status;

    const total = await Publication.countDocuments(filter);
    const publications = await Publication.find(filter)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      publications,
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

module.exports = router;
