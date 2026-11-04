import { useMemo, useState } from "react";
import { ChefHat, Pencil, Plus, ShoppingBag, Trash2, Utensils, X } from "lucide-react";

const ZONES = ["A/C", "Non A/C", "Bar"];
/* key, label, css class, hint shown on the card */
const STATES = [
  ["Available", "Free", "free", "Tap to start order"],
  ["Running", "Ordering", "running", "Continue order"],
  ["Running KOT", "In kitchen", "kot", "Add more or bill"],
  ["Ready", "Ready to serve", "ready", "Serve, then bill"],
];
const NO_ZONE = "No section";
const zoneOf = (t) => t.zone || NO_ZONE;
const isTakeawayId = (id) => id === "takeaway" || String(id).startsWith("takeaway-");
const newTakeawayId = () => "takeaway-" + (crypto.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2));
const stateOf = (o) => (o?.kotSent ? (o.kitchenStatus === "Ready" ? "ready" : "kot") : "running");
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

export default function FloorPlan({ s, save, nav, notify, ask }) {
  const [zone, setZone] = useState("All");
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [tableName, setTableName] = useState("");
  const [newZone, setNewZone] = useState("");
  const [editing, setEditing] = useState(false);

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
  // every open takeaway order (one per customer), oldest first
  const takeaways = Object.entries(s.orders || {})
    .filter(([id, o]) => isTakeawayId(id) && o?.items?.length)
    .sort((a, b) => String(a[1].startedAt || "").localeCompare(String(b[1].startedAt || "")));
  const zoneList = [...ZONES, ...new Set(tables.map((t) => t.zone).filter((z) => z && !ZONES.includes(z)))];
  const zonesUsed = [...zoneList, NO_ZONE].filter((z) => tables.some((t) => zoneOf(t) === z));
  const running = tables.length - tables.filter((t) => stateFor(t) === "Available").length;

  const nameTaken = (n, exceptId) =>
    tables.some((t) => t.id !== exceptId && String(t.name || "").trim().toLowerCase() === n.trim().toLowerCase());
  const renameTable = async (t) => {
    const n = await ask({
      title: "Rename table",
      input: { label: "Table name", value: t.name },
      confirmLabel: "Save name",
    });
    if (n == null || n === t.name) return;
    if (nameTaken(n, t.id)) return notify("A table named “" + n + "” already exists", "error");
    if (await save("tables", (s.tables || []).map((x) => (x.id === t.id ? { ...x, name: n } : x)))) notify("Table renamed");
  };
  const changeZone = async (t, zone) => {
    await save("tables", (s.tables || []).map((x) => (x.id === t.id ? { ...x, zone } : x)));
  };
  const removeTable = async (t) => {
    if (s.orders?.[t.id]?.items?.length)
      return notify(t.name + " has an open order. Settle or clear it before deleting the table.", "error");
    const yes = await ask({
      title: "Delete " + t.name + "?",
      message: "The table will be removed from your floor. Past bills keep their table name.",
      confirmLabel: "Delete table",
      danger: true,
    });
    if (!yes) return;
    if (await save("tables", (s.tables || []).filter((x) => x.id !== t.id))) notify("Table deleted");
  };
  const addTable = async () => {
    const name = tableName.trim();
    if (!name) return notify("Enter a table name", "error");
    if (nameTaken(name)) return notify("Table already exists", "error");
    const all = s.tables || [];
    const ok = await save("tables", [
      ...all,
      {
        id: `table-${crypto.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2)}`,
        name,
        enabled: true,
        order: all.length + 1,
        ...(newZone ? { zone: newZone } : {}),
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
          <button className="btn" onClick={() => nav("/billing/" + newTakeawayId())}>
            <ShoppingBag size={16} /> New takeaway
          </button>
          <button className={"btn" + (editing ? " on" : "")} onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
            <Pencil size={15} /> {editing ? "Done editing" : "Edit tables"}
          </button>
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
            <option value="">{NO_ZONE}</option>
            {zoneList.map((z) => (
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

      <div className="floor-grid takeaway-row" aria-label="Takeaway orders">
        {takeaways.map(([id, o]) => {
          const st = stateOf(o);
          const qty = o.items.reduce((a, i) => a + i.quantity, 0);
          const amount = o.items.reduce((sum, i) => sum + i.unitPricePaise * i.quantity, 0);
          return (
            <button key={id} className={"floor-table takeaway " + st} onClick={() => nav("/billing/" + id)}>
              <span className="ft-top">
                <strong>{o.label || "Takeaway"}</strong>
                <ShoppingBag size={18} />
              </span>
              <span className={"ft-state " + st}>
                <i className={"dot " + st} /> {st === "ready" ? "Ready to serve" : st === "kot" ? "In kitchen" : "Ordering"}
              </span>
              <b className="ft-amount">{rupees(amount)}</b>
              <small className="ft-meta">
                {qty} item{qty > 1 ? "s" : ""}
                {since(o.startedAt) ? " · " + since(o.startedAt) : ""}
              </small>
            </button>
          );
        })}
        <button className="floor-table takeaway" onClick={() => nav("/billing/" + newTakeawayId())}>
          <span className="ft-top">
            <strong>Takeaway</strong>
            <ShoppingBag size={18} />
          </span>
          <span className="ft-state"><i className="dot free" /> {takeaways.length ? "Another customer?" : "No order"}</span>
          <b className="ft-open">+ New takeaway order</b>
        </button>
      </div>

      {shown.length ? (
        <div className="floor-grid">
          {shown.map((table) => {
            const state = stateFor(table);
            const cls = STATES.find((x) => x[0] === state)?.[2] || "free";
            const label = STATES.find((x) => x[0] === state)?.[1] || "Free";
            const hint = STATES.find((x) => x[0] === state)?.[3] || "Tap to open";
            const order = s.orders?.[table.id];
            const items = order?.items || [];
            const amount = items.reduce((sum, i) => sum + i.unitPricePaise * i.quantity, 0);
            const qty = items.reduce((a, i) => a + i.quantity, 0);
            const inner = (
              <>
                <span className="ft-top">
                  <strong>{table.name}</strong>
                  {table.zone && <small>{table.zone}</small>}
                </span>
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
              </>
            );
            if (editing)
              return (
                <div key={table.id} className={"floor-table editing " + cls}>
                  {inner}
                  <span className="ft-tools">
                    <select
                      value={table.zone || ""}
                      onChange={(e) => changeZone(table, e.target.value)}
                      aria-label={"Section for " + table.name}
                    >
                      <option value="">{NO_ZONE}</option>
                      {zoneList.map((z) => (
                        <option key={z}>{z}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => renameTable(table)}>
                      <Pencil size={13} /> Rename
                    </button>
                    <button type="button" className="del" onClick={() => removeTable(table)}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </span>
                </div>
              );
            return (
              <button key={table.id} className={"floor-table " + cls} onClick={() => nav(`/billing/${table.id}`)}>
                {inner}
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
