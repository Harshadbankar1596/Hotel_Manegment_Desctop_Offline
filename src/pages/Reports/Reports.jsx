import { Heading } from "../../components/ui/index.js";
import { collectDay } from "../../utils/format.js";
import ReportStats from "./sections/ReportStats.jsx";
import RevenueTrendPanel from "./sections/RevenueTrendPanel.jsx";

export default function Reports({ s }) {
  const paid = s.bills.filter((b) => b.status === "Paid");
  const total = paid.reduce((a, b) => a + b.grandTotalPaise, 0);
  const days = Object.entries(
    paid.reduce((a, b) => {
      const k = collectDay(b) || "unknown";
      a[k] = (a[k] || 0) + b.grandTotalPaise / 100;
      return a;
    }, {}),
  )
    .sort()
    .slice(-30)
    .map(([day, revenue]) => ({ day: day === "unknown" ? "?" : day.slice(5), revenue }));
  return (
    <>
      <Heading
        eyebrow="INSIGHTS"
        title="Reports & analytics"
        desc="Sales, tax and collection trends from recorded transactions."
      />
      <ReportStats paid={paid} total={total} />
      <RevenueTrendPanel days={days} />
    </>
  );
}
