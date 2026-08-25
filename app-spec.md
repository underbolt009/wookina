# Waifu Break Enforcer — Electron Spec Sheet

## 1. Overview

A desktop app that, every 60 minutes, forces a 15-minute break by covering
the entire screen with a fullscreen overlay. An anime character slides in
dramatically from the side of the screen to announce the break, stays for
its duration, then slides out and returns control to the user.

**Platforms:** Windows, macOS, Linux (Electron handles all three from one codebase)

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Shell | Electron | Chromium + Node, mature multi-window/overlay APIs |
| UI | HTML/CSS/JS (renderer process) | Runs inside each `BrowserWindow` |
| Animation | CSS keyframes/transforms, or GSAP for finer timeline control | See §6 |
| State/timer | Main process, plain `setInterval`/`setTimeout` + `powerMonitor` | See §5 |
| Packaging | `electron-builder` | Produces `.exe`, `.dmg`, `.AppImage` |
| Autostart | `app.setLoginItemSettings` or `auto-launch` npm package | Launch on login |

---

## 3. Architecture

```
main process (Node)
 ├─ scheduler.js      → hourly trigger, 15-min countdown, sleep/idle handling
 ├─ windowManager.js  → creates/destroys one overlay BrowserWindow per display
 └─ ipc handlers       → "skip requested", "break finished", "settings changed"

renderer process (per monitor, one overlay window each)
 ├─ index.html         → scrim + character stage + countdown UI
 ├─ animations.js       → entrance / idle / exit sequences
 └─ overlay.css
```

Only the main process holds the real timer state — renderers are dumb
display surfaces that just play the animation and report user actions
(e.g. skip-hold) back over IPC.

---

## 4. Window Configuration

One `BrowserWindow` per display, all created/destroyed together.

```js
const { BrowserWindow, screen } = require('electron')

function createOverlayWindows() {
  return screen.getAllDisplays().map(display => {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      fullscreenable: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    })
    win.setAlwaysOnTop(true, 'screen-saver') // outranks other fullscreen apps on macOS
    win.setKiosk(true)
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    win.loadFile('overlay.html')
    return win
  })
}
```

| Option | Value | Why |
|---|---|---|
| `frame` | `false` | No title bar / chrome |
| `transparent` | `true` | Scrim/character render over desktop, not a solid box |
| `alwaysOnTop` | `true`, level `screen-saver` | Beats other apps, including fullscreen ones (macOS) |
| `kiosk` | `true` | Discourages Alt-Tab / Cmd-Tab away |
| `skipTaskbar` | `true` | Doesn't clutter taskbar/dock |
| `setVisibleOnAllWorkspaces` | `true` | Follows user across virtual desktops (macOS Spaces) |

---

## 5. Timer & Scheduling Logic

- Main process runs a repeating check (e.g. every 30s) against an
  `nextBreakAt` timestamp rather than a naive `setInterval(fn, 60*60*1000)`,
  so drift from sleep/wake doesn't accumulate.
- Use `powerMonitor` to pause the countdown to the *next* break while the
  machine is asleep or locked, so it doesn't fire the instant the user
  wakes their laptop:

```js
const { powerMonitor } = require('electron')
powerMonitor.on('suspend', () => scheduler.pause())
powerMonitor.on('resume', () => scheduler.resume())
powerMonitor.on('lock-screen', () => scheduler.pause())
powerMonitor.on('unlock-screen', () => scheduler.resume())
```

- On trigger: call `createOverlayWindows()`, play entrance animation,
  start a 15-minute countdown, then play exit animation and destroy the
  windows.

---

## 6. Animation Spec

Three-phase sequence, per overlay window:

| Phase | Duration | Detail |
|---|---|---|
| Scrim fade-in | ~200ms | Background dims/blurs first to build tension |
| Character entrance | ~500–700ms | `translateX` from off-screen to rest position, easing `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot/bounce) |
| Idle loop | duration of break | Subtle breathing/blink loop (2–3 frame swap or rigged animation) |
| Countdown reveal | after entrance settles | Fades/slides in once character is in place |
| Exit | ~400ms | Reverse of entrance, character exits back off-screen |

Alternate character side (left/right) per trigger for variety if desired —
trivial toggle in `windowManager.js` state.

**Recommendation:** plain CSS transforms are enough to ship v1. If the
bounce/overshoot needs finer control or you move to rigged (Live2D/Rive)
art later, swap in GSAP or the Rive runtime without touching the
scheduler/window logic — they're decoupled.

---

## 7. Character Assets

- **Do not use existing copyrighted anime characters.** Requires either
  commissioned original art, a licensed sprite pack (permissive/commercial
  licenses exist on marketplaces like itch.io), or your own rig.
- Minimum viable asset set: 1 idle pose + 2–3 frame blink/breathing swap.
- Format: PNG sequence or sprite sheet for CSS approach; `.riv` file if
  using Rive; `.moc3` + textures if using Live2D Cubism.

---

## 8. Break Enforcement / Escape Hatch

Full OS-level input blocking (mouse/keyboard) requires native hooks,
elevated permissions, and risks trapping the user during something urgent
— **not recommended**. Instead:

- Overlay is *visually* total (fullscreen, on top, kiosk mode) but doesn't
  intercept raw input system-wide.
- A "skip" control requires a deliberate action with real friction — e.g.
  hold a button for 5–10 seconds (tracked via `mousedown`/`mouseup` timing
  in the renderer, reported to main via IPC) — so it's not reflexively
  dismissible but never literally locks the user out.

---

## 9. Suggested File Structure

```
waifu-break/
├─ package.json
├─ src/
│  ├─ main.js
│  ├─ scheduler.js
│  ├─ windowManager.js
│  ├─ preload.js
│  └─ renderer/
│     ├─ overlay.html
│     ├─ overlay.css
│     ├─ animations.js
│     └─ assets/            # character art, sfx
└─ build/                    # electron-builder icons/config
```

---

## 10. Core Dependencies

```json
{
  "dependencies": {
    "electron": "^latest",
    "auto-launch": "^latest"
  },
  "devDependencies": {
    "electron-builder": "^latest"
  }
}
```
(Pin actual versions at setup time.)

---

## 11. Packaging & Distribution

- `electron-builder` targets: `nsis` (Windows), `dmg` (macOS), `AppImage`
  (Linux).
- Auto-launch on login via `auto-launch` package or
  `app.setLoginItemSettings({ openAtLogin: true })`.
- Code-signing needed for macOS Gatekeeper / Windows SmartScreen if
  distributing beyond your own machine.

---

## 12. Performance Note

Electron's idle footprint (~120–200MB RAM) is the trade-off for this
spec's speed of development. If idle resource use becomes a real concern
later, the same UI layer (HTML/CSS/JS or Rive) can be ported to a Tauri
shell with a smaller migration than rewriting from scratch — scheduler and
animation logic are largely stack-agnostic.

---

## 13. Open Questions / Future Enhancements

- Settings UI (adjust interval/duration, mute sfx, choose character)
- Per-day break count / stats
- Optional sound effect on entrance
- Multiple character/outfit variety to avoid fatigue
