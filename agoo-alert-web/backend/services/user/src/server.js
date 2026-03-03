require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('../../../shared/mongoose');

const userRoutes = require('./routes/users');
const organizationRoutes = require('./routes/organizations');
const verificationRoutes = require('./routes/verification');
const notificationRoutes = require('./routes/notifications');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agoo-alert-web')
  .then(() => console.log('✅ User Service connecté à MongoDB'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));

app.use('/api/users', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user' });
});

app.use((err, req, res, next) => {
  console.error('User Service Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Erreur interne' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`👤 User Service démarré sur le port ${PORT}`);
});

module.exports = app;
