const express = require('express');
const router = express.Router();

const Publication = require('../../../../shared/models/Publication');
const User = require('../../../../shared/models/User');
const { authenticate, isAdmin } = require('../../../../shared/middleware');

// GET /api/admin/moderation/pending - Publications en attente de modération
router.get('/pending', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const filter = { moderationStatus: 'pending' };
    const total = await Publication.countDocuments(filter);
    const publications = await Publication.find(filter)
      .populate('createdBy', 'firstName lastName phone photoURL verificationStatus')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: 1 }); // Les plus anciennes en premier

    res.json({
      publications,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/moderation/:id/approve - Approuver une publication
router.put('/:id/approve', authenticate, isAdmin, async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }

    publication.moderationStatus = 'approved';
    publication.moderatedAt = new Date();
    publication.moderatedBy = req.user.id;
    publication.moderationNotes = req.body.notes || '';
    await publication.save();

    res.json({ message: 'Publication approuvée', publication });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/moderation/:id/reject - Rejeter une publication
router.put('/:id/reject', authenticate, isAdmin, async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }

    publication.moderationStatus = 'rejected';
    publication.moderatedAt = new Date();
    publication.moderatedBy = req.user.id;
    publication.rejectionReason = req.body.reason || 'Non spécifié';
    publication.moderationNotes = req.body.notes || '';
    await publication.save();

    res.json({ message: 'Publication rejetée', publication });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/moderation/:id/resolve - Marquer une publication comme trouvée/résolue
router.put('/:id/resolve', authenticate, isAdmin, async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }

    publication.status = 'resolved';
    publication.resolvedAt = new Date();
    await publication.save();

    // Mettre à jour les stats utilisateur
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

// DELETE /api/admin/moderation/:id - Supprimer une publication (admin)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }

    await Publication.findByIdAndDelete(req.params.id);
    res.json({ message: 'Publication supprimée définitivement' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/moderation/history - Historique des publications (toutes, incluant résolues)
router.get('/history', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, search, category } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (category) filter.mainCategory = category;
    if (search) filter.$text = { $search: search };

    const total = await Publication.countDocuments(filter);
    const publications = await Publication.find(filter)
      .populate('createdBy', 'firstName lastName phone')
      .populate('moderatedBy', 'firstName lastName')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      publications,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
