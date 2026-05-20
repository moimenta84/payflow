import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPlus } from "@fortawesome/free-solid-svg-icons";
import style from "../styles/Transacciones.module.css";
import Toggle from "../components/Toggle";
import {
  listTransacciones,
  addTransaccion,
} from "../config/transactionsStore";
import { useAuth } from "../context/AuthContext";
import "../index.css";

function Transacciones() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [transacciones, setTransacciones]         = useState([]);
  const [errores, setErrores]                     = useState({});
  const [cargando, setCargando]                   = useState(false);

  const [nuevaTransaccion, setNuevaTransaccion] = useState({
    concepto:  "",
    fecha:     "",
    monto:     "",
    tipo:      "gasto",
    categoria: "OTROS",
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
  const total    = ingresos - gastos;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevaTransaccion((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores((prev) => { const e = { ...prev }; delete e[name]; return e; });
  };

  const validarFormulario = () => {
    const err = {};
    if (!nuevaTransaccion.concepto.trim())                                         err.concepto = "El concepto es obligatorio";
    else if (nuevaTransaccion.concepto.trim().length < 3)                          err.concepto = "Mínimo 3 caracteres";
    if (!nuevaTransaccion.fecha)                                                   err.fecha    = "La fecha es obligatoria";
    if (!nuevaTransaccion.monto)                                                   err.monto    = "El monto es obligatorio";
    else if (isNaN(parseFloat(nuevaTransaccion.monto)) || parseFloat(nuevaTransaccion.monto) <= 0) err.monto = "Debe ser un número positivo";
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

  return (
    <div className={style.transacciones}>
      <div className={style.contenedorTransacciones}>
        <div className={style.topButtons}>
          <Toggle />
          <button className={style.backButton} aria-label="Volver" onClick={() => window.history.back()}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        </div>

        <header className={style.header}>
          <h1 className={style.headerTitulo}>
            {mostrarFormulario ? "Nueva Transacción" : "Transacciones"}
          </h1>
        </header>

        {!mostrarFormulario && (
          <div className={style.resumenTotales}>
            <div className={style.totalItem}>
              <p className={style.totalLabel}>Total Gastos</p>
              <p className={style.totalMonto} style={{ color: "var(--color-terciary-250)" }}>
                -€{gastos.toFixed(2)}
              </p>
            </div>
            <div className={style.totalItem}>
              <p className={style.totalLabel}>Total Ingresos</p>
              <p className={style.totalMonto} style={{ color: "var(--color-primary-250)" }}>
                +€{ingresos.toFixed(2)}
              </p>
            </div>
            <div className={style.totalItem}>
              <p className={style.totalLabel}>Balance Total</p>
              <p className={style.totalMonto} style={{ color: total >= 0 ? "var(--color-primary-250)" : "var(--color-terciary-250)" }}>
                {total >= 0 ? "+" : ""}€{total.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {cargando && !mostrarFormulario && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p>Cargando transacciones...</p>
          </div>
        )}

        {!cargando && !mostrarFormulario && transacciones.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px", opacity: 0.6 }}>
            <p>No hay transacciones registradas</p>
          </div>
        )}

        {!mostrarFormulario && transacciones.length > 0 && (
          <div style={{ padding: "20px" }}>
            <h3>Transacciones recientes:</h3>
            {transacciones.slice(0, 5).map((t) => (
              <div key={t.id} style={{ padding: "10px", marginBottom: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                <strong>{t.concepto}</strong> — {t.tipo} · {t.categoria}
                <br />€{Math.abs(t.monto).toFixed(2)} · {t.fecha}
              </div>
            ))}
          </div>
        )}

        {!mostrarFormulario && (
          <div className={style.accionesContainer}>
            <button className={style.botonNueva} onClick={() => setMostrarFormulario(true)} aria-label="Nueva transacción">
              <FontAwesomeIcon icon={faPlus} />
              Nueva Transacción
            </button>
          </div>
        )}

        {mostrarFormulario && (
          <div className={style.formularioContainer}>
            {errores.general && (
              <div className={style.errorGeneral} role="alert">{errores.general}</div>
            )}

            <form onSubmit={handleSubmit} className={style.formulario}>
              <div className={style.formGroup}>
                <label>Tipo de transacción</label>
                <div className={style.tipoSelector}>
                  <button type="button"
                    className={`${style.tipoBoton} ${style.tipoGasto} ${nuevaTransaccion.tipo === "gasto" ? style.activo : ""}`}
                    onClick={() => setNuevaTransaccion((p) => ({ ...p, tipo: "gasto" }))}>
                    Gasto
                  </button>
                  <button type="button"
                    className={`${style.tipoBoton} ${style.tipoIngreso} ${nuevaTransaccion.tipo === "ingreso" ? style.activo : ""}`}
                    onClick={() => setNuevaTransaccion((p) => ({ ...p, tipo: "ingreso" }))}>
                    Ingreso
                  </button>
                </div>
              </div>

              <div className={style.formGroup}>
                <label htmlFor="categoria">Categoría</label>
                <select id="categoria" name="categoria" value={nuevaTransaccion.categoria} onChange={handleChange} disabled={cargando}>
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
                <label htmlFor="concepto">Concepto</label>
                <input type="text" id="concepto" name="concepto"
                  value={nuevaTransaccion.concepto} onChange={handleChange}
                  placeholder="Ej: Supermercado, Nómina..." disabled={cargando}
                  aria-invalid={!!errores.concepto} />
                {errores.concepto && <p className={style.error} role="alert">{errores.concepto}</p>}
              </div>

              <div className={style.formGroup}>
                <label htmlFor="monto">Monto (€)</label>
                <input type="number" id="monto" name="monto"
                  value={nuevaTransaccion.monto} onChange={handleChange}
                  placeholder="0.00" step="0.01" min="0" disabled={cargando}
                  aria-invalid={!!errores.monto} />
                {errores.monto && <p className={style.error} role="alert">{errores.monto}</p>}
              </div>

              <div className={style.formGroup}>
                <label htmlFor="fecha">Fecha</label>
                <input type="date" id="fecha" name="fecha"
                  value={nuevaTransaccion.fecha} onChange={handleChange}
                  disabled={cargando} aria-invalid={!!errores.fecha} />
                {errores.fecha && <p className={style.error} role="alert">{errores.fecha}</p>}
              </div>

              <div className={style.formularioBotones}>
                <button type="button" className={style.botonCancelar} disabled={cargando}
                  onClick={() => {
                    setMostrarFormulario(false);
                    setNuevaTransaccion({ concepto: "", fecha: "", monto: "", tipo: "gasto", categoria: "OTROS" });
                    setErrores({});
                  }}>
                  Cancelar
                </button>
                <button type="submit" className={style.botonGuardar} disabled={cargando} aria-busy={cargando}>
                  {cargando ? "Guardando..." : "Guardar"}
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
