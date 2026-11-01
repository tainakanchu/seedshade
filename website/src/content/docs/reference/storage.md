---
title: 保存されるデータ
description: Seedshade がブラウザに保存するデータと、その消し方・持ち運び方。
---

Seedshade はサーバーに何も保存しません。保存するのはすべて、使っているブラウザの中です。
保存先はブラウザ・プロファイル・オリジン（URL のドメインとポート）ごとに分かれます。

| 内容 | 保存先 | キー / 名前 | 持ち運び |
| --- | --- | --- | --- |
| メイン窓の設定（ゲイン・Hue・背景・Auto-gacha・入力デバイス・シード） | `localStorage` | `seedshade-settings` | URL パラメータで再現できます |
| Scene Deck の手札（自動保存の current と `A`〜`H`） | `localStorage` | `seedshade-deck-banks-v1` | `JSON copy` / `JSON paste` |
| MIDI の割り当て | `localStorage` | `seedshade-deck-midi-v1` | `export` / `import` |
| 登録した画像 | IndexedDB | `seedshade-images` | 持ち運べません（先方で同じ画像を登録し直す） |

保存されないもの:

- 🧬（細部の引き直し）や Timeline パネルの `Apply`、CLI から送った Patch / シード。再読み込みすると、保存されているシードの見た目に戻ります。
- Timeline の予約イベント。必要なら Recording で JSON に書き出します（[Timeline パネル](../../guide/timeline/)）。
- `?ui=hide` などの一時的な URL パラメータ（`ui` / `room` / `bridge` / `mirror` / `deck`）。

## 初期状態に戻すには

ブラウザの開発者ツール（Application / ストレージ）で、該当するキーを削除します。
サイトのデータをまとめて消すと、設定・手札・MIDI の割り当て・画像がすべて消えます。

## 内部で使っている通信チャンネル

Scene Deck とメイン窓は、同じオリジンの `BroadcastChannel`（`seedshade-deck-v1`）で通信します。これはブラウザの中だけの通信で、ネットワークには出ません。
