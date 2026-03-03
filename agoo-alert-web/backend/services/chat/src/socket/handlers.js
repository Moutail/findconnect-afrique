const jwt = require('jsonwebtoken');

const setupSocketHandlers = (io) => {
  // Middleware d'authentification Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Token d\'authentification requis'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      return next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`🔌 Utilisateur connecté: ${userId}`);

    // Rejoindre la room personnelle
    socket.join(`user_${userId}`);

    // Rejoindre une conversation
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`👤 ${userId} a rejoint la conversation ${conversationId}`);
    });

    // Quitter une conversation
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // Indicateur de frappe
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId,
        conversationId,
      });
    });

    // Arrêt de frappe
    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
        userId,
        conversationId,
      });
    });

    // Déconnexion
    socket.on('disconnect', () => {
      console.log(`🔌 Utilisateur déconnecté: ${userId}`);
    });
  });
};

module.exports = { setupSocketHandlers };
