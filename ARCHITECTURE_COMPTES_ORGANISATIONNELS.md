# 🏢 Architecture des Comptes Organisationnels

## Vue d'Ensemble

Le système de comptes organisationnels permet aux organisations (gares, universités, hôpitaux, entreprises, etc.) de publier des annonces officielles vérifiées sur la plateforme FindConnect Afrique.

---

## 🎯 Objectifs

1. **Crédibilité** : Distinguer clairement les publications officielles des publications personnelles
2. **Sécurité** : Système de vérification robuste pour éviter les faux comptes
3. **Flexibilité** : Support de différents types d'organisations avec permissions adaptées
4. **Scalabilité** : Architecture capable de gérer des milliers d'organisations

---

## 📊 Types de Comptes

### 1. Utilisateur Standard (existant)
- Type: `user`
- Peut créer des déclarations
- Système de vérification d'identité personnel

### 2. Compte Organisationnel
- Type: `organization`
- Badge vérifié officiel
- Publications avec logo et nom de l'organisation
- Priorité dans les résultats de recherche

### 3. Compte Super-Organisation (optionnel)
- Type: `super_organization`
- Gère plusieurs sous-organisations
- Exemple: Ministère des Transports gère toutes les gares
- Dashboard de gestion centralisé

---

## 🏗️ Structure de Données Firestore

### Collection `organizations`

```typescript
{
  id: string;                        // ID unique de l'organisation
  name: string;                      // Nom officiel (ex: "Gare Routière de Lomé")
  legalName: string;                 // Raison sociale complète
  type: OrganizationType;            // Type d'organisation
  category: string;                  // Catégorie (transport, education, health, etc.)

  // Informations de contact
  email: string;                     // Email officiel
  phone: string;                     // Téléphone principal
  address: {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Média
  logo?: string;                     // URL du logo (Firebase Storage)
  banner?: string;                   // URL de la bannière
  photos?: string[];                 // Photos de l'organisation

  // Vérification
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  verificationDocuments: {
    registrationNumber?: string;     // Numéro d'enregistrement commercial
    taxId?: string;                  // Numéro fiscal
    documentUrls: string[];          // Documents de vérification (registre de commerce, etc.)
  };
  verifiedAt?: Timestamp;
  verifiedBy?: string;               // UID du modérateur

  // Permissions
  canPost: boolean;                  // Peut publier des annonces
  canVerify: boolean;                // Peut vérifier ses propres utilisateurs (ex: université vérifie étudiants)
  maxPostsPerDay: number;            // Limite de publications par jour

  // Super-organisation (optionnel)
  parentOrgId?: string;              // ID de l'organisation parente
  childOrgIds?: string[];            // IDs des organisations enfants

  // Statistiques
  stats: {
    totalPosts: number;
    totalFollowers: number;
    totalViews: number;
  };

  // Métadonnées
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;                 // UID de l'utilisateur créateur
  status: 'active' | 'inactive' | 'suspended';

  // Contact d'urgence
  emergencyContact?: {
    name: string;
    phone: string;
    email: string;
  };
}
```

### Collection `organizationMembers`

```typescript
{
  id: string;
  organizationId: string;            // Référence à l'organisation
  userId: string;                    // UID de l'utilisateur Firebase

  // Rôle
  role: 'owner' | 'admin' | 'moderator' | 'publisher' | 'viewer';
  permissions: {
    canPublish: boolean;
    canEditOrg: boolean;
    canManageMembers: boolean;
    canViewAnalytics: boolean;
    canDeletePosts: boolean;
  };

  // Métadonnées
  invitedBy?: string;                // UID de l'inviteur
  invitedAt?: Timestamp;
  joinedAt: Timestamp;
  status: 'active' | 'suspended';
}
```

### Collection `organizationRequests`

```typescript
{
  id: string;
  requestType: 'new_organization' | 'claim_existing' | 'join_organization';

  // Informations de l'organisation
  organizationData: {
    name: string;
    legalName: string;
    type: string;
    category: string;
    email: string;
    phone: string;
    address: object;
  };

  // Demandeur
  requestedBy: string;               // UID de l'utilisateur
  requestedByName: string;
  requestedByEmail: string;
  requestedByPhone: string;
  requestedRole: string;             // Rôle demandé (owner, admin, etc.)

  // Documents
  documents: {
    registrationCertificate?: string;
    businessLicense?: string;
    idCard?: string;
    proofOfAuthority?: string;       // Preuve de représentation légale
    other?: string[];
  };

  // Statut
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: Timestamp;
  reviewedBy?: string;               // UID du modérateur
  reviewNotes?: string;

  // Métadonnées
  submittedAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Mise à jour de `reports` (publications)

```typescript
{
  // ... champs existants ...

  // NOUVEAU: Champs pour publications organisationnelles
  publishedBy: 'user' | 'organization';
  organizationId?: string;           // Si publié par une organisation

  // Badge et affichage
  isOfficialPost: boolean;           // true si publication d'organisation vérifiée
  organizationName?: string;         // Nom de l'organisation (dénormalisé pour performance)
  organizationLogo?: string;         // Logo de l'organisation (dénormalisé)

  // Métadonnées organisationnelles
  organizationCategory?: string;     // Catégorie de l'organisation
  isPriority: boolean;               // Publication prioritaire (affichée en premier)
}
```

---

## 🔐 Sécurité et Permissions

### Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Organisations
    match /organizations/{orgId} {
      // Lecture publique (pour afficher les publications)
      allow read: if true;

      // Création: utilisateur authentifié seulement (demande de vérification requise)
      allow create: if request.auth != null;

      // Mise à jour: membres avec permission ou modérateurs
      allow update: if request.auth != null && (
        isMemberWithPermission(orgId, 'canEditOrg') ||
        request.auth.token.moderator == true
      );

      // Suppression: modérateurs seulement
      allow delete: if request.auth != null &&
        request.auth.token.moderator == true;
    }

    // Membres d'organisations
    match /organizationMembers/{memberId} {
      // Lecture: membres de l'organisation ou modérateurs
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        resource.data.organizationId == getOrgIdForUser(request.auth.uid) ||
        request.auth.token.moderator == true
      );

      // Création/Mise à jour: admins de l'organisation ou modérateurs
      allow create, update: if request.auth != null && (
        isMemberWithPermission(resource.data.organizationId, 'canManageMembers') ||
        request.auth.token.moderator == true
      );

      // Suppression: admins ou modérateurs
      allow delete: if request.auth != null && (
        isMemberWithPermission(resource.data.organizationId, 'canManageMembers') ||
        request.auth.token.moderator == true
      );
    }

    // Demandes d'organisations
    match /organizationRequests/{requestId} {
      // Lecture: demandeur ou modérateurs
      allow read: if request.auth != null && (
        resource.data.requestedBy == request.auth.uid ||
        request.auth.token.moderator == true
      );

      // Création: utilisateur authentifié
      allow create: if request.auth != null &&
        request.resource.data.requestedBy == request.auth.uid;

      // Mise à jour/Suppression: modérateurs seulement
      allow update, delete: if request.auth != null &&
        request.auth.token.moderator == true;
    }

    // Publications avec support organisationnel
    match /reports/{reportId} {
      allow read: if true;

      allow create: if request.auth != null && (
        // Publication utilisateur standard
        (request.resource.data.publishedBy == 'user' &&
         request.resource.data.userId == request.auth.uid) ||
        // Publication organisationnelle
        (request.resource.data.publishedBy == 'organization' &&
         canPublishForOrganization(request.resource.data.organizationId))
      );

      allow update: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        (resource.data.publishedBy == 'organization' &&
         canPublishForOrganization(resource.data.organizationId)) ||
        request.auth.token.moderator == true
      );

      allow delete: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        request.auth.token.moderator == true
      );
    }

    // Fonctions helper
    function isMemberWithPermission(orgId, permission) {
      let member = get(/databases/$(database)/documents/organizationMembers/$(orgId + '_' + request.auth.uid));
      return member.data.status == 'active' &&
             member.data.permissions[permission] == true;
    }

    function canPublishForOrganization(orgId) {
      let org = get(/databases/$(database)/documents/organizations/$(orgId));
      let member = get(/databases/$(database)/documents/organizationMembers/$(orgId + '_' + request.auth.uid));
      return org.data.canPost == true &&
             org.data.verificationStatus == 'approved' &&
             member.data.status == 'active' &&
             member.data.permissions.canPublish == true;
    }
  }
}
```

---

## 🎨 UI/UX

### Badge Vérifié

- **Icône**: ✓ dans un cercle bleu
- **Position**: À côté du nom de l'organisation
- **Tooltip**: "Organisation vérifiée"

### Carte de Publication Organisationnelle

```
┌──────────────────────────────────┐
│ [Logo] Gare Routière de Lomé ✓  │
│        Transport                  │
├──────────────────────────────────┤
│ [Image de la publication]         │
├──────────────────────────────────┤
│ Titre: Horaires modifiés          │
│ Description: Les bus vers...      │
│                                   │
│ 📍 Lomé, Togo                     │
│ 🕐 Il y a 2 heures                │
│ 👁️ 1.2k vues                      │
└──────────────────────────────────┘
```

### Filtre de Recherche

Ajouter un filtre "Publications officielles seulement":
- Toggle switch dans l'écran de recherche
- Permet de filtrer uniquement les publications d'organisations vérifiées

---

## 📱 Flux Utilisateur

### 1. Création d'Organisation

```
1. Utilisateur clique "Créer une organisation"
2. Formulaire avec:
   - Nom de l'organisation
   - Type (Gare, Université, Hôpital, etc.)
   - Email officiel
   - Téléphone
   - Adresse
   - Upload du logo
   - Documents de vérification
3. Soumission → Status "En attente de vérification"
4. Modérateur examine la demande
5. Approbation → Organisation activée
6. Utilisateur reçoit notification
```

### 2. Publication d'Annonce Organisationnelle

```
1. Membre avec permission "canPublish"
2. Sélectionne "Publier pour [Organisation]"
3. Formulaire standard de publication avec:
   - Badge "Publication officielle" visible
   - Catégories adaptées au type d'organisation
4. Soumission
5. Publication affichée avec badge vérifié
```

### 3. Gestion des Membres

```
1. Admin de l'organisation
2. Accède à "Gérer les membres"
3. Peut:
   - Inviter des membres (par email/phone)
   - Définir les rôles et permissions
   - Suspendre/Réactiver des membres
   - Voir l'historique des publications par membre
```

---

## 🔧 Composants React Native

### 1. OrganizationBadge

```typescript
interface OrganizationBadgeProps {
  organizationName: string;
  organizationLogo?: string;
  isVerified: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function OrganizationBadge({
  organizationName,
  organizationLogo,
  isVerified,
  size = 'medium'
}: OrganizationBadgeProps) {
  return (
    <View style={styles.container}>
      {organizationLogo && (
        <Image source={{ uri: organizationLogo }} style={styles.logo} />
      )}
      <Text style={styles.name}>{organizationName}</Text>
      {isVerified && (
        <Ionicons name="checkmark-circle" size={16} color="#1d4ed8" />
      )}
    </View>
  );
}
```

### 2. OrganizationPostCard

Carte de publication avec badge organisationnel intégré.

### 3. OrganizationSelector

Composant permettant de choisir entre publier en tant qu'utilisateur ou organisation.

---

## 🌐 Admin Web - Nouvelles Pages

### 1. `/organizations` - Liste des Organisations

- Tableau avec:
  - Logo
  - Nom
  - Type
  - Status de vérification
  - Nombre de membres
  - Nombre de publications
  - Actions (Voir, Éditer, Suspendre)

### 2. `/organization-requests` - Demandes d'Organisations

- Tableau des demandes en attente
- Vue détaillée avec:
  - Informations de l'organisation
  - Documents uploadés
  - Informations du demandeur
  - Actions: Approuver / Rejeter / Demander plus d'infos

### 3. `/organizations/:id` - Détails Organisation

- Informations complètes
- Liste des membres
- Historique des publications
- Statistiques
- Actions de modération

---

## 📈 Métriques et Analytics

### Métriques par Organisation

```typescript
{
  totalPosts: number;                // Total de publications
  totalViews: number;                // Vues totales
  totalInteractions: number;         // Likes + Commentaires + Partages
  totalFollowers: number;            // Abonnés
  averageEngagementRate: number;     // Taux d'engagement moyen
  topPosts: Post[];                  // Top 5 publications
  growth: {
    postsThisMonth: number;
    viewsThisMonth: number;
    followersThisMonth: number;
  };
}
```

---

## 🚀 Phases d'Implémentation

### Phase 1: Structure de Base
- ✅ Firestore collections et security rules
- ✅ Cloud Functions pour validation
- ✅ Composants UI de base (badge, carte)

### Phase 2: Admin Web
- ✅ Page de gestion des organisations
- ✅ Page de demandes
- ✅ Workflow d'approbation

### Phase 3: Mobile App
- ✅ Création d'organisation
- ✅ Sélecteur de contexte (user vs org)
- ✅ Publication organisationnelle
- ✅ Profil d'organisation

### Phase 4: Fonctionnalités Avancées
- ✅ Gestion des membres
- ✅ Abonnements aux organisations
- ✅ Notifications push pour publications officielles
- ✅ Analytics dashboard

---

## 🎯 Cas d'Usage Principaux

### 1. Gare Routière
- Type: `transport_station`
- Publications: Horaires, retards, annulations, nouveaux trajets
- Permissions: Personnel autorisé uniquement

### 2. Université
- Type: `education_institution`
- Publications: Examens, événements, résultats, inscriptions
- Permissions: Administration, enseignants autorisés
- Fonctionnalité spéciale: Vérification des étudiants

### 3. Hôpital
- Type: `healthcare_facility`
- Publications: Horaires de garde, campagnes de santé, urgences
- Permissions: Personnel médical autorisé

### 4. Entreprise
- Type: `business`
- Publications: Offres d'emploi, produits, services
- Permissions: Équipe marketing/RH

---

## 🔒 Sécurité Renforcée

### Vérification Multi-Niveaux

1. **Documents Légaux**: Registre de commerce, licence
2. **Identité du Représentant**: Carte d'identité + preuve de fonction
3. **Vérification Téléphonique**: Appel au numéro officiel
4. **Vérification Email**: Email depuis domaine officiel
5. **Vérification Physique** (optionnel): Visite sur place pour grandes organisations

### Protection Contre la Fraude

- Limite de demandes par utilisateur (max 3 organisations)
- Vérification du domaine email (doit correspondre à l'organisation)
- Liste noire de noms d'organisations sensibles
- Modération humaine obligatoire (pas d'auto-approbation)

---

## 📝 Types TypeScript

```typescript
type OrganizationType =
  | 'transport_station'      // Gare
  | 'education_institution'  // Université, École
  | 'healthcare_facility'    // Hôpital, Clinique
  | 'government_office'      // Mairie, Préfecture
  | 'business'               // Entreprise
  | 'ngo'                    // ONG
  | 'religious_org'          // Organisation religieuse
  | 'media'                  // Média
  | 'other';

type MemberRole =
  | 'owner'       // Propriétaire (créateur)
  | 'admin'       // Administrateur
  | 'moderator'   // Modérateur
  | 'publisher'   // Peut publier
  | 'viewer';     // Peut voir seulement

interface OrganizationPermissions {
  canPublish: boolean;
  canEditOrg: boolean;
  canManageMembers: boolean;
  canViewAnalytics: boolean;
  canDeletePosts: boolean;
}
```

---

## ✅ Checklist Technique

- [ ] Créer collections Firestore
- [ ] Implémenter security rules
- [ ] Cloud Functions de validation
- [ ] Composants React Native
- [ ] Pages Admin Web
- [ ] Tests de permissions
- [ ] Documentation utilisateur
- [ ] Migration des données existantes (si nécessaire)

---

Ce système permettra à FindConnect Afrique de devenir une plateforme de référence pour les annonces officielles et personnelles au Togo et dans toute l'Afrique de l'Ouest.
