# Agoo Alert Web

Plateforme web de déclaration de pertes d'individus, d'objets et d'animaux.

## Architecture

```
agoo-alert-web/
├── backend/
│   ├── gateway/          # API Gateway (port 5000) — point d'entrée unique
│   ├── services/
│   │   ├── auth/         # Service d'authentification (port 5001)
│   │   ├── user/         # Service utilisateurs & organisations (port 5002)
│   │   ├── publication/  # Service publications (port 5003)
│   │   ├── chat/         # Service messagerie + Socket.io (port 5004)
│   │   ├── upload/       # Service upload fichiers (port 5005)
│   │   └── admin/        # Service administration (port 5006)
│   └── shared/           # Code partagé (models, middleware, utils, constants)
└── frontend/             # Application React + Vite + TailwindCSS (port 5173)
```

## Fonctionnalités

- **Inscription/Connexion** : Compte simple (téléphone, nom, prénom, mot de passe) ou Organisation
- **Organisations** : Écoles, universités, centres de formation — publient directement sans modération
- **Utilisateurs simples** : Doivent vérifier leur identité (photo visage + pièce d'identité)
- **Publications** : Objets perdus/trouvés, personnes disparues, animaux — formulaire guidé étape par étape
- **Modération** : Les publications des utilisateurs simples sont validées par un admin avant publication
- **Chat** : Système d'invitation entre celui qui a perdu et celui qui a trouvé (texte, images, audio, vidéo)
- **Administration** : Gestion des comptes, validation des publications/vérifications, accès aux conversations, dashboard stats
- **Support** : Aide aux personnes illettrées pour poster des publications + recherche dans l'historique
- **Pages statiques** : À propos, Politique de confidentialité

## Stack Technique

- **Backend** : Node.js, Express, MongoDB/Mongoose, Socket.io, JWT, bcryptjs
- **Frontend** : React 18, Vite, TailwindCSS, Lucide Icons, React Router v6, Axios
- **Upload** : Multer, Sharp (images, thumbnails)
- **Temps réel** : Socket.io (chat, notifications)
- **Auth** : JWT access + refresh tokens

## Prérequis

- Node.js >= 18
- MongoDB (local ou Atlas)
- npm

## Installation

```bash
# 1. Cloner et accéder au projet
cd agoo-alert-web

# 2. Installer les dépendances root (concurrently)
npm install

# 3. Installer toutes les dépendances (backend + frontend)
npm run install:all
```

## Configuration des variables d'environnement

Chaque service backend a un fichier `.env.example`. Copiez-le en `.env` et configurez les valeurs.

```bash
# Gateway
cp backend/gateway/.env.example backend/gateway/.env

# Auth Service
cp backend/services/auth/.env.example backend/services/auth/.env

# User Service
cp backend/services/user/.env.example backend/services/user/.env

# Publication Service
cp backend/services/publication/.env.example backend/services/publication/.env

# Chat Service
cp backend/services/chat/.env.example backend/services/chat/.env

# Upload Service
cp backend/services/upload/.env.example backend/services/upload/.env

# Admin Service
cp backend/services/admin/.env.example backend/services/admin/.env

# Frontend (optionnel)
cp frontend/.env.example frontend/.env
```

### Variables importantes à configurer

| Variable | Description | Exemple |
|----------|-------------|---------|
| `MONGODB_URI` | URI MongoDB (même pour tous les services) | `mongodb://localhost:27017/agoo-alert` |
| `JWT_SECRET` | Clé secrète JWT (même pour tous les services) | `votre-secret-jwt-ici` |
| `JWT_REFRESH_SECRET` | Clé secrète refresh token | `votre-refresh-secret-ici` |

## Démarrage

```bash
# Démarrer TOUS les services + frontend en une commande
npm run dev

# Ou démarrer individuellement
npm run dev:gateway       # API Gateway sur :5000
npm run dev:auth          # Auth Service sur :5001
npm run dev:user          # User Service sur :5002
npm run dev:publication   # Publication Service sur :5003
npm run dev:chat          # Chat Service sur :5004
npm run dev:upload        # Upload Service sur :5005
npm run dev:admin         # Admin Service sur :5006
npm run dev:frontend      # Frontend Vite sur :5173
```

## URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **API Gateway** | http://localhost:5000 |
| **API Health** | http://localhost:5000/health |

## Routes API (via Gateway)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Inscription utilisateur |
| POST | `/api/auth/register-organization` | Inscription organisation |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/refresh` | Renouveler le token |
| GET | `/api/auth/me` | Profil utilisateur connecté |
| GET/PUT | `/api/users/profile` | Profil utilisateur |
| GET | `/api/publications` | Liste des publications |
| POST | `/api/publications` | Créer une publication |
| POST | `/api/chat/requests` | Envoyer une invitation de chat |
| GET | `/api/conversations` | Liste des conversations |
| POST | `/api/upload/image` | Upload d'image |
| GET | `/api/admin/stats` | Statistiques admin |

## Admin par défaut

Au démarrage, le service Admin crée automatiquement un compte admin :

- **Téléphone** : `+22890000000` (configurable via `DEFAULT_ADMIN_PHONE`)
- **Mot de passe** : `admin123456` (configurable via `DEFAULT_ADMIN_PASSWORD`)

## Frontend — Pages

### Publiques
- `/` — Page d'accueil
- `/publications` — Liste des publications
- `/publications/:id` — Détail d'une publication
- `/about` — À propos
- `/privacy` — Politique de confidentialité
- `/support` — Support & aide

### Authentification
- `/login` — Connexion
- `/register` — Inscription particulier
- `/register-organization` — Inscription organisation

### Protégées (authentifié)
- `/dashboard` — Tableau de bord
- `/publications/create` — Créer une publication (formulaire guidé)
- `/my-publications` — Mes publications
- `/verification` — Vérification d'identité
- `/profile` — Mon profil
- `/conversations` — Liste des conversations
- `/conversations/:id` — Chat en temps réel
- `/chat-requests` — Invitations de chat

### Administration
- `/admin` — Dashboard admin (stats)
- `/admin/users` — Gestion des utilisateurs
- `/admin/publications` — Modération des publications
- `/admin/verifications` — Vérifications d'identité
- `/admin/organizations` — Gestion des organisations
- `/admin/conversations` — Historique des conversations
- `/admin/support` — Demandes de support
