import React, { useState, useEffect, useCallback } from "react";
import { api } from "../config/api";
import style from "../styles/Wallet.module.css";

// Pantalla de la wallet: muestra el saldo, el historial de movimientos y permite enviar/pedir dinero (P2P).

function IconSend() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconRequest() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function Wallet() {
  const [wallet, setWallet]           = useState(null);
  const [movements, setMovements]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [showSend, setShowSend]       = useState(false);
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  // Solicitar dinero
  const [showRequest, setShowRequest]   = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestDesc, setRequestDesc]     = useState("");
  const [copiado, setCopiado]             = useState(false);

  const [form, setForm] = useState({ toUserId: "", amount: "", description: "" });

  // Carga el saldo y el historial a la vez desde el wallet-service.
  const loadWallet = useCallback(async () => {
    try {
      const [w, m] = await Promise.all([
        api.get("/wallet/me"),
        api.get("/wallet/movements"),
      ]);
      setWallet(w);
      setMovements(Array.isArray(m) ? m : []);
    } catch (e) {
      setError(e.message || "No se pudo cargar la wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  // Envío de dinero P2P: valida, llama al backend y recarga el saldo para reflejar el cambio.
  const handleSend = async (e) => {
    e.preventDefault();
    setSendError(""); setSendSuccess("");
    if (!form.toUserId.trim() || !form.amount) { setSendError("Destinatario e importe son obligatorios"); return; }
    setSending(true);
    try {
      // El backend es idempotente y atómico: descuenta al emisor y abona al receptor en una transacción.
      await api.post("/wallet/send", {
        toUserId: form.toUserId.trim(),
        amount: parseFloat(form.amount),
        description: form.description.trim() || undefined,
      });
      setSendSuccess(`Enviados ${parseFloat(form.amount).toFixed(2)} EUR correctamente.`);
      setForm({ toUserId: "", amount: "", description: "" });
      await loadWallet();
      setTimeout(() => { setShowSend(false); setSendSuccess(""); }, 2000);
    } catch (e) {
      setSendError(e.message || "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dt) => {
    if (!dt) return "";
    return new Date(dt).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  // Partimos el saldo en parte entera y decimales para mostrarlos con distinto tamaño de fuente.
  const balanceFormatted = wallet
    ? wallet.balance.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0,00";
  const [balanceInt, balanceDec] = balanceFormatted.includes(",")
    ? balanceFormatted.split(",")
    : [balanceFormatted, "00"];

  return (
    <div className={style.page}>
      <div className={style.container}>

        <div className={style.header}>
          <h1 className={style.title}>Wallet</h1>
          <p className={style.subtitle}>Tu saldo y movimientos en PayFlow</p>
        </div>

        {error && <div className={style.errorBanner}>{error}</div>}

        <div className={style.saldoCard}>
          <span className={style.saldoLabel}>Saldo disponible · {wallet?.currency || "EUR"}</span>
          {loading
            ? <span className={style.saldoMonto}>—</span>
            : <span className={style.saldoMonto}>€ {balanceInt}<span>,{balanceDec}</span></span>
          }
        </div>

        <div className={style.acciones}>
          <button className={style.accionBtn} onClick={() => { setShowSend(true); setSendError(""); setSendSuccess(""); }}>
            <IconSend />
            <span className={style.accionLabel}>Enviar</span>
          </button>
          <button className={style.accionBtn} onClick={() => { setShowRequest(true); setRequestAmount(""); setRequestDesc(""); setCopiado(false); }}>
            <IconRequest />
            <span className={style.accionLabel}>Pedir</span>
          </button>
        </div>

        {/* Historial de movimientos */}
        <div className={style.movimientosPanel}>
          <h2 className={style.panelTitle}>Movimientos</h2>
          {loading && <p className={style.cargando}>Cargando...</p>}
          {!loading && movements.length === 0 && (
            <p className={style.vacio}>No hay movimientos aún. Tu primer movimiento aparecerá aquí.</p>
          )}
          {movements.map((m) => {
            const esCredito = m.type === "CREDIT";
            return (
              <div key={m.id} className={`${style.movItem} ${esCredito ? style.movCredito : style.movDebito}`}>
                <div className={style.movIcon}>
                  {esCredito ? "↓" : "↑"}
                </div>
                <div className={style.movInfo}>
                  <span className={style.movDesc}>{m.description || "Transferencia"}</span>
                  {m.counterpartyUserId && (
                    <span className={style.movCounterparty}>
                      {esCredito ? "De: " : "A: "}{m.counterpartyUserId}
                    </span>
                  )}
                  <span className={style.movFecha}>{formatDate(m.createdAt)}</span>
                </div>
                <div className={style.movDerecha}>
                  <span className={`${style.movAmount} ${esCredito ? style.positivo : style.negativo}`}>
                    {esCredito ? "+" : "-"}{m.amount?.toFixed(2)} {wallet?.currency || "EUR"}
                  </span>
                  <span className={style.movSaldo}>Saldo: {m.balanceAfter?.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal enviar dinero */}
      {showSend && (
        <div className={style.modalOverlay} onClick={() => setShowSend(false)}>
          <div className={style.modal} onClick={(e) => e.stopPropagation()}>
            <div className={style.modalHeader}>
              <h3 className={style.modalTitle}>Enviar dinero</h3>
              <button className={style.modalClose} onClick={() => setShowSend(false)}><IconClose /></button>
            </div>

            <form onSubmit={handleSend} className={style.modalForm}>
              <div className={style.formGroup}>
                <label className={style.label}>ID del destinatario</label>
                <input
                  className={style.input}
                  value={form.toUserId}
                  onChange={(e) => setForm((p) => ({ ...p, toUserId: e.target.value }))}
                  placeholder="ID de usuario PayFlow"
                  required
                />
              </div>
              <div className={style.formGroup}>
                <label className={style.label}>Importe (EUR)</label>
                <input
                  className={style.input}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className={style.formGroup}>
                <label className={style.label}>Concepto <span className={style.optional}>(opcional)</span></label>
                <input
                  className={style.input}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Ej: Cena del viernes"
                  maxLength={200}
                />
              </div>

              {sendError   && <p className={style.sendError}>{sendError}</p>}
              {sendSuccess && <p className={style.sendSuccess}>{sendSuccess}</p>}

              <div className={style.modalActions}>
                <button type="button" className={style.btnCancelar} onClick={() => setShowSend(false)}>Cancelar</button>
                <button type="submit" className={style.btnEnviar} disabled={sending}>
                  {sending ? "Enviando..." : "Confirmar envío"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal solicitar dinero */}
      {showRequest && (
        <div className={style.modalOverlay} onClick={() => setShowRequest(false)}>
          <div className={style.modal} onClick={(e) => e.stopPropagation()}>
            <div className={style.modalHeader}>
              <h3 className={style.modalTitle}>Solicitar dinero</h3>
              <button className={style.modalClose} onClick={() => setShowRequest(false)}><IconClose /></button>
            </div>

            <div className={style.modalForm}>
              <div className={style.formGroup}>
                <label className={style.label}>Importe (EUR)</label>
                <input
                  className={style.input}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className={style.formGroup}>
                <label className={style.label}>Concepto <span className={style.optional}>(opcional)</span></label>
                <input
                  className={style.input}
                  value={requestDesc}
                  onChange={(e) => setRequestDesc(e.target.value)}
                  placeholder="Ej: Cena del viernes"
                  maxLength={200}
                />
              </div>

              {/* En cuanto hay importe, generamos un enlace de cobro que el otro usuario abrirá en /pay. */}
              {requestAmount && parseFloat(requestAmount) > 0 && (
                <div style={{ background: '#f0f9ff', border: '1px solid #0891b2', borderRadius: '10px', padding: '12px', marginTop: '8px' }}>
                  <p style={{ fontSize: '0.8rem', color: '#0c3549', margin: '0 0 6px', fontWeight: 600 }}>Enlace de cobro generado:</p>
                  <code style={{ display: 'block', wordBreak: 'break-all', fontSize: '0.78rem', color: '#155e75', background: '#fff', padding: '8px', borderRadius: '6px' }}>
                    {`${window.location.origin}/pay?to=${wallet?.userId || ''}&amount=${requestAmount}${requestDesc ? `&desc=${encodeURIComponent(requestDesc)}` : ''}`}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/pay?to=${wallet?.userId || ''}&amount=${requestAmount}${requestDesc ? `&desc=${encodeURIComponent(requestDesc)}` : ''}`;
                      navigator.clipboard.writeText(url);
                      setCopiado(true);
                      setTimeout(() => setCopiado(false), 2500);
                    }}
                    style={{ marginTop: '8px', padding: '6px 14px', background: copiado ? '#059669' : '#0891b2', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {copiado ? '✓ Copiado' : '📋 Copiar enlace'}
                  </button>
                </div>
              )}

              <div className={style.modalActions}>
                <button type="button" className={style.btnCancelar} onClick={() => setShowRequest(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
