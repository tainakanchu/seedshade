---
title: 文字節點（type / typeMask / typeWarp）
description: 不是把文字疊在畫面上，而是作為 Semantic Synth 的節點放進去。可調整粗細、描邊與模糊，並以音訊調變。
---

這項功能不是把文字「疊在上面」，而是 **把文字作為 Semantic Synth 的節點放進管線**。
輸入的文字會變成有號距離場（SDF）貼圖，因此粗細、描邊與模糊都能用參數調整，也能成為[音訊調變](../semantic-synth/#聲音如何驅動畫面)的對象。

- 更換文字 **不會重新編譯著色器**，會當場切換（Patch 的結構不變）。
- 抽種子（gacha）時不會出現，**只有手動加入時才會放進去**。
- 文字連同內容會存在 Patch 的 `texts` 中（鍵為 `<opId>.<slot>`，值為 `{text, font, weight}`；text 最多 200 字，font 為 CSS 的 font-family，weight 為 100–900）。
- 未指派文字時，`type` 不會繪製任何東西，`typeMask` 沒有效果，`typeWarp` 的位移為 0。

## 三種節點

三者共通擁有 `scale` / `softness` / `weight` / `fit`（部分節點只有其中幾項）。

### type（Source）

文字本身成為密度（畫面）。

| 參數 | 範圍 / 值 | 預設 | 說明 |
| --- | --- | --- | --- |
| `fit` | `contain` / `cover` / `tile` | `contain` | 文字的容納方式（不能以音訊調變） |
| `scale` | 0.2–4 | 0.9 | 大小 |
| `weight` | -1–1 | 0 | 正值變粗，負值變細 |
| `softness` | 0–1 | 0.05 | 輪廓的模糊 |
| `outline` | 0–1 | 0 | 0 為填滿；大於 0 為描邊（數值即線的粗細） |
| `stagger` | 0–1 | 0 | 每個字錯開相位的上下晃動與粗細脈動，踢鼓時會增強 |
| `invert` | 開 / 關 | 關 | 反轉文字的內外 |

### typeMask（Modifier）

以文字的形狀處理其他花紋。

| 參數 | 範圍 / 值 | 預設 | 說明 |
| --- | --- | --- | --- |
| `mode` | `knockout` / `keep` / `xor` | `knockout` | `knockout` 挖掉文字部分，`keep` 只留下文字部分，`xor` 反轉 |
| `amount` | 0–1 | 1 | 效果強度 |
| `weight` / `softness` / `fit` / `scale` | 同上 | — | 與 `type` 相同 |

### typeWarp（Field）

本身不繪製文字，而是 **沿著文字輪廓扭曲座標**。

| 參數 | 範圍 / 值 | 預設 | 說明 |
| --- | --- | --- | --- |
| `amount` | 0–1 | 0.3 | 扭曲強度 |
| `radius` | 0.05–1 | 0.5 | 自輪廓向外的衰減寬度 |
| `mode` | `push` / `pull` / `swirl` | `push` | 推開 / 吸入 / 旋渦 |
| `fit` / `scale` | 同上 | — | `tile` 以 `contain` 的大小鋪滿 |

## 使用方式（Texts 區段）

在 Timeline 面板的 **Texts** 區段（Images 下方）操作。

1. 按下 **`+ type`** / **`+ mask`** / **`+ warp`**，該節點就會加入 Patch，欄位會填入 `SEEDSHADE`。若該類別已達上限，則取代最後一個。
2. 每個欄位都有文字輸入區、font-family 欄、weight 欄（以 100 為單位）與 clear 按鈕。
3. 文字以 **Enter 確定**（Shift+Enter 換行，輸入法組字中的 Enter 會被忽略）。移開焦點，或停止輸入 450ms 後也會套用。font 在 Enter / 移開焦點時套用，weight 在移開焦點或 450ms 後套用。
4. 從外部更改的值，只要不在編輯中，也會反映到輸入欄。

:::tip
過長的單行文字會變得很小，建議換行成多行。
輸入不存在的 font 名稱時，會以瀏覽器的備援字型繪製。
:::

## 使用範例

- 在曲子進行中帶入 MC 名稱或歌詞（`type`）。
- 從半色調等花紋中挖出文字的形狀（`typeMask` 的 `knockout`）。
- 看不到文字，但花紋會沿著文字的形狀旋轉（`typeWarp` 的 `swirl`）。

## 從外部操作

可用 Bridge 的 JSON-RPC `setText` 更換文字。

```json
{ "key": "type0.0", "text": "SEED\nSHADE", "weight": 900 }
```

- `key` 為 `<opId>` 或 `<opId>.<slot>`。`text` / `font` / `weight` / `clear` 皆為選填。
- `clear: true`，或省略 `text` 即解除。回傳值為 `{ok, issues}`。
- 前提是 Patch 中必須包含 `type` 系列的節點。

CLI 則使用 `vj-ctl` 的 `text` 指令（[vj-ctl](../../ai/vj-ctl/)）。

```bash
node scripts/vj-ctl.mjs text type0 "SEED\nSHADE" --weight 900   # \n 為換行
node scripts/vj-ctl.mjs text type0                                # 省略字串即解除
```

相關：圖片請見 [Timeline 面板的 Images](../timeline/#images蓋印圖片)。
