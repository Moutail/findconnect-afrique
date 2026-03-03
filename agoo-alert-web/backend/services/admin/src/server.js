require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('../../../shared/mongoose');

const adminRoutes = require('./routes/admin');
const moderationRoutes = require('./routes/moderation');
const supportRoutes = require('./routes/support');
const { ensureDefaultAdmin } = require('./seed/defaultAdmin');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

mongoose.set('bufferCommands', false);

const PORT = process.env.PORT || 5006;
const start = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agoo-alert-web');
    console.log('✅ Admin Service connecté à MongoDB');
    ensureDefaultAdmin();
    app.listen(PORT, () => {
      console.log(`🛡️  Admin Service démarré sur le port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Erreur MongoDB:', err);
    process.exit(1);
  }
};

start();

app.use('/api/admin', adminRoutes);
app.use('/api/admin/moderation', moderationRoutes);
app.use('/api/support', supportRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin' });
});

app.use((err, req, res, next) => {
  console.error('Admin Service Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Erreur interne' });
});

module.exports = app;
