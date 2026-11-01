---
title: vj-ctl (basic commands)
description: The basic CLI that sends one command at a time. Get state, apply a seed / Patch, schedule the Timeline, lock, and record.
---

`vj-ctl` is a CLI that sends one command to the main window and prints the result.
The examples below assume sending to the local relay (`pnpm bridge`). When sending to a hosted room, add `--url wss://seedshade.tainakanchu.com/room/<id>` to every command ([How it works & connecting](../overview/)).

## Command list

| Command | What it does |
| --- | --- |
| `state` | Shows the current state (Patch, Timeline, scene clock `nowSec`, bar `barCount`, `tempoLocked`, the loaded reactions `reactions`, etc.) |
| `catalog` | Shows the list of Generators (id, category, tags, parameters, cost) |
| `seed <seed>` | Transitions to that seed's look **right now** |
| `patch <file.json>` | Applies a Patch JSON **right now** (issues are returned if validation fails) |
| `image <file> [--name <n>]` | Registers an image (png / jpg / webp / gif / svg / avif, up to 5 MB). Put the returned `hash` in the Patch's `images` to use it |
| `event add …` | Schedules an event on the Timeline (see below) |
| `event remove <id>` | Cancels a scheduled event |
| `lock <sec>` | Locks the Timeline for N seconds from now (relative) |
| `fire <externalId>` | Manually fires an external event |
| `record start` | Starts recording a performance |
| `record stop` | Stops recording and prints the recording JSON to stdout (save it with `> recording.json`) |
| `load <recording.json>` | Loads a recording and restores the Timeline |
| `room` | Creates a new room id and URL (no network). Add `--host seedshade.tainakanchu.com` |

Common options: `--port <n>` (local relay port, default 7877), `--url <ws(s)://…>` (cannot be used together with `--port`), `--help`.

## Common examples

```bash
# Look at the current state
node scripts/vj-ctl.mjs state

# Switch to a different seed right now (the seed string has no meaning)
node scripts/vj-ctl.mjs seed "take-1"

# Apply a prepared Patch right now
node scripts/vj-ctl.mjs patch ./patch.json

# Switch to a different seed in 30 seconds, slowly
node scripts/vj-ctl.mjs event add --in 30 --seed take-2 --transition slow

# Swap in a Patch in 8 bars (fires only while the tempo is locked)
node scripts/vj-ctl.mjs event add --bar 8 --patch ./next.json --label "chorus"

# Hold on "drop" and decide the timing by hand
node scripts/vj-ctl.mjs event add --cue drop --patch ./drop.json --label "drop"
node scripts/vj-ctl.mjs fire drop

# Lock for 60 seconds from now
node scripts/vj-ctl.mjs lock 60

# Record a performance, save it, and load it later
node scripts/vj-ctl.mjs record start
node scripts/vj-ctl.mjs record stop > recording.json
node scripts/vj-ctl.mjs load recording.json
```

## event add options

| Option | Details |
| --- | --- |
| `--in <sec>` | N seconds from now |
| `--bar <n>` | N bars from now. It will not fire unless the tempo is locked (`tempoLocked` in `state` is `false`), so use `--in` in that case |
| `--cue <id>` | An external event. It does not fire until you `fire <id>` |
| `--seed <s>` / `--patch <file>` / `--label <s>` | What to switch to. At least one is required |
| `--transition default\|slow\|cut` | Transition speed (default `default`; `slow` takes twice as long, `cut` about 0.12 seconds) |

- If you give more than one reference, they take priority in the order `--bar` → `--in` → `--cue`.
- The id of the added event is included in the output. Cancel it with `event remove <id>`.
- `--in` / `--bar` / `lock` are all **relative to now**. The CLI reads `state` and converts them to absolute values before sending.

:::caution[`--patch` is not validated when scheduling]
`patch <file>` goes through validation in the main window, but a Patch scheduled with `event add --patch` goes into the Timeline **without validation** and is applied as is when it fires.
Validate it with `pnpm vj:validate <file>` before scheduling ([vj:preview / vj:validate](../../dev/preview-validate/)).
:::

## Good to know

- `seed` switches immediately without going through the Timeline. The seed shown under **Look** in the main window's panel does not change and is not saved. Reloading the page returns to the look of the panel's Look seed.
- What `lock` stops is the editing and deletion of events that would fire during the lock period, and Scene Deck triggers. It does not stop `seed` / `patch` / `event add`, or key operations in the main window.
- A single run times out after 20 seconds overall, and waiting for the main window's response times out after 15 seconds.
