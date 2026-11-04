import { Plus, Save, Trash2 } from "lucide-react";
import { Btn } from "../../../components/ui/index.js";
import { taxList } from "../../../utils/tax.js";

export default function TaxSection({ notify, save, setSettings, settings }) {
  const taxes = taxList(settings);
  const setTaxes = (fn) => setSettings((p) => ({ ...p, taxes: fn(taxList(p)) }));
  const activeRate = taxes.filter((t) => t.enabled !== false).reduce((a, t) => a + (Number(t.rate) || 0), 0);
  const saveTax = async () => {
    for (const t of taxes) {
      if (!String(t.name || "").trim()) return notify("Every tax needs a name", "error");
      const r = Number(t.rate);
      if (!Number.isFinite(r) || r < 0 || r > 100) return notify(`Tax rate for “${t.name}” must be between 0 and 100`, "error");
    }
    const clean = taxes.map((t) => ({ name: t.name.trim(), rate: Number(t.rate), enabled: t.enabled !== false }));
    const sc = Number(settings.serviceChargeRate) || 0;
    if (sc < 0 || sc > 100) return notify("Service charge must be between 0 and 100", "error");
    if (
      await save("settings", {
        ...settings,
        taxes: clean,
        taxName: clean[0]?.name || "GST",
        taxRate: clean.filter((t) => t.enabled).reduce((a, t) => a + t.rate, 0),
        serviceChargeRate: sc,
        billPrefix: (settings.billPrefix || "BILL-").trim() || "BILL-",
      })
    )
      notify("Billing settings saved");
  };

  return (
    <>
      <label className="check-field">
        <input type="checkbox" checked={!!settings.taxEnabled} onChange={(e) => setSettings({ ...settings, taxEnabled: e.target.checked })} />{" "}
        Enable tax calculation on bills
      </label>
      <b className="form-subhead">Taxes</b>
      {taxes.map((tax, i) => (
        <div className="tax-card" key={i}>
          <label className="field-label">
            Tax name
            <input value={tax.name} placeholder="e.g. CGST" onChange={(e) => setTaxes((l) => l.map((t, j) => (j === i ? { ...t, name: e.target.value } : t)))} />
          </label>
          <label className="field-label">
            Rate (%)
            <input type="number" min="0" max="100" step="0.01" value={tax.rate} onChange={(e) => setTaxes((l) => l.map((t, j) => (j === i ? { ...t, rate: e.target.value } : t)))} />
          </label>
          <label className="check-field">
            <input type="checkbox" checked={tax.enabled !== false} onChange={(e) => setTaxes((l) => l.map((t, j) => (j === i ? { ...t, enabled: e.target.checked } : t)))} />{" "}
            Active
          </label>
          <button className="btn danger-btn" title="Remove tax" onClick={() => setTaxes((l) => l.filter((_, j) => j !== i))}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button className="btn" onClick={() => setTaxes((l) => [...l, { name: "", rate: 0, enabled: true }])}>
        <Plus size={15} /> Add tax
      </button>
      <div className="tax-summary">
        <span>Total active tax</span>
        <span>{Math.min(100, activeRate)}%</span>
      </div>
      <label className="field-label">
        Tax mode
        <select value={settings.taxMode || "exclusive"} onChange={(e) => setSettings({ ...settings, taxMode: e.target.value })}>
          <option value="exclusive">Tax exclusive (added on top of the price)</option>
          <option value="inclusive">Tax inclusive (already in the price)</option>
        </select>
      </label>
      <label className="field-label">
        Service charge (%)
        <input type="number" min="0" max="100" value={settings.serviceChargeRate ?? 0} onChange={(e) => setSettings({ ...settings, serviceChargeRate: e.target.value })} />
      </label>
      <label className="field-label">
        Bill prefix
        <input value={settings.billPrefix || ""} onChange={(e) => setSettings({ ...settings, billPrefix: e.target.value })} />
      </label>
      <label className="field-label">
        Receipt paper size
        <select value={settings.receiptSize || "80mm"} onChange={(e) => setSettings({ ...settings, receiptSize: e.target.value })}>
          {["58mm", "80mm", "A4"].map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <p className="warning-note">Tax rates are not hardcoded. Configure them according to your business’s actual tax treatment.</p>
      <Btn primary icon={Save} onClick={saveTax}>Save billing settings</Btn>
    </>
  );
}
