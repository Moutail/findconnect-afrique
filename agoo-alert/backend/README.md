# Agoo Alert - Backend API

Backend Node.js/Express pour l'application Agoo Alert de signalement d'objets perdus/trouvés.

## 🚀 Technologies

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MongoDB** - Base de données NoSQL
- **Mongoose** - ODM pour MongoDB
- **JWT** - Authentification par tokens
- **Socket.io** - Communication temps réel
- **Multer** - Upload de fichiers
- **Sharp** - Traitement d'images

## 📋 Prérequis

- Node.js 18+
- MongoDB 6+ (local ou MongoDB Atlas)

## 🛠️ Installation

1. **Cloner et installer les dépendances**
```bash
cd backend
npm install
```

2. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

3. **Lancer MongoDB** (si local)
```bash
mongod
```

4. **Démarrer le serveur**
```bash
# Développement (avec hot reload)
npm run dev

# Production
npm start
```

Le serveur démarre sur `http://localhost:3000`

## 📁 Structure du projet

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # Connexion MongoDB
│   │   └── constants.js     # Constantes de l'app
│   ├── middleware/
│   │   ├── auth.js          # Authentification JWT
│   │   ├── upload.js        # Upload de fichiers
│   │   └── validate.js      # Validation des requêtes
│   ├── models/
│   │   ├── User.js
│   │   ├── Report.js
│   │   ├── Organization.js
│   │   ├── OrganizationMember.js
│   │   ├── Conversation.js
│   │   ├── Message.js
│   │   ├── ChatRequest.js
│   │   └── VerificationRequest.js
│   ├── routes/
│   │   ├── auth.js          # Authentification
│   │   ├── users.js         # Gestion des utilisateurs
│   │   ├── reports.js       # Signalements
│   │   ├── organizations.js # Organisations
│   │   ├── conversations.js # Messages
│   │   ├── upload.js        # Upload de fichiers
│   │   └── admin.js         # Administration
│   ├── socket/
│   │   └── handlers.js      # Handlers Socket.io
│   └── server.js            # Point d'entrée
├── uploads/                  # Fichiers uploadés
├── .env.example
├── package.json
└── README.md
```

## 🔗 API Endpoints

### Authentification (`/api/auth`)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/register` | Inscription |
| POST | `/login` | Connexion |
| GET | `/me` | Profil actuel |
| POST | `/refresh` | Rafraîchir le token |
| POST | `/logout` | Déconnexion |
| POST | `/forgot-password` | Demander réinitialisation |
| POST | `/reset-password` | Réinitialiser mot de passe |
| PUT | `/change-password` | Changer mot de passe |

### Utilisateurs (`/api/users`)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/profile` | Mon profil complet |
| PUT | `/profile` | Mettre à jour mon profil |
| POST | `/complete-onboarding` | Terminer l'onboarding |
| POST | `/push-token` | Enregistrer push token |
| GET | `/:id` | Profil public d'un utilisateur |
| POST | `/verification-request` | Demander vérification |
| GET | `/verification-request/status` | Statut de ma demande |

### Signalements (`/api/reports`)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste des signalements |
| GET | `/my` | Mes signalements |
| GET | `/search` | Rechercher |
| GET | `/:id` | Détail d'un signalement |
| POST | `/` | Créer un signalement |
| PUT | `/:id` | Modifier un signalement |
| PUT | `/:id/status` | Changer le statut |
| DELETE | `/:id` | Supprimer |
| POST | `/:id/chat-request` | Demander à discuter |
| GET | `/:id/chat-requests` | Liste des demandes |
| PUT | `/:id/chat-requests/:requestId` | Répondre à une demande |

### Organisations (`/api/organizations`)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste des organisations |
| GET | `/my` | Mes organisations |
| GET | `/:id` | Détail d'une organisation |
| POST | `/` | Créer une organisation |
| PUT | `/:id` | Modifier |
| GET | `/:id/members` | Liste des membres |
| POST | `/:id/members` | Ajouter un membre |
| PUT | `/:id/members/:memberId` | Modifier un membre |
| DELETE | `/:id/members/:memberId` | Retirer un membre |
| POST | `/:id/reports` | Publier au nom de l'org |
| GET | `/:id/reports` | Publications de l'org |

### Conversations (`/api/conversations`)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Mes conversations |
| GET | `/:id` | Détail d'une conversation |
| GET | `/:id/messages` | Messages |
| POST | `/:id/messages` | Envoyer un message |
| DELETE | `/:id/messages/:messageId` | Supprimer un message |
| PUT | `/:id/block` | Bloquer |
| POST | `/start` | Démarrer une conversation |

### Upload (`/api/upload`)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/image` | Upload une image |
| POST | `/images` | Upload plusieurs images |
| POST | `/document` | Upload un document |
| DELETE | `/:type/:filename` | Supprimer un fichier |

### Administration (`/api/admin`)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/reports/pending` | Signalements en attente |
| PUT | `/reports/:id/moderate` | Modérer |
| GET | `/verifications/pending` | Vérifications en attente |
| PUT | `/verifications/:id` | Traiter une vérification |
| GET | `/organizations/pending` | Organisations en attente |
| PUT | `/organizations/:id/verify` | Vérifier une org |
| GET | `/users` | Liste des utilisateurs |
| PUT | `/users/:id/role` | Changer le rôle |
| PUT | `/users/:id/ban` | Bannir/Débannir |
| GET | `/stats` | Statistiques |

## 🔌 Socket.io Events

### Client → Serveur
- `join_conversation` - Rejoindre une conversation
- `leave_conversation` - Quitter une conversation
- `send_message` - Envoyer un message
- `typing_start` - Commencer à écrire
- `typing_stop` - Arrêter d'écrire
- `mark_read` - Marquer comme lu

### Serveur → Client
- `new_message` - Nouveau message
- `message_notification` - Notification de message
- `user_typing` - Utilisateur écrit
- `user_stopped_typing` - Utilisateur a arrêté
- `messages_read` - Messages lus
- `new_chat_request` - Nouvelle demande de chat
- `chat_request_response` - Réponse à une demande
- `report_moderated` - Signalement modéré
- `verification_update` - Mise à jour vérification

## 🔐 Authentification

Toutes les routes protégées nécessitent un header `Authorization`:
```
Authorization: Bearer <token>
```

## 📝 Licence

MIT
