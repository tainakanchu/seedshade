---
title: Claude Code（vj-director）
description: 用儲存庫附帶的 vj-director 技能，讓 Claude Code 幫你操控畫面。
---

儲存庫中附有 [Claude Code](https://claude.com/claude-code) 用的技能 **vj-director**（`.claude/skills/vj-director/SKILL.md`）。
在儲存庫的目錄中啟動 Claude Code，像「把畫面弄得更潮濕一點」「8 小節後切換」這樣拜託它，Claude Code 就會讀取這個技能，並使用前面介紹過的 CLI 來操控畫面。

## 準備

Claude Code 無法開啟瀏覽器，所以**開啟主視窗是人類的工作**。

### 使用本機版時

1. 在儲存庫執行 `pnpm dev`。
2. 請 Claude Code 或自己啟動 `pnpm bridge`（讓它持續運行）。
3. 在瀏覽器開啟 `https://localhost:5173/?bridge=1`。
4. Claude Code 會用 `node scripts/vj-ctl.mjs state` 確認連線是否暢通。

### 使用線上版時

1. 請 Claude Code「建立 room」（會執行 `vj-ctl room --host seedshade.tainakanchu.com`）。
2. 用輸出用的瀏覽器開啟回傳的 `pageUrl`（`https://seedshade.tainakanchu.com/?room=<id>`）。
3. 之後 Claude Code 會在所有指令加上 `--url wss://seedshade.tainakanchu.com/room/<id>` 來操作。

詳情請參閱[遠端操作與多螢幕](../../live/remote/)。

## 拜託的方式範例

| 拜託的方式 | Claude Code 做的事（技能的方針） |
| --- | --- |
| 「弄成〜的感覺」「總之換一下」 | 用 `vj-gen` 從情緒關鍵字生成。不滿意的話用 `--count` 比較，或用 `vj-tweak` 修正 |
| 「構成不變，只換氣氛」 | `vj-tweak --reroll`（維持構成與拍點的反應） |
| 「馬上換」 | `vj-ctl seed`（完全隨機）或 `vj-ctl patch`（目標明確時） |
| 「副歌的時候」「大概一分鐘後」 | 用 `vj-ctl event add --in` / `--bar` 預約 |
| 「先把歌單排好，演出時由我自己決定時機推進」 | 用 `vj-set load` 預先安排成 cue，演出時用 `vj-set next` |
| 「把現在的存起來」「剛才那段流程再來一次」 | `record start` → `record stop > file.json` → `load file.json` |
| 「暫時不要動它」 | `vj-ctl lock <秒>` |

技能的方針是「**時機不事先確定**」。邊對話邊組出一個很長的歌單時，早早排好的 `--in` 預約可能不知不覺就過期，在意料之外的時機觸發，所以不確定時請使用手動觸發的 `--cue` / `vj-set`。

此外，技能也被指示：在送出手動組成的 Patch 或 `--dry-run` 的結果之前，要先通過 `vj-validate`；在組 Patch 之前，要用 `vj-preview --contact-sheet` 確認 Generator 實際的外觀。

## 告訴它你的喜好

技能的末尾有一節「使用者的美學傾向」，Claude Code 會參考它來決定畫面的方向與節奏感（例如「變化以秒為單位慢慢進行」「猶豫時用 `--transition slow`」等）。
想配合自己的喜好時，請改寫這一節。
