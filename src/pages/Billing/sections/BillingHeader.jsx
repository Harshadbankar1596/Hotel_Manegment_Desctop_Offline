import { ArrowLeft, Check, ChefHat, CreditCard, Utensils } from "lucide-react";
import { elapsed, fmtTime } from "../../../utils/format.js";

export default function BillingHeader({
  isTakeaway,
  nav,
  order,
  step,
  table,
}) {
  const steps = [
    ["Pick food", Utensils],
    ["Send to kitchen", ChefHat],
    ["Bill", CreditCard],
  ];

  return (
    <div className="pos-bar">
      <button className="back-btn" onClick={() => nav("/tables")}>
        <ArrowLeft size={16} /> Tables
      </button>
      <div className="pos-title">
        <h1>{table?.name || order.label || "Takeaway"}</h1>
        <span className="chip">{isTakeaway ? "Takeaway" : "Dine-in"}</span>
        {order.kotSent && <span className="chip kot"><ChefHat size={12} /> KOT sent</span>}
        {order.startedAt && order.items.length > 0 && <small>Started {fmtTime(order.startedAt)} · {elapsed(order.startedAt)}</small>}
      </div>
      <ol className="stepper" aria-label="Order steps">
        {steps.map(([label, Icon], i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "now" : "next";
          return (
            <li key={label} className={state}>
              <span>{state === "done" ? <Check size={13} /> : n}</span>
              {label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
