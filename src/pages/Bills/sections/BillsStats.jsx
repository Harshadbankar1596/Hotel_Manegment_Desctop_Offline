import { Check, Clock3, Receipt, Wallet } from "lucide-react";
import { Stat } from "../../../components/ui/index.js";
import { money } from "../../../utils/format.js";

export default function BillsStats({ s }) {
  return (
    <div className="stats">
      <Stat
        label="Total bills"
        value={s.bills.length}
        note="All recorded transactions"
        icon={Receipt}
      />
      <Stat
        label="Paid"
        value={s.bills.filter((b) => b.status === "Paid").length}
        note="Successfully settled"
        icon={Check}
      />
      <Stat
        label="Pending"
        value={s.bills.filter((b) => b.status === "Pending").length}
        note="Awaiting payment"
        icon={Clock3}
      />
      <Stat
        label="Total billed"
        value={money(
          s.bills
            .filter(
              (b) => !["Cancelled", "Voided", "Refunded"].includes(b.status),
            )
            .reduce((a, b) => a + b.grandTotalPaise, 0),
        )}
        note="Excluding cancelled/refunded"
        icon={Wallet}
      />
    </div>
  );
}
