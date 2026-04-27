import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  // MODO DEMO: sin autenticación
  return children;
};

export default ProtectedRoute;
