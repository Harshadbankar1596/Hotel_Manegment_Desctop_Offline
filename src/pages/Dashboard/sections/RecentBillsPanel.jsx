import { Receipt } from "lucide-react";
import { Empty, Panel } from "../../../components/ui/index.js";
import { fmtTime, money } from "../../../utils/format.js";

export default function RecentBillsPanel({ nav, recent }) {
  return (
    <Panel
      title="Recent bills"
      desc="Your latest transactions"
      action={
        <button className="text-btn" onClick={() => nav("/bills")}>
          View all →
        </button>
      }
    >
      {recent.length ? (
        recent.map((b) => (
          <button
            className="recent"
            key={b.id}
            onClick={() => nav("/bills/" + b.id)}
          >
            <span className="rec-icon">
              <Receipt size={16} />
            </span>
            <span>
              <b>{b.billNumber}</b>
              <small>
                {b.tableName} ·{" "}
                {fmtTime(b.createdAt)}
              </small>
            </span>
            <strong>
              {money(b.grandTotalPaise)}
              <small className={"status " + b.status?.toLowerCase()}>
                {b.status}
              </small>
            </strong>
          </button>
        ))
      ) : (
        <Empty title="No bills yet" desc="Completed bills appear here." />
      )}
    </Panel>
  );
}
