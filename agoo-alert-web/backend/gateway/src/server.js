require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Sécurité
app.use(helmet());
app.use(morgan('dev'));

// CORS
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

// Rate limiting global
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
});
app.use(limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Proxy vers les microservices
const proxyOptions = (target, basePath) => ({
  target,
  changeOrigin: true,
  pathRewrite: (path, req) => `${basePath}${path}`,
  onError: (err, req, res) => {
    console.error(`Proxy error to ${target}:`, err.message);
    res.status(502).json({ error: 'Service temporairement indisponible' });
  },
});

// Auth Service
app.use('/api/auth', createProxyMiddleware(proxyOptions(
  process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
  '/api/auth'
)));

// User Service
app.use('/api/users', createProxyMiddleware(proxyOptions(
  process.env.USER_SERVICE_URL || 'http://localhost:5002',
  '/api/users'
)));
app.use('/api/organizations', createProxyMiddleware(proxyOptions(
  process.env.USER_SERVICE_URL || 'http://localhost:5002',
  '/api/organizations'
)));
app.use('/api/verification', createProxyMiddleware(proxyOptions(
  process.env.USER_SERVICE_URL || 'http://localhost:5002',
  '/api/verification'
)));

// Publication Service
app.use('/api/publications', createProxyMiddleware(proxyOptions(
  process.env.PUBLICATION_SERVICE_URL || 'http://localhost:5003',
  '/api/publications'
)));

// Chat Service
app.use('/api/chat', createProxyMiddleware(proxyOptions(
  process.env.CHAT_SERVICE_URL || 'http://localhost:5004',
  '/api/chat'
)));
app.use('/api/conversations', createProxyMiddleware(proxyOptions(
  process.env.CHAT_SERVICE_URL || 'http://localhost:5004',
  '/api/conversations'
)));

// Upload Service
app.use('/api/upload', createProxyMiddleware(proxyOptions(
  process.env.UPLOAD_SERVICE_URL || 'http://localhost:5005',
  '/api/upload'
)));
app.use('/uploads', createProxyMiddleware(proxyOptions(
  process.env.UPLOAD_SERVICE_URL || 'http://localhost:5005',
  '/uploads'
)));

// Admin Service
app.use('/api/admin', createProxyMiddleware(proxyOptions(
  process.env.ADMIN_SERVICE_URL || 'http://localhost:5006',
  '/api/admin'
)));

// Support
app.use('/api/support', createProxyMiddleware(proxyOptions(
  process.env.ADMIN_SERVICE_URL || 'http://localhost:5006',
  '/api/support'
)));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Erreurs globales
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚪 API Gateway démarré sur le port ${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
