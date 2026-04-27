// src/config/firebase.js
// Configuración centralizada de Firebase.
//
// Si faltan variables de entorno (.env), la app se ejecuta en "modo demo"
// (solo frontend): arranca sin Firebase y usa almacenamiento local.

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Object.values(firebaseConfig).every(
  (v) => typeof v === "string" && v.trim().length > 0,
);

let app = null;
let auth = null;
let db = null;

if (firebaseEnabled) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else if (import.meta.env.DEV) {
  console.warn(
    "[spendiq] Firebase no configurado (.env). Ejecutando en modo demo (solo frontend).",
  );
}

export { app, auth, db };
export default app;
