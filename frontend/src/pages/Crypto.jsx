import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../config/api';
import style from '../styles/Crypto.module.css';

const ASSET_COLORS = {
  bitcoin:  '#f7931a',
  ethereum: '#627eea',
  solana:   '#9945ff',
  ripple:   '#346aa9',
};

const ASSET_LABELS = {
  bitcoin:  'Bitcoin',
  ethereum: 'Ethereum',
  solana:   'Solana',
  ripple:   'XRP',
};

const ASSET_SYMBOLS = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP',
};

function Crypto() {
  const [precios, setPrecios]         = useState([]);
  const [historial, setHistorial]     = useState({});
  const [alertas, setAlertas]         = useState([]);
  const [tabActiva, setTabActiva]     = useState('precios');
  const [cargando, setCargando]       = useState(true);

  // Trading state
  const [portfolio, setPortfolio]     = useState([]);
  const [ordenes, setOrdenes]         = useState([]);
  const [cargandoTrade, setCargandoTrade] = useState(false);
  const [formTrade, setFormTrade]     = useState({ asset: 'bitcoin', tipo: 'BUY', amount: '' });
  const [errTrade, setErrTrade]       = useState('');
  const [okTrade, setOkTrade]         = useState('');

  // Alertas form
  const [formAlerta, setFormAlerta] = useState({ asset: 'bitcoin', targetPrice: '', direction: 'ABOVE' });
  const [errAlerta, setErrAlerta] = useState('');

  const cargarPrecios = useCallback(async () => {
    try {
      const data = await api.get('/prices');
      setPrecios(data);
      const ahora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHistorial(prev => {
        const next = { ...prev };
        data.forEach(p => {
          const serie = prev[p.asset] || [];
          next[p.asset] = [...serie.slice(-19), { time: ahora, price: p.priceUsd }];
        });
        return next;
      });
    } catch {
      // CoinGecko puede no estar disponible
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarAlertas = useCallback(async () => {
    try {
      const data = await api.get('/alerts');
      if (Array.isArray(data)) setAlertas(data);
    } catch { /* servicio no disponible */ }
  }, []);

  const cargarPortfolio = useCallback(async () => {
    try {
      const data = await api.get('/portfolio');
      if (Array.isArray(data)) setPortfolio(data);
    } catch { /* trading service puede no estar activo */ }
  }, []);

  const cargarOrdenes = useCallback(async () => {
    try {
      const data = await api.get('/orders');
      if (Array.isArray(data)) setOrdenes(data);
    } catch { /* trading service puede no estar activo */ }
  }, []);

  useEffect(() => {
    cargarPrecios();
    cargarAlertas();
    const id = setInterval(cargarPrecios, 30000);
    return () => clearInterval(id);
  }, [cargarPrecios, cargarAlertas]);

  useEffect(() => {
    if (tabActiva === 'trading') {
      cargarPortfolio();
      cargarOrdenes();
    }
  }, [tabActiva, cargarPortfolio, cargarOrdenes]);

  // ── Precio actual del activo seleccionado ──
  const precioActual = precios.find(p => p.asset === formTrade.asset)?.priceUsd ?? 0;
  const totalEstimado = formTrade.amount && !isNaN(parseFloat(formTrade.amount))
    ? (parseFloat(formTrade.amount) * precioActual).toFixed(2)
    : '0.00';

  const handleEjecutarOrden = async (e) => {
    e.preventDefault();
    setErrTrade('');
    setOkTrade('');
    const cantidad = parseFloat(formTrade.amount);
    if (!cantidad || cantidad <= 0) { setErrTrade('Introduce una cantidad válida'); return; }

    setCargandoTrade(true);
    try {
      await api.post('/orders', {
        asset: formTrade.asset,
        cantidad,
        tipo: formTrade.tipo === 'BUY' ? 'COMPRA' : 'VENTA',
      });
      setOkTrade(`Orden ${formTrade.tipo === 'BUY' ? 'de compra' : 'de venta'} ejecutada correctamente`);
      setFormTrade(p => ({ ...p, amount: '' }));
      cargarPortfolio();
      cargarOrdenes();
    } catch (err) {
      setErrTrade(err.message || 'Error al ejecutar la orden');
    } finally {
      setCargandoTrade(false);
    }
  };

  const handleCrearAlerta = async (e) => {
    e.preventDefault();
    if (!formAlerta.targetPrice || Number(formAlerta.targetPrice) <= 0) {
      setErrAlerta('Introduce un precio objetivo válido');
      return;
    }
    try {
      await api.post('/alerts', {
        asset:       formAlerta.asset,
        targetPrice: Number(formAlerta.targetPrice),
        direction:   formAlerta.direction,
      });
      setFormAlerta({ asset: 'bitcoin', targetPrice: '', direction: 'ABOVE' });
      setErrAlerta('');
      cargarAlertas();
    } catch {
      setErrAlerta('Error al crear la alerta');
    }
  };

  const handleEliminarAlerta = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlertas(prev => prev.filter(a => a.id !== id));
    } catch { /* ignorar */ }
  };

  const getBalance = (asset) => {
    const entry = portfolio.find(p => p.asset === asset);
    return entry ? parseFloat(entry.cantidad) : 0;
  };

  return (
    <div className={style.crypto}>
      <div className={style.header}>
        <h1 className={style.titulo}>Mercado Crypto</h1>
        <div className={style.tabs}>
          <button
            className={`${style.tab} ${tabActiva === 'precios' ? style.tabActiva : ''}`}
            onClick={() => setTabActiva('precios')}
          >
            Precios en vivo
          </button>
          <button
            className={`${style.tab} ${tabActiva === 'trading' ? style.tabActiva : ''}`}
            onClick={() => setTabActiva('trading')}
          >
            Trading
          </button>
          <button
            className={`${style.tab} ${tabActiva === 'alertas' ? style.tabActiva : ''}`}
            onClick={() => setTabActiva('alertas')}
          >
            Alertas ({alertas.filter(a => !a.triggered).length})
          </button>
        </div>
      </div>

      {/* ── TAB PRECIOS ── */}
      {tabActiva === 'precios' && (
        <div className={style.contenidoPrecios}>
          {cargando ? (
            <p className={style.cargando}>Cargando precios...</p>
          ) : (
            <>
              <div className={style.cardsGrid}>
                {precios.map(p => (
                  <div key={p.asset} className={style.card}>
                    <span className={style.cardAsset}>{ASSET_LABELS[p.asset] || p.asset}</span>
                    <span className={style.cardPrecio} style={{ color: ASSET_COLORS[p.asset] || '#888' }}>
                      ${p.priceUsd.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              {precios.map(p => (
                <div key={p.asset} className={style.graficoCard}>
                  <h3 className={style.graficoTitulo}>
                    {ASSET_LABELS[p.asset] || p.asset} — evolución
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={historial[p.asset] || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 11 }}
                        tickFormatter={v => `$${v.toLocaleString()}`}
                      />
                      <Tooltip
                        formatter={v => [`$${v.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, 'Precio']}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke={ASSET_COLORS[p.asset] || '#888'}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── TAB TRADING ── */}
      {tabActiva === 'trading' && (
        <div className={style.contenidoTrading}>

          {/* Portfolio */}
          <section className={style.portfolioSection}>
            <h3 className={style.sectionTitulo}>Mi portfolio</h3>
            {portfolio.length === 0 ? (
              <p className={style.vacio}>Sin datos de portfolio. Realiza tu primera operación.</p>
            ) : (
              <div className={style.portfolioGrid}>
                {portfolio.map(entry => (
                  <div key={entry.asset} className={style.portfolioCard}>
                    <span className={style.portfolioAsset}
                      style={{ color: ASSET_COLORS[entry.asset] || '#6366f1' }}>
                      {entry.asset === 'USDT' ? '💵 USDT' : `${ASSET_SYMBOLS[entry.asset?.toLowerCase()] || entry.asset}`}
                    </span>
                    <span className={style.portfolioAmount}>
                      {parseFloat(entry.cantidad).toLocaleString('es-ES', {
                        minimumFractionDigits: entry.asset === 'USDT' ? 2 : 6,
                        maximumFractionDigits: entry.asset === 'USDT' ? 2 : 6,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Formulario de trading */}
          <section className={style.tradingSection}>
            <h3 className={style.sectionTitulo}>Nueva orden</h3>
            <form onSubmit={handleEjecutarOrden} className={style.formTrade}>
              {/* Selector BUY / SELL */}
              <div className={style.tipoOrden}>
                <button
                  type="button"
                  className={`${style.tipoBtn} ${formTrade.tipo === 'BUY' ? style.tipoBuy : ''}`}
                  onClick={() => setFormTrade(p => ({ ...p, tipo: 'BUY' }))}
                >
                  Comprar
                </button>
                <button
                  type="button"
                  className={`${style.tipoBtn} ${formTrade.tipo === 'SELL' ? style.tipoSell : ''}`}
                  onClick={() => setFormTrade(p => ({ ...p, tipo: 'SELL' }))}
                >
                  Vender
                </button>
              </div>

              <div className={style.tradeRow}>
                <select
                  value={formTrade.asset}
                  onChange={e => setFormTrade(p => ({ ...p, asset: e.target.value }))}
                  className={style.select}
                >
                  {Object.entries(ASSET_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Cantidad"
                  min="0"
                  step="any"
                  value={formTrade.amount}
                  onChange={e => setFormTrade(p => ({ ...p, amount: e.target.value }))}
                  className={style.input}
                />
              </div>

              {precioActual > 0 && (
                <p className={style.totalEstimado}>
                  Precio: <strong>${precioActual.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
                  &nbsp;·&nbsp;Total estimado: <strong>${parseFloat(totalEstimado).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
                  {formTrade.tipo === 'BUY' && (
                    <>&nbsp;· Saldo USDT: <strong>${getBalance('USDT').toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong></>
                  )}
                </p>
              )}

              {errTrade && <p className={style.error}>{errTrade}</p>}
              {okTrade  && <p className={style.success}>{okTrade}</p>}

              <button type="submit" className={`${style.btnEjecutar} ${formTrade.tipo === 'SELL' ? style.btnVender : ''}`}
                disabled={cargandoTrade}>
                {cargandoTrade ? 'Procesando...' : formTrade.tipo === 'BUY' ? 'Ejecutar compra' : 'Ejecutar venta'}
              </button>
            </form>
          </section>

          {/* Historial de órdenes */}
          <section className={style.ordenesSection}>
            <h3 className={style.sectionTitulo}>Historial de órdenes</h3>
            {ordenes.length === 0 ? (
              <p className={style.vacio}>No hay órdenes ejecutadas aún.</p>
            ) : (
              <div className={style.tablaOrdenes}>
                <div className={style.tablaHeader}>
                  <span>Fecha</span><span>Tipo</span><span>Activo</span>
                  <span>Cantidad</span><span>Precio</span><span>Total</span>
                </div>
                {ordenes.slice(0, 20).map(o => (
                  <div key={o.id} className={style.tablaFila}>
                    <span>{o.fecha ? new Date(o.fecha).toLocaleDateString('es-ES') : '—'}</span>
                    <span className={o.tipo === 'COMPRA' ? style.badgeBuy : style.badgeSell}>
                      {o.tipo === 'COMPRA' ? 'Compra' : 'Venta'}
                    </span>
                    <span>{ASSET_LABELS[o.asset?.toLowerCase()] || o.asset}</span>
                    <span>{parseFloat(o.cantidad ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 6 })}</span>
                    <span>${parseFloat(o.precioUnitario ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    <span>${parseFloat(o.total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── TAB ALERTAS ── */}
      {tabActiva === 'alertas' && (
        <div className={style.contenidoAlertas}>
          <form onSubmit={handleCrearAlerta} className={style.formAlerta}>
            <h3 className={style.formTitulo}>Nueva alerta de precio</h3>

            <div className={style.formRow}>
              <select
                value={formAlerta.asset}
                onChange={e => setFormAlerta(p => ({ ...p, asset: e.target.value }))}
                className={style.select}
              >
                {Object.entries(ASSET_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <select
                value={formAlerta.direction}
                onChange={e => setFormAlerta(p => ({ ...p, direction: e.target.value }))}
                className={style.select}
              >
                <option value="ABOVE">Sube por encima de</option>
                <option value="BELOW">Baja por debajo de</option>
              </select>

              <input
                type="number"
                placeholder="Precio ($)"
                min="0"
                step="0.01"
                value={formAlerta.targetPrice}
                onChange={e => setFormAlerta(p => ({ ...p, targetPrice: e.target.value }))}
                className={style.input}
              />

              <button type="submit" className={style.btnCrear}>Crear alerta</button>
            </div>

            {errAlerta && <p className={style.error}>{errAlerta}</p>}
          </form>

          {alertas.length === 0 ? (
            <p className={style.vacio}>No tienes alertas configuradas.</p>
          ) : (
            <div className={style.listaAlertas}>
              {alertas.map(a => (
                <div key={a.id} className={`${style.alertaItem} ${a.triggered ? style.alertaDisparada : ''}`}>
                  <div className={style.alertaInfo}>
                    <span className={style.alertaAsset} style={{ color: ASSET_COLORS[a.asset] || '#888' }}>
                      {ASSET_LABELS[a.asset] || a.asset}
                    </span>
                    <span className={style.alertaDir}>
                      {a.direction === 'ABOVE' ? '↑ Sube por encima de' : '↓ Baja por debajo de'}
                    </span>
                    <span className={style.alertaPrecio}>
                      ${a.targetPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                    {a.triggered && <span className={style.badgeDisparada}>Disparada</span>}
                  </div>
                  {!a.triggered && (
                    <button className={style.btnEliminar} onClick={() => handleEliminarAlerta(a.id)} aria-label="Eliminar alerta">
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Crypto;
