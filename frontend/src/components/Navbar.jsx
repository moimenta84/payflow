import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toggle from './Toggle';
import style from '../styles/Navbar.module.css';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Cerrar menú al cambiar de ruta
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links = [
    { to: "/home",          label: "Inicio" },
    { to: "/wallet",        label: "Wallet" },
    { to: "/transacciones", label: "Transacciones" },
    { to: "/banco",         label: "Banca" },
    { to: "/autonomos",     label: "Autónomos" },
  ];

  return (
    <>
      <nav className={style.navbar}>
        <div className={style.contenedor}>

          <NavLink to="/home" className={style.logo}>
            <img src="/logo.png" alt="PayFlow" className={style.logoImg} />
            <span className={style.logoTexto}>PayFlow</span>
          </NavLink>

          {/* Links escritorio */}
          <div className={style.navLinks}>
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? `${style.link} ${style.linkActivo}` : style.link
                }
              >
                {label}
              </NavLink>
            ))}
            {user?.rol === 'ADMIN' && (
              <a href="/admin" className={style.link} style={{ color: 'var(--color-primary-250)' }}>
                Admin
              </a>
            )}
          </div>

          <div className={style.derecha}>
            <Toggle />

            <div className={style.usuario}>
              <span className={style.avatar}>{user?.iniciales || '👤'}</span>
              <span className={style.nombre}>{user?.fullName || 'Usuario'}</span>
            </div>

            <button
              className={style.btnLogout}
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>

            {/* Botón hamburguesa — solo mobile */}
            <button
              className={style.hamburger}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menú"
              aria-expanded={menuOpen}
            >
              {menuOpen
                ? /* X */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                : /* ☰ */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
              }
            </button>
          </div>

        </div>
      </nav>

      {/* Menú móvil desplegable */}
      {menuOpen && (
        <div className={style.mobileMenu}>
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? `${style.mobileLink} ${style.mobileLinkActivo}` : style.mobileLink
              }
            >
              {label}
            </NavLink>
          ))}
          {user?.rol === 'ADMIN' && (
            <a href="/admin" className={style.mobileLink} style={{ color: 'var(--color-primary-200)' }}>
              Admin
            </a>
          )}
        </div>
      )}

      {/* Overlay para cerrar el menú al hacer click fuera */}
      {menuOpen && (
        <div className={style.overlay} onClick={() => setMenuOpen(false)} />
      )}
    </>
  );
}

export default Navbar;
