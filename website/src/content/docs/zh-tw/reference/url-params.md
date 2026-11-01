---
title: URL 參數
description: 以 URL 指定啟動時設定的參數一覽。
---

可以用 `?key=value&key2=value2` 的形式指定啟動時的設定。
**用 URL 指定的值，優先於瀏覽器中已儲存的設定**（預設值 < 已儲存的設定 < URL）。
指定的值會原樣被儲存，所以下次不帶 URL 參數開啟時也會沿用（`ui` / `room` / `bridge` / `mirror` / `deck` 不會被儲存）。

## 外觀・聲音

| 參數 | 值 | 說明 |
| --- | --- | --- |
| `seed` | 字串（最多 64 個字元） | 種子。例：`seed=neon-tiger-042` |
| `bg` | `black` / `transparent` | 背景 |
| `ui` | `hide` | 一開始就隱藏面板（可用 `H` 叫出） |
| `gain` | 0.5～4 | 輸入 Gain（超出範圍會被修正到範圍內） |
| `hue` | 0～360 | 固定色相（指定後 Hue 會變成 `Fixed`） |
| `autogacha` | `1` / `true` | 開啟每 N 小節自動抽種子（其他值為 OFF） |
| `gachabars` | 1～512 | 自動抽種子的間隔（小節） |
| `device` | 裝置 ID | 指定音訊輸入裝置 |

## 視窗種類・連線

| 參數 | 值 | 說明 |
| --- | --- | --- |
| `deck` | `1` / `true` | 作為 Scene Deck 視窗開啟。不會啟動音訊輸入與繪圖。→ [Scene Deck](../../live/scene-deck/) |
| `room` | room id（英數字元・`_`・`-` 共 8～64 個字元） | 連線到線上版 Worker 的中繼（`/room/<id>`）。→ [遠端操作](../../live/remote/) |
| `bridge` | `1` / `true` / 不帶值 / 連接埠號碼（2～65535） | 連線到本機中繼（`ws://127.0.0.1:<port>`，預設 7877）。僅限本機版 |
| `mirror` | `1` / `true` | 與 `room` / `bridge` 一起使用，以僅供顯示（mirror）的身分連線 |

- 如果同時加上 `room` 和 `bridge`，會以 `room` 為優先。
- `room` / `bridge` 的值格式不正確時，哪裡都不會連線（避免因為打錯字而進入別的 room）。
- 沒有加上 `room` / `bridge` 的話，完全不會進行網路連線。

## 範例

```text
# OBS 用：透明背景・隱藏面板・Gain 2
https://seedshade.tainakanchu.com/?bg=transparent&ui=hide&gain=2

# 固定外觀，並每 32 小節自動抽種子
https://seedshade.tainakanchu.com/?seed=neon-tiger-042&autogacha=1&gachabars=32

# 將色相固定在 200°
https://seedshade.tainakanchu.com/?hue=200

# 由 room 操作的主要視窗 + 僅供顯示的副螢幕
https://seedshade.tainakanchu.com/?room=<id>&ui=hide
https://seedshade.tainakanchu.com/?room=<id>&mirror=1&ui=hide

# 將本機版連到本機中繼後開啟
https://localhost:5173/?bridge=1
```

:::tip[如何查詢 device 的 ID]
填入 `device` 的 ID 是瀏覽器指派的字串，面板上不會顯示。
平常不要用 URL 指定，請在面板的 **Input device** 選擇（選好的裝置會被儲存）。
:::
