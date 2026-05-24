// App.jsx
import React from 'react'
import './index.css'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Remember from './pages/Remember'
import Transacciones from './pages/Transacciones'
import Transation from './pages/Transation'
import Crypto from './pages/Crypto'
import Landing from './pages/Landing'
import ProtectedRoute from './pages/ProtectedRoute'
import FloatingAssistantButton from './components/FloatingAssistantButton'
import Navbar from './components/Navbar'
import AdminApp from './admin/AdminApp'

const RUTAS_PUBLICAS = ['/login', '/registro', '/recuperar-password', '/']

function AdminRoute() {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.rol !== 'ADMIN') return <Navigate to="/home" replace />
  return <AdminApp />
}

function AppContent() {
  const location = useLocation()
  const mostrarNavbar = !RUTAS_PUBLICAS.includes(location.pathname) && !location.pathname.startsWith('/admin')

  return (
    <>
      {mostrarNavbar && <Navbar />}
      <div style={mostrarNavbar ? { paddingTop: '64px' } : undefined}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/recuperar-password" element={<Remember />} />

          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transacciones"
            element={
              <ProtectedRoute>
                <Transacciones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transacion"
            element={
              <ProtectedRoute>
                <Transation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crypto"
            element={
              <ProtectedRoute>
                <Crypto />
              </ProtectedRoute>
            }
          />

          <Route path="/admin/*" element={<AdminRoute />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        {!location.pathname.startsWith('/admin') && <FloatingAssistantButton />}
      </div>
    </>
  )
}

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
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
