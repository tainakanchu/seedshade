---
title: Troubleshooting / FAQ
description: No response to audio, "WebGL2 is required", slowness, the Deck won't connect, the CLI won't connect, and more.
---

## It does not react to audio

Check in order from the top.

1. **Is the top right of the panel showing `idle`?** If `idle`, audio input is stopped. Press **▶ Click to start audio**.
   Browsers may block automatic start right after the page opens. In that case a single click starts it.
2. **Is an error shown?** It appears in red at the top of the panel.

   | Message | Meaning and fix |
   | --- | --- |
   | `Microphone permission was denied. …` | Audio input was denied. Allow the microphone from the site settings in the address bar, then press the button again. |
   | `No audio input device was found.` | There is no input device. Check the device connection. |
   | `The selected audio device could not be opened (in use by another app?).` | Another app is holding the device exclusively, or it cannot be opened. |
   | `The selected audio device is unavailable. Pick a different one.` | The device you had selected is gone. Choose again under **Input device**. |
   | `This browser does not support audio capture.` | The browser does not support audio capture, or the page is not opened over a secure connection (HTTPS / localhost). |

3. **Is `NO SIGNAL` shown?** Audio input is running but no sound is arriving. Check that **Input device** is correct and that the playback output is going to the right place.
   To capture a track's audio you need a loopback ([desktop audio](../live/obs/#reacting-to-desktop-audio)).
4. **The level meter moves but the visuals react weakly.** Raise **Gain**.
5. **You are using an OBS browser source.** A browser source may not get audio input ([OBS](../live/obs/)).

## When the audio stops, the visuals almost stop too

This is by design. In silence, visual time runs at about 5% of normal speed and the beat reactions also stop. They return when sound comes back.

## "WebGL2 is required" error

Seedshade cannot render without WebGL2. (In the app this message is shown in Japanese as "WebGL2 が必要です".)

- In the browser settings, check that hardware acceleration (for example "Use graphics acceleration when available") is enabled.
- In Chrome / Edge, you can check whether WebGL2 is enabled at `chrome://gpu`.
- It may not work inside a virtual machine or over a remote desktop.

## Slow or stuttering

- When it is heavy, the internal render resolution drops automatically (you can check it under `quality` in the Timeline panel). If it is still heavy, switch to a lighter picture (another seed or another Deck slot).
- Plug a laptop into power and turn off power-saving mode.
- Close other heavy tabs and apps.
- The canvas resolution is capped at a device pixel ratio of 1.5. Displays with a higher resolution than that do not add load. Making the window (or the source in OBS) smaller makes it lighter.

## The panels or the cursor disappeared

- If you leave the mouse still for about 3 seconds, the control panel and the cursor fade out automatically. Move the mouse to bring them back.
- Pressing `H` hides the control panel and the Timeline panel. Press `H` again to bring them back. The same applies when opened with `?ui=hide`.

## The look reverts when I reload

Only the seed shown under **Look** in the panel is saved. 🧬 (redrawing the details), the Timeline's `Apply`, seeds and Patches sent from the CLI, and Deck triggers are not saved.
To keep a look, save it to a Deck bank (`A` to `H`) or turn it into a [recipe](../ai/recipe-set/).

## Settings from the URL stick the next time

Values specified by URL parameters (`seed`, `hue`, `bg`, and so on) are saved as they are. They carry over the next time you open without the URL, so reset them in the panel if you want to go back.

## A warning appears when opening from another LAN device

The local version (`pnpm dev`) runs over HTTPS with a self-signed certificate, so the browser shows a warning. Proceed via "Advanced" → "Proceed to ...".
The microphone only works over a secure connection (HTTPS or localhost), so you cannot switch to HTTP.

## Scene Deck

| Symptom | Fix |
| --- | --- |
| The window does not open when I press `S` | Check the browser's popup blocker and allow popups for this site. |
| "メイン窓が見つかりません" (main window not found) | Open the main window in the same browser and the same URL (origin). It cannot connect across different browsers or profiles, or a hosted-and-local combination. |
| Cannot go full screen from the Deck | Full screen requires pressing `F` in the main window. `F` in the Deck makes the Deck's own window full screen. |
| Triggers are rejected (`timeline is locked for …`) | The Timeline is locked. Release it with `L` in the Deck. |
| `[` `]` `=` do not work | On a JIS layout they are the keys at the `@` `[` `^` positions ([Shortcuts](../reference/shortcuts/)). |
| Two screens switch at the same time | You have two main windows open in the same browser. Keep only one. |

## MIDI does not work

- Did you press the **MIDI** button in the Deck window? (The main window does not receive MIDI.)
- Use Chrome / Edge. Safari is not supported, and Firefox needs an add-on.
- Check whether another app (a DAW, etc.) is holding the device exclusively.
- If the nanoPAD2 stops sending its usual notes to other apps, unplug and replug the USB cable ([MIDI](../live/midi/)).

## Cannot connect from the CLI / AI

| Error | Cause and fix |
| --- | --- |
| `no synth connected` | The main window is not connected to a relay. Check that the URL has `?room=<id>` (hosted) or `?bridge=1` (local), and that the room id matches the CLI's. A window with only `mirror=1` does not respond. |
| `no synth connected` even with `?bridge=1` on the hosted version | The local relay rejects connections from the hosted version. Use `?room=` on the hosted version ([Hosted vs. local](../reference/hosted-vs-local/)). |
| Cannot connect (`ECONNREFUSED`, etc.) | On the local version, `pnpm bridge` is not running. |
| `timeout waiting for synth` | The main window's tab may have gone to the background and stopped rendering. Bring the main window to the front. |
| `vj-gen: --url が指定されておらず…` ("--url was not specified…") | `vj-gen` / `vj-tweak` / `vj-recipe apply` require a connection target. Specify `--url` or `VJ_URL`. |
| The URL created by `room` is `seedshade.<account>.workers.dev` | Recreate it with `--host seedshade.tainakanchu.com`. |
| An error about a nonexistent Generator / parameter | The catalog cache may be stale. Add `--refresh-catalog`. |

## A saved Patch cannot be applied

When a Generator is updated its version goes up, and a Patch specifying the old version fails validation (a `generatorVersion` mismatch).
For looks you want to keep long term, save them as a [recipe](../ai/recipe-set/) rather than a Patch. A Deck bank does not fail; it shows `STALE` ([Saving banks](../live/banks/#if-you-see-stale)).
