// src/config/transactionsStore.js
// Abstracción para leer/escribir transacciones.
// - Con Firebase configurado: usa Firestore.
// - Sin Firebase: usa localStorage (modo demo / solo frontend).

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase";

const keyForUser = (userId) => `spendiq_demo_transacciones:${userId}`;

const readLocal = (userId) => {
  try {
    const raw = localStorage.getItem(keyForUser(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocal = (userId, transacciones) => {
  localStorage.setItem(keyForUser(userId), JSON.stringify(transacciones));
};

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function listTransacciones(userId) {
  if (!userId) return [];

  if (firebaseEnabled && db) {
    const q = query(collection(db, "transacciones"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  return readLocal(userId);
}

export async function addTransaccion(userId, transaccionData) {
  if (!userId) throw new Error("userId requerido");

  if (firebaseEnabled && db) {
    const docRef = await addDoc(collection(db, "transacciones"), transaccionData);
    return { id: docRef.id };
  }

  const id = makeId();
  const current = readLocal(userId);
  const next = [{ id, ...transaccionData }, ...current];
  writeLocal(userId, next);
  return { id };
}

export async function updateTransaccion(userId, transaccionId, patch) {
  if (!userId) throw new Error("userId requerido");
  if (!transaccionId) throw new Error("transaccionId requerido");

  if (firebaseEnabled && db) {
    await updateDoc(doc(db, "transacciones", transaccionId), patch);
    return;
  }

  const current = readLocal(userId);
  const next = current.map((t) =>
    t.id === transaccionId ? { ...t, ...patch } : t,
  );
  writeLocal(userId, next);
}

export async function deleteTransaccion(userId, transaccionId) {
  if (!userId) throw new Error("userId requerido");
  if (!transaccionId) throw new Error("transaccionId requerido");

  if (firebaseEnabled && db) {
    await deleteDoc(doc(db, "transacciones", transaccionId));
    return;
  }

  const current = readLocal(userId);
  const next = current.filter((t) => t.id !== transaccionId);
  writeLocal(userId, next);
}
