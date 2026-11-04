import { useState } from "react";
import { Panel } from "../../../components/ui/index.js";
import { billDay, errMsg, fmtDateTime } from "../../../utils/format.js";

export default function TransactionInfoPanel({ b, notify, reload }) {
  const [method, setMethod] = useState("");
  const settle = async () => {
    if (!method) return notify("Choose how the customer paid", "error");
    try {
      await window.hotelApp.settleBill(b.id, method);
      await reload();
      notify("Bill marked as paid");
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  return (
    <Panel title="Transaction information">
      {[
        ["Payment method", b.paymentMethod || (b.status === "Pending" ? "Not paid yet" : "—")],
        ["Payment status", b.status],
        ...(b.customerName || b.customerPhone ? [["Customer", [b.customerName, b.customerPhone].filter(Boolean).join(" · ")]] : []),
        ...(b.paidAt && b.status === "Paid" ? [["Paid on", fmtDateTime(b.paidAt)]] : []),
        ["Business date", b.businessDate || billDay(b)],
        ["Created at", fmtDateTime(b.createdAt)],
      ].map(([k, v]) => (
        <div className="meta" key={k}><span>{k}</span><b>{v}</b></div>
      ))}
      {b.status === "Pending" && window.hotelApp && (
        <div className="settle-box">
          <b>Collect payment</b>
          <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
            <option value="">Select payment method…</option>
            {["Cash", "UPI", "Card", "Other"].map((x) => <option key={x}>{x}</option>)}
          </select>
          <button className="primary" disabled={!method} onClick={settle}>Mark as paid</button>
        </div>
      )}
    </Panel>
  );
}
