# ✅ Corrections Appliquées - Erreurs de Test

## 🔧 Problèmes Résolus

### 1. ❌ Erreur: `Cannot read property '_url' of undefined`
**Cause:** L'objet `functions` n'était pas exporté depuis `firebaseConfig.ts`

**Correction:**
- ✅ Ajouté import `getFunctions` et `Functions`
- ✅ Créé et exporté `const functions = getFunctions(app)`
- ✅ Fichier: `config/firebaseConfig.ts`

**Résultat:** Les Cloud Functions peuvent maintenant être appelées correctement

---

### 2. ❌ Erreur: `Unsupported field value: undefined`
**Cause:** Utilisation de `undefined` dans les champs Firestore lors de la connexion

**Correction:**
- ✅ Séparé la logique inscription/connexion dans `login.tsx`
- ✅ Mode inscription: tous les champs avec valeurs correctes (pas de `undefined`)
- ✅ Mode connexion: seulement les champs nécessaires
- ✅ Fichier: `app/login.tsx`

**Résultat:** Plus d'erreur lors de la mise à jour du profil utilisateur

---

### 3. ℹ️ Info: `Firebase: Error (auth/email-already-in-use)`
**Cause:** Vous essayez de créer un compte avec un numéro de téléphone déjà utilisé

**Solution:** C'est normal ! Cela signifie que vous avez déjà créé un compte avec ce numéro.

**Options:**
1. Utilisez un **autre numéro** de téléphone pour tester
2. Ou **connectez-vous** au lieu de vous inscrire
3. Ou supprimez l'utilisateur dans Firebase Console > Authentication

---

## 📝 Fichiers Modifiés

### `config/firebaseConfig.ts`
```typescript
// AVANT
export { app, auth, db, storage };

// APRÈS
import { getFunctions, type Functions } from 'firebase/functions';
const functions: Functions = getFunctions(app);
export { app, auth, db, storage, functions };
```

### `app/login.tsx`
```typescript
// AVANT (utilisait 'undefined')
verificationStatus: isRegisterMode ? 'unverified' : undefined,
firstName: isRegisterMode ? firstName.trim() : null,
// ... etc

// APRÈS (séparation inscription/connexion)
if (isRegisterMode) {
  // Inscription: tous les champs définis
  await setDoc(doc(db, 'users', u.uid), {
    verificationStatus: 'unverified',
    firstName: firstName.trim(),
    // ... tous les champs nécessaires
  });
} else {
  // Connexion: seulement champs essentiels
  await setDoc(doc(db, 'users', u.uid), {
    uid: u.uid,
    phone: normalizedPhone,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
```

---

## 🧪 Prochain Test

Maintenant que ces erreurs sont corrigées, **redémarrez votre app** :

```bash
# Arrêtez l'app (Ctrl+C)
# Puis relancez
npm start
```

### Tests à Refaire

#### Test 1: Inscription avec Nouveau Numéro
```
1. Déconnectez-vous de l'app (bouton déconnexion)
2. Allez sur "S'inscrire"
3. Utilisez un NOUVEAU numéro (différent de ceux déjà utilisés)
4. Remplissez tous les champs y compris pseudonyme
5. S'inscrire

✅ ATTENDU:
   - Inscription réussie
   - Pas d'erreur "undefined"
   - Redirection vers l'app
```

#### Test 2: Vérifier dans Firebase Console
```
Firebase Console > Firestore > users > Votre nouvel utilisateur

✅ ATTENDU - Tous ces champs doivent être présents:
   - uid
   - phone
   - displayName
   - firstName
   - lastName
   - pseudonym ⭐ (nouveau)
   - verificationStatus: "unverified"
   - canPost: false
   - createdAt
   - updatedAt
   - AUCUN champ avec valeur "undefined"
```

#### Test 3: Restriction de Publication
```
1. Aller sur "Explorer" / "Déclarer"
2. Essayer de créer une alerte
3. Remplir et soumettre

✅ ATTENDU:
   - Alert: "Vérification requise"
   - Bouton: "Vérifier maintenant"
```

#### Test 4: Vérification d'Identité (si Cloud Functions déployées)
```
1. Cliquer "Vérifier maintenant"
2. Passer par les 4 étapes
3. Soumettre

⚠️ ATTENDU (SI Cloud Functions PAS ENCORE DÉPLOYÉES):
   - Upload images → ✅ Succès
   - Appel detectFaceInSelfie → ❌ Échoue (fonction non déployée)
   - Appel processIdCardOCR → ❌ Échoue (fonction non déployée)
   - Demande quand même créée → ✅ Succès

✅ ATTENDU (SI Cloud Functions DÉPLOYÉES):
   - Upload images → ✅ Succès
   - Détection visage → ✅ Succès
   - OCR carte → ✅ Succès
   - Demande créée → ✅ Succès
   - Message: "Demande envoyée"
```

---

## 🔄 Pour Déployer les Cloud Functions (Optionnel)

Si vous voulez tester la vérification complète avec OCR et détection de visage :

```bash
cd agoo-alert/functions
npm install @google-cloud/vision
firebase deploy --only functions:processIdCardOCR,functions:detectFaceInSelfie
```

Puis activez Google Cloud Vision API dans Google Cloud Console.

---

## ✅ Résumé

**Corrections appliquées:**
- ✅ Export de `functions` depuis firebaseConfig.ts
- ✅ Élimination des valeurs `undefined` dans login.tsx
- ✅ Séparation logique inscription/connexion

**Erreurs résolues:**
- ✅ `Cannot read property '_url' of undefined`
- ✅ `Unsupported field value: undefined`

**Erreur normale (pas un bug):**
- ℹ️ `auth/email-already-in-use` → Utilisez un autre numéro

**Prochaine étape:**
1. Redémarrer l'app
2. Tester avec un nouveau numéro de téléphone
3. Vérifier que l'inscription fonctionne sans erreur
4. Tester la restriction de publication

**Tout devrait fonctionner maintenant ! 🎉**
