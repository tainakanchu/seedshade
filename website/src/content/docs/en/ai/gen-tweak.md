---
title: vj:gen / vj:tweak (generate & adjust)
description: vj-gen, which generates a Patch from mood words, and vj-tweak, which rewrites only part of the current Patch.
---

When you want a picture with a particular mood, the fast flow is to **first generate from mood words with `vj-gen`, then fix only the parts that missed with `vj-tweak`**.
Both require a connection target (`--url` or the environment variable `VJ_URL`; [How it works & connecting](../overview/#specifying-the-connection-target)).
The examples below omit `--url`, assuming `VJ_URL` is set.

## vj-gen: generate from mood words

```bash
# Generate and send as is (the seed is decided automatically from the words)
node scripts/vj-gen.mjs "雲 静寂 青"

# Validate only and print the contents (do not send)
node scripts/vj-gen.mjs --dry-run "雲 静寂 青"

# Line up 3 candidates to compare (do not send)
node scripts/vj-gen.mjs --count 3 "攻めた 派手"

# Fix the seed to reproduce the same result
node scripts/vj-gen.mjs --seed take2 "夜 青"

# Using the current Patch as a base, swap only the Generators that don't fit the mood (palette and composition stay)
node scripts/vj-gen.mjs --base --dry-run "夜 青"
```

| Option | Details |
| --- | --- |
| `--dry-run` | Only prints the Patch that passed validation; does not send |
| `--count <n>` | Outputs n independent candidates as an array (**does not send**) |
| `--seed <s>` | Overrides the seed (decided from the words if omitted) |
| `--base` | Using the current Patch as a base, swaps only the Generators whose tags don't match |
| `--refresh-catalog` | Re-fetches the Generator catalog cache |

### Mood words

Mood words are drawn from the vocabulary in `scripts/vj-vocab.json` (76 words). Japanese, English, and romaji can be mixed.
Each word has weights on Generator tags (`affect` / `motion` / `material` / `environment` / `culturalTexture`), which changes which Generators are likely to be picked.
**The seed only decides "which of the weighted candidates gets drawn"**. The same words + the same seed always give the same Patch.

Examples of included words: `雲` (cloud) `静寂` (stillness) `幾何学` (geometry) `抽象` (abstract) `明るい` (bright) `暗い` (dark) `青` (blue) `赤` (red) `湿った` (humid) `懐かしい` (nostalgic) `台湾` (Taiwan) `夜` (night) `攻めた` (aggressive) `派手` (flashy) `チル` (chill) `夜市` (night market) `騎楼` (qilou, arcade walkway) `蛍光灯` (fluorescent light) `CRT` `MiniDV` `台風` (typhoon) `ハウス` (house) `アンビエント` (ambient) `ドラムンベース` (drum and bass), and more.
Generators derived from the old scenes can be called with `スペクトラム` (spectrum), `オシロ` (oscilloscope), `リサージュ` (Lissajous), `オーロラ` (aurora), `煙` (smoke), `パーティクル` (particles), `リング` (rings), and `マーブル` (marbling).

The vocabulary is plain JSON, so you can add missing words by copying a similar existing entry.

## vj-tweak: rewrite only part of the current Patch

It fetches the Patch currently shown, then you specify the changes as tokens and send.

```bash
# Change one parameter
node scripts/vj-tweak.mjs mod0.curve=1.65

# Add a Generator and set its parameter too (an id is assigned automatically if omitted)
node scripts/vj-tweak.mjs --dry-run +humidityLens:fld0 fld0.amount=0.22

# Replace a Generator (parameters become that Generator's defaults)
node scripts/vj-tweak.mjs src0:=qilouShutter src0.density=28

# Change the palette and composition
node scripts/vj-tweak.mjs palette.mode=analogous palette.hueOffset=32 composition.speed=0.18
```

### Change tokens

| Token | Details | Example |
| --- | --- | --- |
| `-<opId>` | Remove a Generator | `-fld0` |
| `+<generatorId>[:<opId>]` | Add a Generator | `+humidityLens:fld0` |
| `<opId>:=<generatorId>` | Replace a Generator (parameters are reset) | `mat0:=sodium` |
| `<opId>.<paramId>=<value>` | Change a parameter | `mod0.curve=1.65` |
| `palette.<key>=<value>` | Palette (`mode` / `hueOffset` / `saturation` / `lightness`) | `palette.mode=triadic` |
| `composition.<key>=<value>` | Composition (`symmetry` / `scale` / `speed`) | `composition.speed=0.5` |
| `qualityTier=<value>` | Quality (`low` / `medium` / `high`) | `qualityTier=high` |

The `opId` values (`src0`, `fld0`, `mod0`, `mat0`, etc.) and each Generator's parameter names can be checked with `vj-ctl state` / `vj-ctl catalog` or in the Timeline panel's Patch field.
The examples here are taken from the repository's recipe `recipes/humid-qilou-night.json`.

### `--reroll`: keep the shape, redraw only the details

This does from the CLI what 🧬 (`D`) does in the main window. The Generator composition stays fixed, and the parameters, routes, palette, and composition are redrawn with a new seed.

```bash
# Redraw everything (the seed is random; the seed used is printed on the first line of the output)
node scripts/vj-tweak.mjs --dry-run --reroll

# Redraw only the palette and parameters
node scripts/vj-tweak.mjs --dry-run --reroll=params,palette

# Fix the seed to reproduce
node scripts/vj-tweak.mjs --reroll --reroll-seed take2

# Redraw, then tweak further with tokens (tokens take priority)
node scripts/vj-tweak.mjs --reroll palette.mode=analogous
```

What you can give to `--reroll=` is `params` / `routes` / `palette` / `composition`. The first run takes a few seconds for internal setup.

## Before sending

- `vj-gen` / `vj-tweak` validate locally before sending, but this is a **copy** of the validation rules and does not include the rendering-load (budget) check. Even if it passes local validation, the main window may reject it for exceeding the load.
  To be sure it passes, save the `--dry-run` output to a file and run it through `pnpm vj:validate` ([vj:preview / vj:validate](../../dev/preview-validate/)).
- The Generator catalog is cached in `scripts/.vj-catalog-cache.json`. If you get an error such as a nonexistent Generator after updating Seedshade, add `--refresh-catalog`.
