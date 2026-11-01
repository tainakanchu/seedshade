---
title: vj:recipe / vj:set（配方與歌單）
description: 把外觀存成「可重新產生的說明書」的配方，以及將多個場景預先安排成 cue、在演出時推進的歌單（set）。
---

## 配方（vj-recipe）

**配方**是把外觀存成「情緒關鍵字 + 種子 + 微調 token」的小型 JSON（`recipes/*.json`）。

```json
{
  "name": "humid-qilou-night",
  "mood": ["台湾", "夜", "湿った", "騎楼"],
  "seed": "humid-qilou-night-v1",
  "tweaks": ["src0:=qilouShutter", "src0.density=28", "mat0:=sodium", "palette.mode=analogous"],
  "notes": "夜市の手前の騎楼。…"
}
```

每次套用時，都會用 `vj-gen`（情緒關鍵字 + 種子）重新產生基底，再由上往下疊上 `tweaks`（[vj-tweak 的 token](../gen-tweak/#變更-token)）。

:::tip[為什麼不直接儲存 Patch]
Patch 的 JSON 裡含有 Generator 的版本，當 Seedshade 更新使 Generator 的版本升級後，舊的 Patch 就無法通過驗證。
配方每次都是用目前的目錄重新產生，所以比較不容易因為更新而壞掉。
:::

### 使用方式

```bash
# 一覽（不進行通訊）
node scripts/vj-recipe.mjs list

# 查看內容（不進行通訊）
node scripts/vj-recipe.mjs show humid-qilou-night

# 確認重新產生的結果（不送出）
node scripts/vj-recipe.mjs apply humid-qilou-night --dry-run

# 送出
node scripts/vj-recipe.mjs apply humid-qilou-night
```

- `apply` 需要連線目的地（`--url` 或 `VJ_URL`）。不過 `--dry-run` 只要有 Generator 目錄的快取（`scripts/.vj-catalog-cache.json`），就能在不進行通訊的情況下運作。
- 也可以像 `pnpm vj:recipe list` 這樣透過 pnpm 呼叫。
- 儲存庫中附有 30 個以上的配方範例。用 `list` 可以看到附有簡短備註的一覽。

### 建立自己的配方

1. 用 `vj-gen --dry-run "<情緒關鍵字>"` 或 `vj-tweak --dry-run …`，找出能得到滿意結果的關鍵字・種子・token。
2. 在 `recipes/<名稱>.json` 寫入 `name` / `mood` / `seed` / `tweaks`（可選填 `notes`）。
3. 用 `vj-recipe show <名稱>` 確認格式，並用 `apply --dry-run` 確認能夠重新產生。

:::note[關於 recipes/setlists]
`recipes/setlists/*.json` 是把多個配方依時間軸排列的「歌單清單（setlist）」**資料**。
目前沒有可以直接執行它的 CLI（下方的 `vj-set` 是不同的格式）。
:::

## 歌單（vj-set）

**歌單（set）**是把演出要用的多個場景整理在一起的東西。`vj-set` 會把歌單中所有場景以 **cue（手動觸發的 external 事件）**的形式預先放進 Timeline，演出中只要一個指令就能推進到下一個場景。
這是一個「不預先決定時機，把時機留給演出現場的雙手」的工具。

### 歌單檔案

```json
{
  "name": "taiwan-night",
  "scenes": [
    { "cue": "s1", "patch": "scenes/s1.json", "label": "湿気", "transition": "slow" },
    { "cue": "s2", "patch": "scenes/s2.json", "label": "騎楼", "transition": "slow" }
  ]
}
```

- `cue` 與 `patch` 為必填，`label` 與 `transition`（`default` / `slow` / `cut`，預設 `default`）可以省略。
- `patch` 是指向 Patch JSON 檔案的路徑，以歌單檔案為基準的相對路徑。
- `cue` 在歌單中不可重複。

場景的 Patch 可以用配方產生，例如：

```bash
node scripts/vj-recipe.mjs apply humid-qilou-night --dry-run > sets/scenes/s1.json
```

### 使用方式

```bash
# 驗證所有場景後，預先放進 Timeline
node scripts/vj-set.mjs load sets/taiwan-night.json

# 前進到下一個場景（觸發尚未觸發的 cue 中最前面的一個）
node scripts/vj-set.mjs next

# 顯示目前的場景與下一個場景，以及剩餘數量
node scripts/vj-set.mjs status
```

- `load` 之後，第 1 個場景會立刻套用，第 2 個以後則等待 `next`。
- 所有場景的 Patch 在送出前都會在本機驗證。只要有一個失敗，就什麼都不會送出。
- 即使重新執行 `load`，已經在 Timeline 上的 cue 也不會重送而是直接略過（即使內容有改變也不會被替換）。想替換時，請先用 `vj-ctl event remove <id>` 刪除。
- 已經沒有下一個場景時執行 `next` 也不會出錯（`next: null`）。
- 連線目的地與 `vj-ctl` 相同，什麼都不加就是本機中繼。要送到線上版的 room 時，請加上 `--url wss://seedshade.tainakanchu.com/room/<id>`（不會讀取 `VJ_URL`）。
