# 🔍 Guide de Vérification Complète - FindConnect Afrique

## ❌ Erreur Actuelle à Résoudre

```
ERROR Face detection error: [FirebaseError: not-found]
ERROR OCR error: [FirebaseError: not-found]
```

**Cause:** Les Cloud Functions ne sont pas encore déployées sur Firebase.

---

## 🚀 Solution Étape par Étape

### Étape 1: Installer Google Cloud Vision SDK

```bash
cd "c:\Users\YOUSIF FOUSSENI\findconnect-afrique\agoo-alert\functions"
npm install @google-cloud/vision
```

---

### Étape 2: Activer Google Cloud Vision API

**OBLIGATOIRE** - Sans cette étape, les functions échoueront.

1. Allez sur: https://console.cloud.google.com/apis/library/vision.googleapis.com
2. Sélectionnez votre projet **"agoo-alert"** en haut
3. Cliquez **"ACTIVER"**
4. Attendez 10-20 secondes

---

### Étape 3: Déployer les Cloud Functions

```bash
cd "c:\Users\YOUSIF FOUSSENI\findconnect-afrique\agoo-alert"
firebase deploy --only functions
```

**Temps:** 2-5 minutes

**Résultat attendu:**
```
✔ functions[detectFaceInSelfie(us-central1)] Successful update operation.
✔ functions[processIdCardOCR(us-central1)] Successful update operation.
```

---

### Étape 4: Vérifier le Déploiement

```bash
firebase functions:list
```

Vous devriez voir:
```
detectFaceInSelfie
processIdCardOCR
```

---

## 🧪 Test Complet

### 1. Inscription Nouvel Utilisateur

```bash
cd "c:\Users\YOUSIF FOUSSENI\findconnect-afrique\agoo-alert"
npm start
```

- Déconnexion si connecté
- S'inscrire avec un nouveau numéro: +22899998888
- Prénom: Jean, Nom: Dupont, Pseudonyme: jeandupont2025
- Mot de passe: Test1234!

**Attendu:** ✅ Inscription réussie, pas d'erreur

---

### 2. Vérifier dans Firestore

Allez sur: https://console.firebase.google.com/project/agoo-alert/firestore/data/users

Vérifiez votre utilisateur:
```
✅ pseudonym: "jeandupont2025"
✅ verificationStatus: "unverified"
✅ canPost: false
❌ Aucun champ "undefined"
```

---

### 3. Tester Restriction de Publication

- Allez sur "Explorer" ou "Déclarer"
- Essayez de créer une alerte
- Cliquez "Soumettre"

**Attendu:**
```
Alert: "Vérification requise"
Bouton: "Vérifier maintenant"
```

---

### 4. Processus de Vérification

Cliquez "Vérifier maintenant":

#### Étape 1/4: Instructions
- Lisez les instructions
- Cliquez "Suivant"

#### Étape 2/4: Selfie
- Accordez permission caméra
- Positionnez visage dans le cercle
- Cliquez bouton caméra
- Vérifiez aperçu
- Cliquez "Suivant"

#### Étape 3/4: Carte d'Identité
- Choisissez "Prendre photo" ou "Galerie"
- Prenez/sélectionnez photo claire de votre carte
- Vérifiez aperçu
- Cliquez "Suivant"

#### Étape 4/4: Vérification
- Vérifiez les deux photos
- Cliquez "Soumettre la demande"

---

### 5. Résultat de la Soumission

**SI FUNCTIONS DÉPLOYÉES (✅ attendu):**
```
✅ Upload selfie → Succès
✅ Upload carte ID → Succès
✅ Détection visage → Succès
✅ OCR carte → Succès
Alert: "Demande envoyée"
```

**SI FUNCTIONS PAS DÉPLOYÉES (❌ erreur):**
```
ERROR Face detection error: [FirebaseError: not-found]
ERROR OCR error: [FirebaseError: not-found]
Alert: "Erreur lors de la soumission"
```

→ Si vous obtenez l'erreur, retournez à l'Étape 3

---

### 6. Vérifier dans Firestore - verificationRequests

Allez sur: https://console.firebase.google.com/project/agoo-alert/firestore/data/verificationRequests

Document le plus récent doit contenir:
```javascript
{
  userId: "...",
  status: "pending",
  selfieUrl: "gs://...",
  idCardUrl: "gs://...",

  detectionResults: {
    faceDetected: true,
    faceCount: 1,
    confidence: 0.95
  },

  ocrResults: {
    success: true,
    fullName: "DUPONT Jean",
    idNumber: "12345678",
    dateOfBirth: "01/01/1990"
  },

  submittedAt: Timestamp(...)
}
```

---

### 7. Approuver Manuellement (Simulation Admin)

**Dans users collection:**

1. Allez sur: https://console.firebase.google.com/project/agoo-alert/firestore/data/users
2. Trouvez votre utilisateur
3. Modifiez:
   ```
   verificationStatus: "approved"
   canPost: true
   ```
4. Sauvegardez

**Dans verificationRequests collection:**

1. Trouvez votre demande
2. Modifiez:
   ```
   status: "approved"
   reviewedAt: (timestamp actuel)
   reviewedBy: "admin"
   ```

---

### 8. Test Publication Après Approbation

- Fermez et relancez l'app: `npm start`
- Connectez-vous
- Allez sur "Explorer"
- Créez une alerte:
  ```
  Titre: Test Alert Verified
  Description: This is a test
  Catégorie: Sécurité
  ```
- Cliquez "Soumettre"

**Attendu:**
```
✅ Alerte créée (PAS de message "Vérification requise")
✅ Redirection vers liste
✅ Alerte visible
```

---

### 9. Vérifier l'Alerte dans Firestore

Allez sur: https://console.firebase.google.com/project/agoo-alert/firestore/data/reports

Dernière alerte:
```javascript
{
  createdBy: "...",
  authorName: "jeandupont2025",  // ← PSEUDONYME (pas vrai nom!)
  title: "Test Alert Verified",
  description: "This is a test",
  category: "Sécurité",
  moderationStatus: "pending",
  createdAt: Timestamp(...)
}
```

**IMPORTANT:** `authorName` = pseudonyme (identité protégée)

---

## ✅ Checklist Rapide

Cochez au fur et à mesure:

### Configuration
- [ ] `@google-cloud/vision` installé dans functions/
- [ ] Google Cloud Vision API activée
- [ ] Cloud Functions déployées
- [ ] `firebase functions:list` montre les 2 functions

### Tests
- [ ] Inscription → Succès
- [ ] Document user avec pseudonym créé
- [ ] Restriction publication → Message "Vérification requise"
- [ ] Selfie capture → Succès
- [ ] Carte ID upload → Succès
- [ ] Soumission → PAS d'erreur "not-found"
- [ ] Document verificationRequests créé avec detectionResults et ocrResults
- [ ] Approbation manuelle faite
- [ ] Publication alerte → Succès
- [ ] authorName = pseudonyme (pas vrai nom)

---

## 🐛 Dépannage

### "not-found" persiste

```bash
# Vérifiez déploiement
firebase functions:list

# Redéployez si nécessaire
firebase deploy --only functions --force

# Relancez l'app
npm start
```

---

### "PERMISSION_DENIED" Vision API

- Vérifiez que Vision API est activée: https://console.cloud.google.com/apis/library/vision.googleapis.com
- Vérifiez le bon projet sélectionné: "agoo-alert"

---

### OCR n'extrait pas les données

Le code est optimisé pour cartes togolaises. Si autre pays, modifiez `functions/src/ocrProcessor.ts`:

```typescript
function extractIdData(text: string) {
  // Adaptez les regex selon votre format
  const idNumberMatch = text.match(/N[°º]?\s*(\d+)/i);
  const nameMatch = text.match(/Nom[:\s]+([A-Z\s]+)/i);
  // ...
}
```

---

## 🎉 Résultat Final

Si tous les tests passent ✅:

**Système Fonctionnel:**
1. ✅ Inscription avec pseudonyme
2. ✅ Blocage publication pour non-vérifiés
3. ✅ Vérification par selfie + carte ID
4. ✅ Détection automatique visage
5. ✅ Extraction automatique OCR
6. ✅ Publication après approbation
7. ✅ Pseudonyme affiché publiquement
8. ✅ Identité réelle protégée (visible admins uniquement)

**Votre application est prête! 🚀**

---

## 📝 Prochaines Étapes (Optionnel)

- Interface admin pour gérer les vérifications
- Notifications push à l'approbation
- Amélioration OCR multi-formats
- Vérification correspondance selfie ↔ photo carte
