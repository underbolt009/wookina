const fs = require('fs')
const path = require('path')

const DEFAULT_SETTINGS = {
  workIntervalMinutes: 60,
  breakDurationMinutes: 15,
  character: 'dinki', // 'dinki' | 'poko' | 'ren' | 'custom'
  customCharacterImage: null,
  characterSide: 'random', // 'left' | 'right' | 'random'
  soundEnabled: true,
  soundVolume: 0.7,
  skipHoldSeconds: 5,
  openAtLogin: false,
  strictMode: false,
  theme: 'kawaii-dark'
}

class Store {
  constructor(customPath = null) {
    this.customPath = customPath
    this.settings = { ...DEFAULT_SETTINGS }
    this.filePath = this._resolvePath()
    this.load()
  }

  _resolvePath() {
    if (this.customPath) {
      return this.customPath
    }
    try {
      const { app } = require('electron')
      if (app && typeof app.getPath === 'function') {
        return path.join(app.getPath('userData'), 'waifu-break-settings.json')
      }
    } catch (_) {
      // Running outside Electron (e.g. unit tests)
    }
    return path.join(process.cwd(), '.settings.json')
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8')
        const parsed = JSON.parse(raw)
        this.settings = { ...DEFAULT_SETTINGS, ...parsed }
      } else {
        this.settings = { ...DEFAULT_SETTINGS }
        this.save()
      }
    } catch (err) {
      console.warn('[Store] Failed to read settings, falling back to defaults:', err.message)
      this.settings = { ...DEFAULT_SETTINGS }
    }
    return this.settings
  }

  save() {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf8')
    } catch (err) {
      console.error('[Store] Failed to save settings:', err.message)
    }
  }

  get(key) {
    return key ? this.settings[key] : this.settings
  }

  set(keyOrObj, value) {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      this.settings = { ...this.settings, ...keyOrObj }
    } else {
      this.settings[keyOrObj] = value
    }
    this.save()
    return this.settings
  }

  reset() {
    this.settings = { ...DEFAULT_SETTINGS }
    this.save()
    return this.settings
  }
}

module.exports = Store
