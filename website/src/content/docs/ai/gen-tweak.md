---
title: vj:gen / vj:tweak（生成と手直し）
description: ムード語から Patch を生成する vj-gen と、今の Patch の一部だけを書き換える vj-tweak。
---

狙った雰囲気の絵を出したいときは、**まず `vj-gen` でムード語から生成し、外れた部分だけ `vj-tweak` で直す** のが速い流れです。
どちらも接続先の指定が必須です（`--url` か環境変数 `VJ_URL`。[しくみと接続](../overview/#接続先の指定)）。
以下の例では `VJ_URL` を設定済みとして `--url` を省いています。

## vj-gen：ムード語から生成する

```bash
# 生成してそのまま送る（シードは語から自動で決まる）
node scripts/vj-gen.mjs "雲 静寂 青"

# 検証だけして中身を表示する（送らない）
node scripts/vj-gen.mjs --dry-run "雲 静寂 青"

# 候補を 3 つ並べて比較する（送らない）
node scripts/vj-gen.mjs --count 3 "攻めた 派手"

# シードを固定して同じ結果を再現する
node scripts/vj-gen.mjs --seed take2 "夜 青"

# 今の Patch を土台に、ムードに合わない Generator だけ入れ替える（配色・構図はそのまま）
node scripts/vj-gen.mjs --base --dry-run "夜 青"
```

| オプション | 内容 |
| --- | --- |
| `--dry-run` | 検証を通った Patch を表示するだけで送らない |
| `--count <n>` | 独立した候補を n 個、配列で出す（**送らない**） |
| `--seed <s>` | シードを上書き（省略時は語から決まる） |
| `--base` | 今の Patch を土台に、タグが合わない Generator だけ入れ替える |
| `--refresh-catalog` | Generator カタログのキャッシュを取り直す |

### ムード語

ムード語は `scripts/vj-vocab.json` の語彙（76 語）から引きます。日本語・英語・ローマ字が混ざっていてもかまいません。
語ごとに Generator のタグ（`affect` / `motion` / `material` / `environment` / `culturalTexture`）への重み付けがあり、選ばれやすい Generator が変わります。
**シードは「重み付けされた候補のどれが当たるか」だけを決めます**。同じ語 + 同じシードなら、必ず同じ Patch になります。

収録語の例: `雲` `静寂` `幾何学` `抽象` `明るい` `暗い` `青` `赤` `湿った` `懐かしい` `台湾` `夜` `攻めた` `派手` `チル` `夜市` `騎楼` `蛍光灯` `CRT` `MiniDV` `台風` `ハウス` `アンビエント` `ドラムンベース` など。
旧シーン由来の Generator は `スペクトラム` `オシロ` `リサージュ` `オーロラ` `煙` `パーティクル` `リング` `マーブル` で呼べます。

語彙は素の JSON なので、足りない語は近い既存語のエントリをまねて追記できます。

## vj-tweak：今の Patch の一部だけ書き換える

今出ている Patch を取得し、変更点をトークンで指定して送ります。

```bash
# パラメータを 1 つ変える
node scripts/vj-tweak.mjs mod0.curve=1.65

# Generator を追加して、そのパラメータも決める（id を省略すると自動で付く）
node scripts/vj-tweak.mjs --dry-run +humidityLens:fld0 fld0.amount=0.22

# Generator を差し替える（パラメータはその Generator の既定値になる）
node scripts/vj-tweak.mjs src0:=qilouShutter src0.density=28

# 配色と構図を変える
node scripts/vj-tweak.mjs palette.mode=analogous palette.hueOffset=32 composition.speed=0.18
```

### 変更トークン

| トークン | 内容 | 例 |
| --- | --- | --- |
| `-<opId>` | Generator を削除 | `-fld0` |
| `+<generatorId>[:<opId>]` | Generator を追加 | `+humidityLens:fld0` |
| `<opId>:=<generatorId>` | Generator を差し替え（パラメータは初期化） | `mat0:=sodium` |
| `<opId>.<paramId>=<value>` | パラメータを変更 | `mod0.curve=1.65` |
| `palette.<key>=<value>` | 配色（`mode` / `hueOffset` / `saturation` / `lightness`） | `palette.mode=triadic` |
| `composition.<key>=<value>` | 構図（`symmetry` / `scale` / `speed`） | `composition.speed=0.5` |
| `qualityTier=<value>` | 品質（`low` / `medium` / `high`） | `qualityTier=high` |

`opId`（`src0`、`fld0`、`mod0`、`mat0` など）と、Generator ごとのパラメータ名は、`vj-ctl state` / `vj-ctl catalog` や Timeline パネルの Patch 欄で確認できます。
ここに挙げた例はリポジトリのレシピ `recipes/humid-qilou-night.json` から取ったものです。

### `--reroll`：形はそのまま、細部だけ引き直す

メイン窓の 🧬（`D`）と同じことを CLI から行います。Generator の構成は固定したまま、パラメータ・結線・配色・構図を新しいシードで引き直します。

```bash
# 全部引き直す（シードはランダム。使ったシードは出力の先頭行に出る）
node scripts/vj-tweak.mjs --dry-run --reroll

# 配色とパラメータだけ引き直す
node scripts/vj-tweak.mjs --dry-run --reroll=params,palette

# シードを固定して再現する
node scripts/vj-tweak.mjs --reroll --reroll-seed take2

# 引き直してから、さらにトークンで手直しする（トークンが優先）
node scripts/vj-tweak.mjs --reroll palette.mode=analogous
```

`--reroll=` に指定できるのは `params` / `routes` / `palette` / `composition` です。初回は内部の準備で数秒かかります。

## 送る前の注意

- `vj-gen` / `vj-tweak` は送る前にローカルで検証しますが、これは検証ルールの **複製** で、描画負荷（budget）のチェックを含みません。ローカル検証を通っても、メイン窓で負荷超過として却下されることがあります。
  確実に通したいときは、`--dry-run` の出力をファイルに保存して `pnpm vj:validate` にかけてください（[vj:preview / vj:validate](../../dev/preview-validate/)）。
- Generator カタログは `scripts/.vj-catalog-cache.json` にキャッシュされます。Seedshade を更新したあとに「存在しない Generator」などのエラーが出たら `--refresh-catalog` を付けてください。
