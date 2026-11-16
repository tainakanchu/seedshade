---
title: 文字ノード（type / typeMask / typeWarp）
description: 文字を映像の上に重ねるのではなく、Semantic Synth のノードとして入れる。太さ・縁取り・ぼかしを動かし、音で変調できる。
---

文字を「上に重ねる」のではなく、Semantic Synth の **ノードとしてパイプラインに入れる** 機能です。
入力した文字は符号付き距離場（SDF）のテクスチャになるので、太さ・縁取り・ぼかしをパラメータで動かせ、[オーディオ変調](../semantic-synth/#音が映像を動かすしくみ)の対象にもなります。

- 文字を変えても **シェーダの再コンパイルは起きません**。その場で切り替わります（Patch の構成は変わらないため）。
- シードのガチャでは出てきません。**手動で追加したときだけ** 入ります。
- 文字は Patch の `texts` に、中身ごと保存されます（キーは `<opId>.<slot>`、値は `{text, font, weight}`。text は 200 字まで、font は CSS の font-family、weight は 100〜900）。
- 文字が未割り当てのとき、`type` は何も描かず、`typeMask` は効果なし、`typeWarp` は変位 0 になります。

## ノード 3 種

どれも `scale` / `softness` / `weight` / `fit` を共通で持ちます（ノードによっては一部のみ）。

### type（Source）

文字そのものが密度（絵）になります。

| パラメータ | 範囲 / 値 | 既定 | 内容 |
| --- | --- | --- | --- |
| `fit` | `contain` / `cover` / `tile` | `contain` | 文字の収め方（音による変調はできません） |
| `scale` | 0.2〜4 | 0.9 | 大きさ |
| `weight` | -1〜1 | 0 | 正で太く、負で細く |
| `softness` | 0〜1 | 0.05 | 輪郭のぼかし |
| `outline` | 0〜1 | 0 | 0 で塗りつぶし、0 より大きいと縁取り（値が線の太さ） |
| `stagger` | 0〜1 | 0 | 文字ごとに位相をずらした上下の揺れと太さの脈動。キックで強まります |
| `invert` | オン / オフ | オフ | 文字の内外を反転 |

### typeMask（Modifier）

ほかの模様を、文字の形で加工します。

| パラメータ | 範囲 / 値 | 既定 | 内容 |
| --- | --- | --- | --- |
| `mode` | `knockout` / `keep` / `xor` | `knockout` | `knockout` は文字の部分を抜く、`keep` は文字の部分だけ残す、`xor` は反転 |
| `amount` | 0〜1 | 1 | 効きの強さ |
| `weight` / `softness` / `fit` / `scale` | 同上 | — | `type` と同じ |

### typeWarp（Field）

文字そのものは描かず、**文字の輪郭に沿って座標を歪めます**。

| パラメータ | 範囲 / 値 | 既定 | 内容 |
| --- | --- | --- | --- |
| `amount` | 0〜1 | 0.3 | 歪みの強さ |
| `radius` | 0.05〜1 | 0.5 | 輪郭からの減衰幅 |
| `mode` | `push` / `pull` / `swirl` | `push` | 押し出す / 引き込む / 渦を巻く |
| `fit` / `scale` | 同上 | — | `tile` は `contain` の大きさで敷き詰めます |

## 使い方（Texts セクション）

Timeline パネルの **Texts** セクション（Images の下）で操作します。

1. **`+ type`** / **`+ mask`** / **`+ warp`** のどれかを押すと、そのノードが Patch に入り、スロットに `SEEDSHADE` が入ります。同じカテゴリが上限に達していれば、最後のものが置き換わります。
2. スロットごとに、テキストエリア・font-family 欄・weight 欄（100 刻み）・clear ボタンが出ます。
3. テキストは **Enter で確定** します（Shift+Enter で改行、IME 変換中の Enter は無視）。フォーカスを外したとき、入力が 450ms 止まったときにも反映されます。font は Enter / フォーカス外れ、weight はフォーカス外れか 450ms で反映されます。
4. 外部から変わった値は、編集中でなければ入力欄にも反映されます。

:::tip
長い 1 行は文字が小さくなります。改行を入れて複数行にすると大きく出せます。
存在しない font 名を入れても、ブラウザのフォールバックで何かの書体で描かれます。
:::

## 使用例

- MC 名や歌詞を、曲の途中で流し込む（`type`）。
- ハーフトーンなどの模様から、文字の形を抜く（`typeMask` の `knockout`）。
- 文字は見えないが、模様が文字の形に渦巻く（`typeWarp` の `swirl`）。

## 外部から操作する

Bridge の JSON-RPC `setText` で、文字を差し替えられます。

```json
{ "key": "type0.0", "text": "SEED\nSHADE", "weight": 900 }
```

- `key` は `<opId>` または `<opId>.<slot>`。`text` / `font` / `weight` / `clear` は任意です。
- `clear: true`、または `text` を省略すると解除されます。戻り値は `{ok, issues}` です。
- 前提として、`type` 系のノードを含む Patch が必要です。

CLI なら `vj-ctl` の `text` コマンドです（[vj-ctl](../../ai/vj-ctl/)）。

```bash
node scripts/vj-ctl.mjs text type0 "SEED\nSHADE" --weight 900   # \n は改行
node scripts/vj-ctl.mjs text type0                                # 文字列を省略すると解除
```

関連: 画像を入れる場合は [Timeline パネルの Images](../timeline/#images画像をスタンプする)。
