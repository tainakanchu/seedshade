---
title: Hosted vs. local
description: What you can do in the public app (hosted version), and what only the locally run version can do.
---

Seedshade can be used in two ways.

| | Hosted version | Local version |
| --- | --- | --- |
| URL | [https://seedshade.tainakanchu.com](https://seedshade.tainakanchu.com) (the same app also opens at `https://seedshade.tainakanchu815.workers.dev`) | `https://localhost:5173/` with `pnpm dev` |
| What it is | A build of the `main` branch (served by Cloudflare Workers) | The code on your machine |
| Setup | None | Node.js 24, pnpm, and a clone of the repository |

The hosted version's Worker only serves the built app and relays WebSocket traffic at `/room/<id>` (relaying operations from the CLI). Audio and video are never sent to the server.

## Comparison of what you can do

| Feature | Hosted | Local |
| --- | --- | --- |
| Rendering, audio input, control panel | Yes | Yes |
| Timeline panel (scheduling, Patch editing, images, recording) | Yes | Yes |
| Scene Deck, banks, MIDI | Yes | Yes |
| OBS browser source | Yes | Yes (because of the self-signed certificate, OBS may show a certificate error) |
| Control from the CLI / AI via `?room=` | Yes | No (the dev server has no `/room` relay) |
| Control from the CLI / AI via `?bridge=1` + `pnpm bridge` | No (the local relay rejects connections from pages other than `localhost`) | Yes (same PC only) |
| Multiple screens with `mirror` | Yes (used with `room`. Works on another PC or network) | Partial (used with `bridge`. Same PC only) |
| Open on another LAN device | Yes (just open the URL) | Yes (`https://<the PC's IP>:5173/`. There is a certificate warning. bridge cannot be used) |
| Use without internet | No | Yes (`pnpm dev`, or `pnpm build` → `pnpm preview`) |
| `vj:preview` / `vj:validate` | — (both are CLIs that run in the repository and do not connect to the app) | — |

In both cases, the CLIs (`vj-ctl` / `vj-gen`, etc.) run on a PC where you have cloned the repository. To control the hosted version, specify `--url wss://seedshade.tainakanchu.com/room/<id>`.

## Stored data is not shared

Settings, Scene Deck banks, MIDI assignments, and registered images are stored **per browser and origin (URL domain)**.

- The hosted version (`seedshade.tainakanchu.com`) and the `workers.dev` URL are different origins, so their stored data is separate.
- It is also not shared with the local version (`localhost:5173`).
- Prepare using the same URL you will open at the show. Banks and MIDI assignments can be carried over as JSON ([Saving banks](../../live/banks/) / [MIDI](../../live/midi/)).

See [Stored data](../storage/) for details.

## Which should I use

- **Just trying it, or using it live** → Hosted. When controlling from AI / CLI, use `?room=`.
- **No internet at the venue, or you want to try a feature in development** → Local.
- **Building things out with Claude Code on the same PC** → Either works. `pnpm bridge` for local, `room` for hosted.
