import { useEffect, useState } from "react";
import {
  ChefHat,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Moon,
  Receipt,
  RefreshCw,
  Sun,
  Table2,
} from "lucide-react";
import { manageLinks } from "../../constants/navigation.js";
import { useEscape } from "../../hooks/useEscape.js";

/* Phone navigation: thumb-reachable bottom tab bar with a "More" sheet */
export default function MobileNav({ pathname, nav, kitchenActive, kitchenReady, pendingCount, theme, setTheme, reload, toggleFullscreen, fullscreen }) {
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);
  useEscape(more, () => setMore(false));
  const inManage = manageLinks.some(([to]) => pathname === to || pathname.startsWith(to + "/"));
  const tabs = [
    ["/tables", "Tables", Table2, pathname.startsWith("/tables") || pathname.startsWith("/billing"), 0, ""],
    ["/kitchen", "Kitchen", ChefHat, pathname.startsWith("/kitchen"), kitchenActive || kitchenReady, kitchenActive ? "" : "ok"],
    ["/bills", "Bills", Receipt, pathname.startsWith("/bills"), pendingCount, "warn"],
  ];
  return (
    <>
      <nav className="mobile-nav" aria-label="Main">
        {tabs.map(([to, label, Icon, active, badge, kind]) => (
          <button key={to} className={active ? "active" : ""} onClick={() => nav(to)} aria-current={active ? "page" : undefined}>
            <span className="mn-ico"><Icon size={22} />{badge > 0 && <i className={"mn-badge " + kind}>{badge}</i>}</span>
            {label}
          </button>
        ))}
        <button className={inManage || more ? "active" : ""} onClick={() => setMore((v) => !v)} aria-expanded={more}>
          <span className="mn-ico"><LayoutGrid size={22} /></span>
          More
        </button>
      </nav>
      {more && (
        <div className="overlay sheet-overlay" onMouseDown={(e) => e.target === e.currentTarget && setMore(false)}>
          <div className="modal sheet more-sheet" role="dialog" aria-label="More">
            <div className="sheet-grab" />
            <div className="more-grid">
              {manageLinks.map(([to, label, Icon]) => (
                <button key={to} onClick={() => nav(to)}>
                  <Icon size={22} />
                  {label}
                </button>
              ))}
            </div>
            <div className="more-actions">
              <button onClick={() => setTheme((v) => (v === "light" ? "dark" : "light"))}>
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />} {theme === "light" ? "Dark theme" : "Light theme"}
              </button>
              <button onClick={() => { reload(true); setMore(false); }}>
                <RefreshCw size={18} /> Refresh data
              </button>
              <button onClick={toggleFullscreen}>
                {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />} {fullscreen ? "Exit full screen" : "Full screen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
