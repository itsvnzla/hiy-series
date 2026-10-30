const { contextBridge, ipcRenderer } = require('electron');

// Expose safe API to the renderer (frontend) via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // Open native folder picker dialog
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),

  // Listen for folder scan triggered from the native menu
  onScanFolder: (callback) => ipcRenderer.on('scan-folder', (_event, folderPath) => callback(folderPath))
});
