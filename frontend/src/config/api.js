// Cliente HTTP central del frontend: todas las pantallas llaman al backend a través de aquí.
// La URL base apunta al api-gateway (puerto 8080); en producción se inyecta con VITE_API_URL.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Cabeceras comunes: JSON + el token JWT guardado en localStorage tras el login.
// El gateway valida ese token y mete el userId en X-User-Id antes de llegar al microservicio.
const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

// Normaliza la respuesta: si el backend devuelve error, lanzamos una excepción con su mensaje.
async function handleResponse(r) {
  if (!r.ok) {
    let msg;
    try {
      // Intentamos sacar el mensaje del JSON de error del backend (GlobalExceptionHandler).
      const body = await r.json();
      msg = body.message || body.error || JSON.stringify(body);
    } catch {
      msg = r.statusText;
    }
    const err = new Error(msg);
    err.status = r.status; // Guardamos el código HTTP por si la pantalla quiere reaccionar a él.
    throw err;
  }
  // Algunas respuestas (204) vienen vacías; devolvemos null en vez de petar al parsear.
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

// Atajos para los 4 verbos HTTP que usamos. Cada uno serializa el body y aplica handleResponse.
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
