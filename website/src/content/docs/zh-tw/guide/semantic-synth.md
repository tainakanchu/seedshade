---
title: Semantic Synth 的原理
description: Generator 的 4 個類別、聲音如何驅動畫面，以及從舊場景移植過來的音訊類 Generator。
---

Seedshade 繪製的畫面全都出自 **Semantic Synth** 這一個引擎。
它不是切換固定的繪圖程式，而是**每次都從種子組裝出 GLSL 著色器**再繪製。
這裡說明操作時知道會有幫助的原理。

## Patch 與 Generator

一種外觀會以名為 **VisualPatch**（以下簡稱 Patch）的 JSON 來表示。
Patch 是把幾個零件，也就是 **Generator**，由上往下依序疊起來。Generator 分成 4 個類別。

| 類別 | 作用 | 每個 Patch 可放的數量 | 種類數 |
| --- | --- | --- | --- |
| **Source** | 繪製畫面基底的紋樣、圖形 | 1～2 | 60 |
| **Field** | 扭曲、流動座標（扭曲、波動、鏡頭等） | 0～2 | 17 |
| **Modifier** | 加工顏色與階調（閾值、gamma 等） | 1～3 | 23 |
| **Material** | 最後加上質感（光、高光、材質感等） | 1 | 27 |

合計 **127 種**。疊放順序一定是 Source → Field → Modifier → Material。
抽種子時，會在這個範圍內決定數量與種類，同時決定各自的參數、配色（palette）與構圖（composition：對稱數・縮放・速度）。

:::tip
目前使用了哪些 Generator，可以在 Timeline 面板的 **State** → `operators` 中看到（例：`qilouShutter › humidityLens › gamma › sodium`）。
:::

想一次看過所有 Generator 實際的外觀，可以用開發者用的 `vj:preview --contact-sheet` 輸出成一張圖（[vj:preview / vj:validate](../../dev/preview-validate/)）。

## 聲音如何驅動畫面

聲音的分析結果（低頻 `bass`・中頻 `mid`・高頻 `treble`・音量 `level`・拍點 `beat` 與小節相位等）會透過下列 3 條途徑影響畫面。

### 1. 時間前進的速度

畫面的時間不是以固定速度前進，而是**依聲音大小改變前進的速度**。

- **無聲時幾乎靜止**（約為平常速度的 5%）。
- 有聲音進來就快速加速，聲音停止後會花不到 1 秒慢慢減速。
- 如果 BPM 已鎖定，整體速度會依節拍在 0.7～1.25 倍之間變化，並在拍頭稍微往前推一下。

### 2. 調變（Patch 內的連結）

Patch 內含「用哪個聲音的數值驅動哪個參數」的連結（route）。
由種子自動產生的連結，設計成**聲音越大，就只會往「更看得見・更會動」的方向作用**。
因此不會發生在持續大音量的俱樂部裡畫面越來越暗的狀況。

### 3. 拍點觸發的效果

整個畫面會套用配合拍點的反應（**音訊反應**）。
每個 Patch 會依 Generator 的組成，決定 1～2 種作用於座標的反應與 1 種作用於顏色的反應。
重抽種子而組成改變時，拍點觸發的效果也會跟著改變。用 🧬（只重抽細節）則不會變。

| 作用於座標 | 說明 |
| --- | --- |
| `punchZoom` | 拍頭時畫面拉近 |
| `sliceShift` | 每條橫帶各自水平位移（像磁帶跳動的故障特效） |
| `blockCrush` | 拍點時壓成巨集區塊 |
| `jitter` | 拍點時畫面跳動，高頻時細微抖動 |
| `spinKick` | 拍點時旋轉被踢一下 |
| `waveTear` | 掃描線橫向撕裂並流動 |
| `mirrorSnap` | 拍點時摺成鏡像 |
| `swellDrift` | 湧浪橫向流動（像海面一波波來去） |
| `setSurge` | 以長週期的湧浪緩緩拉近並抬升 |

| 作用於顏色 | 說明 |
| --- | --- |
| `rgbSplit` | 拍點時 R/B 橫向錯開（色差故障特效） |
| `echoGhost` | 拍點時，稍微縮小的殘影疊在後方 |
| `hueSlam` | 拍點時色相跳變 |
| `posterCrush` | 拍點時階調被壓成一階一階（位元壓縮） |
| `invertFlash` | 只在強拍時一瞬間變成負片 |
| `scanGlow` | 掃描帶流動，並在拍點發光 |
| `channelRoll` | 強拍時 RGB 互換 |
| `crestGlow` | 湧浪的浪峰緩緩通過而變亮 |

- **無聲時完全不起作用**，會回到 Patch 原本的外觀。
- 目前 Patch 上掛了哪些反應，可以用 CLI 的 `vj-ctl state` 的 `reactions` 確認（[vj-ctl](../../ai/vj-ctl/)）。

`swellDrift` / `setSurge` / `crestGlow` 不是隨拍點，而是由聲音能量產生、像「海浪湧動」般的長週期時鐘驅動。Drop 之後湧浪會延遲到來，Break 之後也會留有餘韻。

## 承襲舊場景外觀的 Generator

以前的 Seedshade 有頻譜長條、示波器之類的固定場景。
現在這些都已移植為 Semantic Synth 的 Generator（全部屬於 Source），列入一般抽種子的候選。

| Generator | 外觀 | 讀取聲音的方式 |
| --- | --- | --- |
| `spectrumBars` | 頻譜長條（附峰值保持） | 頻譜 |
| `spectrumRadial` | 圓形頻譜 | 頻譜 |
| `oscilloscope` | 示波器（波形） | 波形 |
| `lissajousScope` | X-Y 李沙育圖形 | 波形 |
| `beatRings` | 隨拍點擴散的圓環（圓 / 多邊形 / 弧） | 一般的聲音數值 |
| `particleField` | 粒子（上升 / 軌道 / 雨 / 星空） | 一般的聲音數值 |
| `inkMarble` | 墨流大理石紋（舊 Fluid） | 一般的聲音數值 |
| `smokeFog` | 煙霧 | 一般的聲音數值 |
| `auroraCurtain` | 極光 | 一般的聲音數值 |
| `lavaBlobs` | 熔岩燈（舊 Lava） | 一般的聲音數值 |

對於讀取「頻譜」「波形」的 Generator，每個畫格都會送入 128 頻帶的對數頻譜（附平滑與峰值保持）和 256 取樣點的波形。
沒有使用這些的 Patch 則完全不會送，所以不會增加負載。無聲時頻譜為 0，波形則是平的。

:::note
Scene Deck 的縮圖，以及測試 / 預覽用的繪圖，會使用不隨時間變化的固定合成訊號來繪製。
因此頻譜類的 Generator 在縮圖中呈現的形狀，與實際聲音下的樣子不同。
:::

在 CLI 的 `vj:gen` 中，可以用 `スペクトラム`（頻譜）`オシロ`（示波器）`リサージュ`（李沙育）`オーロラ`（極光）`煙`（煙）`パーティクル`（粒子）`リング`（圓環）`マーブル`（大理石紋）等詞呼叫它們（[vj:gen / vj:tweak](../../ai/gen-tweak/)）。

## 圖片（印章）

另有貼入圖片用的 Generator `stamp`。它**不會在種子抽選中被選到**（避免活動 Logo 等自己跑出來又消失）。
要使用圖片時請自行加入。→ [Timeline 面板的 Images](../timeline/#images蓋印圖片)

## 負載與畫質

- 畫布解析度將裝置像素比（DPR）上限限制在 1.5（避免高解析度螢幕造成過載）。
- 系統會監控畫格時間，負載過重時會**分段自動降低內部繪圖解析度**，餘裕恢復後再調回來。目前的倍率顯示在 Timeline 面板的 **State** → `quality`（1.00 為原倍）。
- 即使 WebGL 的 context 遺失也會自動恢復。
- 將背景設為透明時，繪圖結果也會帶著 alpha 輸出（可疊在 OBS 上）。
