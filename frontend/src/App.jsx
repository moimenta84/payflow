// App.jsx
import React, { lazy, Suspense } from 'react'
import './index.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './pages/ProtectedRoute'
import FloatingAssistantButton from './components/FloatingAssistantButton'
import AppLayout from './components/AppLayout'

// Carga perezosa (lazy loading + code splitting): cada página se descarga solo
// cuando el usuario navega a ella, reduciendo el tamaño inicial de la aplicación.
const Home             = lazy(() => import('./pages/Home'))
const Login            = lazy(() => import('./pages/Login'))
const Register         = lazy(() => import('./pages/Register'))
const Remember         = lazy(() => import('./pages/Remember'))
const Transacciones    = lazy(() => import('./pages/Transacciones'))
const Transation       = lazy(() => import('./pages/Transation'))
const Banca            = lazy(() => import('./pages/Banca'))
const Autonomos        = lazy(() => import('./pages/Autonomos'))
const Wallet           = lazy(() => import('./pages/Wallet'))
const Pay              = lazy(() => import('./pages/Pay'))
const Landing          = lazy(() => import('./pages/Landing'))
const PaymentSuccess   = lazy(() => import('./pages/PaymentSuccess'))
const PaymentCancelled = lazy(() => import('./pages/PaymentCancelled'))
const AdminApp         = lazy(() => import('./admin/AdminApp'))

// Pantalla de carga mostrada mientras se descarga el código de una página.
function Cargando() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div className="spinner" aria-label="Cargando" />
    </div>
  )
}

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
          {/* Suspense muestra <Cargando/> mientras llega el código de la página solicitada. */}
          <Suspense fallback={<Cargando />}>
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
          </Suspense>

          {/* Botón flotante del asistente: aparece en todas las pantallas de usuario. */}
          <FloatingAssistantButton />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
