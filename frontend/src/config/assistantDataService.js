import { api } from './api';

const CAT_LABELS = {
  SALARIO: 'salario', ALIMENTACION: 'alimentación', VIVIENDA: 'vivienda',
  TRANSPORTE: 'transporte', SALUD: 'salud', OCIO: 'ocio',
  EDUCACION: 'educación', OTROS: 'otros',
};

const CAT_ALIASES = {
  salario: 'SALARIO', nomina: 'SALARIO', nómina: 'SALARIO',
  alimentacion: 'ALIMENTACION', alimentación: 'ALIMENTACION', comida: 'ALIMENTACION',
  super: 'ALIMENTACION', supermercado: 'ALIMENTACION',
  vivienda: 'VIVIENDA', alquiler: 'VIVIENDA', hipoteca: 'VIVIENDA', casa: 'VIVIENDA',
  transporte: 'TRANSPORTE', gasolina: 'TRANSPORTE', coche: 'TRANSPORTE',
  salud: 'SALUD', medico: 'SALUD', médico: 'SALUD', farmacia: 'SALUD',
  ocio: 'OCIO', diversion: 'OCIO', diversión: 'OCIO', entretenimiento: 'OCIO',
  cine: 'OCIO', restaurante: 'OCIO',
  educacion: 'EDUCACION', educación: 'EDUCACION', estudios: 'EDUCACION', libros: 'EDUCACION',
  otros: 'OTROS',
};

export function extractCategoria(text) {
  const t = text.toLowerCase();
  for (const alias of Object.keys(CAT_ALIASES)) {
    if (t.includes(alias)) return CAT_ALIASES[alias];
  }
  return null;
}

export function extractPeriodo(text) {
  const t = text.toLowerCase();
  const now = new Date();

  if (/\bhoy\b/.test(t)) {
    const d = new Date(now); d.setHours(0,0,0,0);
    return { from: d, to: now, label: 'hoy' };
  }
  if (/\bayer\b/.test(t)) {
    const d = new Date(now); d.setDate(d.getDate()-1); d.setHours(0,0,0,0);
    const e = new Date(d); e.setHours(23,59,59,999);
    return { from: d, to: e, label: 'ayer' };
  }
  if (/(esta\s+semana|semana\s+actual)/.test(t)) {
    const d = new Date(now); const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1); d.setHours(0,0,0,0);
    return { from: d, to: now, label: 'esta semana' };
  }
  if (/(este\s+mes|mes\s+actual|del\s+mes)/.test(t)) {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: d, to: now, label: 'este mes' };
  }
  if (/(mes\s+pasado|último\s+mes|ultimo\s+mes)/.test(t)) {
    const d = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { from: d, to: e, label: 'el mes pasado' };
  }
  if (/(este\s+año|año\s+actual|del\s+año)/.test(t)) {
    const d = new Date(now.getFullYear(), 0, 1);
    return { from: d, to: now, label: 'este año' };
  }
  // por defecto: este mes
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: d, to: now, label: 'este mes' };
}

function filtrarPorPeriodo(txns, periodo) {
  return txns.filter(t => {
    const f = new Date(t.fecha);
    return f >= periodo.from && f <= periodo.to;
  });
}

export async function getSaldo() {
  const w = await api.get('/wallet/me');
  return { balance: w.balance, currency: w.currency || 'EUR' };
}

export async function getResumenPeriodo(periodo, categoria = null) {
  const all = await api.get('/transactions');
  let txns = filtrarPorPeriodo(all, periodo);
  if (categoria) txns = txns.filter(t => t.categoria === categoria);

  const gastos   = txns.filter(t => t.tipo === 'GASTO')  .reduce((s,t) => s + t.cantidad, 0);
  const ingresos = txns.filter(t => t.tipo === 'INGRESO').reduce((s,t) => s + t.cantidad, 0);

  return { gastos, ingresos, balance: ingresos - gastos, count: txns.length };
}

export async function getCategoriaTopGasto(periodo) {
  const all = await api.get('/transactions');
  const txns = filtrarPorPeriodo(all, periodo).filter(t => t.tipo === 'GASTO');
  const porCat = {};
  for (const t of txns) {
    porCat[t.categoria] = (porCat[t.categoria] || 0) + t.cantidad;
  }
  const entries = Object.entries(porCat).sort((a,b) => b[1] - a[1]);
  return entries.map(([cat, total]) => ({ categoria: cat, label: CAT_LABELS[cat] || cat.toLowerCase(), total }));
}

export async function getMovimientosRecientes(n = 5) {
  const all = await api.get('/transactions');
  const sorted = [...all].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  return sorted.slice(0, n);
}

export { CAT_LABELS };
