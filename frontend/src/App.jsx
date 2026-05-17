// App.jsx
import React from 'react'
import './index.css'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Remember from './pages/Remember'
import Transacciones from './pages/Transacciones'
import Transation from './pages/Transation'
import Landing from './pages/Landing'
import ProtectedRoute from './pages/ProtectedRoute'
import FloatingAssistantButton from './components/FloatingAssistantButton'
import Navbar from './components/Navbar'

const RUTAS_PUBLICAS = ['/login', '/registro', '/recuperar-password', '/']

function AppContent() {
  const location = useLocation()
  const mostrarNavbar = !RUTAS_PUBLICAS.includes(location.pathname)

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

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        <FloatingAssistantButton />
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
