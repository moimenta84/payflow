import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PayFlowLogo from "../components/PayFlowLogo";
import CajaTexto from "../components/CajaTexto";
import style from "../styles/Remember.module.css";
import "../index.css";

// Pantalla "¿Olvidaste tu contraseña?": pide el email y dispara el envío de una contraseña temporal.
function Remember() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false); // Cambia la vista a la pantalla de "correo enviado".

  const [intentos, setIntentos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);
  const MAX_INTENTOS = 3;
  const TIEMPO_BLOQUEO = 15 * 60 * 1000;

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (errores.email) setErrores({});
    if (enviado) setEnviado(false);
  };

  const validarFormulario = () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.trim()) { setErrores({ email: "El email es obligatorio" }); return false; }
    if (!emailRegex.test(email.trim())) { setErrores({ email: "El email no es válido" }); return false; }
    setErrores({});
    return true;
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
      // El backend responde igual exista o no el email (no revelamos si está registrado).
      await resetPassword(email.trim().toLowerCase());
      setEnviado(true);
      setIntentos(0);
      setBloqueadoHasta(null);
      setTimeout(() => navigate("/login"), 5000); // Volvemos al login a los 5 segundos.
    } catch (error) {
      setErrores({ general: "Error al enviar el correo. Intenta de nuevo." });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={style.page}>
      <div className={style.card}>
        {/* Logo */}
        <Link to="/" className={style.logoLink}>
          <PayFlowLogo size={44} />
          <span className={style.logoName}>PayFlow</span>
        </Link>

        {!enviado ? (
          <>
            <h1 className={style.titulo}>Recuperar contraseña</h1>
            <p className={style.subtitulo}>
              Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {errores.general && (
              <div className={style.errorGeneral} role="alert">{errores.general}</div>
            )}

            <form onSubmit={handleSubmit} noValidate className={style.form}>
              <div className={style.inputGroup}>
                <label className={style.label}>Correo electrónico</label>
                <CajaTexto tipo="email" fondo="tu@email.com" name="email" value={email}
                  onChange={handleChange} disabled={cargando || enviado} autoComplete="email"
                  aria-invalid={!!errores.email} aria-describedby={errores.email ? "err-email" : undefined} />
                {errores.email && <p id="err-email" className={style.error} role="alert">{errores.email}</p>}
              </div>

              <button type="submit" className={style.btnSubmit}
                disabled={cargando || (bloqueadoHasta && Date.now() < bloqueadoHasta)} aria-busy={cargando}>
                {cargando ? "Enviando..." : "Enviar enlace de recuperación"}
              </button>
            </form>
          </>
        ) : (
          <div className={style.exitoContainer}>
            <div className={style.exitoIcono}>✉</div>
            <h1 className={style.titulo}>Correo enviado</h1>
            <p className={style.subtitulo}>
              Hemos enviado un enlace de recuperación a <strong>{email}</strong>.
              Revisa tu bandeja de entrada (y la carpeta de spam).
            </p>
            <p className={style.redirigiendo}>Redirigiendo al inicio de sesión en 5 segundos...</p>
          </div>
        )}

        <div className={style.footer}>
          <Link to="/login" className={style.volverLink}>← Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}

export default Remember;
