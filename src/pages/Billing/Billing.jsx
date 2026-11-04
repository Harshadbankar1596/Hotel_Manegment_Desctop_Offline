import { useEffect, useRef, useState } from "react";
import { Empty } from "../../components/ui/index.js";
import { useEscape } from "../../hooks/useEscape.js";
import { ask } from "../../services/dialog.js";
import { errMsg, paise } from "../../utils/format.js";
import { sentItems } from "../../utils/kot.js";
import { isTakeawayId } from "../../utils/orders.js";
import { splitTax } from "../../utils/tax.js";
import BillingHeader from "./sections/BillingHeader.jsx";
import DishPicker from "./sections/DishPicker.jsx";
import OrderCart from "./sections/OrderCart.jsx";
import PaymentModal from "./sections/PaymentModal.jsx";

export default function Billing({ tableId, s, persist, finish, nav, notify, printKOT }) {
  const table = s.tables.find((t) => t.id === tableId);
  const isTakeaway = isTakeawayId(tableId);
  const fresh = () => {
    const base = { items: [], notes: "", startedAt: new Date().toISOString() };
    if (!isTakeaway || tableId === "takeaway") return base;
    // numbering: one more than the highest takeaway label currently open
    const used = Object.values(s.orders || {}).map((o) => Number(String(o?.label || "").replace(/\D/g, "")) || 0);
    return { ...base, label: "Takeaway " + (Math.max(0, ...used) + 1) };
  };
  const [order, setOrder] = useState(() => s.orders[tableId] || fresh());
  const [cartOpen, setCartOpen] = useState(false); // phone only: order panel opens as a bottom sheet
  const billRef = useRef(null);
  // Fit the billing area to the window so only the dish list / cart scroll, never the page
  useEffect(() => {
    const fit = () => {
      const el = billRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.setProperty("--bill-h", Math.max(360, window.innerHeight - top - 36) + "px");
    };
    fit();
    window.addEventListener("resize", fit);
    const t = setTimeout(fit, 150);
    return () => { window.removeEventListener("resize", fit); clearTimeout(t); };
  }, []);
  const [discount, setDiscount] = useState("0");
  const [method, setMethod] = useState("Cash");
  const [cash, setCash] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [pay, setPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEscape(pay && !busy, () => setPay(false));
  const dirty = useRef(false);
  const kotBusy = useRef(false);
  const closing = useRef(false);
  const latest = useRef(order);
  latest.current = order;
  const persistRef = useRef(persist);
  persistRef.current = persist;
  const change = (fn) => {
    dirty.current = true;
    setOrder((o) => {
      const n = fn(o);
      // an emptied order is gone from the kitchen too, so forget its KOT history
      if (!n.items.length)
        return { ...n, kotSent: false, kotQty: undefined, kitchenStatus: undefined, kotSentAt: undefined };
      // never remember more as "sent" than is on the order, so re-adding an item is sent to the kitchen again
      if (n.kotQty) {
        const kotQty = {};
        for (const i of n.items) {
          const k = i.dishId + "|" + i.variant;
          if (n.kotQty[k]) kotQty[k] = Math.min(n.kotQty[k], i.quantity);
        }
        return { ...n, kotQty };
      }
      return n;
    });
  };
  useEffect(() => {
    if (!dirty.current || closing.current) return;
    const t = setTimeout(() => {
      dirty.current = false;
      persistRef.current(tableId, latest.current);
    }, 250);
    return () => clearTimeout(t);
  }, [order, tableId]);
  // save pending edits when leaving the page
  useEffect(
    () => () => {
      if (dirty.current && !closing.current) persistRef.current(tableId, latest.current);
    },
    [tableId],
  );
  if (!table && !isTakeaway)
    return <Empty title="Table not found" desc="This table was deleted or renamed. Go back to Tables." />;
  const subtotal = order.items.reduce((a, i) => a + i.unitPricePaise * i.quantity, 0);
  const discountP = Math.min(subtotal, Math.max(0, paise(discount)));
  const net = subtotal - discountP;
  const taxRules = s.settings.taxEnabled
    ? (s.settings.taxes?.length
        ? s.settings.taxes.filter((t) => t.enabled !== false)
        : [{ name: s.settings.taxName || "GST", rate: s.settings.taxRate || 0 }]
      ).filter((t) => Number(t.rate) > 0)
    : [];
  const rate = Math.min(100, taxRules.reduce((a, t) => a + (Number(t.rate) || 0), 0));
  const inclusive = s.settings.taxMode === "inclusive";
  const tax = rate
    ? inclusive
      ? net - Math.round((net * 100) / (100 + rate))
      : Math.round((net * rate) / 100)
    : 0;
  const taxParts = splitTax(tax, taxRules);
  const service = Math.round((net * (Number(s.settings.serviceChargeRate) || 0)) / 100);
  const total = net + (inclusive ? 0 : tax) + service;
  const cashP = method === "Cash" ? (cash === "" ? total : paise(cash)) : 0;
  const add = (d, v) =>
    change((o) => {
      const items = [...o.items];
      const i = items.findIndex((x) => x.dishId === d.id && x.variant === v.name);
      if (i >= 0) items[i] = { ...items[i], quantity: Math.min(999, items[i].quantity + 1) };
      else
        items.push({
          dishId: d.id,
          name: d.name,
          type: d.type === "non-veg" ? "non-veg" : "veg",
          variant: v.name,
          quantity: 1,
          unitPricePaise: v.pricePaise,
        });
      return { ...o, items, startedAt: o.startedAt || new Date().toISOString() };
    });
  const submit = async (status = "Paid") => {
    if (busy) return;
    setErr("");
    if (!order.items.length) return setErr("Add at least one dish before billing");
    if (status === "Paid" && method === "Cash" && cashP < total)
      return setErr("Cash received is less than the bill total");
    if (status === "Pending" && !custName.trim() && !custPhone.trim())
      return setErr("Enter the customer's name or phone so the pending amount can be collected later");
    setBusy(true);
    closing.current = true;
    try {
      // make sure the saved order is what we bill
      if ((await persist(tableId, order)) === false) throw Error("Could not save the order, so it was not billed");
      const b = await finish({
        tableId,
        paymentMethod: method,
        cashReceivedPaise: cashP,
        discountPaise: discountP,
        status,
        customerName: custName.trim(),
        customerPhone: custPhone.trim(),
      });
      notify("Bill " + b.billNumber + " created");
      nav("/bills/" + b.id);
    } catch (e) {
      closing.current = false;
      setErr(errMsg(e));
      notify(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const tName = table?.name || order.label || "Takeaway";
  const sentOf = (i) => (order.kotSent ? (order.kotQty ? order.kotQty[i.dishId + "|" + i.variant] || 0 : i.quantity) : 0);
  /* Cutting down something the kitchen already has: ask first, keep an audit entry and tell the kitchen */
  const cutItems = async (cuts, apply, title) => {
    // cuts: [{ item, newQty }]
    const lost = cuts
      .map(({ item, newQty }) => ({ item, qty: sentOf(item) - Math.max(newQty, 0) }))
      .filter((x) => x.qty > 0 && sentOf(x.item) > 0);
    const real = lost;
    if (!real.length) return apply();
    const list = real.map(({ item, qty }) => qty + " × " + item.name + (item.variant ? " (" + item.variant + ")" : "")).join(", ");
    const yes = await ask({
      title: title || "Cancel item already sent to kitchen?",
      message: "The kitchen already has " + list + ". Cancelling will print a cancel notice for the kitchen and be recorded on the order.",
      confirmLabel: "Cancel & notify kitchen",
      danger: true,
    });
    if (!yes) return;
    const at = new Date().toISOString();
    const entries = real.map(({ item, qty }) => ({ name: item.name, variant: item.variant, quantity: qty, at }));
    apply(entries);
    printKOT?.(tableId, { ...order, items: entries.map((e) => ({ ...e })), kotSentAt: at }, tName, "CANCEL");
  };
  const withAudit = (entries) => (o) => (entries ? { ...o, cancelled: [...(o.cancelled || []), ...entries] } : o);
  const setQty = (idx, qty) => {
    const item = order.items[idx];
    if (!item) return;
    const apply = (entries) =>
      change((o) =>
        withAudit(entries)({
          ...o,
          items: o.items.map((x, j) => (j === idx ? { ...x, quantity: qty } : x)).filter((x) => x.quantity > 0),
        }),
      );
    if (qty < item.quantity) cutItems([{ item, newQty: qty }], apply);
    else apply();
  };
  const clearOrder = async () => {
    if (!order.items.length) return;
    if (order.kotSent && order.items.some((i) => sentOf(i) > 0))
      return cutItems(
        order.items.map((item) => ({ item, newQty: 0 })),
        (entries) => change((o) => withAudit(entries)({ ...o, items: [] })),
        "Clear an order the kitchen already has?",
      );
    const yes = await ask({
      title: "Clear this order?",
      message: "All dishes on this order will be removed.",
      confirmLabel: "Clear order",
      danger: true,
    });
    if (yes) change((o) => ({ ...o, items: [] }));
  };
  const itemCount = order.items.reduce((a, i) => a + i.quantity, 0);
  /* KOT tracking: only items added after the last KOT go to the kitchen again */
  const keyOf = (i) => i.dishId + "|" + i.variant;
  const sentMap = order.kotSent ? order.kotQty || null : {};
  const unsent = order.items
    .map((i) => ({ ...i, quantity: i.quantity - (sentMap ? sentMap[keyOf(i)] || 0 : i.quantity) }))
    .filter((i) => i.quantity > 0);
  const needsKot = unsent.length > 0;
  const unsentQty = unsent.reduce((a, i) => a + i.quantity, 0);
  const step = !order.items.length ? 1 : needsKot ? 2 : 3;
  const sendKot = async () => {
    if (!order.items.length || kotBusy.current) return;
    kotBusy.current = true;
    try {
      await sendKotNow();
    } finally {
      kotBusy.current = false;
    }
  };
  const sendKotNow = async () => {
    // print first: only mark the items as "sent" if the ticket really came out (or the owner says go on)
    const printed = await printKOT?.(tableId, { ...order, items: unsent }, tName);
    if (printed === false) {
      const go = await ask({
        title: "KOT could not be printed",
        message: "The kitchen ticket did not print. Send it to the Kitchen screen anyway? You can reprint it later with “Reprint KOT”.",
        confirmLabel: "Send to Kitchen screen",
      });
      if (!go) return;
    }
    const sent = {
      ...order,
      kotSent: true,
      kitchenStatus: "Preparing",
      kotSentAt: new Date().toISOString(),
      kotQty: Object.fromEntries(order.items.map((i) => [keyOf(i), i.quantity])),
      // what this batch added, so the kitchen can tell new items from ones already being cooked
      lastKot: { at: new Date().toISOString(), items: Object.fromEntries(unsent.map((i) => [keyOf(i), i.quantity])) },
    };
    const saved = await persist(tableId, sent);
    if (saved === false) return;
    setOrder(sent);
    dirty.current = false;
    notify(order.kotSent ? "New items sent to kitchen" : "KOT sent to kitchen");
  };
  const reprintKot = () => printKOT?.(tableId, { ...order, items: sentItems(order) }, tName);
  const openPay = () => { setErr(""); setPay(true); };
  return (
    <>
      <BillingHeader isTakeaway={isTakeaway} nav={nav} order={order} step={step} table={table} />
      <div className="billing" ref={billRef}>
        <DishPicker add={add} notify={notify} order={order} s={s} />
        <OrderCart
          cartOpen={cartOpen}
          change={change}
          clearOrder={clearOrder}
          discountP={discountP}
          inclusive={inclusive}
          itemCount={itemCount}
          needsKot={needsKot}
          openPay={openPay}
          order={order}
          reprintKot={reprintKot}
          s={s}
          sendKot={sendKot}
          service={service}
          setCartOpen={setCartOpen}
          setQty={setQty}
          subtotal={subtotal}
          taxParts={taxParts}
          taxRules={taxRules}
          total={total}
          unsentQty={unsentQty}
        />
      </div>
      {pay && (
        <PaymentModal
          busy={busy}
          cash={cash}
          cashP={cashP}
          custName={custName}
          custPhone={custPhone}
          discount={discount}
          err={err}
          method={method}
          setCash={setCash}
          setCustName={setCustName}
          setCustPhone={setCustPhone}
          setDiscount={setDiscount}
          setMethod={setMethod}
          setPay={setPay}
          submit={submit}
          total={total}
        />
      )}
    </>
  );
}
