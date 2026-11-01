---
title: ホスト版とローカル版
description: 公開中のアプリ（ホスト版）でできることと、手元で起動したローカル版でしかできないこと。
---

Seedshade には 2 つの使い方があります。

| | ホスト版 | ローカル版 |
| --- | --- | --- |
| URL | [https://seedshade.tainakanchu.com](https://seedshade.tainakanchu.com)（`https://seedshade.tainakanchu815.workers.dev` でも同じものが開きます） | `pnpm dev` で `https://localhost:5173/` |
| 中身 | `main` ブランチをビルドしたもの（Cloudflare Workers で配信） | 手元のコード |
| 準備 | 不要 | Node.js 24・pnpm・リポジトリの clone |

ホスト版の Worker は、ビルド済みのアプリを配信するのと、`/room/<id>` の WebSocket リレー（CLI からの操作の中継）だけを行います。音声や映像がサーバーに送られることはありません。

## できることの比較

| 機能 | ホスト版 | ローカル版 |
| --- | --- | --- |
| 描画・音声入力・コントロールパネル | ○ | ○ |
| Timeline パネル（予約・Patch 編集・画像・録画） | ○ | ○ |
| Scene Deck・手札・MIDI | ○ | ○ |
| OBS のブラウザソース | ○ | ○（自己署名証明書のため、OBS 側で証明書エラーになる場合があります） |
| `?room=` で CLI / AI から操作 | ○ | ×（開発サーバーに `/room` のリレーがありません） |
| `?bridge=1` + `pnpm bridge` で CLI / AI から操作 | ×（ローカル中継が `localhost` 以外のページからの接続を拒否します） | ○（同じ PC の中だけ） |
| `mirror` で複数画面 | ○（`room` と併用。別の PC・別のネットワークでも可） | △（`bridge` と併用。同じ PC の中だけ） |
| LAN の別端末で開く | ○（URL を開くだけ） | ○（`https://<PC の IP>:5173/`。証明書の警告あり。bridge は使えない） |
| インターネットなしで使う | × | ○（`pnpm dev`、または `pnpm build` → `pnpm preview`） |
| `vj:preview` / `vj:validate` | —（どちらもリポジトリ上で動く CLI で、アプリには接続しません） | — |

CLI（`vj-ctl` / `vj-gen` など）はどちらの場合も、リポジトリを clone した PC で実行します。ホスト版を操作するときは `--url wss://seedshade.tainakanchu.com/room/<id>` を指定します。

## 保存データは共有されません

設定・Scene Deck の手札・MIDI の割り当て・登録した画像は、**ブラウザとオリジン（URL のドメイン）ごと** に保存されます。

- ホスト版（`seedshade.tainakanchu.com`）と `workers.dev` の URL は、別のオリジンなので保存データは別々です。
- ローカル版（`localhost:5173`）とも共有されません。
- 本番で開く URL と同じ URL で準備してください。手札と MIDI の割り当ては JSON で持ち運べます（[手札の保存](../../live/banks/)・[MIDI](../../live/midi/)）。

詳しくは [保存されるデータ](../storage/) を参照してください。

## どちらを使えばいいか

- **とりあえず使う・本番で使う** → ホスト版。AI / CLI から操作するときは `?room=`。
- **会場にネットがない・開発中の機能を試したい** → ローカル版。
- **Claude Code と一緒に同じ PC で作り込む** → どちらでも可。ローカル版なら `pnpm bridge`、ホスト版なら `room`。
