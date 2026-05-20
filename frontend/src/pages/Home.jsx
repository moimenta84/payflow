import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSignOutAlt,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import style from "../styles/Home.module.css";
import Toggle from "../components/Toggle";
import {
  listTransacciones,
  addTransaccion,
  updateTransaccion,
  deleteTransaccion,
} from "../config/transactionsStore";
import "../index.css";

function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState("todos");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [transaccionSeleccionada, setTransaccionSeleccionada] = useState(null);

  // Nuevo estado para modal de resumen
  const [mostrarModalResumen, setMostrarModalResumen] = useState(false);
  const [tipoModalResumen, setTipoModalResumen] = useState(null); // 'gasto' o 'ingreso'
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 5;

  // Estados para edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [transaccionEditando, setTransaccionEditando] = useState(null);

  // Estado para nueva transacción
  const [nuevaTransaccion, setNuevaTransaccion] = useState({
    concepto: "",
    fecha: "",
    monto: "",
    tipo: "gasto",
    categoria: "OTROS",
  });

  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);

  // Transacciones dinámicas
  const [transacciones, setTransacciones] = useState([]);

  // Usar datos del usuario autenticado
  const usuario = {
    nombre: user?.fullName || "Usuario",
    avatar: user?.iniciales || "👤",
    saldoInicial: user?.saldoInicial || 0,
  };

  // ✅ FUNCIÓN PARA CARGAR TRANSACCIONES DESDE FIREBASE (Optimizada con useCallback)
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

  // ✅ CARGAR TRANSACCIONES AL MONTAR EL COMPONENTE (con dependencias correctas)
  useEffect(() => {
    if (user) {
      console.log("🔄 Usuario detectado, cargando transacciones...");
      cargarTransacciones();
    } else {
      console.log("⚠️ No hay usuario, limpiando transacciones");
      setTransacciones([]);
    }
  }, [user, cargarTransacciones]);

  // Función para manejar el cierre de sesión
  const handleLogout = () => {
    if (window.confirm("¿Estás seguro de que deseas cerrar sesión?")) {
      logout();
      navigate("/login");
    }
  };

  // ✅ OPTIMIZACIÓN: Calcular gastos e ingresos con useMemo
  const gastos = useMemo(
    () =>
      transacciones
        .filter((t) => t.tipo === "gasto")
        .reduce((sum, t) => sum + Math.abs(t.monto), 0),
    [transacciones],
  );

  const ingresos = useMemo(
    () =>
      transacciones
        .filter((t) => t.tipo === "ingreso")
        .reduce((sum, t) => sum + t.monto, 0),
    [transacciones],
  );

  // ✅ CALCULAR SALDO DISPONIBLE DINÁMICAMENTE
  const saldoDisponible = useMemo(
    () => usuario.saldoInicial + ingresos - gastos,
    [usuario.saldoInicial, ingresos, gastos],
  );

  // ✅ OPTIMIZACIÓN: Calcular porcentajes con useMemo
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
      setTransaccionEditando((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setNuevaTransaccion((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errores[name]) {
      setErrores((prev) => {
        const nuevosErrores = { ...prev };
        delete nuevosErrores[name];
        return nuevosErrores;
      });
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};
    const transaccion = modoEdicion ? transaccionEditando : nuevaTransaccion;

    if (!transaccion.concepto.trim()) {
      nuevosErrores.concepto = "El concepto es obligatorio";
    } else if (transaccion.concepto.trim().length < 3) {
      nuevosErrores.concepto = "El concepto debe tener al menos 3 caracteres";
    }

    if (!transaccion.fecha) {
      nuevosErrores.fecha = "La fecha es obligatoria";
    }

    if (!transaccion.monto) {
      nuevosErrores.monto = "El monto es obligatorio";
    } else if (
      isNaN(parseFloat(transaccion.monto)) ||
      parseFloat(transaccion.monto) <= 0
    ) {
      nuevosErrores.monto = "El monto debe ser un número positivo";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // ✅ NUEVA FUNCIÓN: Guardar transacción EN FIREBASE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      console.error("❌ No hay usuario autenticado");
      setErrores({
        general: "Debes iniciar sesión para guardar transacciones",
      });
      return;
    }

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

  // ✅ NUEVA FUNCIÓN: Eliminar transacción
  const handleEliminar = async (transaccion, event) => {
    // Prevenir que se abra el modal cuando se hace click en eliminar
    event?.stopPropagation();

    const confirmar = window.confirm(
      `¿Estás seguro de que deseas eliminar la transacción "${transaccion.concepto}"?`,
    );

    if (!confirmar) return;

    try {
      setCargando(true);
      await deleteTransaccion(null, transaccion.id);
      await cargarTransacciones();

      // Si el modal estaba abierto con esta transacción, cerrarlo
      if (mostrarModal && transaccionSeleccionada?.id === transaccion.id) {
        cerrarModal();
      }
      if (mostrarModalResumen) {
        cerrarModalResumen();
      }
    } catch (error) {
      console.error("❌ Error eliminando transacción:", error);
      alert("Error al eliminar la transacción. Por favor intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  // ✅ NUEVA FUNCIÓN: Iniciar edición de transacción
  const handleEditar = (transaccion, event) => {
    // Prevenir que se abra el modal cuando se hace click en editar
    event?.stopPropagation();

    console.log("✏️ Editando transacción:", transaccion);

    // Convertir el monto a valor absoluto para mostrar en el formulario
    const montoAbsoluto = Math.abs(transaccion.monto);

    setTransaccionEditando({
      id:        transaccion.id,
      concepto:  transaccion.concepto,
      fecha:     transaccion.fechaOriginal,
      monto:     montoAbsoluto.toString(),
      tipo:      transaccion.tipo,
      categoria: transaccion.categoria || "OTROS",
    });

    setModoEdicion(true);
    setMostrarFormulario(true);

    // Cerrar modales si están abiertos
    if (mostrarModal) cerrarModal();
    if (mostrarModalResumen) cerrarModalResumen();
  };

  // Función para cancelar edición
  const cancelarEdicion = () => {
    setModoEdicion(false);
    setTransaccionEditando(null);
    setMostrarFormulario(false);
    setNuevaTransaccion({ concepto: "", fecha: "", monto: "", tipo: "gasto", categoria: "OTROS" });
    setErrores({});
  };

  // Función para abrir el modal con los detalles de la transacción
  const abrirModal = (transaccion) => {
    setTransaccionSeleccionada(transaccion);
    setMostrarModal(true);
  };

  // Función para cerrar el modal
  const cerrarModal = () => {
    setMostrarModal(false);
    setTransaccionSeleccionada(null);
  };

  // Funciones para modal de resumen
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

  // Obtener transacciones filtradas para el modal de resumen
  const obtenerTransaccionesFiltradas = () => {
    return transacciones
      .filter((t) => t.tipo === tipoModalResumen)
      .sort((a, b) => b.fechaTimestamp - a.fechaTimestamp);
  };

  // Obtener transacciones para la página actual
  const obtenerTransaccionesPaginadas = () => {
    const filtradas = obtenerTransaccionesFiltradas();
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    return filtradas.slice(inicio, fin);
  };

  // Calcular número total de páginas
  const totalPaginas = Math.ceil(
    obtenerTransaccionesFiltradas().length / ITEMS_POR_PAGINA,
  );

  // Cerrar modal al presionar ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (mostrarModal) {
          cerrarModal();
        }
        if (mostrarModalResumen) {
          cerrarModalResumen();
        }
        if (mostrarFormulario && modoEdicion) {
          cancelarEdicion();
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [mostrarModal, mostrarModalResumen, mostrarFormulario, modoEdicion]);

  // ✨ FUNCIÓN PARA OBTENER TRANSACCIONES FILTRADAS, ORDENADAS Y LIMITADAS
  const obtenerTransaccionesMostrar = () => {
    return (
      transacciones
        // 1. Filtrar por tipo
        .filter(
          (transaccion) =>
            filtroActivo === "todos" || transaccion.tipo === filtroActivo,
        )
        // 2. Ordenar por fecha más reciente primero
        .sort((a, b) => b.fechaTimestamp - a.fechaTimestamp)
        // 3. Limitar a las 5 más recientes
        .slice(0, 5)
    );
  };

  return (
    <div className={style.home}>
      <div className={style.contenedorHome}>
        {/* Botón de cambio de tema */}
        <Toggle />

        <div className={style.bienvenidaTotal}>
          {/* CABECERA */}
          <header className={style.header}>
            {/* Avatar Usuario */}
            <div className={style.avatarContainer}>
              <div className={style.avatar}>{usuario.avatar}</div>
            </div>

            {/* Botón de Cerrar Sesión */}
            <button
              className={style.logoutButton}
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
            </button>
          </header>

          {/* Mensaje de Bienvenida */}
          <div className={style.bienvenida}>
            <h1>¡Hola, {usuario.nombre.split(" ")[0]}!</h1>
          </div>

          {/*  Saldo Disponible DINÁMICO */}
          <div className={style.saldoCard}>
            <p className={style.saldoLabel}>Saldo Disponible</p>
            <h2 className={style.saldoMonto}>{saldoDisponible.toFixed(2)} €</h2>
          </div>
        </div>

        {/* CUERPO - Gráfico y Resumen */}
        <div className={style.cuerpo}>
          {/* Gráfico de Aro */}
          <div className={style.graficoContainer}>
            <svg className={style.graficoAro} viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="var(--color-gray-100)"
                strokeWidth="20"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="var(--color-terciary-250)"
                strokeWidth="20"
                strokeDasharray={`${porcentajeGastos * 5.03} ${100 * 5.03}`}
                strokeDashoffset="0"
                transform="rotate(-90 100 100)"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="var(--color-primary-250)"
                strokeWidth="20"
                strokeDasharray={`${porcentajeIngresos * 5.03} ${100 * 5.03}`}
                strokeDashoffset={`-${porcentajeGastos * 5.03}`}
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div className={style.graficoCenter}>
              <p className={style.graficoCenterLabel}>Total</p>
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
              style={{ cursor: "pointer" }}
            >
              <div
                className={style.resumenIcono}
                style={{ backgroundColor: "var(--color-terciary-50)" }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-terciary-250)"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </div>
              <div className={style.resumenInfo}>
                <p className={style.resumenLabelGastos}>Gastos</p>
                <p
                  className={style.resumenMonto}
                  style={{ color: "var(--color-terciary-250)" }}
                >
                  {gastos.toFixed(2)} €
                </p>
              </div>
            </div>

            <div
              className={`${style.resumenItem} ${style.ingresos}`}
              onClick={() => abrirModalResumen("ingreso")}
              style={{ cursor: "pointer" }}
            >
              <div
                className={style.resumenIcono}
                style={{ backgroundColor: "var(--color-primary-50)" }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-primary-250)"
                  strokeWidth="2"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </div>
              <div className={style.resumenInfo}>
                <p className={style.resumenLabelIngresos}>Ingresos</p>
                <p
                  className={style.resumenMonto}
                  style={{ color: "var(--color-primary-250)" }}
                >
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

          {/* Botón flotante para nueva transacción */}
          {!mostrarFormulario && (
            <button
              className={style.fabButton}
              onClick={() => setMostrarFormulario(true)}
              aria-label="Nueva transacción"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          )}

          {/* VISTA INICIAL - Badges y Transacciones */}
          {!mostrarFormulario && (
            <>
              <div className={style.historialBadges}>
                <button
                  className={`${style.badge} ${style.badgeTodos} ${filtroActivo === "todos" ? style.badgeActivo : ""}`}
                  onClick={() => setFiltroActivo("todos")}
                >
                  Todos
                </button>
                <button
                  className={`${style.badge} ${style.badgeGastos} ${filtroActivo === "gasto" ? style.badgeActivo : ""}`}
                  onClick={() => setFiltroActivo("gasto")}
                >
                  Gastos
                </button>
                <button
                  className={`${style.badge} ${style.badgeIngresos} ${filtroActivo === "ingreso" ? style.badgeActivo : ""}`}
                  onClick={() => setFiltroActivo("ingreso")}
                >
                  Ingresos
                </button>
              </div>

              <div className={style.transaccionesList}>
                {cargando ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "var(--spacing-xl)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <p>Cargando transacciones...</p>
                  </div>
                ) : obtenerTransaccionesMostrar().length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "var(--spacing-xl)",
                      color: "var(--text-tertiary)",
                      fontSize: "clamp(0.875rem, 2vw, 1rem)",
                    }}
                  >
                    <p>No hay transacciones para mostrar.</p>
                    <p
                      style={{
                        marginTop: "var(--spacing-sm)",
                        fontSize: "0.875rem",
                      }}
                    >
                      ¡Agrega tu primera transacción usando el botón +!
                    </p>
                  </div>
                ) : (
                  obtenerTransaccionesMostrar().map((transaccion) => (
                    <div
                      key={transaccion.id}
                      className={`${style.transaccionItem} ${style[transaccion.tipo]}`}
                      onClick={() => abrirModal(transaccion)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className={style.transaccionIcono}>
                        {transaccion.tipo === "gasto" ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--color-terciary-200)"
                            strokeWidth="2"
                          >
                            <path d="M12 5v14M5 12l7 7 7-7" />
                          </svg>
                        ) : (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--color-primary-250)"
                            strokeWidth="2"
                          >
                            <path d="M12 19V5M5 12l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                      <div className={style.transaccionInfo}>
                        <p className={style.transaccionConcepto}>
                          {transaccion.concepto}
                        </p>
                        <p className={style.transaccionFecha}>
                          {transaccion.fecha}
                        </p>
                      </div>
                      <p
                        className={style.transaccionMonto}
                        style={{
                          color:
                            transaccion.tipo === "gasto"
                              ? "var(--color-terciary-250)"
                              : "var(--color-primary-250)",
                        }}
                      >
                        {transaccion.monto > 0 ? "+" : ""}
                        {transaccion.monto.toFixed(2)} €
                      </p>
                      {/* Botones de acción - aparecen al hacer hover */}
                      <div className={style.transaccionAcciones}>
                        <button
                          className={style.botonEditar}
                          onClick={(e) => handleEditar(transaccion, e)}
                          aria-label="Editar transacción"
                          title="Editar"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          className={style.botonEliminar}
                          onClick={(e) => handleEliminar(transaccion, e)}
                          aria-label="Eliminar transacción"
                          title="Eliminar"
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

          {/* VISTA FORMULARIO */}
          {mostrarFormulario && (
            <div className={style.formularioContainer}>
              {errores.general && (
                <div className={style.errorGeneral} role="alert">
                  {errores.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className={style.formulario}>
                <div className={style.formGroup}>
                  <label htmlFor="tipo">Tipo de transacción</label>
                  <div className={style.botonesGrupo}>
                    <button
                      type="button"
                      className={`${style.botonTipo} ${style.botonGasto} ${
                        (modoEdicion
                          ? transaccionEditando?.tipo
                          : nuevaTransaccion.tipo) === "gasto"
                          ? style.botonActivo
                          : ""
                      }`}
                      onClick={() => {
                        if (modoEdicion) {
                          setTransaccionEditando((prev) => ({
                            ...prev,
                            tipo: "gasto",
                          }));
                        } else {
                          setNuevaTransaccion((prev) => ({
                            ...prev,
                            tipo: "gasto",
                          }));
                        }
                      }}
                    >
                      Gasto
                    </button>
                    <button
                      type="button"
                      className={`${style.botonTipo} ${style.botonIngreso} ${
                        (modoEdicion
                          ? transaccionEditando?.tipo
                          : nuevaTransaccion.tipo) === "ingreso"
                          ? style.botonActivo
                          : ""
                      }`}
                      onClick={() => {
                        if (modoEdicion) {
                          setTransaccionEditando((prev) => ({
                            ...prev,
                            tipo: "ingreso",
                          }));
                        } else {
                          setNuevaTransaccion((prev) => ({
                            ...prev,
                            tipo: "ingreso",
                          }));
                        }
                      }}
                    >
                      Ingreso
                    </button>
                  </div>
                </div>

                <div className={style.formGroup}>
                  <label htmlFor="concepto">Concepto</label>
                  <input
                    type="text"
                    id="concepto"
                    name="concepto"
                    value={
                      modoEdicion
                        ? transaccionEditando?.concepto || ""
                        : nuevaTransaccion.concepto
                    }
                    onChange={handleChange}
                    placeholder="Ej: Compra de supermercado"
                    aria-invalid={!!errores.concepto}
                    aria-describedby={
                      errores.concepto ? "error-concepto" : undefined
                    }
                    disabled={cargando}
                  />
                  {errores.concepto && (
                    <p id="error-concepto" className={style.error} role="alert">
                      {errores.concepto}
                    </p>
                  )}
                </div>

                <div className={style.formGroup}>
                  <label htmlFor="categoria">Categoría</label>
                  <select
                    id="categoria"
                    name="categoria"
                    value={modoEdicion ? transaccionEditando?.categoria || "OTROS" : nuevaTransaccion.categoria}
                    onChange={handleChange}
                    disabled={cargando}
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
                    type="date"
                    id="fecha"
                    name="fecha"
                    value={
                      modoEdicion
                        ? transaccionEditando?.fecha || ""
                        : nuevaTransaccion.fecha
                    }
                    onChange={handleChange}
                    aria-invalid={!!errores.fecha}
                    aria-describedby={errores.fecha ? "error-fecha" : undefined}
                    disabled={cargando}
                  />
                  {errores.fecha && (
                    <p id="error-fecha" className={style.error} role="alert">
                      {errores.fecha}
                    </p>
                  )}
                </div>

                <div className={style.formGroup}>
                  <label htmlFor="monto">Monto (€)</label>
                  <input
                    type="number"
                    id="monto"
                    name="monto"
                    value={
                      modoEdicion
                        ? transaccionEditando?.monto || ""
                        : nuevaTransaccion.monto
                    }
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    aria-invalid={!!errores.monto}
                    aria-describedby={errores.monto ? "error-monto" : undefined}
                    disabled={cargando}
                  />
                  {errores.monto && (
                    <p id="error-monto" className={style.error} role="alert">
                      {errores.monto}
                    </p>
                  )}
                </div>

                <div className={style.formularioBotones}>
                  <button
                    type="button"
                    className={style.botonCancelar}
                    onClick={cancelarEdicion}
                    disabled={cargando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={style.botonGuardar}
                    disabled={cargando}
                    aria-busy={cargando}
                  >
                    {cargando
                      ? modoEdicion
                        ? "Actualizando..."
                        : "Guardando..."
                      : modoEdicion
                        ? "Actualizar"
                        : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DETALLES DE TRANSACCIÓN */}
      {mostrarModal && transaccionSeleccionada && (
        <div className={style.modalOverlay} onClick={cerrarModal}>
          <div
            className={style.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={style.modalHeader}>
              <h3 className={style.modalTitulo}>Detalles de Transacción</h3>
              <button
                className={style.modalCloseButton}
                onClick={cerrarModal}
                aria-label="Cerrar modal"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className={style.modalBody}>
              <div className={style.modalDetalleItem}>
                <span className={style.modalDetalleLabel}>Tipo:</span>
                <span
                  className={style.modalDetalleValor}
                  style={{
                    color:
                      transaccionSeleccionada.tipo === "gasto"
                        ? "var(--color-terciary-250)"
                        : "var(--color-primary-250)",
                    fontWeight: 700,
                  }}
                >
                  {transaccionSeleccionada.tipo === "gasto"
                    ? "Gasto"
                    : "Ingreso"}
                </span>
              </div>

              <div className={style.modalDetalleItem}>
                <span className={style.modalDetalleLabel}>Concepto:</span>
                <span className={style.modalDetalleValor}>
                  {transaccionSeleccionada.concepto}
                </span>
              </div>

              <div className={style.modalDetalleItem}>
                <span className={style.modalDetalleLabel}>Fecha:</span>
                <span className={style.modalDetalleValor}>
                  {transaccionSeleccionada.fecha}
                </span>
              </div>

              <div className={style.modalDetalleItem}>
                <span className={style.modalDetalleLabel}>Monto:</span>
                <span
                  className={style.modalDetalleValor}
                  style={{
                    color:
                      transaccionSeleccionada.tipo === "gasto"
                        ? "var(--color-terciary-250)"
                        : "var(--color-primary-250)",
                    fontSize: "1.75rem",
                    fontWeight: 800,
                  }}
                >
                  {transaccionSeleccionada.monto > 0 ? "+" : ""}
                  {Math.abs(transaccionSeleccionada.monto).toFixed(2)} €
                </span>
              </div>

              {/* Botones de acción en el modal */}
              <div className={style.modalAcciones}>
                <button
                  className={style.modalBotonEditar}
                  onClick={() => {
                    cerrarModal();
                    handleEditar(transaccionSeleccionada);
                  }}
                >
                  <FontAwesomeIcon icon={faEdit} />
                  Editar
                </button>
                <button
                  className={style.modalBotonEliminar}
                  onClick={() => handleEliminar(transaccionSeleccionada)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESUMEN CON PAGINACIÓN */}
      {mostrarModalResumen && tipoModalResumen && (
        <div className={style.modalOverlay} onClick={cerrarModalResumen}>
          <div
            className={`${style.modalContent} ${style.modalResumen}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={style.modalHeader}>
              <h3 className={style.modalTitulo}>
                {tipoModalResumen === "gasto" ? "Gastos" : "Ingresos"}
              </h3>
              <button
                className={style.modalCloseButton}
                onClick={cerrarModalResumen}
                aria-label="Cerrar modal"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className={style.modalBody}>
              {obtenerTransaccionesFiltradas().length === 0 ? (
                <div className={style.modalEmpty}>
                  <p>
                    No hay{" "}
                    {tipoModalResumen === "gasto" ? "gastos" : "ingresos"}{" "}
                    registrados.
                  </p>
                </div>
              ) : (
                <>
                  <div className={style.transaccionesResumenList}>
                    {obtenerTransaccionesPaginadas().map((transaccion) => (
                      <div
                        key={transaccion.id}
                        className={style.transaccionResumenItem}
                        onClick={() => {
                          cerrarModalResumen();
                          abrirModal(transaccion);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <div className={style.transaccionResumenIcono}>
                          {tipoModalResumen === "gasto" ? (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="var(--color-terciary-250)"
                              strokeWidth="2"
                            >
                              <path d="M12 5v14M5 12l7 7 7-7" />
                            </svg>
                          ) : (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="var(--color-primary-250)"
                              strokeWidth="2"
                            >
                              <path d="M12 19V5M5 12l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                        <div className={style.transaccionResumenInfo}>
                          <span className={style.transaccionResumenConcepto}>
                            {transaccion.concepto}
                          </span>
                          <span className={style.transaccionResumenFecha}>
                            {transaccion.fecha}
                          </span>
                          <span
                            className={style.transaccionResumenMonto}
                            style={{
                              color:
                                tipoModalResumen === "gasto"
                                  ? "var(--color-terciary-250)"
                                  : "var(--color-primary-250)",
                            }}
                          >
                            {Math.abs(transaccion.monto).toFixed(2)} €
                          </span>
                          {/* Botones de acción en el resumen */}
                          <div className={style.transaccionResumenAcciones}>
                            <button
                              className={style.botonEditarResumen}
                              onClick={(e) => {
                                e.stopPropagation();
                                cerrarModalResumen();
                                handleEditar(transaccion);
                              }}
                              aria-label="Editar"
                              title="Editar"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button
                              className={style.botonEliminarResumen}
                              onClick={(e) => handleEliminar(transaccion, e)}
                              aria-label="Eliminar"
                              title="Eliminar"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginación */}
                  {totalPaginas > 1 && (
                    <div className={style.paginacion}>
                      <button
                        className={style.botonPaginacion}
                        onClick={() =>
                          setPaginaActual((prev) => Math.max(1, prev - 1))
                        }
                        disabled={paginaActual === 1}
                        aria-label="Página anterior"
                      >
                        <FontAwesomeIcon icon={faChevronLeft} />
                      </button>
                      <span className={style.paginacionInfo}>
                        Página {paginaActual} de {totalPaginas}
                      </span>
                      <button
                        className={style.botonPaginacion}
                        onClick={() =>
                          setPaginaActual((prev) =>
                            Math.min(totalPaginas, prev + 1),
                          )
                        }
                        disabled={paginaActual === totalPaginas}
                        aria-label="Página siguiente"
                      >
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
