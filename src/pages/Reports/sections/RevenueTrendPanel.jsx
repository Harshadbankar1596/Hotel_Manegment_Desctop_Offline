import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Empty, Panel } from "../../../components/ui/index.js";
import { chartTip } from "../../../utils/chart.js";

export default function RevenueTrendPanel({ days }) {
  return (
    <Panel title="Revenue trend" desc="Daily collected revenue · last 30 days with sales">
      {days.length ? (
        <div className="chart tall">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip contentStyle={chartTip} cursor={{ fill: "var(--brand-soft)" }} formatter={(v) => "₹" + Number(v).toLocaleString("en-IN")} />
              <Bar dataKey="revenue" fill="var(--brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty
          title="Not enough data yet"
          desc="Create paid bills to build sales reports."
        />
      )}
    </Panel>
  );
}
