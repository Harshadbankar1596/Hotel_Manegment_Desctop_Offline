import { ChevronRight, ChevronUp, CreditCard, Printer, Send, Trash2, Utensils, X } from "lucide-react";
import FoodThumb from "../../../components/common/FoodThumb.jsx";
import { money } from "../../../utils/format.js";

export default function OrderCart({
  cartOpen,
  change,
  clearOrder,
  discountP,
  inclusive,
  itemCount,
  needsKot,
  openPay,
  order,
  reprintKot,
  s,
  sendKot,
  service,
  setCartOpen,
  setQty,
  subtotal,
  taxParts,
  taxRules,
  total,
  unsentQty,
}) {
  return (
    <>
      <div className={"cart-backdrop" + (cartOpen ? " on" : "")} onClick={() => setCartOpen(false)} />
      <button className="cart-bar" onClick={() => setCartOpen(true)} aria-label="View current order">
        <span className="cb-count"><Utensils size={16} />{itemCount}</span>
        <span className="cb-label">{itemCount ? "View order" : "No items yet"}</span>
        <b>{money(total)}</b>
        <ChevronUp size={18} />
      </button>
      <aside className={"cart" + (cartOpen ? " open" : "")}>
        <div className="sheet-grab cart-grab" onClick={() => setCartOpen(false)} />
        <div className="cart-head">
          <div>
            <h3>Current order</h3>
            <small>{itemCount ? itemCount + " item" + (itemCount > 1 ? "s" : "") : "No items yet"}</small>
          </div>
          <button className="cart-close" onClick={() => setCartOpen(false)} aria-label="Close order">
            <X size={18} />
          </button>
          {order.items.length > 0 && (
            <button className="text-btn danger" onClick={clearOrder}>
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>
        <div className="order-list">
          {order.items.length ? (
            order.items.map((i, idx) => (
              <div className="order-item" key={i.dishId + "|" + i.variant}>
                <FoodThumb dish={s.dishes.find((d) => d.id === i.dishId) || { name: i.name }} />
                <div className="oi-name">
                  <b>{i.name}</b>
                  <small>{i.variant} · {money(i.unitPricePaise)}</small>
                </div>
                <div className="qty">
                  <button
                    aria-label="Decrease"
                    onClick={() => setQty(idx, i.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    aria-label="Increase"
                    onClick={() =>
                      change((o) => ({
                        ...o,
                        items: o.items.map((x, j) =>
                          j === idx ? { ...x, quantity: Math.min(999, x.quantity + 1) } : x,
                        ),
                      }))
                    }
                  >
                    +
                  </button>
                </div>
                <b className="oi-total">{money(i.unitPricePaise * i.quantity)}</b>
                <button
                  className="remove"
                  aria-label="Remove item"
                  onClick={() => setQty(idx, 0)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="cart-empty">
              <Utensils size={26} />
              <b>Order is empty</b>
              <small>Tap a dish on the left to add it.</small>
            </div>
          )}
        </div>
        <div className="cart-foot">
          <div className="cart-inputs">
            <label className="field-label">
              Note for kitchen
              <input
                value={order.notes || ""}
                onChange={(e) => change((o) => ({ ...o, notes: e.target.value }))}
                placeholder="e.g. less spicy"
              />
            </label>
          </div>
          <div className="totals">
            <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
            {discountP > 0 && <div><span>Discount</span><b>− {money(discountP)}</b></div>}
            {taxRules.map((t, i) => (
              <div key={i}>
                <span>{t.name || "Tax"} ({Number(t.rate)}%){inclusive ? " incl." : ""}</span>
                <b>{money(taxParts[i])}</b>
              </div>
            ))}
            {service > 0 && (
              <div><span>Service charge ({s.settings.serviceChargeRate}%)</span><b>{money(service)}</b></div>
            )}
            <div className="grand"><b>Total</b><strong>{money(total)}</strong></div>
          </div>
          <div className="cart-actions">
            {!order.items.length ? (
              <button className="primary main-cta" disabled>
                <Utensils size={18} /> Pick dishes to start
              </button>
            ) : needsKot ? (
              <>
                <button className="primary main-cta kot-cta" onClick={sendKot}>
                  <Send size={18} />
                  {order.kotSent ? `Send ${unsentQty} new item${unsentQty > 1 ? "s" : ""} to kitchen` : "Send to kitchen (KOT)"}
                </button>
                <button className="text-btn skip-kot" onClick={openPay}>
                  Skip KOT, bill now · {money(total)} <ChevronRight size={14} />
                </button>
              </>
            ) : (
              <>
                <button className="primary main-cta" onClick={openPay}>
                  <CreditCard size={18} /> Bill · {money(total)}
                </button>
                <div className="cta-row">
                  <button className="text-btn" onClick={reprintKot}>
                    <Printer size={13} /> Reprint KOT
                  </button>
                  <span>Need more? Tap a dish to add.</span>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
