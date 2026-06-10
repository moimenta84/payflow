import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import s from "../styles/Landing.module.css";

// Credenciales de la cuenta de demostración (sembrada con backend/seed-demo.mjs).
const DEMO_EMAIL = "demo@payflow.com";
const DEMO_PASSWORD = "demo1234";

// Página de aterrizaje (landing) pública: presenta el producto, precios y CTA para registrarse.

// ─── Datos de demostración (mock) que rellenan la maqueta visual del dashboard del hero ───

const FEED = [
  { id: "tx_8a3f", label: "Pago a @juan · Cena",            amount: "− € 22.50",     tag: "p2p",     color: "#22d3ee" },
  { id: "tx_9b2c", label: "Nomina · Empresa SL",            amount: "+ € 2,450.00",  tag: "ingreso", color: "#3bdb79" },
  { id: "tx_1d4e", label: "Recarga desde BBVA",             amount: "+ € 200.00",    tag: "topup",   color: "#79c0ff" },
  { id: "tx_7e5f", label: "Factura 2026-04 · cobrada",      amount: "+ € 1,815.00",  tag: "factura", color: "#3bdb79" },
  { id: "tx_2g6h", label: "Mercadona · Alimentacion",       amount: "− € 67.40",     tag: "gasto",   color: "#ef4444" },
  { id: "tx_4i7j", label: "Cobro link · Cliente XYZ",       amount: "+ € 484.00",    tag: "link",    color: "#0891b2" },
  { id: "tx_5k8l", label: "@maria te pidió 15€",            amount: "− € 15.00",     tag: "p2p",     color: "#22d3ee" },
  { id: "tx_3m9n", label: "Iberdrola · Suministros",        amount: "− € 89.30",     tag: "gasto",   color: "#ef4444" },
];

const SPARKLINE = [42, 58, 51, 67, 74, 69, 83, 88, 80, 94, 99];

const DOT_OPS = Array.from({ length: 35 }, (_, i) => {
  const v = ((i * 137.508) % 100) / 100;
  return v > 0.35 ? 0.45 + v * 0.55 : 0.1;
});

// Mapea el nombre del plan a su slug de URL (se pasa a /registro?plan=...).
const PLAN_SLUG = { Free: "free", "Autónomos": "autonomos" };

// Definición de los planes que se pintan en la sección de precios.
const PRICING = [
  {
    name: "Free",
    price: "0",
    desc: "Para empezar a controlar tu dinero",
    features: ["Transacciones ilimitadas", "Categorización automática", "1 cuenta bancaria PSD2", "Informes PDF mensuales"],
    hl: false,
  },
  {
    name: "Autónomos",
    price: "4,99",
    desc: "Para freelancers y autónomos en España",
    features: ["Todo Free incluido", "Facturas con IVA + IRPF", "Modelo 303 y 130 automáticos", "Bancos ilimitados (Open Banking)", "Envíos P2P ilimitados", "PDFs personalizables"],
    hl: true,
  },
];

// ─── Hook contador animado ──────────────────────────────────────────────────────

// Anima un número de 0 hasta 'target' cuando el elemento entra en pantalla (efecto "subida").
function useCounter(target, { format = "plain", duration = 1800 } = {}) {
  // Si el usuario pidió movimiento reducido, arrancamos ya en el valor final (sin animar).
  const reduced = typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [val, setVal] = useState(reduced ? target : 0);
  const ref = useRef(null);

  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node) return;
    // IntersectionObserver detecta cuándo el contador se ve; solo entonces arranca la animación.
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let t0 = null;
      const tick = (ts) => {
        if (!t0) t0 = ts;
        const p = Math.min((ts - t0) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    obs.observe(node);
    return () => obs.disconnect();
  }, [target, duration, reduced]);

  let text;
  if (format === "M")   text = `$${(val / 1e6).toFixed(1)}M`;
  else if (format === "pct") text = `${(val / 100).toFixed(2)}%`;
  else text = val.toLocaleString("es-ES");

  return { text, ref };
}

// ─── Inline SVG icons (replace emojis per design rules) ──────────────────────

function IconWallet({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="22" height="22" className={className}>
      <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  );
}

function IconReceipt({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="22" height="22" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconBank({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="22" height="22" className={className}>
      <rect x="3" y="10" width="18" height="11" rx="1" />
      <path d="M3 10l9-7 9 7" />
      <line x1="12" y1="10" x2="12" y2="21" />
      <line x1="7" y1="14" x2="7" y2="21" />
      <line x1="17" y1="14" x2="17" y2="21" />
    </svg>
  );
}

function IconCheck({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" width="14" height="14" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconPlay({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26" className={className} aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.79-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

function IconPause({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26" className={className} aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

// Alturas (en %) de las barras del ecualizador del podcast; patrón fijo y reproducible.
const EQ_BARS = Array.from({ length: 32 }, (_, i) => 28 + Math.round(40 * Math.abs(Math.sin(i * 0.9))));

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatItem({ target, prefix = "", suffix = "", format, label }) {
  const { text, ref } = useCounter(target, { format });
  return (
    <div className={s.statItem} ref={ref}>
      <span className={s.statNum}>{prefix}{text}{suffix}</span>
      <span className={s.statLbl}>{label}</span>
    </div>
  );
}

function Feed({ height = 200 }) {
  const rows = [...FEED, ...FEED];
  return (
    <div className={s.feedMask} style={{ height }}>
      <div className={s.feedTrack}>
        {rows.map((t, i) => (
          <div key={i} className={s.feedRow}>
            <span className={s.feedDot} style={{ background: t.color }} />
            <div className={s.feedMeta}>
              <span className={s.feedId}>{t.id}</span>
              <span className={s.feedDesc}>{t.label}</span>
            </div>
            <div className={s.feedRight}>
              <span className={s.feedAmt}>{t.amount}</span>
              <span className={`${s.feedTag} ${s["tag_" + t.tag]}`}>{t.tag}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={s.feedFade} />
    </div>
  );
}

// ─── Landing ─────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Entra con la cuenta de demostración de un clic. Si algo falla (cuenta no
  // disponible), cae al login normal para no dejar al usuario bloqueado.
  const handleDemo = async (e) => {
    e?.preventDefault();
    if (demoLoading) return;
    setDemoLoading(true);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      navigate("/home");
    } catch {
      navigate("/login");
    } finally {
      setDemoLoading(false);
    }
  };

  // Reproductor del podcast del CEO: ref al <audio> y estado play/pausa para animar el ecualizador.
  const podAudioRef = useRef(null);
  const [podPlaying, setPodPlaying] = useState(false);
  const togglePod = () => {
    const a = podAudioRef.current;
    if (!a) return;
    if (a.paused) a.play(); else a.pause();
  };

  // Al hacer scroll, marcamos la barra de navegación como "sólida" (cambia su fondo).
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Efecto de aparición: añade la clase 'visible' a cada bloque .reveal cuando entra en pantalla.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add(s.visible);
      }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(`.${s.reveal}`).forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className={s.root}>
      <div className={s.grain} aria-hidden />
      <div className={s.orbA}  aria-hidden />
      <div className={s.orbB}  aria-hidden />

      {/* ══════════════ DARK HERO ZONE (nav + hero + stats) ══════════════ */}
      <div className={s.heroZone}>

      {/* ═══════════════════════════════ NAV ═══════════════════════════════ */}
      <nav className={`${s.nav} ${scrolled ? s.navSolid : ""}`}>
        <div className={s.navWrap}>
          <span className={s.logo}>
            <img src="/payflow_logo_gold.svg" alt="" loading="lazy" width="32" height="32" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Pay<em>Flow</em>
          </span>
          <div className={s.navLinks}>
            <a href="#features">Producto</a>
            <a href="#pricing">Precios</a>
            <a href="#podcast">Podcast</a>
            <a href="#" onClick={handleDemo}>{demoLoading ? "Entrando…" : "Demo"}</a>
          </div>
          <div className={s.navBtns}>
            <button className={s.btnGhost}  onClick={() => navigate("/login")}>Entrar</button>
            <button className={s.btnYellow} onClick={() => navigate("/registro")}>Empezar</button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════ HERO ══════════════════════════════ */}
      <section className={s.hero}>
        <div className={s.heroL}>
          <div className={s.badge}>
            <span className={s.badgePulse} />
            PSD2 — ahora con Open Banking de tu banco
          </div>
          <h1 className={s.h1}>
            Tu dinero.<br />
            <span className={s.grad}>Todo en una app.</span>
          </h1>
          <p className={s.heroSub}>
            Wallet interno, envíos P2P y tu banco real conectado.<br />
            Con facturación de autónomo. En español. Sin Excel.
          </p>
          <div className={s.heroBtns}>
            <button className={s.btnHero}    onClick={() => navigate("/registro")}>Crear cuenta gratis</button>
            <button className={s.btnHeroOut} onClick={handleDemo} disabled={demoLoading}>{demoLoading ? "Entrando…" : "Ver demo ↗"}</button>
          </div>
          <div className={s.proof}>
            <div className={s.avatars}>
              {["AL","MR","SG","JK","DP"].map((a) => (
                <span key={a} className={s.av}>{a}</span>
              ))}
            </div>
            <p className={s.proofTxt}><strong>+12.000 usuarios</strong> ya gestionan su dinero aquí</p>
          </div>
        </div>

        <div className={s.heroR}>
          <div className={s.dashCard}>
            <div className={s.dashHead}>
              <div className={s.dots}>
                <i style={{ background: "#ff5f57" }} />
                <i style={{ background: "#febc2e" }} />
                <i style={{ background: "#28c840" }} />
              </div>
              <span className={s.dashTitle}>PayFlow · Dashboard</span>
              <span className={s.liveTag}><i className={s.liveDot} />Live</span>
            </div>
            <div className={s.dashBody}>
              <div className={s.balRow}>
                <div>
                  <p className={s.balLbl}>Balance total</p>
                  <p className={s.balAmt}>€ 142,847<span>.32</span></p>
                </div>
                <span className={s.balBadge}>↑ +12.4%</span>
              </div>
              <p className={s.feedHd}>Transacciones recientes</p>
              <Feed height={190} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ STATS ═════════════════════════════ */}
      <div className={s.statsBar}>
        <StatItem target={12000}   suffix="+" label="usuarios activos" />
        <StatItem target={8400000} format="M" label="gestionado por usuarios" />
        <StatItem target={9997} format="pct"  label="uptime garantizado" />
        <StatItem target={0}                  label="comisiones ocultas" />
      </div>

      </div>{/* /heroZone */}

      {/* ════════════════════════════════ BENTO ════════════════════════════ */}
      <section className={s.bentoSection} id="features">
        <div className={s.bentoWrap}>
          <p className={s.eyebrow}>Producto</p>
          <h2 className={`${s.h2} ${s.reveal}`}>
            Todo lo que necesitas.<br />
            <span className={s.gradG}>Nada que no uses.</span>
          </h2>
          <div className={s.bento}>

            {/* MAIN — Transacciones */}
            <div className={`${s.bc} ${s.bMain} ${s.reveal}`}>
              <p className={s.bEye}>Tiempo real</p>
              <h3 className={s.bTitle}>Transacciones en vivo</h3>
              <p className={s.bDesc}>Cada movimiento aparece al instante. Categorías automáticas, filtros y exportación a PDF.</p>
              <Feed height={220} />
            </div>

            {/* STAT — usuarios activos */}
            <div className={`${s.bc} ${s.bStat} ${s.reveal}`}>
              <p className={s.bEye}>Comunidad</p>
              <p className={s.bigN}>12k<sup>+</sup></p>
              <p className={s.bigL}>usuarios activos</p>
              <div className={s.dotGrid}>
                {DOT_OPS.map((op, i) => (
                  <span key={i} className={s.dotCell} style={{ opacity: op }} />
                ))}
              </div>
            </div>

            {/* STAT — uptime */}
            <div className={`${s.bc} ${s.bUptime} ${s.reveal}`}>
              <p className={s.bEye}>Fiabilidad</p>
              <p className={s.bigN}>99.97<sup>%</sup></p>
              <p className={s.bigL}>uptime garantizado</p>
              <div className={s.spark}>
                {SPARKLINE.map((h, i) => (
                  <span key={i} className={s.sparkBar} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            {/* WALLET interno */}
            <div className={`${s.bc} ${s.bWallet} ${s.reveal}`}>
              <span className={s.bIco}><IconWallet /></span>
              <h3 className={s.bTitle}>Wallet y P2P</h3>
              <p className={s.bDesc}>Saldo interno, envíos a otros usuarios y cobros por link. Sin comisiones ocultas.</p>
              <div className={s.walletMini}>
                <div className={s.wRow}><span>Saldo PayFlow</span><span className={s.wAmt}>€ 342.50</span></div>
                <div className={s.wRow}><span>@juan te envió</span><span className={s.wPend}>+ € 20.00</span></div>
                <div className={s.wBar}><div className={s.wBarFill} style={{ width: "62%" }} /></div>
              </div>
            </div>

            {/* AUTONOMOS facturas */}
            <div className={`${s.bc} ${s.bSplit} ${s.reveal}`}>
              <span className={s.bIco}><IconReceipt /></span>
              <h3 className={s.bTitle}>Facturas autónomos</h3>
              <p className={s.bDesc}>IVA y IRPF calculados automáticamente. Modelo 303 y 130 listos para Hacienda.</p>
              <div className={s.splitViz}>
                <div className={s.sBar}><div className={s.sFill}>IVA 21%</div><div className={s.sRest}>IRPF 15%</div></div>
                <div className={s.sLabels}><span>Repercutido</span><span>Retención</span></div>
              </div>
            </div>

            {/* WIDE — Open Banking PSD2 */}
            <div className={`${s.bc} ${s.bWide} ${s.reveal}`}>
              <div className={s.wideLeft}>
                <span className={s.bIco}><IconBank /></span>
                <h3 className={s.bTitle}>Tu banco real, conectado vía PSD2</h3>
                <p className={s.bDesc}>Open Banking europeo. Importa transacciones de Santander, BBVA o CaixaBank. Sin compartir credenciales.</p>
              </div>
              <div className={s.flow}>
                {["Tu banco", "PSD2", "GoCardless", "PayFlow", "Tu app"].map((n, i, arr) => (
                  <React.Fragment key={n}>
                    <div className={s.fNode}>{n}</div>
                    {i < arr.length - 1 && <span className={s.fArr}>·</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ PODCAST CEO ═══════════════════════ */}
      <section className={s.podSection} id="podcast">
        <div className={s.podGlowA} aria-hidden />
        <div className={s.podGlowB} aria-hidden />
        <div className={s.podWrap}>
          <p className={s.podEyebrow}>Detrás de PayFlow</p>
          <h2 className={`${s.podH2} ${s.reveal}`}>
            Escucha al CEO.<br />
            <span className={s.podGrad}>La historia, sin filtros.</span>
          </h2>

          <div className={`${s.podCard} ${podPlaying ? s.podCardLive : ""} ${s.reveal}`}>
            {/* Carátula con logo y ecualizador animado */}
            <div className={s.podArt}>
              <span className={s.podEp}>EP. 01</span>
              <img className={s.podArtLogo} src="/payflow_logo_gold.svg" alt="" loading="lazy" width="84" height="84" />
              <div className={`${s.podEq} ${podPlaying ? s.podEqLive : ""}`} aria-hidden>
                {EQ_BARS.map((h, i) => (
                  <span key={i} className={s.podEqBar} style={{ height: `${h}%`, animationDelay: `${(i % 8) * 0.09}s` }} />
                ))}
              </div>
            </div>

            {/* Contenido del episodio */}
            <div className={s.podBody}>
              <span className={s.podTag}>
                <i className={s.podTagDot} />
                Podcast · {podPlaying ? "Reproduciendo" : "Episodio 1"}
              </span>
              <h3 className={s.podTitle}>PayFlow y la arquitectura de microservicios, en solitario</h3>
              <p className={s.podHost}>
                <span className={s.podAvatar}>IM</span>
                <span className={s.podHostMeta}>
                  <strong>Iker Martínez</strong>
                  <em>CEO &amp; Fundador de PayFlow</em>
                </span>
              </p>
              <p className={s.podDesc}>
                Cómo se construye una plataforma fintech de finanzas y pagos desde cero:
                microservicios, Open Banking, seguridad con JWT y las decisiones de producto
                detrás de cada euro que se mueve.
              </p>

              <div className={s.podPlayer}>
                <button
                  className={s.podPlayBtn}
                  onClick={togglePod}
                  aria-label={podPlaying ? "Pausar podcast" : "Reproducir podcast"}
                >
                  {podPlaying ? <IconPause /> : <IconPlay />}
                  <span className={s.podPlayRing} aria-hidden />
                </button>
                <audio
                  ref={podAudioRef}
                  className={s.podAudio}
                  src="/podcast_ceo_payflow.m4a"
                  preload="metadata"
                  controls
                  onPlay={() => setPodPlaying(true)}
                  onPause={() => setPodPlaying(false)}
                  onEnded={() => setPodPlaying(false)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ PRICING ═══════════════════════════ */}
      <section className={s.pricingSection} id="pricing">
        <div className={s.pricingWrap}>
          <p className={s.eyebrowLight}>Precios</p>
          <h2 className={`${s.h2} ${s.h2Light} ${s.reveal}`}>
            Sin sorpresas.<br />Sin letra pequeña.
          </h2>
          <div className={s.pGrid}>
            {PRICING.map((p) => (
              <div key={p.name} className={`${s.pCard} ${p.hl ? s.pHL : ""} ${s.reveal}`}>
                {p.hl && <div className={s.pBadge}>Más popular</div>}
                <p className={s.pName}>{p.name}</p>
                <div className={s.pPrice}>
                  <span className={s.pCurr}>€</span>
                  <span className={s.pAmt}>{p.price}</span>
                  <span className={s.pPer}>/mes</span>
                </div>
                <p className={s.pDesc}>{p.desc}</p>
                <ul className={s.pList}>
                  {p.features.map((f) => (
                    <li key={f}><span className={s.pChk}><IconCheck /></span>{f}</li>
                  ))}
                </ul>
                <button
                  className={p.hl ? s.btnPHL : s.btnPGhost}
                  onClick={() => navigate(`/registro?plan=${PLAN_SLUG[p.name]}`)}
                >
                  {p.price === "0" ? "Empezar gratis" : "Empezar ahora"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ CTA ═══════════════════════════════ */}
      <section className={s.ctaSection}>
        <div className={`${s.ctaInner} ${s.reveal}`}>
          <p className={s.ctaEye}>Empieza hoy</p>
          <h2 className={s.ctaH2}>
            Tu app financiera<br />
            <span className={s.gradG}>lista en 2 minutos.</span>
          </h2>
          <p className={s.ctaP}>Sin tarjeta. Sin contrato. Sin comisiones ocultas.</p>
          <div className={s.ctaBtns}>
            <button className={s.btnCta}     onClick={() => navigate("/registro")}>Crear cuenta gratis</button>
            <button className={s.btnCtaOut}  onClick={() => navigate("/login")}>Ya tengo cuenta</button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ FOOTER ════════════════════════════ */}
      <footer className={s.footer}>
        <div className={s.footTop}>

          {/* Brand col */}
          <div className={s.footBrand}>
            <div className={s.footLogo}>
              <img src="/payflow_logo_gold.svg" alt="" loading="lazy" width="36" height="36" />
              <span className={s.footLogoName}>Pay<em>Flow</em></span>
            </div>
            <p className={s.footTagline}>
              Finanzas personales y para autónomos.<br />
              Rápido, seguro, regulado PSD2.
            </p>
            <div className={s.footBadges}>
              <span className={s.footBadge}>🔒 SSL / TLS 1.3</span>
              <span className={s.footBadge}>🏦 PSD2</span>
              <span className={s.footBadge}>🇪🇺 GDPR</span>
            </div>
          </div>

          {/* Producto */}
          <div className={s.footCol}>
            <h4 className={s.footColTitle}>Producto</h4>
            <ul className={s.footList}>
              <li><a href="#features">Funcionalidades</a></li>
              <li><a href="#pricing">Precios</a></li>
              <li><a href="#features">Open Banking</a></li>
              <li><a href="#features">Facturas y IRPF</a></li>
              <li><a href="#features">Pagos P2P</a></li>
            </ul>
          </div>

          {/* Empresa */}
          <div className={s.footCol}>
            <h4 className={s.footColTitle}>Empresa</h4>
            <ul className={s.footList}>
              <li><span className={s.fLink}>Sobre nosotros</span></li>
              <li><span className={s.fLink}>Blog</span></li>
              <li><span className={s.fLink}>Prensa</span></li>
              <li><span className={s.fLink}>Trabaja con nosotros</span></li>
              <li><span className={s.fLink}>Contacto</span></li>
            </ul>
          </div>

          {/* Soporte */}
          <div className={s.footCol}>
            <h4 className={s.footColTitle}>Soporte</h4>
            <ul className={s.footList}>
              <li><span className={s.fLink}>Centro de ayuda</span></li>
              <li><span className={s.fLink}>Estado del servicio</span></li>
              <li><span className={s.fLink}>API para desarrolladores</span></li>
              <li><span className={s.fLink}>Seguridad</span></li>
              <li><a href="mailto:soporte@payflow.es">soporte@payflow.es</a></li>
            </ul>
          </div>

        </div>

        {/* Divider */}
        <div className={s.footDivider} />

        {/* Bottom bar */}
        <div className={s.footBottom}>
          <p className={s.footCopy}>
            © 2026 PayFlow Technologies S.L. · CIF B-XXXXXXXX · Calle Gabriel Miró 14, Vergel
          </p>
          <div className={s.footLegal}>
            <span className={s.fLink}>Política de privacidad</span>
            <span className={s.fLink}>Política de cookies</span>
            <span className={s.fLink}>Aviso legal</span>
            <span className={s.fLink}>Términos y condiciones</span>
            <span className={s.fLink}>Gestionar cookies</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
