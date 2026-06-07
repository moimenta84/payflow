import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import style from "../styles/FinancialChart.module.css";

const COLORES = ["#0891b2", "#059669", "#d97706", "#7c3aed", "#ef4444", "#ec4899", "#64748b", "#f59e0b"];

const CAT_LABEL = {
  SALARIO:      "Salario",
  ALIMENTACION: "Alimentación",
  VIVIENDA:     "Vivienda",
  TRANSPORTE:   "Transporte",
  SALUD:        "Salud",
  OCIO:         "Ocio",
  EDUCACION:    "Educación",
  OTROS:        "Otros",
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className={style.tooltip}>
      <p className={style.tooltipLabel}>{name}</p>
      <p className={style.tooltipRow} style={{ color: payload[0].payload.fill }}>
        <strong>€{value.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</strong>
      </p>
    </div>
  );
}

/**
 * Gráfica circular: desglose de gastos por categoría del mes actual.
 * Recibe el array completo de transacciones.
 */
export default function CategoryChart({ transacciones = [] }) {
  const data = useMemo(() => {
    const now  = new Date();
    const mes  = now.getMonth();
    const anio = now.getFullYear();

    const gastosMes = transacciones.filter((t) => {
      if (t.tipo !== "GASTO") return false;
      const d = new Date(t.fecha);
      return d.getMonth() === mes && d.getFullYear() === anio;
    });

    // Acumulamos el total gastado por cada categoría en un objeto { categoria: total }.
    const bycat = {};
    gastosMes.forEach((t) => {
      const cat = t.categoria || "OTROS";
      bycat[cat] = (bycat[cat] ?? 0) + (t.cantidad ?? 0);
    });

    // Lo convertimos en array ordenado de mayor a menor gasto y le asignamos un color a cada porción.
    return Object.entries(bycat)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total], i) => ({
        name:  CAT_LABEL[cat] || cat,
        value: Math.round(total * 100) / 100,
        fill:  COLORES[i % COLORES.length],
      }));
  }, [transacciones]);

  const hayDatos = data.length > 0;

  return (
    <div className={style.card}>
      <div className={style.header}>
        <h2 className={style.title}>Gastos por categoría</h2>
        <span className={style.subtitle}>Este mes</span>
      </div>

      {!hayDatos ? (
        <p className={style.empty}>Sin gastos registrados este mes.</p>
      ) : (
        <div className={style.chartWrap}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => (
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary, #475569)" }}>{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
