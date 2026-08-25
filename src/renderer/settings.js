// Settings Window UI & IPC Controller

document.addEventListener('DOMContentLoaded', async () => {
  const sound = new SoundManager()

  // Form Elements
  const workIntervalSlider = document.getElementById('work-interval')
  const workIntervalVal = document.getElementById('work-interval-val')
  const breakDurationSlider = document.getElementById('break-duration')
  const breakDurationVal = document.getElementById('break-duration-val')
  const skipHoldSlider = document.getElementById('skip-hold')
  const skipHoldVal = document.getElementById('skip-hold-val')
  const soundToggle = document.getElementById('sound-toggle')
  const soundVolumeSlider = document.getElementById('sound-volume')
  const soundVolumeVal = document.getElementById('sound-volume-val')
  const autostartToggle = document.getElementById('autostart-toggle')

  // Status & Preview Elements
  const liveStatusPill = document.getElementById('live-status-pill')
  const liveStatusText = document.getElementById('live-status-text')
  const previewCharContainer = document.getElementById('preview-character-container')
  const previewQuote = document.getElementById('preview-quote')
  const testVoiceBtn = document.getElementById('test-voice-btn')
  const triggerBreakBtn = document.getElementById('trigger-break-btn')
  const togglePauseBtn = document.getElementById('toggle-pause-btn')
  const resetDefaultsBtn = document.getElementById('reset-defaults-btn')
  const toastEl = document.getElementById('save-toast')

  let currentSettings = {}
  let selectedChar = 'dinki'
  let selectedSide = 'random'
  let saveTimeout = null

  function showToast(msg = 'Settings Saved') {
    if (!toastEl) return
    toastEl.textContent = msg
    toastEl.classList.add('show')
    setTimeout(() => {
      toastEl.classList.remove('show')
    }, 2000)
  }

  function updatePreview() {
    const persona = CHARACTERS[selectedChar] || CHARACTERS.dinki
    if (previewCharContainer) {
      const isLeft = selectedSide === 'left'
      if (persona.image) {
        previewCharContainer.innerHTML = `<img src="${persona.image}" alt="${persona.name}" class="preview-img ${isLeft ? 'flipped' : ''}" />`
      } else if (typeof persona.renderSvg === 'function') {
        previewCharContainer.innerHTML = persona.renderSvg(false, isLeft ? 'left' : 'right')
      }
    }
    if (previewQuote) {
      previewQuote.textContent = `"${persona.dialogues.entrance}"`
    }
  }

  function formatMinutesLabel(mins) {
    if (mins < 1) {
      const secs = Math.round(mins * 60)
      return `${secs} secs`
    }
    return `${mins} mins`
  }

  async function loadSettings() {
    if (window.electronAPI) {
      currentSettings = await window.electronAPI.getSettings()
    } else {
      currentSettings = {
        workIntervalMinutes: 60,
        breakDurationMinutes: 15,
        character: 'dinki',
        characterSide: 'random',
        soundEnabled: true,
        soundVolume: 0.7,
        skipHoldSeconds: 5,
        openAtLogin: false
      }
    }

    selectedChar = currentSettings.character || 'dinki'
    selectedSide = currentSettings.characterSide || 'random'

    // Populate UI
    if (workIntervalSlider) {
      workIntervalSlider.value = currentSettings.workIntervalMinutes
      workIntervalVal.textContent = formatMinutesLabel(currentSettings.workIntervalMinutes)
    }
    if (breakDurationSlider) {
      breakDurationSlider.value = currentSettings.breakDurationMinutes
      breakDurationVal.textContent = formatMinutesLabel(currentSettings.breakDurationMinutes)
    }
    if (skipHoldSlider) {
      skipHoldSlider.value = currentSettings.skipHoldSeconds || 5
      skipHoldVal.textContent = `${currentSettings.skipHoldSeconds || 5}s`
    }
    if (soundToggle) {
      soundToggle.checked = currentSettings.soundEnabled !== false
    }
    if (soundVolumeSlider) {
      soundVolumeSlider.value = currentSettings.soundVolume || 0.7
      soundVolumeVal.textContent = `${Math.round((currentSettings.soundVolume || 0.7) * 100)}%`
    }
    if (autostartToggle) {
      autostartToggle.checked = !!currentSettings.openAtLogin
    }

    // Set active char card
    document.querySelectorAll('.char-card').forEach(card => {
      card.classList.toggle('active', card.dataset.char === selectedChar)
    })

    // Set active side button
    document.querySelectorAll('.segment-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.side === selectedSide)
    })

    updatePreview()
    sound.setSettings(currentSettings)
  }

  function queueSave() {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(async () => {
      const payload = {
        workIntervalMinutes: parseFloat(workIntervalSlider.value),
        breakDurationMinutes: parseFloat(breakDurationSlider.value),
        skipHoldSeconds: parseInt(skipHoldSlider.value, 10),
        character: selectedChar,
        characterSide: selectedSide,
        soundEnabled: soundToggle.checked,
        soundVolume: parseFloat(soundVolumeSlider.value),
        openAtLogin: autostartToggle.checked
      }

      currentSettings = payload
      sound.setSettings(payload)

      if (window.electronAPI) {
        await window.electronAPI.saveSettings(payload)
      }
      showToast()
    }, 250)
  }

  // Work Interval Listeners
  if (workIntervalSlider) {
    workIntervalSlider.addEventListener('input', () => {
      workIntervalVal.textContent = formatMinutesLabel(parseFloat(workIntervalSlider.value))
      queueSave()
    })
  }

  // Break Duration Listeners
  if (breakDurationSlider) {
    breakDurationSlider.addEventListener('input', () => {
      breakDurationVal.textContent = formatMinutesLabel(parseFloat(breakDurationSlider.value))
      queueSave()
    })
  }

  // Skip Hold Slider
  if (skipHoldSlider) {
    skipHoldSlider.addEventListener('input', () => {
      skipHoldVal.textContent = `${skipHoldSlider.value}s`
      queueSave()
    })
  }

  // Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target
      const val = parseFloat(btn.dataset.val)
      const input = document.getElementById(targetId)

      if (input) {
        input.value = val
        const label = document.getElementById(`${targetId}-val`)
        if (label) label.textContent = formatMinutesLabel(val)

        // Mark active
        btn.parentElement.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')

        queueSave()
      }
    })
  })

  // Character Selector Cards
  document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedChar = card.dataset.char
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('active'))
      card.classList.add('active')
      updatePreview()
      queueSave()
    })
  })

  // Entrance Side Segmented Control
  document.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSide = btn.dataset.side
      document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      updatePreview()
      queueSave()
    })
  })

  // Sound & Voice Toggles
  if (soundToggle) soundToggle.addEventListener('change', queueSave)
  if (autostartToggle) autostartToggle.addEventListener('change', queueSave)

  if (soundVolumeSlider) {
    soundVolumeSlider.addEventListener('input', () => {
      soundVolumeVal.textContent = `${Math.round(parseFloat(soundVolumeSlider.value) * 100)}%`
      queueSave()
    })
  }

  // Test Chime Button
  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', () => {
      sound.playChime('entrance')
    })
  }

  // Trigger Break Now Button
  if (triggerBreakBtn) {
    triggerBreakBtn.addEventListener('click', async () => {
      if (window.electronAPI) {
        await window.electronAPI.triggerBreakNow()
      }
    })
  }

  // Toggle Pause Button
  if (togglePauseBtn) {
    togglePauseBtn.addEventListener('click', async () => {
      if (window.electronAPI) {
        const status = await window.electronAPI.togglePause()
        updateTimerStatusUI(status)
      }
    })
  }

  // Reset Defaults Button
  if (resetDefaultsBtn) {
    resetDefaultsBtn.addEventListener('click', async () => {
      if (window.electronAPI) {
        await window.electronAPI.resetSettings()
        await loadSettings()
        showToast('Settings Reset to Defaults')
      }
    })
  }

  // Live Timer Status Sync
  function updateTimerStatusUI(status) {
    if (!status || !liveStatusPill || !liveStatusText) return

    liveStatusPill.className = `status-pill ${status.state}`

    if (status.state === 'break') {
      liveStatusText.textContent = `Break Active (${status.formatted})`
      if (togglePauseBtn) togglePauseBtn.textContent = 'Pause Timer'
    } else if (status.state === 'paused') {
      liveStatusText.textContent = `Paused (${status.formatted})`
      if (togglePauseBtn) togglePauseBtn.textContent = 'Resume Timer'
    } else {
      liveStatusText.textContent = `Next break in: ${status.formatted}`
      if (togglePauseBtn) togglePauseBtn.textContent = 'Pause Timer'
    }
  }

  if (window.electronAPI) {
    window.electronAPI.onTimerUpdate((status) => {
      updateTimerStatusUI(status)
    })

    const initialStatus = await window.electronAPI.getTimerStatus()
    updateTimerStatusUI(initialStatus)
  }

  await loadSettings()
})
