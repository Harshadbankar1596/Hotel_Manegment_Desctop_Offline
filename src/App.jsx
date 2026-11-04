import { useLocation, useNavigate } from "react-router-dom";
import useAppState from "./hooks/useAppState.js";
import { useMedia } from "./hooks/useMedia.js";
import LoadingScreen from "./screens/LoadingScreen.jsx";
import LoadErrorScreen from "./screens/LoadErrorScreen.jsx";
import SetupScreen from "./screens/SetupScreen.jsx";
import TopBar from "./components/layout/TopBar.jsx";
import MobileNav from "./components/layout/MobileNav.jsx";
import Toast from "./components/layout/Toast.jsx";
import DialogHost from "./components/common/DialogHost.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";

export default function App() {
  const {
    s, ready, toast, setToast, loadError, setup, setSetup, retrying, setRetrying, now, query, setQuery,
    theme, setTheme, colors, setColors, fullscreen, toggleFullscreen, notify, reload, save, choose,
    persistOrder, finish,
  } = useAppState();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const isMobile = useMedia("(max-width: 760px)");

  if (!ready) return <LoadingScreen />;
  if (loadError && !s.dataDirectory)
    return <LoadErrorScreen loadError={loadError} retrying={retrying} setRetrying={setRetrying} reload={reload} choose={choose} />;
  if (window.hotelApp && !s.dataDirectory) return <SetupScreen setup={setup} setSetup={setSetup} choose={choose} />;

  const pendingCount = s.bills.filter((b) => b.status === "Pending").length;
  const liveOrders = Object.values(s.orders || {}).filter((o) => o?.items?.length && o.kotSent);
  const kitchenActive = liveOrders.filter((o) => o.kitchenStatus !== "Ready").length;
  const kitchenReady = liveOrders.length - kitchenActive;

  return (
    <div className={"shell" + (isMobile ? " is-mobile" : "")}>
      <TopBar
        s={s}
        nav={nav}
        pathname={pathname}
        now={now}
        kitchenActive={kitchenActive}
        kitchenReady={kitchenReady}
        pendingCount={pendingCount}
        fullscreen={fullscreen}
        toggleFullscreen={toggleFullscreen}
        theme={theme}
        setTheme={setTheme}
        reload={reload}
      />
      <main>
        <div className="content">
          <AppRoutes
            s={s}
            nav={nav}
            save={save}
            notify={notify}
            reload={reload}
            query={query}
            setQuery={setQuery}
            persistOrder={persistOrder}
            finish={finish}
            theme={theme}
            setTheme={setTheme}
            colors={colors}
            setColors={setColors}
          />
        </div>
      </main>
      {isMobile && (
        <MobileNav
          pathname={pathname}
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
      {toast && <Toast toast={toast} setToast={setToast} />}
    </div>
  );
}
