---
title: 本機啟動・建置・測試
description: 啟動開發伺服器、建置、測試（包含 GPU 測試）、lint / format，以及部署。
---

## 需要準備的東西

- Node.js 24（儲存庫的 `.node-version`）
- pnpm 10（`package.json` 的 `packageManager`）
- 若要執行 GPU 測試或 `vj:preview`，需要 [Nix](https://nixos.org/)（`flake.nix` 的開發 shell 會準備 Chromium 與所需的函式庫）

技術堆疊是 Vite + React 19 + TypeScript。繪圖與音訊分析是不依賴 React 的純 TypeScript class（`src/render/`、`src/audio/`、`src/scenes/`、`src/synth/`），React 只負責 UI 與設定。執行階段的相依套件只有 React 和 valibot，沒有使用 three.js 之類的繪圖函式庫。

## 啟動

```bash
pnpm install
pnpm dev
```

- 開發伺服器會以**自簽憑證的 HTTPS**（`@vitejs/plugin-basic-ssl`）啟動。URL 通常是 `https://localhost:5173/`。第一次會出現瀏覽器的警告，請點選「進階」→「繼續前往」。
- 也會對區域網路公開（`server.host: true`）。麥克風（`getUserMedia`）只能在安全環境（HTTPS 或 localhost）中使用，所以為了能在區域網路的其他裝置上試用，才採用 HTTPS。
- 要從 CLI 操作時，請在另一個終端機啟動 `pnpm bridge`，並加上 `?bridge=1` 開啟（[遠端操作](../../live/remote/#用-bridge本機版操作)）。

## 建置

```bash
pnpm build     # tsc -b && vite build（包含型別檢查）
pnpm preview   # 在本機確認建置結果
```

靜態檔案會輸出到 `dist/`。若要以子路徑提供服務，請像 `BASE_PATH=/<path>/ pnpm build` 這樣指定。

## 測試

```bash
pnpm test                    # vitest（全部單元測試）
nix develop -c pnpm test:gpu # 使用 GPU（WebGL2）的測試
pnpm test:watch              # 監看模式
```

:::caution[GPU 測試一定要用 `nix develop -c`]
在一般環境下執行 `pnpm test:gpu` 的話，Playwright 的 Chromium 無法啟動，使用 GPU 的測試會**不是失敗而是被略過**，並就這樣以綠燈（exit 0）結束。
請用 `nix develop -c pnpm test:gpu` 執行，並確認結果的件數（有沒有被略過）。
:::

## lint / format

```bash
pnpm lint          # oxlint --type-aware
pnpm lint:fix
pnpm format        # oxfmt
pnpm format:check
```

在 CI（`.github/workflows/ci.yml`）中會執行格式檢查、lint、建置（包含型別檢查）、單元測試與 GPU 測試。

## 其他腳本

| 腳本 | 說明 |
| --- | --- |
| `pnpm vj:preview` | 把 Patch 繪製成 PNG（[vj:preview / vj:validate](../preview-validate/)） |
| `pnpm vj:validate` | 在本機驗證 Patch（同上） |
| `pnpm measure:coverage` | 用真實 GPU 測量每個 Generator 的畫面佔有率，並改寫 `src/synth/coverage.generated.ts`（建議在 `nix develop` 中執行） |
| `pnpm knowledge:check` | 驗證 `knowledge/` 知識庫套件的格式 |

## 部署（線上版）

線上版是透過 Cloudflare Workers 提供（`wrangler.jsonc`、`worker/`）。
同一個 Worker 同時負責提供已建置好的應用程式（`dist/`），以及 `/room/<id>` 的 WebSocket 中繼（Durable Object `RelayRoom`）。
部署是透過 Cloudflare Workers Builds 的 Git 整合進行，建置時會執行 `pnpm run build`。
