require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('../../../shared/mongoose');
const http = require('http');
const { Server } = require('socket.io');

const chatRequestRoutes = require('./routes/chatRequests');
const conversationRoutes = require('./routes/conversations');
const { setupSocketHandlers } = require('./socket/handlers');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
      const allowed = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
      if (allowed.length === 0 || allowed.includes('*') || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Rendre io accessible dans les routes
app.set('io', io);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agoo-alert-web')
  .then(() => console.log('✅ Chat Service connecté à MongoDB'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));

app.use('/api/chat', chatRequestRoutes);
app.use('/api/conversations', conversationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'chat' });
});

// Socket.io handlers
setupSocketHandlers(io);

app.use((err, req, res, next) => {
  console.error('Chat Service Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Erreur interne' });
});

const PORT = process.env.PORT || 5004;
server.listen(PORT, () => {
  console.log(`💬 Chat Service démarré sur le port ${PORT}`);
});

module.exports = { app, server, io };
