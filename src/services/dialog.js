/* Promise based confirm / prompt dialogs (window.prompt is not supported in Electron).
   <DialogHost /> registers itself here; everything else just calls `ask({...})`. */
let dialogOpener = null;

export const setDialogOpener = (fn) => {
  dialogOpener = fn;
};

export const ask = (opts) =>
  new Promise((resolve) => {
    if (dialogOpener) dialogOpener({ ...opts, resolve });
    else resolve(opts.input ? null : window.confirm(opts.message || opts.title));
  });
