---
title: 原理與連線
description: 從 CLI / AI 操控 Seedshade 的原理，以及指定連線目的地的方法。
---

Seedshade 在畫面上能做的操作，也都能從 CLI（命令列）執行。
讓 AI（Claude Code 等）去執行這些 CLI，就能用「再潮濕一點」「8 小節後換成這個畫面」這類指示來操控畫面。

## 原理

```
CLI（vj-ctl 等） ──WebSocket──▶ 中繼（room / bridge） ──WebSocket──▶ 主視窗（瀏覽器）
```

- 中繼只負責轉送指令，完全不對畫面做任何判斷。
- 主視窗會用與 Timeline 面板、畫面操作**相同的入口**執行收到的指令。Patch 的驗證也同樣有效。
- CLI 每次執行只送出一個指令，顯示結果的 JSON 後就結束。

中繼的準備方式（room / bridge）請參閱[遠端操作與多螢幕](../../live/remote/)。

## CLI 一覽

全部都放在儲存庫的 `scripts/` 中。請在操作端的電腦 clone 儲存庫並執行 `pnpm install`（需要 Node.js 24 與 pnpm）。

| CLI | 呼叫方式 | 功能 |
| --- | --- | --- |
| `vj-ctl` | `node scripts/vj-ctl.mjs` | 一次送一個指令的基本 CLI。取得狀態、套用種子 / Patch、預約 Timeline、錄製等。→ [vj-ctl](../vj-ctl/) |
| `vj-gen` | `node scripts/vj-gen.mjs` / `pnpm vj:gen` | 從情緒關鍵字生成 Patch 並送出。→ [vj:gen / vj:tweak](../gen-tweak/) |
| `vj-tweak` | `node scripts/vj-tweak.mjs` / `pnpm vj:tweak` | 只改寫目前 Patch 的一部分並送出。→ [vj:gen / vj:tweak](../gen-tweak/) |
| `vj-recipe` | `node scripts/vj-recipe.mjs` / `pnpm vj:recipe` | 從儲存的配方重新產生 Patch 並送出。→ [vj:recipe / vj:set](../recipe-set/) |
| `vj-set` | `node scripts/vj-set.mjs` / `pnpm vj:set` | 把多個場景預先安排成 cue，演出時依序推進。→ [vj:recipe / vj:set](../recipe-set/) |
| `vj-bridge` | `pnpm bridge` | 啟動本機中繼。 |
| `vj-validate` | `pnpm vj:validate` | 用真正的驗證規則在本機驗證 Patch（不進行通訊）。→ [vj:preview / vj:validate](../../dev/preview-validate/) |
| `vj-preview` | `pnpm vj:preview` | 把 Patch 繪製成 PNG（不進行通訊）。→ [vj:preview / vj:validate](../../dev/preview-validate/) |

:::note
`vj-ctl` 沒有 `pnpm` 的腳本名稱。請用 `node scripts/vj-ctl.mjs` 呼叫。
:::

## 指定連線目的地

各個 CLI 指定連線目的地的方式略有不同。

| CLI | 沒有指定時 | 指定方式 |
| --- | --- | --- |
| `vj-ctl` | 本機中繼 `ws://127.0.0.1:7877` | `--url <ws(s)://…>` 或 `--port <n>` |
| `vj-set` | 本機中繼（`vj-ctl` 的預設值） | `--url` 或 `--port` |
| `vj-gen` / `vj-tweak` / `vj-recipe` | **錯誤**（必須指定） | `--url <ws(s)://…>` 或環境變數 `VJ_URL` |

連線目的地的 URL 如下。

| 中繼 | URL |
| --- | --- |
| room（線上版） | `wss://seedshade.tainakanchu.com/room/<id>` |
| bridge（本機） | `ws://127.0.0.1:7877` |

:::tip[不用每次都寫 `--url`]
`vj-gen` / `vj-tweak` / `vj-recipe` 會讀取環境變數 `VJ_URL`。

```bash
export VJ_URL=wss://seedshade.tainakanchu.com/room/<id>   # bash / zsh
set -x VJ_URL wss://seedshade.tainakanchu.com/room/<id>   # fish
```

`vj-ctl` 與 `vj-set` 不會讀取 `VJ_URL`，所以這兩個請加上 `--url`。
:::

## 輸出的看法（通用）

| 結果 | 意義 |
| --- | --- |
| exit 0，stdout 輸出 JSON | 成功 |
| exit 1，`{"ok":false,"issues":[…]}` 等 | 通訊成功，但指令被駁回（Patch 驗證失敗、處於鎖定中等）。請閱讀 issues 後修正 |
| exit 1，`{"error":"…"}` | 通訊或參數錯誤。stderr 會顯示提示 |

常見的錯誤：

- `no synth connected` … 主視窗沒有連上。請確認頁面 URL 是否有加上 `?room=` / `?bridge=1`，以及 room id 是否正確。
- `timeout waiting for synth` … 主視窗沒有回應。可能是瀏覽器分頁跑到背景而使繪圖停止。請把主視窗切到前景。
- 無法連線（`ECONNREFUSED` 等） … 本機的話是 `pnpm bridge` 尚未啟動。
