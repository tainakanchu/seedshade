---
title: Type nodes (type / typeMask / typeWarp)
description: Put text into Semantic Synth as nodes instead of overlaying it. Drive weight, outline and softness, and modulate them with audio.
---

Instead of "laying text on top", this feature **puts text into the pipeline as Semantic Synth nodes**.
The text you enter becomes a signed distance field (SDF) texture, so weight, outline and softness can be driven by parameters, and they are also targets for [audio modulation](../semantic-synth/#how-sound-drives-the-visuals).

- Changing the text **does not recompile the shader**. It switches on the spot (the Patch structure doesn't change).
- They never appear from a seed gacha. They are added **only manually**.
- The text is saved inside the Patch's `texts`, content included (key `<opId>.<slot>`, value `{text, font, weight}`; text up to 200 characters, font is a CSS font-family, weight 100-900).
- While no text is assigned, `type` draws nothing, `typeMask` has no effect, and `typeWarp` displaces by 0.

## The three nodes

All share `scale` / `softness` / `weight` / `fit` (some nodes only a subset).

### type (Source)

The text itself becomes the density (the picture).

| Parameter | Range / values | Default | What it does |
| --- | --- | --- | --- |
| `fit` | `contain` / `cover` / `tile` | `contain` | How the text fits (cannot be modulated by audio) |
| `scale` | 0.2-4 | 0.9 | Size |
| `weight` | -1 to 1 | 0 | Positive is bolder, negative is thinner |
| `softness` | 0-1 | 0.05 | Edge blur |
| `outline` | 0-1 | 0 | 0 is filled; above 0 draws an outline (the value is the line width) |
| `stagger` | 0-1 | 0 | Per-character phase-shifted vertical sway and weight pulsing, stronger on kicks |
| `invert` | on / off | off | Swap inside and outside of the text |

### typeMask (Modifier)

Processes other patterns using the shape of the text.

| Parameter | Range / values | Default | What it does |
| --- | --- | --- | --- |
| `mode` | `knockout` / `keep` / `xor` | `knockout` | `knockout` cuts out the text area, `keep` keeps only the text area, `xor` inverts |
| `amount` | 0-1 | 1 | Strength |
| `weight` / `softness` / `fit` / `scale` | as above | - | Same as `type` |

### typeWarp (Field)

Draws no text itself; **distorts coordinates along the outline of the text**.

| Parameter | Range / values | Default | What it does |
| --- | --- | --- | --- |
| `amount` | 0-1 | 0.3 | Distortion strength |
| `radius` | 0.05-1 | 0.5 | Falloff width from the outline |
| `mode` | `push` / `pull` / `swirl` | `push` | Push out / pull in / swirl |
| `fit` / `scale` | as above | - | `tile` tiles at the `contain` size |

## How to use (Texts section)

Use the **Texts** section of the Timeline panel (below Images).

1. Press **`+ type`**, **`+ mask`** or **`+ warp`** to add that node to the Patch; the slot is filled with `SEEDSHADE`. If that category is already at its limit, the last one is replaced.
2. Each slot gets a textarea, a font-family field, a weight field (steps of 100) and a clear button.
3. Text is **committed with Enter** (Shift+Enter for a line break; Enter during IME composition is ignored). It is also applied on blur and 450 ms after you stop typing. Font is applied on Enter / blur, weight on blur or after 450 ms.
4. Values changed from outside are reflected in the fields unless you are editing them.

:::tip
A long single line makes the characters small. Add line breaks to get larger text.
A font name that doesn't exist falls back to whatever typeface the browser picks.
:::

## Ideas

- Feed an MC's name or lyrics in during a track (`type`).
- Knock the text shape out of a pattern such as a halftone (`typeMask` `knockout`).
- Text you can't see, but the pattern swirls in the shape of the text (`typeWarp` `swirl`).

## Control from outside

Replace text with the Bridge JSON-RPC `setText`.

```json
{ "key": "type0.0", "text": "SEED\nSHADE", "weight": 900 }
```

- `key` is `<opId>` or `<opId>.<slot>`. `text` / `font` / `weight` / `clear` are optional.
- `clear: true`, or omitting `text`, removes the text. The return value is `{ok, issues}`.
- A Patch containing a `type`-family node is required.

From the CLI, use the `text` command of `vj-ctl` ([vj-ctl](../../ai/vj-ctl/)).

```bash
node scripts/vj-ctl.mjs text type0 "SEED\nSHADE" --weight 900   # \n is a line break
node scripts/vj-ctl.mjs text type0                                # omit the string to clear
```

See also: for images, [Images in the Timeline panel](../timeline/#images-stamp-an-image).
