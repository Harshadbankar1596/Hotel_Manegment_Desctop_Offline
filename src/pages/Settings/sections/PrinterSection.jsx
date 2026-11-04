import { Printer, RefreshCw, Save } from "lucide-react";
import { Btn, Empty } from "../../../components/ui/index.js";

export default function PrinterSection({
  choosePrinter,
  loadingPrinters,
  notify,
  printers,
  refreshPrinters,
  save,
  setSettings,
  settings,
}) {
  return (
    <>
      <p className="settings-intro">Connect two printers once. Kitchen orders go to the KOT printer; customer bills go to the payment printer.</p>
      {!printers?.length && !loadingPrinters && <Empty title="Printer list not loaded" desc="Refresh printers after connecting the printer and installing its Windows driver." />}
      {loadingPrinters && <p>Searching for installed printers…</p>}
      {[{role:"kitchen",title:"Kitchen printer",desc:"Order tickets · KOT · No prices"},{role:"payment",title:"Payment printer",desc:"Customer bill · Tax · Payment details"}].map(cfg => {
        const key = cfg.role === "kitchen" ? "kitchenPrinterName" : "paymentPrinterName";
        return <div className="printer-config" key={cfg.role}><div className="printer-config-head"><span className="printer-icon"><Printer size={20}/></span><div><b>{cfg.title}</b><small>{cfg.desc}</small></div><em className={settings[key] ? "connected" : "not-connected"}>{settings[key] ? "Connected" : "Not connected"}</em></div><label className="field-label">Select device<select value={settings[key] || ""} onChange={e=>choosePrinter(cfg.role,e.target.value)}><option value="">Use system print dialog</option>{(printers || []).map(pr=><option key={pr.name} value={pr.name}>{pr.displayName || pr.name}{pr.isDefault ? " (Default)" : ""}</option>)}</select></label><div className="printer-config-foot"><small>{settings[key] || "No printer selected"}</small>{settings[key] && <button className="text-btn danger" onClick={()=>choosePrinter(cfg.role,"")}>Disconnect</button>}</div></div>;
      })}
      <div className="settings-inline-actions"><Btn icon={RefreshCw} onClick={refreshPrinters}>Refresh printer list</Btn><label className="field-label">Receipt paper size<select value={settings.receiptSize || "80mm"} onChange={e=>setSettings({...settings,receiptSize:e.target.value})}>{["58mm","80mm","A4"].map(x=><option key={x}>{x}</option>)}</select></label><Btn primary icon={Save} onClick={async()=>{if(await save("settings",settings))notify("Printer settings saved")}}>Save printer settings</Btn></div>
      <p className="warning-note">Tip: Select a printer for each role. If left blank, Windows print dialog will open. Use separate physical printers for kitchen and customer receipts.</p>
    </>
  );
}
