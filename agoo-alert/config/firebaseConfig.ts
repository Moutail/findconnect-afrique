// Configuration et initialisation de Firebase pour Agoo Alert
// Remplace les valeurs de firebaseConfig par celles fournies dans la console Firebase.

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
// @ts-expect-error: getReactNativePersistence est disponible à l'exécution mais pas encore typé dans cette version de firebase
import { getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAYsDfzuhM1fc74Pi1ml0fM89SfHUuU7B4",
  authDomain: "agoo-alert.firebaseapp.com",
  projectId: "agoo-alert",
  // Vérifie dans la console Firebase > Storage > Emplacement : le bucket doit être de la forme "<project-id>.appspot.com"
  storageBucket: "agoo-alert.firebasestorage.app",
  messagingSenderId: "331787193220",
  appId: "1:331787193220:web:9289d6640c2ac21965ebd1"
};

// Évite de réinitialiser Firebase si une instance existe déjà (mode dev / Hot Reload)
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Persistance de l'authentification sur React Native (sessions conservées)
const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
