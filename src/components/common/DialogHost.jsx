import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { setDialogOpener } from "../../services/dialog.js";

export default function DialogHost() {
  const [d, setD] = useState(null);
  const [val, setVal] = useState("");
  useEffect(() => {
    setDialogOpener((o) => {
      setVal(o.input?.value || "");
      setD(o);
    });
    return () => {
      setDialogOpener(null);
    };
  }, []);
  useEffect(() => {
    if (!d) return;
    const k = (e) => e.key === "Escape" && close(d.input ? null : false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  if (!d) return null;
  const close = (r) => {
    d.resolve(r);
    setD(null);
  };
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close(d.input ? null : false)}>
      <form
        className="modal small"
        onSubmit={(e) => {
          e.preventDefault();
          if (d.input && !val.trim()) return;
          close(d.input ? val.trim() : true);
        }}
      >
        <div className="modal-head">
          <h3>{d.title}</h3>
          <button type="button" onClick={() => close(d.input ? null : false)} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {d.message && <p className="confirm-body">{d.message}</p>}
        {d.input && (
          <label className="field-label">
            {d.input.label}
            <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} />
          </label>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => close(d.input ? null : false)}>
            Cancel
          </button>
          <button type="submit" autoFocus={!d.input} className={d.danger ? "primary danger-fill" : "primary"} style={d.danger ? { background: "var(--bad)" } : undefined}>
            {d.confirmLabel || "OK"}
          </button>
        </div>
      </form>
    </div>
  );
}
