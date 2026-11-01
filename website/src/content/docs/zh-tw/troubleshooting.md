---
title: 疑難排解 / FAQ
description: 沒有隨聲音反應、出現需要 WebGL2、很卡、Deck 連不上、CLI 連不上等問題。
---

## 沒有隨聲音反應

請由上而下依序確認。

1. **面板右上角是不是 `idle`？** 如果是 `idle`，表示音訊輸入已停止。請按 **▶ Click to start audio**。
   瀏覽器有時會阻止頁面開啟後的自動開始。這時只要點一下就會開始。
2. **有沒有出現錯誤？** 會以紅字顯示在面板上方。

   | 訊息 | 意義與處理方式 |
   | --- | --- |
   | `Microphone permission was denied. …` | 音訊輸入被拒絕。請從網址列的網站設定允許使用麥克風，再重新按一次按鈕。 |
   | `No audio input device was found.` | 找不到輸入裝置。請確認裝置是否已連接。 |
   | `The selected audio device could not be opened (in use by another app?).` | 其他應用程式獨佔了該裝置，或無法開啟。 |
   | `The selected audio device is unavailable. Pick a different one.` | 先前選的裝置已經不存在。請在 **Input device** 重新選擇。 |
   | `This browser does not support audio capture.` | 瀏覽器不支援音訊輸入，或不是以安全連線（HTTPS / localhost）開啟。 |

3. **有沒有出現 `NO SIGNAL`？** 音訊輸入在運作，但沒有聲音進來。請確認 **Input device** 是否正確，以及播放端的輸出目的地是否正確。
   要擷取歌曲的聲音需要回送（[桌面音訊](../live/obs/#讓畫面對桌面音訊產生反應)）。
4. **音量表有在動，但畫面的反應很弱。** 請調高 **Gain**。
5. **正在 OBS 的瀏覽器來源中使用。** 瀏覽器來源有時無法取得音訊輸入（[OBS](../live/obs/)）。

## 聲音停止時畫面也幾乎停住

這是設計如此。無聲時畫面的時間會變成平常約 5% 的速度，拍點的反應也會停止。有聲音進來就會恢復。

## 出現「WebGL2 が必要です」

Seedshade 必須在能使用 WebGL2 的環境下才能繪圖。

- 請確認瀏覽器設定中的硬體加速（「可用時使用圖形加速」等）是否已啟用。
- 使用 Chrome / Edge 的話，可以在 `chrome://gpu` 確認 WebGL2 是否有效。
- 在虛擬機器或透過遠端桌面時，可能無法使用。

## 很卡 / 不順暢

- 負載重時，內部的繪圖解析度會自動降低（可在 Timeline 面板的 `quality` 確認）。若仍然很卡，請換成比較輕的畫面（其他種子、Deck 的其他欄位）。
- 筆電請接上電源，並關閉省電模式。
- 關閉其他吃資源的分頁與應用程式。
- 畫布解析度限制在裝置像素比 1.5 以內。因此即使是解析度更高的顯示器，負載也不會增加。把視窗（OBS 的話是來源）的尺寸縮小會比較輕。

## 面板消失了 / 游標消失了

- 滑鼠停止約 3 秒後，控制面板與游標會自動消失。移動滑鼠就會恢復。
- 按 `H` 會隱藏控制面板與 Timeline 面板。再按一次 `H` 就會恢復。以 `?ui=hide` 開啟時也一樣。

## 重新載入後外觀又變回去了

儲存的只有面板 **Look** 上顯示的種子。🧬（重抽細節）、Timeline 的 `Apply`、從 CLI 送出的種子與 Patch、Deck 的一鍵切換都不會被儲存。
想保留的外觀，請存進 Deck 的手牌（`A`～`H`），或做成[配方](../ai/recipe-set/)。

## 用 URL 指定的設定下次還在

用 URL 參數指定的值（`seed`、`hue`、`bg` 等）會原樣被儲存。下次不帶 URL 參數開啟時也會沿用，想恢復的話請在面板上重新設定。

## 從區域網路的其他裝置開啟時出現警告

本機版（`pnpm dev`）使用自簽憑證的 HTTPS 運作，所以瀏覽器會顯示警告。請點選「進階」→「繼續前往」。
麥克風只能在安全連線（HTTPS 或 localhost）下使用，所以無法改成 HTTP。

## Scene Deck

| 症狀 | 處理方式 |
| --- | --- |
| 按 `S` 但視窗沒有開啟 | 請確認瀏覽器的彈出視窗封鎖，並允許此網站的彈出視窗。 |
| 「メイン窓が見つかりません」（找不到主視窗） | 請用同一個瀏覽器、同一個 URL（來源）開啟主視窗。不同的瀏覽器或設定檔，或是線上版與本機版的組合，都無法通訊。 |
| 無法從 Deck 進入全螢幕 | 全螢幕必須在主視窗按 `F`。Deck 的 `F` 是讓 Deck 自己的視窗進入全螢幕。 |
| 一鍵切換被拒絕（`timeline is locked for …`） | Timeline 處於鎖定中。可以用 Deck 的 `L` 解除。 |
| `[` `]` `=` 沒有作用 | 在 JIS 配置下，它們位於 `@` `[` `^` 的按鍵位置（[快捷鍵](../reference/shortcuts/)）。 |
| 2 個畫面同時切換 | 在同一個瀏覽器開了 2 個主視窗。請只保留 1 個。 |

## MIDI 沒有作用

- 你有在 Deck 視窗按 **MIDI** 按鈕嗎？（主視窗不接收 MIDI）
- 請使用 Chrome / Edge。Safari 不支援，Firefox 需要附加元件。
- 請確認其他應用程式（DAW 等）有沒有獨佔該裝置。
- 如果 nanoPAD2 在其他應用程式中不再送出平常的音符，請拔插 USB（[MIDI](../live/midi/)）。

## 無法從 CLI / AI 連線

| 錯誤 | 原因與處理方式 |
| --- | --- |
| `no synth connected` | 主視窗沒有連到中繼。請確認 URL 是否有加上 `?room=<id>`（線上版）或 `?bridge=1`（本機版），以及 room id 是否與 CLI 相同。只有 `mirror=1` 的視窗不會回應。 |
| 在線上版加上 `?bridge=1` 仍然出現 `no synth connected` | 本機中繼會拒絕來自線上版的連線。線上版請使用 `?room=`（[線上版與本機版](../reference/hosted-vs-local/)）。 |
| 無法連線（`ECONNREFUSED` 等） | 本機版的話，是 `pnpm bridge` 尚未啟動。 |
| `timeout waiting for synth` | 主視窗的分頁可能跑到背景而使繪圖停止。請把主視窗切到前景。 |
| `vj-gen: --url が指定されておらず…`（未指定 `--url`…） | `vj-gen` / `vj-tweak` / `vj-recipe apply` 必須指定連線目的地。請指定 `--url` 或 `VJ_URL`。 |
| 用 `room` 建立的 URL 變成 `seedshade.<account>.workers.dev` | 請加上 `--host seedshade.tainakanchu.com` 重新建立。 |
| 出現不存在的 Generator / 參數的錯誤 | 目錄的快取可能過期。請加上 `--refresh-catalog`。 |

## 之前儲存的 Patch 無法套用

Generator 更新後版本會升級，指定舊版本的 Patch 會在驗證時失敗（`generatorVersion` 不一致）。
想長期使用的外觀，請用[配方](../ai/recipe-set/)儲存，而不是 Patch。Deck 的手牌不會失敗，而是顯示 `STALE`（[儲存手牌](../live/banks/#出現-stale-時)）。
