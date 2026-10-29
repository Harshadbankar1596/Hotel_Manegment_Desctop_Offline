const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
let win,
  root = null;
let queue = Promise.resolve();
app.setName("Optimize Hotel Management");
const configPath = () => path.join(app.getPath("userData"), "workspace.json");
async function persistRoot() {
  if (root) await writeAtomic(configPath(), { root });
}
const defaults = {
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
    printerName: "",
  },
  categories: [
    "Starters",
    "Main Course",
    "Breads",
    "Rice",
    "Beverages",
    "Desserts",
  ],
  dishes: [
    {
      id: "d1",
      name: "Paneer Tikka",
      category: "Starters",
      type: "veg",
      available: true,
      variants: [
        { name: "Half", pricePaise: 15000 },
        { name: "Full", pricePaise: 28000 },
      ],
    },
    {
      id: "d2",
      name: "Chicken Tikka",
      category: "Starters",
      type: "non-veg",
      available: true,
      variants: [
        { name: "Half", pricePaise: 20000 },
        { name: "Full", pricePaise: 38000 },
      ],
    },
    {
      id: "d3",
      name: "Dal Tadka",
      category: "Main Course",
      type: "veg",
      available: true,
      variants: [{ name: "Full", pricePaise: 18000 }],
    },
    {
      id: "d4",
      name: "Butter Roti",
      category: "Breads",
      type: "veg",
      available: true,
      variants: [{ name: "Piece", pricePaise: 2500 }],
    },
    {
      id: "d5",
      name: "Veg Biryani",
      category: "Rice",
      type: "veg",
      available: true,
      variants: [{ name: "Full", pricePaise: 22000 }],
    },
    {
      id: "d6",
      name: "Sweet Lassi",
      category: "Beverages",
      type: "veg",
      available: true,
      variants: [{ name: "Glass", pricePaise: 8000 }],
    },
  ],
  tables: [],
  orders: {},
  bills: [],
};
const sections = {
  hotel: ["settings", "hotel.json"],
  settings: ["settings", "app-settings.json"],
  categories: ["menu", "categories.json"],
  dishes: ["menu", "dishes.json"],
  tables: ["tables", "tables.json"],
  orders: ["orders", "active-orders.json"],
  bills: ["bills", "all-bills.json"],
};
const safe = (s) => {
  if (typeof s !== "string" || !/^[\w.-]+$/.test(s) || s.includes(".."))
    throw Error("Invalid storage path");
  return s;
};
const file = (section) => {
  if (!root || !sections[section]) throw Error("Select a data folder first");
  return path.join(root, ...sections[section].map(safe));
};
async function writeAtomic(target, data) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = target + "." + crypto.randomUUID() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, target);
}
async function readJson(target, fallback) {
  try {
    return JSON.parse(await fs.readFile(target, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    throw Error("Could not read " + path.basename(target) + ": " + e.message);
  }
}
function serialized(fn) {
  const p = queue.then(fn);
  queue = p.catch(() => {});
  return p;
}
async function init() {
  for (const d of [
    "settings",
    "menu",
    "tables",
    "orders",
    "bills",
    "backups",
    "exports",
    "assets",
  ])
    await fs.mkdir(path.join(root, d), { recursive: true });
  for (const [k, v] of Object.entries(defaults)) {
    if (k === "bills") continue;
    const f = file(k);
    try {
      await fs.access(f);
    } catch {
      let value = v;
      if (k === "tables")
        value = Array.from({ length: 12 }, (_, i) => ({
          id: "table-" + (i + 1),
          name: "Table " + (i + 1),
          enabled: true,
          order: i + 1,
        }));
      await writeAtomic(f, value);
    }
  }
  const legacy = file("bills");
  try {
    await fs.access(legacy);
  } catch {
    await writeAtomic(legacy, []);
  }
  const all = await readBillFiles();
  if (!all.length) {
    const old = JSON.parse(await fs.readFile(legacy, "utf8"));
    if (old.length) {
      for (const b of old) await appendDailyBill(b);
    }
  }
}
async function readBillFiles() {
  const dir = path.join(root, "bills");
  await fs.mkdir(dir, { recursive: true });
  const names = (await fs.readdir(dir)).filter((n) =>
    /^\d{4}-\d{2}-\d{2}\.json$/.test(n),
  );
  const out = [];
  for (const n of names) {
    try {
      const v = JSON.parse(await fs.readFile(path.join(dir, n), "utf8"));
      out.push(...(Array.isArray(v) ? v : v.bills || []));
    } catch (e) {
      console.error("Skipping unreadable bill file", n, e.message);
    }
  }
  return out.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
async function appendDailyBill(bill) {
  const key = bill.businessDate || dateKey();
  const target = path.join(root, "bills", key + ".json");
  const existing = await readJson(target, []);
  const list = Array.isArray(existing) ? existing : existing.bills || [];
  if (list.some((b) => b.id === bill.id)) return;
  list.push(bill);
  await writeAtomic(target, list);
}
async function removeDailyBill(bill) {
  const target = path.join(root, "bills", (bill.businessDate || dateKey()) + ".json");
  const existing = await readJson(target, []);
  const list = Array.isArray(existing) ? existing : existing.bills || [];
  await writeAtomic(target, list.filter((b) => b.id !== bill.id));
}
async function load() {
  const data = {};
  for (const k of Object.keys(sections)) {
    if (k === "bills") {
      data.bills = await readBillFiles();
      continue;
    }
    try {
      data[k] = JSON.parse(await fs.readFile(file(k), "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") data[k] = defaults[k];
      else
        throw Error(
          "Could not read " + path.basename(file(k)) + ": " + e.message,
        );
    }
  }
  return { ...data, dataDirectory: root };
}
function calc(order, settings, discount = 0) {
  if (!order?.items?.length) throw Error("Add at least one dish");
  const items = order.items.map((i) => {
    const q = Number(i.quantity),
      p = Number(i.unitPricePaise);
    if (
      !Number.isInteger(q) ||
      q < 1 ||
      q > 999 ||
      !Number.isSafeInteger(p) ||
      p < 0
    )
      throw Error("Invalid quantity or price");
    return { ...i, quantity: q, unitPricePaise: p, lineTotalPaise: q * p };
  });
  const subtotalPaise = items.reduce((s, i) => s + i.lineTotalPaise, 0);
  const discountPaise = Math.min(
    subtotalPaise,
    Math.max(0, Math.round(Number(discount) || 0)),
  );
  const net = subtotalPaise - discountPaise;
  const taxRules = settings.taxEnabled
    ? Array.isArray(settings.taxes) && settings.taxes.length
      ? settings.taxes.filter((t) => t.enabled !== false)
      : [
          {
            name: settings.taxName || "GST",
            rate: settings.taxRate || 0,
            enabled: true,
          },
        ]
    : [];
  const rate = Math.min(
    100,
    taxRules.reduce((sum, t) => sum + Math.max(0, Number(t.rate) || 0), 0),
  );
  let taxablePaise = net,
    taxPaise = 0;
  if (rate) {
    if (settings.taxMode === "inclusive") {
      taxablePaise = Math.round((net * 100) / (100 + rate));
      taxPaise = net - taxablePaise;
    } else taxPaise = Math.round((net * rate) / 100);
  }
  const taxBreakdown = taxRules.map((t) => ({
    name: String(t.name || "Tax"),
    rate: Math.max(0, Number(t.rate) || 0),
    amountPaise:
      settings.taxMode === "inclusive"
        ? Math.round(
            (taxPaise * Math.max(0, Number(t.rate) || 0)) / (rate || 1),
          )
        : Math.round((taxablePaise * Math.max(0, Number(t.rate) || 0)) / 100),
  }));
  const serviceChargePaise = Math.round(
    (net *
      Math.max(0, Math.min(100, Number(settings.serviceChargeRate) || 0))) /
      100,
  );
  return {
    items,
    subtotalPaise,
    discountPaise,
    taxablePaise,
    taxPaise,
    taxRate: rate,
    taxBreakdown,
    serviceChargePaise,
    grandTotalPaise:
      net +
      (settings.taxMode === "inclusive" ? 0 : taxPaise) +
      serviceChargePaise,
  };
}
function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#f6f1ea",
    title: "Optimize Hotel Management",
    icon: path.join(__dirname, "../build/hotel.png"),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.removeMenu();
  win.setMenuBarVisibility(false);
  win.once("ready-to-show", () => win.show());
  win.on("page-title-updated", (e) => e.preventDefault());
  win.webContents.on("render-process-gone", (_e, d) =>
    dialog.showErrorBox("Optimize", "The window crashed (" + d.reason + "). Please reopen the app."),
  );
  if (process.env.ELECTRON_START_URL)
    win.loadURL(process.env.ELECTRON_START_URL);
  else win.loadFile(path.join(__dirname, "../dist/index.html"));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
}
process.on("uncaughtException", (e) => console.error("Uncaught:", e));
process.on("unhandledRejection", (e) => console.error("Unhandled:", e));
if (app.requestSingleInstanceLock && !app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  ipcMain.handle("folder:choose", async () => {
    const r = await dialog.showOpenDialog(win, {
      properties: ["openDirectory", "createDirectory"],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    const previous = root;
    root = path.resolve(r.filePaths[0]);
    try {
      await init();
      await persistRoot();
      return await load();
    } catch (e) {
      root = previous;
      throw e;
    }
  });
  ipcMain.handle("data:load", async () => {
    if (!root) {
      try {
        const saved = JSON.parse(await fs.readFile(configPath(), "utf8"));
        if (saved.root) {
          root = path.resolve(saved.root);
          await fs.access(root);
          await init();
        }
      } catch {
        root = null;
      }
    }
    return root ? load() : null;
  });
  ipcMain.handle("folder:change", async () => {
    const r = await dialog.showOpenDialog(win, {
      properties: ["openDirectory", "createDirectory"],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    const previous = root;
    root = path.resolve(r.filePaths[0]);
    try {
      await init();
      await persistRoot();
      return await load();
    } catch (e) {
      root = previous;
      throw e;
    }
  });
  ipcMain.handle("data:save", (_, section, value) =>
    serialized(async () => {
      if (!sections[section]) throw Error("Unsupported data section");
      if (section === "bills") {
        if (!Array.isArray(value)) throw Error("Invalid bills data");
        const existing = await readBillFiles();
        const ids = new Set(existing.map((b) => b.id));
        for (const b of value) {
          if (!ids.has(b.id)) {
            await appendDailyBill(b);
            ids.add(b.id);
          }
        }
        await writeAtomic(path.join(root, "bills", "index.json"), {
          updatedAt: new Date().toISOString(),
          count: ids.size,
        });
        return { success: true };
      }
      await writeAtomic(file(section), value);
      return { success: true };
    }),
  );
  ipcMain.handle("bill:finalize", (_, p) =>
    serialized(async () => {
      if (!p || typeof p.tableId !== "string")
        throw Error("Invalid bill request");
      const s = await load();
      const order = s.orders[p.tableId];
      if (!order?.items?.length)
        throw Error("This order is empty or was already billed");
      const totals = calc(order, s.settings, p.discountPaise);
      const now = new Date();
      const bill = {
        id: crypto.randomUUID(),
        billNumber:
          (s.settings.billPrefix || "BILL-") +
          String(s.settings.nextBillNumber || 1).padStart(4, "0"),
        tableId: p.tableId,
        tableName: s.tables.find((t) => t.id === p.tableId)?.name || "Takeaway",
        orderType: p.tableId === "takeaway" ? "Takeaway" : "Dine-in",
        notes: typeof order.notes === "string" ? order.notes.slice(0, 500) : "",
        ...totals,
        paymentMethod: ["Cash", "UPI", "Card", "Other"].includes(p.paymentMethod)
          ? p.paymentMethod
          : "Cash",
        cashReceivedPaise: Math.max(0, Math.round(Number(p.cashReceivedPaise) || 0)),
        status: p.status === "Pending" ? "Pending" : "Paid",
        createdAt: now.toISOString(),
        businessDate: dateKey(now),
      };
      if (
        bill.paymentMethod === "Cash" &&
        bill.status === "Paid" &&
        bill.cashReceivedPaise < bill.grandTotalPaise
      )
        throw Error("Cash received is less than the bill total");
      if (bill.paymentMethod === "Cash" && bill.status === "Paid")
        bill.changePaise = bill.cashReceivedPaise - bill.grandTotalPaise;
      const orders = { ...s.orders };
      delete orders[p.tableId];
      const settings = {
        ...s.settings,
        nextBillNumber: Number(s.settings.nextBillNumber || 1) + 1,
      };
      await appendDailyBill(bill);
      try {
        await writeAtomic(file("orders"), orders);
        await writeAtomic(file("settings"), settings);
      } catch (e) {
        // roll back so the bill is not half-saved
        await removeDailyBill(bill).catch(() => {});
        await writeAtomic(file("orders"), s.orders).catch(() => {});
        throw Error("Could not save the bill: " + e.message);
      }
      await writeAtomic(path.join(root, "bills", "index.json"), {
        updatedAt: new Date().toISOString(),
        count: s.bills.length + 1,
      }).catch(() => {});
      return {
        bill,
        state: { ...s, bills: [...s.bills, bill], orders, settings },
      };
    }),
  );
  ipcMain.handle("printers:list", async () => {
    if (!win) return [];
    const list = await win.webContents.getPrintersAsync();
    return list.map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      description: p.description || "",
      isDefault: !!p.isDefault,
    }));
  });
  ipcMain.handle("receipt:print", async (_, html, opts = {}) => {
    if (typeof html !== "string" || html.length > 5000000)
      throw Error("Invalid receipt");
    const name = typeof opts?.printerName === "string" ? opts.printerName : "";
    if (name) {
      const known = await win.webContents.getPrintersAsync();
      if (!known.some((p) => p.name === name))
        throw Error(
          'Printer "' + name + '" is not available. Check that it is switched on and connected, or choose another printer in Settings.',
        );
    }
    const size = opts?.size;
    const pageSize =
      size === "A4"
        ? "A4"
        : { width: size === "58mm" ? 58000 : 80000, height: 297000 };
    const w = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    try {
      await w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    } catch (e) {
      w.close();
      throw Error("Could not prepare the receipt: " + e.message);
    }
    return new Promise((resolve, reject) =>
      w.webContents.print(
        {
          silent: !!name && opts?.silent !== false,
          deviceName: name || undefined,
          printBackground: true,
          margins: { marginType: "none" },
          pageSize,
        },
        (ok, reason) => {
          w.close();
          // pressing Cancel in the system dialog is not an error
          if (ok || reason === "cancelled") resolve({ success: ok });
          else reject(Error("Printing failed: " + (reason || "unknown error")));
        },
      ),
    );
  });
  ipcMain.handle("bill:settle", (_, id, method) =>
    serialized(async () => {
      if (typeof id !== "string") throw Error("Invalid bill");
      const all = await readBillFiles();
      const bill = all.find((b) => b.id === id);
      if (!bill) throw Error("Bill not found");
      if (bill.status !== "Pending") throw Error("This bill is not pending");
      const dir = path.join(root, "bills");
      const target = path.join(dir, (bill.businessDate || dateKey()) + ".json");
      const v = await readJson(target, []);
      const list = Array.isArray(v) ? v : v.bills || [];
      const i = list.findIndex((b) => b.id === id);
      if (i < 0) throw Error("Bill file not found");
      list[i] = {
        ...list[i],
        status: "Paid",
        paymentMethod: ["Cash", "UPI", "Card", "Other"].includes(method) ? method : list[i].paymentMethod,
        paidAt: new Date().toISOString(),
      };
      await writeAtomic(target, list);
      return { success: true };
    }),
  );
  ipcMain.handle("backup:create", async () => {
    const r = await dialog.showSaveDialog(win, {
      defaultPath: "hotel-backup-" + dateKey() + ".json",
      filters: [{ name: "JSON Backup", extensions: ["json"] }],
    });
    if (r.canceled) return null;
    await fs.writeFile(
      r.filePath,
      JSON.stringify({ version: 1, state: await load() }, null, 2),
    );
    return { success: true };
  });
  ipcMain.handle("backup:restore", async () => {
    const r = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      filters: [{ name: "JSON Backup", extensions: ["json"] }],
    });
    if (r.canceled) return null;
    if (!root) throw Error("Select a data folder first");
    let b;
    try {
      b = JSON.parse(await fs.readFile(r.filePaths[0], "utf8"));
    } catch (e) {
      throw Error("This is not a valid backup file");
    }
    if (!b || typeof b.state !== "object" || !b.state)
      throw Error("This is not a valid backup file");
    for (const k of Object.keys(sections))
      if (!(k in b.state)) throw Error("Invalid backup: missing " + k);
    if (!Array.isArray(b.state.bills)) throw Error("Invalid backup: bills");
    for (const k of Object.keys(sections)) {
      if (k === "bills") {
        for (const n of await fs.readdir(path.join(root, "bills")))
          if (/^\d{4}-\d{2}-\d{2}\.json$/.test(n))
            await fs.unlink(path.join(root, "bills", n));
        for (const bill of b.state.bills) await appendDailyBill(bill);
      } else await writeAtomic(file(k), b.state[k]);
    }
    return load();
  });
  ipcMain.handle("storage:list-files", async () => {
    const out = [];
    async function walk(dir, rel = "") {
      for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        const r = path.join(rel, e.name);
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full, r);
        else {
          const st = await fs.stat(full);
          out.push({
            path: r,
            sizeBytes: st.size,
            modifiedAt: st.mtime.toISOString(),
            protected:
              r.startsWith("orders" + path.sep) ||
              r.startsWith("settings" + path.sep) ||
              r.startsWith("menu" + path.sep) ||
              r.startsWith("tables" + path.sep) ||
              r === "bills/" + dateKey() + ".json",
          });
        }
      }
    }
    await walk(root);
    return out;
  });
  ipcMain.handle("storage:delete-files", async (_, paths) =>
    serialized(async () => {
      if (
        !Array.isArray(paths) ||
        !paths.length ||
        paths.some((x) => typeof x !== "string")
      )
        throw Error("Select files to delete");
      const current = await fs.readdir(path.join(root, "bills"));
      const protectedPaths = new Set([
        "settings/hotel.json",
        "settings/app-settings.json",
        "menu/dishes.json",
        "menu/categories.json",
        "tables/tables.json",
        "orders/active-orders.json",
        `bills/${dateKey()}.json`,
      ]);
      for (const rel of paths) {
        const normalized = rel.replaceAll("\\", "/");
        if (
          protectedPaths.has(normalized) ||
          normalized.split("/").some((x) => x === "..")
        )
          throw Error("One or more selected files are protected");
        const full = path.resolve(root, rel);
        if (!full.startsWith(root + path.sep)) throw Error("Invalid file path");
        await fs.unlink(full);
      }
      return { success: true };
    }),
  );
  ipcMain.handle("storage:info", async () => {
    const s = await load();
    let size = 0;
    async function walk(d) {
      for (const e of await fs.readdir(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) await walk(p);
        else size += (await fs.stat(p)).size;
      }
    }
    await walk(root);
    return {
      dataDirectory: root,
      sizeBytes: size,
      bills: s.bills.length,
      dailyFiles: new Set(s.bills.map((b) => b.businessDate)).size,
    };
  });
  ipcMain.handle("export:file", async (_, format, data) => {
    if (!["json", "csv"].includes(format))
      throw Error("Unsupported export format");
    const r = await dialog.showSaveDialog(win, {
      defaultPath: "hotel-export." + format,
      filters: [{ name: format.toUpperCase(), extensions: [format] }],
    });
    if (r.canceled) return null;
    await fs.writeFile(
      r.filePath,
      typeof data === "string" ? data : JSON.stringify(data, null, 2),
    );
    return { success: true };
  });
  createWindow();
  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
