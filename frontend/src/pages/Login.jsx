import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import PayFlowLogo from "../components/PayFlowLogo";
import CajaTexto from "../components/CajaTexto";
import style from "../styles/Login.module.css";
import "../index.css";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [credenciales, setCredenciales] = useState({
    email: "",
    password: "",
    recordarme: false,
  });

  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [intentos, setIntentos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);
  const MAX_INTENTOS = 5;
  const TIEMPO_BLOQUEO = 15 * 60 * 1000;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCredenciales((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errores[name]) setErrores((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!verificarRateLimiting()) return;
    if (!validarFormulario()) return;

    setCargando(true);
    setIntentos((p) => p + 1);
    try {
      await login(credenciales.email.trim().toLowerCase(), credenciales.password);
      setIntentos(0);
      setBloqueadoHasta(null);
      navigate("/home");
    } catch (error) {
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
            <PayFlowLogo size={56} />
            <span className={style.brandName}>PayFlow</span>
          </div>
          <h2 className={style.brandTagline}>
            Tus finanzas,<br />bajo control.
          </h2>
          <p className={style.brandSub}>
            Gestiona tus transacciones, sigue el mercado crypto y recibe alertas de precio en tiempo real.
          </p>
          <div className={style.brandFeatures}>
            <span>✓ Transacciones en tiempo real</span>
            <span>✓ Alertas de precio crypto</span>
            <span>✓ Informes mensuales en PDF</span>
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
