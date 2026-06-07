import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Envoltorio que protege rutas privadas: si no hay sesión, redirige al login.
// Se usa en App.jsx alrededor de cada página que requiere estar autenticado.
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children; // Hay sesión: dejamos pasar a la página solicitada.
};

export default ProtectedRoute;
