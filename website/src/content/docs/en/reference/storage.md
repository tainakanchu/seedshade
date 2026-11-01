---
title: Stored data
description: The data Seedshade stores in the browser, and how to clear and carry it.
---

Seedshade stores nothing on a server. Everything saved lives inside the browser you use.
Storage is separate for each browser, profile, and origin (URL domain and port).

| Content | Where | Key / name | Carrying it over |
| --- | --- | --- | --- |
| Main window settings (gain, Hue, background, Auto-gacha, input device, seed) | `localStorage` | `seedshade-settings` | Can be reproduced with URL parameters |
| Scene Deck banks (the autosaved current and `A` to `H`) | `localStorage` | `seedshade-deck-banks-v1` | `JSON copy` / `JSON paste` |
| MIDI assignments | `localStorage` | `seedshade-deck-midi-v1` | `export` / `import` |
| Registered images | IndexedDB | `seedshade-images` | Cannot be carried over (register the same images again at the destination) |

What is not saved:

- 🧬 (redrawing the details), the Timeline panel's `Apply`, and Patches / seeds sent from the CLI. After a reload, it returns to the look of the saved seed.
- Scheduled Timeline events. If needed, write them out to JSON with Recording ([Timeline panel](../../guide/timeline/)).
- Temporary URL parameters such as `?ui=hide` (`ui` / `room` / `bridge` / `mirror` / `deck`).

## Resetting to the initial state

In the browser's developer tools (Application / Storage), delete the relevant keys.
If you clear all of the site's data, settings, banks, MIDI assignments, and images are all removed.

## Communication channel used internally

The Scene Deck and the main window communicate over a same-origin `BroadcastChannel` (`seedshade-deck-v1`). This is communication inside the browser only and does not go out over the network.
