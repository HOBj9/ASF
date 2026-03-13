"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DailyConsumptionChartProps = {
  data: Array<{ date: string; count: number }>;
};

export function DailyConsumptionChart({
  data,
}: DailyConsumptionChartProps) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 text-right">
        <h3 className="text-lg font-semibold">الاستهلاك اليومي</h3>
        <p className="text-sm text-muted-foreground">
          عرض مبسط للعدد اليومي خلال الفترة المتاحة
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#0f766e"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
