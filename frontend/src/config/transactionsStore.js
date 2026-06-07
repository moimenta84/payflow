import { api } from './api';

// Capa fina sobre la API para las transacciones (CRUD). Centraliza las rutas en un solo sitio.
// El backend ya sabe de qué usuario son por el token; por eso el _userId no se usa (se ignora).

// Lista todas las transacciones del usuario autenticado.
export async function listTransacciones(_userId) {
  return api.get('/transactions');
}

// Crea una transacción nueva.
export async function addTransaccion(_userId, data) {
  return api.post('/transactions', data);
}

// Actualiza una transacción existente por su id.
export async function updateTransaccion(_userId, id, patch) {
  return api.put(`/transactions/${id}`, patch);
}

// Elimina una transacción por su id.
export async function deleteTransaccion(_userId, id) {
  return api.delete(`/transactions/${id}`);
}
