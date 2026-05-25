import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import './styles/design-system.css'

const isAdmin = window.location.pathname.startsWith('/admin');

async function boot() {
  const root = createRoot(document.getElementById('root'));

  if (isAdmin) {
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
