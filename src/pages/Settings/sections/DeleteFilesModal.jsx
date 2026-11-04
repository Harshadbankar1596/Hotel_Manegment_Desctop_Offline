import { X } from "lucide-react";
import { Btn } from "../../../components/ui/index.js";
import { ask } from "../../../services/dialog.js";
import { errMsg } from "../../../utils/format.js";

export default function DeleteFilesModal({
  files,
  notify,
  picked,
  setFiles,
  setInfo,
  setPicked,
}) {
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

  return (
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
  );
}
