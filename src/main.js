const { app, BrowserWindow, ipcMain, dialog, powerMonitor } = require('electron')
const path = require('path')
const Store = require('./store')
const Scheduler = require('./scheduler')
const WindowManager = require('./windowManager')
const SettingsWindow = require('./settingsWindow')
const AppTray = require('./tray')

// Ensure single instance
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

let store = null
let scheduler = null
let windowManager = null
let settingsWindow = null
let appTray = null

app.on('second-instance', () => {
  if (settingsWindow) {
    settingsWindow.show()
  }
})

// Prevent app from quitting when all windows are closed (runs in tray)
app.on('window-all-closed', (e) => {
  // Do not quit - stay resident in tray
  e.preventDefault()
})

function broadcastStatus(status) {
  if (settingsWindow && settingsWindow.isOpen()) {
    settingsWindow.win.webContents.send('timer:update', status)
  }
}

app.whenReady().then(() => {
  console.log('[Main] Waifu Break Enforcer starting up...')

  store = new Store()
  scheduler = new Scheduler(store, powerMonitor)
  windowManager = new WindowManager(store)
  settingsWindow = new SettingsWindow(store)
  appTray = new AppTray(scheduler, settingsWindow, store)

  // Configure autostart
  try {
    const openAtLogin = store.get('openAtLogin')
    app.setLoginItemSettings({
      openAtLogin: !!openAtLogin,
      name: 'Waifu Break Enforcer'
    })
  } catch (err) {
    console.warn('[Main] Autostart configuration failed:', err.message)
  }

  // Setup Scheduler listeners
  scheduler.on('break-start', (status) => {
    console.log('[Main] Event: break-start -> Spawning overlays')
    windowManager.createOverlays(status)
    broadcastStatus(status)
  })

  scheduler.on('break-tick', (status) => {
    windowManager.broadcast('break:tick', status)
    broadcastStatus(status)
  })

  scheduler.on('break-end', ({ reason }) => {
    console.log(`[Main] Event: break-end (reason: ${reason}) -> Closing overlays`)
    windowManager.triggerExitAnimation()
  })

  scheduler.on('tick', (status) => {
    broadcastStatus(status)
  })

  scheduler.on('paused', (status) => {
    broadcastStatus(status)
  })

  scheduler.on('resumed', (status) => {
    broadcastStatus(status)
  })

  // Start the main work timer
  scheduler.start()

  // Open settings window on startup (can be minimized to tray)
  settingsWindow.show()

  // IPC Handlers
  ipcMain.handle('settings:get', () => {
    return store.get()
  })

  ipcMain.handle('settings:save', (_event, newSettings) => {
    const updated = store.set(newSettings)
    if (newSettings.openAtLogin !== undefined) {
      try {
        app.setLoginItemSettings({
          openAtLogin: !!newSettings.openAtLogin,
          name: 'Waifu Break Enforcer'
        })
      } catch (_) {}
    }
    scheduler.updateSettings()
    return updated
  })

  ipcMain.handle('settings:reset', () => {
    const defaults = store.reset()
    scheduler.updateSettings()
    return defaults
  })

  ipcMain.handle('timer:triggerBreak', () => {
    scheduler.triggerBreakNow()
    return { success: true }
  })

  ipcMain.handle('timer:togglePause', () => {
    scheduler.togglePause()
    return scheduler.getStatus()
  })

  ipcMain.handle('timer:getStatus', () => {
    return scheduler.getStatus()
  })

  ipcMain.handle('dialog:selectImage', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Custom Waifu Image',
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'] }
      ]
    })

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  ipcMain.on('settings:open', () => {
    settingsWindow.show()
  })

  ipcMain.on('break:skip', () => {
    console.log('[Main] Received break:skip IPC from overlay')
    scheduler.skipBreak()
  })

  ipcMain.on('break:finish', () => {
    console.log('[Main] Received break:finish IPC from overlay')
    scheduler.endBreak()
  })

  console.log('[Main] Waifu Break Enforcer initialized successfully.')
})

app.on('before-quit', () => {
  if (scheduler) scheduler.destroy()
  if (windowManager) windowManager.closeOverlays(true)
  if (appTray) appTray.destroy()
})
