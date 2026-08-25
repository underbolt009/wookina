// Sound Effects using Web Audio API (No TTS)

class SoundManager {
  constructor() {
    this.ctx = null
    this.enabled = true
    this.volume = 0.7
  }

  _initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  setSettings(settings) {
    if (settings.soundEnabled !== undefined) this.enabled = settings.soundEnabled
    if (settings.soundVolume !== undefined) this.volume = settings.soundVolume
  }

  playChime(type = 'entrance') {
    if (!this.enabled || this.volume <= 0) return
    this._initContext()
    if (!this.ctx) return

    const now = this.ctx.currentTime

    if (type === 'entrance') {
      // Soft gentle chime arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + (i * 0.08))

        const noteVol = this.volume * 0.22
        gain.gain.setValueAtTime(0, now + (i * 0.08))
        gain.gain.linearRampToValueAtTime(noteVol, now + (i * 0.08) + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (i * 0.08) + 0.45)

        osc.connect(gain)
        gain.connect(this.ctx.destination)

        osc.start(now + (i * 0.08))
        osc.stop(now + (i * 0.08) + 0.5)
      })
    } else if (type === 'tick') {
      // Soft glass tap
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1200, now)

      gain.gain.setValueAtTime(this.volume * 0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.16)
    } else if (type === 'exit' || type === 'finish') {
      // Gentle warm completion tone
      const notes = [783.99, 1046.50]
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + (i * 0.12))

        const noteVol = this.volume * 0.2
        gain.gain.setValueAtTime(0, now + (i * 0.12))
        gain.gain.linearRampToValueAtTime(noteVol, now + (i * 0.12) + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (i * 0.12) + 0.6)

        osc.connect(gain)
        gain.connect(this.ctx.destination)

        osc.start(now + (i * 0.12))
        osc.stop(now + (i * 0.12) + 0.65)
      })
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SoundManager
}
