---
title: vj-ctl（基本操作）
description: 1 命令ずつ叩く基本の CLI。状態の取得、シード / Patch の適用、Timeline の予約、ロック、録画。
---

`vj-ctl` は、メイン窓に命令を 1 つ送って結果を表示する CLI です。
以下の例では、ローカル中継（`pnpm bridge`）に送る形で書いています。ホスト版の room に送るときは、すべてのコマンドに `--url wss://seedshade.tainakanchu.com/room/<id>` を付けてください（[しくみと接続](../overview/)）。

## コマンド一覧

| コマンド | 何をするか |
| --- | --- |
| `state` | 現在の状態（Patch、Timeline、シーン時計 `nowSec`、小節 `barCount`、`tempoLocked`、載っているリアクション `reactions` など）を表示 |
| `catalog` | Generator の一覧（id・カテゴリ・タグ・パラメータ・コスト）を表示 |
| `seed <seed>` | そのシードの見た目へ **今すぐ** 遷移 |
| `patch <file.json>` | Patch の JSON を **今すぐ** 適用（検証に落ちると issues が返る） |
| `image <file> [--name <n>]` | 画像（png / jpg / webp / gif / svg / avif、5MB まで）を登録。返ってくる `hash` を Patch の `images` に入れて使う |
| `event add …` | Timeline にイベントを予約（下記） |
| `event remove <id>` | 予約を取り消す |
| `lock <sec>` | 今から N 秒間、Timeline をロック（相対指定） |
| `fire <externalId>` | external イベントを手動で発火 |
| `record start` | 演出の記録を開始 |
| `record stop` | 記録を止め、記録 JSON を stdout に出す（`> recording.json` で保存） |
| `load <recording.json>` | 記録を読み込んで Timeline を復元 |
| `room` | 新しい room id と URL を作る（通信しない）。`--host seedshade.tainakanchu.com` を付ける |

共通オプション: `--port <n>`（ローカル中継のポート、既定 7877）、`--url <ws(s)://…>`（`--port` と同時には使えません）、`--help`。

## よく使う例

```bash
# 今の状態を見る
node scripts/vj-ctl.mjs state

# 今すぐ別のシードへ（シードの文字列に意味はありません）
node scripts/vj-ctl.mjs seed "take-1"

# 用意した Patch を今すぐ当てる
node scripts/vj-ctl.mjs patch ./patch.json

# 30 秒後に別のシードへ、ゆっくり切り替える
node scripts/vj-ctl.mjs event add --in 30 --seed take-2 --transition slow

# 8 小節後に Patch を差し替える（テンポがロックしているときだけ発火）
node scripts/vj-ctl.mjs event add --bar 8 --patch ./next.json --label "chorus"

# 「drop」で待機させておき、タイミングは手で決める
node scripts/vj-ctl.mjs event add --cue drop --patch ./drop.json --label "drop"
node scripts/vj-ctl.mjs fire drop

# 今から 60 秒ロック
node scripts/vj-ctl.mjs lock 60

# 演出を記録して保存し、あとで読み込む
node scripts/vj-ctl.mjs record start
node scripts/vj-ctl.mjs record stop > recording.json
node scripts/vj-ctl.mjs load recording.json
```

## event add のオプション

| オプション | 内容 |
| --- | --- |
| `--in <sec>` | 今から N 秒後 |
| `--bar <n>` | 今から N 小節後。テンポがロックしていない（`state` の `tempoLocked` が `false`）と発火しないので、そのときは `--in` を使う |
| `--cue <id>` | external イベント。`fire <id>` するまで発火しない |
| `--seed <s>` / `--patch <file>` / `--label <s>` | 何に切り替えるか。どれか 1 つは必要 |
| `--transition default\|slow\|cut` | 遷移の速さ（既定 `default`。`slow` は 2 倍の時間、`cut` は約 0.12 秒） |

- 基準を複数付けた場合は `--bar` → `--in` → `--cue` の順で優先されます。
- `--in` / `--bar` / `lock` はすべて **今からの相対指定** です。CLI が `state` を読んで絶対値に直してから送ります。
- 追加したイベントの id は出力に含まれます。取り消しは `event remove <id>` です。

:::caution[`--patch` は予約時に検証されません]
`patch <file>` はメイン窓で検証にかけられますが、`event add --patch` で予約した Patch は **検証を通らずにそのまま** Timeline に入り、発火時にそのまま適用されます。
予約する前に `pnpm vj:validate <file>` で検証しておいてください（[vj:preview / vj:validate](../../dev/preview-validate/)）。
:::

## 知っておくと良いこと

- `seed` は Timeline を通さずに今すぐ切り替えます。メイン窓のパネルの **Look** に表示されるシードは変わらず、保存もされません。ページを再読み込みすると、パネルの Look のシードの見た目に戻ります。
- `lock` が止めるのは、ロック期間中に発火するイベントの編集・削除と、Scene Deck からのポン出しです。`seed` / `patch` / `event add` や、メイン窓のキー操作は止めません。
- 1 回の実行は全体で 20 秒、メイン窓の応答待ちは 15 秒でタイムアウトします。
