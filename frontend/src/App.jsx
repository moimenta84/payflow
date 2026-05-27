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
import Landing from './pages/Landing'
import ProtectedRoute from './pages/ProtectedRoute'
import FloatingAssistantButton from './components/FloatingAssistantButton'
import AppLayout from './components/AppLayout'
import AdminApp from './admin/AdminApp'

function AdminRoute() {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.rol !== 'ADMIN') return <Navigate to="/home" replace />
  return <AdminApp />
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
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/recuperar-password" element={<Remember />} />

            {/* ── Authenticated routes wrapped in AppLayout ── */}
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

            <Route path="/admin/*" element={<AdminRoute />} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>

          {/* Floating assistant — visible everywhere except admin */}
          <FloatingAssistantButton />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
