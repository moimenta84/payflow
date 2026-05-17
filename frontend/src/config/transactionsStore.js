import { api } from './api';

export async function listTransacciones(_userId) {
  return api.get('/transactions');
}

export async function addTransaccion(_userId, data) {
  return api.post('/transactions', data);
}

export async function updateTransaccion(_userId, id, patch) {
  return api.put(`/transactions/${id}`, patch);
}

export async function deleteTransaccion(_userId, id) {
  return api.delete(`/transactions/${id}`);
}
