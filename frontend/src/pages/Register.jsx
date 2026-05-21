import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import PayFlowLogo from "../components/PayFlowLogo";
import CajaTexto from "../components/CajaTexto";
import style from "../styles/Register.module.css";
import "../index.css";

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [usuario, setUsuario] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    password: "",
    confirmarPassword: "",
    aceptaTerminos: false,
  });

  const [validacionPassword, setValidacionPassword] = useState({
    longitudMinima: false,
    tieneMayuscula: false,
    tieneMinuscula: false,
    tieneNumero: false,
    tieneEspecial: false,
  });

  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false);

  const [intentos, setIntentos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);
  const MAX_INTENTOS = 5;
  const TIEMPO_BLOQUEO = 15 * 60 * 1000;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setUsuario((prev) => ({ ...prev, [name]: val }));
    if (errores[name]) setErrores((prev) => { const n = { ...prev }; delete n[name]; return n; });

    if (name === "password") {
      validarPassword(value);
      if (usuario.confirmarPassword) {
        if (value !== usuario.confirmarPassword) setErrores((p) => ({ ...p, confirmarPassword: "Las contraseñas no coinciden" }));
        else setErrores((p) => { const n = { ...p }; delete n.confirmarPassword; return n; });
      }
    }
    if (name === "confirmarPassword") {
      if (value !== usuario.password) setErrores((p) => ({ ...p, confirmarPassword: "Las contraseñas no coinciden" }));
      else setErrores((p) => { const n = { ...p }; delete n.confirmarPassword; return n; });
    }
  };

  const validarPassword = (p) => setValidacionPassword({
    longitudMinima: p.length >= 8,
    tieneMayuscula: /[A-Z]/.test(p),
    tieneMinuscula: /[a-z]/.test(p),
    tieneNumero: /[0-9]/.test(p),
    tieneEspecial: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~]/.test(p),
  });

  const validarFormulario = () => {
    const err = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!usuario.nombre.trim() || usuario.nombre.trim().length < 2) err.nombre = "Mínimo 2 caracteres";
    if (!usuario.apellido.trim() || usuario.apellido.trim().length < 2) err.apellido = "Mínimo 2 caracteres";
    if (!usuario.email.trim()) err.email = "El email es obligatorio";
    else if (!emailRegex.test(usuario.email.trim())) err.email = "El email no es válido";
    if (usuario.telefono && usuario.telefono.trim()) {
      const tel = usuario.telefono.replace(/[\s\-()]/g, "");
      if (!/^[0-9]{9,15}$/.test(tel)) err.telefono = "Entre 9 y 15 dígitos";
    }
    if (!usuario.password) err.password = "La contraseña es obligatoria";
    else if (!Object.values(validacionPassword).every(Boolean)) err.password = "La contraseña no cumple los requisitos";
    if (!usuario.confirmarPassword) err.confirmarPassword = "Confirma la contraseña";
    else if (usuario.password !== usuario.confirmarPassword) err.confirmarPassword = "Las contraseñas no coinciden";
    if (!usuario.aceptaTerminos) err.aceptaTerminos = "Debes aceptar los términos";
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
      await register({
        nombre: usuario.nombre.trim(),
        apellido: usuario.apellido.trim(),
        email: usuario.email.trim().toLowerCase(),
        telefono: usuario.telefono.trim(),
        password: usuario.password,
      });
      setIntentos(0);
      setBloqueadoHasta(null);
      setTimeout(() => navigate("/home", { replace: true }), 500);
    } catch (error) {
      const msg = error.code === "auth/email-already-in-use"
        ? "Este email ya está registrado"
        : "Error al registrar. Intenta de nuevo.";
      if (error.code === "auth/email-already-in-use") setErrores({ email: msg });
      else setErrores({ general: msg });
    } finally {
      setCargando(false);
    }
  };

  const Req = ({ ok, text }) => (
    <li className={ok ? style.reqOk : style.reqPending}>
      <span>{ok ? "✓" : "○"}</span> {text}
    </li>
  );

  return (
    <div className={style.page}>
      {/* Brand panel */}
      <div className={style.brand}>
        <div className={style.brandInner}>
          <div className={style.brandLogo}>
            <PayFlowLogo size={56} />
            <span className={style.brandName}>PayFlow</span>
          </div>
          <h2 className={style.brandTagline}>Empieza gratis,<br />sin compromisos.</h2>
          <p className={style.brandSub}>
            Crea tu cuenta en menos de un minuto y toma el control de tus finanzas personales.
          </p>
          <div className={style.brandFeatures}>
            <span>✓ Sin tarjeta de crédito requerida</span>
            <span>✓ Datos cifrados y seguros</span>
            <span>✓ Cancelación cuando quieras</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className={style.formPanel}>
        <div className={style.formCard}>
          <div className={style.formHeader}>
            <h1 className={style.titulo}>Crear cuenta</h1>
            <p className={style.subtitulo}>Completa tus datos para registrarte</p>
          </div>

          {errores.general && (
            <div className={style.errorGeneral} role="alert">{errores.general}</div>
          )}

          <form onSubmit={handleSubmit} noValidate className={style.form}>
            <div className={style.row}>
              <div className={style.inputGroup}>
                <label className={style.label}>Nombre</label>
                <CajaTexto tipo="text" fondo="Nombre" name="nombre" value={usuario.nombre}
                  onChange={handleChange} disabled={cargando} autoComplete="given-name"
                  aria-invalid={!!errores.nombre} />
                {errores.nombre && <p className={style.error}>{errores.nombre}</p>}
              </div>
              <div className={style.inputGroup}>
                <label className={style.label}>Apellido</label>
                <CajaTexto tipo="text" fondo="Apellido" name="apellido" value={usuario.apellido}
                  onChange={handleChange} disabled={cargando} autoComplete="family-name"
                  aria-invalid={!!errores.apellido} />
                {errores.apellido && <p className={style.error}>{errores.apellido}</p>}
              </div>
            </div>

            <div className={style.inputGroup}>
              <label className={style.label}>Correo electrónico</label>
              <CajaTexto tipo="email" fondo="tu@email.com" name="email" value={usuario.email}
                onChange={handleChange} disabled={cargando} autoComplete="email"
                aria-invalid={!!errores.email} />
              {errores.email && <p className={style.error}>{errores.email}</p>}
            </div>

            <div className={style.inputGroup}>
              <label className={style.label}>Teléfono <span className={style.optional}>(opcional)</span></label>
              <CajaTexto tipo="tel" fondo="+34 600 000 000" name="telefono" value={usuario.telefono}
                onChange={handleChange} disabled={cargando} autoComplete="tel"
                aria-invalid={!!errores.telefono} />
              {errores.telefono && <p className={style.error}>{errores.telefono}</p>}
            </div>

            <div className={style.inputGroup}>
              <label className={style.label}>Contraseña</label>
              <div className={style.passwordWrap}>
                <CajaTexto tipo={mostrarPassword ? "text" : "password"} fondo="••••••••" name="password"
                  value={usuario.password} onChange={handleChange} disabled={cargando}
                  autoComplete="new-password" aria-invalid={!!errores.password} />
                <button type="button" className={style.eye} onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-label={mostrarPassword ? "Ocultar" : "Mostrar"} disabled={cargando}>
                  <FontAwesomeIcon icon={mostrarPassword ? faEyeSlash : faEye} />
                </button>
              </div>
              {errores.password && <p className={style.error}>{errores.password}</p>}

              {usuario.password && (
                <ul className={style.reqList}>
                  <Req ok={validacionPassword.longitudMinima} text="Mínimo 8 caracteres" />
                  <Req ok={validacionPassword.tieneMayuscula} text="Una mayúscula" />
                  <Req ok={validacionPassword.tieneMinuscula} text="Una minúscula" />
                  <Req ok={validacionPassword.tieneNumero}    text="Un número" />
                  <Req ok={validacionPassword.tieneEspecial}  text="Un carácter especial" />
                </ul>
              )}
            </div>

            <div className={style.inputGroup}>
              <label className={style.label}>Confirmar contraseña</label>
              <div className={style.passwordWrap}>
                <CajaTexto tipo={mostrarConfirmarPassword ? "text" : "password"} fondo="••••••••"
                  name="confirmarPassword" value={usuario.confirmarPassword} onChange={handleChange}
                  disabled={cargando} autoComplete="new-password" aria-invalid={!!errores.confirmarPassword} />
                <button type="button" className={style.eye}
                  onClick={() => setMostrarConfirmarPassword(!mostrarConfirmarPassword)}
                  aria-label={mostrarConfirmarPassword ? "Ocultar" : "Mostrar"} disabled={cargando}>
                  <FontAwesomeIcon icon={mostrarConfirmarPassword ? faEyeSlash : faEye} />
                </button>
              </div>
              {errores.confirmarPassword && <p className={style.error}>{errores.confirmarPassword}</p>}
            </div>

            <label className={style.termsLabel}>
              <input type="checkbox" name="aceptaTerminos" checked={usuario.aceptaTerminos}
                onChange={handleChange} disabled={cargando} />
              Acepto los{" "}
              <a href="/terminos" target="_blank" rel="noopener noreferrer">términos y condiciones</a>{" "}
              y la{" "}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer">política de privacidad</a>
            </label>
            {errores.aceptaTerminos && <p className={style.error}>{errores.aceptaTerminos}</p>}

            <button type="submit" className={style.btnSubmit}
              disabled={cargando || (bloqueadoHasta && Date.now() < bloqueadoHasta)} aria-busy={cargando}>
              {cargando ? "Registrando..." : "Crear cuenta"}
            </button>
          </form>

          <p className={style.login}>
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className={style.loginLink}>Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
