const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Break Overlay Events
  onBreakInit: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('break:init', handler)
    return () => ipcRenderer.removeListener('break:init', handler)
  },
  onBreakTick: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('break:tick', handler)
    return () => ipcRenderer.removeListener('break:tick', handler)
  },
  onBreakExit: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('break:exit', handler)
    return () => ipcRenderer.removeListener('break:exit', handler)
  },
  skipBreak: () => {
    ipcRenderer.send('break:skip')
  },
  finishBreak: () => {
    ipcRenderer.send('break:finish')
  },

  // Settings & Controls
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  triggerBreakNow: () => ipcRenderer.invoke('timer:triggerBreak'),
  togglePause: () => ipcRenderer.invoke('timer:togglePause'),
  getTimerStatus: () => ipcRenderer.invoke('timer:getStatus'),
  selectImageFile: () => ipcRenderer.invoke('dialog:selectImage'),
  openSettings: () => ipcRenderer.send('settings:open'),

  onTimerUpdate: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('timer:update', handler)
    return () => ipcRenderer.removeListener('timer:update', handler)
  }
})
