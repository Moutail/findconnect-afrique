// Configuration et initialisation de Firebase pour Agoo Alert
// Remplace les valeurs de firebaseConfig par celles fournies dans la console Firebase.

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAYsDfzuhM1fc74Pi1ml0fM89SfHUuU7B4",
  authDomain: "agoo-alert.firebaseapp.com",
  projectId: "agoo-alert",
  storageBucket: "agoo-alert.appspot.com",
  messagingSenderId: "331787193220",
  appId: "1:331787193220:web:9289d6640c2ac21965ebd1"
};

// Évite de réinitialiser Firebase si une instance existe déjà (mode dev / Hot Reload)
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Utilise getAuth directement pour React Native
let auth: Auth;
try {
  auth = getAuth(app);
} catch {
  auth = initializeAuth(app);
}

const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const functions: Functions = getFunctions(app);

export { app, auth, db, storage, functions };
