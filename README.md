# Optimize Hotel Management — Offline Hotel Management & Billing

Windows desktop and Android starter for restaurant table management, menu/variant editing, billing, reports, receipt printing, local JSON storage, and backup/restore.

Built with React, Vite, Tailwind CSS, Recharts, Lucide, Electron, and Capacitor.

## Requirements

- Windows 10/11
- Node.js 20+
- npm
- Android Studio (for Android APK builds)
- Java JDK 21 (for Android Gradle builds)

## Install Dependencies

```bash
npm install
```

## 1. React Web Application

Start React development server:

```bash
npm run dev
```

Build React production files:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

**Note:** Vite preview is for UI testing only. It does not provide Electron local JSON persistence.

## 2. Electron Desktop Application

Run Electron in development mode:

```bash
npm run electron:dev
```

Build Windows installer:

```bash
npm run build
npm run electron:build
```

The Windows installer is generated inside:

```text
release/
```

On first launch, select a data folder. The app creates the following directories:

- settings
- menu
- tables
- orders
- bills
- backups
- exports
- assets

## 3. Capacitor Android Application

Capacitor allows the existing React application to run as an Android application.

### Initial Capacitor Setup

Install Capacitor:

```bash
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
```

Initialize Capacitor:

```bash
npx cap init
```

Example configuration:

```text
App Name: Optimize Hotel Management
App ID: com.hotelmanagement.app
Web Directory: dist
```

Add Android platform:

```bash
npx cap add android
```

### Run Android Application

Build React application:

```bash
npm run build
```

Sync React files with Android:

```bash
npx cap sync android
```

Open Android Studio:

```bash
npx cap open android
```

Run the application using Android Studio or a connected Android device.

### Build Android APK

**Debug APK:**

```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

**Release APK:**

```bash
cd android
.\gradlew.bat assembleRelease
```

Release APK output:

```text
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

For production distribution, configure Android signing and generate a signed APK or AAB.

### Capacitor Development Workflow

Whenever React source code changes:

```bash
npm run build
npx cap sync android
```

Then rebuild or run the Android application from Android Studio.

## 4. All Important Commands

| Purpose | Command |
|---|---|
| Install dependencies | `npm install` |
| React development | `npm run dev` |
| React production build | `npm run build` |
| React preview | `npm run preview` |
| Electron development | `npm run electron:dev` |
| Electron installer | `npm run electron:build` |
| Capacitor sync | `npx cap sync android` |
| Open Android Studio | `npx cap open android` |
| Android debug APK | `cd android && .\gradlew.bat assembleDebug` |
| Android release APK | `cd android && .\gradlew.bat assembleRelease` |

**Important:** Run Android commands from the project root unless the command explicitly changes into the `android` directory.

## Current Storage Structure

```text
HotelData/
  settings/
    hotel.json
    app-settings.json
  menu/
    dishes.json
    categories.json
  tables/
    tables.json
  orders/
    active-orders.json
  bills/
    all-bills.json
  backups/
  exports/
  assets/
```

## Backup and Restore

Use **Settings → Backup & Restore** to create or restore a JSON snapshot.

Keep backups on a separate drive.

## Production Readiness Notes

This is a functional project starter, not a certified accounting or GST product.

Before using it for live financial operations, test all billing and tax paths with real business requirements.

Remaining work includes:

- Per-business-date bill files.
- GST invoice/CGST/SGST/IGST treatment.
- Refund/void workflows.
- Robust storage migration/deletion.
- Deeper schema validation.
- Automated tests.
- Printer discovery/selection.
- Fully offline bundled font/CSP setup.

The current storage implementation stores bills in `bills/all-bills.json`.

No authentication is included; anyone with access to the Windows desktop session can access management screens.

## v1.1 Notes

- No File/Edit/View/Window/Help menu bar.
- Uses hotel icon (`build/hotel.png`, `build/hotel.ico`).
- Data folder is chosen once and remembered (`workspace.json` in the app's user-data folder).
- Settings → Receipt & Printer: select the connected printer. Every Print Receipt click then prints silently to it.
- Settings → Tax & Billing: add multiple taxes (CGST, SGST, cess, etc.), each with its own rate and on/off switch.
- Settings → Hotel Profile: upload a logo; it appears in the sidebar and on every printed bill.

## POS-Style UI Update

The application includes:

- Restaurant floor-plan view inspired by common POS table screens.
- Separate Kitchen / KOT display route.
- Local stylized dish thumbnails that work without an internet connection.

## Source Structure

```text
src/
  App.jsx
  pages/
    FloorPlan.jsx
    KitchenDisplay.jsx
  components/
    FoodThumb.jsx
  styles.css
```

- `src/App.jsx` — Application shell, state, persistence and route registration.
- `src/pages/FloorPlan.jsx` — Floor-plan / table view.
- `src/pages/KitchenDisplay.jsx` — Kitchen order ticket display.
- `src/components/FoodThumb.jsx` — Offline-safe dish thumbnail component.
- `src/styles.css` — Shared styling and POS floor/KOT styles.

## Routes

```text
#/dashboard
#/tables
#/kitchen
#/billing/:tableId
#/menu
#/categories
#/bills
#/reports
#/settings
```

## Important Notes

- Electron provides desktop-specific functionality and local JSON persistence.
- Capacitor packages the React web build into an Android application.
- Electron-specific APIs such as local JSON storage, printer bridges and filesystem operations do not automatically work in Android.
- Android requires separate native integrations for filesystem access, printing and other device features.
- The KOT Print button is currently a UI action placeholder; connect it to the existing Electron printer bridge before using it for real kitchen printing.
- The floor plan and KOT UI are POS-inspired implementations, not copies of Petpooja's proprietary code or branding.

## Platform Build Summary

| Platform | Development | Production |
|---|---|---|
| React Web | `npm run dev` | `npm run build` |
| Electron Windows | `npm run electron:dev` | `npm run electron:build` |
| Android | Android Studio / Capacitor | `assembleDebug` / `assembleRelease` |
