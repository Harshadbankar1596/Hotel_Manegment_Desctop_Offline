import { useEffect, useRef, useState } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Activity,
  Archive,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Clock3,
  CreditCard,
  Download,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Table2,
  Tags,
  Trash2,
  Utensils,
  Wallet,
  X,
  ChefHat,
  Hotel,
  Save,
  Moon,
  Sun,
  Image,
  Banknote,
  Smartphone,
  AlertTriangle,
  LayoutGrid,
  Send,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import FloorPlan from "./pages/FloorPlan.jsx";
import KitchenDisplay from "./pages/KitchenDisplay.jsx";
import FoodThumb from "./components/FoodThumb.jsx";
import { sentItems } from "./kot.js";
import { DEFAULT_COLORS, PRESETS, applyTheme, buildPalette, isHex, sameColors, sanitize } from "./theme.js";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
const empty = {
  hotel: {
    name: "",
    address: "",
    phone: "",
    email: "",
    gstin: "",
    footer: "Thank you! Visit again.",
  },
  settings: {
    taxEnabled: false,
    taxRate: 0,
    taxMode: "exclusive",
    serviceChargeRate: 0,
    billPrefix: "BILL-",
    nextBillNumber: 1,
    tableCount: 12,
    receiptSize: "80mm",
  },
  categories: [],
  dishes: [],
  tables: [],
  orders: {},
  bills: [],
  dataDirectory: "",
};
const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    (Number(n) || 0) / 100,
  );
const paise = (n) => Math.round((Number(n) || 0) * 100);
const uid = () => crypto.randomUUID?.() || String(Date.now() + Math.random());
const errMsg = (e) =>
  String(e?.message || e || "Something went wrong").replace(
    /^Error invoking remote method '[^']+':\s*(Error:\s*)?/,
    "",
  );
const validDate = (v) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const fmtDateTime = (v) =>
  validDate(v)?.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) || "—";
const fmtTime = (v) =>
  validDate(v)?.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }) || "—";
const dayKey = (d = new Date()) => d.toLocaleDateString("en-CA");
const billDay = (b) => b.businessDate || (validDate(b.createdAt) ? dayKey(new Date(b.createdAt)) : "");
const elapsed = (v) => {
  const d = validDate(v);
  if (!d) return "";
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  return m < 60 ? m + " min" : Math.floor(m / 60) + "h " + (m % 60) + "m";
};
/* Takeaway orders: legacy id "takeaway" plus one id per customer ("takeaway-<uuid>") */
/* Split a total tax over tax rules so the parts always add up to the total (largest remainder). Same as electron/main.cjs */
function splitTax(totalPaise, rules) {
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
const isTakeawayId = (id) => id === "takeaway" || String(id).startsWith("takeaway-");
/* The day money was actually collected: a pending bill settled later counts on the day it was paid */
const collectDay = (b) => (b.status === "Paid" && b.paidBusinessDate) || billDay(b);
const csvCell = (v) => {
  let t = String(v ?? "");
  // spreadsheet formula injection: text starting with = + - @ (or tab / CR) would run as a formula in Excel
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
const chartTip = {
  background: "var(--surface)",
  border: "1px solid var(--line-2)",
  borderRadius: 8,
  color: "var(--s-text, var(--text))",
  fontSize: 12,
};


/* Daily work lives in the top bar (Tables / Kitchen / Bills). Everything else is tucked into "Manage". */
const manageLinks = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/menu", "Menu & Dishes", Utensils],
  ["/categories", "Categories", Tags],
  ["/reports", "Reports", BarChart3],
  ["/settings", "Settings", Settings],
  ["/settings/backup", "Data & Backups", Archive],
];
/* True while the viewport is phone-sized (matches the max-width used in mobile.css) */
function useMedia(query) {
  const get = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const [on, setOn] = useState(get);
  useEffect(() => {
    const m = window.matchMedia(query);
    const h = () => setOn(m.matches);
    h();
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, [query]);
  return on;
}

/* Phone navigation: thumb-reachable bottom tab bar with a "More" sheet */
function MobileNav({ pathname, nav, kitchenActive, kitchenReady, pendingCount, theme, setTheme, reload, toggleFullscreen, fullscreen }) {
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

function ManageMenu({ nav, pathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);
  const inManage = manageLinks.some(([to]) => pathname === to || pathname.startsWith(to + "/"));
  return (
    <div className="manage" ref={ref}>
      <button className={"manage-btn" + (inManage ? " on" : "")} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <LayoutGrid size={16} /> Manage <ChevronDown size={14} />
      </button>
      {open && (
        <div className="manage-pop" role="menu">
          {manageLinks.map(([to, label, Icon]) => (
            <button key={to} role="menuitem" onClick={() => nav(to)}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Close a modal / popup with the Escape key */
function useEscape(active, fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const k = (e) => e.key === "Escape" && ref.current();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [active]);
}

/* Promise based confirm / prompt dialogs (window.prompt is not supported in Electron). */
let dialogOpener = null;
const ask = (opts) =>
  new Promise((resolve) => {
    if (dialogOpener) dialogOpener({ ...opts, resolve });
    else resolve(opts.input ? null : window.confirm(opts.message || opts.title));
  });
function DialogHost() {
  const [d, setD] = useState(null);
  const [val, setVal] = useState("");
  useEffect(() => {
    dialogOpener = (o) => {
      setVal(o.input?.value || "");
      setD(o);
    };
    return () => {
      dialogOpener = null;
    };
  }, []);
  useEffect(() => {
    if (!d) return;
    const k = (e) => e.key === "Escape" && close(d.input ? null : false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  if (!d) return null;
  const close = (r) => {
    d.resolve(r);
    setD(null);
  };
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close(d.input ? null : false)}>
      <form
        className="modal small"
        onSubmit={(e) => {
          e.preventDefault();
          if (d.input && !val.trim()) return;
          close(d.input ? val.trim() : true);
        }}
      >
        <div className="modal-head">
          <h3>{d.title}</h3>
          <button type="button" onClick={() => close(d.input ? null : false)} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {d.message && <p className="confirm-body">{d.message}</p>}
        {d.input && (
          <label className="field-label">
            {d.input.label}
            <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} />
          </label>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => close(d.input ? null : false)}>
            Cancel
          </button>
          <button type="submit" autoFocus={!d.input} className={d.danger ? "primary danger-fill" : "primary"} style={d.danger ? { background: "var(--bad)" } : undefined}>
            {d.confirmLabel || "OK"}
          </button>
        </div>
      </form>
    </div>
  );
}
export default function App() {
  const [s, setS] = useState(empty),
    [ready, setReady] = useState(false),
    [toast, setToast] = useState(null),
    [loadError, setLoadError] = useState(null),
    [setup, setSetup] = useState({ name: "", gstin: "", tax: false, rate: "5" }),
    [retrying, setRetrying] = useState(false),
    [now, setNow] = useState(() => new Date()),
    [query, setQuery] = useState(""),
    [theme, setTheme] = useState(
      () => localStorage.getItem("hotel-theme") || "light",
    ),
    [colors, setColors] = useState(() => {
      try {
        const v = JSON.parse(localStorage.getItem("hotel-colors") || "null");
        return v ? sanitize(v) : null;
      } catch {
        return null;
      }
    });
  const nav = useNavigate();
  const loc = useLocation();
  const isMobile = useMedia("(max-width: 760px)");
  const sRef = useRef(s);
  sRef.current = s;
  const toastTimer = useRef(null);
  const notify = (m, type = "ok") => {
    clearTimeout(toastTimer.current);
    setToast({ m, type });
    toastTimer.current = setTimeout(() => setToast(null), type === "error" ? 6000 : 2800);
  };
  const reload = async (manual = false) => {
    try {
      const d = await window.hotelApp?.load();
      if (d) setS(d);
      setLoadError(null);
      if (manual === true) notify("Data refreshed");
    } catch (e) {
      // Nothing is loaded yet: show a persistent error screen instead of a "first-time setup" screen
      if (!sRef.current.dataDirectory) setLoadError(errMsg(e));
      else notify(errMsg(e), "error");
    }
    setReady(true);
  };
  useEffect(() => {
    reload();
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    applyTheme(colors, theme);
    localStorage.setItem("hotel-theme", theme);
    try {
      colors ? localStorage.setItem("hotel-colors", JSON.stringify(colors)) : localStorage.removeItem("hotel-colors");
    } catch {}
  }, [theme, colors]);
  const [fullscreen, setFullscreen] = useState(false);
  const toggleFullscreen = async () => {
    if (window.hotelApp?.toggleFullscreen) {
      setFullscreen(await window.hotelApp.toggleFullscreen());
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };
  useEffect(() => {
    // Electron: main process owns F11 and reports state changes
    const off = window.hotelApp?.onFullscreenChange?.(setFullscreen);
    window.hotelApp?.isFullscreen?.().then(setFullscreen).catch(() => {});
    // Browser (dev) fallback
    const onFs = () => { if (!window.hotelApp) setFullscreen(!!document.fullscreenElement); };
    const onKey = (e) => {
      if (e.key === "F11" && !window.hotelApp) { e.preventDefault(); toggleFullscreen(); }
    };
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    return () => {
      off?.();
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  const save = async (k, v) => {
    const prev = sRef.current[k];
    sRef.current = { ...sRef.current, [k]: v };
    setS((p) => ({ ...p, [k]: v }));
    try {
      await window.hotelApp?.save(k, v);
      return true;
    } catch (e) {
      sRef.current = { ...sRef.current, [k]: prev };
      setS((p) => ({ ...p, [k]: prev }));
      notify("Could not save: " + errMsg(e), "error");
      return false;
    }
  };
  const choose = async () => {
    try {
      let d = await window.hotelApp?.chooseFolder();
      if (d) {
        // Brand-new folder (no hotel name yet): store what was typed on the setup screen
        const name = setup.name.trim();
        if (name && !String(d.hotel?.name || "").trim()) {
          const rate = Math.max(0, Math.min(100, Number(setup.rate) || 0));
          const hotel = { ...d.hotel, name, gstin: setup.gstin.trim().toUpperCase() };
          const settings = setup.tax && rate > 0 ? { ...d.settings, taxEnabled: true, taxRate: rate } : d.settings;
          try {
            await window.hotelApp.save("hotel", hotel);
            if (settings !== d.settings) await window.hotelApp.save("settings", settings);
            d = { ...d, hotel, settings };
          } catch (e) {
            notify("Folder connected, but could not save hotel details: " + errMsg(e), "error");
          }
        }
        setLoadError(null);
        setS(d);
        setReady(true);
        notify("Data folder connected");
      }
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };
  const persistOrder = async (tableId, order) => {
    const orders = { ...sRef.current.orders };
    if (order.items?.length) orders[tableId] = order;
    else delete orders[tableId];
    return save("orders", orders);
  };
  const finish = async (p) => {
    if (window.hotelApp) {
      const r = await window.hotelApp.finalize(p);
      sRef.current = r.state;
      setS(r.state);
      return r.bill;
    }
    const o = s.orders[p.tableId];
    if (!o?.items?.length) throw Error("Add at least one item");
    const tName = s.tables.find((t) => t.id === p.tableId)?.name || o.label || "Takeaway";
    const subtotalPaise = o.items.reduce(
        (a, i) => a + i.unitPricePaise * i.quantity,
        0,
      ),
      discountPaise = Math.min(subtotalPaise, p.discountPaise || 0),
      rate = s.settings.taxEnabled ? Number(s.settings.taxRate) || 0 : 0,
      net = subtotalPaise - discountPaise,
      taxPaise = rate ? Math.round((net * rate) / 100) : 0,
      bill = {
        id: uid(),
        billNumber:
          (s.settings.billPrefix || "BILL-") +
          String(s.settings.nextBillNumber).padStart(4, "0"),
        tableId: p.tableId,
        tableName: tName,
        orderType: isTakeawayId(p.tableId) ? "Takeaway" : "Dine-in",
        customerName: p.customerName || "",
        customerPhone: p.customerPhone || "",
        cancelledItems: o.cancelled || [],
        items: o.items.map((i) => ({
          ...i,
          lineTotalPaise: i.unitPricePaise * i.quantity,
        })),
        subtotalPaise,
        discountPaise,
        taxPaise,
        grandTotalPaise: net + taxPaise,
        paymentMethod: p.status === "Pending" ? null : p.paymentMethod,
        status: p.status || "Paid",
        createdAt: new Date().toISOString(),
        businessDate: new Date().toLocaleDateString("en-CA"),
      };
    await save("bills", [...s.bills, bill]);
    await save("settings", {
      ...s.settings,
      nextBillNumber: Number(s.settings.nextBillNumber) + 1,
    });
    await persistOrder(p.tableId, { items: [] });
    return bill;
  };
  if (!ready)
    return (
      <div className="loading">
        <ChefHat />
        Preparing workspace…
      </div>
    );
  if (loadError && !s.dataDirectory)
    return (
      <div className="loading load-error" role="alert">
        <AlertTriangle size={34} />
        <h2>Could not open your data</h2>
        <p className="load-error-msg">{loadError}</p>
        <p className="subtle">
          Your data has NOT been deleted. A file may be damaged (for example after a power cut). Click Retry, or restore
          that file from a backup copy. Do not start a new workspace in the same folder.
        </p>
        <div className="load-error-actions">
          <button
            className="primary"
            disabled={retrying}
            onClick={async () => {
              setRetrying(true);
              await reload();
              setRetrying(false);
            }}
          >
            <RefreshCw size={16} /> {retrying ? "Retrying…" : "Retry"}
          </button>
          <button className="btn" onClick={choose}>
            <FolderOpen size={16} /> Choose another folder
          </button>
        </div>
      </div>
    );
  if (window.hotelApp && !s.dataDirectory)
    return (
      <div className="setup">
        <div className="setup-card">
          <div className="logo">
            <Hotel />{" "}
            <b>Optimize</b>
          </div>
          <small>FIRST-TIME SETUP</small>
          <h1>
            Welcome to your
            <br />
            <em>new workspace.</em>
          </h1>
          <p>
            Choose a local folder to keep hotel settings, menu, active
            orders, and bills on your computer. No account or internet
            connection is required.
          </p>
          <div className="setup-list">
            <p>
              <Check /> Local JSON data storage
            </p>
            <p>
              <Check /> Table and menu management
            </p>
            <p>
              <Check /> Billing, receipts and reports
            </p>
          </div>
          <div className="setup-form">
            <label className="field-label">
              Hotel / restaurant name
              <input
                value={setup.name}
                maxLength={80}
                placeholder="e.g. Hotel Sunrise"
                onChange={(e) => setSetup({ ...setup, name: e.target.value })}
              />
            </label>
            <label className="field-label">
              GSTIN (optional)
              <input
                value={setup.gstin}
                maxLength={15}
                placeholder="15-character GSTIN"
                onChange={(e) => setSetup({ ...setup, gstin: e.target.value })}
              />
            </label>
            <label className="setup-check">
              <input type="checkbox" checked={setup.tax} onChange={(e) => setSetup({ ...setup, tax: e.target.checked })} />
              Charge GST on bills
              {setup.tax && (
                <>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={setup.rate}
                    onChange={(e) => setSetup({ ...setup, rate: e.target.value })}
                    aria-label="GST rate percent"
                  />
                  %
                </>
              )}
            </label>
            <small className="subtle">You can change all of this later in Settings.</small>
          </div>
          <button className="primary wide" onClick={choose}>
            <FolderOpen size={17} /> Choose data folder →
          </button>
          <small className="subtle">
            Offline-ready · Your data stays on this device
          </small>
        </div>
        <div className="setup-art">
          <span>YOUR DAILY OVERVIEW</span>
          <h2>
            A clearer view
            <br />
            of your business.
          </h2>
          <div className="fake-card">
            <small>Today's sales</small>
            <h2>₹24,580</h2>
            <span>↑ Your business, at a glance</span>
            <div className="bars">
              {[
                30, 50, 40, 65, 48, 85, 60, 96, 70, 52, 77, 88, 62, 100, 73, 57,
                81, 66, 91, 61,
              ].map((h, i) => (
                <i key={i} style={{ height: h + "%" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  const pendingCount = s.bills.filter((b) => b.status === "Pending").length;
  const liveOrders = Object.values(s.orders || {}).filter((o) => o?.items?.length && o.kotSent);
  const kitchenActive = liveOrders.filter((o) => o.kitchenStatus !== "Ready").length;
  const kitchenReady = liveOrders.length - kitchenActive;
  return (
    <div className={"shell" + (isMobile ? " is-mobile" : "")}>
      <header className="topbar">
        <button className="brand" onClick={() => nav("/tables")} title="Go to Tables">
          <span className="logo-icon">
            {s.hotel.logoDataUrl ? <img src={s.hotel.logoDataUrl} alt="Hotel logo" /> : <Hotel size={20} />}
          </span>
          <b>{s.hotel.name || "Optimize"}</b>
        </button>
        <nav className="top-tabs" aria-label="Main">
          <NavLink to="/tables" className={({ isActive }) => (isActive || loc.pathname.startsWith("/billing") ? "active" : "")}>
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
          <span className="offline-pill" title="Offline mode: data is saved on this computer">
            <i /> Saved on this PC
          </span>
          <div className="clock">
            <b>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</b>
            <small>{now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</small>
          </div>
          <button className="icon-btn" title={fullscreen ? "Exit full screen (F11)" : "Full screen (F11)"} onClick={toggleFullscreen}>
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button className="icon-btn" title={theme === "light" ? "Dark theme" : "Light theme"} onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button className="icon-btn" title="Refresh data" onClick={() => reload(true)}>
            <RefreshCw size={16} />
          </button>
          <ManageMenu nav={nav} pathname={loc.pathname} />
        </div>
      </header>
      <main>
        <div className="content">
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
        </div>
      </main>
      {isMobile && (
        <MobileNav
          pathname={loc.pathname}
          nav={nav}
          kitchenActive={kitchenActive}
          kitchenReady={kitchenReady}
          pendingCount={pendingCount}
          theme={theme}
          setTheme={setTheme}
          reload={reload}
          toggleFullscreen={toggleFullscreen}
          fullscreen={fullscreen}
        />
      )}
      <DialogHost />
      {toast && (
        <div className={"toast " + toast.type} role={toast.type === "error" ? "alert" : "status"}>
          {toast.type === "error" ? <AlertTriangle size={16} /> : <Check size={16} />}
          {toast.m}
          <button onClick={() => setToast(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function Heading({ eyebrow, title, desc, action }) {
  const back = () => {
    if (window.history.length > 1) window.history.back();
    else location.hash = "#/dashboard";
  };
  return (
    <div className="heading">
      <div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      <div className="heading-tools">
        {action && <div className="actions">{action}</div>}
      </div>
    </div>
  );
}
function Btn({ children, onClick, primary = false, icon: Icon }) {
  return (
    <button className={primary ? "primary" : "btn"} onClick={onClick}>
      {Icon && <Icon size={15} />} {children}
    </button>
  );
}
function Stat({ label, value, note, icon: Icon }) {
  return (
    <div className="stat">
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}
function Panel({ title, desc, children, action }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {desc && <p>{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({ title, desc }) {
  return (
    <div className="empty">
      <FileText size={24} />
      <b>{title}</b>
      <p>{desc}</p>
    </div>
  );
}
function Dashboard({ s, nav }) {
  const today = dayKey();
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const activeTables = s.tables.filter((t) => t.enabled !== false);
  const occupied = activeTables.filter((t) => s.orders[t.id]?.items?.length).length;
  const pending = s.bills.filter((b) => b.status === "Pending").length;
  const bills = s.bills.filter(
    (b) =>
      billDay(b) === today &&
      !["Cancelled", "Voided", "Refunded"].includes(b.status),
  );
  const revenue = bills.reduce((a, b) => a + b.grandTotalPaise, 0);
  const collectedToday = s.bills
    .filter((b) => b.status === "Paid" && collectDay(b) === today)
    .reduce((a, b) => a + b.grandTotalPaise, 0);
  const month = s.bills
    .filter(
      (b) =>
        collectDay(b).slice(0, 7) === today.slice(0, 7) &&
        b.status === "Paid",
    )
    .reduce((a, b) => a + b.grandTotalPaise, 0);
  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const key = dayKey(d);
    return {
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      revenue: s.bills
        .filter((b) => collectDay(b) === key && b.status === "Paid")
        .reduce((a, b) => a + b.grandTotalPaise / 100, 0),
    };
  });
  const recent = [...s.bills]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  const top = Object.values(
    s.bills
      .flatMap((b) => b.items || [])
      .reduce((a, i) => {
        a[i.name] = a[i.name] || { name: i.name, qty: 0, total: 0 };
        a[i.name].qty += i.quantity;
        a[i.name].total += i.lineTotalPaise || i.unitPricePaise * i.quantity;
        return a;
      }, {}),
  )
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  return (
    <>
      <Heading
        eyebrow="OVERVIEW"
        title={greet + "."}
        desc="Here's what's happening at your hotel today."
        action={
          <Btn icon={Download} onClick={() => nav("/reports")}>
            View reports
          </Btn>
        }
      />
      <div className="notice">
        <Activity size={17} />
        <div>
          <b>
            {occupied} of {activeTables.length} tables occupied
          </b>
          <small>
            {pending
              ? pending + " pending bill" + (pending > 1 ? "s" : "") + " waiting for payment"
              : "No pending bills — everything is settled"}
          </small>
        </div>
        <span>
          <i /> Local data · up to date
        </span>
      </div>
      <div className="stats">
        <Stat
          label="Today's sales"
          value={money(revenue)}
          note={`${bills.length} bill${bills.length === 1 ? "" : "s"} today · ${money(collectedToday)} collected`}
          icon={Wallet}
        />
        <Stat
          label="Bills generated"
          value={String(bills.length).padStart(2, "0")}
          note={`${bills.filter((b) => b.status === "Paid").length} paid · ${bills.filter((b) => b.status === "Pending").length} pending`}
          icon={Receipt}
        />
        <Stat
          label="Average bill value"
          value={money(bills.length ? revenue / bills.length : 0)}
          note="Across today's bills"
          icon={Activity}
        />
        <Stat
          label="Monthly revenue"
          value={money(month)}
          note="Paid bills this month"
          icon={CreditCard}
        />
      </div>
      <div className="columns">
        <Panel
          title="Sales overview"
          desc="Daily revenue for the last 7 days"
          action={
            <button className="text-btn" onClick={() => nav("/reports")}>
              Details →
            </button>
          }
        >
          <div className="chart-total">
            {money(chart.reduce((a, b) => a + b.revenue, 0) * 100)}{" "}
            <small>Last 7 days</small>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--line)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                />
                <Tooltip
                  contentStyle={chartTip}
                  cursor={{ fill: "var(--brand-soft)" }}
                  formatter={(v) => [
                    "₹" + Number(v).toLocaleString("en-IN"),
                    "Revenue",
                  ]}
                />
                <Bar dataKey="revenue" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel
          title="Recent bills"
          desc="Your latest transactions"
          action={
            <button className="text-btn" onClick={() => nav("/bills")}>
              View all →
            </button>
          }
        >
          {recent.length ? (
            recent.map((b) => (
              <button
                className="recent"
                key={b.id}
                onClick={() => nav("/bills/" + b.id)}
              >
                <span className="rec-icon">
                  <Receipt size={16} />
                </span>
                <span>
                  <b>{b.billNumber}</b>
                  <small>
                    {b.tableName} ·{" "}
                    {fmtTime(b.createdAt)}
                  </small>
                </span>
                <strong>
                  {money(b.grandTotalPaise)}
                  <small className={"status " + b.status?.toLowerCase()}>
                    {b.status}
                  </small>
                </strong>
              </button>
            ))
          ) : (
            <Empty title="No bills yet" desc="Completed bills appear here." />
          )}
        </Panel>
      </div>
      <div className="columns">
        <Panel
          title="Top-selling dishes"
          desc="Best performers by quantity sold"
        >
          {top.length ? (
            top.map((x, i) => (
              <div className="top-dish" key={x.name}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <b>
                  {x.name}
                  <small>{x.qty} items sold</small>
                </b>
                <strong>{money(x.total)}</strong>
              </div>
            ))
          ) : (
            <Empty
              title="No dishes sold yet"
              desc="Your best-selling dishes appear here."
            />
          )}
        </Panel>
        <Panel title="Quick actions" desc="Jump into daily operations">
          <div className="quick-actions">
            <button onClick={() => nav("/tables")}>
              <Table2 />
              <b>Manage tables</b>
              <small>Open orders and seating</small>
            </button>
            <button onClick={() => nav("/menu")}>
              <Utensils />
              <b>Update menu</b>
              <small>Dishes and pricing</small>
            </button>
            <button onClick={() => nav("/bills")}>
              <Receipt />
              <b>Previous bills</b>
              <small>Review transactions</small>
            </button>
            <button onClick={() => nav("/settings")}>
              <Settings />
              <b>Settings</b>
              <small>Hotel preferences</small>
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
function BillingRoute(props) {
  const { tableId } = useParams();
  return <Billing key={tableId} tableId={tableId} {...props} />;
}
function Billing({ tableId, s, persist, finish, nav, notify, printKOT }) {
  const table = s.tables.find((t) => t.id === tableId);
  const isTakeaway = isTakeawayId(tableId);
  const fresh = () => {
    const base = { items: [], notes: "", startedAt: new Date().toISOString() };
    if (!isTakeaway || tableId === "takeaway") return base;
    // numbering: one more than the highest takeaway label currently open
    const used = Object.values(s.orders || {}).map((o) => Number(String(o?.label || "").replace(/\D/g, "")) || 0);
    return { ...base, label: "Takeaway " + (Math.max(0, ...used) + 1) };
  };
  const [order, setOrder] = useState(() => s.orders[tableId] || fresh());
  const [cartOpen, setCartOpen] = useState(false); // phone only: order panel opens as a bottom sheet
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const drag = useRef({ down: false });
  const gridRef = useRef(null);
  const [bubbleY, setBubbleY] = useState(null);
  // which letter is under the pointer (geometry based, so dragging along the rail is smooth)
  const letterAt = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pad = 5;
    const n = LETTERS.length + 1.4; // "All" is a little taller
    const y = Math.min(Math.max(e.clientY - r.top - pad, 0), r.height - pad * 2 - 0.01);
    const pos = (y / (r.height - pad * 2)) * n;
    if (pos < 1.4) return "";
    return LETTERS[Math.min(LETTERS.length - 1, Math.floor(pos - 1.4))];
  };
  const yAt = (e) => {
    const body = e.currentTarget.parentElement.getBoundingClientRect();
    return Math.min(Math.max(e.clientY - body.top, 28), body.height - 28);
  };
  const billRef = useRef(null);
  // Fit the billing area to the window so only the dish list / cart scroll, never the page
  useEffect(() => {
    const fit = () => {
      const el = billRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.setProperty("--bill-h", Math.max(360, window.innerHeight - top - 36) + "px");
    };
    fit();
    window.addEventListener("resize", fit);
    const t = setTimeout(fit, 150);
    return () => { window.removeEventListener("resize", fit); clearTimeout(t); };
  }, []);
  const [nudge, setNudge] = useState(null); // dish whose variants are highlighted after a photo tap
  const nudgeTimer = useRef(null);
  useEffect(() => () => clearTimeout(nudgeTimer.current), []);
  const [kind, setKind] = useState("all"); // all | veg | non-veg
  const [letter, setLetter] = useState(""); // clicked (locked) letter
  const [hoverLetter, setHoverLetter] = useState(""); // letter under the mouse
  const [discount, setDiscount] = useState("0");
  const [method, setMethod] = useState("Cash");
  const [cash, setCash] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [pay, setPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEscape(pay && !busy, () => setPay(false));
  const dirty = useRef(false);
  const kotBusy = useRef(false);
  const closing = useRef(false);
  const latest = useRef(order);
  latest.current = order;
  const persistRef = useRef(persist);
  persistRef.current = persist;
  const change = (fn) => {
    dirty.current = true;
    setOrder((o) => {
      const n = fn(o);
      // an emptied order is gone from the kitchen too, so forget its KOT history
      if (!n.items.length)
        return { ...n, kotSent: false, kotQty: undefined, kitchenStatus: undefined, kotSentAt: undefined };
      // never remember more as "sent" than is on the order, so re-adding an item is sent to the kitchen again
      if (n.kotQty) {
        const kotQty = {};
        for (const i of n.items) {
          const k = i.dishId + "|" + i.variant;
          if (n.kotQty[k]) kotQty[k] = Math.min(n.kotQty[k], i.quantity);
        }
        return { ...n, kotQty };
      }
      return n;
    });
  };
  useEffect(() => {
    if (!dirty.current || closing.current) return;
    const t = setTimeout(() => {
      dirty.current = false;
      persistRef.current(tableId, latest.current);
    }, 250);
    return () => clearTimeout(t);
  }, [order, tableId]);
  // save pending edits when leaving the page
  useEffect(
    () => () => {
      if (dirty.current && !closing.current) persistRef.current(tableId, latest.current);
    },
    [tableId],
  );
  if (!table && !isTakeaway)
    return <Empty title="Table not found" desc="This table was deleted or renamed. Go back to Tables." />;
  const baseDishes = s.dishes.filter(
    (d) =>
      d.available !== false &&
      (cat === "All" || d.category === cat) &&
      (kind === "all" || (kind === "veg" ? d.type !== "non-veg" : d.type === "non-veg")) &&
      String(d.name || "").toLowerCase().includes(q.toLowerCase()),
  );
  const firstLetter = (d) => (d.name || "").trim().charAt(0).toUpperCase();
  const lettersWith = new Set(baseDishes.map(firstLetter));
  const activeLetter = hoverLetter || letter;
  const dishes = activeLetter ? baseDishes.filter((d) => firstLetter(d) === activeLetter) : baseDishes;
  const subtotal = order.items.reduce((a, i) => a + i.unitPricePaise * i.quantity, 0);
  const discountP = Math.min(subtotal, Math.max(0, paise(discount)));
  const net = subtotal - discountP;
  const taxRules = s.settings.taxEnabled
    ? (s.settings.taxes?.length
        ? s.settings.taxes.filter((t) => t.enabled !== false)
        : [{ name: s.settings.taxName || "GST", rate: s.settings.taxRate || 0 }]
      ).filter((t) => Number(t.rate) > 0)
    : [];
  const rate = Math.min(100, taxRules.reduce((a, t) => a + (Number(t.rate) || 0), 0));
  const inclusive = s.settings.taxMode === "inclusive";
  const tax = rate
    ? inclusive
      ? net - Math.round((net * 100) / (100 + rate))
      : Math.round((net * rate) / 100)
    : 0;
  const taxParts = splitTax(tax, taxRules);
  const service = Math.round((net * (Number(s.settings.serviceChargeRate) || 0)) / 100);
  const total = net + (inclusive ? 0 : tax) + service;
  const cashP = method === "Cash" ? (cash === "" ? total : paise(cash)) : 0;
  const add = (d, v) =>
    change((o) => {
      const items = [...o.items];
      const i = items.findIndex((x) => x.dishId === d.id && x.variant === v.name);
      if (i >= 0) items[i] = { ...items[i], quantity: Math.min(999, items[i].quantity + 1) };
      else
        items.push({
          dishId: d.id,
          name: d.name,
          type: d.type === "non-veg" ? "non-veg" : "veg",
          variant: v.name,
          quantity: 1,
          unitPricePaise: v.pricePaise,
        });
      return { ...o, items, startedAt: o.startedAt || new Date().toISOString() };
    });
  const submit = async (status = "Paid") => {
    if (busy) return;
    setErr("");
    if (!order.items.length) return setErr("Add at least one dish before billing");
    if (status === "Paid" && method === "Cash" && cashP < total)
      return setErr("Cash received is less than the bill total");
    if (status === "Pending" && !custName.trim() && !custPhone.trim())
      return setErr("Enter the customer's name or phone so the pending amount can be collected later");
    setBusy(true);
    closing.current = true;
    try {
      // make sure the saved order is what we bill
      if ((await persist(tableId, order)) === false) throw Error("Could not save the order, so it was not billed");
      const b = await finish({
        tableId,
        paymentMethod: method,
        cashReceivedPaise: cashP,
        discountPaise: discountP,
        status,
        customerName: custName.trim(),
        customerPhone: custPhone.trim(),
      });
      notify("Bill " + b.billNumber + " created");
      nav("/bills/" + b.id);
    } catch (e) {
      closing.current = false;
      setErr(errMsg(e));
      notify(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const tName = table?.name || order.label || "Takeaway";
  const sentOf = (i) => (order.kotSent ? (order.kotQty ? order.kotQty[i.dishId + "|" + i.variant] || 0 : i.quantity) : 0);
  /* Cutting down something the kitchen already has: ask first, keep an audit entry and tell the kitchen */
  const cutItems = async (cuts, apply, title) => {
    // cuts: [{ item, newQty }]
    const lost = cuts
      .map(({ item, newQty }) => ({ item, qty: sentOf(item) - Math.max(newQty, 0) }))
      .filter((x) => x.qty > 0 && sentOf(x.item) > 0);
    const real = lost;
    if (!real.length) return apply();
    const list = real.map(({ item, qty }) => qty + " × " + item.name + (item.variant ? " (" + item.variant + ")" : "")).join(", ");
    const yes = await ask({
      title: title || "Cancel item already sent to kitchen?",
      message: "The kitchen already has " + list + ". Cancelling will print a cancel notice for the kitchen and be recorded on the order.",
      confirmLabel: "Cancel & notify kitchen",
      danger: true,
    });
    if (!yes) return;
    const at = new Date().toISOString();
    const entries = real.map(({ item, qty }) => ({ name: item.name, variant: item.variant, quantity: qty, at }));
    apply(entries);
    printKOT?.(tableId, { ...order, items: entries.map((e) => ({ ...e })), kotSentAt: at }, tName, "CANCEL");
  };
  const withAudit = (entries) => (o) => (entries ? { ...o, cancelled: [...(o.cancelled || []), ...entries] } : o);
  const setQty = (idx, qty) => {
    const item = order.items[idx];
    if (!item) return;
    const apply = (entries) =>
      change((o) =>
        withAudit(entries)({
          ...o,
          items: o.items.map((x, j) => (j === idx ? { ...x, quantity: qty } : x)).filter((x) => x.quantity > 0),
        }),
      );
    if (qty < item.quantity) cutItems([{ item, newQty: qty }], apply);
    else apply();
  };
  const clearOrder = async () => {
    if (!order.items.length) return;
    if (order.kotSent && order.items.some((i) => sentOf(i) > 0))
      return cutItems(
        order.items.map((item) => ({ item, newQty: 0 })),
        (entries) => change((o) => withAudit(entries)({ ...o, items: [] })),
        "Clear an order the kitchen already has?",
      );
    const yes = await ask({
      title: "Clear this order?",
      message: "All dishes on this order will be removed.",
      confirmLabel: "Clear order",
      danger: true,
    });
    if (yes) change((o) => ({ ...o, items: [] }));
  };
  const itemCount = order.items.reduce((a, i) => a + i.quantity, 0);
  /* KOT tracking: only items added after the last KOT go to the kitchen again */
  const keyOf = (i) => i.dishId + "|" + i.variant;
  const sentMap = order.kotSent ? order.kotQty || null : {};
  const unsent = order.items
    .map((i) => ({ ...i, quantity: i.quantity - (sentMap ? sentMap[keyOf(i)] || 0 : i.quantity) }))
    .filter((i) => i.quantity > 0);
  const needsKot = unsent.length > 0;
  const unsentQty = unsent.reduce((a, i) => a + i.quantity, 0);
  const step = !order.items.length ? 1 : needsKot ? 2 : 3;
  const sendKot = async () => {
    if (!order.items.length || kotBusy.current) return;
    kotBusy.current = true;
    try {
      await sendKotNow();
    } finally {
      kotBusy.current = false;
    }
  };
  const sendKotNow = async () => {
    // print first: only mark the items as "sent" if the ticket really came out (or the owner says go on)
    const printed = await printKOT?.(tableId, { ...order, items: unsent }, tName);
    if (printed === false) {
      const go = await ask({
        title: "KOT could not be printed",
        message: "The kitchen ticket did not print. Send it to the Kitchen screen anyway? You can reprint it later with “Reprint KOT”.",
        confirmLabel: "Send to Kitchen screen",
      });
      if (!go) return;
    }
    const sent = {
      ...order,
      kotSent: true,
      kitchenStatus: "Preparing",
      kotSentAt: new Date().toISOString(),
      kotQty: Object.fromEntries(order.items.map((i) => [keyOf(i), i.quantity])),
      // what this batch added, so the kitchen can tell new items from ones already being cooked
      lastKot: { at: new Date().toISOString(), items: Object.fromEntries(unsent.map((i) => [keyOf(i), i.quantity])) },
    };
    const saved = await persist(tableId, sent);
    if (saved === false) return;
    setOrder(sent);
    dirty.current = false;
    notify(order.kotSent ? "New items sent to kitchen" : "KOT sent to kitchen");
  };
  const reprintKot = () => printKOT?.(tableId, { ...order, items: sentItems(order) }, tName);
  const openPay = () => { setErr(""); setPay(true); };
  const steps = [
    ["Pick food", Utensils],
    ["Send to kitchen", ChefHat],
    ["Bill", CreditCard],
  ];
  const methods = [
    ["Cash", Banknote],
    ["UPI", Smartphone],
    ["Card", CreditCard],
    ["Other", Wallet],
  ];
  return (
    <>
      <div className="pos-bar">
        <button className="back-btn" onClick={() => nav("/tables")}>
          <ArrowLeft size={16} /> Tables
        </button>
        <div className="pos-title">
          <h1>{table?.name || order.label || "Takeaway"}</h1>
          <span className="chip">{isTakeaway ? "Takeaway" : "Dine-in"}</span>
          {order.kotSent && <span className="chip kot"><ChefHat size={12} /> KOT sent</span>}
          {order.startedAt && order.items.length > 0 && <small>Started {fmtTime(order.startedAt)} · {elapsed(order.startedAt)}</small>}
        </div>
        <ol className="stepper" aria-label="Order steps">
          {steps.map(([label, Icon], i) => {
            const n = i + 1;
            const state = n < step ? "done" : n === step ? "now" : "next";
            return (
              <li key={label} className={state}>
                <span>{state === "done" ? <Check size={13} /> : n}</span>
                {label}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="billing" ref={billRef}>
        <section className="menu-pane">
          <div className="menu-tools">
            <div className="search">
              <Search size={16} />
              <input placeholder="Search dishes…" value={q} onChange={(e) => { setQ(e.target.value); setLetter(""); }} />
              {q && <button className="clear-x" onClick={() => { setQ(""); setLetter(""); }} aria-label="Clear search"><X size={14} /></button>}
            </div>
            <div className="kind-filter" role="group" aria-label="Food type">
              {[["all", "All"], ["veg", "Veg"], ["non-veg", "Non-veg"]].map(([k, label]) => (
                <button key={k} className={"kind-btn " + k + (kind === k ? " active" : "")} onClick={() => { setKind(k); setLetter(""); }} aria-pressed={kind === k}>
                  {k !== "all" && <i className={"veg-mark " + (k === "veg" ? "veg" : "nonveg")} />}
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="pill-row scroll">
            <button className={"pill" + (cat === "All" ? " active" : "")} onClick={() => { setCat("All"); setLetter(""); }}>
              All
            </button>
            {s.categories.map((c) => (
              <button key={c} className={"pill" + (cat === c ? " active" : "")} onClick={() => { setCat(c); setLetter(""); }}>
                {c}
              </button>
            ))}
          </div>
          <div className="menu-body">
          <nav
            className="az-rail"
            aria-label="Filter dishes by first letter"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              const L = letterAt(e);
              drag.current = { down: true, moved: false, start: L, before: letter };
              setLetter(L);
              setHoverLetter("");
              setBubbleY(yAt(e));
            }}
            onPointerMove={(e) => {
              const L = letterAt(e);
              setBubbleY(yAt(e));
              if (drag.current.down) {
                if (L !== drag.current.start) drag.current.moved = true;
                setLetter(L);
              } else setHoverLetter(L);
            }}
            onPointerUp={(e) => {
              const d = drag.current;
              drag.current = { down: false };
              // plain tap on the already-selected letter clears it
              if (d.down && !d.moved && d.start === d.before && d.start !== "") setLetter("");
              if (e.pointerType !== "mouse") setBubbleY(null);
            }}
            onPointerCancel={() => { drag.current = { down: false }; setBubbleY(null); }}
            onPointerLeave={() => { if (!drag.current.down) { setHoverLetter(""); setBubbleY(null); } }}
          >
            {["", ...LETTERS].map((L) => {
              const has = L === "" || lettersWith.has(L);
              const on = (hoverLetter || letter) === L;
              return (
                <button
                  type="button"
                  key={L || "all"}
                  aria-label={L ? "Show dishes starting with " + L : "Show all dishes"}
                  aria-pressed={letter === L}
                  disabled={!has}
                  onClick={(e) => {
                    // mouse / touch are handled by the rail's pointer events; this is for keyboard (Enter / Space)
                    if (e.detail !== 0) return;
                    setLetter(letter === L ? "" : L);
                  }}
                  className={"az-btn" + (L === "" ? " az-all" : "") + (on ? (letter === L && !hoverLetter ? " active" : " hover") : "") + (has ? "" : " none")}
                >
                  {L || "All"}
                </button>
              );
            })}
          </nav>
          {bubbleY != null && activeLetter && (
            <div className="az-bubble" style={{ top: bubbleY }} key={activeLetter}>
              <span>{activeLetter}<small>{baseDishes.filter((d) => firstLetter(d) === activeLetter).length} dishes</small></span>
            </div>
          )}
          <div className="dish-grid fade" key={activeLetter + "|" + kind + "|" + cat} ref={gridRef}>
            {!dishes.length && (<div className="dish-empty">
            <Empty
              title={s.dishes.length ? "No dishes found" : "Your menu is empty"}
              desc={
                !s.dishes.length
                  ? "Add dishes from Menu & Dishes to start billing."
                  : activeLetter
                    ? `No dish starts with “${activeLetter}”${q || cat !== "All" || kind !== "all" ? " in the current search / category" : ""}.`
                    : "Try another search or category."
              }
            />
            {activeLetter && (
              <button className="text-btn" onClick={() => { setLetter(""); setHoverLetter(""); }}>
                Clear letter “{activeLetter}”
              </button>
            )}
            </div>)}
            {dishes.map((d) => {
              const inCart = order.items.filter((x) => x.dishId === d.id).reduce((a, x) => a + x.quantity, 0);
              const variants = d.variants || [];
              const single = variants.length === 1;
              return (
                <article className={"dish-card" + (inCart ? " in-cart" : "")} key={d.id}>
                  <button
                    className="dish-pic"
                    onClick={() => {
                      if (single) return add(d, variants[0]);
                      if (variants.length > 1) {
                        setNudge(d.id);
                        clearTimeout(nudgeTimer.current);
                        nudgeTimer.current = setTimeout(() => setNudge(null), 1400);
                        notify("Choose a size / variant for " + d.name + " below");
                      }
                    }}
                    aria-label={single ? "Add " + d.name : d.name + ": choose a variant below"}
                  >
                    <FoodThumb dish={d} size="lg" />
                    {inCart > 0 && <em className="dish-badge">{inCart}</em>}
                    <i className={"veg-mark " + (d.type === "non-veg" ? "nonveg" : "veg")} title={d.type === "non-veg" ? "Non-veg" : "Veg"} />
                  </button>
                  <div className="dish-info">
                    <b title={d.name}>{d.name}</b>
                    <small>{d.category}</small>
                  </div>
                  <div className={"variants" + (single ? " single" : "") + (nudge === d.id ? " nudge" : "")}>
                    {variants.map((v, vi) => (
                      <button key={v.name + "|" + vi} onClick={() => add(d, v)} title={"Add " + d.name + " (" + v.name + ")"}>
                        <span>{single ? "" : v.name}</span>
                        <b>{money(v.pricePaise)}</b>
                        <Plus size={14} />
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
          </div>
        </section>
        <div className={"cart-backdrop" + (cartOpen ? " on" : "")} onClick={() => setCartOpen(false)} />
        <button className="cart-bar" onClick={() => setCartOpen(true)} aria-label="View current order">
          <span className="cb-count"><Utensils size={16} />{itemCount}</span>
          <span className="cb-label">{itemCount ? "View order" : "No items yet"}</span>
          <b>{money(total)}</b>
          <ChevronUp size={18} />
        </button>
        <aside className={"cart" + (cartOpen ? " open" : "")}>
          <div className="sheet-grab cart-grab" onClick={() => setCartOpen(false)} />
          <div className="cart-head">
            <div>
              <h3>Current order</h3>
              <small>{itemCount ? itemCount + " item" + (itemCount > 1 ? "s" : "") : "No items yet"}</small>
            </div>
            <button className="cart-close" onClick={() => setCartOpen(false)} aria-label="Close order">
              <X size={18} />
            </button>
            {order.items.length > 0 && (
              <button className="text-btn danger" onClick={clearOrder}>
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>
          <div className="order-list">
            {order.items.length ? (
              order.items.map((i, idx) => (
                <div className="order-item" key={i.dishId + "|" + i.variant}>
                  <FoodThumb dish={s.dishes.find((d) => d.id === i.dishId) || { name: i.name }} />
                  <div className="oi-name">
                    <b>{i.name}</b>
                    <small>{i.variant} · {money(i.unitPricePaise)}</small>
                  </div>
                  <div className="qty">
                    <button
                      aria-label="Decrease"
                      onClick={() => setQty(idx, i.quantity - 1)}
                    >
                      −
                    </button>
                    <span>{i.quantity}</span>
                    <button
                      aria-label="Increase"
                      onClick={() =>
                        change((o) => ({
                          ...o,
                          items: o.items.map((x, j) =>
                            j === idx ? { ...x, quantity: Math.min(999, x.quantity + 1) } : x,
                          ),
                        }))
                      }
                    >
                      +
                    </button>
                  </div>
                  <b className="oi-total">{money(i.unitPricePaise * i.quantity)}</b>
                  <button
                    className="remove"
                    aria-label="Remove item"
                    onClick={() => setQty(idx, 0)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="cart-empty">
                <Utensils size={26} />
                <b>Order is empty</b>
                <small>Tap a dish on the left to add it.</small>
              </div>
            )}
          </div>
          <div className="cart-foot">
            <div className="cart-inputs">
              <label className="field-label">
                Note for kitchen
                <input
                  value={order.notes || ""}
                  onChange={(e) => change((o) => ({ ...o, notes: e.target.value }))}
                  placeholder="e.g. less spicy"
                />
              </label>
            </div>
            <div className="totals">
              <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
              {discountP > 0 && <div><span>Discount</span><b>− {money(discountP)}</b></div>}
              {taxRules.map((t, i) => (
                <div key={i}>
                  <span>{t.name || "Tax"} ({Number(t.rate)}%){inclusive ? " incl." : ""}</span>
                  <b>{money(taxParts[i])}</b>
                </div>
              ))}
              {service > 0 && (
                <div><span>Service charge ({s.settings.serviceChargeRate}%)</span><b>{money(service)}</b></div>
              )}
              <div className="grand"><b>Total</b><strong>{money(total)}</strong></div>
            </div>
            <div className="cart-actions">
              {!order.items.length ? (
                <button className="primary main-cta" disabled>
                  <Utensils size={18} /> Pick dishes to start
                </button>
              ) : needsKot ? (
                <>
                  <button className="primary main-cta kot-cta" onClick={sendKot}>
                    <Send size={18} />
                    {order.kotSent ? `Send ${unsentQty} new item${unsentQty > 1 ? "s" : ""} to kitchen` : "Send to kitchen (KOT)"}
                  </button>
                  <button className="text-btn skip-kot" onClick={openPay}>
                    Skip KOT, bill now · {money(total)} <ChevronRight size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button className="primary main-cta" onClick={openPay}>
                    <CreditCard size={18} /> Bill · {money(total)}
                  </button>
                  <div className="cta-row">
                    <button className="text-btn" onClick={reprintKot}>
                      <Printer size={13} /> Reprint KOT
                    </button>
                    <span>Need more? Tap a dish to add.</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
      {pay && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && setPay(false)}>
          <div className="modal">
            <div className="modal-head">
              <h3>Settle bill</h3>
              <button onClick={() => setPay(false)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="pay-total">
              <span>Amount payable</span>
              <strong>{money(total)}</strong>
            </div>
            <label className="field-label disc-field" htmlFor="disc">
              Discount (₹)
              <input id="disc" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </label>
            <div className="pay-methods">
              {methods.map(([m, Icon]) => (
                <button key={m} className={method === m ? "active" : ""} onClick={() => setMethod(m)}>
                  <Icon size={20} />
                  {m}
                </button>
              ))}
            </div>
            {method === "Cash" && (
              <>
                <label className="field-label">
                  Cash received (₹)
                  <input
                    type="number"
                    min="0"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    placeholder={(total / 100).toFixed(2)}
                  />
                </label>
                <div className="quick-cash">
                  <button onClick={() => setCash(String(total / 100))}>Exact</button>
                  {[...new Set([10, 50, 100, 500, 2000].map((n) => Math.ceil(total / 100 / n) * n))]
                    .filter((v) => v * 100 > total)
                    .slice(0, 4)
                    .map((v) => (
                      <button key={v} onClick={() => setCash(String(v))}>
                        ₹{v.toLocaleString("en-IN")}
                      </button>
                    ))}
                </div>
                <div className={"change-due" + (cashP < total ? " short" : "")}>
                  <span>{cashP < total ? "Still to collect" : "Change to return"}</span>
                  <span>{money(Math.abs(cashP - total))}</span>
                </div>
              </>
            )}
            <div className="cust-fields">
              <label className="field-label">
                Customer name <small>(needed for a pending bill)</small>
                <input value={custName} maxLength={80} onChange={(e) => setCustName(e.target.value)} />
              </label>
              <label className="field-label">
                Phone
                <input value={custPhone} maxLength={20} inputMode="tel" onChange={(e) => setCustPhone(e.target.value)} />
              </label>
            </div>
            {err && <p className="field-error">{err}</p>}
            <div className="modal-actions">
              <Btn onClick={() => setPay(false)}>Cancel</Btn>
              <button className="primary" disabled={busy} onClick={() => submit("Paid")}>
                {busy ? "Processing…" : "Confirm payment"}
              </button>
            </div>
            <button className="clear" disabled={busy} onClick={() => submit("Pending")}>
              Save as pending bill
            </button>
          </div>
        </div>
      )}
    </>
  );
}
function Menu({ s, save, notify }) {
  const [q, setQ] = useState(""),
    [modal, setModal] = useState(false),
    [edit, setEdit] = useState(null);
  const fresh = () => ({
    name: "",
    category: s.categories[0] || "",
    type: "veg",
    available: true,
    variants: [{ name: "Full", price: "" }],
  });
  const [form, setForm] = useState(fresh());
  const open = (d) => {
    setEdit(d?.id || "new");
    setForm(
      d
        ? {
            ...d,
            variants: (d.variants || []).map((v) => ({
              ...v,
              price: v.pricePaise / 100,
            })),
          }
        : fresh(),
    );
    setModal(true);
  };
  useEscape(modal, () => setModal(false));
  const submit = async () => {
    if (
      !form.name.trim() ||
      !form.variants.length ||
      form.variants.some(
        (v) => !String(v.name || "").trim() || !Number.isFinite(Number(v.price)) || Number(v.price) < 0 || v.price === "",
      )
    )
      return notify("Complete dish and variant fields", "error");
    if (!form.category) return notify("Create a category first (Manage → Categories)", "error");
    const norm = (x) => String(x || "").trim().replace(/\s+/g, " ").toLowerCase();
    const dup = s.dishes.find((x) => x.id !== form.id && norm(x.name) === norm(form.name));
    if (dup)
      return notify("A dish named “" + dup.name + "” already exists (" + (dup.category || "no category") + "). Use a different name, e.g. add the size or style.", "error");
    const names = form.variants.map((v) => v.name.trim().toLowerCase());
    if (new Set(names).size !== names.length)
      return notify("Each variant needs a different name", "error");
    const d = {
      ...form,
      name: form.name.trim().replace(/\s+/g, " "),
      id: edit === "new" ? "dish-" + uid() : form.id,
      variants: form.variants.map((v) => ({
        name: v.name.trim(),
        pricePaise: paise(v.price),
      })),
    };
    delete d.price;
    const ok = await save(
      "dishes",
      edit === "new"
        ? [...s.dishes, d]
        : s.dishes.map((x) => (x.id === d.id ? d : x)),
    );
    if (ok) {
      setModal(false);
      notify("Dish saved");
    }
  };
  return (
    <>
      <Heading
        eyebrow="MENU MANAGEMENT"
        title="Menu & dishes"
        desc="Manage dishes, variants, pricing, and availability."
        action={
          <Btn primary icon={Plus} onClick={() => open(null)}>
            Add dish
          </Btn>
        }
      />
      <div className="stats">
        <Stat
          label="Total dishes"
          value={s.dishes.length}
          note="Across all categories"
          icon={Utensils}
        />
        <Stat
          label="Available"
          value={s.dishes.filter((d) => d.available !== false).length}
          note="Visible for ordering"
          icon={Check}
        />
        <Stat
          label="Categories"
          value={s.categories.length}
          note="Menu organization"
          icon={Tags}
        />
        <Stat
          label="Variants"
          value={s.dishes.reduce((a, d) => a + (d.variants || []).length, 0)}
          note="Serving sizes and options"
          icon={BookOpen}
        />
      </div>
      <Panel title="Menu catalog" desc="Dish pricing and availability">
        <div className="search my-4">
          <Search size={15} />
          <input
            placeholder="Search dishes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>DISH</th>
                <th>CATEGORY</th>
                <th>TYPE</th>
                <th>VARIANTS & PRICES</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {s.dishes
                .filter((d) => String(d.name || "").toLowerCase().includes(q.toLowerCase()))
                .map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="menu-dish-cell"><FoodThumb dish={d} /><span><b>{d.name}</b><small>{d.type === "veg" ? "Vegetarian" : "Non-vegetarian"}</small></span></div>
                    </td>
                    <td>{d.category}</td>
                    <td>{d.type === "veg" ? "Veg" : "Non-veg"}</td>
                    <td>
                      {(d.variants || []).map((v, vi) => (
                        <div key={v.name + "|" + vi}>
                          {v.name} <b>{money(v.pricePaise)}</b>
                        </div>
                      ))}
                    </td>
                    <td>
                      <button
                        className="status-toggle"
                        onClick={() =>
                          save(
                            "dishes",
                            s.dishes.map((x) =>
                              x.id === d.id
                                ? { ...x, available: x.available === false }
                                : x,
                            ),
                          )
                        }
                      >
                        {d.available === false ? "Unavailable" : "Available"}
                      </button>
                    </td>
                    <td>
                      <button className="text-btn" onClick={() => open(d)}>
                        Edit
                      </button>{" "}
                      <button
                        className="text-btn danger"
                        onClick={async () => {
                          const yes = await ask({
                            title: "Delete " + d.name + "?",
                            message: "Existing bills keep their saved copy of this dish.",
                            confirmLabel: "Delete dish",
                            danger: true,
                          });
                          if (yes) {
                            await save("dishes", s.dishes.filter((x) => x.id !== d.id));
                            notify("Dish deleted");
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {modal && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-head">
              <h3>{edit === "new" ? "Add dish" : "Edit dish"}</h3>
              <button onClick={() => setModal(false)} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="food-image-editor">
              <div className="food-image-preview">{form.imageDataUrl ? <img src={form.imageDataUrl} alt="Food preview" /> : <Image size={28} />}</div>
              <div><b>Food photo</b><small>Choose a clear photo. It is saved with this dish on this computer.</small><label className="btn food-upload">{form.imageDataUrl ? "Change image" : "Upload food image"}<input type="file" accept="image/*" hidden onChange={async e => { const f=e.target.files?.[0]; e.target.value=""; if(!f)return; try { setForm({...form,imageDataUrl:await readLogo(f, "photo")}); } catch(err) { notify(errMsg(err),"error"); } }} /></label>{form.imageDataUrl && <button className="text-btn danger" onClick={()=>setForm({...form,imageDataUrl:""})}>Remove image</button>}</div>
            </div>
            <label className="field-label">
              Dish name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="field-label">
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {!s.categories.includes(form.category) && form.category && (
                  <option key={form.category}>{form.category}</option>
                )}
                {s.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Food type
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="veg">Vegetarian</option>
                <option value="non-veg">Non-vegetarian</option>
              </select>
            </label>
            <b className="form-subhead">Serving variants</b>
            {form.variants.map((v, i) => (
              <div className="variant-form" key={i}>
                <input
                  placeholder="Variant"
                  value={v.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      variants: form.variants.map((x, j) =>
                        i === j ? { ...x, name: e.target.value } : x,
                      ),
                    })
                  }
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Price ₹"
                  value={v.price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      variants: form.variants.map((x, j) =>
                        i === j ? { ...x, price: e.target.value } : x,
                      ),
                    })
                  }
                />
                <button
                  aria-label="Remove variant"
                  title="Remove variant"
                  onClick={() =>
                    setForm({
                      ...form,
                      variants: form.variants.filter((_, j) => j !== i),
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              className="text-btn"
              onClick={() =>
                setForm({
                  ...form,
                  variants: [...form.variants, { name: "", price: "" }],
                })
              }
            >
              + Add variant
            </button>
            <label className="check-field">
              <input
                type="checkbox"
                checked={form.available !== false}
                onChange={(e) =>
                  setForm({ ...form, available: e.target.checked })
                }
              />{" "}
              Available for ordering
            </label>
            <div className="modal-actions">
              <Btn onClick={() => setModal(false)}>Cancel</Btn>
              <Btn primary icon={Save} onClick={submit}>
                Save dish
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function Categories({ s, save, notify }) {
  const [name, setName] = useState("");
  const moveCat = async (i, dir) => {
    const list = [...s.categories];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await save("categories", list);
  };
  const renameCat = async (c) => {
    const n = await ask({ title: "Rename category", input: { label: "Category name", value: c }, confirmLabel: "Save name" });
    if (n == null || n === c) return;
    if (s.categories.some((x) => x !== c && x.toLowerCase() === n.toLowerCase()))
      return notify("A category named “" + n + "” already exists", "error");
    // dishes keep pointing at the category by name, so move them along with it
    const categories = s.categories.map((x) => (x === c ? n : x));
    if (!(await save("categories", categories))) return;
    if (s.dishes.some((d) => d.category === c)) {
      const ok = await save("dishes", s.dishes.map((d) => (d.category === c ? { ...d, category: n } : d)));
      if (!ok) {
        await save("categories", s.categories); // undo, so no dish is left in a category that does not exist
        return;
      }
    }
    notify("Category renamed");
  };
  const add = async () => {
    if (!name.trim()) return;
    if (s.categories.some((c) => c.toLowerCase() === name.trim().toLowerCase()))
      return notify("Category already exists", "error");
    if (await save("categories", [...s.categories, name.trim()])) {
      setName("");
      notify("Category added");
    }
  };
  return (
    <>
      <Heading
        eyebrow="MENU MANAGEMENT"
        title="Categories"
        desc="Organize your menu into clear sections."
      />
      <div className="columns">
        <Panel title="Add a category" desc="Create a new menu section">
          <label className="field-label">
            Category name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="e.g. Chef specials"
            />
          </label>
          <Btn primary icon={Plus} onClick={add}>
            Add category
          </Btn>
        </Panel>
        <Panel
          title="Menu categories"
          desc={`${s.categories.length} categories configured`}
        >
          {s.categories.map((c, ci) => (
            <div className="category-item" key={c}>
              <span>
                <Tags size={16} />
              </span>
              <b>
                {c}
                <small>
                  {s.dishes.filter((d) => d.category === c).length} dishes
                </small>
              </b>
              <span className="cat-tools">
                <button aria-label={"Move " + c + " up"} title="Move up" disabled={ci === 0} onClick={() => moveCat(ci, -1)}>
                  <ChevronUp size={15} />
                </button>
                <button aria-label={"Move " + c + " down"} title="Move down" disabled={ci === s.categories.length - 1} onClick={() => moveCat(ci, 1)}>
                  <ChevronDown size={15} />
                </button>
                <button aria-label={"Rename " + c} title="Rename" onClick={() => renameCat(c)}>
                  <Pencil size={15} />
                </button>
              <button
                aria-label={"Delete " + c}
                title="Delete"
                onClick={async () => {
                  if (s.dishes.some((d) => d.category === c))
                    return notify(
                      "Move or delete dishes in this category first",
                      "error",
                    );
                  if (
                    await ask({
                      title: "Delete category “" + c + "”?",
                      confirmLabel: "Delete",
                      danger: true,
                    })
                  )
                    await save(
                      "categories",
                      s.categories.filter((x) => x !== c),
                    );
                }}
              >
                <Trash2 size={15} />
              </button>
              </span>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
const BILL_PAGE = 50;
function Bills({ s, query, setQuery, nav, notify }) {
  const [status, setStatus] = useState("All"),
    [date, setDate] = useState(""),
    [page, setPage] = useState(0),
    [tableSearch, setTableSearch] = useState("");
  // only offer statuses that exist (the app cannot create Refunded / Cancelled / Voided bills)
  const statusOptions = ["All", "Paid", "Pending", ...new Set(s.bills.map((b) => b.status).filter((x) => x && x !== "Paid" && x !== "Pending"))];
  const bills = [...s.bills]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter(
      (b) =>
        [b.billNumber, b.tableName, b.tableId, b.customerName, b.customerPhone].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(query.toLowerCase()),
        ) &&
        (status === "All" || b.status === status) &&
        (!date || billDay(b) === date) &&
        String(b.tableName || "")
          .toLowerCase()
          .includes(tableSearch.toLowerCase()),
    );
  const pages = Math.max(1, Math.ceil(bills.length / BILL_PAGE));
  const curPage = Math.min(page, pages - 1);
  const csv = () => {
    const text = [
      "Bill,Date,Table,Customer,Phone,Subtotal,Discount,Tax,Service Charge,Total,Method,Status",
      ...bills.map((b) =>
        [
          b.billNumber,
          fmtDateTime(b.createdAt),
          b.tableName,
          b.customerName || "",
          b.customerPhone || "",
          ((b.subtotalPaise || 0) / 100).toFixed(2),
          ((b.discountPaise || 0) / 100).toFixed(2),
          ((b.taxPaise || 0) / 100).toFixed(2),
          ((b.serviceChargePaise || 0) / 100).toFixed(2),
          ((b.grandTotalPaise || 0) / 100).toFixed(2),
          b.paymentMethod || "",
          b.status,
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\n");
    if (!bills.length) return notify("No bills to export", "error");
    if (!window.hotelApp) return notify("Export works in the desktop app", "error");
    window.hotelApp
      .exportFile("csv", "\ufeff" + text)
      .then((r) => r && notify("CSV exported"))
      .catch((e) => notify(errMsg(e), "error"));
  };
  return (
    <>
      <Heading
        eyebrow="TRANSACTIONS"
        title="Previous bills"
        desc="Review transactions and reprint receipts without modifying historical values."
        action={
          <Btn icon={Download} onClick={csv}>
            Export CSV
          </Btn>
        }
      />
      <div className="stats">
        <Stat
          label="Total bills"
          value={s.bills.length}
          note="All recorded transactions"
          icon={Receipt}
        />
        <Stat
          label="Paid"
          value={s.bills.filter((b) => b.status === "Paid").length}
          note="Successfully settled"
          icon={Check}
        />
        <Stat
          label="Pending"
          value={s.bills.filter((b) => b.status === "Pending").length}
          note="Awaiting payment"
          icon={Clock3}
        />
        <Stat
          label="Total billed"
          value={money(
            s.bills
              .filter(
                (b) => !["Cancelled", "Voided", "Refunded"].includes(b.status),
              )
              .reduce((a, b) => a + b.grandTotalPaise, 0),
          )}
          note="Excluding cancelled/refunded"
          icon={Wallet}
        />
      </div>
      <Panel title="Transaction history" desc={`${bills.length} results`}>
        <div className="toolbar">
          <div className="search">
            <Search size={15} />
            <input
              placeholder="Search bill, table, customer…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(0); }}
          />
          <input
            placeholder="Filter table…"
            value={tableSearch}
            onChange={(e) => { setTableSearch(e.target.value); setPage(0); }}
          />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            {statusOptions.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>BILL NUMBER</th>
                <th>DATE & TIME</th>
                <th>TABLE</th>
                <th>SUBTOTAL</th>
                <th>DISCOUNT</th>
                <th>TAX</th>
                <th>TOTAL</th>
                <th>METHOD</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {bills.slice(curPage * BILL_PAGE, (curPage + 1) * BILL_PAGE).map((b) => (
                <tr
                  key={b.id}
                  className="click"
                  tabIndex={0}
                  onClick={() => nav("/bills/" + b.id)}
                  onKeyDown={(e) => e.key === "Enter" && nav("/bills/" + b.id)}
                >
                  <td>
                    <b className="bill-link">{b.billNumber}</b>
                  </td>
                  <td>{fmtDateTime(b.createdAt)}</td>
                  <td>{b.tableName}</td>
                  <td>{money(b.subtotalPaise)}</td>
                  <td>{money(b.discountPaise)}</td>
                  <td>{money(b.taxPaise)}</td>
                  <td>
                    <b>{money(b.grandTotalPaise)}</b>
                  </td>
                  <td>{b.paymentMethod || "—"}</td>
                  <td>
                    <span className={"status " + b.status?.toLowerCase()}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="pager">
              <button className="btn" disabled={curPage === 0} onClick={() => setPage(curPage - 1)}>← Newer</button>
              <span>
                Page {curPage + 1} of {pages} · showing {curPage * BILL_PAGE + 1}–{Math.min(bills.length, (curPage + 1) * BILL_PAGE)} of {bills.length}
              </span>
              <button className="btn" disabled={curPage >= pages - 1} onClick={() => setPage(curPage + 1)}>Older →</button>
            </div>
          )}
          {!bills.length && (
            <Empty
              title="No matching bills"
              desc="Completed transactions appear here."
            />
          )}
        </div>
      </Panel>
    </>
  );
}
const escHtml = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const paperWidth = { "58mm": "52mm", "80mm": "72mm", A4: "170mm" };
/* Tax-inclusive bills: tax is already inside the total (older bills did not store the mode, so infer it) */
const isInclusiveBill = (b) => {
  if (b.taxMode) return b.taxMode === "inclusive";
  const net = (b.subtotalPaise || 0) - (b.discountPaise || 0);
  return !!b.taxPaise && (b.grandTotalPaise || 0) - (b.serviceChargePaise || 0) === net;
};
function receiptHtml(s, b) {
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
function kotHtml(s, tableId, order, table, mode) {
  const rows = (order.items || []).map(i => `<div class="r"><b>${mode === "CANCEL" ? "CANCEL " : ""}${escHtml(i.quantity)} × ${escHtml(i.name)}${i.newQty > 0 && i.newQty < i.quantity ? " [NEW +" + escHtml(i.newQty) + "]" : ""}</b><span>${escHtml(i.variant || "")}</span></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:0}body{font:14px Arial;width:${paperWidth[s.settings.receiptSize] || paperWidth["80mm"]};margin:auto;padding:5mm 0;color:#111}.c{text-align:center}hr{border:0;border-top:1px dashed #333}.r{display:flex;justify-content:space-between;gap:8px;margin:12px 0}.note{font-size:12px}</style></head><body><div class="c"><h2>${escHtml(s.hotel.name || "HOTEL")}</h2><b>${mode === "CANCEL" ? "*** CANCELLED ITEMS ***" : "KITCHEN ORDER TICKET"}</b><h2>${escHtml(table || "Takeaway")}</h2><p>${escHtml(fmtDateTime(order.kotSentAt || order.startedAt || new Date()))}</p></div><hr/>${rows}<hr/><p class="note">Order ID: ${escHtml(String(tableId).slice(-8).toUpperCase())}</p>${order.notes ? `<p><b>Note:</b> ${escHtml(order.notes)}</p>` : ""}</body></html>`;
}
async function printHtml(s, html, notify, role = "payment") {
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
function BillDetail({ s, notify, reload, nav }) {
  const { billId } = useParams();
  const [method, setMethod] = useState("");
  const b = s.bills.find((x) => x.id === billId);
  if (!b)
    return <Empty title="Bill not found" desc="This transaction does not exist." />;
  const settle = async () => {
    if (!method) return notify("Choose how the customer paid", "error");
    try {
      await window.hotelApp.settleBill(b.id, method);
      await reload();
      notify("Bill marked as paid");
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };
  const taxLines = b.taxBreakdown?.filter((t) => t.amountPaise) || [];
  return (
    <>
      <Heading
        eyebrow="TRANSACTION DETAILS"
        title={b.billNumber}
        desc={`Created ${fmtDateTime(b.createdAt)}`}
        action={
          <>
            <Btn icon={ArrowLeft} onClick={() => nav("/bills")}>All bills</Btn>
            <Btn primary icon={Printer} onClick={() => printHtml(s, receiptHtml(s, b), notify, "payment")}>
              Print receipt
            </Btn>
          </>
        }
      />
      <div className="columns detail">
        <Panel title="Bill summary" desc={`${b.tableName} · ${b.status}`}>
          <div className="bill-items">
            {(b.items || []).map((i, idx) => (
              <div key={idx}>
                <span>
                  <b>{i.name}</b>
                  <small>{i.variant} · {i.quantity} × {money(i.unitPricePaise)}</small>
                </span>
                <b>{money(i.lineTotalPaise || i.unitPricePaise * i.quantity)}</b>
              </div>
            ))}
          </div>
          <div className="totals">
            <div><span>Subtotal</span><b>{money(b.subtotalPaise)}</b></div>
            {b.discountPaise > 0 && <div><span>Discount</span><b>− {money(b.discountPaise)}</b></div>}
            {taxLines.length
              ? taxLines.map((t, i) => (
                  <div key={i}><span>{t.name} ({t.rate}%){isInclusiveBill(b) ? " incl." : ""}</span><b>{money(t.amountPaise)}</b></div>
                ))
              : b.taxPaise > 0 && <div><span>Tax{isInclusiveBill(b) ? " (incl.)" : ""}</span><b>{money(b.taxPaise)}</b></div>}
            {b.serviceChargePaise > 0 && <div><span>Service charge</span><b>{money(b.serviceChargePaise)}</b></div>}
            <div className="grand"><b>Grand total</b><strong>{money(b.grandTotalPaise)}</strong></div>
          </div>
        </Panel>
        <Panel title="Receipt preview" desc="Exactly what is printed for the customer">
          <iframe className="receipt-frame" title="Receipt preview" sandbox="" srcDoc={receiptHtml(s, b)} />
        </Panel>
        <Panel title="Transaction information">
          {[
            ["Payment method", b.paymentMethod || (b.status === "Pending" ? "Not paid yet" : "—")],
            ["Payment status", b.status],
            ...(b.customerName || b.customerPhone ? [["Customer", [b.customerName, b.customerPhone].filter(Boolean).join(" · ")]] : []),
            ...(b.paidAt && b.status === "Paid" ? [["Paid on", fmtDateTime(b.paidAt)]] : []),
            ["Business date", b.businessDate || billDay(b)],
            ["Created at", fmtDateTime(b.createdAt)],
          ].map(([k, v]) => (
            <div className="meta" key={k}><span>{k}</span><b>{v}</b></div>
          ))}
          {b.status === "Pending" && window.hotelApp && (
            <div className="settle-box">
              <b>Collect payment</b>
              <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
                <option value="">Select payment method…</option>
                {["Cash", "UPI", "Card", "Other"].map((x) => <option key={x}>{x}</option>)}
              </select>
              <button className="primary" disabled={!method} onClick={settle}>Mark as paid</button>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
function Reports({ s }) {
  const paid = s.bills.filter((b) => b.status === "Paid");
  const total = paid.reduce((a, b) => a + b.grandTotalPaise, 0);
  const days = Object.entries(
    paid.reduce((a, b) => {
      const k = collectDay(b) || "unknown";
      a[k] = (a[k] || 0) + b.grandTotalPaise / 100;
      return a;
    }, {}),
  )
    .sort()
    .slice(-30)
    .map(([day, revenue]) => ({ day: day === "unknown" ? "?" : day.slice(5), revenue }));
  return (
    <>
      <Heading
        eyebrow="INSIGHTS"
        title="Reports & analytics"
        desc="Sales, tax and collection trends from recorded transactions."
      />
      <div className="stats">
        <Stat
          label="Net collected"
          value={money(total)}
          note="Paid bills"
          icon={Wallet}
        />
        <Stat
          label="Tax collected"
          value={money(paid.reduce((a, b) => a + (b.taxPaise || 0), 0))}
          note="Recorded tax amounts"
          icon={FileText}
        />
        <Stat
          label="Discounts given"
          value={money(paid.reduce((a, b) => a + (b.discountPaise || 0), 0))}
          note="Across paid bills"
          icon={Activity}
        />
        <Stat
          label="Average transaction"
          value={money(paid.length ? total / paid.length : 0)}
          note="Per paid bill"
          icon={CreditCard}
        />
      </div>
      <Panel title="Revenue trend" desc="Daily collected revenue · last 30 days with sales">
        {days.length ? (
          <div className="chart tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
                <Tooltip contentStyle={chartTip} cursor={{ fill: "var(--brand-soft)" }} formatter={(v) => "₹" + Number(v).toLocaleString("en-IN")} />
                <Bar dataKey="revenue" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty
            title="Not enough data yet"
            desc="Create paid bills to build sales reports."
          />
        )}
      </Panel>
    </>
  );
}
function RatioBar({ c, small }) {
  return (
    <div className={"ratio-bar" + (small ? " sm" : "")} aria-hidden="true">
      <i style={{ flex: 6, background: c.main }} />
      <i style={{ flex: 3, background: c.secondary }} />
      <i style={{ flex: 1, background: c.accent }} />
    </div>
  );
}
function MiniPreview({ colors, mode, label }) {
  const p = buildPalette(colors, mode);
  return (
    <div>
      <p className="tp-cap">{label}</p>
      <div className="tp" style={p}>
        <div className="tp-side">
          <span className="on">Tables</span>
          <span>Menu</span>
          <span>Bills</span>
        </div>
        <div className="tp-main">
          <h4>Table T5</h4>
          <div className="tp-card"><span>Paneer Masala</span><b>₹280</b></div>
          <div className="tp-card"><span>Butter Naan</span><b>₹45</b></div>
          <span className="tp-btn">Pay ₹325</span>
        </div>
      </div>
    </div>
  );
}
function ThemeSection({ theme, setTheme, colors, setColors, notify }) {
  const cur = sanitize(colors || DEFAULT_COLORS);
  const [hex, setHex] = useState(cur);
  useEffect(() => setHex(cur), [colors]);
  const set = (k, v) => {
    setHex((h) => ({ ...h, [k]: v }));
    if (isHex(v)) setColors(sameColors({ ...cur, [k]: v }, DEFAULT_COLORS) ? null : { ...cur, [k]: v });
  };
  const rows = [
    ["main", "Main color", "60%", "Page background, the canvas behind everything. Pick a calm shade."],
    ["secondary", "Secondary color", "30%", "Top bar, cards, order panel and pop-ups."],
    ["accent", "Accent color", "10%", "Buttons, active menu, prices and highlights. Pick your brand color."],
  ];
  return (
    <>
      <p className="settings-intro">
        Choose any 3 colors using the <b>60-30-10 rule</b>: 60% main, 30% secondary, 10% accent. The whole app changes instantly, and
        Dark mode is created automatically from the same colors.
      </p>
      <b className="form-subhead">Quick picks</b>
      <div className="theme-presets">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            className={"theme-preset" + (sameColors(p.colors, cur) ? " on" : "")}
            onClick={() => {
              setColors(sameColors(p.colors, DEFAULT_COLORS) ? null : p.colors);
              notify("Theme: " + p.name);
            }}
          >
            <RatioBar c={p.colors} small />
            {p.name}
          </button>
        ))}
      </div>
      <b className="form-subhead">Your own colors</b>
      <RatioBar c={cur} />
      <div className="color-rows">
        {rows.map(([k, title, pct, hint]) => (
          <div className="color-row" key={k}>
            <label className="swatch" style={{ background: cur[k] }} title="Click to choose a color">
              <input type="color" value={cur[k]} onChange={(e) => set(k, e.target.value)} aria-label={title} />
            </label>
            <div>
              <b>{title} <em>{pct}</em></b>
              <small>{hint}</small>
            </div>
            <input
              type="text"
              value={hex[k]}
              maxLength={7}
              onChange={(e) => set(k, e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value)}
              aria-label={title + " hex code"}
            />
          </div>
        ))}
      </div>
      <b className="form-subhead">Mode</b>
      <div className="seg" role="group" aria-label="Light or dark">
        <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}><Sun size={15} /> Light</button>
        <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}><Moon size={15} /> Dark</button>
      </div>
      <b className="form-subhead">Preview</b>
      <div className="theme-previews">
        <MiniPreview colors={cur} mode="light" label="Light mode" />
        <MiniPreview colors={cur} mode="dark" label="Dark mode (automatic)" />
      </div>
      <p className="warning-note">
        Text colors are picked automatically so everything stays readable. Paid / pending / error colors stay the same on purpose. Saved on this computer.
      </p>
      <Btn icon={RefreshCw} onClick={() => { setColors(null); notify("Theme reset to default"); }}>Reset to default</Btn>
    </>
  );
}
const readLogo = (file, kind = "logo") =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(Error("Please choose an image file"));
    if (file.size > 8 * 1024 * 1024) return reject(Error("Image is too large (max 8 MB)"));
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const max = 320;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      const g = c.getContext("2d");
      if (kind === "photo") {
        g.fillStyle = "#fff";
        g.fillRect(0, 0, c.width, c.height);
      }
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(kind === "photo" ? c.toDataURL("image/jpeg", 0.82) : c.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("Could not read this image"));
    };
    img.src = url;
  });
const taxList = (st) =>
  st.taxes?.length ? st.taxes : [{ name: st.taxName || "GST", rate: st.taxRate ?? 0, enabled: true }];
function SettingsPage({ s, save, notify, theme, setTheme, colors, setColors }) {
  const { section = "restaurant" } = useParams();
  const [hotel, setHotel] = useState(s.hotel),
    [settings, setSettings] = useState(s.settings),
    [info, setInfo] = useState(null),
    [printers, setPrinters] = useState(null),
    [loadingPrinters, setLoadingPrinters] = useState(false),
    [files, setFiles] = useState(null),
    [picked, setPicked] = useState({});
  useEffect(() => {
    setHotel(s.hotel);
    setSettings(s.settings);
  }, [s.hotel, s.settings]);
  useEscape(!!files, () => setFiles(null));
  const tabs = [
    ["restaurant", "Hotel profile"],
    ["theme", "Theme & colors"],
    ["tax", "Tax & billing"],
    ["printer", "Receipt & printer"],
    ["storage", "Storage"],
    ["backup", "Backup & restore"],
  ];
  const refreshPrinters = async () => {
    if (!window.hotelApp) return setPrinters([]);
    setLoadingPrinters(true);
    try {
      setPrinters(await window.hotelApp.listPrinters());
    } catch (e) {
      notify(errMsg(e), "error");
      setPrinters([]);
    }
    setLoadingPrinters(false);
  };
  useEffect(() => {
    if (section === "printer" && printers === null) refreshPrinters();
  }, [section]);
  const choosePrinter = async (role, name) => {
    const key = role === "kitchen" ? "kitchenPrinterName" : "paymentPrinterName";
    const updated = { ...s.settings, [key]: name };
    if (await save("settings", updated)) {
      setSettings(updated);
      notify(name ? (role === "kitchen" ? "Kitchen printer connected" : "Payment printer connected") : "Printer disconnected");
    }
  };
  const backup = async () => {
    try {
      const r = await window.hotelApp?.backup();
      if (r) notify("Backup saved");
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };
  const restore = async () => {
    const yes = await ask({
      title: "Restore from backup?",
      message: "This replaces all current settings, menu, orders and bills with the backup file.",
      confirmLabel: "Choose file & restore",
      danger: true,
    });
    if (!yes) return;
    try {
      const r = await window.hotelApp?.restore();
      if (r) {
        notify("Backup restored");
        setTimeout(() => location.reload(), 600);
      }
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };
  const openFiles = async () => {
    try {
      const all = (await window.hotelApp?.listFiles()) || [];
      const list = all.filter((f) => !f.protected);
      if (!list.length) return notify("No eligible files to delete");
      setPicked({});
      setFiles(list);
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };
  const deleteFiles = async () => {
    const paths = Object.keys(picked).filter((k) => picked[k]);
    if (!paths.length) return notify("Select at least one file", "error");
    const yes = await ask({
      title: "Delete " + paths.length + " file(s)?",
      message: "This cannot be undone. Create a backup first if needed.",
      confirmLabel: "Delete files",
      danger: true,
    });
    if (!yes) return;
    try {
      await window.hotelApp.deleteFiles(paths);
      notify("Selected files deleted");
      setFiles(null);
      setInfo(await window.hotelApp.storageInfo());
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };
  const taxes = taxList(settings);
  const setTaxes = (fn) => setSettings((p) => ({ ...p, taxes: fn(taxList(p)) }));
  const activeRate = taxes.filter((t) => t.enabled !== false).reduce((a, t) => a + (Number(t.rate) || 0), 0);
  const saveTax = async () => {
    for (const t of taxes) {
      if (!String(t.name || "").trim()) return notify("Every tax needs a name", "error");
      const r = Number(t.rate);
      if (!Number.isFinite(r) || r < 0 || r > 100) return notify(`Tax rate for “${t.name}” must be between 0 and 100`, "error");
    }
    const clean = taxes.map((t) => ({ name: t.name.trim(), rate: Number(t.rate), enabled: t.enabled !== false }));
    const sc = Number(settings.serviceChargeRate) || 0;
    if (sc < 0 || sc > 100) return notify("Service charge must be between 0 and 100", "error");
    if (
      await save("settings", {
        ...settings,
        taxes: clean,
        taxName: clean[0]?.name || "GST",
        taxRate: clean.filter((t) => t.enabled).reduce((a, t) => a + t.rate, 0),
        serviceChargeRate: sc,
        billPrefix: (settings.billPrefix || "BILL-").trim() || "BILL-",
      })
    )
      notify("Billing settings saved");
  };
  const saveHotel = async () => {
    if (!String(hotel.name || "").trim()) return notify("Enter the hotel name", "error");
    if (await save("hotel", { ...hotel, name: hotel.name.trim() })) notify("Hotel profile saved");
  };
  const field = (label, key, props = {}) => (
    <label className="field-label">
      {label}
      <input value={hotel[key] || ""} onChange={(e) => setHotel({ ...hotel, [key]: e.target.value })} {...props} />
    </label>
  );
  return (
    <>
      <Heading eyebrow="CONFIGURATION" title="Settings" desc="Configure your hotel and local workspace." />
      <div className="settings-layout">
        <nav className="settings-nav">
          {tabs.map(([k, v]) => (
            <a key={k} className={section === k ? "active" : ""} href={"#/settings" + (k === "restaurant" ? "" : "/" + k)}>
              {v}
            </a>
          ))}
        </nav>
        <Panel title={tabs.find((x) => x[0] === section)?.[1] || "Settings"} desc="Changes are stored locally on this device.">
          {section === "restaurant" && (
            <>
              <b className="form-subhead">Hotel logo <small style={{ color: "var(--muted)", fontWeight: 400 }}>(shown in the sidebar and printed on every bill)</small></b>
              <div className="logo-edit">
                <div className="thumb">
                  {hotel.logoDataUrl ? <img src={hotel.logoDataUrl} alt="Hotel logo" /> : <Image size={26} />}
                </div>
                <div className="btns">
                  <label className="btn" style={{ cursor: "pointer" }}>
                    <Image size={15} /> {hotel.logoDataUrl ? "Change logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        try {
                          setHotel({ ...hotel, logoDataUrl: await readLogo(f) });
                          notify("Logo ready — click “Save profile” to apply");
                        } catch (er) {
                          notify(errMsg(er), "error");
                        }
                      }}
                    />
                  </label>
                  {hotel.logoDataUrl && (
                    <button className="btn danger-btn" onClick={() => setHotel({ ...hotel, logoDataUrl: "" })}>
                      <Trash2 size={15} /> Remove
                    </button>
                  )}
                </div>
              </div>
              {field("Hotel name", "name")}
              {field("Phone number", "phone")}
              {field("Email address", "email", { type: "email" })}
              {field("GSTIN", "gstin")}
              <label className="field-label">
                Address
                <textarea value={hotel.address || ""} onChange={(e) => setHotel({ ...hotel, address: e.target.value })} />
              </label>
              {field("Receipt footer", "footer")}
              <Btn primary icon={Save} onClick={saveHotel}>Save profile</Btn>
            </>
          )}
          {section === "theme" && (
            <ThemeSection theme={theme} setTheme={setTheme} colors={colors} setColors={setColors} notify={notify} />
          )}
          {section === "tax" && (
            <>
              <label className="check-field">
                <input type="checkbox" checked={!!settings.taxEnabled} onChange={(e) => setSettings({ ...settings, taxEnabled: e.target.checked })} />{" "}
                Enable tax calculation on bills
              </label>
              <b className="form-subhead">Taxes</b>
              {taxes.map((tax, i) => (
                <div className="tax-card" key={i}>
                  <label className="field-label">
                    Tax name
                    <input value={tax.name} placeholder="e.g. CGST" onChange={(e) => setTaxes((l) => l.map((t, j) => (j === i ? { ...t, name: e.target.value } : t)))} />
                  </label>
                  <label className="field-label">
                    Rate (%)
                    <input type="number" min="0" max="100" step="0.01" value={tax.rate} onChange={(e) => setTaxes((l) => l.map((t, j) => (j === i ? { ...t, rate: e.target.value } : t)))} />
                  </label>
                  <label className="check-field">
                    <input type="checkbox" checked={tax.enabled !== false} onChange={(e) => setTaxes((l) => l.map((t, j) => (j === i ? { ...t, enabled: e.target.checked } : t)))} />{" "}
                    Active
                  </label>
                  <button className="btn danger-btn" title="Remove tax" onClick={() => setTaxes((l) => l.filter((_, j) => j !== i))}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button className="btn" onClick={() => setTaxes((l) => [...l, { name: "", rate: 0, enabled: true }])}>
                <Plus size={15} /> Add tax
              </button>
              <div className="tax-summary">
                <span>Total active tax</span>
                <span>{Math.min(100, activeRate)}%</span>
              </div>
              <label className="field-label">
                Tax mode
                <select value={settings.taxMode || "exclusive"} onChange={(e) => setSettings({ ...settings, taxMode: e.target.value })}>
                  <option value="exclusive">Tax exclusive (added on top of the price)</option>
                  <option value="inclusive">Tax inclusive (already in the price)</option>
                </select>
              </label>
              <label className="field-label">
                Service charge (%)
                <input type="number" min="0" max="100" value={settings.serviceChargeRate ?? 0} onChange={(e) => setSettings({ ...settings, serviceChargeRate: e.target.value })} />
              </label>
              <label className="field-label">
                Bill prefix
                <input value={settings.billPrefix || ""} onChange={(e) => setSettings({ ...settings, billPrefix: e.target.value })} />
              </label>
              <label className="field-label">
                Receipt paper size
                <select value={settings.receiptSize || "80mm"} onChange={(e) => setSettings({ ...settings, receiptSize: e.target.value })}>
                  {["58mm", "80mm", "A4"].map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <p className="warning-note">Tax rates are not hardcoded. Configure them according to your business’s actual tax treatment.</p>
              <Btn primary icon={Save} onClick={saveTax}>Save billing settings</Btn>
            </>
          )}
          {section === "printer" && (
            <>
              <p className="settings-intro">Connect two printers once. Kitchen orders go to the KOT printer; customer bills go to the payment printer.</p>
              {!printers?.length && !loadingPrinters && <Empty title="Printer list not loaded" desc="Refresh printers after connecting the printer and installing its Windows driver." />}
              {loadingPrinters && <p>Searching for installed printers…</p>}
              {[{role:"kitchen",title:"Kitchen printer",desc:"Order tickets · KOT · No prices"},{role:"payment",title:"Payment printer",desc:"Customer bill · Tax · Payment details"}].map(cfg => {
                const key = cfg.role === "kitchen" ? "kitchenPrinterName" : "paymentPrinterName";
                return <div className="printer-config" key={cfg.role}><div className="printer-config-head"><span className="printer-icon"><Printer size={20}/></span><div><b>{cfg.title}</b><small>{cfg.desc}</small></div><em className={settings[key] ? "connected" : "not-connected"}>{settings[key] ? "Connected" : "Not connected"}</em></div><label className="field-label">Select device<select value={settings[key] || ""} onChange={e=>choosePrinter(cfg.role,e.target.value)}><option value="">Use system print dialog</option>{(printers || []).map(pr=><option key={pr.name} value={pr.name}>{pr.displayName || pr.name}{pr.isDefault ? " (Default)" : ""}</option>)}</select></label><div className="printer-config-foot"><small>{settings[key] || "No printer selected"}</small>{settings[key] && <button className="text-btn danger" onClick={()=>choosePrinter(cfg.role,"")}>Disconnect</button>}</div></div>;
              })}
              <div className="settings-inline-actions"><Btn icon={RefreshCw} onClick={refreshPrinters}>Refresh printer list</Btn><label className="field-label">Receipt paper size<select value={settings.receiptSize || "80mm"} onChange={e=>setSettings({...settings,receiptSize:e.target.value})}>{["58mm","80mm","A4"].map(x=><option key={x}>{x}</option>)}</select></label><Btn primary icon={Save} onClick={async()=>{if(await save("settings",settings))notify("Printer settings saved")}}>Save printer settings</Btn></div>
              <p className="warning-note">Tip: Select a printer for each role. If left blank, Windows print dialog will open. Use separate physical printers for kitchen and customer receipts.</p>
            </>
          )}
          {section === "storage" && (
            <>
              <div className="storage-box">
                <FolderOpen />
                <div>
                  <small>ACTIVE DATA DIRECTORY</small>
                  <b>{s.dataDirectory || "Browser preview"}</b>
                </div>
              </div>
              <Btn icon={RefreshCw} onClick={async () => { try { setInfo(await window.hotelApp?.storageInfo()); } catch (e) { notify(errMsg(e), "error"); } }}>
                Refresh storage info
              </Btn>
              <Btn
                icon={FolderOpen}
                onClick={async () => {
                  try {
                    const d = await window.hotelApp?.changeFolder();
                    if (d) location.reload();
                  } catch (e) {
                    notify(errMsg(e), "error");
                  }
                }}
              >
                Change data folder
              </Btn>
              <Btn icon={Trash2} onClick={openFiles}>Manage / delete files</Btn>
              {info && (
                <div className="storage-stats">
                  <span>Size <b>{(info.sizeBytes / 1024).toFixed(1)} KB</b></span>
                  <span>Bills <b>{info.bills}</b></span>
                  <span>Business dates <b>{info.dailyFiles}</b></span>
                </div>
              )}
              <p className="warning-note">Keep a backup on a separate drive. The app remembers your data folder, so you only choose it once.</p>
            </>
          )}
          {section === "backup" && (
            <>
              <div className="backup-row">
                <Archive />
                <span><b>Create a backup</b><small>Save all settings, menu, orders and bill history to a JSON file.</small></span>
                <Btn primary onClick={backup}>Create backup</Btn>
              </div>
              <div className="backup-row">
                <RefreshCw />
                <span><b>Restore from backup</b><small>Replace current data with a validated JSON backup.</small></span>
                <Btn onClick={restore}>Choose backup</Btn>
              </div>
              <p className="warning-note">Restoring replaces current data. Create a backup before continuing.</p>
            </>
          )}
        </Panel>
      </div>
      {files && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setFiles(null)}>
          <div className="modal">
            <div className="modal-head">
              <h3>Delete old files</h3>
              <button onClick={() => setFiles(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <p className="confirm-body">Protected settings, menu, active orders and today’s bills are not listed.</p>
            <div className="file-pick">
              {files.map((f) => (
                <label key={f.path}>
                  <input type="checkbox" checked={!!picked[f.path]} onChange={(e) => setPicked({ ...picked, [f.path]: e.target.checked })} />
                  {f.path}
                  <small>{Math.max(1, Math.ceil(f.sizeBytes / 1024))} KB</small>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <Btn onClick={() => setFiles(null)}>Cancel</Btn>
              <button className="primary" onClick={deleteFiles}>Delete selected</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
