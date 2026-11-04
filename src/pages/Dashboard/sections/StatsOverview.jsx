import { Activity, CreditCard, Receipt, Wallet } from "lucide-react";
import { Stat } from "../../../components/ui/index.js";
import { money } from "../../../utils/format.js";

export default function StatsOverview({ bills, collectedToday, month, revenue }) {
  return (
    <div className="stats">
      <Stat
        label="Today's sales"
        value={money(revenue)}
        note={`${bills.length} bill${bills.length === 1 ? "" : "s"} today · ${money(collectedToday)} collected`}
        icon={Wallet}
      />
      <Stat
        label="Bills generated"
        value={String(bills.length).padStart(2, "0")}
        note={`${bills.filter((b) => b.status === "Paid").length} paid · ${bills.filter((b) => b.status === "Pending").length} pending`}
        icon={Receipt}
      />
      <Stat
        label="Average bill value"
        value={money(bills.length ? revenue / bills.length : 0)}
        note="Across today's bills"
        icon={Activity}
      />
      <Stat
        label="Monthly revenue"
        value={money(month)}
        note="Paid bills this month"
        icon={CreditCard}
      />
    </div>
  );
}
