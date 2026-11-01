---
title: vj:gen / vj:tweak（生成與微調）
description: 從情緒關鍵字生成 Patch 的 vj-gen，以及只改寫目前 Patch 一部分的 vj-tweak。
---

想做出特定氛圍的畫面時，**先用 `vj-gen` 從情緒關鍵字生成，再只用 `vj-tweak` 修正不滿意的部分**是比較快的流程。
兩者都必須指定連線目的地（`--url` 或環境變數 `VJ_URL`。[原理與連線](../overview/#指定連線目的地)）。
以下範例假設已設定 `VJ_URL`，因此省略了 `--url`。

## vj-gen：從情緒關鍵字生成

```bash
# 生成後直接送出（種子由關鍵字自動決定）
node scripts/vj-gen.mjs "雲 静寂 青"

# 只驗證並顯示內容（不送出）
node scripts/vj-gen.mjs --dry-run "雲 静寂 青"

# 並排 3 個候選來比較（不送出）
node scripts/vj-gen.mjs --count 3 "攻めた 派手"

# 固定種子以重現相同結果
node scripts/vj-gen.mjs --seed take2 "夜 青"

# 以目前的 Patch 為基礎，只替換不符合情緒的 Generator（配色、構圖維持不變）
node scripts/vj-gen.mjs --base --dry-run "夜 青"
```

| 選項 | 說明 |
| --- | --- |
| `--dry-run` | 只顯示通過驗證的 Patch，不送出 |
| `--count <n>` | 以陣列輸出 n 個獨立的候選（**不送出**） |
| `--seed <s>` | 覆寫種子（省略時由關鍵字決定） |
| `--base` | 以目前的 Patch 為基礎，只替換標籤不符的 Generator |
| `--refresh-catalog` | 重新取得 Generator 目錄的快取 |

### 情緒關鍵字

情緒關鍵字取自 `scripts/vj-vocab.json` 的詞彙表（76 個詞）。日文、英文、羅馬拼音混用也沒問題。
每個詞都對 Generator 的標籤（`affect` / `motion` / `material` / `environment` / `culturalTexture`）設有權重，會改變容易被選到的 Generator。
**種子只決定「在加權後的候選中抽到哪一個」**。相同的關鍵字 + 相同的種子，一定會得到相同的 Patch。

收錄詞彙的範例：`雲` `静寂` `幾何学` `抽象` `明るい` `暗い` `青` `赤` `湿った` `懐かしい` `台湾` `夜` `攻めた` `派手` `チル` `夜市` `騎楼` `蛍光灯` `CRT` `MiniDV` `台風` `ハウス` `アンビエント` `ドラムンベース` 等。
源自舊場景的 Generator 可用 `スペクトラム` `オシロ` `リサージュ` `オーロラ` `煙` `パーティクル` `リング` `マーブル` 呼叫。

詞彙表是單純的 JSON，缺少的詞可以參考相近的既有項目自行追加。

## vj-tweak：只改寫目前 Patch 的一部分

取得目前顯示的 Patch，用 token 指定變更處後送出。

```bash
# 改一個參數
node scripts/vj-tweak.mjs mod0.curve=1.65

# 新增 Generator 並設定其參數（省略 id 會自動指派）
node scripts/vj-tweak.mjs --dry-run +humidityLens:fld0 fld0.amount=0.22

# 替換 Generator（參數會變成該 Generator 的預設值）
node scripts/vj-tweak.mjs src0:=qilouShutter src0.density=28

# 改變配色與構圖
node scripts/vj-tweak.mjs palette.mode=analogous palette.hueOffset=32 composition.speed=0.18
```

### 變更 token

| token | 說明 | 範例 |
| --- | --- | --- |
| `-<opId>` | 刪除 Generator | `-fld0` |
| `+<generatorId>[:<opId>]` | 新增 Generator | `+humidityLens:fld0` |
| `<opId>:=<generatorId>` | 替換 Generator（參數會被初始化） | `mat0:=sodium` |
| `<opId>.<paramId>=<value>` | 變更參數 | `mod0.curve=1.65` |
| `palette.<key>=<value>` | 配色（`mode` / `hueOffset` / `saturation` / `lightness`） | `palette.mode=triadic` |
| `composition.<key>=<value>` | 構圖（`symmetry` / `scale` / `speed`） | `composition.speed=0.5` |
| `qualityTier=<value>` | 畫質（`low` / `medium` / `high`） | `qualityTier=high` |

`opId`（`src0`、`fld0`、`mod0`、`mat0` 等）以及各 Generator 的參數名稱，可以用 `vj-ctl state` / `vj-ctl catalog` 或 Timeline 面板的 Patch 欄確認。
這裡列出的範例取自儲存庫的配方 `recipes/humid-qilou-night.json`。

### `--reroll`：形狀不變，只重抽細節

從 CLI 執行與主視窗 🧬（`D`）相同的事。固定 Generator 的組成，用新的種子重抽參數、連結、配色與構圖。

```bash
# 全部重抽（種子隨機。使用的種子會顯示在輸出的第一行）
node scripts/vj-tweak.mjs --dry-run --reroll

# 只重抽配色與參數
node scripts/vj-tweak.mjs --dry-run --reroll=params,palette

# 固定種子以重現
node scripts/vj-tweak.mjs --reroll --reroll-seed take2

# 重抽之後，再用 token 進一步微調（token 優先）
node scripts/vj-tweak.mjs --reroll palette.mode=analogous
```

`--reroll=` 可指定的有 `params` / `routes` / `palette` / `composition`。第一次因為內部準備需要花數秒。

## 送出前的注意事項

- `vj-gen` / `vj-tweak` 在送出前會於本機驗證，但這只是驗證規則的**複本**，不包含繪圖負載（budget）的檢查。即使通過本機驗證，也可能在主視窗因負載超標而被駁回。
  想確實通過的話，請將 `--dry-run` 的輸出存成檔案，再用 `pnpm vj:validate` 驗證（[vj:preview / vj:validate](../../dev/preview-validate/)）。
- Generator 目錄會快取在 `scripts/.vj-catalog-cache.json`。更新 Seedshade 後若出現「不存在的 Generator」之類的錯誤，請加上 `--refresh-catalog`。
