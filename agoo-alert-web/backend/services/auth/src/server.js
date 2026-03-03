require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('../../../shared/mongoose');

const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

mongoose.set('bufferCommands', false);

// Connexion MongoDB
// Routes
app.use('/api/auth', authRoutes);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

// Erreurs
app.use((err, req, res, next) => {
  console.error('Auth Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
  });
});

const PORT = process.env.PORT || 5001;
const start = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agoo-alert-web');
    console.log('✅ Auth Service connecté à MongoDB');
    app.listen(PORT, () => {
      console.log(`🔐 Auth Service démarré sur le port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Erreur MongoDB:', err);
    process.exit(1);
  }
};

start();

module.exports = app;
