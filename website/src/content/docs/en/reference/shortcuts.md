---
title: Keyboard shortcuts
description: Keyboard shortcuts for the main window and the Scene Deck window.
---

In both windows, keys do not respond while a text field or select has focus, or while `Ctrl` / `Alt` / `⌘` is held.

## Main window

| Key | Action |
| --- | --- |
| `H` | Show / hide the panels (control panel + Timeline panel) |
| `F` | Toggle full screen |
| `B` | Toggle background black ⇄ transparent |
| `R` | Redraw the seed (🎲) |
| `D` | Redraw only the details, keeping the same structure (🧬) |
| `S` | Open the Scene Deck window (brings it to the front if already open) |
| `T` | Tap tempo |

In the seed input field, `Enter` confirms.

## Scene Deck window

| Key | Action |
| --- | --- |
| `1` to `8` | Show a slot (with the selected transition preset) |
| `Shift` + `1` to `8` | Show a slot with `cut` |
| `←` `→` `↑` `↓` | Move the cursor (4 × 2) |
| `Enter` / `Space` | Show the slot under the cursor |
| `X` | Cycle the transition preset `cut` → `default` → `slow` |
| `Q` | Redraw the seed (equivalent to `R` in the main window) |
| `W` | Redraw only the details (equivalent to `D` in the main window) |
| `B` | Toggle background black ⇄ transparent |
| `H` | Toggle Hue fixed ⇄ cycle (when entering fixed, fixes at the current hue) |
| `[` / `]` | Fixed Hue -15° / +15° |
| `T` | Tap tempo |
| `,` / `.` | Tempo ÷2 / ×2 |
| `/` | Return the tempo to auto-detection (AUTO) |
| `L` | Lock the Timeline for 30 seconds from now ⇄ release |
| `A` | Auto-advance ON / OFF |
| `M` | Auto-advance unit (seconds ⇄ bars) |
| `-` / `=` | Decrease / increase the auto-advance interval (keypad `-` / `+` also work) |
| `R` | Rebuild the bank from the main window's current Patch |
| `G` | Keep BASE and redraw only the bank's randomness |
| `Shift` + `S` | Save the current bank to the next empty slot (or `A` if none) |
| `F` | Full screen for the Deck window |
| `Esc` | End MIDI learn |

:::note[Japanese (JIS) layout keyboards]
Deck keys are detected by the physical position of the key (based on a US layout), not by the character.
On a JIS layout, `[` → the **`@`** key, `]` → the **`[`** key, and `=` → the **`^`** key. `,` `.` `/` `-` are as printed.
`1` to `8` are the number keys in the top row of the keyboard (the keypad digits cannot be used).
:::

### Mouse actions (Deck)

| Action | Result |
| --- | --- |
| Click a slot | Show that slot |
| Click `A` to `H` | Recall that bank |
| `Shift` + click `A` to `H` | Save the current bank (no overwrite confirmation) |
| Right-click / long press `A` to `H` | Edit the bank's name |
