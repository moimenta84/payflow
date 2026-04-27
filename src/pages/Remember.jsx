import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Imagen from "../components/Imagen";
import CajaTexto from "../components/CajaTexto";
import Boton from "../components/Boton";
import Toggle from "../components/Toggle";
import style from "../styles/Remember.module.css";
import "../index.css";

function Remember() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  
  const [email, setEmail] = useState("");
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // Rate limiting
  const [intentos, setIntentos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);
  const MAX_INTENTOS = 3;
  const TIEMPO_BLOQUEO = 15 * 60 * 1000;

  const handleChange = (e) => {
    const { value } = e.target;
    setEmail(value);

    if (errores.email) {
      setErrores({});
    }
    
    if (enviado) {
      setEnviado(false);
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.trim()) {
      nuevosErrores.email = "El email es obligatorio";
    } else if (!emailRegex.test(email.trim())) {
      nuevosErrores.email = "El email no es válido";
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
      'auth/user-not-found': 'No existe una cuenta con este email',
      'auth/invalid-email': 'El email no es válido',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
    };

    return errorMessages[errorCode] || 'Error al enviar el correo. Intenta de nuevo.';
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
        // Enviar email de recuperación con Firebase
        await resetPassword(email.trim().toLowerCase());

        setEnviado(true);
        setIntentos(0);
        setBloqueadoHasta(null);

        // Redirigir a login después de 5 segundos
        setTimeout(() => {
          navigate('/login');
        }, 5000);

      } catch (error) {
        console.error('Error en recuperación:', error);
        
        setErrores({
          general: getFirebaseErrorMessage(error.code)
        });
      } finally {
        setCargando(false);
      }
    }
  };

  return (
    <div className={style.remember}>
      <div className={style.contenedorRemember}>
        <Toggle />

        <div className={style.logo}>
          <Imagen imagen="logo.png" alt="Logo de la aplicación" />
        </div>

        <div className={style.titulo}>
          <h1>Recuperar Contraseña</h1>
        </div>
        <div className={style.subtitulo}>
          <p>Ingresa tu correo electrónico para recuperar tu cuenta</p>
        </div>

        {errores.general && (
          <div className={style.errorGeneral} role="alert">
            {errores.general}
          </div>
        )}

        {enviado && (
          <div className={style.exitoGeneral} role="alert">
            ✓ Correo enviado exitosamente. Revisa tu bandeja de entrada.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <CajaTexto 
            tipo="email" 
            fondo="Correo electrónico" 
            name="email"
            value={email}
            onChange={handleChange}
            aria-label="Correo electrónico"
            aria-invalid={!!errores.email}
            aria-describedby={errores.email ? "error-email" : undefined}
            disabled={cargando || enviado}
            autoComplete="email"
          />
          {errores.email && (
            <p id="error-email" className={style.error} role="alert">
              {errores.email}
            </p>
          )}

          {!enviado && (
            <div className={style.mensaje}>
              <p>
                Te enviaremos un enlace de recuperación a tu correo electrónico
                para restablecer tu contraseña.
              </p>
            </div>
          )}

          {enviado && (
            <div className={style.mensaje}>
              <p>
                Revisa tu bandeja de entrada (y spam) y sigue las instrucciones 
                para restablecer tu contraseña. El enlace es válido por 1 hora.
              </p>
            </div>
          )}

          <div className={style.contenedorBotones}>
            <Boton 
              tamano="lg" 
              texto={cargando ? "Enviando..." : enviado ? "Reenviar correo" : "Enviar"} 
              tipo="submit"
              disabled={cargando || (bloqueadoHasta && Date.now() < bloqueadoHasta)}
              aria-busy={cargando}
            />
          </div>
        </form>

        <div className={style.volverLogin}>
          <span>¿Recordaste tu contraseña? </span>
          <Link to="/login">← Volver al inicio de sesión</Link>
        </div>

        <div className={style.divider}>
          <span>¿Necesitas ayuda?</span>
        </div>

        <div className={style.enlaceContainer}>
          <span>
            Si no recibes el correo en unos minutos, revisa tu carpeta de spam
            o intenta de nuevo.
          </span>
        </div>
      </div>
    </div>
  );
}

export default Remember;
