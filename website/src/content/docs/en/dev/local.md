---
title: Run, build & test locally
description: Starting the dev server, building, testing (including GPU tests), lint / format, and deployment.
---

## Requirements

- Node.js 24 (`.node-version` in the repository)
- pnpm 10 (`packageManager` in `package.json`)
- To run GPU tests or `vj:preview`, [Nix](https://nixos.org/) (the dev shell in `flake.nix` provides Chromium and the required libraries)

The tech stack is Vite + React 19 + TypeScript. Rendering and audio analysis are plain TypeScript classes that do not depend on React (`src/render/`, `src/audio/`, `src/scenes/`, `src/synth/`), and React handles only the UI and settings. The only runtime dependencies are React and valibot; no rendering library such as three.js is used.

## Starting

```bash
pnpm install
pnpm dev
```

- The dev server starts over **HTTPS with a self-signed certificate** (`@vitejs/plugin-basic-ssl`). The URL is usually `https://localhost:5173/`. The browser shows a warning the first time, so proceed via "Advanced" → "Proceed to ...".
- It is also exposed to the LAN (`server.host: true`). The microphone (`getUserMedia`) only works in a secure context (HTTPS or localhost), so it is HTTPS to let you try it from other LAN devices.
- To control it from the CLI, start `pnpm bridge` in another terminal and open with `?bridge=1` ([Remote control](../../live/remote/#controlling-via-bridge-local-version)).

## Build

```bash
pnpm build     # tsc -b && vite build (includes type checking)
pnpm preview   # preview the build locally
```

Static files are output to `dist/`. To serve from a subpath, specify it like `BASE_PATH=/<path>/ pnpm build`.

## Tests

```bash
pnpm test                    # vitest (the full unit test suite)
nix develop -c pnpm test:gpu # tests that use the GPU (WebGL2)
pnpm test:watch              # watch mode
```

:::caution[Always run GPU tests with `nix develop -c`]
If you run `pnpm test:gpu` in a bare environment, Playwright's Chromium cannot start, and the GPU tests are **skipped rather than failed**, so it finishes green (exit 0).
Run `nix develop -c pnpm test:gpu`, and check the result counts (that nothing was skipped).
:::

## lint / format

```bash
pnpm lint          # oxlint --type-aware
pnpm lint:fix
pnpm format        # oxfmt
pnpm format:check
```

CI (`.github/workflows/ci.yml`) runs the format check, lint, the build (including type checking), unit tests, and GPU tests.

## Other scripts

| Script | Details |
| --- | --- |
| `pnpm vj:preview` | Renders a Patch to a PNG ([vj:preview / vj:validate](../preview-validate/)) |
| `pnpm vj:validate` | Validates a Patch locally (same as above) |
| `pnpm measure:coverage` | Measures each Generator's screen coverage on a real GPU and rewrites `src/synth/coverage.generated.ts` (`nix develop` recommended) |
| `pnpm knowledge:check` | Validates the format of the knowledge bundle in `knowledge/` |

## Deployment (hosted version)

The hosted version is served on Cloudflare Workers (`wrangler.jsonc`, `worker/`).
A single Worker handles serving the built app (`dist/`) and the WebSocket relay at `/room/<id>` (the Durable Object `RelayRoom`).
Deployment is done through the Git integration of Cloudflare Workers Builds, which runs `pnpm run build` at build time.
