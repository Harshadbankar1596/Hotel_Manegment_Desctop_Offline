import { Activity } from "lucide-react";

export default function OccupancyNotice({ activeTables, occupied, pending }) {
  return (
    <div className="notice">
      <Activity size={17} />
      <div>
        <b>
          {occupied} of {activeTables.length} tables occupied
        </b>
        <small>
          {pending
            ? pending + " pending bill" + (pending > 1 ? "s" : "") + " waiting for payment"
            : "No pending bills — everything is settled"}
        </small>
      </div>
      <span>
        <i /> Local data · up to date
      </span>
    </div>
  );
}
