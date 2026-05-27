# PayFlow — Memoria Técnica Sprint 3

**Fecha:** 27 de mayo de 2026  
**Autor:** Iker Martínez Velasco

---

## 1. Objetivo del Sprint 3

Transformar la aplicación de una colección de páginas funcionales en una **experiencia de producto cohesionada**, con un dashboard unificado como punto de entrada y soporte completo para dispositivos móviles.

| Tarea | Descripción |
|-------|-------------|
| **Dashboard unificado** | Rediseño completo de `Home.jsx` — visión global de saldo, resumen financiero mensual, accesos rápidos y últimas transacciones |
| **Navbar responsive** | Menú hamburguesa para pantallas < 768px |
| **Responsive general** | CSS adaptativo en Home y Navbar para móvil |

---

## 2. Dashboard unificado (`/home`)

### 2.1 Diseño anterior vs nuevo

| Antes | Después |
|-------|---------|
| CRUD completo de transacciones en Home | CRUD movido a `/transacciones` (ya existía) |
| Sin datos del wallet | Tarjeta de saldo en tiempo real |
| Sin resumen mensual visual | Barra de progreso ingresos/gastos |
| Sin accesos rápidos | 4 botones de acceso rápido |
| Sin últimas transacciones resumidas | Lista de las 5 más recientes |

### 2.2 Estructura del dashboard

```
┌────────────────────────────────────────────────┐
│  Buenas tardes, Iker          [Avatar]          │
│  mayo 2026                                      │
├──────────┬──────────┬──────────┬───────────────┤
│  Wallet  │ Ingresos │  Gastos  │ Balance mes   │
│  € 50.00 │ € 1.200  │ € 420    │ +€ 780        │
├────────────────────────────────────────────────┤
│  Distribución mensual ░░░░░░░░░░░░░░ 35%       │
│  ● Ingresos: €1.200  ● Gastos: €420            │
├────────────────────────────────────────────────┤
│  Accesos rápidos                               │
│  [Nueva tx] [Enviar €] [Banco ✓] [Facturas]   │
├────────────────────────────────────────────────┤
│  Últimas transacciones            Ver todas →  │
│  ● Salario           SALARIO · 01 may  +€1.200 │
│  ● Supermercado      ALIMENT · 03 may  -€ 45   │
│  ...                                           │
└────────────────────────────────────────────────┘
```

### 2.3 APIs consumidas en paralelo

El dashboard carga datos de tres servicios simultáneamente con `Promise.allSettled`, de forma que si un servicio falla no bloquea el resto:

```javascript
const [w, t, b] = await Promise.allSettled([
  api.get("/wallet/me"),       // wallet-service
  listTransacciones(),         // transaction-service
  api.get("/bank/status"),     // bank-service
]);
```

`Promise.allSettled` en lugar de `Promise.all` garantiza que un error puntual (p.ej. wallet-service caído) no deje el dashboard en blanco.

### 2.4 Cálculos del mes actual

El filtrado por mes se hace en el frontend sobre los datos recibidos del servidor. No requiere endpoint adicional:

```javascript
const esMes = (t) => {
  const d = new Date(t.fecha);
  return d.getMonth() === mes && d.getFullYear() === anio;
};
const ing = delMes.filter(t => t.tipo === "INGRESO").reduce((s, t) => s + t.cantidad, 0);
const gas = delMes.filter(t => t.tipo === "GASTO").reduce((s, t) => s + t.cantidad, 0);
```

### 2.5 Tarjetas de resumen (stat cards)

Cuatro tarjetas con icono, etiqueta y valor:

| Card | Dato | Color |
|------|------|-------|
| Saldo Wallet | `wallet.balance` | Teal `#0891b2` |
| Ingresos este mes | Suma de INGRESO del mes | Verde `#059669` |
| Gastos este mes | Suma de GASTO del mes | Rojo `#ef4444` |
| Balance mensual | Ingresos − Gastos | Ámbar si neutro, verde si positivo, rojo si negativo |

### 2.6 Barra de progreso

Muestra el porcentaje del presupuesto mensual consumido en gastos respecto a los ingresos:

```
porcentaje = (gastos / ingresos) * 100
```

El fill usa un gradiente `teal → rojo` que visualmente indica el estado de salud financiera. Si supera el 100%, el fill se limita al 100% con `Math.min(100, ...)`.

### 2.7 Accesos rápidos

Cuatro enlaces con icono y etiqueta:

- **Nueva transacción** → `/transacciones`
- **Enviar dinero** → `/wallet`
- **Banco** → `/banco` (muestra "Banco vinculado ✓" si `bank.status === "LINKED"`)
- **Facturas** → `/autonomos`

El botón de banco cambia de color según el estado de la conexión bancaria: naranja si no conectado, verde si vinculado.

---

## 3. Navbar responsive

### 3.1 Problema anterior

En pantallas < 640px, el Navbar ocultaba todos los enlaces (`display: none`) sin ofrecer alternativa de navegación. El usuario no podía acceder a ninguna sección en móvil.

### 3.2 Solución implementada

Menú hamburguesa que aparece en pantallas < 768px y despliega un panel vertical con todos los enlaces:

**Componentes añadidos:**
- Botón `.hamburger` (≡ / ✕) con `display: none` en escritorio, `display: flex` en móvil
- `div.mobileMenu` — panel desplegable con fondo `var(--bg-app)` y `position: fixed`
- `div.overlay` — capa semitransparente detrás del menú que cierra al hacer click

**Gestión de estado:**
```javascript
const [menuOpen, setMenuOpen] = useState(false);

// Cierre automático al cambiar de ruta
useEffect(() => { setMenuOpen(false); }, [location.pathname]);
```

**Breakpoints:**
```css
@media (max-width: 768px) {
  .navLinks  { display: none; }   /* ocultar links escritorio */
  .hamburger { display: flex; }   /* mostrar hamburguesa */
}

@media (max-width: 640px) {
  .nombre  { display: none; }    /* ocultar nombre de usuario */
}
```

### 3.3 UX del menú móvil

- El menú se abre sobre el contenido (z-index 99), por encima del overlay (z-index 98)
- El overlay oscurece el fondo y cierra el menú al tocarlo
- El enlace activo se resalta con color teal y fondo tenue
- Al navegar, el menú se cierra automáticamente (efecto en `location.pathname`)

---

## 4. Mejoras de responsive en Home

El nuevo `Home.module.css` incluye breakpoints adaptivos para todos los elementos:

| Elemento | Escritorio | Tablet (768px) | Móvil (480px) |
|----------|-----------|----------------|---------------|
| Stats grid | 4 columnas | 2 columnas | 2 columnas (más compacto) |
| Acciones grid | 4 columnas | — | 2 columnas |
| Hero avatar | 52px | — | 42px |
| Nombre | 1.75rem | — | 1.4rem |

---

## 5. Separación de responsabilidades (refactoring)

Con el Sprint 3, la aplicación tiene una separación clara de responsabilidades:

| Ruta | Propósito |
|------|-----------|
| `/home` | **Dashboard** — visión global, accesos rápidos, alertas |
| `/transacciones` | **CRUD completo** de ingresos y gastos |
| `/wallet` | **Wallet EUR** — saldo, movimientos, transferencias P2P |
| `/banco` | **Open Banking** — conexión y sincronización bancaria |
| `/autonomos` | **Gestión fiscal** — facturas, gastos, impuestos |

Esta separación sigue el principio de **Single Responsibility** a nivel de página: cada ruta tiene una única responsabilidad clara.

---

## 6. Checklist de verificación

```
Frontend:
[✓] npm run build → 0 errores
[✓] Home.jsx — dashboard con 4 stat cards
[✓] Home.jsx — barra de progreso ingresos/gastos
[✓] Home.jsx — 4 accesos rápidos con enlace correcto
[✓] Home.jsx — últimas 5 transacciones
[✓] Navbar — hamburguesa visible en < 768px
[✓] Navbar — menú desplegable con todos los links
[✓] Navbar — cierre automático al navegar
[✓] Navbar — overlay para cerrar al tocar fuera
[✓] Home CSS — stats 4col → 2col en tablet → 2col compacto en móvil
[✓] Home CSS — acciones 4col → 2col en móvil

Datos:
[✓] Saldo wallet cargado de /wallet/me
[✓] Ingresos/gastos calculados de /transactions filtrado por mes
[✓] Estado banco reflejado en botón de acceso rápido
[✓] Últimas 5 transacciones ordenadas por fecha desc
[✓] Promise.allSettled — fallo de un servicio no bloquea el resto
```
