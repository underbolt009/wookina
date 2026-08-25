# Waifu Break Enforcer

A desktop break enforcer built with Electron. Every 60 minutes, it initiates a 15-minute mandatory wellness break with a fullscreen, multi-monitor overlay. An animated anime companion walks onto the screen, reminds you to stretch and rest your eyes, and returns full system control once your break completes.

---

## Features

- **Multi-Monitor Transparent Kiosk Overlay**: Spawns synchronized fullscreen overlays across all connected displays (`screen.getAllDisplays()`) on the `screen-saver` topmost layer.
- **Strict Break Enforcement**: Intercepts and blocks all keyboard input, click-throughs, window switching, and context menus during breaks to keep you away from work.
- **Hold-to-Skip Escape Hatch**: Requires pressing and holding the skip button (or Spacebar) for 5 seconds with a linear charge fill bar to prevent accidental skips while remaining safe in emergencies.
- **Animated Companions**:
  - **Dinki**: Purple-haired sailor uniform anime companion with gentle, encouraging posture and eye-rest reminders.
  - **Poko**: Chubby golden-cream anime hamster mascot holding a sunflower seed with cute, uplifting stretch reminders.
  - **Ren**: Cool, focused male anime companion with calm productivity tips.
- **Modern Minimalist UI**: Sharp, brutalist design language with `0px` border radius, obsidian dark background (`#0b0d14`), Inter Variable typography, and custom sharp scrollbars.
- **Web Audio Chime Synthesizer**: Pure browser Web Audio API chimes for entrance, milestone tick, and break completion (no external audio binaries or TTS dependencies).
- **Drift-Free Scheduling**: Timestamp-based countdown calculations with automatic pause/resume on OS sleep, lock, and wake events.
- **Comprehensive Settings Dashboard**:
  - Work interval presets (25m Pomodoro, 50m, 60m default, up to 120m).
  - Break length presets (5m, 10m, 15m default).
  - Companion selector with real-time live preview and test chime.
  - Entrance side selection (Alternate Random, Right, Left).
  - Sound volume toggles and Launch on Startup (`openAtLogin`).
- **System Tray Integration**: Background tray menu with live countdown tooltip, quick status context menu, instant break trigger, and pause/resume controls.

---

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Run the App in Development
```bash
npm start
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Build Executables
```bash
# Package directory build
npm run pack

# Build platform installer (.exe on Windows, .dmg on macOS, .AppImage on Linux)
npm run dist
```

---

## Project Structure

```
├── src/
│   ├── assets/               # High-res sprites (Dinki, Poko, Ren), icons, ICOs
│   ├── renderer/
│   │   ├── audio.js          # Web Audio API chime synthesizer
│   │   ├── characters.js     # Companion definitions and dialogue presets
│   │   ├── overlay.html      # Fullscreen break overlay markup
│   │   ├── overlay.css       # Sharp minimalist overlay stylesheet
│   │   ├── overlay.js        # Overlay animation, input capture, and skip logic
│   │   ├── settings.html     # Settings & companion preview markup
│   │   ├── settings.css      # Dark obsidian settings stylesheet
│   │   └── settings.js       # Settings controller & IPC synchronization
│   ├── main.js               # Electron main process & IPC coordinator
│   ├── preload.js            # Secure context-isolated preload bridge
│   ├── scheduler.js          # Drift-free break timer state machine
│   ├── settingsWindow.js     # Settings BrowserWindow controller
│   ├── store.js              # Persistent JSON configuration store
│   ├── tray.js               # System tray manager & menu controller
│   └── windowManager.js      # Multi-monitor kiosk overlay lifecycle manager
├── test/
│   └── scheduler.test.js     # Unit test suite for scheduler & store
└── package.json
```

---

## Controls During Break

- **Hold to Skip**: Click and hold the **Hold to Skip** button or hold **Spacebar** for 5 seconds until the linear charge gauge completes.
- **Break Completion**: The overlay will play a completion chime, slide offscreen, and return full system control automatically when the countdown reaches `00:00`.

---

## License

MIT
