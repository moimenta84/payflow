import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import CajaTexto from "../components/CajaTexto";
import style from "../styles/Login.module.css";
import "../index.css";

// Pantalla de inicio de sesión: valida el formulario, controla intentos y llama a login().
function Login() {
  const navigate = useNavigate();
  const { login } = useAuth(); // login() vive en el AuthContext y guarda el token JWT.

  // Estado del formulario controlado por React (cada tecla actualiza este objeto).
  const [credenciales, setCredenciales] = useState({
    email: "",
    password: "",
    recordarme: false,
  });

  const [errores, setErrores] = useState({});             // Mensajes de validación por campo.
  const [cargando, setCargando] = useState(false);        // Deshabilita el botón mientras se envía.
  const [mostrarPassword, setMostrarPassword] = useState(false); // Toggle del ojo de la contraseña.

  // Rate limiting en cliente: tras 5 intentos fallidos, bloqueamos 15 minutos.
  const [intentos, setIntentos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);
  const MAX_INTENTOS = 5;
  const TIEMPO_BLOQUEO = 15 * 60 * 1000;

  // Actualiza el campo que cambió y borra su error previo para que el usuario lo vea limpio.
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCredenciales((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errores[name]) setErrores((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  // Validación en cliente antes de molestar al servidor: email con formato y contraseña mínima.
  const validarFormulario = () => {
    const err = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!credenciales.email.trim()) err.email = "El email es obligatorio";
    else if (!emailRegex.test(credenciales.email.trim())) err.email = "El email no es válido";
    if (!credenciales.password) err.password = "La contraseña es obligatoria";
    else if (credenciales.password.length < 8) err.password = "Mínimo 8 caracteres";
    setErrores(err);
    return Object.keys(err).length === 0;
  };

  // Comprueba si estamos en periodo de bloqueo por demasiados intentos fallidos.
  const verificarRateLimiting = () => {
    const ahora = Date.now();
    if (bloqueadoHasta && ahora < bloqueadoHasta) {
      const min = Math.ceil((bloqueadoHasta - ahora) / 60000);
      setErrores({ general: `Demasiados intentos. Espera ${min} minutos.` });
      return false;
    }
    if (bloqueadoHasta && ahora >= bloqueadoHasta) { setIntentos(0); setBloqueadoHasta(null); }
    if (intentos >= MAX_INTENTOS) {
      setBloqueadoHasta(ahora + TIEMPO_BLOQUEO);
      setErrores({ general: "Demasiados intentos. Espera 15 minutos." });
      return false;
    }
    return true;
  };

  // Envío del formulario: comprueba bloqueo, valida, llama al backend y navega al home si todo va bien.
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que el navegador recargue la página al enviar el form.
    if (!verificarRateLimiting()) return;
    if (!validarFormulario()) return;

    setCargando(true);
    setIntentos((p) => p + 1);
    try {
      // Normalizamos el email a minúsculas para que el login no dependa de mayúsculas.
      await login(credenciales.email.trim().toLowerCase(), credenciales.password);
      setIntentos(0);
      setBloqueadoHasta(null);
      navigate("/home");
    } catch (error) {
      // Mensaje genérico a propósito: no revelamos si falló el email o la contraseña.
      setErrores({ general: "Email o contraseña incorrectos" });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={style.page}>
      {/* Panel izquierdo — branding */}
      <div className={style.brand}>
        <div className={style.brandInner}>
          <div className={style.brandLogo}>
            <img src="/payflow_logo_gold.svg" alt="PayFlow" style={{ width: '56px', height: '56px' }} />
            <span className={style.brandName}>PayFlow</span>
          </div>
          <h2 className={style.brandTagline}>
            Tus finanzas,<br />bajo control.
          </h2>
          <p className={style.brandSub}>
            Cobra, paga y factura desde una sola app con tu banco conectado de verdad.
          </p>
          <div className={style.brandFeatures}>
            <span>✓ Wallet y pagos P2P</span>
            <span>✓ Open Banking PSD2</span>
            <span>✓ Facturación autónomos + IVA</span>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className={style.formPanel}>
        <div className={style.formCard}>
          <div className={style.formHeader}>
            <h1 className={style.titulo}>Bienvenido de nuevo</h1>
            <p className={style.subtitulo}>Ingresa tus credenciales para continuar</p>
          </div>

          {errores.general && (
            <div className={style.errorGeneral} role="alert">{errores.general}</div>
          )}

          <form onSubmit={handleSubmit} noValidate className={style.form}>
            <div className={style.inputGroup}>
              <label className={style.label}>Correo electrónico</label>
              <CajaTexto
                tipo="email"
                fondo="tu@email.com"
                name="email"
                value={credenciales.email}
                onChange={handleChange}
                aria-label="Correo electrónico"
                aria-invalid={!!errores.email}
                disabled={cargando}
                autoComplete="email"
              />
              {errores.email && <p className={style.error} role="alert">{errores.email}</p>}
            </div>

            <div className={style.inputGroup}>
              <label className={style.label}>Contraseña</label>
              <div className={style.passwordContainer}>
                <CajaTexto
                  tipo={mostrarPassword ? "text" : "password"}
                  fondo="••••••••"
                  name="password"
                  value={credenciales.password}
                  onChange={handleChange}
                  aria-label="Contraseña"
                  aria-invalid={!!errores.password}
                  disabled={cargando}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={style.togglePassword}
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  disabled={cargando}
                >
                  <FontAwesomeIcon icon={mostrarPassword ? faEye : faEyeSlash} />
                </button>
              </div>
              {errores.password && <p className={style.error} role="alert">{errores.password}</p>}
            </div>

            <div className={style.extras}>
              <label className={style.checkLabel}>
                <input
                  type="checkbox"
                  name="recordarme"
                  checked={credenciales.recordarme}
                  onChange={handleChange}
                  disabled={cargando}
                />
                Recordarme
              </label>
              <Link to="/recuperar-password" className={style.olvidaste}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              className={style.btnSubmit}
              disabled={cargando || (bloqueadoHasta && Date.now() < bloqueadoHasta)}
              aria-busy={cargando}
            >
              {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <p className={style.registro}>
            ¿No tienes cuenta?{" "}
            <Link to="/registro" className={style.registroLink}>Regístrate gratis</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
