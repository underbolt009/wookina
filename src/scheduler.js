const EventEmitter = require('events')

class Scheduler extends EventEmitter {
  constructor(store, powerMonitor = null) {
    super()
    this.store = store
    this.powerMonitor = powerMonitor

    this.state = 'idle' // 'working' | 'break' | 'paused'
    this.nextBreakAt = null
    this.breakEndsAt = null
    this.breakTotalSeconds = 0
    this.workTotalSeconds = 0
    this.pausedRemainingMs = null
    this.pausedState = null

    this.tickInterval = null
    this._bindPowerMonitor()
  }

  _bindPowerMonitor() {
    if (!this.powerMonitor) return

    try {
      this.powerMonitor.on('suspend', () => {
        console.log('[Scheduler] System suspended -> pausing timer')
        this.pause()
      })
      this.powerMonitor.on('resume', () => {
        console.log('[Scheduler] System resumed -> resuming timer')
        this.resume()
      })
      this.powerMonitor.on('lock-screen', () => {
        console.log('[Scheduler] Screen locked -> pausing timer')
        this.pause()
      })
      this.powerMonitor.on('unlock-screen', () => {
        console.log('[Scheduler] Screen unlocked -> resuming timer')
        this.resume()
      })
    } catch (err) {
      console.warn('[Scheduler] PowerMonitor hook error:', err.message)
    }
  }

  start() {
    this.state = 'working'
    const intervalMinutes = this.store.get('workIntervalMinutes') || 60
    this.workTotalSeconds = Math.max(1, Math.round(intervalMinutes * 60))
    this.nextBreakAt = Date.now() + (this.workTotalSeconds * 1000)

    if (this.tickInterval) clearInterval(this.tickInterval)
    this.tickInterval = setInterval(() => this._onTick(), 1000)

    this.emit('started', this.getStatus())
    this.emit('tick', this.getStatus())
  }

  _onTick() {
    const now = Date.now()

    if (this.state === 'working') {
      const remainingMs = this.nextBreakAt - now
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))

      if (remainingMs <= 0) {
        this.startBreak()
      } else {
        this.emit('tick', this.getStatus())
      }
    } else if (this.state === 'break') {
      const remainingMs = this.breakEndsAt - now
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))

      if (remainingMs <= 0) {
        this.endBreak()
      } else {
        this.emit('break-tick', this.getStatus())
      }
    }
  }

  startBreak() {
    this.state = 'break'
    const breakMinutes = this.store.get('breakDurationMinutes') || 15
    this.breakTotalSeconds = Math.max(1, Math.round(breakMinutes * 60))
    this.breakEndsAt = Date.now() + (this.breakTotalSeconds * 1000)

    console.log(`[Scheduler] Break started! Duration: ${this.breakTotalSeconds}s`)
    this.emit('break-start', this.getStatus())
    this.emit('break-tick', this.getStatus())
  }

  endBreak() {
    console.log('[Scheduler] Break completed naturally.')
    this.emit('break-end', { reason: 'completed' })
    this.start() // Reset work timer
  }

  skipBreak() {
    if (this.state !== 'break') return
    console.log('[Scheduler] Break skipped by user.')
    this.emit('break-end', { reason: 'skipped' })
    this.start() // Reset work timer
  }

  triggerBreakNow() {
    console.log('[Scheduler] Triggering break immediately (manual/test)')
    this.startBreak()
  }

  pause() {
    if (this.state === 'paused') return
    this.pausedState = this.state
    const now = Date.now()

    if (this.state === 'working' && this.nextBreakAt) {
      this.pausedRemainingMs = Math.max(0, this.nextBreakAt - now)
    } else if (this.state === 'break' && this.breakEndsAt) {
      this.pausedRemainingMs = Math.max(0, this.breakEndsAt - now)
    } else {
      this.pausedRemainingMs = 0
    }

    this.state = 'paused'
    this.emit('paused', this.getStatus())
  }

  resume() {
    if (this.state !== 'paused') return
    const now = Date.now()
    const prev = this.pausedState || 'working'
    const remainingMs = this.pausedRemainingMs || 0

    if (prev === 'break') {
      this.state = 'break'
      this.breakEndsAt = now + remainingMs
      this.emit('break-start', this.getStatus())
    } else {
      this.state = 'working'
      this.nextBreakAt = now + remainingMs
      this.emit('resumed', this.getStatus())
    }

    this.pausedState = null
    this.pausedRemainingMs = null
    this.emit('tick', this.getStatus())
  }

  togglePause() {
    if (this.state === 'paused') {
      this.resume()
    } else {
      this.pause()
    }
  }

  updateSettings() {
    // If working, recalculate nextBreakAt while preserving elapsed progress or restart
    if (this.state === 'working') {
      const intervalMinutes = this.store.get('workIntervalMinutes') || 60
      this.workTotalSeconds = Math.max(1, Math.round(intervalMinutes * 60))
      this.nextBreakAt = Date.now() + (this.workTotalSeconds * 1000)
      this.emit('tick', this.getStatus())
    }
  }

  getStatus() {
    const now = Date.now()
    let remainingSeconds = 0
    let totalSeconds = 0
    let progress = 0

    if (this.state === 'working') {
      totalSeconds = this.workTotalSeconds
      remainingSeconds = Math.max(0, Math.ceil((this.nextBreakAt - now) / 1000))
      progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0
    } else if (this.state === 'break') {
      totalSeconds = this.breakTotalSeconds
      remainingSeconds = Math.max(0, Math.ceil((this.breakEndsAt - now) / 1000))
      progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0
    } else if (this.state === 'paused') {
      remainingSeconds = Math.max(0, Math.ceil((this.pausedRemainingMs || 0) / 1000))
      totalSeconds = this.pausedState === 'break' ? this.breakTotalSeconds : this.workTotalSeconds
      progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0
    }

    return {
      state: this.state,
      remainingSeconds,
      totalSeconds,
      progress: Math.min(1, Math.max(0, progress)),
      formatted: this._formatTime(remainingSeconds),
      character: this.store.get('character'),
      characterSide: this.store.get('characterSide'),
      skipHoldSeconds: this.store.get('skipHoldSeconds') || 5,
      soundVolume: this.store.get('soundVolume') || 0.7,
      soundEnabled: this.store.get('soundEnabled') !== false,
      voiceEnabled: this.store.get('voiceEnabled') !== false
    }
  }

  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  destroy() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
    this.removeAllListeners()
  }
}

module.exports = Scheduler
