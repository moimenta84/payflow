import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import style from "../styles/Home.module.css";
import {
  listTransacciones,
  addTransaccion,
  updateTransaccion,
  deleteTransaccion,
} from "../config/transactionsStore";
import "../index.css";

function Home() {
  const { user } = useAuth();

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState("todos");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [transaccionSeleccionada, setTransaccionSeleccionada] = useState(null);

  const [mostrarModalResumen, setMostrarModalResumen] = useState(false);
  const [tipoModalResumen, setTipoModalResumen] = useState(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 5;

  const [modoEdicion, setModoEdicion] = useState(false);
  const [transaccionEditando, setTransaccionEditando] = useState(null);

  const [nuevaTransaccion, setNuevaTransaccion] = useState({
    concepto: "", fecha: "", monto: "", tipo: "gasto", categoria: "OTROS",
  });

  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [transacciones, setTransacciones] = useState([]);

  const usuario = {
    nombre: user?.fullName || "Usuario",
    saldoInicial: user?.saldoInicial || 0,
  };

  const cargarTransacciones = useCallback(async () => {
    if (!user) return;
    try {
      setCargando(true);
      const data = await listTransacciones();
      const mapped = data.map((t) => ({
        id:             t.id,
        concepto:       t.descripcion,
        fecha:          new Date(t.fecha).toLocaleDateString("es-ES", {
                          day: "numeric", month: "short", year: "numeric",
                        }),
        fechaOriginal:  t.fecha,
        fechaTimestamp: new Date(t.fecha).getTime(),
        monto:          t.tipo === "GASTO" ? -Math.abs(t.cantidad) : t.cantidad,
        tipo:           t.tipo.toLowerCase(),
        categoria:      t.categoria,
      }));
      mapped.sort((a, b) => b.fechaTimestamp - a.fechaTimestamp);
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

  const gastos = useMemo(
    () => transacciones.filter((t) => t.tipo === "gasto").reduce((sum, t) => sum + Math.abs(t.monto), 0),
    [transacciones],
  );

  const ingresos = useMemo(
    () => transacciones.filter((t) => t.tipo === "ingreso").reduce((sum, t) => sum + t.monto, 0),
    [transacciones],
  );

  const saldoDisponible = useMemo(
    () => usuario.saldoInicial + ingresos - gastos,
    [usuario.saldoInicial, ingresos, gastos],
  );

  const { porcentajeGastos, porcentajeIngresos } = useMemo(() => {
    const total = gastos + ingresos;
    return {
      porcentajeGastos: total > 0 ? (gastos / total) * 100 : 0,
      porcentajeIngresos: total > 0 ? (ingresos / total) * 100 : 0,
    };
  }, [gastos, ingresos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (modoEdicion) {
      setTransaccionEditando((prev) => ({ ...prev, [name]: value }));
    } else {
      setNuevaTransaccion((prev) => ({ ...prev, [name]: value }));
    }
    if (errores[name]) {
      setErrores((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};
    const transaccion = modoEdicion ? transaccionEditando : nuevaTransaccion;
    if (!transaccion.concepto.trim()) nuevosErrores.concepto = "El concepto es obligatorio";
    else if (transaccion.concepto.trim().length < 3) nuevosErrores.concepto = "Mínimo 3 caracteres";
    if (!transaccion.fecha) nuevosErrores.fecha = "La fecha es obligatoria";
    if (!transaccion.monto) nuevosErrores.monto = "El monto es obligatorio";
    else if (isNaN(parseFloat(transaccion.monto)) || parseFloat(transaccion.monto) <= 0)
      nuevosErrores.monto = "El monto debe ser un número positivo";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { setErrores({ general: "Debes iniciar sesión" }); return; }
    if (validarFormulario()) {
      setCargando(true);
      try {
        if (modoEdicion) {
          await updateTransaccion(null, transaccionEditando.id, {
            tipo:        transaccionEditando.tipo.toUpperCase(),
            categoria:   transaccionEditando.categoria,
            descripcion: transaccionEditando.concepto.trim(),
            cantidad:    Math.abs(parseFloat(transaccionEditando.monto)),
            fecha:       transaccionEditando.fecha,
          });
          setModoEdicion(false);
          setTransaccionEditando(null);
        } else {
          await addTransaccion(null, {
            tipo:        nuevaTransaccion.tipo.toUpperCase(),
            categoria:   nuevaTransaccion.categoria,
            descripcion: nuevaTransaccion.concepto.trim(),
            cantidad:    Math.abs(parseFloat(nuevaTransaccion.monto)),
            fecha:       nuevaTransaccion.fecha,
          });
          setNuevaTransaccion({ concepto: "", fecha: "", monto: "", tipo: "gasto", categoria: "OTROS" });
        }
        setMostrarFormulario(false);
        setErrores({});
        await cargarTransacciones();
      } catch (error) {
        setErrores({ general: `Error al guardar: ${error.message}` });
      } finally {
        setCargando(false);
      }
    }
  };

  const handleEliminar = async (transaccion, event) => {
    event?.stopPropagation();
    if (!window.confirm(`¿Eliminar "${transaccion.concepto}"?`)) return;
    try {
      setCargando(true);
      await deleteTransaccion(null, transaccion.id);
      await cargarTransacciones();
      if (mostrarModal && transaccionSeleccionada?.id === transaccion.id) cerrarModal();
      if (mostrarModalResumen) cerrarModalResumen();
    } catch {
      alert("Error al eliminar la transacción.");
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = (transaccion, event) => {
    event?.stopPropagation();
    setTransaccionEditando({
      id:        transaccion.id,
      concepto:  transaccion.concepto,
      fecha:     transaccion.fechaOriginal,
      monto:     Math.abs(transaccion.monto).toString(),
      tipo:      transaccion.tipo,
      categoria: transaccion.categoria || "OTROS",
    });
    setModoEdicion(true);
    setMostrarFormulario(true);
    if (mostrarModal) cerrarModal();
    if (mostrarModalResumen) cerrarModalResumen();
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setTransaccionEditando(null);
    setMostrarFormulario(false);
    setNuevaTransaccion({ concepto: "", fecha: "", monto: "", tipo: "gasto", categoria: "OTROS" });
    setErrores({});
  };

  const abrirModal = (transaccion) => {
    setTransaccionSeleccionada(transaccion);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setTransaccionSeleccionada(null);
  };

  const abrirModalResumen = (tipo) => {
    setTipoModalResumen(tipo);
    setPaginaActual(1);
    setMostrarModalResumen(true);
  };

  const cerrarModalResumen = () => {
    setMostrarModalResumen(false);
    setTipoModalResumen(null);
    setPaginaActual(1);
  };

  const obtenerTransaccionesFiltradas = () =>
    transacciones.filter((t) => t.tipo === tipoModalResumen)
      .sort((a, b) => b.fechaTimestamp - a.fechaTimestamp);

  const obtenerTransaccionesPaginadas = () => {
    const filtradas = obtenerTransaccionesFiltradas();
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return filtradas.slice(inicio, inicio + ITEMS_POR_PAGINA);
  };

  const totalPaginas = Math.ceil(obtenerTransaccionesFiltradas().length / ITEMS_POR_PAGINA);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (mostrarModal) cerrarModal();
        if (mostrarModalResumen) cerrarModalResumen();
        if (mostrarFormulario && modoEdicion) cancelarEdicion();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [mostrarModal, mostrarModalResumen, mostrarFormulario, modoEdicion]);

  const obtenerTransaccionesMostrar = () =>
    transacciones
      .filter((t) => filtroActivo === "todos" || t.tipo === filtroActivo)
      .sort((a, b) => b.fechaTimestamp - a.fechaTimestamp)
      .slice(0, 5);

  return (
    <div className={style.home}>
      <div className={style.contenedorHome}>

        {/* BIENVENIDA */}
        <div className={style.bienvenidaTotal}>
          <div className={style.bienvenida}>
            <h1>Hola, {usuario.nombre.split(" ")[0]}</h1>
          </div>
          <div className={style.saldoCard}>
            <p className={style.saldoLabel}>Saldo Disponible</p>
            <h2 className={style.saldoMonto}>{saldoDisponible.toFixed(2)} €</h2>
          </div>
        </div>

        {/* CUERPO */}
        <div className={style.cuerpo}>
          {/* Gráfico de Aro */}
          <div className={style.graficoContainer}>
            <svg className={style.graficoAro} viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="20" />
              <circle
                cx="100" cy="100" r="80" fill="none"
                stroke="#ef4444" strokeWidth="20"
                strokeDasharray={`${porcentajeGastos * 5.03} ${100 * 5.03}`}
                strokeDashoffset="0"
                transform="rotate(-90 100 100)"
              />
              <circle
                cx="100" cy="100" r="80" fill="none"
                stroke="#0891b2" strokeWidth="20"
                strokeDasharray={`${porcentajeIngresos * 5.03} ${100 * 5.03}`}
                strokeDashoffset={`-${porcentajeGastos * 5.03}`}
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div className={style.graficoCenter}>
              <p className={style.graficoCenterLabel}>Balance</p>
              <p className={style.graficoCenterMonto}>
                {(ingresos - gastos).toFixed(2)} €
              </p>
            </div>
          </div>

          {/* Resumen */}
          <div className={style.resumenContainer}>
            <div
              className={`${style.resumenItem} ${style.gastos}`}
              onClick={() => abrirModalResumen("gasto")}
            >
              <div className={style.resumenIcono} style={{ backgroundColor: "#fef2f2" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </div>
              <div className={style.resumenInfo}>
                <p className={style.resumenLabelGastos}>Gastos</p>
                <p className={style.resumenMonto} style={{ color: "#ef4444" }}>
                  {gastos.toFixed(2)} €
                </p>
              </div>
            </div>

            <div
              className={`${style.resumenItem} ${style.ingresos}`}
              onClick={() => abrirModalResumen("ingreso")}
            >
              <div className={style.resumenIcono} style={{ backgroundColor: "#e0f2fe" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </div>
              <div className={style.resumenInfo}>
                <p className={style.resumenLabelIngresos}>Ingresos</p>
                <p className={style.resumenMonto} style={{ color: "#0891b2" }}>
                  {ingresos.toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* HISTORIAL */}
        <div className={style.historial}>
          <div className={style.historialHeader}>
            <h2 className={style.historialTitulo}>Últimas Transacciones</h2>
          </div>

          {!mostrarFormulario && (
            <button
              className={style.fabButton}
              onClick={() => setMostrarFormulario(true)}
              aria-label="Nueva transacción"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          )}

          {!mostrarFormulario && (
            <>
              <div className={style.historialBadges}>
                {[
                  { key: "todos", label: "Todos", cls: style.badgeTodos },
                  { key: "gasto", label: "Gastos", cls: style.badgeGastos },
                  { key: "ingreso", label: "Ingresos", cls: style.badgeIngresos },
                ].map(({ key, label, cls }) => (
                  <button
                    key={key}
                    className={`${style.badge} ${cls} ${filtroActivo === key ? style.badgeActivo : ""}`}
                    onClick={() => setFiltroActivo(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className={style.transaccionesList}>
                {cargando ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                    <p>Cargando transacciones...</p>
                  </div>
                ) : obtenerTransaccionesMostrar().length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                    <p>No hay transacciones para mostrar.</p>
                    <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
                      Agrega tu primera transacción usando el botón +
                    </p>
                  </div>
                ) : (
                  obtenerTransaccionesMostrar().map((transaccion) => (
                    <div
                      key={transaccion.id}
                      className={`${style.transaccionItem} ${style[transaccion.tipo]}`}
                      onClick={() => abrirModal(transaccion)}
                    >
                      <div className={style.transaccionIcono}>
                        {transaccion.tipo === "gasto" ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <path d="M12 5v14M5 12l7 7 7-7" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2">
                            <path d="M12 19V5M5 12l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                      <div className={style.transaccionInfo}>
                        <p className={style.transaccionConcepto}>{transaccion.concepto}</p>
                        <p className={style.transaccionFecha}>{transaccion.fecha}</p>
                      </div>
                      <p
                        className={style.transaccionMonto}
                        style={{ color: transaccion.tipo === "gasto" ? "#ef4444" : "#0891b2" }}
                      >
                        {transaccion.monto > 0 ? "+" : ""}
                        {transaccion.monto.toFixed(2)} €
                      </p>
                      <div className={style.transaccionAcciones}>
                        <button
                          className={style.botonEditar}
                          onClick={(e) => handleEditar(transaccion, e)}
                          aria-label="Editar"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          className={style.botonEliminar}
                          onClick={(e) => handleEliminar(transaccion, e)}
                          aria-label="Eliminar"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* FORMULARIO */}
          {mostrarFormulario && (
            <div className={style.formularioContainer}>
              {errores.general && (
                <div className={style.errorGeneral} role="alert">{errores.general}</div>
              )}

              <form onSubmit={handleSubmit} className={style.formulario}>
                <div className={style.formGroup}>
                  <label>Tipo de transacción</label>
                  <div className={style.botonesGrupo}>
                    {["gasto", "ingreso"].map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        className={`${style.botonTipo} ${style[`boton${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`]} ${
                          (modoEdicion ? transaccionEditando?.tipo : nuevaTransaccion.tipo) === tipo
                            ? style.botonActivo
                            : ""
                        }`}
                        onClick={() => {
                          if (modoEdicion) setTransaccionEditando(p => ({ ...p, tipo }));
                          else setNuevaTransaccion(p => ({ ...p, tipo }));
                        }}
                      >
                        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={style.formGroup}>
                  <label htmlFor="concepto">Concepto</label>
                  <input
                    type="text" id="concepto" name="concepto"
                    value={modoEdicion ? transaccionEditando?.concepto || "" : nuevaTransaccion.concepto}
                    onChange={handleChange}
                    placeholder="Ej: Supermercado"
                    disabled={cargando}
                  />
                  {errores.concepto && <p className={style.error}>{errores.concepto}</p>}
                </div>

                <div className={style.formGroup}>
                  <label htmlFor="categoria">Categoría</label>
                  <select
                    id="categoria" name="categoria"
                    value={modoEdicion ? transaccionEditando?.categoria || "OTROS" : nuevaTransaccion.categoria}
                    onChange={handleChange} disabled={cargando}
                  >
                    <option value="SALARIO">Salario</option>
                    <option value="ALIMENTACION">Alimentación</option>
                    <option value="VIVIENDA">Vivienda</option>
                    <option value="TRANSPORTE">Transporte</option>
                    <option value="SALUD">Salud</option>
                    <option value="OCIO">Ocio</option>
                    <option value="EDUCACION">Educación</option>
                    <option value="OTROS">Otros</option>
                  </select>
                </div>

                <div className={style.formGroup}>
                  <label htmlFor="fecha">Fecha</label>
                  <input
                    type="date" id="fecha" name="fecha"
                    value={modoEdicion ? transaccionEditando?.fecha || "" : nuevaTransaccion.fecha}
                    onChange={handleChange} disabled={cargando}
                  />
                  {errores.fecha && <p className={style.error}>{errores.fecha}</p>}
                </div>

                <div className={style.formGroup}>
                  <label htmlFor="monto">Monto (€)</label>
                  <input
                    type="number" id="monto" name="monto"
                    value={modoEdicion ? transaccionEditando?.monto || "" : nuevaTransaccion.monto}
                    onChange={handleChange}
                    placeholder="0.00" step="0.01" min="0"
                    disabled={cargando}
                  />
                  {errores.monto && <p className={style.error}>{errores.monto}</p>}
                </div>

                <div className={style.formularioBotones}>
                  <button type="button" className={style.botonCancelar} onClick={cancelarEdicion} disabled={cargando}>
                    Cancelar
                  </button>
                  <button type="submit" className={style.botonGuardar} disabled={cargando} aria-busy={cargando}>
                    {cargando
                      ? modoEdicion ? "Actualizando..." : "Guardando..."
                      : modoEdicion ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETALLES */}
      {mostrarModal && transaccionSeleccionada && (
        <div className={style.modalOverlay} onClick={cerrarModal}>
          <div className={style.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={style.modalHeader}>
              <h3 className={style.modalTitulo}>Detalles de Transacción</h3>
              <button className={style.modalCloseButton} onClick={cerrarModal} aria-label="Cerrar">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className={style.modalBody}>
              <div className={style.modalDetalleItem}>
                <span className={style.modalDetalleLabel}>Tipo:</span>
                <span className={style.modalDetalleValor}
                  style={{ color: transaccionSeleccionada.tipo === "gasto" ? "#ef4444" : "#0891b2", fontWeight: 700 }}>
                  {transaccionSeleccionada.tipo === "gasto" ? "Gasto" : "Ingreso"}
                </span>
              </div>
              <div className={style.modalDetalleItem}>
                <span className={style.modalDetalleLabel}>Concepto:</span>
                <span className={style.modalDetalleValor}>{transaccionSeleccionada.concepto}</span>
              </div>
              <div className={style.modalDetalleItem}>
                <span className={style.modalDetalleLabel}>Fecha:</span>
                <span className={style.modalDetalleValor}>{transaccionSeleccionada.fecha}</span>
              </div>
              <div className={style.modalDetalleItem}>
                <span className={style.modalDetalleLabel}>Monto:</span>
                <span className={style.modalDetalleValor}
                  style={{
                    color: transaccionSeleccionada.tipo === "gasto" ? "#ef4444" : "#0891b2",
                    fontSize: "1.5rem", fontWeight: 800,
                  }}>
                  {transaccionSeleccionada.monto > 0 ? "+" : ""}
                  {Math.abs(transaccionSeleccionada.monto).toFixed(2)} €
                </span>
              </div>
              <div className={style.modalAcciones}>
                <button className={style.modalBotonEditar}
                  onClick={() => { cerrarModal(); handleEditar(transaccionSeleccionada); }}>
                  <FontAwesomeIcon icon={faEdit} /> Editar
                </button>
                <button className={style.modalBotonEliminar}
                  onClick={() => handleEliminar(transaccionSeleccionada)}>
                  <FontAwesomeIcon icon={faTrash} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESUMEN */}
      {mostrarModalResumen && tipoModalResumen && (
        <div className={style.modalOverlay} onClick={cerrarModalResumen}>
          <div className={`${style.modalContent} ${style.modalResumen}`} onClick={(e) => e.stopPropagation()}>
            <div className={style.modalHeader}>
              <h3 className={style.modalTitulo}>
                {tipoModalResumen === "gasto" ? "Gastos" : "Ingresos"}
              </h3>
              <button className={style.modalCloseButton} onClick={cerrarModalResumen} aria-label="Cerrar">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className={style.modalBody}>
              {obtenerTransaccionesFiltradas().length === 0 ? (
                <div className={style.modalEmpty}>
                  <p>No hay {tipoModalResumen === "gasto" ? "gastos" : "ingresos"} registrados.</p>
                </div>
              ) : (
                <>
                  <div className={style.transaccionesResumenList}>
                    {obtenerTransaccionesPaginadas().map((transaccion) => (
                      <div
                        key={transaccion.id}
                        className={style.transaccionResumenItem}
                        onClick={() => { cerrarModalResumen(); abrirModal(transaccion); }}
                      >
                        <div className={style.transaccionResumenIcono}
                          style={{
                            backgroundColor: tipoModalResumen === "gasto" ? "#fef2f2" : "#e0f2fe",
                            border: `1px solid ${tipoModalResumen === "gasto" ? "#fecaca" : "#bae6fd"}`,
                          }}>
                          {tipoModalResumen === "gasto" ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                              <path d="M12 5v14M5 12l7 7 7-7" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2">
                              <path d="M12 19V5M5 12l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                        <div className={style.transaccionResumenInfo}>
                          <span className={style.transaccionResumenConcepto}>{transaccion.concepto}</span>
                          <span className={style.transaccionResumenFecha}>{transaccion.fecha}</span>
                          <span className={style.transaccionResumenMonto}
                            style={{ color: tipoModalResumen === "gasto" ? "#ef4444" : "#0891b2" }}>
                            {Math.abs(transaccion.monto).toFixed(2)} €
                          </span>
                          <div className={style.transaccionResumenAcciones}>
                            <button className={style.botonEditarResumen}
                              onClick={(e) => { e.stopPropagation(); cerrarModalResumen(); handleEditar(transaccion); }}
                              aria-label="Editar">
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button className={style.botonEliminarResumen}
                              onClick={(e) => handleEliminar(transaccion, e)}
                              aria-label="Eliminar">
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPaginas > 1 && (
                    <div className={style.paginacion}>
                      <button className={style.botonPaginacion}
                        onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                        disabled={paginaActual === 1} aria-label="Página anterior">
                        <FontAwesomeIcon icon={faChevronLeft} />
                      </button>
                      <span className={style.paginacionInfo}>
                        Página {paginaActual} de {totalPaginas}
                      </span>
                      <button className={style.botonPaginacion}
                        onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                        disabled={paginaActual === totalPaginas} aria-label="Página siguiente">
                        <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
