import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPlus } from "@fortawesome/free-solid-svg-icons";
import style from "../styles/Transacciones.module.css";
import Toggle from "../components/Toggle";

// ✅ IMPORTS NECESARIOS DE FIREBASE
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";

// ✅ IMPORT DEL HOOK DE AUTENTICACIÓN
import { useAuth } from "../context/AuthContext";

import "../index.css";

function Transacciones() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Estado para transacciones
  const [transacciones, setTransacciones] = useState([]);

  // Estado para nueva transacción
  const [nuevaTransaccion, setNuevaTransaccion] = useState({
    concepto: "",
    fecha: "",
    monto: "",
    tipo: "gasto",
  });

  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);

  // ✅ Establecer el user
  const { user } = useAuth();

  // ✅ SOLUCIÓN: Traer las transacciones SIN orderBy para evitar error de índice
  const cargarTransacciones = async () => {
    if (!user) {
      console.log("⚠️ No hay usuario autenticado");
      return;
    }
    if (!db) {
      return;
    }

    try {
      setCargando(true);
      console.log("📥 Cargando transacciones para usuario:", user.uid);

      const transaccionesRef = collection(db, "transacciones");

      // ✅ OPCIÓN 1: Sin orderBy (más simple, sin necesidad de índice)
      const q = query(transaccionesRef, where("userId", "==", user.uid));

      const snapshot = await getDocs(q);
      console.log("📊 Documentos encontrados:", snapshot.size);

      const transaccionesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("📄 Transacción:", doc.id, data);
        return {
          id: doc.id,
          ...data,
        };
      });

      // ✅ Ordenar en cliente por fecha (de más reciente a más antigua)
      transaccionesData.sort((a, b) => {
        const fechaA = new Date(a.fecha);
        const fechaB = new Date(b.fecha);
        return fechaB - fechaA; // Orden descendente
      });

      setTransacciones(transaccionesData);
      console.log("✅ Transacciones cargadas:", transaccionesData.length);
    } catch (error) {
      console.error("❌ Error cargando transacciones:", error);
      console.error("Código de error:", error.code);
      console.error("Mensaje:", error.message);
    } finally {
      setCargando(false);
    }
  };

  // ✅ Cargar transacciones cuando cambie el usuario
  useEffect(() => {
    if (user) {
      console.log("🔄 Usuario detectado, cargando transacciones...");
      cargarTransacciones();
    } else {
      console.log("⚠️ No hay usuario, limpiando transacciones");
      setTransacciones([]);
    }
  }, [user]);

  // Calcular gastos e ingresos dinámicamente
  const gastos = transacciones
    .filter((t) => t.tipo === "gasto")
    .reduce((sum, t) => sum + Math.abs(t.monto), 0);

  const ingresos = transacciones
    .filter((t) => t.tipo === "ingreso")
    .reduce((sum, t) => sum + t.monto, 0);

  const total = ingresos - gastos;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setNuevaTransaccion((prev) => ({
      ...prev,
      [name]: value,
    }));

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

    if (!nuevaTransaccion.concepto.trim()) {
      nuevosErrores.concepto = "El concepto es obligatorio";
    } else if (nuevaTransaccion.concepto.trim().length < 3) {
      nuevosErrores.concepto = "El concepto debe tener al menos 3 caracteres";
    }

    if (!nuevaTransaccion.fecha) {
      nuevosErrores.fecha = "La fecha es obligatoria";
    }

    if (!nuevaTransaccion.monto) {
      nuevosErrores.monto = "El monto es obligatorio";
    } else if (
      isNaN(parseFloat(nuevaTransaccion.monto)) ||
      parseFloat(nuevaTransaccion.monto) <= 0
    ) {
      nuevosErrores.monto = "El monto debe ser un número positivo";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

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
        console.log("💾 Guardando transacción...");

        const transaccionData = {
          concepto: nuevaTransaccion.concepto.trim(),
          fecha: nuevaTransaccion.fecha, // ✅ Formato YYYY-MM-DD
          monto:
            nuevaTransaccion.tipo === "gasto"
              ? -Math.abs(parseFloat(nuevaTransaccion.monto))
              : Math.abs(parseFloat(nuevaTransaccion.monto)),
          tipo: nuevaTransaccion.tipo,
          userId: user.uid,
          createdAt: new Date().toISOString(),
        };

        console.log("📝 Datos a guardar:", transaccionData);

        const docRef = await addDoc(
          collection(db, "transacciones"),
          transaccionData,
        );

        console.log("✅ Transacción guardada con ID:", docRef.id);

        // ✅ Actualizar estado local inmediatamente
        setTransacciones((prev) => [
          {
            id: docRef.id,
            ...transaccionData,
          },
          ...prev,
        ]);

        // Resetear formulario
        setNuevaTransaccion({
          concepto: "",
          fecha: "",
          monto: "",
          tipo: "gasto",
        });

        setMostrarFormulario(false);
        setErrores({});

        console.log("🎉 Transacción añadida exitosamente");
      } catch (error) {
        console.error("❌ Error guardando transacción:", error);
        console.error("Código:", error.code);
        console.error("Mensaje:", error.message);
        setErrores({
          general: `Error al guardar: ${error.message}`,
        });
      } finally {
        setCargando(false);
      }
    }
  };

  return (
    <div className={style.transacciones}>
      <div className={style.contenedorTransacciones}>
        {/* Botones superiores */}
        <div className={style.topButtons}>
          <Toggle />
          <button
            className={style.backButton}
            aria-label="Volver"
            onClick={() => window.history.back()}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        </div>

        {/* CABECERA */}
        <header className={style.header}>
          <h1 className={style.headerTitulo}>
            {mostrarFormulario ? "Nueva Transacción" : "Transacciones"}
          </h1>
        </header>

        {/* RESUMEN DE TOTALES */}
        {!mostrarFormulario && (
          <div className={style.resumenTotales}>
            <div className={style.totalItem}>
              <p className={style.totalLabel}>Total Gastos</p>
              <p
                className={style.totalMonto}
                style={{ color: "var(--color-terciary-250)" }}
              >
                -€{gastos.toFixed(2)}
              </p>
            </div>
            <div className={style.totalItem}>
              <p className={style.totalLabel}>Total Ingresos</p>
              <p
                className={style.totalMonto}
                style={{ color: "var(--color-primary-250)" }}
              >
                +€{ingresos.toFixed(2)}
              </p>
            </div>
            <div className={style.totalItem}>
              <p className={style.totalLabel}>Balance Total</p>
              <p
                className={style.totalMonto}
                style={{
                  color:
                    total >= 0
                      ? "var(--color-primary-250)"
                      : "var(--color-terciary-250)",
                }}
              >
                {total >= 0 ? "+" : ""}€{total.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* MOSTRAR ESTADO DE CARGA */}
        {cargando && !mostrarFormulario && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p>Cargando transacciones...</p>
          </div>
        )}

        {/* MOSTRAR SI NO HAY TRANSACCIONES */}
        {!cargando && !mostrarFormulario && transacciones.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px", opacity: 0.6 }}>
            <p>No hay transacciones registradas</p>
          </div>
        )}

        {/* LISTA DE TRANSACCIONES (opcional - para debug) */}
        {!mostrarFormulario && transacciones.length > 0 && (
          <div style={{ padding: "20px" }}>
            <h3>Transacciones recientes:</h3>
            {transacciones.slice(0, 5).map((t) => (
              <div
                key={t.id}
                style={{
                  padding: "10px",
                  marginBottom: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                }}
              >
                <strong>{t.concepto}</strong> - {t.tipo}
                <br />€{Math.abs(t.monto).toFixed(2)} - {t.fecha}
              </div>
            ))}
          </div>
        )}

        {/* VISTA INICIAL - BOTÓN */}
        {!mostrarFormulario && (
          <div className={style.accionesContainer}>
            <button
              className={style.botonNueva}
              onClick={() => setMostrarFormulario(true)}
              aria-label="Nueva transacción"
            >
              <FontAwesomeIcon icon={faPlus} />
              Nueva Transacción
            </button>
          </div>
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
                <div className={style.tipoSelector}>
                  <button
                    type="button"
                    className={`${style.tipoBoton} ${style.tipoGasto} ${
                      nuevaTransaccion.tipo === "gasto" ? style.activo : ""
                    }`}
                    onClick={() =>
                      setNuevaTransaccion((prev) => ({
                        ...prev,
                        tipo: "gasto",
                      }))
                    }
                  >
                    Gasto
                  </button>
                  <button
                    type="button"
                    className={`${style.tipoBoton} ${style.tipoIngreso} ${
                      nuevaTransaccion.tipo === "ingreso" ? style.activo : ""
                    }`}
                    onClick={() =>
                      setNuevaTransaccion((prev) => ({
                        ...prev,
                        tipo: "ingreso",
                      }))
                    }
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
                  value={nuevaTransaccion.concepto}
                  onChange={handleChange}
                  placeholder="Ej: Supermercado, Nómina..."
                  disabled={cargando}
                  aria-invalid={!!errores.concepto}
                  aria-describedby={
                    errores.concepto ? "error-concepto" : undefined
                  }
                />
                {errores.concepto && (
                  <p id="error-concepto" className={style.error} role="alert">
                    {errores.concepto}
                  </p>
                )}
              </div>

              <div className={style.formGroup}>
                <label htmlFor="monto">Monto (€)</label>
                <input
                  type="number"
                  id="monto"
                  name="monto"
                  value={nuevaTransaccion.monto}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  disabled={cargando}
                  aria-invalid={!!errores.monto}
                  aria-describedby={errores.monto ? "error-monto" : undefined}
                />
                {errores.monto && (
                  <p id="error-monto" className={style.error} role="alert">
                    {errores.monto}
                  </p>
                )}
              </div>

              <div className={style.formGroup}>
                <label htmlFor="fecha">Fecha</label>
                <input
                  type="date"
                  id="fecha"
                  name="fecha"
                  value={nuevaTransaccion.fecha}
                  onChange={handleChange}
                  disabled={cargando}
                  aria-invalid={!!errores.fecha}
                  aria-describedby={errores.fecha ? "error-fecha" : undefined}
                />
                {errores.fecha && (
                  <p id="error-fecha" className={style.error} role="alert">
                    {errores.fecha}
                  </p>
                )}
              </div>

              <div className={style.formularioBotones}>
                <button
                  type="button"
                  className={style.botonCancelar}
                  onClick={() => {
                    setMostrarFormulario(false);
                    setNuevaTransaccion({
                      concepto: "",
                      fecha: "",
                      monto: "",
                      tipo: "gasto",
                    });
                    setErrores({});
                  }}
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
