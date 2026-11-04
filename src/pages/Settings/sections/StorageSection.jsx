import { FolderOpen, RefreshCw, Trash2 } from "lucide-react";
import { Btn } from "../../../components/ui/index.js";
import { errMsg } from "../../../utils/format.js";

export default function StorageSection({
  info,
  notify,
  openFiles,
  s,
  setInfo,
}) {
  return (
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
  );
}
