import { useEffect, useMemo, useRef, useState } from "react";
import {
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
  Bell,
  BookOpen,
  Check,
  ChevronDown,
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
  ShieldCheck,
  Store,
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
  Pencil,
  Smartphone,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react";
import FloorPlan from "./pages/FloorPlan.jsx";
import KitchenDisplay from "./pages/KitchenDisplay.jsx";
import FoodThumb from "./components/FoodThumb.jsx";
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
const csvCell = (v) => {
  const t = String(v ?? "");
  return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
const groups = [
  [
    "OPERATIONS",
    [
      ["/dashboard", "Dashboard", LayoutDashboard],
      ["/tables", "Table View", Table2],
      ["/kitchen", "Kitchen / KOT", ChefHat],
      ["/bills", "Bills", Receipt],
    ],
  ],
  [
    "MANAGE",
    [
      ["/menu", "Menu & Dishes", Utensils],
      ["/categories", "Categories", Tags],
      ["/reports", "Reports", BarChart3],
    ],
  ],
  [
    "SYSTEM",
    [
      ["/settings", "Settings", Settings],
      ["/settings/backup", "Data & Backups", Archive],
    ],
  ],
];
const links = groups.flatMap((g) => g[1]);

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
    [now, setNow] = useState(() => new Date()),
    [query, setQuery] = useState(""),
    [theme, setTheme] = useState(
      () => localStorage.getItem("hotel-theme") || "light",
    );
  const nav = useNavigate();
  const loc = useLocation();
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
      if (manual === true) notify("Data refreshed");
    } catch (e) {
      notify(errMsg(e), "error");
    }
    setReady(true);
  };
  useEffect(() => {
    reload();
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("hotel-theme", theme);
  }, [theme]);
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
      const d = await window.hotelApp?.chooseFolder();
      if (d) {
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
    await save("orders", orders);
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
        tableName: s.tables.find((t) => t.id === p.tableId)?.name || "Takeaway",
        items: o.items.map((i) => ({
          ...i,
          lineTotalPaise: i.unitPricePaise * i.quantity,
        })),
        subtotalPaise,
        discountPaise,
        taxPaise,
        grandTotalPaise: net + taxPaise,
        paymentMethod: p.paymentMethod,
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
  if (window.hotelApp && !s.dataDirectory)
    return (
      <div className="setup">
        <div className="setup-card">
          <div className="logo">
            <Hotel />{" "}
            <b>
              Grand<span>Stay</span>
            </b>
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
  const todayCount = s.bills.filter((b) => billDay(b) === dayKey()).length;
  const current = links.find(
    (x) => loc.pathname === x[0] || (x[0] !== "/settings" && loc.pathname.startsWith(x[0] + "/")),
  ) || (loc.pathname.startsWith("/billing") ? ["", "Billing"] : loc.pathname.startsWith("/settings") ? ["", "Settings"] : ["", "Dashboard"]);
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">
            {s.hotel.logoDataUrl ? (
              <img src={s.hotel.logoDataUrl} alt="Hotel logo" />
            ) : (
              <Hotel size={22} />
            )}
          </div>
          <b>
            {s.hotel.name || "Optimize"}
            <small>HOTEL MANAGEMENT</small>
          </b>
        </div>
        <div className="venue">
          <Store size={17} />
          <div>
            <b>{s.hotel.name || "Your Hotel"}</b>
            <small>{s.tables.filter((t) => t.enabled !== false).length} tables · local workspace</small>
          </div>
        </div>
        {groups.map(([caption, items]) => (
          <div key={caption}>
            <label className="nav-caption">{caption}</label>
            <nav>
              {items.map(([to, label, Icon]) => (
                <NavLink
                  to={to}
                  key={to}
                  end={to === "/settings" || to === "/dashboard"}
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  <Icon size={18} />
                  {label}
                  {to === "/bills" && todayCount > 0 && <span>{todayCount}</span>}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
        <div className="side-bottom">
          <p>
            <i /> Offline-ready mode
          </p>
          <div>
            <ShieldCheck size={17} />
            <span>
              <b>Local by design</b>
              <small>Your data stays on this device</small>
            </span>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="crumb">
            Workspace <b>/</b> <strong>{current[1]}</strong>
          </div>
          <div className="header-actions">
            {loc.pathname !== "/dashboard" && loc.pathname !== "/" && (
              <button
                className="icon-btn"
                title="Go back"
                onClick={() => (window.history.length > 1 ? nav(-1) : nav("/dashboard"))}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="clock">
              <b>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</b>
              <small>
                {now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
              </small>
            </div>
            <button
              className="icon-btn"
              title={theme === "light" ? "Dark theme" : "Light theme"}
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button className="icon-btn" title="Refresh data" onClick={() => reload(true)}>
              <RefreshCw size={16} />
            </button>
            <button
              className="icon-btn"
              title="Pending bills"
              onClick={() => (pendingCount ? nav("/bills") : notify("No pending bills — you are all caught up"))}
            >
              <Bell size={16} />
              {pendingCount > 0 && <em>{pendingCount}</em>}
            </button>
            <span className="avatar">{(s.hotel.name || "GS").slice(0, 2).toUpperCase()}</span>
          </div>
        </header>
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard s={s} nav={nav} />} />
            <Route path="/dashboard" element={<Dashboard s={s} nav={nav} />} />
            <Route path="/tables" element={<FloorPlan s={s} save={save} nav={nav} notify={notify} />} />
            <Route path="/kitchen" element={<KitchenDisplay s={s} nav={nav} notify={notify} />} />
            <Route
              path="/billing/:tableId"
              element={<BillingRoute s={s} persist={persistOrder} finish={finish} nav={nav} notify={notify} />}
            />
            <Route path="/menu" element={<Menu s={s} save={save} notify={notify} />} />
            <Route path="/categories" element={<Categories s={s} save={save} notify={notify} />} />
            <Route path="/bills" element={<Bills s={s} query={query} setQuery={setQuery} nav={nav} notify={notify} />} />
            <Route
              path="/bills/:billId"
              element={<BillDetail s={s} notify={notify} reload={reload} />}
            />
            <Route path="/reports" element={<Reports s={s} />} />
            <Route path="/settings" element={<SettingsPage s={s} save={save} notify={notify} />} />
            <Route path="/settings/:section" element={<SettingsPage s={s} save={save} notify={notify} />} />
            <Route path="*" element={<Dashboard s={s} nav={nav} />} />
          </Routes>
        </div>
        <footer>
          © {new Date().getFullYear()} Optimize Hotel Management{" "}
          <span>
            <ShieldCheck size={13} /> Your data stays on this device
          </span>
          <span>Version 1.1.0</span>
        </footer>
      </main>
      <DialogHost />
      {toast && (
        <div className={"toast " + toast.type} role="status">
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
        <small>{eyebrow}</small>
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
  const month = s.bills
    .filter(
      (b) =>
        billDay(b).slice(0, 7) === today.slice(0, 7) &&
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
        .filter((b) => billDay(b) === key && b.status === "Paid")
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
          note={`${bills.length} bill${bills.length === 1 ? "" : "s"} generated today`}
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
                  stroke="#edf0f3"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#858b97" }}
                />
                <Tooltip
                  formatter={(v) => [
                    "₹" + Number(v).toLocaleString("en-IN"),
                    "Revenue",
                  ]}
                />
                <Bar dataKey="revenue" fill="#7f1d2d" radius={[4, 4, 0, 0]} />
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
function Tables({ s, save, nav, notify }) {
  const [filter, setFilter] = useState("All");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const tables = s.tables.filter((t) => t.enabled !== false);
  const status = (t) =>
    s.orders[t.id]?.items?.length ? "Occupied" : "Available";
  const takeaway = s.orders.takeaway;
  const nameTaken = (n, exceptId) =>
    s.tables.some(
      (t) =>
        t.id !== exceptId &&
        t.enabled !== false &&
        t.name.trim().toLowerCase() === n.trim().toLowerCase(),
    );
  const add = async () => {
    const n = name.trim();
    if (!n) return notify("Enter a table name", "error");
    if (nameTaken(n)) return notify("A table named “" + n + "” already exists", "error");
    const ok = await save("tables", [
      ...s.tables,
      { id: "table-" + uid(), name: n, enabled: true, order: s.tables.length + 1 },
    ]);
    if (ok) {
      notify("Table added");
      setName("");
      setAdding(false);
    }
  };
  const rename = async (t) => {
    const n = await ask({
      title: "Rename table",
      input: { label: "Table name", value: t.name },
      confirmLabel: "Save name",
    });
    if (n == null || n === t.name) return;
    if (nameTaken(n, t.id)) return notify("A table named “" + n + "” already exists", "error");
    if (await save("tables", s.tables.map((x) => (x.id === t.id ? { ...x, name: n } : x))))
      notify("Table renamed");
  };
  const remove = async (t) => {
    const busy = s.orders[t.id]?.items?.length;
    if (busy)
      return notify(
        t.name + " has an open order. Settle or clear the order before deleting the table.",
        "error",
      );
    const yes = await ask({
      title: "Delete " + t.name + "?",
      message: "The table will be removed from your floor. Past bills keep their table name.",
      confirmLabel: "Delete table",
      danger: true,
    });
    if (!yes) return;
    if (await save("tables", s.tables.filter((x) => x.id !== t.id))) notify("Table deleted");
  };
  return (
    <>
      <Heading
        eyebrow="OPERATIONS"
        title="Tables & orders"
        desc="Keep every table moving, from the first order to the final bill."
        action={
          <>
            <Btn icon={ShoppingBag} onClick={() => nav("/billing/takeaway")}>
              {takeaway?.items?.length ? "Continue takeaway" : "New takeaway"}
            </Btn>
            <Btn primary icon={Plus} onClick={() => setAdding(!adding)}>
              Add table
            </Btn>
          </>
        }
      />
      {adding && (
        <div className="panel add-row">
          <input
            autoFocus
            placeholder="Table name e.g. Patio 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Btn primary onClick={add}>
            Save table
          </Btn>
          <Btn onClick={() => setAdding(false)}>Cancel</Btn>
        </div>
      )}
      <div className="tabs">
        {["All", "Available", "Occupied"].map((x) => (
          <button key={x} className={filter === x ? "selected" : ""} onClick={() => setFilter(x)}>
            {x}{" "}
            <span>
              {x === "All" ? tables.length : tables.filter((t) => status(t) === x).length}
            </span>
          </button>
        ))}
        <div className="legend">
          <span><i /> Available</span>
          <span><i className="o" /> Occupied</span>
        </div>
      </div>
      {!tables.length && (
        <Empty title="No tables yet" desc="Use “Add table” to create your first table." />
      )}
      <div className="table-grid">
        {tables
          .filter((t) => filter === "All" || status(t) === filter)
          .map((t) => {
            const o = s.orders[t.id];
            const amount = (o?.items || []).reduce((a, i) => a + i.unitPricePaise * i.quantity, 0);
            const busy = !!o?.items?.length;
            return (
              <div className={"table-card " + status(t).toLowerCase()} key={t.id}>
                <div className="table-card-top">
                  <Table2 size={19} />
                  <span className={"status " + status(t).toLowerCase()}>{status(t)}</span>
                </div>
                <h3>{t.name}</h3>
                {busy ? (
                  <>
                    <p>
                      {o.items.reduce((a, i) => a + i.quantity, 0)} items · Started {fmtTime(o.startedAt)}
                      {elapsed(o.startedAt) ? " · " + elapsed(o.startedAt) : ""}
                    </p>
                    <strong className="table-total">{money(amount)}</strong>
                  </>
                ) : (
                  <p>Ready for your next guests</p>
                )}
                <Btn primary={busy} icon={busy ? Receipt : Plus} onClick={() => nav("/billing/" + t.id)}>
                  {busy ? "Continue order" : "Start order"} →
                </Btn>
                <div className="table-tools">
                  <button onClick={() => rename(t)}>
                    <Pencil size={13} /> Rename
                  </button>
                  <button className="del" onClick={() => remove(t)}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
function BillingRoute(props) {
  const { tableId } = useParams();
  return <Billing key={tableId} tableId={tableId} {...props} />;
}
function Billing({ tableId, s, persist, finish, nav, notify }) {
  const table = s.tables.find((t) => t.id === tableId);
  const isTakeaway = tableId === "takeaway";
  const fresh = () => ({ items: [], notes: "", startedAt: new Date().toISOString() });
  const [order, setOrder] = useState(() => s.orders[tableId] || fresh());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [discount, setDiscount] = useState("0");
  const [method, setMethod] = useState("Cash");
  const [cash, setCash] = useState("");
  const [pay, setPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const dirty = useRef(false);
  const closing = useRef(false);
  const latest = useRef(order);
  latest.current = order;
  const persistRef = useRef(persist);
  persistRef.current = persist;
  const change = (fn) => {
    dirty.current = true;
    setOrder(fn);
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
  const dishes = s.dishes.filter(
    (d) =>
      d.available !== false &&
      (cat === "All" || d.category === cat) &&
      d.name.toLowerCase().includes(q.toLowerCase()),
  );
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
  const taxBase = inclusive ? net - tax : net;
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
    setBusy(true);
    closing.current = true;
    try {
      await persist(tableId, order); // make sure the saved order is what we bill
      const b = await finish({
        tableId,
        paymentMethod: method,
        cashReceivedPaise: cashP,
        discountPaise: discountP,
        status,
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
  const clearOrder = async () => {
    if (!order.items.length) return;
    const yes = await ask({
      title: "Clear this order?",
      message: "All dishes on this order will be removed.",
      confirmLabel: "Clear order",
      danger: true,
    });
    if (yes) change((o) => ({ ...o, items: [] }));
  };
  const itemCount = order.items.reduce((a, i) => a + i.quantity, 0);
  const methods = [
    ["Cash", Banknote],
    ["UPI", Smartphone],
    ["Card", CreditCard],
    ["Other", Wallet],
  ];
  return (
    <>
      <Heading
        eyebrow={isTakeaway ? "TAKEAWAY" : "BILLING"}
        title={table?.name || "Takeaway order"}
        desc="Select dishes, review the order, and settle the bill."
        action={<Btn onClick={() => nav("/tables")} icon={Table2}>All tables</Btn>}
      />
      <div className="billing">
        <Panel title="Menu" desc="Tap a size to add it to the order">
          <div className="search">
            <Search size={15} />
            <input placeholder="Search dishes…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="chips">
            <button className={cat === "All" ? "active" : ""} onClick={() => setCat("All")}>
              All items
            </button>
            {s.categories.map((c) => (
              <button key={c} className={cat === c ? "active" : ""} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
          {!dishes.length && <Empty title="No dishes found" desc="Try another search or category." />}
          <div className="dish-grid">
            {dishes.map((d) => (
              <div className="dish-row" key={d.id}>
                <span className={"food " + d.type}>●</span>
                <div>
                  <b>{d.name}</b>
                  <small>{d.category}</small>
                  <div className="variants">
                    {d.variants.map((v) => (
                      <button key={v.name} onClick={() => add(d, v)}>
                        {v.name} <b>{money(v.pricePaise)}</b> <Plus size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Current order" desc={`${itemCount} total items`}>
          <div className="order-list">
            {order.items.length ? (
              order.items.map((i, idx) => (
                <div className="order-item" key={i.dishId + "|" + i.variant}>
                  <div>
                    <b>{i.name}</b>
                    <small>{i.variant} · {money(i.unitPricePaise)}</small>
                  </div>
                  <div className="qty">
                    <button
                      aria-label="Decrease"
                      onClick={() =>
                        change((o) => ({
                          ...o,
                          items: o.items
                            .map((x, j) => (j === idx ? { ...x, quantity: x.quantity - 1 } : x))
                            .filter((x) => x.quantity > 0),
                        }))
                      }
                    >
                      −
                    </button>
                    {i.quantity}
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
                  <b>{money(i.unitPricePaise * i.quantity)}</b>
                  <button
                    className="remove"
                    aria-label="Remove item"
                    onClick={() => change((o) => ({ ...o, items: o.items.filter((_, j) => j !== idx) }))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <Empty title="Your order is empty" desc="Choose a dish from the menu to get started." />
            )}
          </div>
          <label className="field-label">
            Order notes
            <textarea
              value={order.notes || ""}
              onChange={(e) => change((o) => ({ ...o, notes: e.target.value }))}
              placeholder="Kitchen instructions…"
            />
          </label>
          <div className="discount-row">
            <label htmlFor="disc">Discount (₹)</label>
            <input id="disc" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="totals">
            <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
            <div><span>Discount</span><b>− {money(discountP)}</b></div>
            {taxRules.map((t, i) => (
              <div key={i}>
                <span>{t.name || "Tax"} ({Number(t.rate)}%){inclusive ? " incl." : ""}</span>
                <b>{money(Math.round((taxBase * Number(t.rate)) / 100))}</b>
              </div>
            ))}
            {service > 0 && (
              <div><span>Service charge ({s.settings.serviceChargeRate}%)</span><b>{money(service)}</b></div>
            )}
            <div className="grand"><b>Grand total</b><strong>{money(total)}</strong></div>
          </div>
          <Btn primary icon={CreditCard} onClick={() => { setErr(""); setPay(true); }}>
            Proceed to payment →
          </Btn>
          <button className="clear" onClick={clearOrder}>Clear order</button>
        </Panel>
      </div>
      {pay && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-head">
              <h3>Settle bill</h3>
              <button onClick={() => setPay(false)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="pay-total">
              <span>Amount payable</span>
              <strong>{money(total)}</strong>
            </div>
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
                  {[100, 200, 500, 2000].map((n) => (
                    <button key={n} onClick={() => setCash(String(Math.ceil(total / 100 / n) * n))}>
                      ₹{Math.ceil(total / 100 / n) * n}
                    </button>
                  ))}
                </div>
                <div className={"change-due" + (cashP < total ? " short" : "")}>
                  <span>{cashP < total ? "Still to collect" : "Change to return"}</span>
                  <span>{money(Math.abs(cashP - total))}</span>
                </div>
              </>
            )}
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
    category: s.categories[0] || "Starters",
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
            variants: d.variants.map((v) => ({
              ...v,
              price: v.pricePaise / 100,
            })),
          }
        : fresh(),
    );
    setModal(true);
  };
  const submit = async () => {
    if (
      !form.name.trim() ||
      !form.variants.length ||
      form.variants.some(
        (v) => !v.name || Number(v.price) < 0 || v.price === "",
      )
    )
      return notify("Complete dish and variant fields");
    const d = {
      ...form,
      id: edit === "new" ? "dish-" + uid() : form.id,
      variants: form.variants.map((v) => ({
        name: v.name,
        pricePaise: paise(v.price),
      })),
    };
    await save(
      "dishes",
      edit === "new"
        ? [...s.dishes, d]
        : s.dishes.map((x) => (x.id === d.id ? d : x)),
    );
    setModal(false);
    notify("Dish saved");
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
          value={s.dishes.reduce((a, d) => a + d.variants.length, 0)}
          note="Serving sizes and options"
          icon={BookOpen}
        />
      </div>
      <Panel title="Menu catalog" desc="Dish pricing and availability">
        <div className="search">
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
                .filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
                .map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="menu-dish-cell"><FoodThumb dish={d} /><span><b>{d.name}</b><small>{d.type === "veg" ? "Vegetarian" : "Non-vegetarian"}</small></span></div>
                    </td>
                    <td>{d.category}</td>
                    <td>{d.type === "veg" ? "Veg" : "Non-veg"}</td>
                    <td>
                      {d.variants.map((v) => (
                        <div key={v.name}>
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
        <div className="overlay">
          <div className="modal">
            <div className="modal-head">
              <h3>{edit === "new" ? "Add dish" : "Edit dish"}</h3>
              <button onClick={() => setModal(false)}>
                <X />
              </button>
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
  const add = async () => {
    if (!name.trim()) return;
    if (s.categories.some((c) => c.toLowerCase() === name.trim().toLowerCase()))
      return notify("Category already exists");
    await save("categories", [...s.categories, name.trim()]);
    setName("");
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
          {s.categories.map((c) => (
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
              <button
                onClick={async () => {
                  if (s.dishes.some((d) => d.category === c))
                    return notify(
                      "Move or delete dishes in this category first",
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
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
function Bills({ s, query, setQuery, nav, notify }) {
  const [status, setStatus] = useState("All"),
    [date, setDate] = useState(""),
    [tableSearch, setTableSearch] = useState("");
  const bills = [...s.bills]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter(
      (b) =>
        [b.billNumber, b.tableName, b.tableId].some((v) =>
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
  const csv = () => {
    const text = [
      "Bill,Date,Table,Subtotal,Discount,Tax,Total,Method,Status",
      ...bills.map((b) =>
        [
          b.billNumber,
          fmtDateTime(b.createdAt),
          b.tableName,
          b.subtotalPaise / 100,
          b.discountPaise / 100,
          b.taxPaise / 100,
          b.grandTotalPaise / 100,
          b.paymentMethod,
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
              placeholder="Search bill number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            placeholder="Filter table…"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {["All", "Paid", "Pending", "Refunded", "Cancelled", "Voided"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
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
              {bills.map((b) => (
                <tr key={b.id} className="click" onClick={() => nav("/bills/" + b.id)}>
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
                  <td>{b.paymentMethod}</td>
                  <td>
                    <span className={"status " + b.status?.toLowerCase()}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
function receiptHtml(s, b) {
  const w = paperWidth[s.settings.receiptSize] || paperWidth["80mm"];
  const row = (l, r, extra = "") => `<div class="r ${extra}"><span>${l}</span><b>${r}</b></div>`;
  const taxRows = b.taxBreakdown?.length
    ? b.taxBreakdown.filter((t) => t.amountPaise).map((t) => row(`${escHtml(t.name)} (${escHtml(t.rate)}%)`, money(t.amountPaise)))
    : b.taxPaise
      ? [row("Tax", money(b.taxPaise))]
      : [];
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(b.billNumber)}</title><style>
@page{margin:0}*{box-sizing:border-box}body{font:12px Arial,sans-serif;width:${w};margin:0 auto;padding:6mm 0;color:#000}
.c{text-align:center}.r{display:flex;justify-content:space-between;gap:8px;margin:5px 0}.r span{flex:1}hr{border:0;border-top:1px dashed #555;margin:8px 0}
.big{font-size:15px}h2{margin:4px 0;font-size:16px}p{margin:2px 0}img.logo{max-width:36mm;max-height:22mm;object-fit:contain;display:block;margin:0 auto 4px}
</style></head><body>
<div class="c">${s.hotel.logoDataUrl ? `<img class="logo" src="${s.hotel.logoDataUrl}">` : ""}<h2>${escHtml(s.hotel.name || "Hotel")}</h2>
<p>${escHtml(s.hotel.address || "")}</p><p>${escHtml(s.hotel.phone || "")}</p>${s.hotel.gstin ? `<p>GSTIN: ${escHtml(s.hotel.gstin)}</p>` : ""}</div><hr>
<p>Bill: <b>${escHtml(b.billNumber)}</b></p><p>Date: ${escHtml(fmtDateTime(b.createdAt))}</p><p>Table: ${escHtml(b.tableName)}</p><hr>
${(b.items || []).map((i) => row(`${escHtml(i.name)} (${escHtml(i.variant)}) × ${escHtml(i.quantity)}`, money(i.lineTotalPaise || i.unitPricePaise * i.quantity))).join("")}<hr>
${row("Subtotal", money(b.subtotalPaise))}${b.discountPaise ? row("Discount", "−" + money(b.discountPaise)) : ""}${taxRows.join("")}${b.serviceChargePaise ? row("Service charge", money(b.serviceChargePaise)) : ""}
<hr>${row("TOTAL", money(b.grandTotalPaise), "big")}<hr>
<p>Payment: ${escHtml(b.paymentMethod)} · ${escHtml(b.status)}</p>${b.cashReceivedPaise && b.status === "Paid" ? `<p>Cash: ${money(b.cashReceivedPaise)} · Change: ${money(b.changePaise || 0)}</p>` : ""}
<div class="c" style="margin-top:12px;font-weight:bold">${escHtml(s.hotel.footer || "Thank you! Visit again.")}</div></body></html>`;
}
/* Prints silently on the printer chosen in Settings; falls back to the system dialog when none is chosen. */
async function printHtml(s, html, notify) {
  try {
    if (window.hotelApp) {
      const r = await window.hotelApp.print(html, {
        printerName: s.settings.printerName || "",
        size: s.settings.receiptSize || "80mm",
        silent: !!s.settings.printerName,
      });
      if (r?.success !== false)
        notify(s.settings.printerName ? "Sent to " + s.settings.printerName : "Print dialog closed");
    } else {
      const w = window.open("", "_blank");
      if (!w) throw Error("Pop-up blocked — allow pop-ups to print");
      w.document.write(html);
      w.document.close();
      w.print();
    }
  } catch (e) {
    notify(errMsg(e), "error");
  }
}
function BillDetail({ s, notify, reload }) {
  const { billId } = useParams();
  const [method, setMethod] = useState("Cash");
  const b = s.bills.find((x) => x.id === billId);
  if (!b)
    return <Empty title="Bill not found" desc="This transaction does not exist." />;
  const settle = async () => {
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
          <Btn primary icon={Printer} onClick={() => printHtml(s, receiptHtml(s, b), notify)}>
            Print receipt
          </Btn>
        }
      />
      <div className="columns">
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
            <div><span>Discount</span><b>− {money(b.discountPaise)}</b></div>
            {taxLines.length
              ? taxLines.map((t, i) => (
                  <div key={i}><span>{t.name} ({t.rate}%)</span><b>{money(t.amountPaise)}</b></div>
                ))
              : <div><span>Tax</span><b>{money(b.taxPaise)}</b></div>}
            {b.serviceChargePaise > 0 && <div><span>Service charge</span><b>{money(b.serviceChargePaise)}</b></div>}
            <div className="grand"><b>Grand total</b><strong>{money(b.grandTotalPaise)}</strong></div>
          </div>
        </Panel>
        <Panel title="Transaction information">
          {[
            ["Payment method", b.paymentMethod],
            ["Payment status", b.status],
            ["Business date", b.businessDate || billDay(b)],
            ["Created at", fmtDateTime(b.createdAt)],
          ].map(([k, v]) => (
            <div className="meta" key={k}><span>{k}</span><b>{v}</b></div>
          ))}
          {b.status === "Pending" && window.hotelApp && (
            <div className="settle-box">
              <b>Collect payment</b>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {["Cash", "UPI", "Card", "Other"].map((x) => <option key={x}>{x}</option>)}
              </select>
              <button className="primary" onClick={settle}>Mark as paid</button>
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
      const k = billDay(b) || "unknown";
      a[k] = (a[k] || 0) + b.grandTotalPaise / 100;
      return a;
    }, {}),
  )
    .sort()
    .map(([day, revenue]) => ({ day: day?.slice(5), revenue }));
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
      <Panel title="Revenue trend" desc="Daily collected revenue">
        {days.length ? (
          <div className="chart tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days}>
                <CartesianGrid vertical={false} stroke="#edf0f3" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => "₹" + v} />
                <Bar dataKey="revenue" fill="#7f1d2d" radius={[4, 4, 0, 0]} />
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
const readLogo = (file) =>
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
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("Could not read this image"));
    };
    img.src = url;
  });
const taxList = (st) =>
  st.taxes?.length ? st.taxes : [{ name: st.taxName || "GST", rate: st.taxRate ?? 0, enabled: true }];
function SettingsPage({ s, save, notify }) {
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
  const tabs = [
    ["restaurant", "Hotel profile"],
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
  const choosePrinter = async (name) => {
    if (await save("settings", { ...s.settings, printerName: name }))
      notify(name ? "Connected to " + name : "Printer disconnected — the system print dialog will be used");
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
              <p style={{ color: "var(--muted)" }}>
                Choose the printer connected to this computer. Once connected, every <b>Print receipt</b> click prints straight to it — no dialog.
              </p>
              <div className="printer-list">
                {loadingPrinters && <p style={{ color: "var(--muted)" }}>Looking for printers…</p>}
                {!loadingPrinters && printers && !printers.length && (
                  <Empty title="No printers found" desc={window.hotelApp ? "Connect a printer, install its driver, then press Refresh." : "Printer selection is available in the desktop app."} />
                )}
                {(printers || []).map((p) => (
                  <button key={p.name} className={"printer-item" + (settings.printerName === p.name ? " active" : "")} onClick={() => choosePrinter(p.name)}>
                    <Printer size={22} />
                    <span>
                      <b>{p.displayName || p.name}</b>
                      <small>{p.isDefault ? "Windows default printer" : "Installed printer"}{p.description ? " · " + p.description : ""}</small>
                    </span>
                    {settings.printerName === p.name && <em className="pill">Connected</em>}
                  </button>
                ))}
                {settings.printerName && printers && !printers.some((p) => p.name === settings.printerName) && (
                  <div className="warning-note">Saved printer “{settings.printerName}” was not found. Check that it is switched on and connected.</div>
                )}
              </div>
              <Btn icon={RefreshCw} onClick={refreshPrinters}>Refresh printers</Btn>
              {settings.printerName && <Btn onClick={() => choosePrinter("")}>Disconnect printer</Btn>}
              <label className="field-label" style={{ marginTop: 12 }}>
                Receipt paper size
                <select
                  value={s.settings.receiptSize || "80mm"}
                  onChange={(e) => save("settings", { ...s.settings, receiptSize: e.target.value })}
                >
                  {["58mm", "80mm", "A4"].map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <div className="receipt-preview">
                {s.hotel.logoDataUrl && <img src={s.hotel.logoDataUrl} alt="" style={{ maxWidth: 80, maxHeight: 60, display: "block", margin: "0 auto 6px" }} />}
                <b>{s.hotel.name || "YOUR HOTEL"}</b>
                <p>{s.hotel.address || "Hotel address"}</p>
                <hr />
                Bill: SAMPLE-0001
                <div className="bill-items">
                  <div><span>Paneer Tikka (Half) × 1</span><b>₹150.00</b></div>
                  <div><span>Butter Roti × 2</span><b>₹50.00</b></div>
                </div>
                <hr />
                <b>TOTAL ₹200.00</b>
                <p>{s.hotel.footer}</p>
              </div>
              <Btn
                primary
                icon={Printer}
                onClick={() =>
                  printHtml(
                    s,
                    receiptHtml(s, {
                      billNumber: "TEST-0001",
                      createdAt: new Date().toISOString(),
                      tableName: "Test",
                      items: [{ name: "Test dish", variant: "Full", quantity: 1, unitPricePaise: 10000 }],
                      subtotalPaise: 10000,
                      discountPaise: 0,
                      taxPaise: 0,
                      grandTotalPaise: 10000,
                      paymentMethod: "Cash",
                      status: "Test print",
                    }),
                    notify,
                  )
                }
              >
                Test print
              </Btn>
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
        <div className="overlay">
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
