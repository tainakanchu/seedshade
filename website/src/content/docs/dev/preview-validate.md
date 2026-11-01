---
title: vj:preview / vj:validate
description: Patch をローカルの GPU で PNG に描く vj:preview と、本物の検証ルールでローカル検証する vj:validate。
---

どちらもアプリや中継には接続せず、リポジトリの中だけで動く CLI です。

## vj:preview：Patch を PNG に描く

Patch の見た目を、GLSL を読んで推測する代わりに、実際にローカルの GPU（ヘッドレス Chromium）で描いて PNG にします。

```bash
# 全 Generator を 1 枚に並べたコンタクトシート（いちばん使う）
pnpm vj:preview --contact-sheet artifacts/contact-sheet.png

# シードから作った Patch を、複数の時刻で並べる（0 / 1.7 / 4.3 / 9.1 秒）
pnpm vj:preview --seed take-1 artifacts/seed.png

# 手書き / 生成した Patch の JSON
pnpm vj:preview path/to/patch.json artifacts/patch.png

# 1 つのパラメータを最小〜最大で横に並べる（<generatorId>.<paramId>）
pnpm vj:preview --sweep gamma.curve artifacts/sweep.png
```

| オプション | 内容 |
| --- | --- |
| `--size <n>` | 1 枚の大きさ（px。既定 256、`--sweep` は 128） |
| `--steps <n>` | `--sweep` の段数（既定 8） |
| `--cols <n>` | コンタクトシートの列数（既定 11） |
| `--cell-size <n>` | コンタクトシートの 1 マスの大きさ（既定 112） |

- ヘッドレス Chromium が必要です。`nix develop` の中で実行すると `CHROMIUM_BIN` が設定されます（`nix develop -c pnpm vj:preview …`）。
- Source 以外の Generator を単独で描くときは、基準の Source `grid` の上に重ねて描きます。パラメータはカタログの既定値です。
- Patch を組む前に、まずコンタクトシートで Generator の実際の見た目を確認するのがおすすめです。

## vj:validate：送る前に検証する

Patch の JSON を、メイン窓が受け取るときと **同じ検証** にかけます（形式の検証 → 内容の検証 → 描画負荷の見積もり）。
検証ルールを複製せず、`src/synth/` の TypeScript をそのまま実行するので、ずれが起きません。

```bash
pnpm vj:validate patch.json             # 1 ファイル
pnpm vj:validate dir/*.json             # 複数ファイル
pnpm vj:validate --stdin < patch.json   # 標準入力から 1 つ
pnpm vj:validate --quality low patch.json  # より厳しい品質ティアで負荷を判定してみる
```

`vj-gen` / `vj-tweak` のローカル検証は複製で、描画負荷のチェックを含みません。それらの `--dry-run` の結果や手書きの Patch を送る前、特に `vj-ctl event add --patch` で予約する前には、`vj:validate` を通してください。

## Patch の主な制約

検証で落ちやすいポイントです。

- Generator の個数: Source 1〜2、Field 0〜2、Modifier 1〜3、Material ちょうど 1。
- 並び順は Source → Field → Modifier → Material。
- 各 Generator の `generatorVersion` が、今のカタログのバージョンと一致していること（古い Patch はアップデートで落ちることがあります。保存するなら [レシピ](../../ai/recipe-set/) が安全です）。
- 結線（route）の音の入力（`source`）に使えるのは `audio:bass` `audio:mid` `audio:treble` `audio:level` `audio:beat` `audio:beatIntensity` `audio:gridPulse` `audio:barPulse` `audio:barPhase` `audio:beatPhase` と、`swell:wave` `swell:group` `swell:set` `swell:surge`。
- 品質ティア（`qualityTier`: `low` / `medium` / `high`）ごとの描画負荷の上限に収まること。

詳しいルールは `src/synth/validate.ts` と、AI 向けの `.claude/skills/vj-director/SKILL.md` にまとまっています。
