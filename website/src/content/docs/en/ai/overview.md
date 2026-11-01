---
title: How it works & connecting
description: How Seedshade is directed from the CLI / AI, and how to specify the connection target.
---

Seedshade can do from the CLI (command line) the same things you do on screen.
If you have an AI (such as Claude Code) run this CLI, you can direct the visuals with instructions like "make it more humid" or "switch to this look in 8 bars".

## How it works

```
CLI (vj-ctl etc.) ──WebSocket──▶ Relay (room / bridge) ──WebSocket──▶ Main window (browser)
```

- The relay only passes commands along; it makes no decisions about the visuals.
- The main window executes the commands it receives through the **same entry point** as the Timeline panel and on-screen operations. Patch validation applies in the same way.
- The CLI sends one command per run, prints the resulting JSON, and exits.

For how to set up a relay (room / bridge), see [Remote control & multiple screens](../../live/remote/).

## List of CLIs

All are in the repository's `scripts/`. Clone the repository on the controlling PC and run `pnpm install` (Node.js 24 and pnpm are required).

| CLI | How to call | What it does |
| --- | --- | --- |
| `vj-ctl` | `node scripts/vj-ctl.mjs` | The basic CLI that sends one command at a time. Get state, apply a seed / Patch, schedule the Timeline, record, and more. → [vj-ctl](../vj-ctl/) |
| `vj-gen` | `node scripts/vj-gen.mjs` / `pnpm vj:gen` | Generates a Patch from mood words and sends it. → [vj:gen / vj:tweak](../gen-tweak/) |
| `vj-tweak` | `node scripts/vj-tweak.mjs` / `pnpm vj:tweak` | Rewrites only part of the current Patch and sends it. → [vj:gen / vj:tweak](../gen-tweak/) |
| `vj-recipe` | `node scripts/vj-recipe.mjs` / `pnpm vj:recipe` | Rebuilds a Patch from a saved recipe and sends it. → [vj:recipe / vj:set](../recipe-set/) |
| `vj-set` | `node scripts/vj-set.mjs` / `pnpm vj:set` | Sets up multiple scenes as cues and advances through them live. → [vj:recipe / vj:set](../recipe-set/) |
| `vj-bridge` | `pnpm bridge` | Starts the local relay. |
| `vj-validate` | `pnpm vj:validate` | Validates a Patch locally with the real validation rules (no network). → [vj:preview / vj:validate](../../dev/preview-validate/) |
| `vj-preview` | `pnpm vj:preview` | Renders a Patch to a PNG (no network). → [vj:preview / vj:validate](../../dev/preview-validate/) |

:::note
`vj-ctl` has no `pnpm` script name. Call it as `node scripts/vj-ctl.mjs`.
:::

## Specifying the connection target

How you specify the connection target differs slightly between CLIs.

| CLI | When nothing is specified | How to specify |
| --- | --- | --- |
| `vj-ctl` | Local relay `ws://127.0.0.1:7877` | `--url <ws(s)://…>` or `--port <n>` |
| `vj-set` | Local relay (the same default as `vj-ctl`) | `--url` or `--port` |
| `vj-gen` / `vj-tweak` / `vj-recipe` | **Error** (must be specified) | `--url <ws(s)://…>` or the environment variable `VJ_URL` |

The connection target URLs are as follows.

| Relay | URL |
| --- | --- |
| room (hosted) | `wss://seedshade.tainakanchu.com/room/<id>` |
| bridge (local) | `ws://127.0.0.1:7877` |

:::tip[So you do not have to write `--url` every time]
`vj-gen` / `vj-tweak` / `vj-recipe` read the environment variable `VJ_URL`.

```bash
export VJ_URL=wss://seedshade.tainakanchu.com/room/<id>   # bash / zsh
set -x VJ_URL wss://seedshade.tainakanchu.com/room/<id>   # fish
```

`vj-ctl` and `vj-set` do not read `VJ_URL`, so add `--url` for those.
:::

## Reading the output (common)

| Result | Meaning |
| --- | --- |
| exit 0, JSON on stdout | Success |
| exit 1, `{"ok":false,"issues":[…]}` or similar | Communication worked but the command was rejected (Patch validation failed, locked, etc.). Read the issues and fix them |
| exit 1, `{"error":"…"}` | A communication or argument error. A hint is printed to stderr |

Common errors:

- `no synth connected` … the main window is not connected. Check that the page URL has `?room=` / `?bridge=1` and that the room id matches.
- `timeout waiting for synth` … the main window is not responding. The browser tab may have gone to the background and stopped rendering. Bring the main window to the front.
- Cannot connect (`ECONNREFUSED`, etc.) … for local, `pnpm bridge` is not running.
