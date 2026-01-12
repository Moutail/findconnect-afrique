# 🚀 Déploiement Rapide - FindConnect Afrique

## ✅ Ce qui a été fait dans le code

1. ✅ Règles Firestore mises à jour
2. ✅ Règles Storage créées
3. ✅ Index Firestore configurés (fichier `firestore.indexes.json`)
4. ✅ Cloud Functions créées (OCR + détection de visage)
5. ✅ Écran de connexion avec pseudonyme
6. ✅ Système de vérification d'identité complet
7. ✅ Restrictions de publication pour non-vérifiés

---

## 📋 CE QUE VOUS DEVEZ FAIRE MAINTENANT

### 1️⃣ Installer les dépendances (1 minute)

Ouvrez un terminal PowerShell/CMD :

```bash
cd "c:\Users\YOUSIF FOUSSENI\findconnect-afrique\agoo-alert"

# Installer expo-camera
npx expo install expo-camera

# Installer la dépendance Cloud Functions
cd functions
npm install @google-cloud/vision
cd ..
```

---

### 2️⃣ Déployer sur Firebase (2 minutes)

**Option A - Script automatique (RECOMMANDÉ):**

Double-cliquez sur le fichier **`agoo-alert/deploy.bat`**

Ou dans le terminal :
```bash
cd agoo-alert
deploy.bat
```

**Option B - Commandes manuelles:**

```bash
cd agoo-alert

# 1. Règles Firestore
firebase deploy --only firestore:rules

# 2. Index Firestore (IMPORTANT!)
firebase deploy --only firestore:indexes

# 3. Règles Storage
firebase deploy --only storage
```

⏳ **Attendez que les index soient créés** (visible dans Firebase Console > Firestore > Indexes)
Statut doit passer de "En cours de création..." à "Activé" (1-2 minutes)

---

### 3️⃣ Déployer les Cloud Functions (OPTIONNEL pour l'instant)

Vous pouvez **sauter cette étape pour l'instant** et la faire plus tard quand vous serez prêt à tester la vérification complète.

```bash
cd functions
firebase deploy --only functions:processIdCardOCR,functions:detectFaceInSelfie
```

---

### 4️⃣ Activer Google Cloud Vision API (OPTIONNEL)

**Seulement si vous déployez les Cloud Functions.**

1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Sélectionnez projet `agoo-alert`
3. Menu : APIs & Services > Library
4. Recherchez "Cloud Vision API"
5. Cliquez "Enable"

---

### 5️⃣ Tester l'application

```bash
cd agoo-alert
npm start
```

**Tests à faire :**

1. ✅ **Inscription avec pseudonyme**
   - Créer un nouveau compte
   - Vérifier que le champ "Pseudonyme" apparaît
   - Remplir tous les champs et s'inscrire

2. ✅ **Vérifier dans Firebase Console**
   - Firestore > users
   - Trouver votre utilisateur
   - Vérifier les champs : `pseudonym`, `verificationStatus: 'unverified'`, `canPost: false`

3. ✅ **Tester la restriction de publication**
   - Aller sur l'onglet "Explorer/Déclarer"
   - Essayer de créer une alerte
   - **Attendu** : Message "Vérification requise"

4. ⏳ **Tester la vérification (si Cloud Functions déployées)**
   - Cliquer sur "Vérifier maintenant"
   - Passer par les 4 étapes
   - Soumettre
   - Vérifier dans Firestore : `verificationStatus: 'pending'`

---

## 🎯 Index Firestore - Vérification

Après le déploiement, vérifiez que les index sont créés :

1. Firebase Console > Firestore Database > **Indexes**
2. Vous devriez voir ces index (certains peuvent être "En cours de création...") :

   - ✅ `conversations` : participants (array-contains) + lastMessageAt (desc)
   - ✅ `reports` : moderationStatus (asc) + createdAt (desc)
   - ✅ `reports` : type (asc) + moderationStatus (asc) + createdAt (desc)
   - ✅ `verificationRequests` : status (asc) + submittedAt (desc)
   - ✅ `verificationRequests` : userId (asc) + submittedAt (desc)
   - ✅ `users` : verificationStatus (asc) + updatedAt (desc)

**Attendez que tous soient "Activé" avant de tester !**

---

## ❌ Dépannage Rapide

### Erreur "Missing or insufficient permissions"
➡️ Vous n'avez pas déployé les règles Firestore
```bash
firebase deploy --only firestore:rules
```

### Erreur "The query requires an index"
➡️ Cliquez sur le lien dans l'erreur OU déployez les index :
```bash
firebase deploy --only firestore:indexes
```
Puis attendez 1-2 minutes que les index soient créés.

### Erreur "expo-camera not found"
➡️
```bash
npx expo install expo-camera
```

### Les conversations ne se chargent pas
➡️ Index manquant. Vérifiez Firebase Console > Firestore > Indexes
L'index `conversations` doit être "Activé" (pas "En cours de création")

---

## 📊 Ordre Recommandé

1. ✅ **Installer les dépendances** (npx expo install expo-camera)
2. ✅ **Déployer les règles et index** (deploy.bat OU commandes manuelles)
3. ✅ **Attendre que les index soient activés** (Firebase Console)
4. ✅ **Tester l'inscription avec pseudonyme**
5. ✅ **Tester la restriction de publication**
6. ⏳ **Plus tard** : Déployer Cloud Functions + tester vérification complète

---

## 🎉 Résultat Final

Une fois tout déployé et testé, votre app aura :
- ✅ Inscription avec pseudonyme (nom public) + identité réelle (privée)
- ✅ Blocage de publication pour utilisateurs non vérifiés
- ✅ Processus de vérification d'identité en 4 étapes
- ✅ Protection des données sensibles (selfie, carte d'identité)
- ✅ Tous les index Firestore créés (pas d'erreur "requires an index")

**Questions ? Problèmes ? Dites-moi ! 🚀**
