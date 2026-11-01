---
title: Scene Deck (separate-window triggering)
description: From a separate console window, instantly switch between 8 variations of the current picture with a key.
---

The **Scene Deck** is a separate console window you can use like Resolume's clip grid.
Taking the Patch currently shown in the main window as the base (BASE), it automatically builds **8 slots with the same Generator composition but different parameters**, and lets you trigger them with a single key.

- The intended setup is: main window = output to the projector / stream, Deck = your hands-on console.
- The Deck window starts neither audio input nor the rendering engine (no microphone permission dialog, and no constant GPU load).
- It talks to the main window only through a `BroadcastChannel` inside the same browser. Neither the hosted nor the local version needs a relay server or any other setup.

## How to open it

Open it in any of these ways.

- Press the **`S`** key in the main window
- The **Scene Deck** button in the control panel
- Open a URL with `?deck=1` (or `?deck=true`)

There is only ever one Deck opened with `S` or the button. If it is already open, that window just comes to the front and is not recreated (your bank is not lost).

:::caution
The Deck can only talk to a main window opened in **the same browser (same profile) and the same URL origin**.
Also, if you have two or more main windows open in the same browser, Deck operations reach both. Keep a single main window.
:::

## Basic flow for a live show

1. Open the main window, adding `?ui=hide` if needed (panels hidden).
2. Press **`F`** in the main window to go full screen.
   Because of browser restrictions, full screen **requires an action in the main window**. You cannot enter it from the Deck.
3. Press **`S`** in the main window to open the Deck, and move the Deck window to your own screen.
4. From then on, everything (triggering, seed gacha, Hue, background, tap tempo, lock) can be done from the Deck.

## Reading the screen

| Area | Details |
| --- | --- |
| Header | A key cheat sheet and the toolbar (transition presets `cut` / `default` / `slow`, `auto`, the auto-advance interval, `seq` / `rnd`, `R rebuild`, `G gacha`, bank slots `A` to `H`, `MIDI`, `learn`). |
| Bank row | `JSON copy` and `menu` (JSON paste, adopt seed, clear current). → [Saving banks](../banks/) |
| MIDI row | MIDI devices and assignments. → [MIDI controllers](../midi/) |
| Console row | `Q gacha`, `W details`, Hue (fixed toggle and slider), background, `TAP` `÷2` `×2` `AUTO`, and the Timeline lock. |
| Status | BPM, `AUDIO STOPPED` (when the main window's audio input is stopped), and the state of auto-advance and MIDI. |
| Grid | 8 slots in 4 columns × 2 rows (`BASE`, `V1` to `V7`). Shows a thumbnail plus a label and what changed (detail). The slot currently shown is highlighted. |

If WebGL2 is available, thumbnails are rendered one by one (in environments without it they stay as color chips).
For a Patch that uses an image (stamp), the image is transparent in the thumbnail, so it looks almost empty.

## Triggering

| Action | Result |
| --- | --- |
| `1` to `8` | Show that slot (with the transition preset selected in the toolbar) |
| `Shift` + `1` to `8` | Ignore the preset and show with `cut` |
| `←` `→` `↑` `↓` | Move the cursor (4 × 2) |
| `Enter` / `Space` | Show the slot under the cursor |
| `X` | Cycle the transition preset `cut` → `default` → `slow` |
| Click a slot | Show that slot |

The bank (8 slots) is not rebuilt on every trigger, so you can always go back to "that number 3 from before".

## Rebuilding the bank

| Action | Result |
| --- | --- |
| `R` / `R rebuild` | Rebuild the 8 slots using the **Patch currently shown** in the main window as BASE |
| `G` / `G gacha` | Keep BASE and redraw only the variation randomness (bankSeed) |

When the main window's picture changes to something outside the bank (via `R` in the main window, a CLI operation, etc.), the Deck shows **BASE CHANGED — R で再生成** ("regenerate with R").
You can keep going with that bank, or rebuild from the current picture with `R`.

## Auto-advance

Automatically shows the next slot at a fixed interval.

| Action | Result |
| --- | --- |
| `A` / `auto` button | Auto-advance ON / OFF |
| `M` / interval button | Switch the unit between seconds ⇄ bars |
| `-` / `=` | Decrease / increase the interval (seconds: 2 to 600 in 5-second steps, default 30; bars: 1 to 256 in 1-bar steps, default 8) |
| `seq` / `rnd` button | Advance in order / at random (random picks from slots other than the current one) |

- If you trigger by hand, auto-advance continues from that position (the seconds timer is also reset).
- The bar unit only advances while the main window's tempo is locked (`LOCK` or `TAP`). When it is not, it waits and shows **bars オートは tempo LOCK が必要です — 待機中** ("bars auto needs tempo LOCK — waiting").
- It pauses while the connection to the main window is lost.

## Console (operating the main window from the Deck)

| Key | Button | Action |
| --- | --- | --- |
| `Q` | `Q gacha` | Redraw the seed (equivalent to `R` in the main window) |
| `W` | `W details` | Redraw only the details (equivalent to `D` in the main window) |
| `B` | Background button | Toggle background black ⇄ transparent |
| `H` | Hue fixed button | Toggle Hue fixed ⇄ cycle. When entering fixed, it fixes at the current hue |
| `[` / `]` | Hue slider | Fixed Hue -15° / +15° |
| `T` | `TAP` | Tap tempo |
| `,` / `.` | `÷2` / `×2` | Halve / double the tempo |
| `/` | `AUTO` | Return the tempo to auto-detection |
| `L` | Lock button | Lock the Timeline for 30 seconds from now ⇄ release. While locked, Deck triggering is also rejected |
| `F` | — | Full screen for the **Deck window** (not the main window) |

:::note[Japanese-layout keyboards]
Deck keys are detected by the **physical position of the key (based on a US layout)**, not by the character.
On a Japanese (JIS) layout, `[` is at the **`@`** key, `]` is at the **`[`** key, and `=` is at the **`^`** key.
Use the number keys in the top row of the keyboard for `1` to `8`, not the numeric keypad.
:::

## Warnings shown in the Deck

| Message | Meaning and fix |
| --- | --- |
| メイン窓が見つかりません (main window not found) | The main window is closed, or is open in a different browser / URL. |
| メイン窓の Synth が動いていません（WebGL2 が必要です） (the main window's Synth is not running; WebGL2 is required) | Rendering is not running in the main window. |
| BASE CHANGED — R で再生成 (regenerate with R) | The main window's picture changed to something outside the bank. |
| STALE: generator 更新あり。R で live から取り直し (generators updated; re-fetch from live with R) | A saved bank no longer matches the current Generators after an update (it will not crash, but every variation becomes equivalent to BASE). |
| AUDIO STOPPED | The main window's audio input is stopped. Press **▶ Click to start audio** in the main window. |
| timeline is locked for Ns | A trigger was rejected because the Timeline is locked. |
