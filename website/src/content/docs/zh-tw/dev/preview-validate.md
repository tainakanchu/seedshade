---
title: vj:preview / vj:validate
description: 用本機 GPU 把 Patch 繪製成 PNG 的 vj:preview，以及用真正的驗證規則在本機驗證的 vj:validate。
---

兩者都是不連接應用程式或中繼，只在儲存庫內運作的 CLI。

## vj:preview：把 Patch 繪製成 PNG

與其讀 GLSL 來推測 Patch 的外觀，這個工具會實際用本機的 GPU（無頭 Chromium）繪製成 PNG。

```bash
# 把所有 Generator 排在一張圖上的 contact sheet（最常用）
pnpm vj:preview --contact-sheet artifacts/contact-sheet.png

# 把由種子產生的 Patch，以多個時刻並排（0 / 1.7 / 4.3 / 9.1 秒）
pnpm vj:preview --seed take-1 artifacts/seed.png

# 手寫 / 生成的 Patch JSON
pnpm vj:preview path/to/patch.json artifacts/patch.png

# 把一個參數從最小到最大橫向並排（<generatorId>.<paramId>）
pnpm vj:preview --sweep gamma.curve artifacts/sweep.png
```

| 選項 | 說明 |
| --- | --- |
| `--size <n>` | 單張的大小（px。預設 256，`--sweep` 為 128） |
| `--steps <n>` | `--sweep` 的階數（預設 8） |
| `--cols <n>` | contact sheet 的欄數（預設 11） |
| `--cell-size <n>` | contact sheet 每一格的大小（預設 112） |

- 需要無頭 Chromium。在 `nix develop` 中執行會設定 `CHROMIUM_BIN`（`nix develop -c pnpm vj:preview …`）。
- 單獨繪製 Source 以外的 Generator 時，會疊在基準的 Source `grid` 上繪製。參數使用目錄中的預設值。
- 建議在組 Patch 之前，先用 contact sheet 確認 Generator 實際的外觀。

## vj:validate：送出前先驗證

把 Patch 的 JSON 交給與主視窗接收時**相同的驗證**（格式驗證 → 內容驗證 → 繪圖負載估算）。
它不是複製驗證規則，而是直接執行 `src/synth/` 的 TypeScript，所以不會產生落差。

```bash
pnpm vj:validate patch.json             # 1 個檔案
pnpm vj:validate dir/*.json             # 多個檔案
pnpm vj:validate --stdin < patch.json   # 從標準輸入讀取 1 個
pnpm vj:validate --quality low patch.json  # 用更嚴格的畫質等級來判定負載
```

`vj-gen` / `vj-tweak` 的本機驗證是複本，不包含繪圖負載的檢查。在送出它們的 `--dry-run` 結果或手寫的 Patch 之前，尤其是用 `vj-ctl event add --patch` 預約之前，請先通過 `vj:validate`。

## Patch 的主要限制

這些是容易驗證失敗的地方。

- Generator 的數量：Source 1～2、Field 0～2、Modifier 1～3、Material 剛好 1。
- 排列順序為 Source → Field → Modifier → Material。
- 各 Generator 的 `generatorVersion` 必須與目前目錄的版本一致（舊的 Patch 可能因更新而驗證失敗。若要儲存，用[配方](../../ai/recipe-set/)比較安全）。
- 連結（route）中，可用作聲音輸入（`source`）的有 `audio:bass` `audio:mid` `audio:treble` `audio:level` `audio:beat` `audio:beatIntensity` `audio:gridPulse` `audio:barPulse` `audio:barPhase` `audio:beatPhase`，以及 `swell:wave` `swell:group` `swell:set` `swell:surge`。
- 必須落在各畫質等級（`qualityTier`：`low` / `medium` / `high`）的繪圖負載上限內。

詳細的規則整理在 `src/synth/validate.ts` 以及給 AI 用的 `.claude/skills/vj-director/SKILL.md` 中。
