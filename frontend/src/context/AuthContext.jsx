// Contexto de autenticación: fuente única de verdad sobre "quién es el usuario logueado".
// Cualquier componente puede leer el usuario o llamar a login/logout con el hook useAuth().
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // Datos del usuario actual (null si no hay sesión).
  const [loading, setLoading] = useState(true); // Mientras comprobamos el token no pintamos nada.

  // Al cargar la app: si hay token guardado, lo validamos pidiendo el perfil a /auth/me.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then(data => setUser(data))
      // Si el token es inválido o caducó, lo borramos para forzar un login limpio.
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  // Registro: crea la cuenta, guarda el token devuelto y deja al usuario ya logueado.
  const register = async (userData) => {
    const data = await api.post('/auth/register', userData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return { success: true };
  };

  // Login: valida credenciales en el backend y persiste el token JWT en localStorage.
  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return { success: true };
  };

  // Logout: borra el token y limpia el usuario; las rutas protegidas redirigen al login.
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Recuperar contraseña: dispara el envío del correo con la contraseña temporal.
  const resetPassword = async (email) => {
    await api.post('/auth/reset-password', { email });
    return { success: true };
  };

  // Actualiza el perfil y mezcla los campos nuevos sobre el usuario que ya teníamos en memoria.
  const updateUser = async (newData) => {
    const updated = await api.put('/auth/me', newData);
    setUser(prev => ({ ...prev, ...updated }));
    return { success: true };
  };

  // Refresca los datos del usuario desde el backend (p. ej. tras cambiar el saldo).
  const refreshUser = async () => {
    const u = await api.get('/auth/me');
    setUser(u);
    return u;
  };

  // Todo lo que exponemos al resto de la app. isAuthenticated es un atajo booleano cómodo.
  const value = {
    user,
    login,
    register,
    logout,
    resetPassword,
    updateUser,
    refreshUser,
    isAuthenticated: !!user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* No renderizamos la app hasta saber si hay sesión, para evitar parpadeos de login. */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook de acceso al contexto. Si se usa fuera del provider, avisa con un error claro.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};

export default AuthContext;
