import { Activity, CreditCard, FileText, Wallet } from "lucide-react";
import { Stat } from "../../../components/ui/index.js";
import { money } from "../../../utils/format.js";

export default function ReportStats({ paid, total }) {
  return (
    <div className="stats">
      <Stat
        label="Net collected"
        value={money(total)}
        note="Paid bills"
        icon={Wallet}
      />
      <Stat
        label="Tax collected"
        value={money(paid.reduce((a, b) => a + (b.taxPaise || 0), 0))}
        note="Recorded tax amounts"
        icon={FileText}
      />
      <Stat
        label="Discounts given"
        value={money(paid.reduce((a, b) => a + (b.discountPaise || 0), 0))}
        note="Across paid bills"
        icon={Activity}
      />
      <Stat
        label="Average transaction"
        value={money(paid.length ? total / paid.length : 0)}
        note="Per paid bill"
        icon={CreditCard}
      />
    </div>
  );
}
