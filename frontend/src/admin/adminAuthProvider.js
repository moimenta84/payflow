const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Decodifica el payload de un JWT (la parte central) sin verificar la firma, solo para leer rol/expiración.
// Nota: esto es validación de comodidad en cliente; la seguridad real la impone el gateway en el servidor.
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// authProvider: contrato que React-Admin usa para login, logout y comprobar permisos.
const adminAuthProvider = {
  // Login: valida credenciales contra el backend y EXIGE que el usuario tenga rol ADMIN.
  login: async ({ username, password }) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });
    if (!res.ok) throw new Error('Credenciales incorrectas');
    const data = await res.json();

    if (data.user?.rol !== 'ADMIN') {
      throw new Error('No tienes permisos de administrador');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('adminFullName', data.user?.fullName || data.user?.nombre || 'Admin');
    return Promise.resolve();
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminFullName');
    return Promise.resolve();
  },

  // checkAuth: React-Admin lo llama en cada navegación para comprobar que la sesión sigue siendo válida.
  checkAuth: () => {
    const token = localStorage.getItem('token');
    if (!token) return Promise.reject();
    const payload = decodeJwt(token);
    if (!payload) return Promise.reject();
    // Rechazamos si el token ha caducado (exp viene en segundos, lo pasamos a milisegundos).
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return Promise.reject();
    }
    if (payload.rol !== 'ADMIN') return Promise.reject({ message: 'No tienes permisos de administrador' });
    return Promise.resolve();
  },

  // checkError: si una petición devuelve 401/403, forzamos logout (sesión inválida o sin permisos).
  checkError: (error) => {
    if (error?.status === 401 || error?.status === 403) {
      return Promise.reject();
    }
    return Promise.resolve();
  },

  // Devuelve el rol del usuario, que React-Admin puede usar para mostrar/ocultar secciones.
  getPermissions: () => {
    const token = localStorage.getItem('token');
    if (!token) return Promise.resolve('USER');
    const payload = decodeJwt(token);
    return Promise.resolve(payload?.rol || 'USER');
  },

  getIdentity: () => {
    const token = localStorage.getItem('token');
    if (!token) return Promise.resolve({ id: '', fullName: 'Admin' });
    const payload = decodeJwt(token);
    return Promise.resolve({
      id:       payload?.sub || '',
      fullName: localStorage.getItem('adminFullName') || payload?.nombre || 'Admin',
    });
  },
};

export default adminAuthProvider;
