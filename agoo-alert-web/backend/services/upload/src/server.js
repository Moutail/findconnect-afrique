require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('../../../shared/mongoose');
const path = require('path');

const uploadRoutes = require('./routes/upload');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agoo-alert-web')
  .then(() => console.log('✅ Upload Service connecté à MongoDB'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));

// Servir les fichiers statiques
const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadDir));

app.use('/api/upload', uploadRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'upload' });
});

app.use((err, req, res, next) => {
  console.error('Upload Service Error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Fichier trop volumineux (max 10 Mo)' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Erreur interne' });
});

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`📁 Upload Service démarré sur le port ${PORT}`);
});

module.exports = app;
