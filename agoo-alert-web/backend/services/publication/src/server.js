require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('../../../shared/mongoose');

const publicationRoutes = require('./routes/publications');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agoo-alert-web')
  .then(() => console.log('✅ Publication Service connecté à MongoDB'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));

app.use('/api/publications', publicationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'publication' });
});

app.use((err, req, res, next) => {
  console.error('Publication Service Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Erreur interne' });
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`📋 Publication Service démarré sur le port ${PORT}`);
});

module.exports = app;
