import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../config/api";

export default function Pay() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const toUserId = searchParams.get("to") || "";
  const amount   = parseFloat(searchParams.get("amount") || "0");
  const desc     = searchParams.get("desc") || "";

  const [wallet, setWallet]   = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/wallet/me").then(setWallet).catch(() => {});
  }, []);

  const paramsOk = toUserId && amount > 0;

  const handlePay = async () => {
    setError("");
    setSending(true);
    try {
      await api.post("/wallet/send", {
        toUserId,
        amount,
        description: desc || "Pago por enlace",
      });
      setSuccess(true);
      setTimeout(() => navigate("/wallet"), 2500);
    } catch (e) {
      setError(e.message || "Error al procesar el pago");
    } finally {
      setSending(false);
    }
  };

  if (!paramsOk) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>⚠️</div>
          <h2 style={styles.title}>Enlace inválido</h2>
          <p style={styles.sub}>Faltan datos en el enlace de cobro.</p>
          <button style={styles.btnPrimary} onClick={() => navigate("/wallet")}>
            Ir a mi Wallet
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.iconWrap, background: "rgba(34,197,94,0.12)", color: "#16a34a", fontSize: "2rem" }}>✓</div>
          <h2 style={{ ...styles.title, color: "#16a34a" }}>¡Pago enviado!</h2>
          <p style={styles.sub}>
            Has enviado <strong>{amount.toFixed(2)} EUR</strong> correctamente.
          </p>
          <p style={{ ...styles.sub, fontSize: "0.8rem", color: "#94a3b8" }}>
            Redirigiendo a tu wallet...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.iconWrap}>💸</div>
        <h2 style={styles.title}>Pago solicitado</h2>
        <p style={styles.sub}>Alguien te ha enviado un enlace de cobro</p>

        <div style={styles.summaryBox}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Importe</span>
            <span style={styles.summaryAmount}>{amount.toFixed(2)} EUR</span>
          </div>
          {desc && (
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Concepto</span>
              <span style={styles.summaryValue}>{desc}</span>
            </div>
          )}
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Destinatario</span>
            <span style={{ ...styles.summaryValue, fontFamily: "monospace", fontSize: "0.78rem", color: "#64748b" }}>
              {toUserId}
            </span>
          </div>
          {wallet && (
            <div style={{ ...styles.summaryRow, borderTop: "1px solid #e2e8f0", marginTop: 4, paddingTop: 12 }}>
              <span style={styles.summaryLabel}>Tu saldo</span>
              <span style={{ ...styles.summaryValue, color: wallet.balance >= amount ? "#0891b2" : "#ef4444" }}>
                {wallet.balance.toFixed(2)} EUR
              </span>
            </div>
          )}
        </div>

        {wallet && wallet.balance < amount && (
          <p style={styles.errorMsg}>Saldo insuficiente para completar este pago.</p>
        )}

        {error && <p style={styles.errorMsg}>{error}</p>}

        <div style={styles.actions}>
          <button style={styles.btnSecondary} onClick={() => navigate("/wallet")} disabled={sending}>
            Cancelar
          </button>
          <button
            style={{
              ...styles.btnPrimary,
              opacity: (sending || (wallet && wallet.balance < amount)) ? 0.6 : 1,
              cursor: (sending || (wallet && wallet.balance < amount)) ? "not-allowed" : "pointer",
            }}
            onClick={handlePay}
            disabled={sending || (wallet && wallet.balance < amount)}
          >
            {sending ? "Enviando..." : `Pagar ${amount.toFixed(2)} EUR`}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
  },
  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "2.5rem 2rem",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    textAlign: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "rgba(8,145,178,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.75rem",
    marginBottom: "0.25rem",
  },
  title: {
    margin: 0,
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  sub: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#64748b",
  },
  summaryBox: {
    width: "100%",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "0.5rem",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.5rem",
  },
  summaryLabel: {
    fontSize: "0.82rem",
    color: "#64748b",
    fontWeight: 500,
  },
  summaryAmount: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#0891b2",
    letterSpacing: "-0.02em",
  },
  summaryValue: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#0f172a",
    textAlign: "right",
    maxWidth: "220px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  errorMsg: {
    margin: 0,
    color: "#dc2626",
    fontSize: "0.875rem",
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "8px",
    padding: "8px 14px",
    width: "100%",
    boxSizing: "border-box",
    textAlign: "center",
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
    width: "100%",
    marginTop: "0.5rem",
  },
  btnPrimary: {
    flex: 1,
    padding: "12px 20px",
    borderRadius: "10px",
    border: "none",
    background: "#0891b2",
    color: "#fff",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  btnSecondary: {
    flex: 1,
    padding: "12px 20px",
    borderRadius: "10px",
    border: "1.5px solid #e2e8f0",
    background: "none",
    color: "#475569",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
};
