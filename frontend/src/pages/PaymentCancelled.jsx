import React from "react";
import { useNavigate } from "react-router-dom";
import s from "../styles/Payment.module.css";

function PaymentCancelled() {
  const navigate = useNavigate();

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={`${s.icono} ${s.iconoNeutral}`}>×</div>
        <h1 className={s.titulo}>Pago cancelado</h1>
        <p className={s.texto}>
          No se ha realizado ningún cargo. Tu cuenta sigue activa con el plan Free.
          Puedes mejorar tu plan cuando quieras.
        </p>
        <div className={s.acciones}>
          <button className={s.btnPrimary} onClick={() => navigate("/home", { replace: true })}>
            Ir a mi cuenta
          </button>
          <button className={s.btnGhost} onClick={() => navigate("/")}>
            Ver planes
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentCancelled;
