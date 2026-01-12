# 🔧 Dépannage - Écran Noir Admin Web

## ✅ CORRECTION APPLIQUÉE

J'ai ajouté l'export manquant de `storage` dans `admin-web/src/firebase.ts`.

**Changement:**
```typescript
// AVANT
export const auth = getAuth(app);
export const db = getFirestore(app);

// APRÈS
import { getStorage } from 'firebase/storage';
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);  // ← AJOUTÉ
```

---

## 🚀 Solutions pour Écran Noir

### Solution 1: Redémarrer le Serveur de Développement

```bash
# Arrêtez le serveur (Ctrl+C si en cours)
cd admin-web

# Relancez
npm run dev
```

**Puis ouvrez:** `http://localhost:5173`

---

### Solution 2: Vérifier la Console du Navigateur

1. Ouvrez l'admin web dans le navigateur
2. Appuyez sur **F12** pour ouvrir les outils développeur
3. Allez sur l'onglet **"Console"**
4. Regardez s'il y a des erreurs en rouge

**Erreurs possibles et solutions:**

#### Erreur: "Cannot read property 'map' of undefined"
**Cause:** Données non encore chargées
**Solution:** Vérifiez que Firestore retourne des données

#### Erreur: "storage is not defined"
**Cause:** Export manquant (DÉJÀ CORRIGÉ)
**Solution:** Vérifiez que `admin-web/src/firebase.ts` exporte bien `storage`

#### Erreur: "The query requires an index"
**Cause:** Index Firestore manquant
**Solution:**
```bash
cd agoo-alert
firebase deploy --only firestore:indexes
```
Puis attendez 1-2 minutes que les index soient créés.

---

### Solution 3: Vérifier l'Authentification

L'app admin nécessite une authentification avec rôle modérateur.

**Vérifiez:**
1. Vous êtes redirigé vers `/login` ?
2. Vous pouvez vous connecter ?
3. Votre compte a le rôle modérateur ?

**Créer un modérateur:**
```bash
# Option 1: Via Cloud Function
curl -X POST https://bootstrapsetmoderator-XXX.run.app \
  -H "Content-Type: application/json" \
  -d '{"email": "votre-email@example.com"}'

# Option 2: Via Firebase Console
# Functions > bootstrapSetModerator > Tester
# Body: {"email": "votre-email@example.com"}
```

---

### Solution 4: Vérifier les Index Firestore

Le Dashboard nécessite plusieurs index composites.

**Vérifier dans Firebase Console:**
1. Allez sur: https://console.firebase.google.com/project/agoo-alert/firestore/indexes
2. Vérifiez que ces index sont **"Activé"** (pas "En cours de création"):
   - `reports`: moderationStatus + createdAt
   - `verificationRequests`: status + submittedAt
   - `users`: verificationStatus + updatedAt

**Si statut "En cours de création":**
- Attendez 1-2 minutes
- Rafraîchissez la page

**Si absents:**
```bash
cd agoo-alert
firebase deploy --only firestore:indexes
```

---

### Solution 5: Vider le Cache du Navigateur

Parfois le cache cause des problèmes.

**Chrome/Edge:**
1. F12 → Onglet "Network"
2. Cochez "Disable cache"
3. Rechargez avec Ctrl+Shift+R

**OU**

1. Paramètres → Confidentialité → Effacer les données de navigation
2. Cochez "Images et fichiers en cache"
3. Effacer

---

### Solution 6: Vérifier les Dépendances

```bash
cd admin-web

# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install

# Relancer
npm run dev
```

---

### Solution 7: Vérifier le Fichier index.html

Assurez-vous que `admin-web/index.html` contient:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agoo Alert Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 🧪 Test Rapide

Pour vérifier si tout fonctionne:

```bash
cd admin-web
npm run dev
```

**Puis dans le navigateur:**
1. Ouvrez `http://localhost:5173`
2. Vous devriez voir la page de **login**
3. Connectez-vous avec un compte modérateur
4. Vous devriez voir le **Dashboard**

**Si vous voyez le Dashboard → ✅ Tout fonctionne !**

---

## 🔍 Checklist de Vérification

- [ ] `admin-web/src/firebase.ts` exporte `storage`
- [ ] Serveur de développement redémarré
- [ ] Console navigateur sans erreurs
- [ ] Index Firestore tous "Activé"
- [ ] Compte modérateur créé
- [ ] Connecté avec ce compte
- [ ] Dashboard s'affiche

---

## 📊 Que Faire Si Ça Ne Fonctionne Toujours Pas

### Étape 1: Capturer les Erreurs

1. Ouvrez la console (F12)
2. Allez sur l'onglet "Console"
3. Copiez TOUTES les erreurs en rouge
4. Allez sur l'onglet "Network"
5. Vérifiez s'il y a des requêtes en rouge (failed)

### Étape 2: Vérifier Firebase

```bash
# Vérifier que vous êtes connecté
firebase projects:list

# Vérifier le projet actif
firebase use

# Vérifier les functions déployées
firebase functions:list

# Vérifier les index
# Allez sur Firebase Console > Firestore > Indexes
```

### Étape 3: Mode Debug

Ajoutez des logs dans `admin-web/src/App.tsx`:

```typescript
export default function App() {
  console.log('App rendering...');

  return (
    <Routes>
      {/* ... */}
    </Routes>
  );
}
```

Et dans `admin-web/src/pages/Dashboard.tsx`:

```typescript
export default function DashboardPage() {
  console.log('Dashboard rendering...');

  useEffect(() => {
    console.log('Dashboard useEffect running...');
    // ...
  }, []);

  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

---

## 🚨 Erreurs Courantes et Solutions

### Erreur 1: "Firebase: Error (auth/network-request-failed)"
**Cause:** Problème de connexion internet ou Firebase
**Solution:** Vérifiez votre connexion internet

### Erreur 2: "Firebase: Error (auth/user-not-found)"
**Cause:** Email incorrect lors de la connexion
**Solution:** Créez le compte d'abord ou vérifiez l'email

### Erreur 3: "Firebase: Error (auth/wrong-password)"
**Cause:** Mot de passe incorrect
**Solution:** Vérifiez le mot de passe ou réinitialisez-le

### Erreur 4: "Quota exceeded"
**Cause:** Trop de requêtes
**Solution:** Attendez quelques minutes ou vérifiez les quotas Firebase

### Erreur 5: Page blanche avec "Loading..."
**Cause:** Index Firestore en cours de création
**Solution:** Attendez que les index soient "Activé" dans Firebase Console

---

## ✅ Après Correction

Une fois que tout fonctionne:

1. ✅ Dashboard s'affiche avec statistiques
2. ✅ Navigation fonctionne (Dashboard, Publications, Vérifications, Utilisateurs)
3. ✅ Pas d'erreurs dans la console
4. ✅ Données se chargent correctement

---

## 📞 Si Le Problème Persiste

**Informations à fournir:**
1. Erreurs dans la console navigateur (F12)
2. Erreurs dans le terminal (`npm run dev`)
3. Statut des index Firestore
4. Est-ce que vous êtes connecté ?
5. Est-ce que votre compte a le rôle modérateur ?

**Commandes de diagnostic:**

```bash
# Dans le terminal
cd admin-web
npm run dev

# Dans un autre terminal
cd agoo-alert
firebase functions:list
firebase use
```

---

## 🎯 Résumé

**Correction appliquée:**
- ✅ Ajout de l'export `storage` dans `firebase.ts`

**Actions à faire:**
1. Redémarrer le serveur dev
2. Vider le cache navigateur
3. Vérifier les index Firestore
4. Vérifier l'authentification

**Normalement, après le redémarrage, tout devrait fonctionner ! 🚀**
