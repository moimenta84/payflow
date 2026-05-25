import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PayFlowLogo from './PayFlowLogo';
import style from './AppLayout.module.css';

/* ── Inline SVG icons ── */
function IconHome() {
  return (
    <svg className={style.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconTransacciones() {
  return (
    <svg className={style.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function IconCrypto() {
  return (
    <svg className={style.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
    </svg>
  );
}

function IconBanca() {
  return (
    <svg className={style.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="18" height="11" rx="1" />
      <path d="M3 10l9-7 9 7" />
      <line x1="12" y1="10" x2="12" y2="21" />
      <line x1="7" y1="14" x2="7" y2="21" />
      <line x1="17" y1="14" x2="17" y2="21" />
    </svg>
  );
}

function IconAutonomos() {
  return (
    <svg className={style.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconAdmin() {
  return (
    <svg className={style.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M4.93 4.93a10 10 0 0 0 14.14 14.14" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const NAV_LINKS = [
  { to: '/home',          label: 'Inicio',          Icon: IconHome },
  { to: '/transacciones', label: 'Transacciones',   Icon: IconTransacciones },
  { to: '/crypto',        label: 'Crypto',           Icon: IconCrypto },
  { to: '/banco',         label: 'Banca',            Icon: IconBanca },
  { to: '/autonomos',     label: 'Autónomos',        Icon: IconAutonomos },
];

function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      logout();
      navigate('/login');
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  /* Generate initials from full name or use stored iniciales */
  const initials = user?.iniciales
    || (user?.fullName
      ? user.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
      : '?');

  return (
    <div className={style.layout}>
      {/* ── Mobile hamburger ── */}
      <button
        className={style.hamburger}
        onClick={() => setSidebarOpen(p => !p)}
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        {sidebarOpen ? <IconClose /> : <IconMenu />}
      </button>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div className={style.overlay} onClick={closeSidebar} aria-hidden="true" />
      )}

      {/* ── Sidebar ── */}
      <aside className={`${style.sidebar} ${sidebarOpen ? style.sidebarOpen : ''}`}>
        {/* Logo */}
        <div className={style.logoArea}>
          <PayFlowLogo size={36} />
          <span className={style.logoText}>PayFlow</span>
        </div>

        {/* Navigation */}
        <nav className={style.nav}>
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                isActive
                  ? `${style.navItem} ${style.navItemActive}`
                  : style.navItem
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}

          {user?.rol === 'ADMIN' && (
            <a
              href="/admin"
              className={`${style.navItem} ${style.adminLink}`}
              onClick={closeSidebar}
            >
              <IconAdmin />
              Admin
            </a>
          )}
        </nav>

        {/* User area */}
        <div className={style.userArea}>
          <div className={style.userInfo}>
            <div className={style.avatar}>{initials}</div>
            <div className={style.userTexts}>
              <p className={style.userName}>{user?.fullName || 'Usuario'}</p>
              <p className={style.userEmail}>{user?.email || ''}</p>
            </div>
          </div>
          <div className={style.userActions}>
            <button
              className={style.btnTheme}
              onClick={toggleTheme}
              aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <IconSun /> : <IconMoon />}
            </button>
            <button
              className={style.btnLogout}
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <IconLogout />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={style.main}>
        <div className={style.content}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
