import { useMemo, useState } from "react";
import { Check, ChefHat, Clock3, Printer, Search, Undo2 } from "lucide-react";

const isReady = (o) => o.kitchenStatus === "Ready";

export default function KitchenDisplay({ s, save, nav, notify, printKOT }) {
  const [filter, setFilter] = useState("Active");
  const [query, setQuery] = useState("");
  const tickets = useMemo(
    () =>
      Object.entries(s.orders || {})
        .filter(([, order]) => order?.items?.length && order.kotSent)
        .map(([tableId, order]) => ({
          tableId,
          order,
          table: s.tables.find((t) => t.id === tableId)?.name || (tableId === "takeaway" ? "Takeaway" : "Table"),
        }))
        .filter((t) => `${t.table} ${t.order.items.map((i) => i.name).join(" ")}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => String(a.order.kotSentAt || a.order.startedAt).localeCompare(String(b.order.kotSentAt || b.order.startedAt))),
    [s.orders, s.tables, query],
  );
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
          {shown.map(({ tableId, order, table }) => {
            const ready = isReady(order);
            return (
              <article className={`kot-card ${ready ? "ready" : ""}`} key={tableId}>
                <div className="kot-card-head">
                  <h3>{table}</h3>
                  <span className={`kot-status ${ready ? "ready" : "active"}`}>{ready ? "Ready" : "Preparing"}</span>
                </div>
                <div className="kot-time">
                  <Clock3 size={13} /> Sent{" "}
                  {order.kotSentAt || order.startedAt
                    ? new Date(order.kotSentAt || order.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "just now"}
                </div>
                <div className="kot-items">
                  {order.items.map((item, i) => (
                    <div key={`${item.name}-${i}`}>
                      <span className="kot-qty">{item.quantity}×</span>
                      <div>
                        <b>{item.name}</b>
                        {item.variant && <small>{item.variant}</small>}
                      </div>
                      <span className={`food-type ${item.type === "non-veg" ? "nonveg" : "veg"}`} />
                    </div>
                  ))}
                </div>
                {order.notes && <p className="kot-note">Note: {order.notes}</p>}
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
                      <button className="btn" onClick={() => printKOT?.(tableId, order, table)} title="Print KOT">
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
