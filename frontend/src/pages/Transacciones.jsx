import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch, faTimes, faFilePdf, faTrash,
  faArrowDown, faArrowUp, faScaleBalanced,
  faBriefcase, faShoppingCart, faHome, faCar,
  faHeartPulse, faGamepad, faGraduationCap, faLightbulb,
} from "@fortawesome/free-solid-svg-icons";
import style from "../styles/Transacciones.module.css";
import { listTransacciones, deleteTransaccion } from "../config/transactionsStore";
import { useAuth } from "../context/AuthContext";
import "../index.css";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function descargarPdf(year, month) {
  const res = await fetch(
    `${API_BASE}/transactions/report/pdf?year=${year}&month=${month}`,
    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
  );
  if (!res.ok) throw new Error('No se pudo generar el PDF');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payflow-informe-${year}-${String(month).padStart(2, '0')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

const CATEGORIAS = ["SALARIO","ALIMENTACION","VIVIENDA","TRANSPORTE","SALUD","OCIO","EDUCACION","OTROS"];

const CAT_LABELS = {
  SALARIO: "Salario", ALIMENTACION: "Alimentación", VIVIENDA: "Vivienda",
  TRANSPORTE: "Transporte", SALUD: "Salud", OCIO: "Ocio",
  EDUCACION: "Educación", OTROS: "Otros",
};

const CAT_FA = {
  SALARIO: faBriefcase, ALIMENTACION: faShoppingCart, VIVIENDA: faHome,
  TRANSPORTE: faCar, SALUD: faHeartPulse, OCIO: faGamepad,
  EDUCACION: faGraduationCap, OTROS: faLightbulb,
};


function Transacciones() {
  const [transacciones, setTransacciones]   = useState([]);
  const [cargando, setCargando]             = useState(false);
  const [busqueda, setBusqueda]             = useState("");
  const [filtroTipo, setFiltroTipo]         = useState("todos");
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  const { user } = useAuth();

  const cargarTransacciones = useCallback(async () => {
    if (!user) return;
    try {
      setCargando(true);
      const data = await listTransacciones();
      const mapped = data.map((t) => ({
        id:        t.id,
        concepto:  t.descripcion,
        monto:     t.tipo === "GASTO" ? -Math.abs(t.cantidad) : t.cantidad,
        tipo:      t.tipo.toLowerCase(),
        fecha:     t.fecha,
        categoria: t.categoria,
      }));
      mapped.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setTransacciones(mapped);
    } catch (error) {
      console.error("Error cargando transacciones:", error);
    } finally {
      setCargando(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) cargarTransacciones();
    else setTransacciones([]);
  }, [user, cargarTransacciones]);

  const gastos   = transacciones.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Math.abs(t.monto), 0);
  const ingresos = transacciones.filter((t) => t.tipo === "ingreso").reduce((s, t) => s + t.monto, 0);
  const balance  = ingresos - gastos;

  const transaccionesFiltradas = transacciones.filter((t) => {
    const matchBusqueda = !busqueda || t.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
      CAT_LABELS[t.categoria]?.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === "todos" || t.tipo === filtroTipo;
    return matchBusqueda && matchTipo;
  });

  const handleDescargarPdf = async () => {
    const now = new Date();
    setDescargandoPdf(true);
    try {
      await descargarPdf(now.getFullYear(), now.getMonth() + 1);
    } catch (error) {
      alert('Error al generar el PDF: ' + error.message);
    } finally {
      setDescargandoPdf(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta transacción?')) return;
    try {
      await deleteTransaccion(null, id);
      await cargarTransacciones();
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  return (
    <div className={style.page}>
      <div className={style.container}>

        {/* Header */}
        <div className={style.pageHeader}>
          <div className={style.headerLeft}>
            <h1 className={style.pageTitle}>Transacciones</h1>
            <p className={style.pageSubtitle}>{transacciones.length} movimientos registrados</p>
          </div>
          <div className={style.headerRight}>
            <button className={style.btnPdf} onClick={handleDescargarPdf} disabled={descargandoPdf}
              title="Descargar informe PDF del mes actual">
              <FontAwesomeIcon icon={faFilePdf} />
              {descargandoPdf ? "Generando..." : "PDF"}
            </button>
          </div>
        </div>

        {/* Totales */}
        <div className={style.totalesGrid}>
          <div className={`${style.totalCard} ${style.totalGasto}`}>
            <div className={style.totalIcon}>
              <FontAwesomeIcon icon={faArrowUp} />
            </div>
            <div className={style.totalInfo}>
              <span className={style.totalLabel}>Gastos</span>
              <span className={style.totalMonto}>-€{gastos.toFixed(2)}</span>
            </div>
          </div>
          <div className={`${style.totalCard} ${style.totalIngreso}`}>
            <div className={style.totalIcon}>
              <FontAwesomeIcon icon={faArrowDown} />
            </div>
            <div className={style.totalInfo}>
              <span className={style.totalLabel}>Ingresos</span>
              <span className={style.totalMonto}>+€{ingresos.toFixed(2)}</span>
            </div>
          </div>
          <div className={`${style.totalCard} ${balance >= 0 ? style.totalPositivo : style.totalNegativo}`}>
            <div className={style.totalIcon}>
              <FontAwesomeIcon icon={faScaleBalanced} />
            </div>
            <div className={style.totalInfo}>
              <span className={style.totalLabel}>Balance</span>
              <span className={style.totalMonto}>{balance >= 0 ? "+" : ""}€{balance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Buscador y filtros */}
        <div className={style.filtros}>
          <div className={style.buscador}>
            <FontAwesomeIcon icon={faSearch} className={style.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por concepto o categoría..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={style.searchInput}
            />
            {busqueda && (
              <button className={style.clearSearch} onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
          <div className={style.tipoFiltros}>
            {["todos", "gasto", "ingreso"].map((t) => (
              <button
                key={t}
                className={`${style.filtroPill} ${filtroTipo === t ? style.filtroPillActivo : ""}`}
                onClick={() => setFiltroTipo(t)}
              >
                {t === "todos" ? "Todos" : t === "gasto" ? "Gastos" : "Ingresos"}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className={style.lista}>
          {cargando ? (
            <p className={style.estadoMensaje}>Cargando transacciones...</p>
          ) : transaccionesFiltradas.length === 0 ? (
            <p className={style.estadoMensaje}>
              {busqueda || filtroTipo !== "todos" ? "No hay resultados para tu búsqueda." : "No hay transacciones registradas."}
            </p>
          ) : (
            transaccionesFiltradas.map((t) => (
              <div key={t.id} className={`${style.transaccionItem} ${t.tipo === "gasto" ? style.itemGasto : style.itemIngreso}`}>
                <div className={style.itemIcono}>
                  <FontAwesomeIcon icon={CAT_FA[t.categoria] || faLightbulb}
                    style={{ color: t.tipo === 'gasto' ? '#ef4444' : '#0891b2', fontSize: '1rem' }} />
                </div>
                <div className={style.itemInfo}>
                  <span className={style.itemConcepto}>{t.concepto}</span>
                  <span className={style.itemMeta}>
                    <span className={`${style.catBadge} ${style[`cat${t.categoria}`]}`}>
                      {CAT_LABELS[t.categoria] || t.categoria}
                    </span>
                    <span className={style.itemFecha}>{t.fecha}</span>
                  </span>
                </div>
                <span className={`${style.itemMonto} ${t.tipo === "gasto" ? style.montoGasto : style.montoIngreso}`}>
                  {t.tipo === "gasto" ? "-" : "+"}€{Math.abs(t.monto).toFixed(2)}
                </span>
                <button className={style.btnEliminar} onClick={() => handleEliminar(t.id)}
                  title="Eliminar transacción" aria-label="Eliminar">
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default Transacciones;
