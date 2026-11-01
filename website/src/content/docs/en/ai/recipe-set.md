---
title: vj:recipe / vj:set (recipes & sets)
description: Recipes that save a look as a rebuildable set of instructions, and sets that line up multiple scenes as cues to advance through live.
---

## Recipes (vj-recipe)

A **recipe** is a small JSON file that saves a look as "mood words + seed + tweak tokens" (`recipes/*.json`).

```json
{
  "name": "humid-qilou-night",
  "mood": ["台湾", "夜", "湿った", "騎楼"],
  "seed": "humid-qilou-night-v1",
  "tweaks": ["src0:=qilouShutter", "src0.density=28", "mat0:=sodium", "palette.mode=analogous"],
  "notes": "夜市の手前の騎楼。…"
}
```

Each time it is applied, a base is rebuilt with `vj-gen` (mood words + seed), and the `tweaks` ([vj-tweak tokens](../gen-tweak/#change-tokens)) are layered on from the top.

:::tip[Why not save the Patch as is]
A Patch's JSON contains Generator versions, and when a Seedshade update raises a Generator version, old Patches no longer pass validation.
A recipe is rebuilt from the current catalog every time, so it is less likely to break with updates.
:::

### Usage

```bash
# List (no network)
node scripts/vj-recipe.mjs list

# View the contents (no network)
node scripts/vj-recipe.mjs show humid-qilou-night

# Check the rebuilt result (do not send)
node scripts/vj-recipe.mjs apply humid-qilou-night --dry-run

# Send
node scripts/vj-recipe.mjs apply humid-qilou-night
```

- `apply` needs a connection target (`--url` or `VJ_URL`). However, `--dry-run` works without network if the Generator catalog cache (`scripts/.vj-catalog-cache.json`) exists.
- You can also call it through pnpm, such as `pnpm vj:recipe list`.
- The repository includes more than 30 example recipes. `list` shows them with a one-line note.

### Creating your own recipe

1. Use `vj-gen --dry-run "<mood words>"` or `vj-tweak --dry-run …` to find the words, seed, and tokens that give a result you like.
2. Write `name` / `mood` / `seed` / `tweaks` (optionally `notes`) in `recipes/<name>.json`.
3. Check the format with `vj-recipe show <name>`, and confirm it rebuilds with `apply --dry-run`.

:::note[About recipes/setlists]
`recipes/setlists/*.json` is **data** for a "setlist" that lays out multiple recipes along a timeline.
There is currently no CLI that runs it directly (`vj-set` below uses a different format).
:::

## Sets (vj-set)

A **set** bundles the multiple scenes you will use live. `vj-set` loads all of the set's scenes into the Timeline as **cues (external events that are fired manually)**, and during the show you advance to the next scene with a single command.
It is a tool for "not deciding the timing beforehand, but leaving it in your hands during the show".

### The set file

```json
{
  "name": "taiwan-night",
  "scenes": [
    { "cue": "s1", "patch": "scenes/s1.json", "label": "湿気", "transition": "slow" },
    { "cue": "s2", "patch": "scenes/s2.json", "label": "騎楼", "transition": "slow" }
  ]
}
```

- `cue` and `patch` are required; `label` and `transition` (`default` / `slow` / `cut`, default `default`) can be omitted.
- `patch` is a path to a Patch JSON file, relative to the set file.
- `cue` values cannot be duplicated within a set.

A scene's Patch can be made from a recipe, for example.

```bash
node scripts/vj-recipe.mjs apply humid-qilou-night --dry-run > sets/scenes/s1.json
```

### Usage

```bash
# Validate all scenes, then load them into the Timeline
node scripts/vj-set.mjs load sets/taiwan-night.json

# Advance to the next scene (fires the frontmost cue that has not fired yet)
node scripts/vj-set.mjs next

# Show the current scene, the next scene, and how many remain
node scripts/vj-set.mjs status
```

- On `load`, the first scene is applied immediately, and the second and later wait for `next`.
- All scenes' Patches are validated locally before sending. If even one fails, nothing is sent.
- Even if you run `load` again, cues already in the Timeline are skipped rather than resent (they are not replaced even if their contents changed). To replace one, first remove it with `vj-ctl event remove <id>`.
- Running `next` when there is no next scene is not an error (`next: null`).
- The connection target is the same as `vj-ctl`: the local relay if nothing is given. When sending to a hosted room, add `--url wss://seedshade.tainakanchu.com/room/<id>` (`VJ_URL` is not read).
