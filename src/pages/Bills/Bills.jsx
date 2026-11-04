import { useState } from "react";
import { Download } from "lucide-react";
import { Btn, Heading } from "../../components/ui/index.js";
import { csvCell } from "../../utils/csv.js";
import { billDay, errMsg, fmtDateTime } from "../../utils/format.js";
import { BILL_PAGE } from "./constants.js";
import BillsStats from "./sections/BillsStats.jsx";
import TransactionsPanel from "./sections/TransactionsPanel.jsx";

export default function Bills({ s, query, setQuery, nav, notify }) {
  const [status, setStatus] = useState("All"),
    [date, setDate] = useState(""),
    [page, setPage] = useState(0),
    [tableSearch, setTableSearch] = useState("");
  // only offer statuses that exist (the app cannot create Refunded / Cancelled / Voided bills)
  const statusOptions = ["All", "Paid", "Pending", ...new Set(s.bills.map((b) => b.status).filter((x) => x && x !== "Paid" && x !== "Pending"))];
  const bills = [...s.bills]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter(
      (b) =>
        [b.billNumber, b.tableName, b.tableId, b.customerName, b.customerPhone].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(query.toLowerCase()),
        ) &&
        (status === "All" || b.status === status) &&
        (!date || billDay(b) === date) &&
        String(b.tableName || "")
          .toLowerCase()
          .includes(tableSearch.toLowerCase()),
    );
  const pages = Math.max(1, Math.ceil(bills.length / BILL_PAGE));
  const curPage = Math.min(page, pages - 1);
  const csv = () => {
    const text = [
      "Bill,Date,Table,Customer,Phone,Subtotal,Discount,Tax,Service Charge,Total,Method,Status",
      ...bills.map((b) =>
        [
          b.billNumber,
          fmtDateTime(b.createdAt),
          b.tableName,
          b.customerName || "",
          b.customerPhone || "",
          ((b.subtotalPaise || 0) / 100).toFixed(2),
          ((b.discountPaise || 0) / 100).toFixed(2),
          ((b.taxPaise || 0) / 100).toFixed(2),
          ((b.serviceChargePaise || 0) / 100).toFixed(2),
          ((b.grandTotalPaise || 0) / 100).toFixed(2),
          b.paymentMethod || "",
          b.status,
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\n");
    if (!bills.length) return notify("No bills to export", "error");
    if (!window.hotelApp) return notify("Export works in the desktop app", "error");
    window.hotelApp
      .exportFile("csv", "\ufeff" + text)
      .then((r) => r && notify("CSV exported"))
      .catch((e) => notify(errMsg(e), "error"));
  };
  return (
    <>
      <Heading
        eyebrow="TRANSACTIONS"
        title="Previous bills"
        desc="Review transactions and reprint receipts without modifying historical values."
        action={
          <Btn icon={Download} onClick={csv}>
            Export CSV
          </Btn>
        }
      />
      <BillsStats s={s} />
      <TransactionsPanel
        bills={bills}
        curPage={curPage}
        date={date}
        nav={nav}
        pages={pages}
        query={query}
        setDate={setDate}
        setPage={setPage}
        setQuery={setQuery}
        setStatus={setStatus}
        setTableSearch={setTableSearch}
        status={status}
        statusOptions={statusOptions}
        tableSearch={tableSearch}
      />
    </>
  );
}
