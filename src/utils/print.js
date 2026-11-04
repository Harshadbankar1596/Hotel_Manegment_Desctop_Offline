import { errMsg, fmtDateTime, money, validDate } from "./format.js";

export const escHtml = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export const paperWidth = { "58mm": "52mm", "80mm": "72mm", A4: "170mm" };
/* Tax-inclusive bills: tax is already inside the total (older bills did not store the mode, so infer it) */
export const isInclusiveBill = (b) => {
  if (b.taxMode) return b.taxMode === "inclusive";
  const net = (b.subtotalPaise || 0) - (b.discountPaise || 0);
  return !!b.taxPaise && (b.grandTotalPaise || 0) - (b.serviceChargePaise || 0) === net;
};
export function receiptHtml(s, b) {
  const incl = isInclusiveBill(b);
  const w = paperWidth[s.settings.receiptSize] || paperWidth["80mm"];
  const row = (l, r, extra = "") => `<div class="r ${extra}"><span>${l}</span><b>${r}</b></div>`;
  const taxLines = b.taxBreakdown?.length
    ? b.taxBreakdown.filter((t) => t.amountPaise)
    : b.taxPaise
      ? [{ name: "Tax", rate: "", amountPaise: b.taxPaise }]
      : [];
  const net = Math.max(0, (b.subtotalPaise || 0) - (b.discountPaise || 0));
  // use the saved taxable value (tax-inclusive bills: total minus tax), not subtotal - discount
  const taxable = Number.isFinite(b.taxablePaise) ? b.taxablePaise : incl ? Math.max(0, net - (b.taxPaise || 0)) : net;
  const taxRows = taxLines.map((t) =>
    row(`${escHtml(t.name)}${t.rate !== "" ? ` @ ${escHtml(t.rate)}%` : ""}${incl ? " (incl.)" : ""}`, money(t.amountPaise)),
  );
  const items = (b.items || [])
    .map(
      (i) => `<tr><td>${escHtml(i.name)}${i.variant ? `<small>${escHtml(i.variant)}</small>` : ""}</td><td class="n">${escHtml(i.quantity)}</td><td class="n">${money(i.unitPricePaise)}</td><td class="n"><b>${money(i.lineTotalPaise || i.unitPricePaise * i.quantity)}</b></td></tr>`,
    )
    .join("");
  const when = validDate(b.createdAt);
  const taxSummary = taxLines.length
    ? `<div class="box"><div class="bt">Tax summary</div><table><tr><th></th><th class="n">Taxable</th><th class="n">Tax</th></tr>${taxLines
        .map((t) => `<tr><td>${escHtml(t.name)}${t.rate !== "" ? ` ${escHtml(t.rate)}%` : ""}</td><td class="n">${money(taxable)}</td><td class="n">${money(t.amountPaise)}</td></tr>`)
        .join("")}</table></div>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(b.billNumber)}</title><style>
@page{margin:0}*{box-sizing:border-box}body{font:12px Arial,Helvetica,sans-serif;width:${w};margin:0 auto;padding:6mm 0;color:#111}
.c{text-align:center}.r{display:flex;justify-content:space-between;gap:8px;margin:4px 0}.r span{flex:1}
hr{border:0;border-top:1px dashed #666;margin:8px 0}h2{margin:2px 0;font-size:16px}p{margin:2px 0}
.mut{color:#555;font-size:11px}.inv{letter-spacing:.14em;font-weight:700;font-size:11px;margin:6px 0 0}
img.logo{max-width:36mm;max-height:22mm;object-fit:contain;display:block;margin:0 auto 4px}
.meta{display:flex;justify-content:space-between;gap:8px;font-size:11px;margin:2px 0}
table{width:100%;border-collapse:collapse}th{font-size:10px;text-align:left;border-bottom:1px solid #111;padding:3px 0;text-transform:uppercase;letter-spacing:.04em}
td{padding:4px 0;vertical-align:top}td small{display:block;color:#666;font-size:10px}.n{text-align:right;white-space:nowrap}th.n{text-align:right}
.big{font-size:16px;border-top:2px solid #111;border-bottom:2px solid #111;padding:5px 0;margin:6px 0}
.box{background:#f3f3f3;border-radius:4px;padding:6px 8px;margin-top:8px}.box .bt{font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}.box td,.box th{font-size:10px;padding:2px 0}
</style></head><body>
<div class="c">${s.hotel.logoDataUrl ? `<img class="logo" src="${escHtml(s.hotel.logoDataUrl)}">` : ""}<h2>${escHtml(s.hotel.name || "Hotel")}</h2>
${s.hotel.address ? `<p class="mut">${escHtml(s.hotel.address)}</p>` : ""}${s.hotel.phone ? `<p class="mut">${escHtml(s.hotel.phone)}</p>` : ""}${s.hotel.gstin ? `<p class="mut">GSTIN: ${escHtml(s.hotel.gstin)}</p>` : ""}
<p class="inv">${taxLines.length ? "TAX INVOICE" : "BILL"}</p></div><hr>
<div class="meta"><span>Bill no: <b>${escHtml(b.billNumber)}</b></span><span>Table: <b>${escHtml(b.tableName)}</b></span></div>
<div class="meta"><span>Date: ${escHtml(when ? when.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "")}</span><span>Time: ${escHtml(when ? when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "")}</span></div>
<hr>
<table><tr><th>Item</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Amount</th></tr>${items}</table><hr>
${row("Subtotal", money(b.subtotalPaise))}${b.discountPaise ? row("Discount", "−" + money(b.discountPaise)) : ""}${taxRows.join("")}${b.serviceChargePaise ? row("Service charge", money(b.serviceChargePaise)) : ""}
${row("Grand total", money(b.grandTotalPaise), "big")}
<p class="mut">Payment: ${escHtml(b.paymentMethod || "Not paid yet")} · ${escHtml(b.status)}</p>${b.customerName || b.customerPhone ? `<p class="mut">Customer: ${escHtml([b.customerName, b.customerPhone].filter(Boolean).join(" · "))}</p>` : ""}${b.cashReceivedPaise && b.status === "Paid" ? `<p class="mut">Cash: ${money(b.cashReceivedPaise)} · Change: ${money(b.changePaise || 0)}</p>` : ""}
${taxSummary}
<div class="c" style="margin-top:12px;font-weight:bold">${escHtml(s.hotel.footer || "Thank you! Visit again.")}</div></body></html>`;
}
/* Prints silently on the printer chosen in Settings; falls back to the system dialog when none is chosen. */
export function kotHtml(s, tableId, order, table, mode) {
  const rows = (order.items || []).map(i => `<div class="r"><b>${mode === "CANCEL" ? "CANCEL " : ""}${escHtml(i.quantity)} × ${escHtml(i.name)}${i.newQty > 0 && i.newQty < i.quantity ? " [NEW +" + escHtml(i.newQty) + "]" : ""}</b><span>${escHtml(i.variant || "")}</span></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:0}body{font:14px Arial;width:${paperWidth[s.settings.receiptSize] || paperWidth["80mm"]};margin:auto;padding:5mm 0;color:#111}.c{text-align:center}hr{border:0;border-top:1px dashed #333}.r{display:flex;justify-content:space-between;gap:8px;margin:12px 0}.note{font-size:12px}</style></head><body><div class="c"><h2>${escHtml(s.hotel.name || "HOTEL")}</h2><b>${mode === "CANCEL" ? "*** CANCELLED ITEMS ***" : "KITCHEN ORDER TICKET"}</b><h2>${escHtml(table || "Takeaway")}</h2><p>${escHtml(fmtDateTime(order.kotSentAt || order.startedAt || new Date()))}</p></div><hr/>${rows}<hr/><p class="note">Order ID: ${escHtml(String(tableId).slice(-8).toUpperCase())}</p>${order.notes ? `<p><b>Note:</b> ${escHtml(order.notes)}</p>` : ""}</body></html>`;
}
export async function printHtml(s, html, notify, role = "payment") {
  try {
    const printerName = role === "kitchen" ? (s.settings.kitchenPrinterName || "") : (s.settings.paymentPrinterName || s.settings.printerName || "");
    if (window.hotelApp) {
      const r = await window.hotelApp.print(html, {
        printerName,
        size: s.settings.receiptSize || "80mm",
        silent: !!printerName,
      });
      if (r?.success !== false)
        notify(printerName ? "Sent to " + printerName : "Print dialog closed");
      return r?.success !== false;
    } else {
      const w = window.open("", "_blank");
      if (!w) throw Error("Pop-up blocked — allow pop-ups to print");
      w.document.write(html);
      w.document.close();
      w.print();
      return true;
    }
  } catch (e) {
    notify(errMsg(e), "error");
    return false;
  }
}
