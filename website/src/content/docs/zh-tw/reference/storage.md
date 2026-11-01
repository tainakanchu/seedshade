---
title: 儲存的資料
description: Seedshade 儲存在瀏覽器中的資料，以及清除與帶走的方法。
---

Seedshade 不會在伺服器儲存任何東西。所有儲存的資料都在你使用的瀏覽器裡。
儲存位置依瀏覽器・設定檔・來源（URL 的網域與連接埠）而分開。

| 內容 | 儲存位置 | key / 名稱 | 帶走的方式 |
| --- | --- | --- | --- |
| 主視窗的設定（Gain・Hue・背景・Auto-gacha・輸入裝置・種子） | `localStorage` | `seedshade-settings` | 可用 URL 參數重現 |
| Scene Deck 的手牌（自動儲存的 current 與 `A`～`H`） | `localStorage` | `seedshade-deck-banks-v1` | `JSON copy` / `JSON paste` |
| MIDI 對應 | `localStorage` | `seedshade-deck-midi-v1` | `export` / `import` |
| 登錄的圖片 | IndexedDB | `seedshade-images` | 無法帶走（要在對方那邊重新登錄同一張圖片） |

不會被儲存的東西：

- 🧬（重抽細節）、Timeline 面板的 `Apply`，以及從 CLI 送出的 Patch / 種子。重新載入後，會回到已儲存之種子的外觀。
- Timeline 預約的事件。需要的話，請用 Recording 匯出成 JSON（[Timeline 面板](../../guide/timeline/)）。
- `?ui=hide` 等暫時性的 URL 參數（`ui` / `room` / `bridge` / `mirror` / `deck`）。

## 恢復成初始狀態

在瀏覽器的開發人員工具（Application / 儲存空間）中，刪除對應的 key。
如果一次清除網站的資料，設定・手牌・MIDI 對應・圖片都會全部消失。

## 內部使用的通訊頻道

Scene Deck 與主視窗是透過同一個來源的 `BroadcastChannel`（`seedshade-deck-v1`）通訊。這只是瀏覽器內部的通訊，不會傳到網路上。
