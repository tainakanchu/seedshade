---
title: Claude Code (vj-director)
description: Have Claude Code direct the visuals with the vj-director skill bundled in the repository.
---

The repository includes a skill for [Claude Code](https://claude.com/claude-code) called **vj-director** (`.claude/skills/vj-director/SKILL.md`).
Start Claude Code in the repository directory and ask it things like "make the visuals more humid" or "switch in 8 bars", and Claude Code loads this skill and directs the visuals using the CLIs described so far.

## Preparation

Claude Code cannot open a browser, so **opening the main window is the human's job**.

### Using the local version

1. Start `pnpm dev` in the repository.
2. Ask Claude Code to, or do it yourself, start `pnpm bridge` (leave it running).
3. Open `https://localhost:5173/?bridge=1` in the browser.
4. Claude Code checks connectivity with `node scripts/vj-ctl.mjs state`.

### Using the hosted version

1. Ask Claude Code to "create a room" (it runs `vj-ctl room --host seedshade.tainakanchu.com`).
2. Open the returned `pageUrl` (`https://seedshade.tainakanchu.com/?room=<id>`) in the output browser.
3. From then on, Claude Code adds `--url wss://seedshade.tainakanchu.com/room/<id>` to every command it runs.

See [Remote control & multiple screens](../../live/remote/) for details.

## Example requests

| Request | What Claude Code does (the skill's policy) |
| --- | --- |
| "Make it feel like ...", "just change it for now" | Generates from mood words with `vj-gen`. If it misses, compares with `--count` or nudges it with `vj-tweak` |
| "Keep the same structure but change only the mood" | `vj-tweak --reroll` (keeps the structure and beat reactions) |
| "Change it right now" | `vj-ctl seed` (fully random) or `vj-ctl patch` (when the target is clear) |
| "At the chorus", "in about a minute" | Schedules with `vj-ctl event add --in` / `--bar` |
| "Set up the set beforehand, and I'll advance at my own timing live" | Loads the cues with `vj-set load`, and uses `vj-set next` live |
| "Save the current one", "replay the flow from before" | `record start` → `record stop > file.json` → `load file.json` |
| "Leave it alone for a while" | `vj-ctl lock <sec>` |

The skill's policy is "**do not fix timing in advance**". When building a long set through conversation, an `--in` reservation stacked up early can quietly end up in the past and fire at an unintended moment, so when in doubt it uses the manually fired `--cue` / `vj-set`.

It is also instructed to run hand-built Patches and `--dry-run` results through `vj-validate` before sending, and before building a Patch, to check what Generators actually look like with `vj-preview --contact-sheet`.

## Teaching it your taste

At the end of the skill there is a section called "the user's aesthetic tendencies", which Claude Code uses as a reference to decide the direction of the picture and the sense of tempo (for example "change slowly, on a seconds scale", or "when in doubt, use `--transition slow`").
To match your own taste, rewrite this section.
