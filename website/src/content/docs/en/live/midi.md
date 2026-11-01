---
title: MIDI controllers
description: Control the Scene Deck with MIDI pads. KORG nanoPAD2 Native mode support, and assignment by learn.
---

The Scene Deck window accepts **Web MIDI**. You can trigger slots and tap tempo from a pad controller.

- MIDI is received **only in the Scene Deck window** (not in the main window).
- Web MIDI does not need focus, so it **works even when the Deck window is in the background**.

## Supported browsers

| Browser | Support |
| --- | --- |
| Chrome / Edge | Supported out of the box |
| Firefox | Requires the site-permission add-on for Web MIDI (Firefox 108 or later) |
| Safari | Not supported. The Deck works, but shows `MIDI 非対応` ("MIDI not supported") |

## Getting started

1. Connect the controller to the PC, then open the Scene Deck.
2. Press the **MIDI** button in the toolbar.
3. The browser asks for permission to use MIDI (including SysEx); allow it.
   If you deny SysEx, it reconnects without SysEx and shows `SysEx なし` ("no SysEx"). Normal notes / CCs work, but the nanoPAD2 auto-setup below does not.
4. The button becomes `MIDI on`, and the MIDI row shows the connected device names (`no inputs` if there are none).

If you denied permission, the button becomes `MIDI retry`. Allow MIDI in the browser's site settings and press it again.

## KORG nanoPAD2

The nanoPAD2 works with almost no setup; just plug it in.

1. When MIDI is enabled, it finds the nanoPAD2 via SysEx and switches it to **Native KORG Mode**. On success a `native` badge appears.
2. If it could not enter Native mode, it reads the device's settings (Scene Data Dump) and generates the assignments automatically from the pads' note numbers (`dump` badge).
3. When it says **pad 1 を叩いて確認してください** ("hit pad 1 to confirm"), tap pad number 1.
   If it was a different pad than expected, it shows **ズレています。learn しますか** ("mismatch — learn?"), and you can reassign with `learn`.

### Default assignments (Native mode)

| nanoPAD2 | Deck action |
| --- | --- |
| Bottom 8 pads (Note 72–79 / ch 2) | Show slots 1 to 8 |
| Top 8 pads (Note 64–71 / ch 2) | Show slots 1 to 8 with `cut` |
| Scene button (CC 57 / ch 16) | Tap tempo |
| X-Y pad touch (CC 11 / ch 16) | Show the slot under the cursor |

- If top and bottom feel reversed, turn on **上下入替** ("swap top/bottom") in the MIDI row.
- The X / Y axes have nothing assigned by default. With learn you can assign them to Hue or the auto-advance interval.
- Touch Scale notes are ignored.

### Scene LEDs (Native mode only)

| LED | Meaning |
| --- | --- |
| Scene 1 | Connected to the main window |
| Scene 2 | Deck auto-advance is ON |
| Scene 3 | Tempo is locked |
| Scene 4 | Learn in progress. Blinks on error |

:::caution[Leaving Native mode]
When you close (or reload) the Deck window, it sends a signal to return the nanoPAD2 from Native mode.
If it did not return, for example because the browser was force-quit, the nanoPAD2 stays in Native mode and other apps stop receiving its usual notes.
In that case, **unplug and replug the USB cable, or power-cycle it**.
:::

## Other controllers (learn)

For controllers other than the nanoPAD2, or if you do not want Native mode, assign with **learn**.

1. Enable MIDI, then turn **learn** ON in the toolbar.
2. From the actions listed in the MIDI row (`pad 1` to `pad 8`, `pad N cut`, `cursor fire`, `transition`, `auto`, `auto mode`, `interval +`, `interval -`, `interval abs`, `rebuild`, `gacha bank`, `tap`, `seed gacha`, `details`, `hue`), choose the one to assign.
3. Hit a pad / turn a knob on the controller.
4. If the same trigger was already assigned to another action, it is overwritten and **上書きしました（既存のトリガー）** ("overwritten (existing trigger)") is shown.
5. Press **Esc**, or press **learn** again, to finish. Keyboard operation keeps working during learn.

`interval abs` (the auto-advance interval) and `hue` (fixed Hue) suit the continuous values of knobs and faders. The others act as buttons (the moment of pressing).

### Cut by velocity

Enter a number from 1 to 127 in `cut ≥` in the MIDI row, and hitting a pad at that strength or harder shows the slot with `cut`, while a softer hit uses the selected preset. Leave it empty to turn it off.

## Saving and carrying assignments

- Assignments are saved automatically in the browser's `localStorage` (key `seedshade-deck-midi-v1`). You can also give them a name.
- Use `export` in the MIDI row to copy the JSON to the clipboard, then paste the JSON into the text field of a Deck on another PC and press `import` to use the same assignments.
- Uncheck `Native` to use the nanoPAD2 without switching it to Native mode.
