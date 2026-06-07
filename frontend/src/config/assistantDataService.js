import { api } from './api';

// Servicio de datos del asistente: traduce el lenguaje del usuario a consultas concretas al backend.

// Códigos de categoría → nombre legible para mostrar en las respuestas del asistente.
const CAT_LABELS = {
  SALARIO: 'salario', ALIMENTACION: 'alimentación', VIVIENDA: 'vivienda',
  TRANSPORTE: 'transporte', SALUD: 'salud', OCIO: 'ocio',
  EDUCACION: 'educación', OTROS: 'otros',
};

// Diccionario de sinónimos: detecta la categoría aunque el usuario use otra palabra (p. ej. "nómina" → SALARIO).
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

// Busca en el texto alguna palabra del diccionario de sinónimos y devuelve su categoría.
export function extractCategoria(text) {
  const t = text.toLowerCase();
  for (const alias of Object.keys(CAT_ALIASES)) {
    if (t.includes(alias)) return CAT_ALIASES[alias];
  }
  return null;
}

// Interpreta expresiones de tiempo ("hoy", "este mes", "año pasado"...) y devuelve un rango de fechas.
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

// Filtra una lista de transacciones para quedarnos solo con las del rango de fechas indicado.
function filtrarPorPeriodo(txns, periodo) {
  return txns.filter(t => {
    const f = new Date(t.fecha);
    return f >= periodo.from && f <= periodo.to;
  });
}

// Consulta el saldo actual de la wallet del usuario.
export async function getSaldo() {
  const w = await api.get('/wallet/me');
  return { balance: w.balance, currency: w.currency || 'EUR' };
}

// Resume ingresos, gastos y balance de un periodo (opcionalmente filtrado por categoría).
export async function getResumenPeriodo(periodo, categoria = null) {
  const all = await api.get('/transactions');
  let txns = filtrarPorPeriodo(all, periodo);
  if (categoria) txns = txns.filter(t => t.categoria === categoria);

  const gastos   = txns.filter(t => t.tipo === 'GASTO')  .reduce((s,t) => s + t.cantidad, 0);
  const ingresos = txns.filter(t => t.tipo === 'INGRESO').reduce((s,t) => s + t.cantidad, 0);

  return { gastos, ingresos, balance: ingresos - gastos, count: txns.length };
}

// Devuelve las categorías donde más se ha gastado en el periodo, ordenadas de mayor a menor.
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

// Devuelve las n transacciones más recientes, ordenadas de la más nueva a la más antigua.
export async function getMovimientosRecientes(n = 5) {
  const all = await api.get('/transactions');
  const sorted = [...all].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  return sorted.slice(0, n);
}

export { CAT_LABELS };
