/* Takeaway orders: legacy id "takeaway" plus one id per customer ("takeaway-<uuid>") */

export const isTakeawayId = (id) => id === "takeaway" || String(id).startsWith("takeaway-");
