const mongoose = require('../mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info', index: true },
  data: { type: mongoose.Schema.Types.Mixed },
  readAt: { type: Date, default: null },
}, {
  timestamps: true,
});

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
