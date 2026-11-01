---
title: vj:preview / vj:validate
description: vj:preview renders a Patch to a PNG on your local GPU, and vj:validate validates it locally with the real validation rules.
---

Both are CLIs that run only inside the repository, without connecting to the app or a relay.

## vj:preview: render a Patch to a PNG

Instead of guessing a Patch's look by reading GLSL, it actually renders it on your local GPU (headless Chromium) and writes a PNG.

```bash
# A contact sheet with every Generator side by side (the most used)
pnpm vj:preview --contact-sheet artifacts/contact-sheet.png

# A Patch built from a seed, shown at several times (0 / 1.7 / 4.3 / 9.1 seconds)
pnpm vj:preview --seed take-1 artifacts/seed.png

# A hand-written / generated Patch JSON
pnpm vj:preview path/to/patch.json artifacts/patch.png

# Line up one parameter from minimum to maximum horizontally (<generatorId>.<paramId>)
pnpm vj:preview --sweep gamma.curve artifacts/sweep.png
```

| Option | Details |
| --- | --- |
| `--size <n>` | Size of each tile (px; default 256, 128 for `--sweep`) |
| `--steps <n>` | Number of steps for `--sweep` (default 8) |
| `--cols <n>` | Number of columns in the contact sheet (default 11) |
| `--cell-size <n>` | Size of each cell in the contact sheet (default 112) |

- Headless Chromium is required. Running inside `nix develop` sets `CHROMIUM_BIN` (`nix develop -c pnpm vj:preview …`).
- When a non-Source Generator is rendered alone, it is drawn on top of the base Source `grid`. Parameters are the catalog defaults.
- Before building a Patch, we recommend first checking what the Generators actually look like on the contact sheet.

## vj:validate: validate before sending

It runs a Patch JSON through **the same validation** the main window applies on receipt (schema validation → content validation → rendering-load estimate).
It runs the TypeScript in `src/synth/` directly rather than copying the validation rules, so there is no drift.

```bash
pnpm vj:validate patch.json             # one file
pnpm vj:validate dir/*.json             # multiple files
pnpm vj:validate --stdin < patch.json   # one from standard input
pnpm vj:validate --quality low patch.json  # judge the load against a stricter quality tier
```

The local validation in `vj-gen` / `vj-tweak` is a copy and does not include the rendering-load check. Before sending their `--dry-run` results or a hand-written Patch, and especially before scheduling with `vj-ctl event add --patch`, run it through `vj:validate`.

## Main Patch constraints

These are the points that commonly fail validation.

- Generator counts: Source 1 to 2, Field 0 to 2, Modifier 1 to 3, Material exactly 1.
- The order is Source → Field → Modifier → Material.
- Each Generator's `generatorVersion` must match the current catalog version (old Patches can fail after an update. For saving, a [recipe](../../ai/recipe-set/) is safer).
- The audio inputs (`source`) usable in a route are `audio:bass` `audio:mid` `audio:treble` `audio:level` `audio:beat` `audio:beatIntensity` `audio:gridPulse` `audio:barPulse` `audio:barPhase` `audio:beatPhase`, and `swell:wave` `swell:group` `swell:set` `swell:surge`.
- It must fit within the rendering-load limit for each quality tier (`qualityTier`: `low` / `medium` / `high`).

The detailed rules are collected in `src/synth/validate.ts` and, for AI, `.claude/skills/vj-director/SKILL.md`.
