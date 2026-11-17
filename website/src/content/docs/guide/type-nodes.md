---
title: 文字ノード（type / typeMask / typeWarp）
description: 文字を映像の上に重ねるのではなく、Semantic Synth のノードとして入れる。太さ・縁取り・ぼかしを動かし、音で変調できる。
---

文字を「上に重ねる」のではなく、Semantic Synth の **ノードとしてパイプラインに入れる** 機能です。
入力した文字は符号付き距離場（SDF）のテクスチャになるので、太さ・縁取り・ぼかしをパラメータで動かせ、[オーディオ変調](../semantic-synth/#音が映像を動かすしくみ)の対象にもなります。

- 文字を変えても **シェーダの再コンパイルは起きません**。その場で切り替わります（Patch の構成は変わらないため）。
- シードのガチャでは出てきません。**手動で追加したときだけ** 入ります（[ピン留め](#文字のピン留め)した文字は、seed を変えたあとの Patch に自動で差し込まれます）。
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
2. スロットごとに、テキストエリア・font-family 欄・weight 欄（100 刻み）・clear ボタン・pin ボタンが出ます。
3. テキストは **Enter で確定** します（Shift+Enter で改行、IME 変換中の Enter は無視）。フォーカスを外したとき、入力が 450ms 止まったときにも反映されます。font は Enter / フォーカス外れ、weight はフォーカス外れか 450ms で反映されます。
4. 外部から変わった値は、編集中でなければ入力欄にも反映されます。

:::tip
長い 1 行は文字が小さくなります。改行を入れて複数行にすると大きく出せます。
存在しない font 名を入れても、ブラウザのフォールバックで何かの書体で描かれます。
:::

## 文字のリンク

Texts セクションの **Link** トグル（既定オン、設定に保存）で、スロット間の文字を連動させるかを選べます。

- **オン**: どのスロットの文字・font・weight を編集（clear 含む）しても、全テキストスロットに同じ値が入ります。
- **オフ**: スロットごとに個別です。
- `+ type` / `+ mask` / `+ warp` で追加したノードは、既存スロットの値をコピーして始まります（スロットが無ければ `SEEDSHADE`）。

基本は同じ文字のままで構いません。type に名前、warp に気配だけのテーマ語、mask に記号（● ★）や漢字 1 字を「形」として入れる、のように **別の文字にしたいときだけ Link をオフ** にしてください。

## 文字のピン留め

各スロット行の **pin** / **pinned** ボタンで付け外しします。ピンした文字ノードは、seed を変えたときに新しい Patch へ自動で差し込まれ、**まわりの映像だけが変わります**。
seed の変更とは、R キー、🎲、seed 入力、Auto-gacha、Timeline の seed のみのイベント、`vj-ctl seed` のことです。ピンの一覧と **Unpin all** が表示されます。ピンは最大 4 件です。

- 差し込まれるのは、seed から作られた Patch だけです。デッキのバンク、Patch 付きの Timeline イベント、外部から送った Patch（`proposePatch`）には入りません。
- 同じ段のノード上限や負荷予算を超えるときは、ガチャ側の同じ種類のノードを後ろから外して場所を空けます。
- ピン操作そのものは今の映像を変えません（次の seed 変更から効きます）。
- 文字はピン後の編集に追従します。パラメータ（太さなど）は **ピンした時点の値** です。反映したいときはピンし直してください（UI は unpin → pin、CLI は `vj-ctl pin <opId>` を再実行）。

:::caution
録画（Recording）の再生中に seed のみのイベントが起きると、そのとき（再生時点）のピンが差し込まれます。
:::

## 使用例

- MC 名や歌詞を、曲の途中で流し込む（`type`）。
- ハーフトーンなどの模様から、文字の形を抜く（`typeMask` の `knockout`）。
- 文字は見えないが、模様が文字の形に渦巻く（`typeWarp` の `swirl`）。
- イベント名を `type` でピンしておき、Auto-gacha で背景だけを回し続ける。

## 外部から操作する

Bridge の JSON-RPC `setText` で、文字を差し替えられます。

```json
{ "key": "type0.0", "text": "SEED\nSHADE", "weight": 900 }
```

- `key` は `<opId>` または `<opId>.<slot>`。`text` / `font` / `weight` / `clear` は任意です。
- `clear: true`、または `text` を省略すると解除されます。戻り値は `{ok, issues}` です。
- 前提として、`type` 系のノードを含む Patch が必要です。
- `key` を省略するか `"*"` にすると、全テキストスロットに同じ値を書きます（スロットが 1 つも無ければ `ok: false`）。

ピンも Bridge から操作できます。

| メソッド | 引数 | 返り値 |
| --- | --- | --- |
| `pinText` | `{ opId: "type0" }`（今の Patch のノードをピン。ピン中なら現在値で更新）、または `{ node: { generatorId: "type"\|"typeMask"\|"typeWarp", text: string \| {text, font?, weight?}, parameters?, opId? } }` | `{ ok, issues, pinned, opId }` |
| `unpinText` | `{ opId? }`（省略または `"*"` で全解除） | `{ ok, issues, pinned }` |
| `getPinnedText` | なし | `{ pinned }` |

CLI なら `vj-ctl` の `text` コマンドです（[vj-ctl](../../ai/vj-ctl/)）。

```bash
node scripts/vj-ctl.mjs text type0 "SEED\nSHADE" --weight 900   # \n は改行
node scripts/vj-ctl.mjs text type0                                # 文字列を省略すると解除
node scripts/vj-ctl.mjs text '*' "SEEDSHADE" --weight 700         # 全テキストスロットへ（文字列省略で全解除）
node scripts/vj-ctl.mjs pin type0                                 # 今の Patch の type0 をピン（再実行で現在値に更新）
node scripts/vj-ctl.mjs pin --generator type "SEEDSHADE" --font serif --weight 800 --id name
node scripts/vj-ctl.mjs unpin type0                               # 引数なしで全解除
node scripts/vj-ctl.mjs pins                                      # ピン中の一覧
```

関連: 画像を入れる場合は [Timeline パネルの Images](../timeline/#images画像をスタンプする)。
