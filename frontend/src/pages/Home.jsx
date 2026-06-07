import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../config/api";
import { listTransacciones } from "../config/transactionsStore";
import FinancialChart from "../components/FinancialChart";
import CategoryChart from "../components/CategoryChart";
import style from "../styles/Home.module.css";

// Dashboard principal del usuario: resume saldo, ingresos/gastos del mes y últimas transacciones.

// ── Iconos SVG inline (sin dependencias externas, se colorean con currentColor) ───────────

function IconWallet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h2"/>
    </svg>
  );
}
function IconTrend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  );
}
function IconDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
    </svg>
  );
}
function IconBalance() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}
function IconBank() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="11" rx="2"/><path d="M3 9l9-6 9 6"/>
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Devuelve el saludo apropiado según la hora del día.
function saludar() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function mesActual() {
  return new Date().toLocaleString("es-ES", { month: "long", year: "numeric" });
}

// Formatea un número como importe en euros con el formato español (1.234,56).
function formatEur(n) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Traduce los códigos de categoría que devuelve el backend a etiquetas legibles.
const CAT_LABEL = {
  SALARIO: "Salario", ALIMENTACION: "Alimentación", VIVIENDA: "Vivienda",
  TRANSPORTE: "Transporte", SALUD: "Salud", OCIO: "Ocio",
  EDUCACION: "Educación", OTROS: "Otros", INGRESO: "Ingreso", GASTO: "Gasto",
};

// ── Componente principal ───────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();

  const [wallet,    setWallet]    = useState(null);
  const [txns,      setTxns]      = useState([]);
  const [bankOk,    setBankOk]    = useState(false);
  const [loading,   setLoading]   = useState(true);

  // Carga los datos de tres microservicios a la vez. allSettled: si uno falla, los demás siguen.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Wallet, transacciones y estado bancario en paralelo para que el dashboard cargue rápido.
      const [w, t, b] = await Promise.allSettled([
        api.get("/wallet/me"),
        listTransacciones(),
        api.get("/bank/status"),
      ]);
      if (w.status === "fulfilled") setWallet(w.value);
      if (t.status === "fulfilled") setTxns(Array.isArray(t.value) ? t.value : []);
      if (b.status === "fulfilled" && b.value?.status === "LINKED") setBankOk(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]); // Cargamos al montar la pantalla.

  // useMemo: recalcula los totales del mes solo cuando cambian las transacciones (evita recalcular en cada render).
  const { ingresosMes, gastosMes, balanceMes, ultimas5 } = useMemo(() => {
    const now   = new Date();
    const mes   = now.getMonth();
    const anio  = now.getFullYear();

    const esMes = (t) => {
      const d = new Date(t.fecha);
      return d.getMonth() === mes && d.getFullYear() === anio;
    };

    const delMes = txns.filter(esMes);
    const ing  = delMes.filter(t => t.tipo === "INGRESO").reduce((s, t) => s + (t.cantidad ?? 0), 0);
    const gas  = delMes.filter(t => t.tipo === "GASTO").reduce((s, t) => s + (t.cantidad ?? 0), 0);

    const sorted = [...txns].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return {
      ingresosMes:  ing,
      gastosMes:    gas,
      balanceMes:   ing - gas,
      ultimas5:     sorted.slice(0, 5),
    };
  }, [txns]);

  // Nombre a mostrar y sus iniciales para el avatar (p. ej. "Iker Martínez" → "IM").
  const nombre   = user?.fullName || user?.username || "Usuario";
  const iniciales = nombre.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className={style.page}>

      {/* ── Encabezado personal ───────────────────────────────────────── */}
      <div className={style.heroRow}>
        <div className={style.heroTexto}>
          <span className={style.saludo}>{saludar()},</span>
          <h1 className={style.nombre}>{nombre}</h1>
          <span className={style.fecha}>{mesActual()}</span>
        </div>
        <div className={style.heroAvatar}>{iniciales}</div>
      </div>

      {/* ── Tarjetas de resumen ───────────────────────────────────────── */}
      <div className={style.statsGrid}>

        <div className={`${style.statCard} ${style.statWallet}`}>
          <div className={style.statIcon}><IconWallet /></div>
          <div className={style.statInfo}>
            <span className={style.statLabel}>Saldo Wallet</span>
            <span className={style.statValue}>
              {loading ? "—" : `€ ${formatEur(wallet?.balance ?? 0)}`}
            </span>
          </div>
        </div>

        <div className={`${style.statCard} ${style.statIngreso}`}>
          <div className={style.statIcon}><IconTrend /></div>
          <div className={style.statInfo}>
            <span className={style.statLabel}>Ingresos este mes</span>
            <span className={style.statValue}>
              {loading ? "—" : `€ ${formatEur(ingresosMes)}`}
            </span>
          </div>
        </div>

        <div className={`${style.statCard} ${style.statGasto}`}>
          <div className={style.statIcon}><IconDown /></div>
          <div className={style.statInfo}>
            <span className={style.statLabel}>Gastos este mes</span>
            <span className={style.statValue}>
              {loading ? "—" : `€ ${formatEur(gastosMes)}`}
            </span>
          </div>
        </div>

        <div className={`${style.statCard} ${style.statBalance}`}>
          <div className={style.statIcon}><IconBalance /></div>
          <div className={style.statInfo}>
            <span className={style.statLabel}>Balance mensual</span>
            <span className={`${style.statValue} ${balanceMes >= 0 ? style.positivo : style.negativo}`}>
              {loading ? "—" : `${balanceMes >= 0 ? "+" : ""}€ ${formatEur(balanceMes)}`}
            </span>
          </div>
        </div>

      </div>

      {/* ── Barra de progreso gastos/ingresos ────────────────────────── */}
      {!loading && (ingresosMes > 0 || gastosMes > 0) && (
        <div className={style.progressCard}>
          <div className={style.progressHeader}>
            <span className={style.progressLabel}>Distribución mensual</span>
            <span className={style.progressPct}>
              {ingresosMes > 0
                ? `${Math.round((gastosMes / ingresosMes) * 100)}% gastado`
                : "Sin ingresos este mes"}
            </span>
          </div>
          <div className={style.progressBar}>
            <div
              className={style.progressFill}
              style={{ width: `${Math.min(100, ingresosMes > 0 ? (gastosMes / ingresosMes) * 100 : 0)}%` }}
            />
          </div>
          <div className={style.progressLegend}>
            <span className={style.legendIng}>● Ingresos: €{formatEur(ingresosMes)}</span>
            <span className={style.legendGas}>● Gastos: €{formatEur(gastosMes)}</span>
          </div>
        </div>
      )}

      {/* ── Accesos rápidos ───────────────────────────────────────────── */}
      <div className={style.accionesSection}>
        <h2 className={style.sectionTitle}>Accesos rápidos</h2>
        <div className={style.accionesGrid}>
          <Link to="/transacciones" className={style.accionCard}>
            <div className={style.accionIcon} style={{ background: "rgba(8,145,178,0.1)", color: "#0891b2" }}>
              <IconPlus />
            </div>
            <span className={style.accionLabel}>Nueva transacción</span>
          </Link>
          <Link to="/wallet" className={style.accionCard}>
            <div className={style.accionIcon} style={{ background: "rgba(59,219,121,0.1)", color: "#059669" }}>
              <IconSend />
            </div>
            <span className={style.accionLabel}>Enviar dinero</span>
          </Link>
          <Link to="/banco" className={style.accionCard}>
            <div className={style.accionIcon} style={{ background: bankOk ? "rgba(59,219,121,0.1)" : "rgba(249,115,22,0.1)", color: bankOk ? "#059669" : "#ea580c" }}>
              <IconBank />
            </div>
            <span className={style.accionLabel}>
              {bankOk ? "Banco vinculado ✓" : "Conectar banco"}
            </span>
          </Link>
          <Link to="/autonomos" className={style.accionCard}>
            <div className={style.accionIcon} style={{ background: "rgba(168,85,247,0.1)", color: "#7c3aed" }}>
              <IconDoc />
            </div>
            <span className={style.accionLabel}>Facturas</span>
          </Link>
        </div>
      </div>

      {/* ── Gráficas financieras ─────────────────────────────────────── */}
      {!loading && txns.length > 0 && (
        <div className={style.chartsGrid}>
          <FinancialChart transacciones={txns} />
          <CategoryChart  transacciones={txns} />
        </div>
      )}

      {/* ── Últimas transacciones ─────────────────────────────────────── */}
      <div className={style.txnSection}>
        <div className={style.txnHeader}>
          <h2 className={style.sectionTitle}>Últimas transacciones</h2>
          <Link to="/transacciones" className={style.verTodas}>Ver todas</Link>
        </div>

        {loading && <p className={style.cargando}>Cargando...</p>}

        {!loading && ultimas5.length === 0 && (
          <div className={style.empty}>
            <p className={style.emptyText}>No hay transacciones aún.</p>
            <Link to="/transacciones" className={style.emptyBtn}>Añadir primera transacción</Link>
          </div>
        )}

        <div className={style.txnList}>
          {ultimas5.map((t) => {
            const esIngreso = t.tipo === "INGRESO";
            return (
              <div key={t.id} className={style.txnItem}>
                <div className={`${style.txnDot} ${esIngreso ? style.dotIngreso : style.dotGasto}`} />
                <div className={style.txnInfo}>
                  <span className={style.txnDesc}>{t.descripcion}</span>
                  <span className={style.txnMeta}>
                    {CAT_LABEL[t.categoria] || t.categoria} · {t.fecha}
                  </span>
                </div>
                <span className={`${style.txnAmount} ${esIngreso ? style.positivo : style.negativo}`}>
                  {esIngreso ? "+" : "-"}€{formatEur(t.cantidad ?? 0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
