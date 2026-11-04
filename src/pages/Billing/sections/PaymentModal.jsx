import { Banknote, CreditCard, Smartphone, Wallet, X } from "lucide-react";
import { Btn } from "../../../components/ui/index.js";
import { money } from "../../../utils/format.js";

export default function PaymentModal({
  busy,
  cash,
  cashP,
  custName,
  custPhone,
  discount,
  err,
  method,
  setCash,
  setCustName,
  setCustPhone,
  setDiscount,
  setMethod,
  setPay,
  submit,
  total,
}) {
  const methods = [
    ["Cash", Banknote],
    ["UPI", Smartphone],
    ["Card", CreditCard],
    ["Other", Wallet],
  ];

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && setPay(false)}>
      <div className="modal">
        <div className="modal-head">
          <h3>Settle bill</h3>
          <button onClick={() => setPay(false)} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="pay-total">
          <span>Amount payable</span>
          <strong>{money(total)}</strong>
        </div>
        <label className="field-label disc-field" htmlFor="disc">
          Discount (₹)
          <input id="disc" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </label>
        <div className="pay-methods">
          {methods.map(([m, Icon]) => (
            <button key={m} className={method === m ? "active" : ""} onClick={() => setMethod(m)}>
              <Icon size={20} />
              {m}
            </button>
          ))}
        </div>
        {method === "Cash" && (
          <>
            <label className="field-label">
              Cash received (₹)
              <input
                type="number"
                min="0"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder={(total / 100).toFixed(2)}
              />
            </label>
            <div className="quick-cash">
              <button onClick={() => setCash(String(total / 100))}>Exact</button>
              {[...new Set([10, 50, 100, 500, 2000].map((n) => Math.ceil(total / 100 / n) * n))]
                .filter((v) => v * 100 > total)
                .slice(0, 4)
                .map((v) => (
                  <button key={v} onClick={() => setCash(String(v))}>
                    ₹{v.toLocaleString("en-IN")}
                  </button>
                ))}
            </div>
            <div className={"change-due" + (cashP < total ? " short" : "")}>
              <span>{cashP < total ? "Still to collect" : "Change to return"}</span>
              <span>{money(Math.abs(cashP - total))}</span>
            </div>
          </>
        )}
        <div className="cust-fields">
          <label className="field-label">
            Customer name <small>(needed for a pending bill)</small>
            <input value={custName} maxLength={80} onChange={(e) => setCustName(e.target.value)} />
          </label>
          <label className="field-label">
            Phone
            <input value={custPhone} maxLength={20} inputMode="tel" onChange={(e) => setCustPhone(e.target.value)} />
          </label>
        </div>
        {err && <p className="field-error">{err}</p>}
        <div className="modal-actions">
          <Btn onClick={() => setPay(false)}>Cancel</Btn>
          <button className="primary" disabled={busy} onClick={() => submit("Paid")}>
            {busy ? "Processing…" : "Confirm payment"}
          </button>
        </div>
        <button className="clear" disabled={busy} onClick={() => submit("Pending")}>
          Save as pending bill
        </button>
      </div>
    </div>
  );
}
