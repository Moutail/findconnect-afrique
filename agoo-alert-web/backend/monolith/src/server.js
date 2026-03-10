require('dotenv').config();
const path = require('path');

process.env.NODE_PATH = process.env.NODE_PATH
  ? `${process.env.NODE_PATH}${path.delimiter}${path.join(__dirname, '..', 'node_modules')}`
  : path.join(__dirname, '..', 'node_modules');
require('module').Module._initPaths();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('../../shared/mongoose');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('../../services/auth/src/routes/auth');

const userRoutes = require('../../services/user/src/routes/users');
const organizationRoutes = require('../../services/user/src/routes/organizations');
const verificationRoutes = require('../../services/user/src/routes/verification');
const notificationRoutes = require('../../services/user/src/routes/notifications');

const publicationRoutes = require('../../services/publication/src/routes/publications');

const adminRoutes = require('../../services/admin/src/routes/admin');
const moderationRoutes = require('../../services/admin/src/routes/moderation');
const supportRoutes = require('../../services/admin/src/routes/support');
const { ensureDefaultAdmin } = require('../../services/admin/src/seed/defaultAdmin');

const chatRequestRoutes = require('../../services/chat/src/routes/chatRequests');
const conversationRoutes = require('../../services/chat/src/routes/conversations');
const { setupSocketHandlers } = require('../../services/chat/src/socket/handlers');

const uploadRoutes = require('../../services/upload/src/routes/upload');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
  },
});

app.use(morgan('dev'));
app.use(express.json());

mongoose.set('bufferCommands', false);

// Rendre io accessible dans les routes (chat notifications)
app.set('io', io);

// Servir les fichiers statiques /uploads
const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '../../../uploads');
app.use('/uploads', express.static(uploadDir));

// Routes API
app.use('/api/auth', authRoutes);

app.use('/api/users', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api/publications', publicationRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/admin/moderation', moderationRoutes);
app.use('/api/support', supportRoutes);

app.use('/api/chat', chatRequestRoutes);
app.use('/api/conversations', conversationRoutes);

app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'monolith',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'monolith' });
});

// Socket.io handlers
setupSocketHandlers(io);

app.use((err, req, res, next) => {
  console.error('Monolith Error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Fichier trop volumineux (max 10 Mo)' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Erreur interne' });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agoo-alert-web');
    console.log('✅ Monolith connecté à MongoDB');
    ensureDefaultAdmin();
    server.listen(PORT, () => {
      console.log(`🚀 Monolith démarré sur le port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Erreur MongoDB:', err);
    process.exit(1);
  }
};

start();

module.exports = { app, server, io };
