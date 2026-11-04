export const csvCell = (v) => {
  let t = String(v ?? "");
  // spreadsheet formula injection: text starting with = + - @ (or tab / CR) would run as a formula in Excel
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
