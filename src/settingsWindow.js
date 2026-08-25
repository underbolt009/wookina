const { BrowserWindow, app } = require('electron')
const path = require('path')

class SettingsWindow {
  constructor(store) {
    this.store = store
    this.win = null
  }

  show() {
    if (this.win && !this.win.isDestroyed()) {
      this.win.focus()
      this.win.show()
      return this.win
    }

    this.win = new BrowserWindow({
      width: 720,
      height: 840,
      minWidth: 640,
      minHeight: 680,
      title: 'Waifu Break Enforcer — Settings',
      icon: path.join(__dirname, 'assets', 'icon.png'),
      backgroundColor: '#11131a',
      show: false,
      frame: true,
      autoHideMenuBar: true,
      resizable: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js')
      }
    })

    this.win.loadFile(path.join(__dirname, 'renderer', 'settings.html'))

    this.win.once('ready-to-show', () => {
      this.win.show()
    })

    this.win.on('closed', () => {
      this.win = null
    })

    return this.win
  }

  isOpen() {
    return this.win !== null && !this.win.isDestroyed()
  }

  close() {
    if (this.isOpen()) {
      this.win.close()
    }
  }
}

module.exports = SettingsWindow
