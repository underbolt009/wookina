// Waifu Break Overlay Controller

document.addEventListener('DOMContentLoaded', () => {
  const scrimEl = document.getElementById('scrim')
  const appContainerEl = document.getElementById('app-container')
  const hudEl = document.querySelector('.break-hud')
  const stageEl = document.getElementById('waifu-stage')
  const characterEl = document.getElementById('waifu-character')
  const speechBubbleEl = document.getElementById('speech-bubble')
  const speechTextEl = document.getElementById('speech-text')
  const personaBadgeEl = document.getElementById('persona-badge')
  const timerDigitsEl = document.getElementById('countdown-timer')
  const timerProgressBar = document.getElementById('timer-progress-bar')
  const timerProgressFill = document.getElementById('timer-progress-fill')
  const wellnessTipEl = document.getElementById('wellness-tip')
  const skipBtn = document.getElementById('skip-btn')
  const skipGaugeBar = document.getElementById('skip-gauge-bar')
  const skipChargeFill = document.getElementById('skip-charge-fill')
  const skipHintEl = document.getElementById('skip-hint')

  const sound = new SoundManager()
  let currentCharacterId = 'dinki'
  let charPersona = CHARACTERS.dinki
  let skipHoldTotalMs = 5000
  let skipStartTime = null
  let skipAnimFrame = null
  let isHoldingSkip = false
  let isSkipping = false
  let blinkInterval = null
  let dialogueInterval = null
  let totalBreakSeconds = 900

  // Set theme & colors based on character persona
  function applyCharacterTheme(charId) {
    currentCharacterId = charId || 'dinki'
    charPersona = CHARACTERS[currentCharacterId] || CHARACTERS.dinki

    if (personaBadgeEl) {
      personaBadgeEl.textContent = charPersona.badge
    }

    document.documentElement.style.setProperty('--primary', charPersona.themeColor)
    document.documentElement.style.setProperty('--secondary', charPersona.accentColor)

    // Render character figure
    const isLeft = appContainerEl.classList.contains('side-left')
    if (characterEl) {
      if (charPersona.image) {
        characterEl.innerHTML = `<img src="${charPersona.image}" alt="${charPersona.name}" class="${isLeft ? 'flipped' : ''}" />`
      } else if (typeof charPersona.renderSvg === 'function') {
        characterEl.innerHTML = charPersona.renderSvg(false, isLeft ? 'left' : 'right')
      }
    }
  }

  // Blinking animation loop for SVG rig
  function startBlinkCycle() {
    if (blinkInterval) clearInterval(blinkInterval)
    const scheduleNextBlink = () => {
      const nextInterval = Math.random() * 3500 + 2500 // Random 2.5s - 6.0s
      blinkInterval = setTimeout(() => {
        const isLeft = appContainerEl.classList.contains('side-left')
        if (charPersona && typeof charPersona.renderSvg === 'function') {
          characterEl.innerHTML = charPersona.renderSvg(true, isLeft ? 'left' : 'right')
          setTimeout(() => {
            characterEl.innerHTML = charPersona.renderSvg(false, isLeft ? 'left' : 'right')
            scheduleNextBlink()
          }, 140)
        }
      }, nextInterval)
    }
    scheduleNextBlink()
  }

  function setDialogue(text) {
    if (!speechBubbleEl || !speechTextEl) return

    speechBubbleEl.classList.remove('visible')
    setTimeout(() => {
      speechTextEl.textContent = text
      speechBubbleEl.classList.add('visible')
    }, 200)
  }

  // Periodic wellness reminder cycle during long breaks
  function startDialogueCycle() {
    if (dialogueInterval) clearInterval(dialogueInterval)
    let tipIndex = 0
    dialogueInterval = setInterval(() => {
      if (isSkipping) return
      const tips = charPersona.dialogues.tips
      if (tips && tips.length > 0) {
        const nextTip = tips[tipIndex % tips.length]
        tipIndex++
        setDialogue(nextTip)
        if (wellnessTipEl) {
          wellnessTipEl.textContent = nextTip
        }
      }
    }, 30000) // Change quote every 30s
  }

  // Entrance Sequence with Walking Animation
  function playEntranceSequence(data = {}) {
    console.log('[Overlay] Playing walking entrance sequence', data)
    sound.setSettings(data)

    // Reset all state flags & timers cleanly
    isSkipping = false
    isHoldingSkip = false
    skipStartTime = null

    if (skipAnimFrame) {
      cancelAnimationFrame(skipAnimFrame)
      skipAnimFrame = null
    }
    if (blinkInterval) clearInterval(blinkInterval)
    if (dialogueInterval) clearInterval(dialogueInterval)

    if (skipChargeFill) skipChargeFill.style.width = '0%'
    if (skipGaugeBar) skipGaugeBar.style.strokeDashoffset = 113.1
    if (skipBtn) skipBtn.classList.remove('holding')

    // Reset UI visibility classes
    if (hudEl) hudEl.classList.remove('visible')
    if (speechBubbleEl) speechBubbleEl.classList.remove('visible')
    if (stageEl) stageEl.classList.remove('walking-in', 'walking-out', 'entered', 'exiting')
    if (characterEl) characterEl.classList.remove('stepping', 'breathing')

    // Set side
    const side = data.side || 'right'
    appContainerEl.classList.remove('side-left', 'side-right')
    appContainerEl.classList.add(`side-${side}`)

    // Set skip duration
    const holdSec = data.skipHoldSeconds || 5
    skipHoldTotalMs = holdSec * 1000
    if (skipHintEl) {
      skipHintEl.textContent = `Hold ${holdSec}s`
    }

    applyCharacterTheme(data.character)
    startBlinkCycle()

    // 1. Scrim fade-in
    scrimEl.classList.add('visible')

    // 2. Play entrance chime
    sound.playChime('entrance')

    // 3. Walking entrance: stage slides smoothly across X, character bobs up/down with stepping cycle
    setTimeout(() => {
      stageEl.classList.remove('walking-out', 'entered', 'exiting')
      stageEl.classList.add('walking-in')

      if (characterEl) {
        characterEl.classList.remove('breathing')
        characterEl.classList.add('stepping')
      }

      // 4. Once walk settles (~1.8s), switch character to breathing idle & speak greeting
      setTimeout(() => {
        stageEl.classList.remove('walking-in')
        stageEl.classList.add('entered')

        if (characterEl) {
          characterEl.classList.remove('stepping')
          characterEl.classList.add('breathing')
        }

        // 5. Reveal speech bubble & start dialogues
        setDialogue(charPersona.dialogues.entrance)
        startDialogueCycle()

        // 6. Reveal HUD
        hudEl.classList.add('visible')
      }, 1800)
    }, 80)
  }

  function playExitSequence() {
    isSkipping = true
    if (blinkInterval) clearInterval(blinkInterval)
    if (dialogueInterval) clearInterval(dialogueInterval)

    sound.playChime('finish')
    setDialogue(charPersona.dialogues.exit)

    if (hudEl) hudEl.classList.remove('visible')
    if (speechBubbleEl) speechBubbleEl.classList.remove('visible')

    // Character steps away while stage slides offscreen
    setTimeout(() => {
      if (stageEl) {
        stageEl.classList.remove('entered', 'walking-in')
        stageEl.classList.add('walking-out')
      }
      if (characterEl) {
        characterEl.classList.remove('breathing')
        characterEl.classList.add('stepping')
      }
      if (scrimEl) scrimEl.classList.remove('visible')
    }, 200)
  }

  // Update timer display & linear progress bar
  function updateTimerUI(status) {
    if (!status || isSkipping) return

    if (status.formatted && timerDigitsEl) {
      timerDigitsEl.textContent = status.formatted
    }

    if (timerProgressFill) {
      const progress = typeof status.progress === 'number' ? status.progress : 0
      const pct = Math.max(0, Math.min(100, (1 - progress) * 100))
      timerProgressFill.style.width = `${pct}%`
    } else if (timerProgressBar) {
      const maxOffset = 440
      const progress = typeof status.progress === 'number' ? status.progress : 0
      const offset = maxOffset * progress
      timerProgressBar.style.strokeDashoffset = offset
    }

    // Milestone alert: 60s left
    if (status.remainingSeconds === 60) {
      sound.playChime('tick')
      setDialogue(charPersona.dialogues.almostDone)
    }
  }

  // Hold-to-Skip Friction Logic
  function startHoldSkip() {
    if (isSkipping) return
    isHoldingSkip = true
    skipStartTime = Date.now()
    if (skipBtn) skipBtn.classList.add('holding')

    const updateGauge = () => {
      if (!isHoldingSkip || isSkipping) return

      const elapsed = Date.now() - skipStartTime
      const ratio = Math.min(1, elapsed / skipHoldTotalMs)

      if (skipChargeFill) {
        skipChargeFill.style.width = `${Math.min(100, ratio * 100)}%`
      } else if (skipGaugeBar) {
        const circumference = 113.1
        const offset = circumference * (1 - ratio)
        skipGaugeBar.style.strokeDashoffset = offset
      }

      if (ratio >= 1) {
        completeSkip()
        return
      }

      skipAnimFrame = requestAnimationFrame(updateGauge)
    }

    skipAnimFrame = requestAnimationFrame(updateGauge)
  }

  function cancelHoldSkip() {
    if (isSkipping) return
    isHoldingSkip = false
    skipStartTime = null
    if (skipBtn) skipBtn.classList.remove('holding')

    if (skipAnimFrame) {
      cancelAnimationFrame(skipAnimFrame)
      skipAnimFrame = null
    }

    if (skipChargeFill) {
      skipChargeFill.style.width = '0%'
    } else if (skipGaugeBar) {
      skipGaugeBar.style.strokeDashoffset = 113.1
    }
  }

  function completeSkip() {
    if (isSkipping) return
    isSkipping = true
    isHoldingSkip = false
    if (skipBtn) skipBtn.classList.remove('holding')

    if (skipChargeFill) {
      skipChargeFill.style.width = '100%'
    } else if (skipGaugeBar) {
      skipGaugeBar.style.strokeDashoffset = 0
    }

    playExitSequence()

    // Notify main process to skip
    if (window.electronAPI && typeof window.electronAPI.skipBreak === 'function') {
      window.electronAPI.skipBreak()
    }
  }

  // Event Listeners for Skip
  if (skipBtn) {
    skipBtn.addEventListener('mousedown', (e) => {
      if (e.button === 0) startHoldSkip()
    })
    window.addEventListener('mouseup', () => {
      if (isHoldingSkip) cancelHoldSkip()
    })
    skipBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      startHoldSkip()
    }, { passive: false })
    window.addEventListener('touchend', () => {
      if (isHoldingSkip) cancelHoldSkip()
    })
  }

  // Strict Input Blocking: Intercept all keyboard input except holding Space for skip
  let spaceDown = false
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      if (!spaceDown && !isSkipping) {
        spaceDown = true
        startHoldSkip()
      }
      e.preventDefault()
      e.stopPropagation()
      return
    }
    // Block all other keys (letters, numbers, Esc, F-keys, Alt, Tab, etc.)
    e.preventDefault()
    e.stopPropagation()
  }, true)

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spaceDown = false
      if (isHoldingSkip) cancelHoldSkip()
    }
    e.preventDefault()
    e.stopPropagation()
  }, true)

  // Block context menu
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    e.stopPropagation()
  }, true)

  // Block non-skip mouse clicks, drags, and text selection
  window.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#skip-btn')) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, true)

  window.addEventListener('dragstart', (e) => {
    e.preventDefault()
    e.stopPropagation()
  }, true)

  window.addEventListener('selectstart', (e) => {
    e.preventDefault()
    e.stopPropagation()
  }, true)

  // Electron IPC Listeners
  if (window.electronAPI) {
    window.electronAPI.onBreakInit((data) => {
      playEntranceSequence(data)
    })

    window.electronAPI.onBreakTick((status) => {
      updateTimerUI(status)
    })

    window.electronAPI.onBreakExit(() => {
      playExitSequence()
    })
  } else {
    // Standalone / Browser preview mode fallback
    playEntranceSequence({
      side: 'right',
      character: 'dinki',
      skipHoldSeconds: 5,
      soundEnabled: true,
      soundVolume: 0.7
    })
  }
})
