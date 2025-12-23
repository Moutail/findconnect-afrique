import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAYsDfzuhM1fc74Pi1ml0fM89SfHUuU7B4',
  authDomain: 'agoo-alert.firebaseapp.com',
  projectId: 'agoo-alert',
  storageBucket: 'agoo-alert.firebasestorage.app',
  messagingSenderId: '331787193220',
  appId: '1:331787193220:web:9289d6640c2ac21965ebd1',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
