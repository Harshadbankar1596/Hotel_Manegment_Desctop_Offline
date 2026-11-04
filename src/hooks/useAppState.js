import { useEffect, useRef, useState } from "react";
import { emptyState } from "../constants/initialState.js";
import { errMsg, uid } from "../utils/format.js";
import { isTakeawayId } from "../utils/orders.js";
import { applyTheme, sanitize } from "../utils/theme.js";

/* All app-wide state and the handlers that change it (data, theme, toast, fullscreen, billing). */
export default function useAppState() {
  const [s, setS] = useState(emptyState),
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
  return {
    s,
    ready,
    toast,
    setToast,
    loadError,
    setup,
    setSetup,
    retrying,
    setRetrying,
    now,
    query,
    setQuery,
    theme,
    setTheme,
    colors,
    setColors,
    fullscreen,
    toggleFullscreen,
    notify,
    reload,
    save,
    choose,
    persistOrder,
    finish,
  };
}
