# ⚡ DÉPLOIEMENT IMMÉDIAT - 2 Étapes Seulement

## 🎯 Pour Résoudre l'Erreur "not-found"

Vous avez déjà déployé les règles et index Firestore ✅
Il ne reste QUE les Cloud Functions à déployer.

---

## Étape 1️⃣ : Activer Cloud Vision API (1 minute)

**Ouvrez ce lien dans votre navigateur :**

👉 https://console.cloud.google.com/apis/library/vision.googleapis.com

1. Vérifiez que le projet **"agoo-alert"** est sélectionné en haut
2. Cliquez sur **"ACTIVER"**
3. Attendez 10 secondes

✅ **C'est fait !**

---

## Étape 2️⃣ : Déployer les Cloud Functions (3 minutes)

**Ouvrez PowerShell ou CMD et collez ces commandes :**

```bash
cd "c:\Users\YOUSIF FOUSSENI\findconnect-afrique\agoo-alert"
firebase deploy --only functions
```

**Attendez 2-5 minutes** pendant le déploiement.

**Vous devez voir :**
```
✔ functions[detectFaceInSelfie(us-central1)] Successful update operation.
✔ functions[processIdCardOCR(us-central1)] Successful update operation.
✔ Deploy complete!
```

✅ **C'est fait !**

---

## ✅ Vérification Rapide

```bash
firebase functions:list
```

**Vous devez voir :**
- detectFaceInSelfie
- processIdCardOCR

---

## 🧪 Test Final

```bash
npm start
```

1. Connectez-vous à l'app
2. Essayez de créer une alerte
3. Cliquez "Vérifier maintenant"
4. Passez par les 4 étapes
5. Soumettez

**Résultat attendu :**
- ✅ PAS d'erreur "not-found"
- ✅ Message "Demande envoyée"

---

## ⚠️ Si Erreur "Billing Required"

Firebase Functions nécessite le plan Blaze (pay-as-you-go).

1. Allez sur : https://console.firebase.google.com/project/agoo-alert/overview
2. Cliquez "Upgrade"
3. Sélectionnez **Blaze**
4. Configurez la facturation (carte bancaire requise)

**Ne vous inquiétez pas :**
- Quota gratuit très généreux (2M invocations/mois)
- Pour un projet de test, vous ne paierez probablement rien

Puis relancez :
```bash
firebase deploy --only functions
```

---

## 🎉 C'est Tout !

**2 étapes = Problème résolu**

1. ✅ Activer Cloud Vision API
2. ✅ Déployer les functions

**L'erreur "not-found" disparaîtra complètement ! 🚀**
