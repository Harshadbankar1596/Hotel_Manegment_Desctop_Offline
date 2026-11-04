import { NavLink } from "react-router-dom";
import { ChefHat, Hotel, Maximize2, Minimize2, Moon, Receipt, RefreshCw, Sun, Table2 } from "lucide-react";
import ManageMenu from "./ManageMenu.jsx";

export default function TopBar({
  fullscreen,
  kitchenActive,
  kitchenReady,
  nav,
  now,
  pathname,
  pendingCount,
  reload,
  s,
  setTheme,
  theme,
  toggleFullscreen,
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => nav("/tables")} title="Go to Tables">
        <span className="logo-icon">
          {s.hotel.logoDataUrl ? <img src={s.hotel.logoDataUrl} alt="Hotel logo" /> : <Hotel size={20} />}
        </span>
        <b>{s.hotel.name || "Optimize"}</b>
      </button>
      <nav className="top-tabs" aria-label="Main">
        <NavLink to="/tables" className={({ isActive }) => (isActive || pathname.startsWith("/billing") ? "active" : "")}>
          <Table2 size={18} /> Tables
        </NavLink>
        <NavLink to="/kitchen" className={({ isActive }) => (isActive ? "active" : "")}>
          <ChefHat size={18} /> Kitchen
          {kitchenActive > 0 && <span>{kitchenActive}</span>}
          {kitchenActive === 0 && kitchenReady > 0 && <span className="ok">{kitchenReady}</span>}
        </NavLink>
        <NavLink to="/bills" className={({ isActive }) => (isActive ? "active" : "")}>
          <Receipt size={18} /> Bills
          {pendingCount > 0 && <span className="warn" title="Pending bills">{pendingCount}</span>}
        </NavLink>
      </nav>
      <div className="top-right">
        {/* <span className="offline-pill" title="Offline mode: data is saved on this computer">
          <i /> Saved on this PC
        </span> */}
        <div className="clock">
          <b>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</b>
          <small>{now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</small>
        </div>
        <button className="icon-btn" title={fullscreen ? "Exit full screen (F11)" : "Full screen (F11)"} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        {/* <button className="icon-btn" title={theme === "light" ? "Dark theme" : "Light theme"} onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button> */}
        <button className="icon-btn" title="Refresh data" onClick={() => reload(true)}>
          <RefreshCw size={16} />
        </button>
        <ManageMenu nav={nav} pathname={pathname} />
      </div>
    </header>
  );
}
