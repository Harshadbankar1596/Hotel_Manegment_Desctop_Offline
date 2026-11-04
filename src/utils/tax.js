/* Split a total tax over tax rules so the parts always add up to the total (largest remainder). Same as electron/main.cjs */
export function splitTax(totalPaise, rules) {
  const rates = rules.map((t) => Math.max(0, Number(t.rate) || 0));
  const sum = rates.reduce((a, b) => a + b, 0);
  if (!rules.length || !sum || !totalPaise) return rules.map(() => 0);
  const exact = rates.map((r) => (totalPaise * r) / sum);
  const parts = exact.map(Math.floor);
  let left = totalPaise - parts.reduce((a, b) => a + b, 0);
  exact
    .map((e, i) => [e - Math.floor(e), i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .forEach(([, i]) => {
      if (left > 0) {
        parts[i]++;
        left--;
      }
    });
  return parts;
}

export const taxList = (st) =>
  st.taxes?.length ? st.taxes : [{ name: st.taxName || "GST", rate: st.taxRate ?? 0, enabled: true }];
