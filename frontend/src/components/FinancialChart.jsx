import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import style from "../styles/FinancialChart.module.css";

// Genera los últimos N meses como objetos { key, label }
function ultMeses(n) {
  const meses = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push({
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("es-ES", { month: "short" }),
    });
  }
  return meses;
}

// Tooltip personalizado
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={style.tooltip}>
      <p className={style.tooltipLabel}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className={style.tooltipRow}>
          {p.name}: <strong>€{p.value.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</strong>
        </p>
      ))}
    </div>
  );
}

/**
 * Gráfica de barras: ingresos vs gastos de los últimos 6 meses.
 * Recibe el array completo de transacciones y agrupa por mes en el cliente.
 */
export default function FinancialChart({ transacciones = [] }) {
  const meses = useMemo(() => ultMeses(6), []);

  // Para cada uno de los 6 meses, sumamos ingresos y gastos de ese mes (agrupación en cliente).
  const data = useMemo(() => {
    return meses.map(({ key, label }) => {
      const [anio, mes] = key.split("-").map(Number);
      const delMes = transacciones.filter((t) => {
        const d = new Date(t.fecha);
        return d.getFullYear() === anio && d.getMonth() + 1 === mes;
      });
      const ingresos = delMes
        .filter((t) => t.tipo === "INGRESO")
        .reduce((s, t) => s + (t.cantidad ?? 0), 0);
      const gastos = delMes
        .filter((t) => t.tipo === "GASTO")
        .reduce((s, t) => s + (t.cantidad ?? 0), 0);
      return { label, ingresos, gastos };
    });
  }, [transacciones, meses]);

  const hayDatos = data.some((d) => d.ingresos > 0 || d.gastos > 0);

  return (
    <div className={style.card}>
      <div className={style.header}>
        <h2 className={style.title}>Evolución financiera</h2>
        <span className={style.subtitle}>Últimos 6 meses</span>
      </div>

      {!hayDatos ? (
        <p className={style.empty}>Sin datos suficientes para mostrar la gráfica.</p>
      ) : (
        <div className={style.chartWrap}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} barGap={4} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border, #e2e8f0)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--color-text-tertiary, #94a3b8)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary, #94a3b8)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `€${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span style={{ fontSize: 12, color: "var(--color-text-secondary, #475569)" }}>{v}</span>}
              />
              <Bar dataKey="ingresos" name="Ingresos" fill="#059669" radius={[6, 6, 0, 0]} />
              <Bar dataKey="gastos"   name="Gastos"   fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
