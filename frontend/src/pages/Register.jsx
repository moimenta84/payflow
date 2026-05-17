import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import Imagen from "../components/Imagen";
import CajaTexto from "../components/CajaTexto";
import Boton from "../components/Boton";
import Toggle from "../components/Toggle";
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
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] =
    useState(false);

  // Rate limiting
  const [intentos, setIntentos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);
  const MAX_INTENTOS = 5;
  const TIEMPO_BLOQUEO = 15 * 60 * 1000;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const valorFinal = type === "checkbox" ? checked : value;

    setUsuario((prev) => ({
      ...prev,
      [name]: valorFinal,
    }));

    if (errores[name]) {
      setErrores((prev) => {
        const nuevosErrores = { ...prev };
        delete nuevosErrores[name];
        return nuevosErrores;
      });
    }

    if (name === "password") {
      validarPassword(value);
      if (usuario.confirmarPassword && value !== usuario.confirmarPassword) {
        setErrores((prev) => ({
          ...prev,
          confirmarPassword: "Las contraseñas no coinciden",
        }));
      } else if (
        usuario.confirmarPassword &&
        value === usuario.confirmarPassword
      ) {
        setErrores((prev) => {
          const nuevosErrores = { ...prev };
          delete nuevosErrores.confirmarPassword;
          return nuevosErrores;
        });
      }
    }

    if (name === "confirmarPassword") {
      if (value !== usuario.password) {
        setErrores((prev) => ({
          ...prev,
          confirmarPassword: "Las contraseñas no coinciden",
        }));
      } else {
        setErrores((prev) => {
          const nuevosErrores = { ...prev };
          delete nuevosErrores.confirmarPassword;
          return nuevosErrores;
        });
      }
    }
  };

  const validarPassword = (password) => {
    setValidacionPassword({
      longitudMinima: password.length >= 8,
      tieneMayuscula: /[A-Z]/.test(password),
      tieneMinuscula: /[a-z]/.test(password),
      tieneNumero: /[0-9]/.test(password),
      tieneEspecial: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~]/.test(password),
    });
  };

  const validarTelefono = (telefono) => {
    if (!telefono || telefono.trim() === "") return true;
    const telefonoLimpio = telefono.replace(/[\s\-()]/g, "");
    const telRegex = /^[0-9]{9,15}$/;
    return telRegex.test(telefonoLimpio);
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!usuario.nombre.trim()) {
      nuevosErrores.nombre = "El nombre es obligatorio";
    } else if (usuario.nombre.trim().length < 2) {
      nuevosErrores.nombre = "El nombre debe tener al menos 2 caracteres";
    }

    if (!usuario.apellido.trim()) {
      nuevosErrores.apellido = "El apellido es obligatorio";
    } else if (usuario.apellido.trim().length < 2) {
      nuevosErrores.apellido = "El apellido debe tener al menos 2 caracteres";
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!usuario.email.trim()) {
      nuevosErrores.email = "El email es obligatorio";
    } else if (!emailRegex.test(usuario.email.trim())) {
      nuevosErrores.email = "El email no es válido";
    }

    if (!validarTelefono(usuario.telefono)) {
      nuevosErrores.telefono = "El teléfono debe tener entre 9 y 15 dígitos";
    }

    if (!usuario.password) {
      nuevosErrores.password = "La contraseña es obligatoria";
    } else if (
      !validacionPassword.longitudMinima ||
      !validacionPassword.tieneMayuscula ||
      !validacionPassword.tieneMinuscula ||
      !validacionPassword.tieneNumero ||
      !validacionPassword.tieneEspecial
    ) {
      nuevosErrores.password = "La contraseña no cumple todos los requisitos";
    }

    if (!usuario.confirmarPassword) {
      nuevosErrores.confirmarPassword = "Debes confirmar la contraseña";
    } else if (usuario.password !== usuario.confirmarPassword) {
      nuevosErrores.confirmarPassword = "Las contraseñas no coinciden";
    }

    if (!usuario.aceptaTerminos) {
      nuevosErrores.aceptaTerminos = "Debes aceptar los términos y condiciones";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const verificarRateLimiting = () => {
    const ahora = Date.now();

    if (bloqueadoHasta && ahora < bloqueadoHasta) {
      const minutosFaltantes = Math.ceil((bloqueadoHasta - ahora) / 60000);
      setErrores({
        general: `Demasiados intentos. Espera ${minutosFaltantes} minutos antes de intentar nuevamente.`,
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
        general:
          "Demasiados intentos. Espera 15 minutos antes de intentar nuevamente.",
      });
      return false;
    }

    return true;
  };

  const getFirebaseErrorMessage = (errorCode) => {
    const errorMessages = {
      "auth/email-already-in-use": "Este email ya está registrado",
      "auth/invalid-email": "El email no es válido",
      "auth/operation-not-allowed": "Operación no permitida",
      "auth/weak-password": "La contraseña es demasiado débil",
      "auth/network-request-failed": "Error de conexión. Verifica tu internet",
    };

    return errorMessages[errorCode] || "Error al registrar. Intenta de nuevo.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!verificarRateLimiting()) {
      return;
    }

    if (validarFormulario()) {
      setCargando(true);
      setIntentos((prev) => prev + 1);

      try {
        console.log("🔄 Iniciando proceso de registro...");

        // Registrar con Firebase
        const result = await register({
          nombre: usuario.nombre.trim(),
          apellido: usuario.apellido.trim(),
          email: usuario.email.trim().toLowerCase(),
          telefono: usuario.telefono.trim(),
          password: usuario.password,
        });

        console.log("✅ Registro completado:", result);

        // Resetear intentos
        setIntentos(0);
        setBloqueadoHasta(null);

        // Mostrar mensaje de éxito
        alert("¡Registro exitoso! Redirigiendo a inicio...");

        // CAMBIO IMPORTANTE: Navegar directamente a /home en lugar de /login
        // Firebase Auth ya autenticó al usuario automáticamente
        setTimeout(() => {
          navigate("/home", { replace: true });
        }, 500);
      } catch (error) {
        console.error("❌ Error en registro:", error);

        const errorMessage = getFirebaseErrorMessage(error.code);

        if (error.code === "auth/email-already-in-use") {
          setErrores({
            email: errorMessage,
          });
        } else {
          setErrores({
            general: errorMessage,
          });
        }
      } finally {
        setCargando(false);
      }
    }
  };

  return (
    <div className={style.register}>
      <div className={style.contenedorRegister}>
        <Toggle />

        <div className={style.logo}>
          {/* SOLUCIÓN: Manejo de error de imagen */}
          <Imagen
            imagen="logo.png"
            alt="Logo de la aplicación"
            onError={(e) => {
              console.warn("⚠️ No se pudo cargar logo.png");
              e.target.style.display = "none";
            }}
          />
        </div>

        <div className={style.titulo}>
          <h1>Crear Cuenta</h1>
        </div>
        <div className={style.subtitulo}>
          <p>Completa tus datos para registrarte</p>
        </div>

        {errores.general && (
          <div className={style.errorGeneral} role="alert">
            {errores.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={style.grupoInputs}>
            <div className={style.inputMitad}>
              <CajaTexto
                tipo="text"
                fondo="Nombre"
                name="nombre"
                value={usuario.nombre}
                onChange={handleChange}
                aria-label="Nombre"
                aria-invalid={!!errores.nombre}
                disabled={cargando}
                autoComplete="given-name"
              />
              {errores.nombre && (
                <p className={style.error} role="alert">
                  {errores.nombre}
                </p>
              )}
            </div>

            <div className={style.inputMitad}>
              <CajaTexto
                tipo="text"
                fondo="Apellido"
                name="apellido"
                value={usuario.apellido}
                onChange={handleChange}
                aria-label="Apellido"
                aria-invalid={!!errores.apellido}
                disabled={cargando}
                autoComplete="family-name"
              />
              {errores.apellido && (
                <p className={style.error} role="alert">
                  {errores.apellido}
                </p>
              )}
            </div>
          </div>

          <div className={style.inputContainer}>
            <CajaTexto
              tipo="email"
              fondo="Correo electrónico"
              name="email"
              value={usuario.email}
              onChange={handleChange}
              aria-label="Correo electrónico"
              aria-invalid={!!errores.email}
              disabled={cargando}
              autoComplete="email"
            />
            {errores.email && (
              <p className={style.error} role="alert">
                {errores.email}
              </p>
            )}
          </div>

          <div className={style.inputContainer}>
            <CajaTexto
              tipo="tel"
              fondo="Teléfono (opcional)"
              name="telefono"
              value={usuario.telefono}
              onChange={handleChange}
              aria-label="Teléfono"
              aria-invalid={!!errores.telefono}
              disabled={cargando}
              autoComplete="tel"
            />
            {errores.telefono && (
              <p className={style.error} role="alert">
                {errores.telefono}
              </p>
            )}
          </div>

          <div className={style.passwordContainer}>
            <CajaTexto
              tipo={mostrarPassword ? "text" : "password"}
              fondo="Contraseña"
              name="password"
              value={usuario.password}
              onChange={handleChange}
              aria-label="Contraseña"
              aria-invalid={!!errores.password}
              disabled={cargando}
              autoComplete="new-password"
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
              <FontAwesomeIcon icon={mostrarPassword ? faEyeSlash : faEye} />
            </button>
          </div>
          {errores.password && (
            <p className={style.error} role="alert">
              {errores.password}
            </p>
          )}

          {usuario.password && (
            <div className={style.requisitosPassword}>
              <h4>Requisitos de la contraseña:</h4>
              <ul>
                <li
                  className={
                    validacionPassword.longitudMinima ? style.valido : ""
                  }
                >
                  <span>{validacionPassword.longitudMinima ? "✓" : "○"}</span>
                  Al menos 8 caracteres
                </li>
                <li
                  className={
                    validacionPassword.tieneMayuscula ? style.valido : ""
                  }
                >
                  <span>{validacionPassword.tieneMayuscula ? "✓" : "○"}</span>
                  Una letra mayúscula
                </li>
                <li
                  className={
                    validacionPassword.tieneMinuscula ? style.valido : ""
                  }
                >
                  <span>{validacionPassword.tieneMinuscula ? "✓" : "○"}</span>
                  Una letra minúscula
                </li>
                <li
                  className={validacionPassword.tieneNumero ? style.valido : ""}
                >
                  <span>{validacionPassword.tieneNumero ? "✓" : "○"}</span>
                  Un número
                </li>
                <li
                  className={
                    validacionPassword.tieneEspecial ? style.valido : ""
                  }
                >
                  <span>{validacionPassword.tieneEspecial ? "✓" : "○"}</span>
                  Un carácter especial (!@#$%^&*...)
                </li>
              </ul>
            </div>
          )}

          <div className={style.passwordContainer}>
            <CajaTexto
              tipo={mostrarConfirmarPassword ? "text" : "password"}
              fondo="Confirmar contraseña"
              name="confirmarPassword"
              value={usuario.confirmarPassword}
              onChange={handleChange}
              aria-label="Confirmar contraseña"
              aria-invalid={!!errores.confirmarPassword}
              disabled={cargando}
              autoComplete="new-password"
            />
            <button
              type="button"
              className={style.togglePassword}
              onClick={() =>
                setMostrarConfirmarPassword(!mostrarConfirmarPassword)
              }
              aria-label={
                mostrarConfirmarPassword
                  ? "Ocultar contraseña"
                  : "Mostrar contraseña"
              }
              disabled={cargando}
            >
              <FontAwesomeIcon
                icon={mostrarConfirmarPassword ? faEyeSlash : faEye}
              />
            </button>
          </div>
          {errores.confirmarPassword && (
            <p className={style.error} role="alert">
              {errores.confirmarPassword}
            </p>
          )}

          <div className={style.contenedorTerminos}>
            <input
              type="checkbox"
              id="terminos"
              name="aceptaTerminos"
              checked={usuario.aceptaTerminos}
              onChange={handleChange}
              aria-invalid={!!errores.aceptaTerminos}
              disabled={cargando}
            />
            <label htmlFor="terminos">
              Acepto los{" "}
              <a href="/terminos" target="_blank" rel="noopener noreferrer">
                términos y condiciones
              </a>{" "}
              y la{" "}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer">
                política de privacidad
              </a>
            </label>
          </div>
          {errores.aceptaTerminos && (
            <p className={style.error} role="alert">
              {errores.aceptaTerminos}
            </p>
          )}

          <div className={style.contenedorBoton}>
            <Boton
              tamano="lg"
              texto={cargando ? "Registrando..." : "Registrarse"}
              tipo="submit"
              disabled={
                cargando || (bloqueadoHasta && Date.now() < bloqueadoHasta)
              }
              aria-busy={cargando}
            />
          </div>
        </form>

        <div className={style.divider}>
          <span>¿Ya tienes cuenta?</span>
        </div>

        <div className={style.enlaceLogin}>
          <p>
            <Link to="/login">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
