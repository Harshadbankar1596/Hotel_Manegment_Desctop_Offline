const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('hotelApp',{
 chooseFolder:()=>ipcRenderer.invoke('folder:choose'),changeFolder:()=>ipcRenderer.invoke('folder:change'),load:()=>ipcRenderer.invoke('data:load'),listFiles:()=>ipcRenderer.invoke('storage:list-files'),deleteFiles:paths=>ipcRenderer.invoke('storage:delete-files',paths),
 save:(section,value)=>ipcRenderer.invoke('data:save',section,value),
 finalize:payload=>ipcRenderer.invoke('bill:finalize',payload),print:(html,opts)=>ipcRenderer.invoke('receipt:print',html,opts),listPrinters:()=>ipcRenderer.invoke('printers:list'),settleBill:(id,method)=>ipcRenderer.invoke('bill:settle',id,method),
 toggleFullscreen:()=>ipcRenderer.invoke('window:toggle-fullscreen'),isFullscreen:()=>ipcRenderer.invoke('window:is-fullscreen'),
 onFullscreenChange:cb=>{const h=(_e,v)=>cb(v);ipcRenderer.on('window:fullscreen-changed',h);return()=>ipcRenderer.removeListener('window:fullscreen-changed',h)},
 backup:()=>ipcRenderer.invoke('backup:create'),restore:()=>ipcRenderer.invoke('backup:restore'),storageInfo:()=>ipcRenderer.invoke('storage:info'),exportFile:(format,data)=>ipcRenderer.invoke('export:file',format,data)
});
