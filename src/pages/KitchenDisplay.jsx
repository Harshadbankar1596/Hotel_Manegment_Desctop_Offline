import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChefHat, Clock3, Printer, Search, Undo2, Volume2, VolumeX } from "lucide-react";
import { sentItems } from "../kot.js";

const isReady = (o) => o.kitchenStatus === "Ready";
const LATE_DEFAULT_MIN = 15;
const minutesSince = (v) => {
  const d = new Date(v);
  return !v || isNaN(d) ? 0 : Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
};
const fmtMin = (m) => (m < 60 ? m + " min" : Math.floor(m / 60) + "h " + (m % 60) + "m");
let audioCtx = null;
/* short two-tone beep; browsers only allow sound after the user has clicked something in the app */
function beep(times = 1) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume?.();
    for (let n = 0; n < times; n++) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const t0 = audioCtx.currentTime + n * 0.35;
      o.type = "sine";
      o.frequency.setValueAtTime(880, t0);
      o.frequency.setValueAtTime(660, t0 + 0.15);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0);
      o.stop(t0 + 0.32);
    }
  } catch {}
}

export default function KitchenDisplay({ s, save, nav, notify, printKOT }) {
  const [filter, setFilter] = useState("Active");
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem("kds-sound") !== "off";
    } catch {
      return true;
    }
  });
  const lateMin = Math.max(1, Number(s.settings?.kitchenLateMinutes) || LATE_DEFAULT_MIN);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 20000); // keeps the timers and late highlight moving
    return () => clearInterval(t);
  }, []);
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem("kds-sound", next ? "on" : "off");
    } catch {}
    if (next) beep(1); // the click also unlocks audio in the browser
  };
  const dishType = (item) => item.type || (s.dishes || []).find((d) => d.id === item.dishId)?.type;
  const tickets = useMemo(
    () =>
      Object.entries(s.orders || {})
        // only what the kitchen was really sent (items added after the last KOT are not shown yet)
        .map(([tableId, order]) => ({ tableId, order, view: order?.items?.length ? sentItems(order) : [] }))
        .filter(({ view }) => view.length)
        .map(({ tableId, order, view }) => ({
          tableId,
          order,
          view,
          table: (s.tables || []).find((t) => t.id === tableId)?.name || order.label || (tableId === "takeaway" || String(tableId).startsWith("takeaway-") ? "Takeaway" : "Table"),
        }))
        .filter((t) => `${t.table} ${t.view.map((i) => i.name).join(" ")}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => String(a.order.kotSentAt || a.order.startedAt).localeCompare(String(b.order.kotSentAt || b.order.startedAt))),
    [s.orders, s.tables, query],
  );
  // sound: a new ticket, or more items added to a ticket, and tickets that turn late
  const seen = useRef(null);
  const lateSeen = useRef(new Set());
  useEffect(() => {
    const cur = new Map(tickets.map((t) => [t.tableId, t.order.kotSentAt || t.order.startedAt || ""]));
    if (seen.current && sound) {
      const fresh = tickets.some((t) => !isReady(t.order) && seen.current.get(t.tableId) !== cur.get(t.tableId));
      if (fresh) beep(2);
    }
    seen.current = cur;
  }, [tickets, sound]);
  useEffect(() => {
    const newlyLate = tickets.filter((t) => {
      if (isReady(t.order)) return false;
      const key = t.tableId + "|" + (t.order.kotSentAt || "");
      if (minutesSince(t.order.kotSentAt || t.order.startedAt) < lateMin || lateSeen.current.has(key)) return false;
      lateSeen.current.add(key);
      return true;
    });
    if (newlyLate.length && sound && seen.current) beep(3);
  }, [tick, tickets, lateMin, sound]);
  const activeN = tickets.filter((t) => !isReady(t.order)).length;
  const readyN = tickets.length - activeN;
  const shown = tickets.filter((t) => filter === "All" || (filter === "Active" && !isReady(t.order)) || (filter === "Ready" && isReady(t.order)));

  const setStatus = async (tableId, status) => {
    const orders = { ...s.orders, [tableId]: { ...s.orders[tableId], kitchenStatus: status } };
    if (await save("orders", orders)) notify(status === "Ready" ? "Marked ready: waiter can serve" : "Moved back to preparing");
  };

  return (
    <section className="kitchen-page">
      <div className="heading">
        <div>
          <h1>Kitchen</h1>
          <p>Orders sent by KOT appear here. Mark them ready when the food is done.</p>
        </div>
        <div className="kitchen-controls inline">
          <div className="search">
            <Search size={15} />
            <input placeholder="Search table or dish..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button
            className={"btn sound-btn" + (sound ? " on" : "")}
            onClick={toggleSound}
            aria-pressed={sound}
            title={sound ? "Sound alerts on (new orders, late orders)" : "Sound alerts off"}
          >
            {sound ? <Volume2 size={15} /> : <VolumeX size={15} />} {sound ? "Sound on" : "Sound off"}
          </button>
          <div className="tabs">
            {[["Active", activeN], ["Ready", readyN], ["All", tickets.length]].map(([x, n]) => (
              <button key={x} className={filter === x ? "selected" : ""} onClick={() => setFilter(x)}>
                {x} <b>{n}</b>
              </button>
            ))}
          </div>
        </div>
      </div>

      {shown.length ? (
        <div className="kot-grid">
          {shown.map(({ tableId, order, table, view }) => {
            const ready = isReady(order);
            const sentAt = order.kotSentAt || order.startedAt;
            const mins = minutesSince(sentAt);
            const late = !ready && mins >= lateMin;
            // later batch: show which items are new and which the kitchen already has
            const hasEarlier = view.some((i) => i.newQty < i.quantity);
            return (
              <article className={`kot-card ${ready ? "ready" : ""}${late ? " late" : ""}`} key={tableId}>
                <div className="kot-card-head">
                  <h3>{table}</h3>
                  <span className={`kot-status ${ready ? "ready" : "active"}`}>{ready ? "Ready" : "Preparing"}</span>
                </div>
                <div className="kot-time">
                  <Clock3 size={13} /> Sent {sentAt ? new Date(sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "just now"}
                  {sentAt ? " · " + fmtMin(mins) : ""}
                  {late && <span className="kot-late-tag">LATE</span>}
                </div>
                <div className="kot-items">
                  {view.map((item, i) => {
                    const isNew = hasEarlier && item.newQty > 0;
                    return (
                      <div key={`${item.name}-${item.variant}-${i}`} className={hasEarlier && !isNew ? "kot-old" : ""}>
                        <span className="kot-qty">{item.quantity}×</span>
                        <div>
                          <b>
                            {item.name}
                            {isNew && <span className="kot-new-tag">NEW{item.newQty < item.quantity ? " +" + item.newQty : ""}</span>}
                          </b>
                          {item.variant && <small>{item.variant}</small>}
                        </div>
                        <span className={`food-type ${dishType(item) === "non-veg" ? "nonveg" : "veg"}`} />
                      </div>
                    );
                  })}
                </div>
                {order.notes && <p className="kot-note">Note: {order.notes}</p>}
                {order.cancelled?.length > 0 && (
                  <p className="kot-note kot-cancelled">
                    Cancelled: {order.cancelled.map((c) => `${c.quantity}× ${c.name}${c.variant ? " (" + c.variant + ")" : ""}`).join(", ")}
                  </p>
                )}
                <div className="kot-card-foot">
                  {ready ? (
                    <>
                      <button className="btn" onClick={() => setStatus(tableId, "Preparing")}>
                        <Undo2 size={14} /> Undo
                      </button>
                      <button className="primary" onClick={() => nav(`/billing/${tableId}`)}>Open to bill</button>
                    </>
                  ) : (
                    <>
                      <button className="btn" onClick={() => printKOT?.(tableId, { ...order, items: view }, table)} title="Print KOT">
                        <Printer size={14} />
                      </button>
                      <button className="primary" onClick={() => setStatus(tableId, "Ready")}>
                        <Check size={15} /> Mark ready
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="floor-empty">
          <ChefHat size={28} />
          <b>{filter === "Ready" ? "Nothing waiting to be served" : "No orders in the kitchen"}</b>
          <span>Pick food on a table and press “Send to kitchen”. It will show up here.</span>
          <button className="text-btn" onClick={() => nav("/tables")}>Go to Tables</button>
        </div>
      )}
    </section>
  );
}
