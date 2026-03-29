require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Body parser pour le chatbot
app.use(express.json());

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

// ==================== CHATBOT GROQ API ====================
const CHATBOT_SYSTEM_PROMPT = `Tu es l'assistant virtuel d'Agoo Alert, la plateforme nationale d'alerte du Togo pour les personnes et objets perdus/trouvés.

## À propos d'Agoo Alert
Agoo Alert est une plateforme web et mobile qui permet aux citoyens togolais de :
- Déclarer des personnes disparues ou retrouvées
- Signaler des objets perdus ou trouvés
- Communiquer avec les déclarants via un système de chat sécurisé
- Consulter les alertes publiées par la communauté

## Pages et fonctionnalités du site

### 1. Accueil (/)
- Présentation de la plateforme
- Statistiques des alertes
- Accès rapide aux publications récentes

### 2. Publications (/publications)
- Liste de toutes les alertes publiées
- Filtres par type : personnes, objets perdus, objets trouvés
- Recherche par titre ou ville

### 3. Créer une publication (/publications/create)
- Formulaire pour déclarer une personne ou un objet
- Types : Personne disparue/retrouvée, Objet perdu/trouvé
- Ajoutez des photos, description, localisation

### 4. Messages (/conversations)
- Voir toutes vos conversations
- Pour contacter un déclarant, envoyez d'abord une demande de chat
- Le déclarant doit accepter avant de pouvoir discuter

### 5. Profil (/profile)
- Modifiez vos informations personnelles
- Vérification d'identité pour plus de crédibilité

### 6. Support (/support)
- Contactez l'équipe support
- Signalez un problème

## Comment utiliser le site

### Pour déclarer une personne/objet perdu :
1. Connectez-vous à votre compte
2. Allez dans "Créer une publication"
3. Choisissez le type (personne ou objet)
4. Sélectionnez "Perdu" ou "Trouvé"
5. Remplissez les informations et publiez

### Pour contacter un déclarant :
1. Trouvez l'alerte qui vous intéresse
2. Cliquez sur "Demander à discuter"
3. Attendez l'acceptation du déclarant
4. Une fois accepté, accédez à la conversation

## Conseils de sécurité
- Ne partagez jamais d'informations sensibles
- Méfiez-vous des arnaques
- Privilégiez les rencontres dans des lieux publics

INSTRUCTIONS :
- Réponds toujours en français
- Sois amical, clair et concis
- Guide l'utilisateur étape par étape si nécessaire`;

// Rate limiter spécifique pour le chatbot
const chatbotLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requêtes par minute max
  message: { error: 'Trop de messages, veuillez patienter.' },
});

app.post('/api/chatbot', chatbotLimiter, async (req, res) => {
  const { messages } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Service chatbot non configuré" });
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Format de messages invalide" });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: CHATBOT_SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API error:', errorData);
      return res.status(502).json({ error: "Erreur du service IA" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Je n'ai pas pu générer une réponse.";
    
    res.json({ content });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: "Erreur de connexion au service IA" });
  }
});
// ==================== FIN CHATBOT ====================

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

// Notifications (User Service)
app.use('/api/notifications', createProxyMiddleware(proxyOptions(
  process.env.USER_SERVICE_URL || 'http://localhost:5002',
  '/api/notifications'
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
