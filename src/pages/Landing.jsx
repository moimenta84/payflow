import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import s from "../styles/Landing.module.css";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEED = [
  { id: "pay_Kx9a2", label: "Marketplace Pro · split",       amount: "+€ 342.00",   tag: "split",    color: "#3bdb79" },
  { id: "pay_Nm2b7", label: "SaaS Monthly · recurrente",     amount: "+€ 49.00",    tag: "rec",      color: "#79c0ff" },
  { id: "pay_Rp4c1", label: "Freelance Invoice · checkout",  amount: "+€ 1,200.00", tag: "checkout", color: "#f2c038" },
  { id: "pay_Xt7d3", label: "E-commerce Store · split",      amount: "+€ 89.99",    tag: "split",    color: "#3bdb79" },
  { id: "pay_Lw3e8", label: "Platform Fee · wallet",         amount: "+€ 175.50",   tag: "wallet",   color: "#d2a8ff" },
  { id: "pay_Qv8f4", label: "App Subscription",              amount: "+€ 129.00",   tag: "rec",      color: "#79c0ff" },
  { id: "pay_Bz6g9", label: "Delivery App · split",          amount: "+€ 67.30",    tag: "split",    color: "#3bdb79" },
  { id: "pay_Yc1h5", label: "E-learning · checkout",         amount: "+€ 299.00",   tag: "checkout", color: "#f2c038" },
];

const SPARKLINE = [42, 58, 51, 67, 74, 69, 83, 88, 80, 94, 99];

const DOT_OPS = Array.from({ length: 35 }, (_, i) => {
  const v = ((i * 137.508) % 100) / 100;
  return v > 0.35 ? 0.45 + v * 0.55 : 0.1;
});

const PRICING = [
  {
    name: "Starter",  price: "49",
    desc: "Para startups que están despegando",
    features: ["500 transacciones/mes", "1 pasarela de pago", "Webhooks básicos", "Email support"],
    hl: false,
  },
  {
    name: "Growth",   price: "129",
    desc: "Para equipos en crecimiento serio",
    features: ["Transacciones ilimitadas", "Stripe + MercadoPago", "Wallets y splits", "Audit log completo", "Soporte 24h"],
    hl: true,
  },
  {
    name: "Enterprise", price: "199",
    desc: "Para plataformas que escalan",
    features: ["Todo Growth incluido", "Multi-currency", "SLA 99.99%", "Integración custom", "Account manager"],
    hl: false,
  },
];

// ─── Counter hook ─────────────────────────────────────────────────────────────

function useCounter(target, { format = "plain", duration = 1800 } = {}) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
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
  }, [target, duration]);

  let text;
  if (format === "M")   text = `$${(val / 1e6).toFixed(1)}M`;
  else if (format === "pct") text = `${(val / 100).toFixed(2)}%`;
  else text = val.toLocaleString("es-ES");

  return { text, ref };
}

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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

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

      {/* ═══════════════════════════════ NAV ═══════════════════════════════ */}
      <nav className={`${s.nav} ${scrolled ? s.navSolid : ""}`}>
        <div className={s.navWrap}>
          <span className={s.logo}>Pay<em>Flow</em></span>
          <div className={s.navLinks}>
            <a href="#features">Producto</a>
            <a href="#pricing">Precios</a>
            <a href="#">Docs</a>
          </div>
          <div className={s.navBtns}>
            <button className={s.btnGhost}  onClick={() => navigate("/login")}>Entrar</button>
            <button className={s.btnYellow} onClick={() => navigate("/registro")}>Empezar →</button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════ HERO ══════════════════════════════ */}
      <section className={s.hero}>
        <div className={s.heroL}>
          <div className={s.badge}>
            <span className={s.badgePulse} />
            API v2.0 — ahora con multi-currency
          </div>
          <h1 className={s.h1}>
            Pagos<br />complejos.<br />
            <span className={s.grad}>API simple.</span>
          </h1>
          <p className={s.heroSub}>
            Wallets virtuales, splits automáticos y webhooks asíncronos.<br />
            Intégralo en una tarde. Sin hoja de cálculo.
          </p>
          <div className={s.heroBtns}>
            <button className={s.btnHero}    onClick={() => navigate("/registro")}>Empezar gratis</button>
            <button className={s.btnHeroOut}>Ver la API ↗</button>
          </div>
          <div className={s.proof}>
            <div className={s.avatars}>
              {["AL","MR","SG","JK","DP"].map((a) => (
                <span key={a} className={s.av}>{a}</span>
              ))}
            </div>
            <p className={s.proofTxt}><strong>+847 equipos</strong> ya lo usan esta semana</p>
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
        <StatItem target={847}     suffix="+" label="empresas activas" />
        <StatItem target={2400000} format="M" label="procesados hoy" />
        <StatItem target={9997} format="pct"  label="uptime garantizado" />
        <StatItem target={0}                  label="cobros duplicados" />
      </div>

      {/* ════════════════════════════════ BENTO ════════════════════════════ */}
      <section className={s.bentoSection} id="features">
        <div className={s.bentoWrap}>
          <p className={s.eyebrow}>03 — Producto</p>
          <h2 className={`${s.h2} ${s.reveal}`}>
            Todo lo que necesitas.<br />
            <span className={s.gradG}>Nada que no uses.</span>
          </h2>
          <div className={s.bento}>

            {/* MAIN */}
            <div className={`${s.bc} ${s.bMain} ${s.reveal}`}>
              <p className={s.bEye}>Tiempo real</p>
              <h3 className={s.bTitle}>Transacciones en vivo</h3>
              <p className={s.bDesc}>Cada pago procesado aparece aquí al instante. Drill-down, filtros y exportación.</p>
              <Feed height={220} />
            </div>

            {/* STAT — empresas */}
            <div className={`${s.bc} ${s.bStat} ${s.reveal}`}>
              <p className={s.bEye}>Confianza</p>
              <p className={s.bigN}>847<sup>+</sup></p>
              <p className={s.bigL}>empresas activas</p>
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

            {/* WALLET */}
            <div className={`${s.bc} ${s.bWallet} ${s.reveal}`}>
              <span className={s.bIco}>⚡</span>
              <h3 className={s.bTitle}>Wallets virtuales</h3>
              <p className={s.bDesc}>Balance por usuario, historial inmutable y transferencias instantáneas.</p>
              <div className={s.walletMini}>
                <div className={s.wRow}><span>Balance</span><span className={s.wAmt}>€ 8,240.00</span></div>
                <div className={s.wRow}><span>Pendiente</span><span className={s.wPend}>€ 340.00</span></div>
                <div className={s.wBar}><div className={s.wBarFill} style={{ width: "70%" }} /></div>
              </div>
            </div>

            {/* SPLIT */}
            <div className={`${s.bc} ${s.bSplit} ${s.reveal}`}>
              <span className={s.bIco}>✂️</span>
              <h3 className={s.bTitle}>Splits automáticos</h3>
              <p className={s.bDesc}>Divide cualquier cobro entre partes con un simple array. Sin lógica manual.</p>
              <div className={s.splitViz}>
                <div className={s.sBar}><div className={s.sFill}>85%</div><div className={s.sRest}>15%</div></div>
                <div className={s.sLabels}><span>Vendedor</span><span>Plataforma</span></div>
              </div>
            </div>

            {/* WIDE — Webhooks */}
            <div className={`${s.bc} ${s.bWide} ${s.reveal}`}>
              <div className={s.wideLeft}>
                <span className={s.bIco}>🔗</span>
                <h3 className={s.bTitle}>Webhooks asíncronos con RabbitMQ</h3>
                <p className={s.bDesc}>Stripe confirma. PayFlow distribuye. Sin pérdida de eventos aunque caiga tu servidor.</p>
              </div>
              <div className={s.flow}>
                {["Tu App", "PayFlow", "RabbitMQ", "Stripe", "Webhook"].map((n, i, arr) => (
                  <React.Fragment key={n}>
                    <div className={s.fNode}>{n}</div>
                    {i < arr.length - 1 && <span className={s.fArr}>→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ PRICING ═══════════════════════════ */}
      <section className={s.pricingSection} id="pricing">
        <div className={s.pricingWrap}>
          <p className={s.eyebrowLight}>04 — Precios</p>
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
                    <li key={f}><span className={s.pChk}>✓</span>{f}</li>
                  ))}
                </ul>
                <button
                  className={p.hl ? s.btnPHL : s.btnPGhost}
                  onClick={() => navigate("/registro")}
                >
                  Empezar ahora
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
            Tu integración de pagos<br />
            <span className={s.grad}>lista en una tarde.</span>
          </h2>
          <p className={s.ctaP}>Sin tarjeta de crédito. Sin contrato. Sin dramas.</p>
          <div className={s.ctaBtns}>
            <button className={s.btnCta}     onClick={() => navigate("/registro")}>Crear cuenta gratis →</button>
            <button className={s.btnCtaOut}  onClick={() => navigate("/login")}>Ya tengo cuenta</button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ FOOTER ════════════════════════════ */}
      <footer className={s.footer}>
        <div className={s.footWrap}>
          <span className={s.logo}>Pay<em>Flow</em></span>
          <p className={s.footCopy}>© 2026 PayFlow. Construido con Java, Spring Boot y RabbitMQ.</p>
          <div className={s.footLinks}>
            <a href="#features">Producto</a>
            <a href="#pricing">Precios</a>
            <span onClick={() => navigate("/login")} className={s.fLink}>Entrar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
