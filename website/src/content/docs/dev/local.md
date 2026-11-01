---
title: ローカル起動・ビルド・テスト
description: 開発サーバーの起動、ビルド、テスト（GPU テストを含む）、lint / format、デプロイ。
---

## 必要なもの

- Node.js 24（リポジトリの `.node-version`）
- pnpm 10（`package.json` の `packageManager`）
- GPU テストや `vj:preview` を動かすなら [Nix](https://nixos.org/)（`flake.nix` の開発シェルが Chromium と必要なライブラリを用意します）

技術スタックは Vite + React 19 + TypeScript です。描画と音声解析は React に依存しない素の TypeScript クラス（`src/render/`、`src/audio/`、`src/scenes/`、`src/synth/`）で、React は UI と設定だけを担当します。ランタイムの依存は React と valibot だけで、three.js などの描画ライブラリは使っていません。

## 起動

```bash
pnpm install
pnpm dev
```

- 開発サーバーは **自己署名証明書の HTTPS**（`@vitejs/plugin-basic-ssl`）で起動します。URL は通常 `https://localhost:5173/` です。最初にブラウザの警告が出るので「詳細設定」→「アクセスする」で進みます。
- LAN にも公開されます（`server.host: true`）。マイク（`getUserMedia`）は安全なコンテキスト（HTTPS か localhost）でしか使えないため、LAN の別端末から試せるように HTTPS にしてあります。
- CLI から操作する場合は、別のターミナルで `pnpm bridge` を起動し、`?bridge=1` 付きで開きます（[リモート操作](../../live/remote/#bridgeローカル版で操作する)）。

## ビルド

```bash
pnpm build     # tsc -b && vite build（型チェック込み）
pnpm preview   # ビルド結果をローカルで確認
```

`dist/` に静的ファイルが出力されます。サブパスで配信する場合は `BASE_PATH=/<path>/ pnpm build` のように指定します。

## テスト

```bash
pnpm test                    # vitest（ユニットテスト一式）
nix develop -c pnpm test:gpu # GPU（WebGL2）を使うテスト
pnpm test:watch              # ウォッチモード
```

:::caution[GPU テストは必ず `nix develop -c` で]
`pnpm test:gpu` を素の環境で実行すると、Playwright の Chromium が起動できず、GPU を使うテストが **失敗ではなくスキップ** になり、そのまま緑（exit 0）で終わります。
`nix develop -c pnpm test:gpu` で実行し、結果の件数（スキップされていないか）まで確認してください。
:::

## lint / format

```bash
pnpm lint          # oxlint --type-aware
pnpm lint:fix
pnpm format        # oxfmt
pnpm format:check
```

CI（`.github/workflows/ci.yml`）では、フォーマットチェック・lint・ビルド（型チェック込み）・ユニットテスト・GPU テストが走ります。

## そのほかのスクリプト

| スクリプト | 内容 |
| --- | --- |
| `pnpm vj:preview` | Patch を PNG に描く（[vj:preview / vj:validate](../preview-validate/)） |
| `pnpm vj:validate` | Patch をローカルで検証する（同上） |
| `pnpm measure:coverage` | 実 GPU で Generator ごとの画面の占有度を計測し、`src/synth/coverage.generated.ts` を書き直す（`nix develop` 推奨） |
| `pnpm knowledge:check` | `knowledge/` のナレッジバンドルの形式を検証する |

## デプロイ（ホスト版）

ホスト版は Cloudflare Workers で配信しています（`wrangler.jsonc`、`worker/`）。
1 つの Worker が、ビルド済みのアプリ（`dist/`）の配信と、`/room/<id>` の WebSocket リレー（Durable Object `RelayRoom`）を担当します。
デプロイは Cloudflare Workers Builds の Git 連携で行われ、ビルド時に `pnpm run build` が実行されます。
