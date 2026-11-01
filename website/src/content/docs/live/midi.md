---
title: MIDI コントローラ
description: Scene Deck を MIDI パッドで操作する。KORG nanoPAD2 の Native モード対応と、learn による割り当て。
---

Scene Deck の窓は **Web MIDI** を受け付けます。パッドコントローラでポン出しやタップテンポができます。

- MIDI を受けるのは **Scene Deck の窓だけ** です（メイン窓では受けません）。
- Web MIDI はフォーカス不要なので、**Deck の窓が背面にあっても効きます**。

## 対応ブラウザ

| ブラウザ | 対応 |
| --- | --- |
| Chrome / Edge | 標準で対応 |
| Firefox | Web MIDI 用のサイト権限アドオンが必要（Firefox 108 以降） |
| Safari | 非対応。Deck は動きますが、`MIDI 非対応` と表示されます |

## 使い始める

1. コントローラを PC につないでから、Scene Deck を開きます。
2. ツールバーの **MIDI** ボタンを押します。
3. ブラウザが MIDI（SysEx を含む）の使用許可を求めるので許可します。
   SysEx を拒否した場合は SysEx なしで接続し直し、`SysEx なし` と表示されます（ふつうのノート / CC は使えますが、下の nanoPAD2 の自動設定は使えません）。
4. ボタンが `MIDI on` になり、MIDI の行に接続中のデバイス名が表示されます（何もなければ `no inputs`）。

許可を拒否してしまった場合はボタンが `MIDI retry` になります。ブラウザのサイト設定で MIDI を許可してから押し直してください。

## KORG nanoPAD2

nanoPAD2 は、つなぐだけでほぼ設定なしで使えます。

1. MIDI を有効にすると、SysEx で nanoPAD2 を探し、**Native KORG Mode** に切り替えます。成功すると `native` バッジが出ます。
2. Native モードに入れなかった場合は、本体の設定（Scene Data Dump）を読み出してパッドのノート番号から割り当てを自動生成します（`dump` バッジ）。
3. **pad 1 を叩いて確認してください** と出たら、1 番のパッド（pad 1）を叩きます。
   想定と違うパッドだった場合は **ズレています。learn しますか** と出るので、`learn` で割り当て直します。

### 既定の割り当て（Native モード）

| nanoPAD2 | Deck の操作 |
| --- | --- |
| 下段 8 パッド（Note 72–79 / ch 2） | スロット 1〜8 を出す |
| 上段 8 パッド（Note 64–71 / ch 2） | スロット 1〜8 を `cut` で出す |
| Scene ボタン（CC 57 / ch 16） | タップテンポ |
| X-Y パッドのタッチ（CC 11 / ch 16） | カーソル位置のスロットを出す |

- 上下が逆に感じる場合は、MIDI の行の **上下入替** をオンにします。
- X / Y の軸は既定では何も割り当てていません。learn で Hue や自動送りの間隔に割り当てられます。
- Touch Scale のノートは無視します。

### Scene LED（Native モードのみ）

| LED | 意味 |
| --- | --- |
| Scene 1 | メイン窓と接続中 |
| Scene 2 | Deck の自動送りが ON |
| Scene 3 | テンポがロック中 |
| Scene 4 | learn 中。エラーがあると点滅 |

:::caution[Native モードの解除]
Deck の窓を閉じる（またはリロードする）ときに、nanoPAD2 を Native モードから戻す信号を送ります。
ブラウザが強制終了したなどで戻らなかった場合、nanoPAD2 は Native モードのままになり、ほかのアプリで普段のノートが出なくなります。
そのときは **USB を抜き差しするか、電源を入れ直して** ください。
:::

## ほかのコントローラ（learn）

nanoPAD2 以外のコントローラや、Native モードを使わない場合は **learn** で割り当てます。

1. MIDI を有効にしてから、ツールバーの **learn** を ON にします。
2. MIDI の行に並んだ操作（`pad 1`〜`pad 8`、`pad N cut`、`cursor fire`、`transition`、`auto`、`auto mode`、`interval +`、`interval -`、`interval abs`、`rebuild`、`gacha bank`、`tap`、`seed gacha`、`details`、`hue`）から、割り当てたいものを選びます。
3. コントローラのパッドを叩く / ノブを回します。
4. 同じトリガーがすでに別の操作に割り当てられていた場合は、上書きして **上書きしました（既存のトリガー）** と表示されます。
5. **Esc** か、もう一度 **learn** を押すと終了します。learn 中もキーボードの操作は使えます。

`interval abs`（自動送りの間隔）と `hue`（固定 Hue）はノブやフェーダーの連続値に向いた操作です。ほかはボタン（押した瞬間）として動きます。

### ベロシティで cut にする

MIDI の行の `cut ≥` に 1〜127 の数値を入れると、その強さ以上でパッドを叩いたときは `cut` で、弱く叩いたときは選択中のプリセットで出します。空欄でオフです。

## 割り当ての保存と持ち出し

- 割り当てはブラウザの `localStorage`（キー `seedshade-deck-midi-v1`）に自動保存されます。名前も付けられます。
- MIDI の行の `export` で JSON をクリップボードにコピーし、別の PC の Deck で JSON をテキスト欄に貼り付けて `import` すると、同じ割り当てを使えます。
- `Native` のチェックを外すと、nanoPAD2 を Native モードに切り替えずに使います。
