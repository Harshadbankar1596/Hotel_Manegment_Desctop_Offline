import { AlertTriangle, FolderOpen, RefreshCw } from "lucide-react";

export default function LoadErrorScreen({
  choose,
  loadError,
  reload,
  retrying,
  setRetrying,
}) {
  return (
    <div className="loading load-error" role="alert">
      <AlertTriangle size={34} />
      <h2>Could not open your data</h2>
      <p className="load-error-msg">{loadError}</p>
      <p className="subtle">
        Your data has NOT been deleted. A file may be damaged (for example after a power cut). Click Retry, or restore
        that file from a backup copy. Do not start a new workspace in the same folder.
      </p>
      <div className="load-error-actions">
        <button
          className="primary"
          disabled={retrying}
          onClick={async () => {
            setRetrying(true);
            await reload();
            setRetrying(false);
          }}
        >
          <RefreshCw size={16} /> {retrying ? "Retrying…" : "Retry"}
        </button>
        <button className="btn" onClick={choose}>
          <FolderOpen size={16} /> Choose another folder
        </button>
      </div>
    </div>
  );
}
