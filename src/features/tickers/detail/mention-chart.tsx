"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "../types";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const values = Object.fromEntries(
    payload.map((item) => [item.dataKey, item.value ?? 0]),
  );

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>긍정 {values.positive ?? 0}</span>
      <span>부정 {values.negative ?? 0}</span>
      <span>그 외 {values.other ?? 0}</span>
    </div>
  );
}

export function MentionChart({ data }: { data: TrendPoint[] }) {
  return (
    <div
      aria-label="최근 90일 Serenity 언급 추이"
      className="mention-chart"
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} margin={{ top: 8, right: 2, bottom: 0, left: -24 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            fontSize={10}
            interval={2}
            tickFormatter={(value: string) => value.slice(5)}
            tickLine={false}
          />
          <YAxis allowDecimals={false} axisLine={false} fontSize={10} tickLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-hover)" }} />
          <Bar
            dataKey="positive"
            fill="var(--positive)"
            isAnimationActive={false}
            radius={[2, 2, 0, 0]}
            stackId="mentions"
          />
          <Bar
            dataKey="other"
            fill="var(--neutral)"
            isAnimationActive={false}
            stackId="mentions"
          />
          <Bar
            dataKey="negative"
            fill="var(--negative)"
            isAnimationActive={false}
            radius={[2, 2, 0, 0]}
            stackId="mentions"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
