// Punto de entrada de toda la aplicación: aquí React se "engancha" al HTML (div#root).
import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import './styles/design-system.scss'

// Decidimos qué app cargar según la URL: el panel /admin es una app aparte (React-Admin).
const isAdmin = window.location.pathname.startsWith('/admin');

async function boot() {
  const root = createRoot(document.getElementById('root'));

  if (isAdmin) {
    // Carga perezosa (import dinámico): el bundle del admin solo se descarga si entras a /admin.
    const { default: AdminApp } = await import('./admin/AdminApp.jsx');
    root.render(
      <StrictMode>
        <AdminApp />
      </StrictMode>
    );
  } else {
    const { default: App } = await import('./App.jsx');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
}

boot();
