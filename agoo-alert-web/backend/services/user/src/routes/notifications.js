const express = require('express');
const router = express.Router();

const Notification = require('../../../../shared/models/Notification');
const { authenticate } = require('../../../../shared/middleware');

// GET /api/notifications - Liste des notifications de l'utilisateur
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const filter = { userId: req.user.id };
    if (unread === 'true') filter.readAt = null;

    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      notifications,
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

// PUT /api/notifications/:id/read - Marquer comme lue
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, userId: req.user.id });
    if (!notif) return res.status(404).json({ error: 'Notification non trouvée' });

    notif.readAt = new Date();
    await notif.save();

    res.json({ message: 'Notification marquée comme lue', notification: notif });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
