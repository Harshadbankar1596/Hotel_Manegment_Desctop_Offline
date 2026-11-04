/* What the kitchen should see for an order: only items that were really sent by KOT,
   with the quantity of the latest batch marked as new. */
export const itemKey = (i) => i.dishId + "|" + i.variant;

export function sentItems(order) {
  const items = order?.items || [];
  if (!order?.kotSent) return [];
  const sent = order.kotQty; // missing on old orders: everything counts as sent
  const latest = order.lastKot?.items || {};
  return items
    .map((i) => {
      const quantity = sent ? Math.min(sent[itemKey(i)] || 0, i.quantity) : i.quantity;
      return { ...i, quantity, newQty: Math.min(latest[itemKey(i)] || 0, quantity) };
    })
    .filter((i) => i.quantity > 0);
}
