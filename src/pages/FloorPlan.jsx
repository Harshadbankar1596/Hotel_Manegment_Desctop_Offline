import { useMemo, useState } from "react";
import {
  Eye,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Table2,
  Utensils,
  X,
} from "lucide-react";

const statusColor = {
  Available: "free",
  Running: "running",
  Paid: "paid",
  "Running KOT": "kot",
};

export default function FloorPlan({ s, save, nav, notify }) {
  const [zone, setZone] = useState("A/C");
  const [filter, setFilter] = useState("All tables");
  const [adding, setAdding] = useState(false);
  const [tableName, setTableName] = useState("");
  const tables = useMemo(
    () => (s.tables || []).filter((t) => t.enabled !== false),
    [s.tables],
  );
  const stateFor = (table) => {
    const order = s.orders?.[table.id];
    if (!order?.items?.length) return "Available";
    return order.kotSent ? "Running KOT" : "Running";
  };
  const zones = [
    { name: "A/C", tables },
    { name: "Non A/C", tables: [] },
    { name: "Bar", tables: [] },
  ];
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
        zone,
      },
    ]);
    if (ok) {
      setTableName("");
      setAdding(false);
      notify("Table added");
    }
  };
  const shown = (
    zone === "A/C" ? tables : tables.filter((t) => (t.zone || "A/C") === zone)
  ).filter((t) => filter === "All tables" || stateFor(t) === filter);
  return (
    <section className="floor-page">
      <div className="floor-toolbar">
        <div className="floor-title">
          <div>
            <span className="eyebrow">RESTAURANT OPERATIONS</span>
            <h1>Table View</h1>
            <p>Manage floor tables, active orders and kitchen tickets.</p>
          </div>
          <div className="floor-quick">
            <button className="btn" onClick={() => nav("/billing/takeaway")}>
              <ShoppingBag size={15} /> Take Away
            </button>
            <button className="primary" onClick={() => setAdding((v) => !v)}>
              <Plus size={15} /> Add Table
            </button>
          </div>
        </div>
        <div className="floor-actions">
          <div className="floor-tabs">
            {["A/C", "Non A/C", "Bar"].map((z) => (
              <button
                key={z}
                className={zone === z ? "active" : ""}
                onClick={() => setZone(z)}
              >
                {z}
              </button>
            ))}
          </div>
          <label className="floor-search">
            <Search size={15} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>All tables</option>
              <option>Available</option>
              <option>Running</option>
              <option>Running KOT</option>
            </select>
          </label>
          <button className="btn" onClick={() => nav("/kitchen")}>
            <Utensils size={15} /> Kitchen / KOT
          </button>
        </div>
      </div>
      {adding && (
        <div className="floor-add">
          <input
            autoFocus
            placeholder="Table name e.g. Table 29"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTable()}
          />
          <button className="primary" onClick={addTable}>
            Save table
          </button>
          <button className="btn" onClick={() => setAdding(false)}>
            <X size={15} /> Cancel
          </button>
        </div>
      )}
      <div className="floor-legend">
        <span>
          <i className="legend-free" /> Available table
        </span>
        <span>
          <i className="legend-running" /> Running table
        </span>
        <span>
          <i className="legend-paid" /> Paid / recently closed
        </span>
        <span>
          <i className="legend-kot" /> Running KOT
        </span>
        <span className="legend-note">{shown.length} tables shown</span>
      </div>
      {zones.map((group) => {
        const groupTables = group.name === zone ? shown : [];
        if (group.name !== zone) return null;
        return (
          <div className="floor-zone" key={group.name}>
            <div className="zone-heading">
              <h2>{group.name}</h2>
              <span>{groupTables.length} tables</span>
            </div>
            {groupTables.length ? (
              <div className="floor-grid">
                {groupTables.map((table, index) => {
                  const state = stateFor(table);
                  const order = s.orders?.[table.id];
                  const amount = (order?.items || []).reduce(
                    (sum, item) => sum + item.unitPricePaise * item.quantity,
                    0,
                  );
                  return (
                    <button
                      key={table.id}
                      className={`floor-table ${statusColor[state] || "free"}`}
                      onClick={() => nav(`/billing/${table.id}`)}
                    >
                      <div className="floor-table-head">
                        <span className="floor-table-icon">
                          <Table2 size={15} />
                        </span>
                        <span className="floor-state-dot" />
                      </div>
                      <strong>{table.name}</strong>
                      <small>
                        {state === "Available"
                          ? "Ready for guests"
                          : `${order.items.reduce((a, i) => a + i.quantity, 0)} items · ${state}`}
                      </small>
                      {order?.items?.length ? (
                        <b className="floor-total">
                          ₹
                          {(amount / 100).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </b>
                      ) : (
                        <span className="floor-table-open">
                          Open table <span>→</span>
                        </span>
                      )}
                      {state !== "Available" && (
                        <span className="floor-table-tools">
                          <span title="Open order">
                            <Eye size={13} />
                          </span>
                          <span title="Print KOT">
                            <Printer size={13} />
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="floor-empty">
                <Table2 size={23} />
                <b>No tables in {zone}</b>
                <span>Add a table to start taking orders in this section.</span>
                <button className="text-btn" onClick={() => setAdding(true)}>
                  + Add table
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
