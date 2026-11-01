---
title: Screen & keys
description: Every control panel item, and the keyboard shortcuts of the main window.
---

The main window overlays two panels on the full-screen visuals.

- **Top left: control panel** (`SEEDSHADE`) — basic controls such as audio input, tempo, seed, color, and background
- **Top right: Timeline panel** — advanced controls such as scheduled events, direct Patch editing, images, and recording ([Timeline panel](../timeline/))

## Showing and hiding the panels

| State | Action | Details |
| --- | --- | --- |
| Hide / show | **`H`** | Hides **both** the control panel and the Timeline panel. Press again to bring them back. |
| Hide from the start | `?ui=hide` in the URL | For OBS and live output. You can bring them back with `H`. |
| Auto-fade | Leave the mouse still for about 3 seconds | **Only the control panel** becomes transparent, and the mouse cursor disappears. Move or click the mouse, or press a key, to bring it back. |
| Collapse Timeline | `▾ close` on the Timeline | Shrinks to a small, heading-only display. `▸ open` restores it. |

:::caution
The Timeline panel does not auto-fade. On a live output screen, hide it with **`H`** or `?ui=hide`.
:::

## Control panel items

Listed from top to bottom.

| Item | Details |
| --- | --- |
| Header | `live` (audio input running) / `idle` (stopped). |
| **▶ Click to start audio** / **■ Stop audio** | Starts / stops audio input. Press it if audio did not start automatically after launch. |
| Level meter | Input level before Gain (dBFS). It has a -60 to 0 scale, a target band (-18 to -6), and a peak-hold line. |
| `CLIP` | Lights for about 1.5 seconds when the input saturates. |
| Beat dot | Flashes each time a beat is detected. |
| `NO SIGNAL` | Shown when audio input is running but near silence (below about -60 dBFS) lasts 3 seconds. |
| `B` / `M` / `T` | Bass, mid, and treble levels (after Gain). The visuals are driven by these values. |
| **Tempo** | The current BPM, a status chip (`LOCK` / `SEARCH…` / `TAP`), the beat position in the bar (4 dots, the leftmost is beat 1), and the `TAP` `×2` `÷2` `AUTO` buttons. → [Tempo sync](../tempo/) |
| **Look** | The current seed, the seed input field, 🎲 (draw a new seed), and 🧬 (redraw only the details). → [Seeds](../seed/) |
| **Input device** | Choose the audio input device. Changing it while running switches immediately. |
| **Gain** | Multiplier for the signal used for analysis (0.5 to 4, default 1.5). It changes how strongly the visuals react. |
| **Hue** | `Cycle` (the hue keeps rotating slowly) / `Fixed` (fixed from 0 to 360° with the slider). |
| **Background** | `Black` (black background) / `Transparent` (transparent background). Transparent is for overlaying in OBS. → [OBS](../../live/obs/) |
| **🎲 Auto-gacha** | When `On`, redraws the seed automatically every set number of bars (1 to 512 bars, default 32). → [Tempo sync](../tempo/#auto-gacha-every-n-bars) |
| **Scene Deck** | Opens the console in a separate window. → [Scene Deck](../../live/scene-deck/) |
| **⛶ Fullscreen** | Toggles full screen. |

A shortcut cheat sheet is shown at the very bottom of the panel.

## Main window keyboard shortcuts

These do not respond while a text field or select has focus, or while `Ctrl` / `Alt` / `⌘` is held.

| Key | Action |
| --- | --- |
| `H` | Show / hide the panels (control + Timeline) |
| `F` | Toggle full screen |
| `B` | Toggle background black ⇄ transparent |
| `R` | Redraw the seed (same as 🎲) |
| `D` | Redraw only the details, keeping the same structure (same as 🧬) |
| `S` | Open the Scene Deck window (brings it to the front if already open) |
| `T` | Tap tempo |

The Scene Deck window has its own shortcuts. See [Keyboard shortcuts](../../reference/shortcuts/) for the full list.

## Dropping files onto the screen

Drag and drop an image file (PNG / JPG / WebP / GIF / SVG / AVIF) anywhere in the main window to register it under **Images** in the Timeline panel.
To use a registered image in the visuals, see [Timeline panel](../timeline/#images-stamp-an-image).
