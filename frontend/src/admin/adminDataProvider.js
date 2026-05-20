const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// Caché local de usuarios para simular getOne (nuestra API solo tiene getList)
let usersCache = [];

const adminDataProvider = {
  getList: async (resource, params) => {
    const res = await fetch(`${API_BASE}/admin/${resource}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Error cargando usuarios');
    const data = await res.json();
    usersCache = data;
    return { data, total: data.length };
  },

  getOne: async (resource, params) => {
    // Intentamos primero desde caché, si no hay recargamos la lista
    let user = usersCache.find(u => u.id === params.id);
    if (!user) {
      const res = await fetch(`${API_BASE}/admin/${resource}`, { headers: authHeaders() });
      const data = await res.json();
      usersCache = data;
      user = data.find(u => u.id === params.id);
    }
    if (!user) throw new Error('Usuario no encontrado');
    return { data: user };
  },

  getMany: async (resource, params) => {
    const res = await fetch(`${API_BASE}/admin/${resource}`, { headers: authHeaders() });
    const data = await res.json();
    usersCache = data;
    return { data: data.filter(u => params.ids.includes(u.id)) };
  },

  getManyReference: async (resource, params) => {
    const res = await fetch(`${API_BASE}/admin/${resource}`, { headers: authHeaders() });
    const data = await res.json();
    return { data, total: data.length };
  },

  // Cambiar rol → PUT /admin/users/{id}/rol
  update: async (resource, params) => {
    const res = await fetch(`${API_BASE}/admin/${resource}/${params.id}/rol`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ rol: params.data.rol }),
    });
    if (!res.ok) throw new Error('Error actualizando rol');
    const data = await res.json();
    return { data };
  },

  updateMany: async () => { throw new Error('No soportado'); },

  create: async () => { throw new Error('Crear usuarios no disponible desde admin'); },

  delete: async (resource, params) => {
    const res = await fetch(`${API_BASE}/admin/${resource}/${params.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Error eliminando usuario');
    return { data: { id: params.id } };
  },

  deleteMany: async (resource, params) => {
    await Promise.all(
      params.ids.map(id =>
        fetch(`${API_BASE}/admin/${resource}/${id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        })
      )
    );
    return { data: params.ids };
  },
};

export default adminDataProvider;
