const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const setupSocketHandlers = (io) => {
  // Middleware d'authentification Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Token d\'authentification requis'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive || user.isBanned) {
        return next(new Error('Utilisateur invalide'));
      }
      
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentification échouée'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Utilisateur connecté: ${socket.user.displayName} (${socket.userId})`);
    
    // Rejoindre la room personnelle de l'utilisateur
    socket.join(`user_${socket.userId}`);
    
    // ============ GESTION DES CONVERSATIONS ============
    
    // Rejoindre une conversation
    socket.on('join_conversation', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation non trouvée' });
        }
        
        const isParticipant = conversation.participants.some(
          p => p.toString() === socket.userId
        );
        
        if (!isParticipant) {
          return socket.emit('error', { message: 'Accès non autorisé' });
        }
        
        socket.join(`conversation_${conversationId}`);
        socket.emit('joined_conversation', { conversationId });
        
        console.log(`📝 ${socket.user.displayName} a rejoint la conversation ${conversationId}`);
      } catch (error) {
        console.error('Erreur join conversation:', error);
        socket.emit('error', { message: 'Erreur lors de la connexion à la conversation' });
      }
    });
    
    // Quitter une conversation
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`📤 ${socket.user.displayName} a quitté la conversation ${conversationId}`);
    });
    
    // Envoyer un message (temps réel)
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, type = 'text', attachment, location } = data;
        
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation non trouvée' });
        }
        
        const isParticipant = conversation.participants.some(
          p => p.toString() === socket.userId
        );
        
        if (!isParticipant) {
          return socket.emit('error', { message: 'Accès non autorisé' });
        }
        
        if (conversation.status === 'blocked') {
          return socket.emit('error', { message: 'Conversation bloquée' });
        }
        
        // Créer le message
        const message = new Message({
          conversationId,
          senderId: socket.userId,
          content,
          type,
          attachment,
          location,
        });
        
        await message.save();
        await message.populate('senderId', 'displayName photoURL');
        
        // Mettre à jour la conversation
        conversation.lastMessage = {
          content,
          senderId: socket.userId,
          sentAt: new Date(),
        };
        
        // Incrémenter les non-lus pour les autres participants
        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== socket.userId) {
            const currentUnread = conversation.unreadCount.get(participantId.toString()) || 0;
            conversation.unreadCount.set(participantId.toString(), currentUnread + 1);
          }
        });
        
        await conversation.save();
        
        // Émettre le message à tous dans la conversation
        io.to(`conversation_${conversationId}`).emit('new_message', {
          conversationId,
          message,
        });
        
        // Notification aux autres participants
        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== socket.userId) {
            io.to(`user_${participantId}`).emit('message_notification', {
              conversationId,
              senderName: socket.user.displayName,
              preview: content.substring(0, 50),
            });
          }
        });
        
      } catch (error) {
        console.error('Erreur send message socket:', error);
        socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
      }
    });
    
    // Indicateur de frappe
    socket.on('typing_start', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId: socket.userId,
        displayName: socket.user.displayName,
      });
    });
    
    socket.on('typing_stop', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        conversationId,
        userId: socket.userId,
      });
    });
    
    // Marquer les messages comme lus
    socket.on('mark_read', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        
        if (conversation) {
          conversation.unreadCount.set(socket.userId, 0);
          await conversation.save();
          
          // Marquer les messages comme lus
          await Message.updateMany(
            {
              conversationId,
              senderId: { $ne: socket.userId },
              'readBy.userId': { $ne: socket.userId },
            },
            {
              $push: { readBy: { userId: socket.userId, readAt: new Date() } },
            }
          );
          
          // Notifier l'autre participant que les messages ont été lus
          socket.to(`conversation_${conversationId}`).emit('messages_read', {
            conversationId,
            readBy: socket.userId,
          });
        }
      } catch (error) {
        console.error('Erreur mark read:', error);
      }
    });
    
    // ============ NOTIFICATIONS GÉNÉRALES ============
    
    // S'abonner aux notifications d'un rapport
    socket.on('subscribe_report', (reportId) => {
      socket.join(`report_${reportId}`);
    });
    
    socket.on('unsubscribe_report', (reportId) => {
      socket.leave(`report_${reportId}`);
    });
    
    // ============ DÉCONNEXION ============
    
    socket.on('disconnect', () => {
      console.log(`❌ Utilisateur déconnecté: ${socket.user.displayName}`);
    });
  });
  
  console.log('🔌 Socket.io handlers configurés');
};

module.exports = { setupSocketHandlers };
