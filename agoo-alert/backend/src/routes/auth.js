const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { auth, generateToken, generateRefreshToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Validation pour l'inscription
const registerValidation = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('displayName').trim().notEmpty().withMessage('Le nom est requis'),
  body('phone').optional().trim(),
];

// Validation pour la connexion
const loginValidation = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').notEmpty().withMessage('Le mot de passe est requis'),
];

// POST /api/auth/register - Inscription
router.post('/register', registerValidation, validate, async (req, res) => {
  try {
    const { email, password, displayName, phone } = req.body;
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    
    // Créer l'utilisateur
    const user = new User({
      email,
      password,
      displayName,
      phone,
    });
    
    await user.save();
    
    // Générer les tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    res.status(201).json({
      message: 'Compte créé avec succès',
      user: user.toFullProfile(),
      token,
      refreshToken,
    });
    
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// POST /api/auth/login - Connexion
router.post('/login', loginValidation, validate, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Trouver l'utilisateur avec le mot de passe
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(403).json({ error: 'Compte désactivé' });
    }
    
    if (user.isBanned) {
      return res.status(403).json({ error: 'Compte banni', reason: user.banReason });
    }
    
    // Mettre à jour la dernière connexion
    user.lastLoginAt = new Date();
    await user.save();
    
    // Générer les tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    res.json({
      message: 'Connexion réussie',
      user: user.toFullProfile(),
      token,
      refreshToken,
    });
    
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// GET /api/auth/me - Obtenir le profil actuel
router.get('/me', auth, async (req, res) => {
  try {
    res.json({ user: req.user.toFullProfile() });
  } catch (error) {
    console.error('Erreur get me:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

// POST /api/auth/refresh - Rafraîchir le token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Token de rafraîchissement requis' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Token invalide' });
    }
    
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive || user.isBanned) {
      return res.status(401).json({ error: 'Utilisateur invalide' });
    }
    
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    
    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
    
  } catch (error) {
    console.error('Erreur refresh token:', error);
    res.status(401).json({ error: 'Token de rafraîchissement invalide' });
  }
});

// POST /api/auth/logout - Déconnexion (optionnel, pour supprimer le push token)
router.post('/logout', auth, async (req, res) => {
  try {
    const { pushToken } = req.body;
    
    if (pushToken) {
      // Retirer le push token de l'utilisateur
      req.user.pushTokens = req.user.pushTokens.filter(t => t !== pushToken);
      await req.user.save();
    }
    
    res.json({ message: 'Déconnexion réussie' });
    
  } catch (error) {
    console.error('Erreur logout:', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});

// POST /api/auth/forgot-password - Demande de réinitialisation du mot de passe
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
], validate, async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      // Ne pas révéler si l'email existe ou non
      return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
    }
    
    // Générer un token de réinitialisation
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 heure
    await user.save();
    
    // TODO: Envoyer l'email avec le lien de réinitialisation
    // Pour l'instant, on renvoie le token (à supprimer en production)
    
    res.json({
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
      // Retirer en production:
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
    
  } catch (error) {
    console.error('Erreur forgot password:', error);
    res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' });
  }
});

// POST /api/auth/reset-password - Réinitialiser le mot de passe
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token requis'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
], validate, async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }
    
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ message: 'Mot de passe réinitialisé avec succès' });
    
  } catch (error) {
    console.error('Erreur reset password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
  }
});

// PUT /api/auth/change-password - Changer le mot de passe
router.put('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
  body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
], validate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.userId).select('+password');
    
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Mot de passe modifié avec succès' });
    
  } catch (error) {
    console.error('Erreur change password:', error);
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
  }
});

module.exports = router;
