import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import Imagen from "../components/Imagen";
import CajaTexto from "../components/CajaTexto";
import Boton from "../components/Boton";
import style from "../styles/Login.module.css";
import Toggle from "../components/Toggle";
import "../index.css";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [credenciales, setCredenciales] = useState({
    email: "",
    password: "",
    recordarme: false
  });

  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Rate limiting
  const [intentos, setIntentos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);
  const MAX_INTENTOS = 5;
  const TIEMPO_BLOQUEO = 15 * 60 * 1000;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const valorFinal = type === "checkbox" ? checked : value;

    setCredenciales(prev => ({
      ...prev,
      [name]: valorFinal
    }));

    if (errores[name]) {
      setErrores(prev => {
        const nuevosErrores = { ...prev };
        delete nuevosErrores[name];
        return nuevosErrores;
      });
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!credenciales.email.trim()) {
      nuevosErrores.email = "El email es obligatorio";
    } else if (!emailRegex.test(credenciales.email.trim())) {
      nuevosErrores.email = "El email no es válido";
    }

    if (!credenciales.password) {
      nuevosErrores.password = "La contraseña es obligatoria";
    } else if (credenciales.password.length < 8) {
      nuevosErrores.password = "La contraseña debe tener al menos 8 caracteres";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const verificarRateLimiting = () => {
    const ahora = Date.now();
    
    if (bloqueadoHasta && ahora < bloqueadoHasta) {
      const minutosFaltantes = Math.ceil((bloqueadoHasta - ahora) / 60000);
      setErrores({
        general: `Demasiados intentos. Espera ${minutosFaltantes} minutos antes de intentar nuevamente.`
      });
      return false;
    }

    if (bloqueadoHasta && ahora >= bloqueadoHasta) {
      setIntentos(0);
      setBloqueadoHasta(null);
    }

    if (intentos >= MAX_INTENTOS) {
      const tiempoBloqueado = ahora + TIEMPO_BLOQUEO;
      setBloqueadoHasta(tiempoBloqueado);
      setErrores({
        general: "Demasiados intentos. Espera 15 minutos antes de intentar nuevamente."
      });
      return false;
    }

    return true;
  };

  const getFirebaseErrorMessage = (errorCode) => {
    const errorMessages = {
      'auth/invalid-credential': 'Email o contraseña incorrectos',
      'auth/user-not-found': 'No existe una cuenta con este email',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde',
      'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
      'auth/invalid-email': 'El email no es válido',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
    };

    return errorMessages[errorCode] || 'Error al iniciar sesión. Intenta de nuevo.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!verificarRateLimiting()) {
      return;
    }

    if (validarFormulario()) {
      setCargando(true);
      setIntentos(prev => prev + 1);

      try {
        // Login con Firebase
        await login(
          credenciales.email.trim().toLowerCase(),
          credenciales.password
        );

        // Resetear intentos tras éxito
        setIntentos(0);
        setBloqueadoHasta(null);
        
        // Redirigir a home
        navigate('/home');

      } catch (error) {
        console.error('Error en login:', error);
        
        setErrores({
          general: getFirebaseErrorMessage(error.code)
        });
      } finally {
        setCargando(false);
      }
    }
  };

  return (
    <div className={style.login}>
      <div className={style.contenedorLogin}>
        <Toggle />

        <div className={style.logo}>
          <Imagen imagen="logo.png" alt="Logo de la aplicación" />
        </div>

        <div className={style.titulo}>
          <h1>Bienvenido de nuevo</h1>
        </div>

        <div className={style.subtitulo}>
          <p>Ingresa tus credenciales para continuar</p>
        </div>

        {errores.general && (
          <div className={style.errorGeneral} role="alert">
            {errores.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={style.inputGroup}>
            <CajaTexto
              tipo="email"
              fondo="Correo electrónico"
              name="email"
              value={credenciales.email}
              onChange={handleChange}
              aria-label="Correo electrónico"
              aria-invalid={!!errores.email}
              aria-describedby={errores.email ? "error-email" : undefined}
              disabled={cargando}
              autoComplete="email"
            />
            {errores.email && (
              <p id="error-email" className={style.error} role="alert">
                {errores.email}
              </p>
            )}
          </div>

          <div className={style.inputGroup}>
            <div className={style.passwordContainer}>
              <CajaTexto
                tipo={mostrarPassword ? "text" : "password"}
                fondo="Contraseña"
                name="password"
                value={credenciales.password}
                onChange={handleChange}
                aria-label="Contraseña"
                aria-invalid={!!errores.password}
                aria-describedby={
                  errores.password ? "error-password" : undefined
                }
                disabled={cargando}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={style.togglePassword}
                onClick={() => setMostrarPassword(!mostrarPassword)}
                aria-label={
                  mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                disabled={cargando}
              >
                {/* <FontAwesomeIcon icon={mostrarPassword ? faEyeSlash : faEye} /> */}
                <FontAwesomeIcon
                  icon={mostrarPassword ? faEye : faEyeSlash}
                  className={
                    mostrarPassword ? style.eyeOpenBlink : style.eyeClosedBlink
                  }
                />
              </button>
            </div>
            {errores.password && (
              <p id="error-password" className={style.error} role="alert">
                {errores.password}
              </p>
            )}
          </div>

          <div className={style.recordar}>
            <label>
              <input
                type="checkbox"
                name="recordarme"
                checked={credenciales.recordarme}
                onChange={handleChange}
                disabled={cargando}
              />
              Recordarme
            </label>
            <Link to="/recuperar-password">¿Olvidaste tu contraseña?</Link>
          </div>

          <div className={style.contenedorBotones}>
            <Boton
              tamano="lg"
              texto={cargando ? "Iniciando sesión..." : "Iniciar Sesión"}
              tipo="submit"
              disabled={
                cargando || (bloqueadoHasta && Date.now() < bloqueadoHasta)
              }
              aria-busy={cargando}
            />
          </div>
        </form>

        <div className={style.textoRegistro}>
          <p>
            ¿No estás registrado? <Link to="/registro">Entra y regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
