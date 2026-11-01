---
title: MIDI 控制器
description: 用 MIDI Pad 操作 Scene Deck。支援 KORG nanoPAD2 的 Native 模式，以及用 learn 設定對應。
---

Scene Deck 的視窗接受 **Web MIDI**。可以用 Pad 控制器進行一鍵切換與 Tap tempo。

- 接收 MIDI 的**只有 Scene Deck 視窗**（主視窗不接收）。
- Web MIDI 不需要焦點，所以**即使 Deck 視窗在背景也有效**。

## 支援的瀏覽器

| 瀏覽器 | 支援情形 |
| --- | --- |
| Chrome / Edge | 原生支援 |
| Firefox | 需要 Web MIDI 用的網站權限附加元件（Firefox 108 以上） |
| Safari | 不支援。Deck 可以運作，但會顯示 `MIDI 非対応`（不支援 MIDI） |

## 開始使用

1. 先把控制器接上電腦，再開啟 Scene Deck。
2. 按工具列的 **MIDI** 按鈕。
3. 瀏覽器會詢問是否允許使用 MIDI（包含 SysEx），請允許。
   如果拒絕了 SysEx，會改為不含 SysEx 重新連線，並顯示 `SysEx なし`（無 SysEx）（一般的音符 / CC 可以使用，但無法使用下方 nanoPAD2 的自動設定）。
4. 按鈕變成 `MIDI on`，MIDI 那一列會顯示已連線的裝置名稱（什麼都沒有時顯示 `no inputs`）。

如果不小心拒絕了權限，按鈕會變成 `MIDI retry`。請先在瀏覽器的網站設定中允許 MIDI，再重新按一次。

## KORG nanoPAD2

nanoPAD2 只要接上，幾乎不需要設定就能使用。

1. 啟用 MIDI 後，會透過 SysEx 尋找 nanoPAD2，並切換到 **Native KORG Mode**。成功的話會出現 `native` 標章。
2. 若無法進入 Native 模式，則會讀取機身的設定（Scene Data Dump），依 Pad 的音符編號自動產生對應（`dump` 標章）。
3. 出現**請敲敲看 pad 1 確認**（原文：pad 1 を叩いて確認してください）時，請敲 1 號 Pad（pad 1）。
   如果敲到的不是預期的 Pad，會顯示**位置有偏差，要 learn 嗎**（原文：ズレています。learn しますか），請用 `learn` 重新指定對應。

### 預設對應（Native 模式）

| nanoPAD2 | Deck 的操作 |
| --- | --- |
| 下排 8 個 Pad（Note 72–79 / ch 2） | 輸出欄位 1～8 |
| 上排 8 個 Pad（Note 64–71 / ch 2） | 以 `cut` 輸出欄位 1～8 |
| Scene 按鈕（CC 57 / ch 16） | Tap tempo |
| X-Y Pad 的觸碰（CC 11 / ch 16） | 輸出游標所在的欄位 |

- 如果覺得上下顛倒，請開啟 MIDI 那一列的**上下入替**（上下對調；原文：上下入替）。
- X / Y 軸預設沒有指定任何功能。可以用 learn 指定給 Hue 或自動換場的間隔。
- Touch Scale 的音符會被忽略。

### Scene LED（僅限 Native 模式）

| LED | 意義 |
| --- | --- |
| Scene 1 | 已連接主視窗 |
| Scene 2 | Deck 的自動換場為 ON |
| Scene 3 | 節拍已鎖定 |
| Scene 4 | learn 中。發生錯誤時會閃爍 |

:::caution[解除 Native 模式]
關閉 Deck 視窗（或重新載入）時，會送出訊號讓 nanoPAD2 離開 Native 模式。
如果因為瀏覽器被強制結束等原因而沒有恢復，nanoPAD2 會停留在 Native 模式，其他應用程式就無法收到平常的音符。
這時請**拔插 USB，或重新開關電源**。
:::

## 其他控制器（learn）

nanoPAD2 以外的控制器，或是不使用 Native 模式時，用 **learn** 來指定對應。

1. 啟用 MIDI 後，將工具列的 **learn** 設為 ON。
2. 從 MIDI 那一列排出的操作（`pad 1`～`pad 8`、`pad N cut`、`cursor fire`、`transition`、`auto`、`auto mode`、`interval +`、`interval -`、`interval abs`、`rebuild`、`gacha bank`、`tap`、`seed gacha`、`details`、`hue`）中，選擇想指定的項目。
3. 敲控制器的 Pad / 轉動旋鈕。
4. 如果相同的觸發已經指定給其他操作，會覆寫並顯示**上書きしました（既存のトリガー）**（已覆寫（既有的觸發））。
5. 按 **Esc**，或再按一次 **learn** 即結束。learn 期間鍵盤操作仍可使用。

`interval abs`（自動換場的間隔）與 `hue`（固定 Hue）是適合旋鈕或推桿連續值的操作。其他則是以按鈕（按下的瞬間）運作。

### 用力度切換為 cut

在 MIDI 那一列的 `cut ≥` 填入 1～127 的數值，敲 Pad 的力道達到該強度以上時會以 `cut` 輸出，較輕敲時則使用選取中的預設組。留空即為關閉。

## 儲存與帶走對應

- 對應會自動儲存到瀏覽器的 `localStorage`（key 為 `seedshade-deck-midi-v1`）。也可以取名稱。
- 用 MIDI 那一列的 `export` 把 JSON 複製到剪貼簿，再到另一台電腦的 Deck 把 JSON 貼進文字欄並按 `import`，就能使用相同的對應。
- 取消勾選 `Native`，就會在不切換為 Native 模式的情況下使用 nanoPAD2。
