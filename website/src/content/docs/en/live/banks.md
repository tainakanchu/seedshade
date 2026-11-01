---
title: Saving banks
description: Save the Scene Deck's 8 slots to slots A to H and recall them, or carry them to another PC as JSON.
---

The Scene Deck's 8 slots (BASE + V1 to V7) are called a bank (a "hand"). A bank is saved automatically, and you can also name and keep it in 8 slots, `A` to `H`.

## What is saved

Only **the base Patch (BASE) and the variation randomness (bankSeed)** are saved.
The 8 slots themselves are not stored; the same 8 slots are rebuilt from the same inputs every time. The transition preset, auto-advance settings, cursor position, and the main window's seed at save time are saved too.

It is stored in the browser's `localStorage` (key `seedshade-deck-banks-v1`).

## Autosave (crash protection)

- About 0.5 seconds after the bank, transition preset, auto-advance, or cursor changes, it is saved automatically.
- When you reopen the Deck, the saved bank is restored right away, **without waiting for the main window**.
- If nothing has ever been saved, the bank is built from the main window's current picture.

## Slots A to H

Use the small `A` to `H` buttons in the toolbar (empty slots appear dimmed).

| Action | Result |
| --- | --- |
| `Shift` + click | Save the current bank to that slot (**there is no overwrite confirmation**) |
| `Shift` + `S` | Save to the next empty slot (overwrites `A` if none is free) |
| Click | Recall that slot's bank |
| Right-click / long press | Edit the slot's name (Enter to confirm, Esc to cancel) |

:::caution[Recalling does not change the picture right away]
Recalling a slot only swaps the Deck's 8 slots. The main window's picture does not change until you press a pad (`1` to `8`, etc.).
The main window's seed at save time is also not sent automatically. To bring the seed back as well, press **seed を採用** ("adopt seed") in `menu` (both the main window's seed setting and the picture switch).
:::

## Carrying it over as JSON

Use this to take a bank to another PC or browser.

1. Press `JSON copy` to copy the current bank to the clipboard (`copied` is shown).
2. In the Deck at the destination, open `menu`, paste into the text field, and press `JSON paste`.

:::note[Images cannot be carried over]
A Patch contains only a reference (a hash) to an image, not the image itself. The image data lives in the browser's IndexedDB (`seedshade-images`).
If you take only the JSON to another PC, the stamp image will be transparent. Register the same image from the Timeline panel there as well (the same file gives the same hash).
:::

## If you see STALE

When Generators are updated in a Seedshade update, a saved BASE may no longer pass validation against the current catalog.
In that case you see **STALE: generator 更新あり。R で live から取り直し** ("generators updated; re-fetch from live with R").

- The Deck does not crash, but every variation becomes equivalent to BASE.
- Press `R` to rebuild the bank from the main window's current picture.

## Clearing

In `menu`, the two steps `clear current` → `confirm clear current` clear the autosaved bank (current).
The next time you open the Deck, it is rebuilt from the main window's current picture. Slots `A` to `H` are not cleared.
