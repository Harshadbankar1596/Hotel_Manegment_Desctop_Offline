import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Panel } from "../../../components/ui/index.js";
import { chartTip } from "../../../utils/chart.js";
import { money } from "../../../utils/format.js";

export default function SalesChartPanel({ chart, nav }) {
  return (
    <Panel
      title="Sales overview"
      desc="Daily revenue for the last 7 days"
      action={
        <button className="text-btn" onClick={() => nav("/reports")}>
          Details →
        </button>
      }
    >
      <div className="chart-total">
        {money(chart.reduce((a, b) => a + b.revenue, 0) * 100)}{" "}
        <small>Last 7 days</small>
      </div>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <CartesianGrid
              vertical={false}
              stroke="var(--line)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
            />
            <Tooltip
              contentStyle={chartTip}
              cursor={{ fill: "var(--brand-soft)" }}
              formatter={(v) => [
                "₹" + Number(v).toLocaleString("en-IN"),
                "Revenue",
              ]}
            />
            <Bar dataKey="revenue" fill="var(--brand)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
