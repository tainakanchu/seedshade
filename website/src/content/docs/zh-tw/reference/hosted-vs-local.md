---
title: 線上版與本機版
description: 公開版應用程式（線上版）能做的事，以及只有在自己電腦上啟動的本機版才能做的事。
---

Seedshade 有 2 種使用方式。

| | 線上版 | 本機版 |
| --- | --- | --- |
| URL | [https://seedshade.tainakanchu.com](https://seedshade.tainakanchu.com)（開啟 `https://seedshade.tainakanchu815.workers.dev` 也是同樣的內容） | 用 `pnpm dev` 啟動的 `https://localhost:5173/` |
| 內容 | 建置 `main` 分支的結果（透過 Cloudflare Workers 提供） | 你電腦上的程式碼 |
| 準備 | 不需要 | Node.js 24・pnpm・clone 儲存庫 |

線上版的 Worker 只負責提供已建置好的應用程式，以及 `/room/<id>` 的 WebSocket 中繼（轉送來自 CLI 的操作）。聲音與畫面不會被傳送到伺服器。

## 功能比較

| 功能 | 線上版 | 本機版 |
| --- | --- | --- |
| 繪圖・音訊輸入・控制面板 | ○ | ○ |
| Timeline 面板（預約・Patch 編輯・圖片・錄製） | ○ | ○ |
| Scene Deck・手牌・MIDI | ○ | ○ |
| OBS 的瀏覽器來源 | ○ | ○（因為是自簽憑證，OBS 端可能會出現憑證錯誤） |
| 用 `?room=` 從 CLI / AI 操作 | ○ | ×（開發伺服器沒有 `/room` 的中繼） |
| 用 `?bridge=1` + `pnpm bridge` 從 CLI / AI 操作 | ×（本機中繼會拒絕來自 `localhost` 以外頁面的連線） | ○（僅限同一台電腦內） |
| 用 `mirror` 輸出到多個螢幕 | ○（與 `room` 併用。其他電腦、其他網路也可以） | △（與 `bridge` 併用。僅限同一台電腦內） |
| 在區域網路的其他裝置開啟 | ○（只要開啟 URL） | ○（`https://<電腦的 IP>:5173/`。會有憑證警告。無法使用 bridge） |
| 不連網路使用 | × | ○（`pnpm dev`，或 `pnpm build` → `pnpm preview`） |
| `vj:preview` / `vj:validate` | —（兩者都是在儲存庫上執行的 CLI，不會連接應用程式） | — |

不論哪種情況，CLI（`vj-ctl` / `vj-gen` 等）都是在 clone 了儲存庫的電腦上執行。操作線上版時，請指定 `--url wss://seedshade.tainakanchu.com/room/<id>`。

## 儲存的資料不會共用

設定・Scene Deck 的手牌・MIDI 對應・登錄的圖片，都是**依瀏覽器與來源（URL 的網域）分別**儲存的。

- 線上版（`seedshade.tainakanchu.com`）與 `workers.dev` 的 URL 是不同的來源，所以儲存的資料各自獨立。
- 與本機版（`localhost:5173`）也不會共用。
- 請用與演出時開啟的相同 URL 來準備。手牌與 MIDI 對應可以用 JSON 帶著走（[儲存手牌](../../live/banks/)・[MIDI](../../live/midi/)）。

詳情請參閱[儲存的資料](../storage/)。

## 該用哪一個

- **總之先用用看・演出時使用** → 線上版。從 AI / CLI 操作時用 `?room=`。
- **會場沒有網路・想試用開發中的功能** → 本機版。
- **在同一台電腦上和 Claude Code 一起細修** → 兩者皆可。本機版用 `pnpm bridge`，線上版用 `room`。
