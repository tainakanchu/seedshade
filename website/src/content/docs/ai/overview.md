---
title: しくみと接続
description: CLI / AI から Seedshade を操縦するしくみと、接続先の指定方法。
---

Seedshade は、画面の操作と同じことを CLI（コマンドライン）からも行えます。
AI（Claude Code など）にこの CLI を叩かせれば、「もっと湿った感じに」「8 小節後にこの絵へ」といった指示で映像を操縦できます。

## しくみ

```
CLI（vj-ctl など） ──WebSocket──▶ 中継（room / bridge） ──WebSocket──▶ メイン窓（ブラウザ）
```

- 中継は命令を受け渡すだけで、映像の判断は一切しません。
- メイン窓は受け取った命令を、Timeline パネルや画面の操作と **同じ入口** で実行します。Patch の検証も同じように効きます。
- CLI は 1 回の実行で 1 つの命令を送り、結果の JSON を表示して終わります。

中継の用意のしかた（room / bridge）は [リモート操作と複数画面](../../live/remote/) を参照してください。

## CLI の一覧

すべてリポジトリの `scripts/` に入っています。操作する PC にリポジトリを clone して `pnpm install` しておきます（Node.js 24 と pnpm が必要です）。

| CLI | 呼び方 | 何をするか |
| --- | --- | --- |
| `vj-ctl` | `node scripts/vj-ctl.mjs` | 1 命令ずつ叩く基本の CLI。状態の取得、シード / Patch の適用、Timeline の予約、録画など。→ [vj-ctl](../vj-ctl/) |
| `vj-gen` | `node scripts/vj-gen.mjs` / `pnpm vj:gen` | ムード語から Patch を生成して送る。→ [vj:gen / vj:tweak](../gen-tweak/) |
| `vj-tweak` | `node scripts/vj-tweak.mjs` / `pnpm vj:tweak` | 今の Patch の一部だけを書き換えて送る。→ [vj:gen / vj:tweak](../gen-tweak/) |
| `vj-recipe` | `node scripts/vj-recipe.mjs` / `pnpm vj:recipe` | 保存したレシピから Patch を作り直して送る。→ [vj:recipe / vj:set](../recipe-set/) |
| `vj-set` | `node scripts/vj-set.mjs` / `pnpm vj:set` | 複数シーンを cue として仕込み、本番で順に進める。→ [vj:recipe / vj:set](../recipe-set/) |
| `vj-bridge` | `pnpm bridge` | ローカル中継を起動する。 |
| `vj-validate` | `pnpm vj:validate` | Patch を本物の検証ルールでローカル検証する（通信なし）。→ [vj:preview / vj:validate](../../dev/preview-validate/) |
| `vj-preview` | `pnpm vj:preview` | Patch を PNG に描く（通信なし）。→ [vj:preview / vj:validate](../../dev/preview-validate/) |

:::note
`vj-ctl` には `pnpm` のスクリプト名がありません。`node scripts/vj-ctl.mjs` で呼び出します。
:::

## 接続先の指定

CLI によって、接続先の指定方法が少し違います。

| CLI | 何も指定しないとき | 指定のしかた |
| --- | --- | --- |
| `vj-ctl` | ローカル中継 `ws://127.0.0.1:7877` | `--url <ws(s)://…>` または `--port <n>` |
| `vj-set` | ローカル中継（`vj-ctl` の既定） | `--url` または `--port` |
| `vj-gen` / `vj-tweak` / `vj-recipe` | **エラー**（指定が必須） | `--url <ws(s)://…>` または環境変数 `VJ_URL` |

接続先の URL は次のとおりです。

| 中継 | URL |
| --- | --- |
| room（ホスト版） | `wss://seedshade.tainakanchu.com/room/<id>` |
| bridge（ローカル） | `ws://127.0.0.1:7877` |

:::tip[毎回 `--url` を書かないために]
`vj-gen` / `vj-tweak` / `vj-recipe` は環境変数 `VJ_URL` を読みます。

```bash
export VJ_URL=wss://seedshade.tainakanchu.com/room/<id>   # bash / zsh
set -x VJ_URL wss://seedshade.tainakanchu.com/room/<id>   # fish
```

`vj-ctl` と `vj-set` は `VJ_URL` を読まないので、こちらには `--url` を付けてください。
:::

## 出力の読み方（共通）

| 結果 | 意味 |
| --- | --- |
| exit 0、stdout に JSON | 成功 |
| exit 1、`{"ok":false,"issues":[…]}` など | 通信はできたが、命令が却下された（Patch の検証に落ちた、ロック中など）。issues を読んで直す |
| exit 1、`{"error":"…"}` | 通信または引数のエラー。stderr にヒントが出る |

よくあるエラー:

- `no synth connected` … メイン窓がつながっていません。ページの URL に `?room=` / `?bridge=1` が付いているか、room id が合っているか確認します。
- `timeout waiting for synth` … メイン窓が応答しません。ブラウザのタブが背面に回って描画が止まっていることがあります。メイン窓を前面に出してください。
- 接続できない（`ECONNREFUSED` など） … ローカルなら `pnpm bridge` が起動していません。
