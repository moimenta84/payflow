import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toggle from './Toggle';
import style from '../styles/Navbar.module.css';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className={style.navbar}>
      <div className={style.contenedor}>

        <NavLink to="/home" className={style.logo}>
          <img src="/logo.png" alt="PayFlow" className={style.logoImg} />
          <span className={style.logoTexto}>PayFlow</span>
        </NavLink>

        <div className={style.navLinks}>
          <NavLink
            to="/home"
            className={({ isActive }) =>
              isActive ? `${style.link} ${style.linkActivo}` : style.link
            }
          >
            Inicio
          </NavLink>
          <NavLink
            to="/transacciones"
            className={({ isActive }) =>
              isActive ? `${style.link} ${style.linkActivo}` : style.link
            }
          >
            Transacciones
          </NavLink>
          <NavLink
            to="/crypto"
            className={({ isActive }) =>
              isActive ? `${style.link} ${style.linkActivo}` : style.link
            }
          >
            Crypto
          </NavLink>
          <NavLink
            to="/banco"
            className={({ isActive }) =>
              isActive ? `${style.link} ${style.linkActivo}` : style.link
            }
          >
            Banca
          </NavLink>
          <NavLink
            to="/autonomos"
            className={({ isActive }) =>
              isActive ? `${style.link} ${style.linkActivo}` : style.link
            }
          >
            Autónomos
          </NavLink>
          {user?.rol === 'ADMIN' && (
            <a
              href="/admin"
              className={style.link}
              style={{ color: 'var(--color-primary-250)' }}
            >
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="18"
              height="18"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
