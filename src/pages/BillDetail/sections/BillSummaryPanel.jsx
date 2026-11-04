import { Panel } from "../../../components/ui/index.js";
import { money } from "../../../utils/format.js";
import { isInclusiveBill } from "../../../utils/print.js";

export default function BillSummaryPanel({ b }) {
  const taxLines = b.taxBreakdown?.filter((t) => t.amountPaise) || [];

  return (
    <Panel title="Bill summary" desc={`${b.tableName} · ${b.status}`}>
      <div className="bill-items">
        {(b.items || []).map((i, idx) => (
          <div key={idx}>
            <span>
              <b>{i.name}</b>
              <small>{i.variant} · {i.quantity} × {money(i.unitPricePaise)}</small>
            </span>
            <b>{money(i.lineTotalPaise || i.unitPricePaise * i.quantity)}</b>
          </div>
        ))}
      </div>
      <div className="totals">
        <div><span>Subtotal</span><b>{money(b.subtotalPaise)}</b></div>
        {b.discountPaise > 0 && <div><span>Discount</span><b>− {money(b.discountPaise)}</b></div>}
        {taxLines.length
          ? taxLines.map((t, i) => (
              <div key={i}><span>{t.name} ({t.rate}%){isInclusiveBill(b) ? " incl." : ""}</span><b>{money(t.amountPaise)}</b></div>
            ))
          : b.taxPaise > 0 && <div><span>Tax{isInclusiveBill(b) ? " (incl.)" : ""}</span><b>{money(b.taxPaise)}</b></div>}
        {b.serviceChargePaise > 0 && <div><span>Service charge</span><b>{money(b.serviceChargePaise)}</b></div>}
        <div className="grand"><b>Grand total</b><strong>{money(b.grandTotalPaise)}</strong></div>
      </div>
    </Panel>
  );
}
