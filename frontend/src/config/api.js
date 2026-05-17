const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

export const api = {
  get: (path) =>
    fetch(`${API_BASE}${path}`, { headers: headers() }).then(r => r.json()),

  post: (path, body) =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    }).then(r => r.json()),

  put: (path, body) =>
    fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body),
    }).then(r => r.json()),

  delete: (path) =>
    fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: headers() }),
};
