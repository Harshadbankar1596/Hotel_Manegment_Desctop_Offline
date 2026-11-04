import { Download } from "lucide-react";
import { Btn, Heading } from "../../components/ui/index.js";
import { billDay, collectDay, dayKey } from "../../utils/format.js";
import OccupancyNotice from "./sections/OccupancyNotice.jsx";
import QuickActionsPanel from "./sections/QuickActionsPanel.jsx";
import RecentBillsPanel from "./sections/RecentBillsPanel.jsx";
import SalesChartPanel from "./sections/SalesChartPanel.jsx";
import StatsOverview from "./sections/StatsOverview.jsx";
import TopDishesPanel from "./sections/TopDishesPanel.jsx";

export default function Dashboard({ s, nav }) {
  const today = dayKey();
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const activeTables = s.tables.filter((t) => t.enabled !== false);
  const occupied = activeTables.filter((t) => s.orders[t.id]?.items?.length).length;
  const pending = s.bills.filter((b) => b.status === "Pending").length;
  const bills = s.bills.filter(
    (b) =>
      billDay(b) === today &&
      !["Cancelled", "Voided", "Refunded"].includes(b.status),
  );
  const revenue = bills.reduce((a, b) => a + b.grandTotalPaise, 0);
  const collectedToday = s.bills
    .filter((b) => b.status === "Paid" && collectDay(b) === today)
    .reduce((a, b) => a + b.grandTotalPaise, 0);
  const month = s.bills
    .filter(
      (b) =>
        collectDay(b).slice(0, 7) === today.slice(0, 7) &&
        b.status === "Paid",
    )
    .reduce((a, b) => a + b.grandTotalPaise, 0);
  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const key = dayKey(d);
    return {
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      revenue: s.bills
        .filter((b) => collectDay(b) === key && b.status === "Paid")
        .reduce((a, b) => a + b.grandTotalPaise / 100, 0),
    };
  });
  const recent = [...s.bills]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  const top = Object.values(
    s.bills
      .flatMap((b) => b.items || [])
      .reduce((a, i) => {
        a[i.name] = a[i.name] || { name: i.name, qty: 0, total: 0 };
        a[i.name].qty += i.quantity;
        a[i.name].total += i.lineTotalPaise || i.unitPricePaise * i.quantity;
        return a;
      }, {}),
  )
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  return (
    <>
      <Heading
        eyebrow="OVERVIEW"
        title={greet + "."}
        desc="Here's what's happening at your hotel today."
        action={
          <Btn icon={Download} onClick={() => nav("/reports")}>
            View reports
          </Btn>
        }
      />
      <OccupancyNotice activeTables={activeTables} occupied={occupied} pending={pending} />
      <StatsOverview bills={bills} collectedToday={collectedToday} month={month} revenue={revenue} />
      <div className="columns">
        <SalesChartPanel chart={chart} nav={nav} />
        <RecentBillsPanel nav={nav} recent={recent} />
      </div>
      <div className="columns">
        <TopDishesPanel top={top} />
        <QuickActionsPanel nav={nav} />
      </div>
    </>
  );
}
