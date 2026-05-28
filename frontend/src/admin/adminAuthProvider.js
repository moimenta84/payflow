const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

const adminAuthProvider = {
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

  checkAuth: () => {
    const token = localStorage.getItem('token');
    if (!token) return Promise.reject();
    const payload = decodeJwt(token);
    if (!payload) return Promise.reject();
    // Verificar que no ha expirado
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return Promise.reject();
    }
    if (payload.rol !== 'ADMIN') return Promise.reject({ message: 'No tienes permisos de administrador' });
    return Promise.resolve();
  },

  checkError: (error) => {
    if (error?.status === 401 || error?.status === 403) {
      return Promise.reject();
    }
    return Promise.resolve();
  },

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
