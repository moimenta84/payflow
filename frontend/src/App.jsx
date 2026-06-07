// App.jsx
import React from 'react'
import './index.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Remember from './pages/Remember'
import Transacciones from './pages/Transacciones'
import Transation from './pages/Transation'
import Banca from './pages/Banca'
import Autonomos from './pages/Autonomos'
import Wallet from './pages/Wallet'
import Pay from './pages/Pay'
import Landing from './pages/Landing'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancelled from './pages/PaymentCancelled'
import ProtectedRoute from './pages/ProtectedRoute'
import FloatingAssistantButton from './components/FloatingAssistantButton'
import AppLayout from './components/AppLayout'
import AdminApp from './admin/AdminApp'

// Guardián de la zona de administración: doble control en cliente.
// Si no hay sesión te manda al login; si la hay pero no eres ADMIN, te devuelve al home.
function AdminRoute() {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.rol !== 'ADMIN') return <Navigate to="/home" replace />
  return <AdminApp />
}

// Componente raíz: define el enrutado de toda la app y envuelve todo en los providers.
// AuthProvider (sesión/usuario) y ThemeProvider (modo claro/oscuro) están disponibles globalmente.
function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            {/* Rutas públicas: accesibles sin haber iniciado sesión. */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/recuperar-password" element={<Remember />} />

            {/* Rutas privadas: ProtectedRoute exige sesión y AppLayout añade menú/cabecera comunes. */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Home />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Wallet />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transacciones"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Transacciones />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transacion"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Transation />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/banco"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Banca />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/autonomos"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Autonomos />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/pay"
              element={
                <ProtectedRoute>
                  <Pay />
                </ProtectedRoute>
              }
            />

            <Route
              path="/payment-success"
              element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-cancelled"
              element={
                <ProtectedRoute>
                  <PaymentCancelled />
                </ProtectedRoute>
              }
            />

            {/* Zona admin: cualquier ruta /admin/* pasa por el guardián AdminRoute. */}
            <Route path="/admin/*" element={<AdminRoute />} />

            {/* Comodín: cualquier URL desconocida redirige al login. */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>

          {/* Botón flotante del asistente: aparece en todas las pantallas de usuario. */}
          <FloatingAssistantButton />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
