export const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    (Number(n) || 0) / 100,
  );
export const paise = (n) => Math.round((Number(n) || 0) * 100);
export const uid = () => crypto.randomUUID?.() || String(Date.now() + Math.random());
export const errMsg = (e) =>
  String(e?.message || e || "Something went wrong").replace(
    /^Error invoking remote method '[^']+':\s*(Error:\s*)?/,
    "",
  );
export const validDate = (v) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
export const fmtDateTime = (v) =>
  validDate(v)?.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) || "—";
export const fmtTime = (v) =>
  validDate(v)?.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }) || "—";
export const dayKey = (d = new Date()) => d.toLocaleDateString("en-CA");
export const billDay = (b) => b.businessDate || (validDate(b.createdAt) ? dayKey(new Date(b.createdAt)) : "");
export const elapsed = (v) => {
  const d = validDate(v);
  if (!d) return "";
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  return m < 60 ? m + " min" : Math.floor(m / 60) + "h " + (m % 60) + "m";
};

/* The day money was actually collected: a pending bill settled later counts on the day it was paid */
export const collectDay = (b) => (b.status === "Paid" && b.paidBusinessDate) || billDay(b);
