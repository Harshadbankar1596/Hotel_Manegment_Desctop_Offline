import { AlertTriangle, Check, X } from "lucide-react";

export default function Toast({ setToast, toast }) {
  return (
    <div className={"toast " + toast.type} role={toast.type === "error" ? "alert" : "status"}>
      {toast.type === "error" ? <AlertTriangle size={16} /> : <Check size={16} />}
      {toast.m}
      <button onClick={() => setToast(null)} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
