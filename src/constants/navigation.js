import { Archive, BarChart3, LayoutDashboard, Settings, Tags, Utensils } from "lucide-react";

/* Daily work lives in the top bar (Tables / Kitchen / Bills). Everything else is tucked into "Manage". */
export const manageLinks = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/menu", "Menu & Dishes", Utensils],
  ["/categories", "Categories", Tags],
  ["/reports", "Reports", BarChart3],
  ["/settings", "Settings", Settings],
  ["/settings/backup", "Data & Backups", Archive],
];
