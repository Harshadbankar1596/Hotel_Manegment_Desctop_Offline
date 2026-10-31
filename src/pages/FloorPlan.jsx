import { useMemo, useState } from "react";
import { ChefHat, Plus, ShoppingBag, Utensils, X } from "lucide-react";

const ZONES = ["A/C", "Non A/C", "Bar"];
/* key, label, css class, hint shown on the card */
const STATES = [
  ["Available", "Free", "free", "Tap to start order"],
  ["Running", "Ordering", "running", "Continue order"],
  ["Running KOT", "In kitchen", "kot", "Add more or bill"],
  ["Ready", "Ready to serve", "ready", "Serve, then bill"],
];
const zoneOf = (t) => t.zone || "A/C";
const rupees = (paise) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    (Number(paise) || 0) / 100,
  );
const since = (v) => {
  const d = new Date(v);
  if (!v || isNaN(d)) return "";
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  return m < 60 ? m + " min" : Math.floor(m / 60) + "h " + (m % 60) + "m";
};

export default function FloorPlan({ s, save, nav, notify }) {
  const [zone, setZone] = useState("All");
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [tableName, setTableName] = useState("");
  const [newZone, setNewZone] = useState("A/C");

  const tables = useMemo(
    () => (s.tables || []).filter((t) => t.enabled !== false),
    [s.tables],
  );
  const stateFor = (table) => {
    const order = s.orders?.[table.id];
    if (!order?.items?.length) return "Available";
    if (!order.kotSent) return "Running";
    return order.kitchenStatus === "Ready" ? "Ready" : "Running KOT";
  };
  const inZone = tables.filter((t) => zone === "All" || zoneOf(t) === zone);
  const shown = inZone.filter((t) => filter === "All" || stateFor(t) === filter);
  const count = (st) => inZone.filter((t) => stateFor(t) === st).length;
  const takeaway = s.orders?.takeaway;
  const takeawayItems = takeaway?.items || [];
  const takeawayAmount = takeawayItems.reduce((sum, i) => sum + i.unitPricePaise * i.quantity, 0);
  const zonesUsed = ZONES.filter((z) => tables.some((t) => zoneOf(t) === z));
  const running = tables.length - tables.filter((t) => stateFor(t) === "Available").length;

  const addTable = async () => {
    const name = tableName.trim();
    if (!name) return notify("Enter a table name", "error");
    if (tables.some((t) => t.name.toLowerCase() === name.toLowerCase()))
      return notify("Table already exists", "error");
    const ok = await save("tables", [
      ...s.tables,
      {
        id: `table-${crypto.randomUUID()}`,
        name,
        enabled: true,
        order: s.tables.length + 1,
        zone: newZone,
      },
    ]);
    if (ok) {
      setTableName("");
      setAdding(false);
      notify("Table added");
    }
  };

  return (
    <section className="floor-page">
      <div className="page-head">
        <div>
          <h1>Tables</h1>
          <p>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            {" · "}
            {tables.length - running} free · {running} busy
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => setAdding((v) => !v)}>
            <Plus size={16} /> Add table
          </button>
        </div>
      </div>

      {adding && (
        <div className="floor-add">
          <input
            autoFocus
            placeholder="Table name e.g. T13"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTable()}
          />
          <select value={newZone} onChange={(e) => setNewZone(e.target.value)} aria-label="Section">
            {ZONES.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
          <button className="primary" onClick={addTable}>
            Save table
          </button>
          <button className="btn" onClick={() => setAdding(false)}>
            <X size={15} /> Cancel
          </button>
        </div>
      )}

      <div className="floor-bar">
        <div className="pill-row">
          {zonesUsed.length > 1 && ["All", ...zonesUsed].map((z) => {
            const n = tables.filter((t) => z === "All" || zoneOf(t) === z).length;
            return (
              <button key={z} className={"pill" + (zone === z ? " active" : "")} onClick={() => setZone(z)}>
                {z === "All" ? "All" : z} <span>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="legend-filter">
          {STATES.map(([key, label, cls]) => (
            <button
              key={key}
              className={filter === key ? "on" : ""}
              onClick={() => setFilter(filter === key ? "All" : key)}
              title={"Show only " + label.toLowerCase() + " tables"}
            >
              <i className={"dot " + cls} /> {label} <b>{count(key)}</b>
            </button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <div className="floor-grid">
          {filter === "All" && zone === "All" && (
            <button
              className={"floor-table takeaway" + (takeawayItems.length ? " running" : "")}
              onClick={() => nav("/billing/takeaway")}
            >
              <div className="ft-top">
                <strong>Takeaway</strong>
                <ShoppingBag size={18} />
              </div>
              {takeawayItems.length ? (
                <>
                  <span className="ft-state running"><i className="dot running" /> Ordering</span>
                  <b className="ft-amount">{rupees(takeawayAmount)}</b>
                  <small className="ft-meta">{takeawayItems.reduce((a, i) => a + i.quantity, 0)} items</small>
                </>
              ) : (
                <>
                  <span className="ft-state"><i className="dot free" /> No order</span>
                  <b className="ft-open">+ New takeaway order</b>
                </>
              )}
            </button>
          )}
          {shown.map((table) => {
            const state = stateFor(table);
            const cls = STATES.find((x) => x[0] === state)?.[2] || "free";
            const label = STATES.find((x) => x[0] === state)?.[1] || "Free";
            const hint = STATES.find((x) => x[0] === state)?.[3] || "Tap to open";
            const order = s.orders?.[table.id];
            const items = order?.items || [];
            const amount = items.reduce((sum, i) => sum + i.unitPricePaise * i.quantity, 0);
            const qty = items.reduce((a, i) => a + i.quantity, 0);
            return (
              <button
                key={table.id}
                className={"floor-table " + cls}
                onClick={() => nav(`/billing/${table.id}`)}
              >
                <div className="ft-top">
                  <strong>{table.name}</strong>
                  <small>{zoneOf(table)}</small>
                </div>
                <span className={"ft-state " + cls}>
                  <i className={"dot " + cls} /> {label}
                </span>
                {items.length ? (
                  <>
                    <b className="ft-amount">{rupees(amount)}</b>
                    <small className="ft-meta">
                      {qty} item{qty > 1 ? "s" : ""}
                      {since(order.startedAt) ? " · " + since(order.startedAt) : ""}
                      {order.kotSent && (
                        <>
                          {" · "}
                          <ChefHat size={11} /> KOT
                        </>
                      )}
                    </small>
                  </>
                ) : (
                  <b className="ft-open">{hint}</b>
                )}
                {items.length > 0 && <span className="ft-hint">{hint} →</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="floor-empty">
          <Utensils size={26} />
          <b>{tables.length ? "No tables match this filter" : "No tables yet"}</b>
          <span>
            {tables.length
              ? "Try another section or status."
              : "Add your first table to start taking orders."}
          </span>
          <button className="text-btn" onClick={() => (tables.length ? (setZone("All"), setFilter("All")) : setAdding(true))}>
            {tables.length ? "Clear filters" : "+ Add table"}
          </button>
        </div>
      )}
    </section>
  );
}
