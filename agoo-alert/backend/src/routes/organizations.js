const express = require('express');
const { body, param } = require('express-validator');
const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');
const Report = require('../models/Report');
const { auth, isModerator } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { DEFAULT_PERMISSIONS } = require('../config/constants');

const router = express.Router();

// Middleware pour vérifier les permissions d'organisation
const checkOrgPermission = (permission) => async (req, res, next) => {
  try {
    const orgId = req.params.id || req.params.orgId;
    
    const member = await OrganizationMember.findOne({
      organizationId: orgId,
      userId: req.userId,
      status: 'active',
    });
    
    if (!member) {
      return res.status(403).json({ error: 'Vous n\'êtes pas membre de cette organisation' });
    }
    
    if (!member.permissions[permission]) {
      return res.status(403).json({ error: 'Permission insuffisante' });
    }
    
    req.orgMember = member;
    next();
  } catch (error) {
    console.error('Erreur check permission:', error);
    res.status(500).json({ error: 'Erreur de vérification des permissions' });
  }
};

// GET /api/organizations - Liste des organisations
router.get('/', async (req, res) => {
  try {
    const { type, city, verified, page = 1, limit = 20 } = req.query;
    
    const filter = { status: 'active' };
    
    if (type) filter.type = type;
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (verified === 'true') filter.verificationStatus = 'approved';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [organizations, total] = await Promise.all([
      Organization.find(filter)
        .select('-verificationDocuments')
        .sort({ 'stats.totalFollowers': -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Organization.countDocuments(filter),
    ]);
    
    res.json({
      organizations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Erreur get organizations:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des organisations' });
  }
});

// GET /api/organizations/my - Mes organisations
router.get('/my', auth, async (req, res) => {
  try {
    const memberships = await OrganizationMember.find({
      userId: req.userId,
      status: 'active',
    }).populate('organizationId');
    
    const organizations = memberships.map(m => ({
      ...m.organizationId.toObject(),
      memberRole: m.role,
      memberPermissions: m.permissions,
    }));
    
    res.json({ organizations });
  } catch (error) {
    console.error('Erreur get my organizations:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de vos organisations' });
  }
});

// GET /api/organizations/:id - Détail d'une organisation
router.get('/:id', [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
      .select('-verificationDocuments');
    
    if (!organization) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }
    
    res.json({ organization });
  } catch (error) {
    console.error('Erreur get organization:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'organisation' });
  }
});

// POST /api/organizations - Créer une organisation (demande)
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Le nom est requis'),
  body('legalName').trim().notEmpty().withMessage('Le nom légal est requis'),
  body('type').isIn(['transport_station', 'education_institution', 'healthcare_facility', 'government_office', 'business', 'ngo', 'religious_org', 'media', 'other']),
  body('email').isEmail().withMessage('Email invalide'),
  body('phone').notEmpty().withMessage('Le téléphone est requis'),
], validate, async (req, res) => {
  try {
    const organization = new Organization({
      ...req.body,
      createdBy: req.userId,
      verificationStatus: 'pending',
    });
    
    await organization.save();
    
    // Créer le membre fondateur avec rôle owner
    const member = new OrganizationMember({
      organizationId: organization._id,
      userId: req.userId,
      role: 'owner',
      permissions: DEFAULT_PERMISSIONS.owner,
      joinedAt: new Date(),
    });
    
    await member.save();
    
    res.status(201).json({
      message: 'Organisation créée. En attente de vérification.',
      organization,
    });
  } catch (error) {
    console.error('Erreur create organization:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'organisation' });
  }
});

// PUT /api/organizations/:id - Modifier une organisation
router.put('/:id', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, checkOrgPermission('canEditOrg'), async (req, res) => {
  try {
    const allowedFields = ['name', 'description', 'phone', 'website', 'address', 'logo', 'banner', 'photos', 'emergencyContact'];
    
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    
    res.json({ message: 'Organisation mise à jour', organization });
  } catch (error) {
    console.error('Erreur update organization:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// ============ MEMBRES ============

// GET /api/organizations/:id/members - Liste des membres
router.get('/:id/members', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, async (req, res) => {
  try {
    const members = await OrganizationMember.find({
      organizationId: req.params.id,
    }).populate('userId', 'displayName photoURL email');
    
    res.json({ members });
  } catch (error) {
    console.error('Erreur get members:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des membres' });
  }
});

// POST /api/organizations/:id/members - Ajouter un membre
router.post('/:id/members', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
  body('userId').isMongoId().withMessage('ID utilisateur invalide'),
  body('role').isIn(['admin', 'moderator', 'publisher', 'viewer']).withMessage('Rôle invalide'),
], validate, checkOrgPermission('canManageMembers'), async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    // Vérifier si déjà membre
    const existing = await OrganizationMember.findOne({
      organizationId: req.params.id,
      userId,
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Cet utilisateur est déjà membre' });
    }
    
    const member = new OrganizationMember({
      organizationId: req.params.id,
      userId,
      role,
      permissions: DEFAULT_PERMISSIONS[role],
      invitedBy: req.userId,
      invitedAt: new Date(),
      joinedAt: new Date(),
    });
    
    await member.save();
    await member.populate('userId', 'displayName photoURL email');
    
    res.status(201).json({ message: 'Membre ajouté', member });
  } catch (error) {
    console.error('Erreur add member:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du membre' });
  }
});

// PUT /api/organizations/:id/members/:memberId - Modifier un membre
router.put('/:id/members/:memberId', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
  param('memberId').isMongoId().withMessage('ID membre invalide'),
], validate, checkOrgPermission('canManageMembers'), async (req, res) => {
  try {
    const member = await OrganizationMember.findById(req.params.memberId);
    
    if (!member || member.organizationId.toString() !== req.params.id) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }
    
    // Ne pas pouvoir modifier le owner
    if (member.role === 'owner') {
      return res.status(403).json({ error: 'Impossible de modifier le propriétaire' });
    }
    
    if (req.body.role) {
      member.role = req.body.role;
      member.permissions = DEFAULT_PERMISSIONS[req.body.role];
    }
    
    if (req.body.permissions) {
      member.permissions = { ...member.permissions, ...req.body.permissions };
    }
    
    if (req.body.status) {
      member.status = req.body.status;
    }
    
    await member.save();
    
    res.json({ message: 'Membre mis à jour', member });
  } catch (error) {
    console.error('Erreur update member:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du membre' });
  }
});

// DELETE /api/organizations/:id/members/:memberId - Retirer un membre
router.delete('/:id/members/:memberId', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
  param('memberId').isMongoId().withMessage('ID membre invalide'),
], validate, checkOrgPermission('canManageMembers'), async (req, res) => {
  try {
    const member = await OrganizationMember.findById(req.params.memberId);
    
    if (!member || member.organizationId.toString() !== req.params.id) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }
    
    if (member.role === 'owner') {
      return res.status(403).json({ error: 'Impossible de retirer le propriétaire' });
    }
    
    await member.deleteOne();
    
    res.json({ message: 'Membre retiré' });
  } catch (error) {
    console.error('Erreur delete member:', error);
    res.status(500).json({ error: 'Erreur lors du retrait du membre' });
  }
});

// ============ PUBLICATIONS ============

// POST /api/organizations/:id/reports - Publier un signalement au nom de l'organisation
router.post('/:id/reports', auth, [
  param('id').isMongoId().withMessage('ID invalide'),
  body('title').trim().notEmpty().withMessage('Le titre est requis'),
  body('description').trim().notEmpty().withMessage('La description est requise'),
  body('mainCategory').isIn(['lost', 'found', 'person', 'pet', 'vehicle', 'document', 'electronics', 'other']),
], validate, checkOrgPermission('canPublish'), async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }
    
    if (organization.verificationStatus !== 'approved') {
      return res.status(403).json({ error: 'Organisation non vérifiée' });
    }
    
    if (!organization.canPost) {
      return res.status(403).json({ error: 'Cette organisation ne peut pas publier' });
    }
    
    const report = new Report({
      ...req.body,
      categoryMetadata: { mainCategory: req.body.mainCategory, ...req.body.categoryMetadata },
      createdBy: req.userId,
      publishedBy: 'organization',
      organizationId: organization._id,
      organizationName: organization.name,
      organizationLogo: organization.logo,
      isOfficialPost: true,
      // Auto-approuver pour les organisations vérifiées
      moderationStatus: 'approved',
    });
    
    await report.save();
    
    // Mettre à jour les stats de l'organisation
    organization.stats.totalPosts += 1;
    await organization.save();
    
    res.status(201).json({ message: 'Signalement publié', report });
  } catch (error) {
    console.error('Erreur create org report:', error);
    res.status(500).json({ error: 'Erreur lors de la publication' });
  }
});

// GET /api/organizations/:id/reports - Liste des publications de l'organisation
router.get('/:id/reports', [
  param('id').isMongoId().withMessage('ID invalide'),
], validate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const [reports, total] = await Promise.all([
      Report.find({
        organizationId: req.params.id,
        moderationStatus: 'approved',
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments({
        organizationId: req.params.id,
        moderationStatus: 'approved',
      }),
    ]);
    
    res.json({
      reports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Erreur get org reports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des publications' });
  }
});

module.exports = router;
