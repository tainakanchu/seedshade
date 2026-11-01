---
title: URL パラメータ
description: 起動時の設定を URL で指定するパラメータの一覧。
---

`?key=value&key2=value2` の形で、起動時の設定を指定できます。
**URL で指定した値は、ブラウザに保存されている設定より優先されます**（既定値 < 保存された設定 < URL）。
指定した値はそのまま保存されるので、次に URL なしで開いたときも引き継がれます（`ui` / `room` / `bridge` / `mirror` / `deck` は保存されません）。

## 見た目・音

| パラメータ | 値 | 内容 |
| --- | --- | --- |
| `seed` | 文字列（最大 64 文字） | シード。例: `seed=neon-tiger-042` |
| `bg` | `black` / `transparent` | 背景 |
| `ui` | `hide` | パネルを最初から隠す（`H` で出せます） |
| `gain` | 0.5〜4 | 入力ゲイン（範囲外は丸められます） |
| `hue` | 0〜360 | 色相を固定する（指定すると Hue が `Fixed` になります） |
| `autogacha` | `1` / `true` | N 小節ごとの自動ガチャを ON（それ以外の値は OFF） |
| `gachabars` | 1〜512 | 自動ガチャの間隔（小節） |
| `device` | デバイス ID | 音声入力デバイスを指定 |

## 窓の種類・接続

| パラメータ | 値 | 内容 |
| --- | --- | --- |
| `deck` | `1` / `true` | Scene Deck の窓として開く。音声入力と描画は起動しません。→ [Scene Deck](../../live/scene-deck/) |
| `room` | room id（英数字・`_`・`-` の 8〜64 文字） | ホスト版の Worker のリレー（`/room/<id>`）に接続する。→ [リモート操作](../../live/remote/) |
| `bridge` | `1` / `true` / 値なし / ポート番号（2〜65535） | ローカル中継（`ws://127.0.0.1:<port>`、既定 7877）に接続する。ローカル版専用 |
| `mirror` | `1` / `true` | `room` / `bridge` と一緒に使い、表示専用（mirror）として接続する |

- `room` と `bridge` を両方付けた場合は `room` が優先されます。
- `room` / `bridge` の値の形が正しくない場合は、どこにも接続しません（打ち間違えで別の room に入ってしまうのを防ぐため）。
- `room` / `bridge` を付けなければ、ネットワーク接続は一切行いません。

## 例

```text
# OBS 用: 透過背景・パネル非表示・ゲイン 2
https://seedshade.tainakanchu.com/?bg=transparent&ui=hide&gain=2

# 見た目を固定して、32 小節ごとに自動ガチャ
https://seedshade.tainakanchu.com/?seed=neon-tiger-042&autogacha=1&gachabars=32

# 色相を 200° に固定
https://seedshade.tainakanchu.com/?hue=200

# room で操作されるメイン + 表示専用のサブ画面
https://seedshade.tainakanchu.com/?room=<id>&ui=hide
https://seedshade.tainakanchu.com/?room=<id>&mirror=1&ui=hide

# ローカル版を、ローカル中継につないで開く
https://localhost:5173/?bridge=1
```

:::tip[device の ID を調べるには]
`device` に入れる ID はブラウザが割り当てる文字列で、パネルには表示されません。
ふだんは URL で指定せず、パネルの **Input device** で選んでください（選んだデバイスは保存されます）。
:::
