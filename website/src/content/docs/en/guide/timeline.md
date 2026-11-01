---
title: Timeline panel
description: Scheduling show events, editing a Patch directly, stamping images, and recording and replaying a performance.
---

The **Timeline panel** at the top right of the screen is an advanced panel for fine control of Semantic Synth.
You can do by hand, from the screen, the same operations used when directing from the CLI or AI ([vj-ctl](../../ai/vj-ctl/)).

The following sections are listed from the top. You can collapse the panel with `▾ close` at its top right, and hide it (together with the control panel) with `H`.

## State

| Display | Details |
| --- | --- |
| `idle` / `transitioning` | Whether it is currently transitioning to the next look. |
| `seed` | The seed of the Patch currently shown. |
| `operators` | The Generators making up the current Patch, in order (for example `spectrumBars › gamma › sodium`). |
| `quality` | Internal render resolution scale (1.00 = native; drops automatically when heavy). |
| `tempo` | `locked` / `free`, and the bar number being counted (`bar N`). |

If `synth is not running (WebGL2 required)` is shown, rendering is not running ([Troubleshooting](../../troubleshooting/)).

## Patch (edit directly)

The JSON of the Patch currently shown is displayed.

1. Edit the text field directly (once edited it shows `edited` and no longer follows the live Patch).
2. Press **Apply** to run validation, and if it passes, it transitions to the new Patch.
3. If validation fails, the reasons are listed below as bullets.
4. **Reload** discards your edits and reloads the current live Patch.

Patch constraints (Generator count, order, parameter ranges, and so on) are described in detail in [How Semantic Synth works](../semantic-synth/) and, for AI, in the [vj-director skill](../../ai/claude-code/).

## Events (list of scheduled events)

The events registered on the Timeline are listed in the order they will fire.

| Display | Meaning |
| --- | --- |
| `@12.0s` | Fires at 12 seconds (seconds on the scene clock) |
| `@bar 16` | Fires at bar 16 |
| `@ext:drop` | Waits until manually fired by the name `drop` (external) |
| `locked` | An event that cannot be edited |
| `fired` | Already fired |

`✕` deletes an event.

## Add event (schedule an event)

Schedule "switch to this seed in N seconds / N bars".

1. On the first row, choose the reference.
   - `+sec` … N seconds from now
   - `+bars` … N bars from now (**fires only while the tempo is locked**)
   - `external` … waits under a name (the external id). It does not fire until you `Fire` it under **External** below
2. Enter a number (or the external id).
3. On the second row, enter a seed. If left empty, a random seed is used.
4. Choose the transition speed.

   | Preset | Details |
   | --- | --- |
   | `default` | Standard (1.2 seconds for color, 2 seconds for the composition swap, etc.) |
   | `slow` | Melts over twice the time of `default` |
   | `cut` | Switches in about 0.12 seconds |

5. Press **Add**.

## Locked until (lock)

Enter a number and press **Set** to "lock" until that time (seconds on the scene clock).
While locked, the following operations are rejected.

- Editing or deleting events that fire before that time
- Triggering from the Scene Deck

:::caution
The value you enter here is not "seconds from now" but an **absolute number of seconds on the scene clock**. Entering `0` releases the lock.
To lock for N seconds from now, it is easier to use `L` in the Scene Deck (30-second lock ⇄ release) or the CLI's `vj-ctl lock <sec>` (relative).

Also, the lock protects the Timeline and the Scene Deck only; it does not stop `R` / `D` in the main window, `Apply` for a Patch, or the CLI's `vj-ctl seed` / `patch`.
:::

## External (manual fire)

Enter an external id and press **Fire** to fire the `external` events waiting on that id (all of them, if several events share the id).
Use it when you want to schedule "this picture at the moment of the drop" and decide the timing by hand.

## Images (stamp an image)

You can put an image such as a logo into the visuals.

1. Drag and drop an image (PNG / JPG / WebP / GIF / SVG / AVIF) anywhere in the main window. You can also register one with the file chooser button.
2. Press **stamp に使う** ("use as stamp") on an image in the list.
3. A `stamp` Generator is added to the current Patch (or, if one already exists, only its image is replaced), and the image is drawn.

- Registered images are saved in the browser's IndexedDB (`seedshade-images`) and stay in the list next time.
- A Patch holds at most 2 Sources, so if there are already 2, the last Source is removed and replaced with `stamp`.
- `stamp` is never chosen by seed gacha. Redrawing the seed removes the image, so press **stamp に使う** again.

## Recording

1. Press **● Record** to start recording. Subsequent Timeline operations (adding and deleting events, etc.) and firings are recorded.
2. Press **■ Stop & save** to stop, and `performance-<number>.json` is downloaded.
3. Load a JSON with the file chooser on the right to restore the recorded Timeline; it plays back after returning to the Patch from when recording started.

:::note
The recorded times are in seconds on the scene clock (the time elapsed since the page was opened).
If you load it into a page already past those times, past events may fire all at once.
To reproduce it exactly, reload the page before loading.
:::
