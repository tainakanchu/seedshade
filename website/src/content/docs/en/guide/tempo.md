---
title: Tempo sync (BPM)
description: Automatic BPM detection, tap tempo, ×2 / ÷2, and auto-gacha every N bars.
---

Seedshade estimates BPM from the input sound in real time and builds a beat and bar grid.
This grid is used for beat-driven glitches, the visual speed, Auto-gacha, bar-based Timeline events, and the Scene Deck's bar-based auto-advance.

## Reading the Tempo section

The **Tempo** section of the control panel shows the following.

| Display | Meaning |
| --- | --- |
| BPM value | The current BPM. `—` when not yet detected. |
| `SEARCH…` | Auto-detecting (not locked yet). |
| `LOCK` | The tempo has been settled by auto-detection. |
| `TAP` | Running on a tempo you set manually by tapping. |
| 4 dots | The beat position in the bar. The leftmost (beat 1) is highlighted. |

## Auto-detection

- BPM is estimated by autocorrelation from the onsets of the low end (the kick). It is **strong on tracks with a regular kick, like four-on-the-floor**.
- It needs at least 3 seconds of audio for analysis, and takes a few seconds to lock.
- The estimated range is 60 to 200 BPM, and the result is folded by doubling / halving into the range 70 to 180 BPM.
  If a half-time / double-time track ends up at the wrong multiple, fix it with `×2` / `÷2`.
- Once locked, the grid **free-runs**. It keeps ticking through breakdowns (silent sections), and gently re-aligns its phase when the track returns.

## Buttons and keys

| Button | Key | Action |
| --- | --- | --- |
| `TAP` | `T` | Tap along with the music two or more times to set BPM from the interval. The median of the last 6 intervals is used, and a gap of 2 seconds or more restarts the count. The grid keeps running even if the audio stops. |
| `×2` | — | Doubles the tempo. |
| `÷2` | — | Halves the tempo. |
| `AUTO` | — | Returns to auto-detection (the multiplier also returns to 1x). |

The `×2` / `÷2` multiplier ranges from 0.25x to 4x. From the Scene Deck window you can also use `,` (÷2), `.` (×2), `/` (AUTO), and `T` (tap).

:::tip
On tracks without a clear kick (ambient, breakbeats, live playing, and so on), auto-detection may be unstable.
In that case, setting it manually with `TAP` is the reliable option.
:::

## Auto-gacha every N bars

When **🎲 Auto-gacha** is `On`, the seed is redrawn automatically every set number of bars.

- The number of bars is set in the numeric field on the right, from 1 to 512 bars (default 32). 1 bar = 4 beats.
- **It only advances while a BPM value is shown**. It does not redraw while BPM is `—` (not detected).
  Even during `SEARCH…`, bars are counted if a provisional BPM is shown, so if you want it to follow the structure of the track reliably, check for `LOCK` or match it with `TAP`.
- You can also set it with `?autogacha=1&gachabars=16` in the URL.

## Other features that depend on tempo

| Feature | Relation to tempo |
| --- | --- |
| Timeline `+bars` events | Fire **only while the tempo grid is locked (`LOCK` or `TAP`)**. → [Timeline panel](../timeline/) |
| Scene Deck bar-based auto-advance | Advances only while the main window's tempo is locked (`LOCK` or `TAP`). → [Scene Deck](../../live/scene-deck/#auto-advance) |
| Visual speed | While locked (including `TAP`), varies between 0.7x and 1.25x with the tempo. → [How Semantic Synth works](../semantic-synth/) |
