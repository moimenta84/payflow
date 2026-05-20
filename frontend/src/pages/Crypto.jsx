import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
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

function Crypto() {
  const [precios, setPrecios]         = useState([]);
  const [historial, setHistorial]     = useState({});
  const [alertas, setAlertas]         = useState([]);
  const [tabActiva, setTabActiva]     = useState('precios');
  const [cargando, setCargando]       = useState(true);

  // Formulario nueva alerta
  const [formAlerta, setFormAlerta] = useState({
    asset: 'bitcoin',
    targetPrice: '',
    direction: 'ABOVE',
  });
  const [errAlerta, setErrAlerta] = useState('');

  const cargarPrecios = useCallback(async () => {
    try {
      const data = await api.get('/prices');
      setPrecios(data);

      // Acumular historial para los gráficos (máx 20 puntos)
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
      // CoinGecko puede fallar si el servicio no está arrancado
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarAlertas = useCallback(async () => {
    try {
      const data = await api.get('/alerts');
      setAlertas(data);
    } catch { /* el servicio puede no estar disponible */ }
  }, []);

  useEffect(() => {
    cargarPrecios();
    cargarAlertas();
    const id = setInterval(cargarPrecios, 30000);
    return () => clearInterval(id);
  }, [cargarPrecios, cargarAlertas]);

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
    } catch (err) {
      setErrAlerta('Error al crear la alerta');
    }
  };

  const handleEliminarAlerta = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlertas(prev => prev.filter(a => a.id !== id));
    } catch { /* ignorar */ }
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
              {/* Cards de precios actuales */}
              <div className={style.cardsGrid}>
                {precios.map(p => (
                  <div key={p.asset} className={style.card}>
                    <span className={style.cardAsset}>{ASSET_LABELS[p.asset] || p.asset}</span>
                    <span
                      className={style.cardPrecio}
                      style={{ color: ASSET_COLORS[p.asset] || '#888' }}
                    >
                      ${p.priceUsd.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Gráficos de evolución */}
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

      {/* ── TAB ALERTAS ── */}
      {tabActiva === 'alertas' && (
        <div className={style.contenidoAlertas}>
          {/* Formulario crear alerta */}
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

          {/* Lista de alertas */}
          {alertas.length === 0 ? (
            <p className={style.vacio}>No tienes alertas configuradas.</p>
          ) : (
            <div className={style.listaAlertas}>
              {alertas.map(a => (
                <div
                  key={a.id}
                  className={`${style.alertaItem} ${a.triggered ? style.alertaDisparada : ''}`}
                >
                  <div className={style.alertaInfo}>
                    <span className={style.alertaAsset}
                      style={{ color: ASSET_COLORS[a.asset] || '#888' }}>
                      {ASSET_LABELS[a.asset] || a.asset}
                    </span>
                    <span className={style.alertaDir}>
                      {a.direction === 'ABOVE' ? '↑ Sube por encima de' : '↓ Baja por debajo de'}
                    </span>
                    <span className={style.alertaPrecio}>
                      ${a.targetPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                    {a.triggered && (
                      <span className={style.badgeDisparada}>Disparada</span>
                    )}
                  </div>
                  {!a.triggered && (
                    <button
                      className={style.btnEliminar}
                      onClick={() => handleEliminarAlerta(a.id)}
                      aria-label="Eliminar alerta"
                    >
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
