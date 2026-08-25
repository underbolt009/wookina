const { Tray, Menu, nativeImage, app } = require('electron')
const path = require('path')
const fs = require('fs')

class AppTray {
  constructor(scheduler, settingsWindow, store) {
    this.scheduler = scheduler
    this.settingsWindow = settingsWindow
    this.store = store
    this.tray = null
    this.lastStatus = null

    this.init()
  }

  getTrayIcon() {
    const icoPath = path.join(__dirname, 'assets', 'tray-icon.ico')
    const pngPath = path.join(__dirname, 'assets', 'tray-icon.png')
    
    if (process.platform === 'win32' && fs.existsSync(icoPath)) {
      return icoPath
    }
    if (fs.existsSync(pngPath)) {
      const nImg = nativeImage.createFromPath(pngPath)
      if (process.platform === 'darwin') {
        return nImg.resize({ width: 18, height: 18 })
      }
      return nImg
    }
    return nativeImage.createEmpty()
  }

  init() {
    try {
      const icon = this.getTrayIcon()
      console.log('[Tray] Initializing Tray with icon:', typeof icon === 'string' ? icon : 'nativeImage')
      this.tray = new Tray(icon)
      this.tray.setToolTip('Waifu Break Enforcer')

      this.tray.on('click', () => {
        console.log('[Tray] Clicked -> Showing settings')
        this.settingsWindow.show()
      })

      this.tray.on('double-click', () => {
        this.settingsWindow.show()
      })

      this.updateMenu()
      console.log('[Tray] Tray initialized successfully! Bounds:', this.tray.getBounds())

      // Show Windows system notification pointing to the tray
      if (process.platform === 'win32' && typeof this.tray.displayBalloon === 'function') {
        setTimeout(() => {
          try {
            this.tray.displayBalloon({
              iconType: 'info',
              title: 'Waifu Break Enforcer 🌸',
              content: 'Your break enforcer is running in the system tray!'
            })
          } catch (_) {}
        }, 500)
      }
    } catch (err) {
      console.error('[Tray] Failed to create Tray:', err)
    }

    // Bind scheduler events
    this.scheduler.on('tick', (status) => this.onTimerTick(status))
    this.scheduler.on('break-start', (status) => this.onTimerTick(status))
    this.scheduler.on('break-tick', (status) => this.onTimerTick(status))
    this.scheduler.on('paused', (status) => this.onTimerTick(status))
    this.scheduler.on('resumed', (status) => this.onTimerTick(status))
  }

  onTimerTick(status) {
    this.lastStatus = status
    let tooltip = 'Waifu Break Enforcer'

    if (status.state === 'break') {
      tooltip = `Break in progress! Remaining: ${status.formatted}`
    } else if (status.state === 'paused') {
      tooltip = `Timer Paused (${status.formatted} left)`
    } else if (status.state === 'working') {
      tooltip = `Next break in: ${status.formatted}`
    }

    try {
      this.tray.setToolTip(tooltip)
      this.updateMenu()
    } catch (_) {}
  }

  updateMenu() {
    const status = this.lastStatus || this.scheduler.getStatus()
    let statusLabel = 'Status: Initializing...'

    if (status.state === 'break') {
      statusLabel = `Break Active: ${status.formatted} left`
    } else if (status.state === 'paused') {
      statusLabel = `Paused (${status.formatted} remaining)`
    } else if (status.state === 'working') {
      statusLabel = `Next Break: ${status.formatted}`
    }

    const isPaused = status.state === 'paused'
    const isBreak = status.state === 'break'

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Break Enforcer',
        enabled: false
      },
      {
        label: statusLabel,
        enabled: false
      },
      { type: 'separator' },
      {
        label: isBreak ? 'Skip Break' : 'Take Break Now',
        click: () => {
          if (isBreak) {
            this.scheduler.skipBreak()
          } else {
            this.scheduler.triggerBreakNow()
          }
        }
      },
      {
        label: isPaused ? 'Resume Timer' : 'Pause Timer',
        click: () => {
          this.scheduler.togglePause()
        }
      },
      { type: 'separator' },
      {
        label: 'Preferences...',
        click: () => {
          this.settingsWindow.show()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}

module.exports = AppTray
