import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../config/api";
import s from "../styles/Payment.module.css";

function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const sessionId = searchParams.get("session_id");

  const [estado, setEstado] = useState("loading"); // loading | ok | error
  const [plan, setPlan] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const yaConfirmado = useRef(false);

  useEffect(() => {
    if (yaConfirmado.current) return;
    yaConfirmado.current = true;

    if (!sessionId) {
      setEstado("error");
      setMensaje("Falta el identificador de la sesión de pago.");
      return;
    }

    (async () => {
      try {
        const user = await api.post("/payments/confirm", { sessionId });
        setPlan(user?.plan || null);
        await refreshUser();
        setEstado("ok");
      } catch (err) {
        setEstado("error");
        setMensaje(err.message || "No se pudo confirmar el pago.");
      }
    })();
  }, [sessionId, refreshUser]);

  return (
    <div className={s.page}>
      <div className={s.card}>
        {estado === "loading" && (
          <>
            <div className={s.spinner} />
            <h1 className={s.titulo}>Confirmando tu pago…</h1>
            <p className={s.texto}>Estamos activando tu plan. No cierres esta ventana.</p>
          </>
        )}

        {estado === "ok" && (
          <>
            <div className={`${s.icono} ${s.iconoOk}`}>✓</div>
            <h1 className={s.titulo}>¡Plan activado!</h1>
            <p className={s.texto}>
              Ya tienes el plan Autónomos activo. Disfruta de todas las funciones premium.
            </p>
            <button className={s.btnPrimary} onClick={() => navigate("/home", { replace: true })}>
              Ir a mi cuenta
            </button>
          </>
        )}

        {estado === "error" && (
          <>
            <div className={`${s.icono} ${s.iconoErr}`}>!</div>
            <h1 className={s.titulo}>No pudimos confirmar el pago</h1>
            <p className={s.texto}>{mensaje}</p>
            <div className={s.acciones}>
              <button className={s.btnPrimary} onClick={() => navigate("/home", { replace: true })}>
                Ir a mi cuenta
              </button>
              <button className={s.btnGhost} onClick={() => navigate("/?#pricing")}>
                Ver planes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PaymentSuccess;
