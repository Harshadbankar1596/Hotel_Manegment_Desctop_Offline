import { Search } from "lucide-react";
import { Empty, Panel } from "../../../components/ui/index.js";
import { fmtDateTime, money } from "../../../utils/format.js";
import { BILL_PAGE } from "../constants.js";

export default function TransactionsPanel({
  bills,
  curPage,
  date,
  nav,
  pages,
  query,
  setDate,
  setPage,
  setQuery,
  setStatus,
  setTableSearch,
  status,
  statusOptions,
  tableSearch,
}) {
  return (
    <Panel title="Transaction history" desc={`${bills.length} results`}>
      <div className="toolbar">
        <div className="search">
          <Search size={15} />
          <input
            placeholder="Search bill, table, customer…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          />
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setPage(0); }}
        />
        <input
          placeholder="Filter table…"
          value={tableSearch}
          onChange={(e) => { setTableSearch(e.target.value); setPage(0); }}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          {statusOptions.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>BILL NUMBER</th>
              <th>DATE & TIME</th>
              <th>TABLE</th>
              <th>SUBTOTAL</th>
              <th>DISCOUNT</th>
              <th>TAX</th>
              <th>TOTAL</th>
              <th>METHOD</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {bills.slice(curPage * BILL_PAGE, (curPage + 1) * BILL_PAGE).map((b) => (
              <tr
                key={b.id}
                className="click"
                tabIndex={0}
                onClick={() => nav("/bills/" + b.id)}
                onKeyDown={(e) => e.key === "Enter" && nav("/bills/" + b.id)}
              >
                <td>
                  <b className="bill-link">{b.billNumber}</b>
                </td>
                <td>{fmtDateTime(b.createdAt)}</td>
                <td>{b.tableName}</td>
                <td>{money(b.subtotalPaise)}</td>
                <td>{money(b.discountPaise)}</td>
                <td>{money(b.taxPaise)}</td>
                <td>
                  <b>{money(b.grandTotalPaise)}</b>
                </td>
                <td>{b.paymentMethod || "—"}</td>
                <td>
                  <span className={"status " + b.status?.toLowerCase()}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="pager">
            <button className="btn" disabled={curPage === 0} onClick={() => setPage(curPage - 1)}>← Newer</button>
            <span>
              Page {curPage + 1} of {pages} · showing {curPage * BILL_PAGE + 1}–{Math.min(bills.length, (curPage + 1) * BILL_PAGE)} of {bills.length}
            </span>
            <button className="btn" disabled={curPage >= pages - 1} onClick={() => setPage(curPage + 1)}>Older →</button>
          </div>
        )}
        {!bills.length && (
          <Empty
            title="No matching bills"
            desc="Completed transactions appear here."
          />
        )}
      </div>
    </Panel>
  );
}
