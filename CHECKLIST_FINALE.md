# ✅ Checklist Finale - FindConnect Afrique

## 📊 État Actuel du Projet

### ✅ Ce qui est FAIT dans le code (100%)

- ✅ Tous les fichiers créés/modifiés (13 fichiers)
- ✅ Règles Firestore avec fonction `isVerified()`
- ✅ Règles Storage pour documents de vérification
- ✅ Index Firestore configurés (firestore.indexes.json)
- ✅ Cloud Functions (OCR + détection de visage)
- ✅ Écran d'inscription avec pseudonyme
- ✅ Composant caméra selfie
- ✅ Écran de vérification d'identité (4 étapes)
- ✅ Utilitaires de vérification
- ✅ Restriction de publication pour non-vérifiés
- ✅ Script de déploiement automatique (deploy.bat)

---

## ⚠️ Ce qui RESTE À FAIRE (Actions requises de votre part)

### 🔴 CRITIQUE - Sans cela, l'app ne fonctionnera pas correctement

#### 1. Installer expo-camera
```bash
cd agoo-alert
npx expo install expo-camera
```
**Pourquoi ?** Sans cela, le composant SelfieCamera ne fonctionnera pas.

#### 2. Déployer les règles et index sur Firebase
```bash
cd agoo-alert
deploy.bat
```
**OU manuellement :**
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```
**Pourquoi ?**
- Sans les règles Firestore → Erreur "Missing or insufficient permissions"
- Sans les index → Erreur "The query requires an index"
- Sans les règles Storage → Impossible d'uploader des photos

#### 3. Attendre la création des index (1-2 minutes)
Vérifier sur [Firebase Console](https://console.firebase.google.com) > Firestore > Indexes
**Statut doit être "Activé"** pour tous les index

---

### 🟡 OPTIONNEL - Peut être fait plus tard

#### 4. Installer @google-cloud/vision (pour Cloud Functions)
```bash
cd agoo-alert/functions
npm install @google-cloud/vision
```

#### 5. Déployer les Cloud Functions
```bash
firebase deploy --only functions:processIdCardOCR,functions:detectFaceInSelfie
```

#### 6. Activer Google Cloud Vision API
[Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Library > "Cloud Vision API" > Enable

**Note :** Vous pouvez tester l'app SANS les Cloud Functions. La vérification d'identité ne fonctionnera pas complètement, mais l'inscription et la restriction de publication fonctionneront.

---

## 🧪 Plan de Test Complet

### Phase 1 : Test de Base (SANS Cloud Functions)

#### Test 1.1 : Inscription avec Pseudonyme
```
1. Lancer l'app : npm start
2. Aller sur l'écran de connexion
3. Cliquer "S'inscrire"
4. Vérifier que ces champs apparaissent :
   - Téléphone
   - Nom
   - Prénom
   - ✅ Pseudonyme (nouveau champ)
   - Mot de passe
   - Confirmation mot de passe
5. Remplir tous les champs
6. S'inscrire

✅ ATTENDU : Inscription réussie, redirection vers l'app
```

#### Test 1.2 : Vérification dans Firebase
```
1. Aller sur Firebase Console > Firestore Database > users
2. Trouver votre utilisateur nouvellement créé
3. Vérifier ces champs :
   ✅ uid
   ✅ phone
   ✅ displayName (nom complet)
   ✅ firstName
   ✅ lastName
   ✅ pseudonym (nouveau)
   ✅ verificationStatus: "unverified"
   ✅ canPost: false
   ✅ createdAt
   ✅ updatedAt

✅ ATTENDU : Tous ces champs doivent être présents
```

#### Test 1.3 : Restriction de Publication
```
1. Dans l'app, aller sur l'onglet "Explorer" ou "Déclarer"
2. Essayer de créer une nouvelle alerte
3. Remplir le formulaire
4. Cliquer "Soumettre"

✅ ATTENDU :
   - Alert s'affiche : "Vérification requise"
   - Message : "Vous devez vérifier votre identité avant de publier une alerte"
   - Bouton : "Vérifier maintenant"
```

#### Test 1.4 : Écran de Vérification (Sans Cloud Functions)
```
1. Cliquer sur "Vérifier maintenant"
2. Vérifier que l'écran s'affiche avec 4 étapes
3. Étape 1 : Instructions → Cliquer "Commencer"
4. Étape 2 : Selfie
   - Cliquer "Ouvrir la caméra"
   ⚠️ Si erreur "expo-camera not found" → Installer: npx expo install expo-camera
   - Autoriser la caméra
   - Prendre une photo
   - Vérifier la prévisualisation
   - Cliquer "Suivant"
5. Étape 3 : Carte d'identité
   - Cliquer "Choisir une photo"
   - Sélectionner n'importe quelle image
   - Vérifier la prévisualisation
   - Cliquer "Suivant"
6. Étape 4 : Révision
   - Vérifier que les 2 photos s'affichent
   - Cliquer "Soumettre"

⚠️ ATTENDU (SANS Cloud Functions) :
   - Upload des images → ✅ Fonctionne
   - Création de verificationRequest → ✅ Fonctionne
   - Appel OCR/détection de visage → ❌ Échoue (normal sans Cloud Functions)
   - Message : Probablement une erreur concernant les fonctions
```

---

### Phase 2 : Test Complet (AVEC Cloud Functions)

**Prérequis :**
- ✅ @google-cloud/vision installé
- ✅ Cloud Functions déployées
- ✅ Google Cloud Vision API activée

#### Test 2.1 : Vérification Complète
```
1. Répéter le Test 1.4 (processus de vérification)
2. À l'étape 4 (Soumettre) :

✅ ATTENDU :
   - Upload des images → ✅ Succès
   - Détection de visage → ✅ Succès (si visage sur photo)
   - OCR carte d'identité → ✅ Succès (extraction de texte)
   - Création verificationRequest → ✅ Succès
   - Message : "Demande envoyée avec succès"
```

#### Test 2.2 : Vérifier dans Firebase
```
1. Firebase Console > Firestore Database > verificationRequests
2. Trouver votre demande (dernière créée)
3. Vérifier ces champs :
   ✅ userId
   ✅ status: "pending"
   ✅ selfieUrl (URL Firebase Storage)
   ✅ idCardUrl (URL Firebase Storage)
   ✅ submittedAt
   ✅ faceDetection: { hasFace, faceCount, confidence }
   ✅ ocrData: { ... données extraites ... }
   ✅ autoChecksPassed: true/false

4. Firebase Console > Storage > verification/{userId}/
5. Vérifier que 2 images sont là :
   ✅ selfie_{timestamp}.jpg
   ✅ idcard_{timestamp}.jpg
```

---

## 🔍 Checklist de Déploiement

Cochez au fur et à mesure :

### Avant de tester
- [ ] expo-camera installé (`npx expo install expo-camera`)
- [ ] Règles Firestore déployées (`firebase deploy --only firestore:rules`)
- [ ] Index Firestore déployés (`firebase deploy --only firestore:indexes`)
- [ ] Règles Storage déployées (`firebase deploy --only storage`)
- [ ] Index Firestore statut = "Activé" (vérifier dans Firebase Console)

### Pour tester la vérification complète (optionnel)
- [ ] @google-cloud/vision installé (`cd functions && npm install @google-cloud/vision`)
- [ ] Cloud Functions déployées (`firebase deploy --only functions`)
- [ ] Google Cloud Vision API activée (Google Cloud Console)

---

## ❌ Problèmes Connus et Solutions

### Erreur 1 : "Missing or insufficient permissions"
**Cause :** Règles Firestore non déployées
**Solution :**
```bash
firebase deploy --only firestore:rules
```

### Erreur 2 : "The query requires an index"
**Cause :** Index Firestore non créés ou pas encore activés
**Solution :**
```bash
firebase deploy --only firestore:indexes
```
Puis attendre 1-2 minutes que les index passent à "Activé"

### Erreur 3 : "expo-camera not found"
**Cause :** Package expo-camera non installé
**Solution :**
```bash
npx expo install expo-camera
```

### Erreur 4 : Cloud Functions échouent
**Cause :** @google-cloud/vision non installé OU Cloud Vision API non activée
**Solution :**
```bash
cd functions
npm install @google-cloud/vision
firebase deploy --only functions
```
Puis activer Cloud Vision API sur Google Cloud Console

### Erreur 5 : "Cannot read property 'uri' of undefined" (caméra)
**Cause :** Permissions caméra refusées
**Solution :** Dans les paramètres de l'app/émulateur, autoriser l'accès à la caméra

---

## 🎯 État Recommandé pour Commencer les Tests

### Configuration Minimale (Test Phase 1)
✅ expo-camera installé
✅ Règles Firestore déployées
✅ Index Firestore déployés et activés
✅ Règles Storage déployées

**Avec cette configuration, vous pouvez tester :**
- ✅ Inscription avec pseudonyme
- ✅ Restriction de publication
- ✅ Interface de vérification (sans OCR/détection)
- ✅ Upload des photos vers Storage

### Configuration Complète (Test Phase 2)
✅ Tout de la configuration minimale
✅ @google-cloud/vision installé
✅ Cloud Functions déployées
✅ Cloud Vision API activée

**Avec cette configuration, vous pouvez tester :**
- ✅ Tout de la phase 1
- ✅ Détection automatique de visage
- ✅ OCR sur carte d'identité
- ✅ Système de vérification complet

---

## 📊 Résumé : Le projet fonctionne-t-il ?

### ✅ Code : OUI (100%)
Tous les fichiers sont créés et le code est prêt.

### ⚠️ Firebase : NON (0%) - Action requise
Vous devez déployer :
1. Règles Firestore
2. Index Firestore
3. Règles Storage

**Sans cela, l'app aura des erreurs de permissions.**

### ⚠️ Cloud Functions : NON (0%) - Optionnel
Vous devez :
1. Installer @google-cloud/vision
2. Déployer les fonctions
3. Activer Cloud Vision API

**Sans cela, la vérification d'identité ne sera pas complète, mais l'app fonctionnera quand même.**

---

## 🚀 Action Immédiate Recommandée

Exécutez ces 3 commandes dans l'ordre :

```bash
# 1. Installer expo-camera
cd agoo-alert
npx expo install expo-camera

# 2. Déployer Firebase (règles + index)
deploy.bat

# 3. Tester l'app
npm start
```

Puis attendez 1-2 minutes que les index soient créés (vérifier dans Firebase Console).

**Ensuite, testez avec la Phase 1 de test ! 🎉**

---

## 📞 Questions ?

Si vous avez des erreurs pendant les tests, comparez avec les "Problèmes Connus et Solutions" ci-dessus.

**Le projet est prêt à 100% côté code. Il ne reste que le déploiement Firebase ! 🚀**
