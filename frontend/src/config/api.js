const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

async function handleResponse(r) {
  if (!r.ok) {
    let msg;
    try {
      const body = await r.json();
      msg = body.message || body.error || JSON.stringify(body);
    } catch {
      msg = r.statusText;
    }
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (path) =>
    fetch(`${API_BASE}${path}`, { headers: headers() }).then(handleResponse),

  post: (path, body) =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    }).then(handleResponse),

  put: (path, body) =>
    fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body),
    }).then(handleResponse),

  delete: (path) =>
    fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: headers() }).then(handleResponse),
};
