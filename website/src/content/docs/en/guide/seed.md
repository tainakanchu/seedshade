---
title: Seeds (look gacha)
description: How a seed string decides the look, and when to use 🎲 versus 🧬.
---

The look of Seedshade is decided by a **seed (a string)**.
Changing the seed changes everything at once: the Generator combination, parameters, palette, composition, and even how it reacts to sound, so the picture swaps out like pulling a gacha. We call this **look gacha**.

## Basics

- The same seed **always** reproduces the same look. When you get a picture you like, note down the seed string shown under **Look** in the panel.
- The meaning of the seed string is never examined. `humid-night-market` and `take-3` are just different random seeds. Think of the name as an index for your own memory.
- Switching is a smooth crossfade, not a hard cut.

## 🎲 versus 🧬

| Action | Key | What changes |
| --- | --- | --- |
| 🎲 Redraw the seed | `R` | **Everything.** It starts from the Generator composition (which parts are stacked, and how). The new seed is reflected in the panel's Look and saved. |
| 🧬 Redraw only the details | `D` | The Generator composition **stays the same**; only the parameters, the audio-modulation routes, the palette, and the composition are redrawn with new randomness. |

Use 🧬 when you like the shape but want different colors or motion.
Since the composition does not change, the kind of glitch that happens on the beat ([audio reactions](../semantic-synth/#3-what-happens-on-each-beat)) does not change either.

:::note
The result of a 🧬 redraw is not saved as a seed (the panel's Look display does not change either).
Reloading the page returns to the look of the seed shown under Look.
:::

## Entering a seed by hand

1. Type a seed string into the input field on the **Look** row (up to 64 characters).
2. Press **Enter** or click outside the field to apply it (it is not applied character by character).

If you confirm an empty field, it reverts to the previous seed.
You can also set the startup seed with `?seed=…` in the URL ([URL parameters](../../reference/url-params/)).

## Redrawing automatically

When **🎲 Auto-gacha** is `On`, the seed is redrawn automatically every set number of bars.
It only advances while the tempo is locked (or set by tapping). → [Tempo sync](../tempo/#auto-gacha-every-n-bars)

## When you want a particular mood

Seeds are completely random, so you cannot aim for a "humid night" look directly. If you have a target, here are some ways.

| Method | Details |
| --- | --- |
| Scene Deck | Builds 8 slots with the same composition but different parameters, based on the current picture, and lets you trigger them. → [Scene Deck](../../live/scene-deck/) |
| `vj:gen` (CLI) | Generates a Patch from mood words like "雲 静寂 青" (cloud, stillness, blue). → [vj:gen / vj:tweak](../../ai/gen-tweak/) |
| Recipes (CLI) | Save "mood words + seed + tweaks" as JSON so you can rebuild it anytime. The repository's `recipes/` has more than 30 examples. → [vj:recipe / vj:set](../../ai/recipe-set/) |
| Write the Patch directly | Edit the JSON in the **Patch** field of the Timeline panel and press `Apply`. → [Timeline panel](../timeline/#patch-edit-directly) |
