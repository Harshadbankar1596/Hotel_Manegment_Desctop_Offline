import { Navigate, Route, Routes } from "react-router-dom";
import BillDetail from "../pages/BillDetail/BillDetail.jsx";
import BillingRoute from "../pages/Billing/BillingRoute.jsx";
import Bills from "../pages/Bills/Bills.jsx";
import Categories from "../pages/Categories/Categories.jsx";
import Dashboard from "../pages/Dashboard/Dashboard.jsx";
import FloorPlan from "../pages/FloorPlan/FloorPlan.jsx";
import KitchenDisplay from "../pages/KitchenDisplay/KitchenDisplay.jsx";
import Menu from "../pages/Menu/Menu.jsx";
import Reports from "../pages/Reports/Reports.jsx";
import SettingsPage from "../pages/Settings/SettingsPage.jsx";
import { ask } from "../services/dialog.js";
import { kotHtml, printHtml } from "../utils/print.js";

export default function AppRoutes({
  colors,
  finish,
  nav,
  notify,
  persistOrder,
  query,
  reload,
  s,
  save,
  setColors,
  setQuery,
  setTheme,
  theme,
}) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tables" replace />} />
      <Route path="/dashboard" element={<Dashboard s={s} nav={nav} />} />
      <Route path="/tables" element={<FloorPlan s={s} save={save} nav={nav} notify={notify} ask={ask} />} />
      <Route path="/kitchen" element={<KitchenDisplay s={s} save={save} nav={nav} notify={notify} printKOT={(tableId, order, table, mode) => printHtml(s, kotHtml(s, tableId, order, table, mode), notify, "kitchen")} />} />
      <Route
        path="/billing/:tableId"
        element={<BillingRoute s={s} persist={persistOrder} finish={finish} nav={nav} notify={notify} printKOT={(tableId, order, table, mode) => printHtml(s, kotHtml(s, tableId, order, table, mode), notify, "kitchen")} />}
      />
      <Route path="/menu" element={<Menu s={s} save={save} notify={notify} />} />
      <Route path="/categories" element={<Categories s={s} save={save} notify={notify} />} />
      <Route path="/bills" element={<Bills s={s} query={query} setQuery={setQuery} nav={nav} notify={notify} />} />
      <Route
        path="/bills/:billId"
        element={<BillDetail s={s} nav={nav} notify={notify} reload={reload} />}
      />
      <Route path="/reports" element={<Reports s={s} />} />
      <Route path="/settings" element={<SettingsPage s={s} save={save} notify={notify} theme={theme} setTheme={setTheme} colors={colors} setColors={setColors} />} />
      <Route path="/settings/:section" element={<SettingsPage s={s} save={save} notify={notify} theme={theme} setTheme={setTheme} colors={colors} setColors={setColors} />} />
      <Route path="*" element={<Navigate to="/tables" replace />} />
    </Routes>
  );
}
