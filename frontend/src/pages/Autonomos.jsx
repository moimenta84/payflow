import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../config/api';
import style from '../styles/Autonomos.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const CATEGORIAS = ['MATERIAL', 'SERVICIOS', 'SUMINISTROS', 'OTROS'];
const CATEGORIA_LABEL = {
  MATERIAL: 'Material', SERVICIOS: 'Servicios',
  SUMINISTROS: 'Suministros', OTROS: 'Otros',
};

const ESTADO_LABEL  = { PENDIENTE: 'Pendiente', COBRADA: 'Cobrada', CANCELADA: 'Cancelada' };
const ESTADO_CLASS  = { PENDIENTE: style.estadoPendiente, COBRADA: style.estadoCobrada, CANCELADA: style.estadoCancelada };

function fmt(n) {
  return typeof n === 'number'
    ? n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';
}

function calcInvoiceTotals(base, tipoIva, tipoIrpf) {
  const b    = parseFloat(base)    || 0;
  const iva  = parseFloat(tipoIva) || 0;
  const irpf = parseFloat(tipoIrpf) || 0;
  const cuotaIva  = b * iva  / 100;
  const cuotaIrpf = b * irpf / 100;
  const total = b + cuotaIva - cuotaIrpf;
  return { cuotaIva, cuotaIrpf, total };
}

function FacturaIcono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function DownloadIcono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function TrashIcono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function Autonomos() {
  const [tabActiva, setTabActiva] = useState('facturas');

  // Facturas
  const [facturas, setFacturas]           = useState([]);
  const [cargandoF, setCargandoF]         = useState(true);
  const [mostrarFormF, setMostrarFormF]   = useState(false);
  const [formFactura, setFormFactura]     = useState({
    clienteNombre: '', clienteNif: '', concepto: '',
    baseImponible: '', tipoIva: '21', tipoIrpf: '15',
  });
  const [guardandoF, setGuardandoF]       = useState(false);
  const [errF, setErrF]                   = useState(null);
  const [descargando, setDescargando]     = useState({});

  // Gastos
  const [gastos, setGastos]               = useState([]);
  const [cargandoG, setCargandoG]         = useState(true);
  const [mostrarFormG, setMostrarFormG]   = useState(false);
  const [formGasto, setFormGasto]         = useState({
    descripcion: '', proveedor: '',
    baseImponible: '', cuotaIva: '',
    categoria: 'SERVICIOS', deducible: true,
  });
  const [guardandoG, setGuardandoG]       = useState(false);
  const [errG, setErrG]                   = useState(null);

  // Trimestre
  const [resumen, setResumen]             = useState(null);
  const [cargandoT, setCargandoT]         = useState(false);
  const [year, setYear]                   = useState(new Date().getFullYear());
  const [quarter, setQuarter]             = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  const cargarFacturas = useCallback(async () => {
    setCargandoF(true);
    try {
      const data = await api.get('/invoices');
      if (Array.isArray(data)) setFacturas(data);
    } catch { /* servicio no disponible */ } finally { setCargandoF(false); }
  }, []);

  const cargarGastos = useCallback(async () => {
    setCargandoG(true);
    try {
      const data = await api.get('/expenses');
      if (Array.isArray(data)) setGastos(data);
    } catch { /* servicio no disponible */ } finally { setCargandoG(false); }
  }, []);

  const cargarResumen = useCallback(async () => {
    setCargandoT(true);
    try {
      const data = await api.get(`/invoices/summary/quarterly?year=${year}&quarter=${quarter}`);
      setResumen(data);
    } catch { setResumen(null); } finally { setCargandoT(false); }
  }, [year, quarter]);

  useEffect(() => { cargarFacturas(); cargarGastos(); }, [cargarFacturas, cargarGastos]);

  useEffect(() => {
    if (tabActiva === 'trimestre') cargarResumen();
  }, [tabActiva, cargarResumen]);

  const handleCrearFactura = async (e) => {
    e.preventDefault();
    if (!formFactura.clienteNombre || !formFactura.concepto || !formFactura.baseImponible) {
      setErrF('Completa los campos obligatorios');
      return;
    }
    setGuardandoF(true);
    setErrF(null);
    try {
      await api.post('/invoices', {
        clienteNombre: formFactura.clienteNombre,
        clienteNif:    formFactura.clienteNif,
        concepto:      formFactura.concepto,
        baseImponible: parseFloat(formFactura.baseImponible),
        tipoIva:       parseFloat(formFactura.tipoIva),
        tipoIrpf:      parseFloat(formFactura.tipoIrpf),
      });
      setFormFactura({ clienteNombre: '', clienteNif: '', concepto: '',
        baseImponible: '', tipoIva: '21', tipoIrpf: '15' });
      setMostrarFormF(false);
      cargarFacturas();
    } catch (err) {
      setErrF(err.message || 'Error al crear la factura');
    } finally {
      setGuardandoF(false);
    }
  };

  const handleEliminarFactura = async (id) => {
    try {
      await api.delete(`/invoices/${id}`);
      setFacturas(prev => prev.filter(f => f.id !== id));
    } catch { /* ignorar */ }
  };

  const handleDescargarPdf = async (id, numeroFactura) => {
    setDescargando(prev => ({ ...prev, [id]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al generar el PDF');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${numeroFactura || 'factura'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignorar */ } finally {
      setDescargando(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleCrearGasto = async (e) => {
    e.preventDefault();
    if (!formGasto.descripcion || !formGasto.baseImponible) {
      setErrG('Completa los campos obligatorios');
      return;
    }
    setGuardandoG(true);
    setErrG(null);
    try {
      await api.post('/expenses', {
        descripcion:   formGasto.descripcion,
        proveedor:     formGasto.proveedor,
        baseImponible: parseFloat(formGasto.baseImponible),
        cuotaIva:      parseFloat(formGasto.cuotaIva) || 0,
        categoria:     formGasto.categoria,
        deducible:     formGasto.deducible,
      });
      setFormGasto({ descripcion: '', proveedor: '',
        baseImponible: '', cuotaIva: '', categoria: 'SERVICIOS', deducible: true });
      setMostrarFormG(false);
      cargarGastos();
    } catch (err) {
      setErrG(err.message || 'Error al añadir el gasto');
    } finally {
      setGuardandoG(false);
    }
  };

  const handleEliminarGasto = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      setGastos(prev => prev.filter(g => g.id !== id));
    } catch { /* ignorar */ }
  };

  const preview = calcInvoiceTotals(
    formFactura.baseImponible, formFactura.tipoIva, formFactura.tipoIrpf
  );

  const fgTotal = (parseFloat(formGasto.baseImponible) || 0) + (parseFloat(formGasto.cuotaIva) || 0);

  return (
    <div className={style.autonomos}>
      <div className={style.header}>
        <div className={style.headerLeft}>
          <div className={style.headerIcono}>
            <FacturaIcono />
          </div>
          <div>
            <h1 className={style.titulo}>Módulo Autónomos</h1>
            <p className={style.subtitulo}>Facturas, gastos deducibles y resumen fiscal trimestral</p>
          </div>
        </div>
      </div>

      <div className={style.tabs}>
        {[
          { id: 'facturas', label: 'Facturas' },
          { id: 'gastos',   label: 'Gastos deducibles' },
          { id: 'trimestre', label: 'Trimestre fiscal' },
        ].map(t => (
          <button
            key={t.id}
            className={`${style.tab} ${tabActiva === t.id ? style.tabActiva : ''}`}
            onClick={() => setTabActiva(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB FACTURAS ── */}
      {tabActiva === 'facturas' && (
        <div className={style.tabContenido}>
          <div className={style.accionBar}>
            <h2 className={style.seccionTitulo}>Mis facturas</h2>
            <button
              className={style.btnPrimario}
              onClick={() => { setMostrarFormF(v => !v); setErrF(null); }}
            >
              {mostrarFormF ? 'Cancelar' : '+ Nueva factura'}
            </button>
          </div>

          {mostrarFormF && (
            <form onSubmit={handleCrearFactura} className={style.form}>
              <h3 className={style.formTitulo}>Nueva factura</h3>
              <div className={style.formGrid}>
                <label className={style.label}>
                  Cliente *
                  <input
                    className={style.input}
                    value={formFactura.clienteNombre}
                    onChange={e => setFormFactura(p => ({ ...p, clienteNombre: e.target.value }))}
                    placeholder="Nombre del cliente"
                  />
                </label>
                <label className={style.label}>
                  NIF cliente
                  <input
                    className={style.input}
                    value={formFactura.clienteNif}
                    onChange={e => setFormFactura(p => ({ ...p, clienteNif: e.target.value }))}
                    placeholder="B12345678"
                  />
                </label>
                <label className={`${style.label} ${style.fullWidth}`}>
                  Concepto *
                  <input
                    className={style.input}
                    value={formFactura.concepto}
                    onChange={e => setFormFactura(p => ({ ...p, concepto: e.target.value }))}
                    placeholder="Descripción del servicio"
                  />
                </label>
                <label className={style.label}>
                  Base imponible (€) *
                  <input
                    type="number" min="0" step="0.01"
                    className={style.input}
                    value={formFactura.baseImponible}
                    onChange={e => setFormFactura(p => ({ ...p, baseImponible: e.target.value }))}
                    placeholder="0.00"
                  />
                </label>
                <label className={style.label}>
                  IVA (%)
                  <select
                    className={style.input}
                    value={formFactura.tipoIva}
                    onChange={e => setFormFactura(p => ({ ...p, tipoIva: e.target.value }))}
                  >
                    <option value="21">21% (general)</option>
                    <option value="10">10% (reducido)</option>
                    <option value="4">4% (superreducido)</option>
                    <option value="0">0% (exento)</option>
                  </select>
                </label>
                <label className={style.label}>
                  IRPF (%)
                  <select
                    className={style.input}
                    value={formFactura.tipoIrpf}
                    onChange={e => setFormFactura(p => ({ ...p, tipoIrpf: e.target.value }))}
                  >
                    <option value="15">15% (general)</option>
                    <option value="7">7% (inicio actividad)</option>
                    <option value="19">19%</option>
                    <option value="0">0% (no sujeto)</option>
                  </select>
                </label>
              </div>

              {formFactura.baseImponible && (
                <div className={style.previewTotal}>
                  <span>Base: <strong>{fmt(parseFloat(formFactura.baseImponible) || 0)} €</strong></span>
                  <span>+ IVA: <strong>{fmt(preview.cuotaIva)} €</strong></span>
                  <span>- IRPF: <strong>{fmt(preview.cuotaIrpf)} €</strong></span>
                  <span className={style.previewTotalFinal}>= Total: <strong>{fmt(preview.total)} €</strong></span>
                </div>
              )}

              {errF && <p className={style.error}>{errF}</p>}

              <div className={style.formActions}>
                <button type="submit" className={style.btnPrimario} disabled={guardandoF}>
                  {guardandoF ? 'Guardando...' : 'Crear factura'}
                </button>
                <button type="button" className={style.btnSecundario}
                  onClick={() => setMostrarFormF(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {cargandoF ? (
            <div className={style.skeletons}>
              {[1, 2, 3].map(i => <div key={i} className={style.skeletonRow} />)}
            </div>
          ) : facturas.length === 0 ? (
            <div className={style.emptyState}>
              <p>No tienes facturas emitidas aún.</p>
              <p className={style.emptyHint}>Crea tu primera factura con el botón de arriba.</p>
            </div>
          ) : (
            <div className={style.tabla}>
              <div className={style.tablaHeader}>
                <span>Número</span>
                <span>Cliente</span>
                <span>Concepto</span>
                <span>Total</span>
                <span>Estado</span>
                <span>Acciones</span>
              </div>
              {facturas.map(f => (
                <div key={f.id} className={style.tablaFila}>
                  <span className={style.mono}>{f.numeroFactura}</span>
                  <span>{f.clienteNombre}</span>
                  <span className={style.textEllipsis}>{f.concepto}</span>
                  <span className={style.mono}>{fmt(f.total)} €</span>
                  <span>
                    <span className={`${style.estadoBadge} ${ESTADO_CLASS[f.estado] || ''}`}>
                      {ESTADO_LABEL[f.estado] || f.estado}
                    </span>
                  </span>
                  <span className={style.acciones}>
                    <button
                      className={style.btnIcono}
                      onClick={() => handleDescargarPdf(f.id, f.numeroFactura)}
                      disabled={descargando[f.id]}
                      title="Descargar PDF"
                    >
                      <DownloadIcono />
                    </button>
                    {f.estado !== 'CANCELADA' && (
                      <button
                        className={`${style.btnIcono} ${style.btnIconoDanger}`}
                        onClick={() => handleEliminarFactura(f.id)}
                        title="Cancelar factura"
                      >
                        <TrashIcono />
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB GASTOS ── */}
      {tabActiva === 'gastos' && (
        <div className={style.tabContenido}>
          <div className={style.accionBar}>
            <h2 className={style.seccionTitulo}>Gastos deducibles</h2>
            <button
              className={style.btnPrimario}
              onClick={() => { setMostrarFormG(v => !v); setErrG(null); }}
            >
              {mostrarFormG ? 'Cancelar' : '+ Añadir gasto'}
            </button>
          </div>

          {mostrarFormG && (
            <form onSubmit={handleCrearGasto} className={style.form}>
              <h3 className={style.formTitulo}>Nuevo gasto</h3>
              <div className={style.formGrid}>
                <label className={`${style.label} ${style.fullWidth}`}>
                  Descripción *
                  <input
                    className={style.input}
                    value={formGasto.descripcion}
                    onChange={e => setFormGasto(p => ({ ...p, descripcion: e.target.value }))}
                    placeholder="Descripción del gasto"
                  />
                </label>
                <label className={style.label}>
                  Proveedor
                  <input
                    className={style.input}
                    value={formGasto.proveedor}
                    onChange={e => setFormGasto(p => ({ ...p, proveedor: e.target.value }))}
                    placeholder="Nombre del proveedor"
                  />
                </label>
                <label className={style.label}>
                  Categoría
                  <select
                    className={style.input}
                    value={formGasto.categoria}
                    onChange={e => setFormGasto(p => ({ ...p, categoria: e.target.value }))}
                  >
                    {CATEGORIAS.map(c => (
                      <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>
                    ))}
                  </select>
                </label>
                <label className={style.label}>
                  Base imponible (€) *
                  <input
                    type="number" min="0" step="0.01"
                    className={style.input}
                    value={formGasto.baseImponible}
                    onChange={e => setFormGasto(p => ({ ...p, baseImponible: e.target.value }))}
                    placeholder="0.00"
                  />
                </label>
                <label className={style.label}>
                  Cuota IVA (€)
                  <input
                    type="number" min="0" step="0.01"
                    className={style.input}
                    value={formGasto.cuotaIva}
                    onChange={e => setFormGasto(p => ({ ...p, cuotaIva: e.target.value }))}
                    placeholder="0.00"
                  />
                </label>
                <label className={`${style.label} ${style.checkLabel}`}>
                  <input
                    type="checkbox"
                    checked={formGasto.deducible}
                    onChange={e => setFormGasto(p => ({ ...p, deducible: e.target.checked }))}
                  />
                  Gasto deducible
                </label>
              </div>

              {(formGasto.baseImponible || formGasto.cuotaIva) && (
                <div className={style.previewTotal}>
                  <span>Base: <strong>{fmt(parseFloat(formGasto.baseImponible) || 0)} €</strong></span>
                  <span>+ IVA: <strong>{fmt(parseFloat(formGasto.cuotaIva) || 0)} €</strong></span>
                  <span className={style.previewTotalFinal}>= Total: <strong>{fmt(fgTotal)} €</strong></span>
                </div>
              )}

              {errG && <p className={style.error}>{errG}</p>}

              <div className={style.formActions}>
                <button type="submit" className={style.btnPrimario} disabled={guardandoG}>
                  {guardandoG ? 'Guardando...' : 'Añadir gasto'}
                </button>
                <button type="button" className={style.btnSecundario}
                  onClick={() => setMostrarFormG(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {cargandoG ? (
            <div className={style.skeletons}>
              {[1, 2, 3].map(i => <div key={i} className={style.skeletonRow} />)}
            </div>
          ) : gastos.length === 0 ? (
            <div className={style.emptyState}>
              <p>No hay gastos registrados.</p>
              <p className={style.emptyHint}>Añade tus gastos profesionales para el cálculo trimestral.</p>
            </div>
          ) : (
            <div className={style.tabla}>
              <div className={style.tablaHeader} style={{ gridTemplateColumns: '1fr 140px 100px 90px 60px' }}>
                <span>Descripción</span>
                <span>Proveedor</span>
                <span>Categoría</span>
                <span>Total</span>
                <span></span>
              </div>
              {gastos.map(g => (
                <div key={g.id} className={style.tablaFila}
                  style={{ gridTemplateColumns: '1fr 140px 100px 90px 60px' }}>
                  <span>{g.descripcion}</span>
                  <span className={style.textSec}>{g.proveedor || '—'}</span>
                  <span>
                    <span className={style.categoriaBadge}>{CATEGORIA_LABEL[g.categoria] || g.categoria}</span>
                  </span>
                  <span className={style.mono}>{fmt(g.total)} €</span>
                  <span>
                    <button
                      className={`${style.btnIcono} ${style.btnIconoDanger}`}
                      onClick={() => handleEliminarGasto(g.id)}
                      title="Eliminar gasto"
                    >
                      <TrashIcono />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB TRIMESTRE ── */}
      {tabActiva === 'trimestre' && (
        <div className={style.tabContenido}>
          <div className={style.trimestreControles}>
            <h2 className={style.seccionTitulo}>Resumen fiscal trimestral</h2>
            <div className={style.selectorTrimestre}>
              <select
                className={style.input}
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                style={{ width: '90px' }}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                className={style.input}
                value={quarter}
                onChange={e => setQuarter(Number(e.target.value))}
                style={{ width: '120px' }}
              >
                <option value={1}>1T (Ene–Mar)</option>
                <option value={2}>2T (Abr–Jun)</option>
                <option value={3}>3T (Jul–Sep)</option>
                <option value={4}>4T (Oct–Dic)</option>
              </select>
              <button
                className={style.btnPrimario}
                onClick={cargarResumen}
                disabled={cargandoT}
              >
                {cargandoT ? 'Calculando...' : 'Calcular'}
              </button>
            </div>
          </div>

          {cargandoT && (
            <div className={style.skeletons}>
              {[1, 2, 3, 4].map(i => <div key={i} className={style.skeletonCard} />)}
            </div>
          )}

          {!cargandoT && !resumen && (
            <div className={style.emptyState}>
              <p>Selecciona el trimestre y pulsa Calcular para ver el resumen fiscal.</p>
            </div>
          )}

          {!cargandoT && resumen && (
            <div className={style.resumenGrid}>
              {/* Ingresos */}
              <div className={style.resumenCard}>
                <p className={style.resumenLabel}>Ingresos facturados</p>
                <p className={style.resumenValor}>{fmt(resumen.totalIngresos)} €</p>
                <p className={style.resumenHint}>Base imponible total de facturas emitidas</p>
              </div>

              {/* Modelo 303 — IVA */}
              <div className={`${style.resumenCard} ${style.resumenCardDestacado}`}>
                <p className={style.resumenLabel}>Modelo 303 — IVA</p>
                <div className={style.resumenDetalle}>
                  <span>IVA repercutido (cobrado)</span>
                  <span className={style.mono}>{fmt(resumen.ivaRepercutido)} €</span>
                </div>
                <div className={style.resumenDetalle}>
                  <span>IVA soportado (pagado)</span>
                  <span className={style.mono}>− {fmt(resumen.ivaSoportado)} €</span>
                </div>
                <div className={`${style.resumenDetalle} ${style.resumenTotal}`}>
                  <span>A ingresar a Hacienda</span>
                  <span className={`${style.mono} ${resumen.resultado303 >= 0 ? style.valorPositivo : style.valorNegativo}`}>
                    {fmt(resumen.resultado303)} €
                  </span>
                </div>
              </div>

              {/* Modelo 130 — IRPF */}
              <div className={`${style.resumenCard} ${style.resumenCardDestacado}`}>
                <p className={style.resumenLabel}>Modelo 130 — IRPF pago fraccionado</p>
                <div className={style.resumenDetalle}>
                  <span>Base IRPF (ingresos)</span>
                  <span className={style.mono}>{fmt(resumen.baseIRPF)} €</span>
                </div>
                <div className={style.resumenDetalle}>
                  <span>Retenciones practicadas</span>
                  <span className={style.mono}>− {fmt(resumen.retencionesIRPF)} €</span>
                </div>
                <div className={`${style.resumenDetalle} ${style.resumenTotal}`}>
                  <span>Pago fraccionado (20%)</span>
                  <span className={`${style.mono} ${resumen.pagoFraccionado130 > 0 ? style.valorPositivo : style.valorNeutro}`}>
                    {fmt(resumen.pagoFraccionado130)} €
                  </span>
                </div>
              </div>

              {/* Resumen global */}
              <div className={style.resumenCard}>
                <p className={style.resumenLabel}>
                  Total a pagar este trimestre
                </p>
                <p className={`${style.resumenValorGrande} ${
                  (resumen.resultado303 + resumen.pagoFraccionado130) > 0
                    ? style.valorPositivo
                    : style.valorNeutro
                }`}>
                  {fmt(resumen.resultado303 + resumen.pagoFraccionado130)} €
                </p>
                <p className={style.resumenHint}>303 + 130 · Plazo: 20 días tras fin de trimestre</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Autonomos;
