---
title: Claude Code（vj-director）
description: リポジトリ同梱の vj-director スキルで、Claude Code に映像を操縦してもらう。
---

リポジトリには、[Claude Code](https://claude.com/claude-code) 用のスキル **vj-director**（`.claude/skills/vj-director/SKILL.md`）が入っています。
リポジトリのディレクトリで Claude Code を起動して、「映像をもっと湿った感じに」「8 小節後に切り替えて」のように頼むと、Claude Code がこのスキルを読み込み、ここまでに説明した CLI を使って映像を操縦します。

## 準備

Claude Code はブラウザを開けないので、**メイン窓を開くのは人間の役目** です。

### ローカル版で使う場合

1. リポジトリで `pnpm dev` を起動します。
2. Claude Code に頼むか自分で、`pnpm bridge` を起動しておきます（動かしっぱなしにします）。
3. ブラウザで `https://localhost:5173/?bridge=1` を開きます。
4. Claude Code が `node scripts/vj-ctl.mjs state` で疎通を確認します。

### ホスト版で使う場合

1. Claude Code に「room を作って」と頼みます（`vj-ctl room --host seedshade.tainakanchu.com` が実行されます）。
2. 返ってきた `pageUrl`（`https://seedshade.tainakanchu.com/?room=<id>`）を、出力用のブラウザで開きます。
3. 以降、Claude Code はすべてのコマンドに `--url wss://seedshade.tainakanchu.com/room/<id>` を付けて操作します。

詳しくは [リモート操作と複数画面](../../live/remote/) を参照してください。

## 頼み方の例

| 頼み方 | Claude Code がやること（スキルの方針） |
| --- | --- |
| 「〜な感じにして」「とりあえず変えて」 | `vj-gen` でムード語から生成。外れたら `--count` で比較するか `vj-tweak` で寄せる |
| 「同じ構成のまま雰囲気だけ変えて」 | `vj-tweak --reroll`（構成と拍のリアクションは維持） |
| 「すぐ変えて」 | `vj-ctl seed`（完全ランダム）または `vj-ctl patch`（狙いが明確なとき） |
| 「サビで」「あと 1 分くらいしたら」 | `vj-ctl event add --in` / `--bar` で予約 |
| 「セットを仕込んでおいて、本番は自分のタイミングで進めたい」 | `vj-set load` で cue として仕込み、本番は `vj-set next` |
| 「今のを保存して」「さっきの流れをもう一回」 | `record start` → `record stop > file.json` → `load file.json` |
| 「しばらくいじらないで」 | `vj-ctl lock <秒>` |

スキルは「**タイミングは事前に確定しない**」方針です。長いセットを会話しながら組み立てていると、早めに積んだ `--in` の予約がいつの間にか過去になって意図しないタイミングで発火することがあるため、迷ったら手動発火の `--cue` / `vj-set` を使います。

また、手で組んだ Patch や `--dry-run` の結果を送る前には `vj-validate` を通し、Patch を組む前には `vj-preview --contact-sheet` で Generator の実際の見た目を確認するよう指示されています。

## 好みを教える

スキルの末尾には「ユーザーの美的傾向」という節があり、Claude Code はこれを参考に絵の方向性やテンポ感を決めます（たとえば「変化は秒スケールでゆっくり」「迷ったら `--transition slow`」など）。
自分の好みに合わせたいときは、この節を書き換えてください。
