# Optimize Hotel Management — Offline Hotel Management & Billing

Windows desktop starter for restaurant table management, menu/variant editing, billing, reports, receipt printing, local JSON storage, and backup/restore. Built with React, Vite, Tailwind CSS, Recharts, Lucide, and Electron.

## Requirements
- Windows 10/11
- Node.js 20+

## Install and run
```bash
npm install
npm run dev
```
The Vite preview is for UI development only and does not have local JSON persistence. For the Electron desktop application:
```bash
npm run electron:dev
```
On first launch, select a data folder. The app creates `settings`, `menu`, `tables`, `orders`, `bills`, `backups`, `exports`, and `assets` directories.

## Build a Windows installer
```bash
npm run build
npm run electron:build
```
The installer is output to `release/`.

## Current storage structure
```text
HotelData/
  settings/hotel.json
  settings/app-settings.json
  menu/dishes.json
  menu/categories.json
  tables/tables.json
  orders/active-orders.json
  bills/all-bills.json
  backups/
  exports/
  assets/
```

## Backup and restore
Use **Settings → Backup & restore** to create or restore a JSON snapshot. Keep backups on a separate drive.

## Production readiness notes
This is a functional project starter, not a certified accounting or GST product. Before using it for live financial operations, test all billing and tax paths with real business requirements. Remaining work includes per-business-date bill files, GST invoice/CGST/SGST/IGST treatment, refund/void workflows, robust storage migration/deletion, deeper schema validation, automated tests, printer discovery/selection, and a fully offline bundled font/CSP setup. The current storage implementation stores bills in `bills/all-bills.json`. No authentication is included; anyone with access to the Windows desktop session can access management screens.

## v1.1 notes
- No File/Edit/View/Window/Help menu bar; the app uses the hotel icon (`build/hotel.png`, `build/hotel.ico`).
- The data folder is chosen once and remembered (`workspace.json` in the app's user-data folder).
- Settings → Receipt & printer: pick the connected printer; every *Print receipt* click then prints silently to it.
- Settings → Tax & billing: add as many taxes as needed (CGST, SGST, cess…), each with its own rate and on/off switch.
- Settings → Hotel profile: upload a logo; it appears in the sidebar and on every printed bill.

## POS-style UI update

The app now includes a restaurant floor-plan view inspired by common POS table screens, plus a separate Kitchen / KOT display route. Menu rows include local stylized dish thumbnails that work without an internet connection.

### Source structure

- `src/App.jsx` — application shell, state, persistence and route registration
- `src/pages/FloorPlan.jsx` — floor-plan / table view
- `src/pages/KitchenDisplay.jsx` — kitchen order ticket display
- `src/components/FoodThumb.jsx` — offline-safe dish thumbnail component
- `src/styles.css` — shared styling and POS floor/KOT styles

### Routes

- `#/dashboard`
- `#/tables`
- `#/kitchen`
- `#/billing/:tableId`
- `#/menu`
- `#/categories`
- `#/bills`
- `#/reports`
- `#/settings`

### Development

```bash
npm install
npm run dev
```

Electron development:

```bash
npm run electron:dev
```

Build Windows installer:

```bash
npm run electron:build
```

The floor plan and KOT UI are a POS-inspired implementation, not a copy of Petpooja's proprietary code or branding. The KOT Print button is currently a UI action placeholder; connect it to the existing Electron printer bridge before using it for real kitchen printing.
