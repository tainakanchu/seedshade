---
title: vj:recipe / vj:set（レシピとセット）
description: 見た目を「作り直せる指示書」として保存するレシピと、複数シーンを cue として仕込んで本番で進めるセット。
---

## レシピ（vj-recipe）

**レシピ** は、見た目を「ムード語 + シード + 手直しのトークン」として保存した小さな JSON です（`recipes/*.json`）。

```json
{
  "name": "humid-qilou-night",
  "mood": ["台湾", "夜", "湿った", "騎楼"],
  "seed": "humid-qilou-night-v1",
  "tweaks": ["src0:=qilouShutter", "src0.density=28", "mat0:=sodium", "palette.mode=analogous"],
  "notes": "夜市の手前の騎楼。…"
}
```

適用するたびに `vj-gen`（ムード語 + シード）で土台を作り直し、`tweaks`（[vj-tweak のトークン](../gen-tweak/#変更トークン)）を上から重ねます。

:::tip[Patch をそのまま保存しない理由]
Patch の JSON には Generator のバージョンが入っていて、Seedshade のアップデートで Generator のバージョンが上がると、古い Patch は検証を通らなくなります。
レシピは毎回今のカタログで作り直すので、アップデートで壊れにくくなっています。
:::

### 使い方

```bash
# 一覧（通信なし）
node scripts/vj-recipe.mjs list

# 中身を見る（通信なし）
node scripts/vj-recipe.mjs show humid-qilou-night

# 作り直した結果を確認する（送らない）
node scripts/vj-recipe.mjs apply humid-qilou-night --dry-run

# 送る
node scripts/vj-recipe.mjs apply humid-qilou-night
```

- `apply` は接続先が必要です（`--url` か `VJ_URL`）。ただし `--dry-run` は、Generator カタログのキャッシュ（`scripts/.vj-catalog-cache.json`）があれば通信なしで動きます。
- `pnpm vj:recipe list` のように pnpm 経由でも呼べます。
- リポジトリには 30 本以上のレシピ例が入っています。`list` で一言メモ付きの一覧が見られます。

### 自分のレシピを作る

1. `vj-gen --dry-run "<ムード語>"` や `vj-tweak --dry-run …` で、気に入った結果が出る語・シード・トークンを探します。
2. `recipes/<名前>.json` に `name` / `mood` / `seed` / `tweaks`（任意で `notes`）を書きます。
3. `vj-recipe show <名前>` で形式を確認し、`apply --dry-run` で作り直せることを確かめます。

:::note[recipes/setlists について]
`recipes/setlists/*.json` は、複数のレシピを時間軸に並べた「セットリスト」の **データ** です。
今のところ、これを直接実行する CLI はありません（下の `vj-set` は別の形式です）。
:::

## セット（vj-set）

**セット** は、本番で使う複数のシーンをまとめたものです。`vj-set` は、セットの全シーンを Timeline に **cue（手動発火の external イベント）** として仕込み、本番中はコマンド 1 つで次のシーンへ進めます。
「タイミングは事前に決めず、本番の手に残す」ための道具です。

### セットのファイル

```json
{
  "name": "taiwan-night",
  "scenes": [
    { "cue": "s1", "patch": "scenes/s1.json", "label": "湿気", "transition": "slow" },
    { "cue": "s2", "patch": "scenes/s2.json", "label": "騎楼", "transition": "slow" }
  ]
}
```

- `cue` と `patch` は必須、`label` と `transition`（`default` / `slow` / `cut`、既定 `default`）は省略できます。
- `patch` は Patch の JSON ファイルへのパスで、セットのファイルからの相対パスです。
- `cue` はセットの中で重複できません。

シーンの Patch は、たとえばレシピから作れます。

```bash
node scripts/vj-recipe.mjs apply humid-qilou-night --dry-run > sets/scenes/s1.json
```

### 使い方

```bash
# 全シーンを検証してから Timeline に仕込む
node scripts/vj-set.mjs load sets/taiwan-night.json

# 次のシーンへ（まだ発火していない cue のうち、いちばん手前のものを発火）
node scripts/vj-set.mjs next

# 今のシーンと次のシーン、残り本数を表示
node scripts/vj-set.mjs status
```

- `load` すると、1 つ目のシーンはすぐに適用され、2 つ目以降は `next` を待ちます。
- 全シーンの Patch は、送る前にローカルで検証されます。1 つでも落ちれば何も送りません。
- `load` をやり直しても、すでに Timeline にある cue は送り直さずにスキップします（中身が変わっていても入れ替わりません）。差し替えたいときは、先に `vj-ctl event remove <id>` で消してください。
- もう次のシーンが無いときに `next` しても、エラーにはなりません（`next: null`）。
- 接続先は `vj-ctl` と同じで、何も付けなければローカル中継です。ホスト版の room に送るときは `--url wss://seedshade.tainakanchu.com/room/<id>` を付けてください（`VJ_URL` は読みません）。
