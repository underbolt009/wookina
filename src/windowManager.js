const { BrowserWindow, screen } = require('electron')
const path = require('path')

class WindowManager {
  constructor(store) {
    this.store = store
    this.overlayWindows = []
    this.currentSide = 'right'
    this.exitTimeout = null
  }

  getSide() {
    const configSide = this.store.get('characterSide') || 'random'
    if (configSide === 'random') {
      this.currentSide = this.currentSide === 'right' ? 'left' : 'right'
      return this.currentSide
    }
    return configSide
  }

  createOverlays(breakStatus = {}) {
    if (this.exitTimeout) {
      clearTimeout(this.exitTimeout)
      this.exitTimeout = null
    }

    this.closeOverlays(true) // Ensure any existing are closed cleanly

    const displays = screen.getAllDisplays()
    const side = this.getSide()
    const primaryDisplay = screen.getPrimaryDisplay()

    this.overlayWindows = displays.map((display, index) => {
      const isPrimary = display.id === primaryDisplay.id

      const win = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        fullscreenable: true,
        enableLargerThanScreen: true,
        hasShadow: false,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          preload: path.join(__dirname, 'preload.js')
        }
      })

      // Ensure topmost priority
      try {
        win.setAlwaysOnTop(true, 'screen-saver', 1)
        win.setKiosk(true)
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      } catch (e) {
        console.warn('[WindowManager] Window flag warning:', e.message)
      }

      // Load renderer overlay HTML
      win.loadFile(path.join(__dirname, 'renderer', 'overlay.html'), {
        query: {
          displayIndex: index,
          isPrimary: isPrimary ? '1' : '0',
          side: side
        }
      })

      win.once('ready-to-show', () => {
        win.show()
        win.focus()
        win.webContents.send('break:init', {
          ...breakStatus,
          side: side,
          isPrimary: isPrimary
        })
      })

      win.on('blur', () => {
        if (this.isOverlayActive() && !win.isDestroyed()) {
          setTimeout(() => {
            try {
              if (!win.isDestroyed()) {
                win.focus()
                win.setAlwaysOnTop(true, 'screen-saver', 1)
              }
            } catch (_) {}
          }, 30)
        }
      })

      win.on('closed', () => {
        const idx = this.overlayWindows.indexOf(win)
        if (idx !== -1) {
          this.overlayWindows.splice(idx, 1)
        }
      })

      return win
    })

    return this.overlayWindows
  }

  broadcast(channel, data) {
    for (const win of this.overlayWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    }
  }

  triggerExitAnimation(callback) {
    if (this.exitTimeout) {
      clearTimeout(this.exitTimeout)
      this.exitTimeout = null
    }

    if (this.overlayWindows.length === 0) {
      if (callback) callback()
      return
    }

    this.broadcast('break:exit', {})

    const winsToClose = [...this.overlayWindows]
    this.exitTimeout = setTimeout(() => {
      this.exitTimeout = null
      winsToClose.forEach(win => {
        try {
          if (!win.isDestroyed()) {
            win.destroy()
          }
        } catch (_) {}
      })
      this.overlayWindows = this.overlayWindows.filter(w => !winsToClose.includes(w))
      if (callback) callback()
    }, 450)
  }

  closeOverlays(immediate = false) {
    if (this.exitTimeout) {
      clearTimeout(this.exitTimeout)
      this.exitTimeout = null
    }

    if (this.overlayWindows.length === 0) return

    const winsToClose = [...this.overlayWindows]
    this.overlayWindows = []

    winsToClose.forEach(win => {
      try {
        if (!win.isDestroyed()) {
          win.destroy()
        }
      } catch (err) {
        console.error('[WindowManager] Error closing overlay window:', err)
      }
    })
  }

  isOverlayActive() {
    return this.overlayWindows.length > 0
  }
}

module.exports = WindowManager
