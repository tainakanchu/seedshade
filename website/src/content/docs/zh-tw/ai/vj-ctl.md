---
title: vj-ctl（基本操作）
description: 一次送一個指令的基本 CLI。取得狀態、套用種子 / Patch、預約 Timeline、鎖定、錄製。
---

`vj-ctl` 是一個 CLI，會對主視窗送出一個指令並顯示結果。
以下範例都是以送到本機中繼（`pnpm bridge`）的形式撰寫。若要送到線上版的 room，請在所有指令加上 `--url wss://seedshade.tainakanchu.com/room/<id>`（[原理與連線](../overview/)）。

## 指令一覽

| 指令 | 功能 |
| --- | --- |
| `state` | 顯示目前的狀態（Patch、Timeline、場景時鐘 `nowSec`、小節 `barCount`、`tempoLocked`、已掛上的反應 `reactions` 等） |
| `catalog` | 顯示 Generator 一覽（id・類別・標籤・參數・成本） |
| `seed <seed>` | **立刻**過渡到該種子的外觀 |
| `patch <file.json>` | **立刻**套用 Patch 的 JSON（驗證失敗會回傳 issues） |
| `image <file> [--name <n>]` | 登錄圖片（png / jpg / webp / gif / svg / avif，最大 5MB）。把回傳的 `hash` 放進 Patch 的 `images` 使用 |
| `event add …` | 在 Timeline 預約事件（見下方） |
| `event remove <id>` | 取消預約 |
| `lock <sec>` | 從現在起 N 秒內鎖定 Timeline（相對指定） |
| `fire <externalId>` | 手動觸發 external 事件 |
| `record start` | 開始記錄演出 |
| `record stop` | 停止記錄，並把記錄的 JSON 輸出到 stdout（用 `> recording.json` 儲存） |
| `load <recording.json>` | 載入記錄並還原 Timeline |
| `room` | 建立新的 room id 與 URL（不進行通訊）。請加上 `--host seedshade.tainakanchu.com` |

通用選項：`--port <n>`（本機中繼的連接埠，預設 7877）、`--url <ws(s)://…>`（不能與 `--port` 同時使用）、`--help`。

## 常用範例

```bash
# 查看目前的狀態
node scripts/vj-ctl.mjs state

# 立刻換成別的種子（種子的字串沒有特別意義）
node scripts/vj-ctl.mjs seed "take-1"

# 立刻套用準備好的 Patch
node scripts/vj-ctl.mjs patch ./patch.json

# 30 秒後慢慢切換成別的種子
node scripts/vj-ctl.mjs event add --in 30 --seed take-2 --transition slow

# 8 小節後替換 Patch（只有節拍已鎖定時才會觸發）
node scripts/vj-ctl.mjs event add --bar 8 --patch ./next.json --label "chorus"

# 讓它以「drop」待命，時機由手動決定
node scripts/vj-ctl.mjs event add --cue drop --patch ./drop.json --label "drop"
node scripts/vj-ctl.mjs fire drop

# 從現在起鎖定 60 秒
node scripts/vj-ctl.mjs lock 60

# 記錄演出並儲存，之後再載入
node scripts/vj-ctl.mjs record start
node scripts/vj-ctl.mjs record stop > recording.json
node scripts/vj-ctl.mjs load recording.json
```

## event add 的選項

| 選項 | 說明 |
| --- | --- |
| `--in <sec>` | 從現在起 N 秒後 |
| `--bar <n>` | 從現在起 N 小節後。節拍未鎖定（`state` 的 `tempoLocked` 為 `false`）時不會觸發，這時請改用 `--in` |
| `--cue <id>` | external 事件。在 `fire <id>` 之前不會觸發 |
| `--seed <s>` / `--patch <file>` / `--label <s>` | 要切換成什麼。至少需要其中一個 |
| `--transition default\|slow\|cut` | 過渡的速度（預設 `default`。`slow` 為 2 倍時間，`cut` 約 0.12 秒） |

- 如果同時加上多個基準，優先順序為 `--bar` → `--in` → `--cue`。
- `--in` / `--bar` / `lock` 全部都是**從現在起的相對指定**。CLI 會先讀取 `state` 換算成絕對值後再送出。
- 新增的事件 id 會包含在輸出中。要取消時用 `event remove <id>`。

:::caution[`--patch` 在預約時不會被驗證]
`patch <file>` 會在主視窗進行驗證，但用 `event add --patch` 預約的 Patch 會**不經驗證直接**放進 Timeline，並在觸發時原樣套用。
預約之前，請先用 `pnpm vj:validate <file>` 驗證（[vj:preview / vj:validate](../../dev/preview-validate/)）。
:::

## 值得先知道的事

- `seed` 不經過 Timeline，會立刻切換。主視窗面板 **Look** 顯示的種子不會改變，也不會被儲存。重新載入頁面後，會回到面板 Look 之種子的外觀。
- `lock` 阻止的是鎖定期間內觸發之事件的編輯、刪除，以及從 Scene Deck 的一鍵切換。`seed` / `patch` / `event add` 和主視窗的按鍵操作不會被阻止。
- 單次執行整體的逾時是 20 秒，等待主視窗回應的逾時是 15 秒。
