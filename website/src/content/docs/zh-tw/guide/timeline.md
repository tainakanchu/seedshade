---
title: Timeline 面板
description: 預約演出事件、直接編輯 Patch、蓋印圖片，以及記錄與重播演出。
---

畫面右上角的 **Timeline 面板**，是用來精細操控 Semantic Synth 的進階面板。
從 CLI 或 AI 操控時使用的操作（[vj-ctl](../../ai/vj-ctl/)），也能在畫面上手動執行。

由上而下依序排列著下列區塊。可以用面板右上角的 `▾ close` 收合，也可以用 `H` 隱藏（連同控制面板一起）。

## State（目前的狀態）

| 顯示 | 內容 |
| --- | --- |
| `idle` / `transitioning` | 是否正在過渡到下一個外觀。 |
| `seed` | 目前顯示中的 Patch 的種子。 |
| `operators` | 依序顯示組成目前 Patch 的 Generator（例：`spectrumBars › gamma › sodium`）。 |
| `quality` | 內部繪圖解析度的倍率（1.00 = 原倍。負載重時會自動降低）。 |
| `tempo` | `locked` / `free`，以及正在計數的小節編號（`bar N`）。 |

若顯示 `synth is not running (WebGL2 required)`，表示繪圖沒有在運作（[疑難排解](../../troubleshooting/)）。

## Patch（直接編輯目前的 Patch）

這裡顯示目前正在使用的 Patch 的 JSON。

1. 直接改寫文字欄（一改寫就會顯示 `edited`，不再跟隨即時的 Patch）。
2. 按 **Apply** 會進行驗證，通過後就過渡到新的 Patch。
3. 驗證失敗時，原因會以條列顯示在下方。
4. 按 **Reload** 會捨棄編輯，重新載入目前即時的 Patch。

Patch 的限制（Generator 的數量・順序・參數範圍等）詳見 [Semantic Synth 的原理](../semantic-synth/)，以及給 AI 用的 [vj-director 技能](../../ai/claude-code/)。

## Events（預約事件清單）

已登錄在 Timeline 的事件會依觸發順序排列。

| 顯示 | 意義 |
| --- | --- |
| `@12.0s` | 在第 12 秒觸發（場景時鐘的秒數） |
| `@bar 16` | 在第 16 小節觸發 |
| `@ext:drop` | 等待以名為 `drop` 的手動觸發（external） |
| `locked` | 無法編輯的事件 |
| `fired` | 已觸發 |

按 `✕` 刪除事件。

## Add event（預約事件）

預約「N 秒後 / N 小節後切換到這個種子」。

1. 在第 1 行選擇基準。
   - `+sec` … 從現在起 N 秒後
   - `+bars` … 從現在起 N 小節後（**只有在節拍已鎖定時才會觸發**）
   - `external` … 取一個名稱（external id）並待命。在下方的 **External** 按 `Fire` 之前不會觸發
2. 輸入數值（或 external id）。
3. 在第 2 行輸入種子。留空的話會使用隨機種子。
4. 選擇過渡的速度。

   | 預設組 | 說明 |
   | --- | --- |
   | `default` | 標準（顏色 1.2 秒、組成替換 2 秒等） |
   | `slow` | 花費 `default` 的 2 倍時間慢慢融合 |
   | `cut` | 約 0.12 秒內切換 |

5. 按 **Add**。

## Locked until（鎖定）

輸入數值並按 **Set**，就會「鎖定」到該時刻（場景時鐘的秒數）為止。
鎖定期間，下列操作會被拒絕。

- 編輯、刪除在該時刻之前觸發的事件
- 從 Scene Deck 一鍵切換

:::caution
這裡輸入的值不是「從現在起幾秒」，而是**場景時鐘的絕對秒數**。輸入 `0` 就會解除。
想鎖定從現在起 N 秒的話，用 Scene Deck 的 `L`（鎖定 30 秒 ⇄ 解除），或 CLI 的 `vj-ctl lock <秒>`（相對指定）會比較簡單。

此外，鎖定是為 Timeline 與 Scene Deck 設的保護，不會阻止主視窗的 `R` / `D`、Patch 的 `Apply`，以及 CLI 的 `vj-ctl seed` / `patch`。
:::

## External（手動觸發）

輸入 external id 並按 **Fire**，就會觸發以該 id 待命的 `external` 事件（若有多個相同 id 的事件則全部觸發）。
適合預約好「Drop 的瞬間換成這個畫面」，而只想用手決定時機的情況。

## Images（蓋印圖片）

可以把 Logo 等圖片放進畫面。

1. 將圖片（PNG / JPG / WebP / GIF / SVG / AVIF）拖放到主視窗的任何位置。也可以從檔案選擇按鈕登錄。
2. 在出現於清單的圖片上按 **stamp に使う**（用作 stamp）。
3. 目前的 Patch 會加入 `stamp` Generator（若已存在則只替換圖片），並繪出該圖片。

- 登錄的圖片會儲存在瀏覽器的 IndexedDB（`seedshade-images`），下次仍會留在清單中。
- 每個 Patch 的 Source 最多 2 個，所以若已經有 2 個，最後一個 Source 會被移除並換成 `stamp`。
- `stamp` 不會在種子抽選中被選到。重抽種子後圖片會消失，請再按一次 **stamp に使う**。

## Recording（記錄與重播演出）

1. 按 **● Record** 開始記錄。之後的 Timeline 操作（新增、刪除事件等）與觸發都會被記錄。
2. 按 **■ Stop & save** 停止後，會下載 `performance-<數字>.json`。
3. 用右邊的檔案選擇器載入 JSON，就會還原記錄下來的 Timeline，並在回到開始記錄時的 Patch 之後重播。

:::note
記錄的時刻是場景時鐘（開啟頁面後經過的時間）的秒數。
在已經超過該時刻的頁面載入時，過去的事件可能會一次全部觸發。
想要精確重現時，請重新開啟頁面後再載入。
:::
