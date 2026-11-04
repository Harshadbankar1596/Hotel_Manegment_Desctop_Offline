import { Receipt, Settings, Table2, Utensils } from "lucide-react";
import { Panel } from "../../../components/ui/index.js";

export default function QuickActionsPanel({ nav }) {
  return (
    <Panel title="Quick actions" desc="Jump into daily operations">
      <div className="quick-actions">
        <button onClick={() => nav("/tables")}>
          <Table2 />
          <b>Manage tables</b>
          <small>Open orders and seating</small>
        </button>
        <button onClick={() => nav("/menu")}>
          <Utensils />
          <b>Update menu</b>
          <small>Dishes and pricing</small>
        </button>
        <button onClick={() => nav("/bills")}>
          <Receipt />
          <b>Previous bills</b>
          <small>Review transactions</small>
        </button>
        <button onClick={() => nav("/settings")}>
          <Settings />
          <b>Settings</b>
          <small>Hotel preferences</small>
        </button>
      </div>
    </Panel>
  );
}
