import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Heading, Panel } from "../../components/ui/index.js";
import { useEscape } from "../../hooks/useEscape.js";
import { errMsg } from "../../utils/format.js";
import BackupSection from "./sections/BackupSection.jsx";
import DeleteFilesModal from "./sections/DeleteFilesModal.jsx";
import PrinterSection from "./sections/PrinterSection.jsx";
import ProfileSection from "./sections/ProfileSection.jsx";
import StorageSection from "./sections/StorageSection.jsx";
import TaxSection from "./sections/TaxSection.jsx";
import ThemeSection from "./sections/ThemeSection.jsx";

export default function SettingsPage({ s, save, notify, theme, setTheme, colors, setColors }) {
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
            <ProfileSection hotel={hotel} notify={notify} save={save} setHotel={setHotel} />
          )}
          {section === "theme" && (
            <ThemeSection theme={theme} setTheme={setTheme} colors={colors} setColors={setColors} notify={notify} />
          )}
          {section === "tax" && (
            <TaxSection notify={notify} save={save} setSettings={setSettings} settings={settings} />
          )}
          {section === "printer" && (
            <PrinterSection
              choosePrinter={choosePrinter}
              loadingPrinters={loadingPrinters}
              notify={notify}
              printers={printers}
              refreshPrinters={refreshPrinters}
              save={save}
              setSettings={setSettings}
              settings={settings}
            />
          )}
          {section === "storage" && (
            <StorageSection info={info} notify={notify} openFiles={openFiles} s={s} setInfo={setInfo} />
          )}
          {section === "backup" && (
            <BackupSection notify={notify} />
          )}
        </Panel>
      </div>
      {files && (
        <DeleteFilesModal
          files={files}
          notify={notify}
          picked={picked}
          setFiles={setFiles}
          setInfo={setInfo}
          setPicked={setPicked}
        />
      )}
    </>
  );
}
