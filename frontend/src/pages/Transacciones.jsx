import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSearch, faTimes, faFilePdf, faTrash } from "@fortawesome/free-solid-svg-icons";
import style from "../styles/Transacciones.module.css";
import Toggle from "../components/Toggle";
import { listTransacciones, addTransaccion, deleteTransaccion } from "../config/transactionsStore";
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

const CAT_ICONS = {
  SALARIO: "💼", ALIMENTACION: "🛒", VIVIENDA: "🏠", TRANSPORTE: "🚗",
  SALUD: "❤️", OCIO: "🎮", EDUCACION: "📚", OTROS: "💡",
};

function Transacciones() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [transacciones, setTransacciones]         = useState([]);
  const [errores, setErrores]                     = useState({});
  const [cargando, setCargando]                   = useState(false);
  const [busqueda, setBusqueda]                   = useState("");
  const [filtroTipo, setFiltroTipo]               = useState("todos");
  const [descargandoPdf, setDescargandoPdf]       = useState(false);

  const [nuevaTransaccion, setNuevaTransaccion] = useState({
    concepto: "", fecha: "", monto: "", tipo: "gasto", categoria: "OTROS",
  });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevaTransaccion((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores((prev) => { const e = { ...prev }; delete e[name]; return e; });
  };

  const validarFormulario = () => {
    const err = {};
    if (!nuevaTransaccion.concepto.trim() || nuevaTransaccion.concepto.trim().length < 3) err.concepto = "Mínimo 3 caracteres";
    if (!nuevaTransaccion.fecha) err.fecha = "La fecha es obligatoria";
    if (!nuevaTransaccion.monto || isNaN(parseFloat(nuevaTransaccion.monto)) || parseFloat(nuevaTransaccion.monto) <= 0)
      err.monto = "Introduce un monto válido";
    setErrores(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;
    setCargando(true);
    try {
      await addTransaccion(null, {
        tipo:        nuevaTransaccion.tipo.toUpperCase(),
        categoria:   nuevaTransaccion.categoria,
        descripcion: nuevaTransaccion.concepto.trim(),
        cantidad:    Math.abs(parseFloat(nuevaTransaccion.monto)),
        fecha:       nuevaTransaccion.fecha,
      });
      setNuevaTransaccion({ concepto: "", fecha: "", monto: "", tipo: "gasto", categoria: "OTROS" });
      setMostrarFormulario(false);
      setErrores({});
      await cargarTransacciones();
    } catch (error) {
      setErrores({ general: `Error al guardar: ${error.message}` });
    } finally {
      setCargando(false);
    }
  };

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

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setNuevaTransaccion({ concepto: "", fecha: "", monto: "", tipo: "gasto", categoria: "OTROS" });
    setErrores({});
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
            <Toggle />
            <button className={style.btnPdf} onClick={handleDescargarPdf} disabled={descargandoPdf}
              title="Descargar informe PDF del mes actual">
              <FontAwesomeIcon icon={faFilePdf} />
              {descargandoPdf ? "Generando..." : "PDF"}
            </button>
            <button className={style.btnNueva} onClick={() => setMostrarFormulario(true)}>
              <FontAwesomeIcon icon={faPlus} />
              Nueva
            </button>
          </div>
        </div>

        {/* Totales */}
        <div className={style.totalesGrid}>
          <div className={`${style.totalCard} ${style.totalGasto}`}>
            <span className={style.totalLabel}>Gastos</span>
            <span className={style.totalMonto}>-€{gastos.toFixed(2)}</span>
          </div>
          <div className={`${style.totalCard} ${style.totalIngreso}`}>
            <span className={style.totalLabel}>Ingresos</span>
            <span className={style.totalMonto}>+€{ingresos.toFixed(2)}</span>
          </div>
          <div className={`${style.totalCard} ${balance >= 0 ? style.totalPositivo : style.totalNegativo}`}>
            <span className={style.totalLabel}>Balance</span>
            <span className={style.totalMonto}>{balance >= 0 ? "+" : ""}€{balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Buscador y filtros */}
        {!mostrarFormulario && (
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
        )}

        {/* Lista de transacciones */}
        {!mostrarFormulario && (
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
                    {CAT_ICONS[t.categoria] || "💡"}
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
        )}

        {/* Formulario nueva transacción */}
        {mostrarFormulario && (
          <div className={style.formWrapper}>
            {errores.general && (
              <div className={style.errorGeneral} role="alert">{errores.general}</div>
            )}

            <form onSubmit={handleSubmit} className={style.form}>
              <div className={style.formGroup}>
                <label className={style.formLabel}>Tipo</label>
                <div className={style.tipoSelector}>
                  <button type="button"
                    className={`${style.tipoBtn} ${nuevaTransaccion.tipo === "gasto" ? style.tipoBtnGastoActivo : ""}`}
                    onClick={() => setNuevaTransaccion((p) => ({ ...p, tipo: "gasto" }))}>
                    Gasto
                  </button>
                  <button type="button"
                    className={`${style.tipoBtn} ${nuevaTransaccion.tipo === "ingreso" ? style.tipoBtnIngresoActivo : ""}`}
                    onClick={() => setNuevaTransaccion((p) => ({ ...p, tipo: "ingreso" }))}>
                    Ingreso
                  </button>
                </div>
              </div>

              <div className={style.formGroup}>
                <label className={style.formLabel} htmlFor="categoria">Categoría</label>
                <select id="categoria" name="categoria" value={nuevaTransaccion.categoria}
                  onChange={handleChange} disabled={cargando} className={style.select}>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{CAT_ICONS[c]} {CAT_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              <div className={style.formGroup}>
                <label className={style.formLabel} htmlFor="concepto">Concepto</label>
                <input type="text" id="concepto" name="concepto" className={style.input}
                  value={nuevaTransaccion.concepto} onChange={handleChange}
                  placeholder="Ej: Supermercado, Nómina..." disabled={cargando} />
                {errores.concepto && <p className={style.error}>{errores.concepto}</p>}
              </div>

              <div className={style.formRow}>
                <div className={style.formGroup}>
                  <label className={style.formLabel} htmlFor="monto">Monto (€)</label>
                  <input type="number" id="monto" name="monto" className={style.input}
                    value={nuevaTransaccion.monto} onChange={handleChange}
                    placeholder="0.00" step="0.01" min="0" disabled={cargando} />
                  {errores.monto && <p className={style.error}>{errores.monto}</p>}
                </div>

                <div className={style.formGroup}>
                  <label className={style.formLabel} htmlFor="fecha">Fecha</label>
                  <input type="date" id="fecha" name="fecha" className={style.input}
                    value={nuevaTransaccion.fecha} onChange={handleChange} disabled={cargando} />
                  {errores.fecha && <p className={style.error}>{errores.fecha}</p>}
                </div>
              </div>

              <div className={style.formBotones}>
                <button type="button" className={style.btnCancelar} onClick={cerrarFormulario} disabled={cargando}>
                  Cancelar
                </button>
                <button type="submit" className={style.btnGuardar} disabled={cargando} aria-busy={cargando}>
                  {cargando ? "Guardando..." : "Guardar transacción"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transacciones;
