const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
    localStorage.setItem('adminUser', JSON.stringify(data.user));
    return Promise.resolve();
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminUser');
    return Promise.resolve();
  },

  checkAuth: () => {
    const token = localStorage.getItem('token');
    const user  = JSON.parse(localStorage.getItem('adminUser') || 'null');
    if (token && user?.rol === 'ADMIN') return Promise.resolve();
    return Promise.reject();
  },

  checkError: (error) => {
    if (error?.status === 401 || error?.status === 403) {
      localStorage.removeItem('token');
      return Promise.reject();
    }
    return Promise.resolve();
  },

  getPermissions: () => {
    const user = JSON.parse(localStorage.getItem('adminUser') || 'null');
    return Promise.resolve(user?.rol || 'USER');
  },

  getIdentity: () => {
    const user = JSON.parse(localStorage.getItem('adminUser') || 'null');
    return Promise.resolve({
      id:       user?.id || '',
      fullName: user?.fullName || 'Admin',
      avatar:   user?.iniciales || 'A',
    });
  },
};

export default adminAuthProvider;
