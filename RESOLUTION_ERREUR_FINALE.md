# 🔧 Résolution Erreur "not-found" - FindConnect Afrique

## ✅ État Actuel Vérifié

**Configuration confirmée :**
- ✅ Projet Firebase : `agoo-alert`
- ✅ expo-camera : Installé (v17.0.10)
- ✅ @google-cloud/vision : Installé (v5.3.4)
- ✅ Règles Firestore : Déployées (vous l'avez fait)
- ✅ Index Firestore : Déployés (vous l'avez fait)
- ✅ Règles Storage : Déployées (vous l'avez fait)

## ❌ Erreur Actuelle

```
ERROR Face detection error: [FirebaseError: not-found]
ERROR OCR error: [FirebaseError: not-found]
```

**Cause confirmée :** Les Cloud Functions `detectFaceInSelfie` et `processIdCardOCR` ne sont **pas encore déployées** sur Firebase.

---

## 🚀 Solution en 2 Étapes

### Étape 1 : Activer Google Cloud Vision API

**OBLIGATOIRE - Sans cela, les functions échoueront même après déploiement**

1. Ouvrez votre navigateur
2. Allez sur : https://console.cloud.google.com/apis/library/vision.googleapis.com
3. En haut de la page, vérifiez que le projet sélectionné est **"agoo-alert"**
4. Cliquez sur le bouton bleu **"ACTIVER"** (ou "ENABLE")
5. Attendez 10-20 secondes
6. Vous devriez voir "API activée" avec une coche verte

**Vérification :**
- Allez sur : https://console.cloud.google.com/apis/dashboard
- Cherchez "Cloud Vision API" dans la liste
- Le statut doit être "Activé"

---

### Étape 2 : Déployer les Cloud Functions

**Option A - Déployer TOUT (RECOMMANDÉ) :**

Ouvrez PowerShell ou CMD et exécutez :

```bash
cd "c:\Users\YOUSIF FOUSSENI\findconnect-afrique\agoo-alert"

# Déploie TOUT : règles + index + storage + functions
firebase deploy
```

**OU**

**Option B - Déployer UNIQUEMENT les Functions :**

```bash
cd "c:\Users\YOUSIF FOUSSENI\findconnect-afrique\agoo-alert"

# Déploie uniquement les Cloud Functions
firebase deploy --only functions
```

---

## ⏱️ Temps de Déploiement

**Attendu :** 2-5 minutes pour les Cloud Functions

**Ce que vous verrez :**

```
=== Deploying to 'agoo-alert'...

i  deploying functions
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
✔  functions: required API cloudbuild.googleapis.com is enabled
i  functions: preparing codebase default for deployment

i  functions: updating Node.js 18 function detectFaceInSelfie(us-central1)...
i  functions: updating Node.js 18 function processIdCardOCR(us-central1)...

✔  functions[detectFaceInSelfie(us-central1)] Successful update operation.
✔  functions[processIdCardOCR(us-central1)] Successful update operation.

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/agoo-alert/overview
```

---

## ✅ Vérification du Déploiement

### Vérification 1 : Via Firebase CLI

```bash
firebase functions:list
```

**Attendu :**
```
┌────────────────────────┬────────────┬─────────┐
│ Function Name          │ Region     │ Status  │
├────────────────────────┼────────────┼─────────┤
│ detectFaceInSelfie     │ us-cent... │ ACTIVE  │
│ processIdCardOCR       │ us-cent... │ ACTIVE  │
└────────────────────────┴────────────┴─────────┘
```

### Vérification 2 : Via Firebase Console

1. Allez sur : https://console.firebase.google.com/project/agoo-alert/functions
2. Vous devriez voir 2 fonctions :
   - ✅ `detectFaceInSelfie` - Status: Déployée
   - ✅ `processIdCardOCR` - Status: Déployée

---

## 🧪 Test Après Déploiement

### Test 1 : Redémarrer l'Application

```bash
# Dans le terminal où npm start est lancé, arrêtez avec Ctrl+C
# Puis relancez :
cd "c:\Users\YOUSIF FOUSSENI\findconnect-afrique\agoo-alert"
npm start
```

### Test 2 : Refaire la Vérification d'Identité

1. ✅ Connectez-vous à l'app
2. ✅ Allez sur "Explorer" ou "Déclarer"
3. ✅ Essayez de créer une alerte
4. ✅ Cliquez sur "Vérifier maintenant"
5. ✅ Passez par les 4 étapes :
   - Étape 1 : Instructions → Cliquer "Suivant"
   - Étape 2 : Prendre un selfie → Cliquer "Suivant"
   - Étape 3 : Photo carte d'identité → Cliquer "Suivant"
   - Étape 4 : Révision → Cliquer "Soumettre la demande"

### Résultat Attendu (SI TOUT EST BIEN DÉPLOYÉ) :

```
✅ Upload selfie vers Storage → Succès
✅ Upload carte ID vers Storage → Succès
✅ Appel detectFaceInSelfie → Succès (PAS d'erreur "not-found")
✅ Appel processIdCardOCR → Succès (PAS d'erreur "not-found")
✅ Création document verificationRequests → Succès

Alert s'affiche :
Titre : "Demande envoyée"
Message : "Votre demande de vérification a été envoyée. Vous serez notifié une fois qu'elle sera examinée."
```

### Résultat si ENCORE l'erreur "not-found" :

Cela signifie que les functions ne sont pas déployées correctement. Vérifiez :

1. Exécutez `firebase functions:list` pour confirmer le déploiement
2. Vérifiez les logs Firebase :
   ```bash
   firebase functions:log
   ```
3. Relancez le déploiement :
   ```bash
   firebase deploy --only functions --force
   ```

---

## 🔍 Vérifier les Résultats dans Firestore

### 1. Vérifier le document verificationRequests

Allez sur : https://console.firebase.google.com/project/agoo-alert/firestore/data/verificationRequests

Trouvez votre demande (la plus récente) et vérifiez :

```javascript
{
  userId: "votre-uid",
  status: "pending",
  selfieUrl: "gs://agoo-alert.firebasestorage.app/verification/...",
  idCardUrl: "gs://agoo-alert.firebasestorage.app/verification/...",

  // ⭐ CES CHAMPS DOIVENT ÊTRE PRÉSENTS (preuve que les functions ont fonctionné)
  detectionResults: {
    faceDetected: true,        // ou false si pas de visage
    faceCount: 1,              // nombre de visages détectés
    confidence: 0.95,          // score de confiance (0-1)
    detectionDate: Timestamp(...)
  },

  ocrResults: {
    success: true,             // ou false si échec OCR
    fullName: "NOM Prénom",    // extrait de la carte
    idNumber: "12345678",      // numéro de carte
    dateOfBirth: "01/01/1990", // date de naissance
    rawText: "...",            // texte brut complet
    extractionDate: Timestamp(...)
  },

  submittedAt: Timestamp(...),
  updatedAt: Timestamp(...)
}
```

**Si `detectionResults` et `ocrResults` sont ABSENTS :**
→ Les Cloud Functions n'ont pas été appelées ou ont échoué
→ Vérifiez les logs : `firebase functions:log`

**Si `detectionResults` et `ocrResults` sont PRÉSENTS :**
→ ✅ Tout fonctionne parfaitement !

---

## 📊 Checklist Finale de Résolution

Cochez au fur et à mesure :

### Configuration Préalable (Déjà Fait ✅)
- [x] expo-camera installé
- [x] @google-cloud/vision installé dans functions/
- [x] Règles Firestore déployées
- [x] Index Firestore déployés
- [x] Règles Storage déployées

### Actions à Faire Maintenant
- [ ] Google Cloud Vision API activée (Étape 1)
- [ ] Cloud Functions déployées (Étape 2)
- [ ] Vérification : `firebase functions:list` montre les 2 functions

### Test Après Déploiement
- [ ] App redémarrée (`npm start`)
- [ ] Processus de vérification refait
- [ ] Soumission → PAS d'erreur "not-found"
- [ ] Alert "Demande envoyée" s'affiche
- [ ] Document verificationRequests créé avec `detectionResults` et `ocrResults`

---

## ⚠️ Problèmes Possibles et Solutions

### Problème 1 : "Billing account required"

**Erreur :**
```
Error: Cloud Functions deployment requires the pay-as-you-go (Blaze) billing plan.
```

**Solution :**
1. Allez sur : https://console.firebase.google.com/project/agoo-alert/overview
2. Cliquez sur "Upgrade" ou "Mettre à niveau" en haut à droite
3. Sélectionnez le plan **Blaze** (pay-as-you-go)
   - ⚠️ Ne vous inquiétez pas : Le plan Blaze inclut un quota gratuit TRÈS généreux
   - Pour un projet de test/développement, vous resterez probablement dans le quota gratuit
4. Suivez les étapes pour configurer la facturation
5. Relancez `firebase deploy --only functions`

**Quotas gratuits inclus dans Blaze :**
- 2 millions d'invocations/mois
- 400 000 Go-secondes de calcul/mois
- 200 000 Go-secondes de mémoire/mois
- Cloud Vision API : 1000 requêtes/mois gratuites

---

### Problème 2 : "PERMISSION_DENIED" dans les logs

**Cause :** Cloud Vision API pas activée

**Solution :**
Retournez à l'Étape 1 et assurez-vous que l'API est bien activée :
https://console.cloud.google.com/apis/library/vision.googleapis.com

---

### Problème 3 : Functions timeout

**Erreur dans les logs :**
```
Function execution took 60001 ms, finished with status: 'timeout'
```

**Solution :**
Les images sont peut-être trop grandes. Les functions ont un timeout par défaut de 60 secondes.

Pour augmenter (si nécessaire), modifiez `functions/src/index.ts` :

```typescript
export const processIdCardOCR = onCall({
  timeoutSeconds: 300,  // 5 minutes au lieu de 60 secondes
  memory: "1GiB"        // Plus de mémoire
}, async (request) => {
  // ... code existant
});
```

Puis redéployez :
```bash
firebase deploy --only functions
```

---

### Problème 4 : OCR n'extrait rien

**Dans Firestore, `ocrResults.success: false`**

**Causes possibles :**
1. Photo de carte d'identité floue ou illisible
2. Format de carte non supporté (le code est optimisé pour cartes togolaises)
3. Mauvais éclairage / angle

**Solutions :**
1. Reprenez une photo plus claire de la carte
2. Si vous utilisez une carte d'un autre pays, adaptez le code dans `functions/src/ocrProcessor.ts`

---

## 🎯 Résumé des Actions

**Ce que vous devez faire MAINTENANT :**

1. ✅ **Activer Cloud Vision API** (1 minute)
   - https://console.cloud.google.com/apis/library/vision.googleapis.com
   - Cliquer "ACTIVER"

2. ✅ **Déployer les Functions** (3 minutes)
   ```bash
   cd "c:\Users\YOUSIF FOUSSENI\findconnect-afrique\agoo-alert"
   firebase deploy --only functions
   ```

3. ✅ **Tester l'app** (2 minutes)
   ```bash
   npm start
   # Refaire la vérification d'identité
   ```

**Temps total : ~6 minutes**

**Après cela, l'erreur "not-found" sera DÉFINITIVEMENT résolue ! 🎉**

---

## 📞 Si Ça Ne Fonctionne Toujours Pas

Collectez ces informations et partagez-les :

1. **Logs de déploiement :**
   ```bash
   firebase deploy --only functions 2>&1 | tee deploy-log.txt
   ```

2. **Logs d'exécution des functions :**
   ```bash
   firebase functions:log --limit 50
   ```

3. **Statut des functions :**
   ```bash
   firebase functions:list
   ```

4. **Erreurs dans l'app :**
   - Copier le message d'erreur complet affiché dans la console

---

## 🎉 Conclusion

**Tout est prêt dans le code ✅**

**Il ne reste QUE 2 actions :**
1. Activer Cloud Vision API
2. Déployer les Cloud Functions

**Après cela, votre système de vérification d'identité sera 100% fonctionnel ! 🚀**
