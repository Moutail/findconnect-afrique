const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../../../../shared/models/User');
const Organization = require('../../../../shared/models/Organization');

const generateTokens = (user) => {
  const payload = {
    id: user._id,
    phone: user.phone,
    role: user.role,
    accountType: user.accountType,
    verificationStatus: user.verificationStatus,
    organizationId: user.organizationId,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

  return { accessToken, refreshToken };
};

// POST /api/auth/register - Inscription utilisateur simple
router.post('/register', [
  body('phone').notEmpty().withMessage('Le numéro de téléphone est requis'),
  body('firstName').notEmpty().trim().withMessage('Le prénom est requis'),
  body('lastName').notEmpty().trim().withMessage('Le nom est requis'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, firstName, lastName, password, email } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    const user = new User({
      phone,
      firstName,
      lastName,
      password,
      email,
      accountType: 'individual',
      role: 'user',
    });

    await user.save();

    const tokens = generateTokens(user);

    res.status(201).json({
      message: 'Compte créé avec succès',
      user: user.toFullProfile(),
      ...tokens,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
});

// POST /api/auth/register-organization - Inscription organisation
router.post('/register-organization', [
  body('phone').notEmpty().withMessage('Le numéro de téléphone est requis'),
  body('firstName').notEmpty().trim().withMessage('Le prénom du responsable est requis'),
  body('lastName').notEmpty().trim().withMessage('Le nom du responsable est requis'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('organization.name').notEmpty().withMessage('Le nom de l\'organisation est requis'),
  body('organization.legalName').notEmpty().withMessage('Le nom légal est requis'),
  body('organization.type').notEmpty().withMessage('Le type d\'organisation est requis'),
  body('organization.email').isEmail().withMessage('Email de l\'organisation invalide'),
  body('organization.phone').notEmpty().withMessage('Le téléphone de l\'organisation est requis'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, firstName, lastName, password, email, organization } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Créer l'utilisateur responsable
    const user = new User({
      phone,
      firstName,
      lastName,
      password,
      email,
      accountType: 'organization',
      role: 'organization',
    });
    await user.save();

    // Créer l'organisation
    const org = new Organization({
      name: organization.name,
      legalName: organization.legalName,
      type: organization.type,
      email: organization.email,
      phone: organization.phone,
      website: organization.website,
      address: organization.address,
      description: organization.description,
      verificationDocuments: organization.verificationDocuments,
      createdBy: user._id,
      members: [{ userId: user._id, role: 'owner' }],
      // Organisation peut publier directement car elle fournit des infos vérifiables
      canPost: true,
    });
    await org.save();

    // Lier l'organisation à l'utilisateur
    user.organizationId = org._id;
    await user.save();

    const tokens = generateTokens(user);

    res.status(201).json({
      message: 'Organisation créée avec succès',
      user: user.toFullProfile(),
      organization: org,
      ...tokens,
    });
  } catch (error) {
    console.error('Register org error:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'organisation' });
  }
});

// POST /api/auth/login - Connexion
router.post('/login', [
  body('phone').notEmpty().withMessage('Le numéro de téléphone est requis'),
  body('password').notEmpty().withMessage('Le mot de passe est requis'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, password } = req.body;

    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    if (!user.isActive || user.isBanned) {
      return res.status(403).json({
        error: user.isBanned
          ? 'Votre compte a été suspendu'
          : 'Votre compte est désactivé',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = generateTokens(user);

    // Charger l'organisation si applicable
    let organization = null;
    if (user.organizationId) {
      organization = await Organization.findById(user.organizationId);
    }

    res.json({
      message: 'Connexion réussie',
      user: user.toFullProfile(),
      organization,
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// POST /api/auth/refresh - Rafraîchir le token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Token de rafraîchissement requis' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive || user.isBanned) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: 'Token de rafraîchissement invalide ou expiré' });
  }
});

// GET /api/auth/me - Profil de l'utilisateur connecté
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requis' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    let organization = null;
    if (user.organizationId) {
      organization = await Organization.findById(user.organizationId);
    }

    res.json({
      user: user.toFullProfile(),
      organization,
    });
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
});

module.exports = router;
