---
title: Venue setup checklist
description: What to check before the show.
---

A checklist so you do not scramble at the venue. Work through it from the top.

## Beforehand (at home)

- [ ] Confirmed that Seedshade renders on the PC and browser you will use for the show (Chrome / Edge recommended), and "WebGL2 が必要です" ("WebGL2 is required") does not appear.
- [ ] Confirmed it is not too heavy at the same resolution as the show (the Timeline panel's `quality` does not keep dropping a lot).
- [ ] Noted the seeds you want to use. If needed, saved Scene Deck banks to `A` to `H` ([Saving banks](../banks/)).
- [ ] If using a logo as a stamp, registered the image on the show PC and browser (images are stored per browser).
- [ ] If using a MIDI controller, confirmed the assignments on the show PC ([MIDI controllers](../midi/)).
- [ ] If using the hosted version, confirmed the venue has internet access. If it might not, prepared a local version (`pnpm build` → `pnpm preview`, etc.).

:::note
Settings, banks, MIDI assignments, and images are stored **per browser and origin (URL domain)**.
What you prepared on `localhost` at home is not visible in the hosted version (`seedshade.tainakanchu.com`). Prepare using the same URL you will open at the show.
:::

## At the venue: audio

- [ ] Connected the mixer's booth output / REC output to the audio interface's line input.
- [ ] Chose the correct input under **Input device**.
- [ ] With sound playing, the level meter reaches the target band (-18 to -6 dBFS). `CLIP` does not light. `NO SIGNAL` does not appear.
- [ ] The `B` `M` `T` bars move and the visuals react. If the reaction is weak, raised **Gain**.
- [ ] Tempo reaches `LOCK`. For tracks where it does not, confirmed you can match it with `TAP` (`T`).

## At the venue: visuals

- [ ] Moved the main window to the output display (projector / capture).
- [ ] If needed, opened with a URL that has `?ui=hide` (even if panels show, `H` hides them).
- [ ] If overlaying in OBS, made the background transparent (`?bg=transparent` or `B`) ([OBS](../obs/)).
- [ ] Pressed **`F`** in the main window to go full screen (you cannot do this from the Deck).
- [ ] Left the mouse still and confirmed the cursor disappears (about 3 seconds).
- [ ] Pressed **`S`** in the main window to open the Scene Deck and moved it to your own screen.
- [ ] No warnings such as "メイン窓が見つかりません" (main window not found) or "AUDIO STOPPED" appear in the Deck.
- [ ] Only one main window is open (opening two in the same browser makes Deck operations reach both).

## At the venue: power saving and notifications

- [ ] Turned off PC sleep, screen off, and the screensaver.
- [ ] Turned off OS and app notifications (they can appear over full screen).
- [ ] Plugged the laptop into power (on battery the GPU may be throttled and get slow).

## If something goes wrong during the show

| Symptom | What to do first |
| --- | --- |
| The visuals stopped reacting to audio | Show the main window's panel with `H` and check `live` / `NO SIGNAL`. If stopped, press **▶ Click to start audio**. |
| You do not like the picture | Escape to the bank with `1` to `8` in the Deck, or use `Q` (gacha) / `W` (details). |
| The tempo drifted | Tap again with `T`, or fix the multiplier with `,` / `.`. Return to automatic with `/`. |
| You do not want a key moment touched | Lock for 30 seconds with `L` in the Deck (this also stops Deck triggering). |
| It got heavy | The resolution drops automatically. If it persists, switch to a lighter picture (another Deck slot or another seed). |
