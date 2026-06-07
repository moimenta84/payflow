import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';
import style from '../styles/Banca.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function BancaIcono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
      <rect x="3" y="10" width="18" height="11" rx="1" />
      <path d="M3 10l9-7 9 7" />
      <line x1="12" y1="10" x2="12" y2="21" />
      <line x1="7" y1="14" x2="7" y2="21" />
      <line x1="17" y1="14" x2="17" y2="21" />
    </svg>
  );
}

function CheckIcono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Pantalla de Open Banking (PSD2): conecta el banco real vía Nordigen, sincroniza e importa movimientos.
function Banca() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conexion, setConexion]               = useState(undefined); // undefined = aún no sabemos; null = sin conexión.
  const [instituciones, setInstituciones]     = useState([]);
  const [transacciones, setTransacciones]     = useState([]);
  const [selectedInst, setSelectedInst]       = useState('');
  const [cargando, setCargando]               = useState(true);
  const [cargandoConexion, setCargandoConexion] = useState(false);
  const [cargandoTx, setCargandoTx]           = useState(false);
  const [importando, setImportando]           = useState({});
  const [error, setError]                     = useState(null);
  const [okMsg, setOkMsg]                     = useState(null);

  // Consulta si el usuario ya tiene un banco vinculado (LINKED), pendiente (PENDING) o ninguno.
  const cargarStatus = useCallback(async () => {
    try {
      const data = await api.get('/bank/status');
      setConexion(data ?? null);
      return data;
    } catch {
      setConexion(null);
      return null;
    }
  }, []);

  const cargarInstituciones = useCallback(async () => {
    try {
      const data = await api.get('/bank/institutions');
      if (Array.isArray(data) && data.length > 0) {
        setInstituciones(data);
        setSelectedInst(data[0].id);
      }
    } catch { /* servicio no disponible */ }
  }, []);

  const cargarTransacciones = useCallback(async () => {
    setCargandoTx(true);
    try {
      const data = await api.get('/bank/transactions');
      if (Array.isArray(data)) setTransacciones(data);
    } catch (err) {
      setError(err.message || 'Error al cargar transacciones bancarias');
    } finally {
      setCargandoTx(false);
    }
  }, []);

  // Al cargar: si volvemos del banco (?connected=true), procesamos el callback de Nordigen.
  // El flujo es: el usuario autoriza en la web de su banco y este nos redirige aquí de vuelta.
  useEffect(() => {
    const isCallback = searchParams.get('connected') === 'true';

    async function init() {
      setCargando(true);
      await cargarInstituciones();

      if (isCallback) {
        const savedReqId = sessionStorage.getItem('bank_requisition_id');
        const userId = user?.id || user?.userId;
        if (savedReqId && userId) {
          try {
            await fetch(
              `${API_BASE}/bank/callback?ref=${encodeURIComponent(savedReqId)}&userId=${encodeURIComponent(userId)}`
            );
          } catch { /* ignorar errores del callback */ }
          sessionStorage.removeItem('bank_requisition_id');
        }
        setSearchParams({}, { replace: true });
        setOkMsg('Banco conectado correctamente');
      }

      const conn = await cargarStatus();
      if (conn?.status === 'LINKED') {
        await cargarTransacciones();
      }
      setCargando(false);
    }

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Inicia la conexión: pide a Nordigen el enlace de autorización y redirige al usuario a su banco.
  const handleConectar = async () => {
    if (!selectedInst) return;
    setError(null);
    setCargandoConexion(true);
    try {
      // Tras autorizar, el banco devolverá al usuario a esta misma página con ?connected=true.
      const redirectUrl = `${window.location.origin}/banco?connected=true`;
      const data = await api.post('/bank/connect', {
        institutionId: selectedInst,
        redirectUrl,
      });
      if (data?.requisitionId) {
        sessionStorage.setItem('bank_requisition_id', data.requisitionId);
      }
      if (data?.link) {
        window.location.href = data.link;
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar la conexión bancaria');
      setCargandoConexion(false);
    }
  };

  // Importa un movimiento bancario al historial propio de PayFlow (lo crea en el transaction-service).
  const handleImportar = async (txId) => {
    setImportando(prev => ({ ...prev, [txId]: true }));
    try {
      await api.post(`/bank/transactions/${txId}/import`, {});
      setTransacciones(prev =>
        prev.map(tx => tx.id === txId ? { ...tx, importedToPayflow: true } : tx)
      );
    } catch (err) {
      setError(err.message || 'Error al importar la transacción');
    } finally {
      setImportando(prev => ({ ...prev, [txId]: false }));
    }
  };

  const handleDesconectar = async () => {
    try {
      await api.delete('/bank/disconnect');
      setConexion(null);
      setTransacciones([]);
      setOkMsg(null);
    } catch (err) {
      setError(err.message || 'Error al desconectar el banco');
    }
  };

  const fmtImporte = (amount, currency = 'EUR') => {
    const formatted = Math.abs(amount).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${amount < 0 ? '-' : '+'}${formatted} ${currency}`;
  };

  if (cargando) {
    return (
      <div className={style.banca}>
        <div className={style.header}>
          <div className={style.skeletonTitle} />
        </div>
        <div className={style.skeletonCard} />
        <div className={style.skeletonCard} style={{ height: '80px' }} />
      </div>
    );
  }

  const isLinked = conexion?.status === 'LINKED';
  const isPending = conexion?.status === 'PENDING';

  return (
    <div className={style.banca}>
      <div className={style.header}>
        <div className={style.headerLeft}>
          <div className={style.headerIcono}>
            <BancaIcono />
          </div>
          <div>
            <h1 className={style.titulo}>Banca conectada</h1>
            <p className={style.subtitulo}>Vincula tu cuenta bancaria real y sincroniza tus movimientos</p>
          </div>
        </div>
        {isLinked && (
          <button className={style.btnDesconectar} onClick={handleDesconectar}>
            Desconectar banco
          </button>
        )}
      </div>

      {error && (
        <div className={style.alertError}>
          <span>{error}</span>
          <button className={style.alertClose} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {okMsg && (
        <div className={style.alertOk}>
          <CheckIcono />
          <span>{okMsg}</span>
        </div>
      )}

      {/* Panel de conexión */}
      {!isLinked && !isPending && (
        <div className={style.card}>
          <h2 className={style.cardTitulo}>Conectar cuenta bancaria</h2>
          <p className={style.cardDesc}>
            Selecciona tu banco y autoriza el acceso de solo lectura a tus movimientos.
            La conexión es segura y cumple con la directiva PSD2.
          </p>

          <div className={style.conectarForm}>
            <select
              className={style.select}
              value={selectedInst}
              onChange={e => setSelectedInst(e.target.value)}
            >
              {instituciones.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>

            <button
              className={style.btnConectar}
              onClick={handleConectar}
              disabled={cargandoConexion || !selectedInst}
            >
              {cargandoConexion ? 'Conectando...' : 'Conectar banco'}
            </button>
          </div>

          <div className={style.psd2Badge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Conexión segura PSD2 · Solo lectura · Sin almacenar credenciales
          </div>
        </div>
      )}

      {isPending && (
        <div className={style.card}>
          <div className={style.pendingState}>
            <div className={style.spinner} />
            <div>
              <p className={style.pendingTitulo}>Conexión pendiente de autorización</p>
              <p className={style.pendingDesc}>
                Si ya has autorizado el acceso en tu banco, vuelve a esta página.
              </p>
            </div>
          </div>
          <button className={style.btnDesconectar} onClick={handleDesconectar}
            style={{ marginTop: '1rem' }}>
            Cancelar conexión
          </button>
        </div>
      )}

      {/* Panel de transacciones cuando está conectado */}
      {isLinked && (
        <>
          <div className={style.conexionBadge}>
            <CheckIcono />
            <span>Conectado a <strong>{conexion.institutionName}</strong></span>
          </div>

          <div className={style.card}>
            <div className={style.txHeader}>
              <h2 className={style.cardTitulo}>Movimientos bancarios</h2>
              <button
                className={style.btnRecargar}
                onClick={cargarTransacciones}
                disabled={cargandoTx}
              >
                {cargandoTx ? 'Cargando...' : 'Actualizar movimientos'}
              </button>
            </div>

            {cargandoTx ? (
              <div className={style.txLoading}>
                {[1, 2, 3].map(i => (
                  <div key={i} className={style.skeletonRow} />
                ))}
              </div>
            ) : transacciones.length === 0 ? (
              <div className={style.emptyState}>
                <p>No hay movimientos bancarios disponibles.</p>
                <p className={style.emptyHint}>
                  Pulsa "Actualizar movimientos" para sincronizar con tu banco.
                </p>
              </div>
            ) : (
              <div className={style.txLista}>
                <div className={style.txListaHeader}>
                  <span>Fecha</span>
                  <span>Descripción</span>
                  <span>Importe</span>
                  <span>Acción</span>
                </div>
                {transacciones.map(tx => (
                  <div key={tx.id} className={`${style.txFila} ${tx.importedToPayflow ? style.txImportada : ''}`}>
                    <span className={style.txFecha}>
                      {tx.bookingDate
                        ? new Date(tx.bookingDate).toLocaleDateString('es-ES')
                        : '—'}
                    </span>
                    <span className={style.txDesc}>{tx.description}</span>
                    <span className={`${style.txImporte} ${tx.amount >= 0 ? style.txPositivo : style.txNegativo}`}>
                      {fmtImporte(tx.amount, tx.currency)}
                    </span>
                    <span>
                      {tx.importedToPayflow ? (
                        <span className={style.badgeImportada}>
                          <CheckIcono /> Importada
                        </span>
                      ) : (
                        <button
                          className={style.btnImportar}
                          onClick={() => handleImportar(tx.id)}
                          disabled={importando[tx.id]}
                        >
                          {importando[tx.id] ? '...' : 'Importar'}
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Banca;
