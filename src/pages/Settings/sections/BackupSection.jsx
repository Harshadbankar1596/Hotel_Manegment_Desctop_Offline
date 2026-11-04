import { Archive, RefreshCw } from "lucide-react";
import { Btn } from "../../../components/ui/index.js";
import { ask } from "../../../services/dialog.js";
import { errMsg } from "../../../utils/format.js";

export default function BackupSection({ notify }) {
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

  return (
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
  );
}
