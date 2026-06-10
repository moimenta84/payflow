#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Siembra de la cuenta de DEMO de PayFlow (rol USER) con datos "bonitos".
//
// Crea (o reutiliza) un usuario demo y un contacto, y les rellena transacciones
// variadas y unos movimientos P2P en el monedero, para que al entrar con el
// botón "Demo" de la landing el dashboard, las transacciones y la wallet se vean
// llenos y realistas.
//
// Es idempotente: si la cuenta ya existe hace login en vez de registrar, solo
// siembra transacciones si todavía no hay ninguna, y los envíos P2P usan
// Idempotency-Key para no duplicarse al re-ejecutar.
//
// Uso:
//   API_URL=https://payflow.ikermartinezdev.com node backend/seed-demo.mjs
//   (sin API_URL usa http://localhost:8080)
// ─────────────────────────────────────────────────────────────────────────────

const API = (process.env.API_URL || "http://localhost:8080").replace(/\/$/, "");

// Credenciales de la cuenta demo (las que usa el botón "Demo" de la landing).
const DEMO = {
  nombre: "Lucía", apellido: "Demo",
  email: "demo@payflow.com", password: "demo1234",
  saldoInicial: 8450.0,
};
// Contacto secundario: solo sirve para generar movimientos P2P realistas.
const CONTACT = {
  nombre: "Carlos", apellido: "Ruiz",
  email: "carlos.demo@payflow.com", password: "demo1234",
};

async function call(method, path, { token, body, idem } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idem) headers["Idempotency-Key"] = idem;
  const res = await fetch(`${API}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

// El id del usuario es el "subject" (sub) del JWT: lo extraemos del propio token.
function userIdFromToken(token) {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  return payload.sub;
}

// Login si ya existe; si no, registro. Devuelve { token, id, created }.
async function ensureUser(u) {
  let r = await call("POST", "/auth/login", { body: { email: u.email, password: u.password } });
  if (r.status === 200) return { token: r.data.token, id: userIdFromToken(r.data.token), created: false };
  r = await call("POST", "/auth/register", { body: u });
  if (r.status === 200) return { token: r.data.token, id: userIdFromToken(r.data.token), created: true };
  throw new Error(`No se pudo crear/loguear ${u.email}: ${r.status} ${JSON.stringify(r.data)}`);
}

// Fecha (YYYY-MM-DD) de hace n días, para repartir los movimientos en el tiempo.
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Transacciones de ejemplo (ingresos y gastos variados por categoría y fecha).
const TX = [
  { tipo: "INGRESO", categoria: "SALARIO",      descripcion: "Nómina mensual",         cantidad: 2450.0, fecha: daysAgo(2) },
  { tipo: "INGRESO", categoria: "OTROS",        descripcion: "Proyecto freelance web", cantidad: 850.0,  fecha: daysAgo(9) },
  { tipo: "INGRESO", categoria: "OTROS",        descripcion: "Devolución de Hacienda", cantidad: 320.5,  fecha: daysAgo(24) },
  { tipo: "GASTO",   categoria: "VIVIENDA",     descripcion: "Alquiler del piso",      cantidad: 780.0,  fecha: daysAgo(3) },
  { tipo: "GASTO",   categoria: "ALIMENTACION", descripcion: "Compra Mercadona",       cantidad: 64.3,   fecha: daysAgo(4) },
  { tipo: "GASTO",   categoria: "ALIMENTACION", descripcion: "Cena con amigos",        cantidad: 38.9,   fecha: daysAgo(7) },
  { tipo: "GASTO",   categoria: "TRANSPORTE",   descripcion: "Gasolina",               cantidad: 55.0,   fecha: daysAgo(8) },
  { tipo: "GASTO",   categoria: "TRANSPORTE",   descripcion: "Abono de transporte",    cantidad: 21.4,   fecha: daysAgo(12) },
  { tipo: "GASTO",   categoria: "OCIO",         descripcion: "Suscripción Netflix",    cantidad: 13.99,  fecha: daysAgo(14) },
  { tipo: "GASTO",   categoria: "OCIO",         descripcion: "Entradas de cine",       cantidad: 18.0,   fecha: daysAgo(16) },
  { tipo: "GASTO",   categoria: "SALUD",        descripcion: "Farmacia",               cantidad: 12.75,  fecha: daysAgo(19) },
  { tipo: "GASTO",   categoria: "VIVIENDA",     descripcion: "Factura de luz",         cantidad: 71.2,   fecha: daysAgo(22) },
  { tipo: "GASTO",   categoria: "EDUCACION",    descripcion: "Curso online de React",  cantidad: 49.99,  fecha: daysAgo(27) },
];

(async () => {
  console.log(`API: ${API}`);

  const demo = await ensureUser(DEMO);
  console.log(`demo:     ${DEMO.email} (${demo.created ? "creado" : "ya existía"})`);
  const contact = await ensureUser(CONTACT);
  console.log(`contacto: ${CONTACT.email} (${contact.created ? "creado" : "ya existía"})`);

  // Transacciones: solo si la cuenta aún no tiene ninguna.
  const existing = await call("GET", "/transactions", { token: demo.token });
  if (Array.isArray(existing.data) && existing.data.length > 0) {
    console.log(`transacciones: ya hay ${existing.data.length}, no se siembran`);
  } else {
    let ok = 0;
    for (const t of TX) {
      const r = await call("POST", "/transactions", { token: demo.token, body: t });
      if (r.status === 200) ok++;
      else console.log(`  ! tx "${t.descripcion}": ${r.status} ${JSON.stringify(r.data)}`);
    }
    console.log(`transacciones: ${ok}/${TX.length} creadas`);
  }

  // Monedero: provisiona ambas wallets (saldo de bienvenida) y siembra P2P.
  await call("GET", "/wallet/me", { token: demo.token });
  await call("GET", "/wallet/me", { token: contact.token });
  const sends = [
    { from: contact, to: demo,    amount: 35.0,  description: "Entradas concierto",   key: "seed-p2p-1" },
    { from: demo,    to: contact, amount: 12.5,  description: "Te invito al café",    key: "seed-p2p-2" },
    { from: contact, to: demo,    amount: 20.0,  description: "Devolución de la cena", key: "seed-p2p-3" },
  ];
  for (const s of sends) {
    const r = await call("POST", "/wallet/send", {
      token: s.from.token, idem: s.key,
      body: { toUserId: s.to.id, amount: s.amount, description: s.description },
    });
    if (r.status !== 200) console.log(`  ! P2P ${s.key}: ${r.status} ${JSON.stringify(r.data)}`);
  }
  console.log("wallet: movimientos P2P sembrados");

  console.log("\n✓ Cuenta demo lista:");
  console.log(`   email:    ${DEMO.email}`);
  console.log(`   password: ${DEMO.password}`);
})().catch((e) => {
  console.error("ERROR seed:", e.message);
  process.exit(1);
});
