# ドキュメントの保守

`website/` は Seedshade の使い方ドキュメント（Astro + Starlight）です。
GitHub Pages の `https://tainakanchu.github.io/seedshade/docs/` で公開され、LP（`site/`）は
`https://tainakanchu.github.io/seedshade/` に置かれます。

**コードが正（source of truth）です。** README やこのドキュメントと実装が食い違ったら、実装に合わせて直します。

---

## 1. ローカルで動かす

`website/` は **独立した pnpm プロジェクト** です（ルートの `package.json` とは別。`website/pnpm-workspace.yaml` は
`packages: []` で、ルートのワークスペースに巻き込まれないようにしています）。

```bash
cd website
pnpm install
pnpm dev      # http://localhost:4321/seedshade/docs/
pnpm build    # dist/ に静的サイトを出力（リンク切れ・frontmatter の不備はここで落ちる）
pnpm preview  # ビルド結果の確認
```

`node_modules/` `dist/` `.astro/` は `website/.gitignore` で除外しています。

## 2. ページの構成

```
website/
├── astro.config.mjs          # サイト設定・ロケール・サイドバー
├── src/content.config.ts     # Starlight の docs コレクション定義（触らなくてよい）
└── src/content/docs/
    ├── index.mdx             # トップ（splash）
    ├── guide/                # 基本の使い方
    ├── live/                 # 本番で使う（Deck / MIDI / OBS / room・mirror / チェックリスト）
    ├── ai/                   # CLI と Claude Code での操縦
    ├── reference/            # ショートカット・URL パラメータ・ホスト版とローカル版・保存データ
    ├── dev/                  # 開発者向け
    ├── troubleshooting.md
    ├── en/                   # 英語訳（ja と同じ 25 ページ。無いページは日本語にフォールバック）
    └── zh-tw/                # 繁体字訳（同じく 25 ページ。同上）
```

## 3. ページを編集する / 追加する

- 既存ページは `src/content/docs/` の `.md` / `.mdx` を直接編集します。
- 各ページの先頭に frontmatter（`title` と `description`）が必要です。
- Starlight のコンポーネント（`Steps` / `Aside` / `Tabs` / `Card` など）を使うページは **`.mdx`** にして、
  `import { Steps } from "@astrojs/starlight/components";` のように読み込みます。
  `.md` でも `:::note` / `:::tip` / `:::caution` / `:::danger` の注記は使えます。
- `.mdx` では、コードブロック・インラインコードの外に `<id>` や `{…}` を書くと JSX として解釈されて壊れます。
  プレースホルダーは必ずバッククォートで囲みます。

### 新しいページを足す手順

1. `src/content/docs/<セクション>/<名前>.md` を作る。
2. `astro.config.mjs` の `sidebar` の該当グループに `{ slug: "<セクション>/<名前>", label: "…", translations: { en: "…", "zh-TW": "…" } }` を足す。
   （`translations` のキーは BCP-47 の `lang`（`en` / `zh-TW`）です。ロケールのディレクトリ名 `zh-tw` ではありません。）
3. `pnpm build` が通ることを確認する。

### リンクの書き方

- サイト内リンクは **相対パス** で書きます（例: `../../live/scene-deck/`）。`base`（`/seedshade/docs`）は自動では付かないので、`/live/...` のような絶対パスは使いません。
- 見出しへのリンクは `#` 以降に見出しのスラッグを付けます。日本語の見出しはそのまま（記号は除かれ、空白は `-`）になります。迷ったら `pnpm build` 後に `dist/` の HTML の `id` を確認します。
- LP へ戻るリンク（サイドバーの「← Seedshade」）は絶対 URL にしてあります（相対にすると docs の base が付いてしまうため）。

## 4. 翻訳

- **日本語（ルートロケール）が正本** です。`en/`（英語）と `zh-tw/`（繁体字）は日本語を訳したものです。
- 訳は、日本語と **同じパス** に置きます（例: `guide/quickstart.mdx` → `en/guide/quickstart.mdx`）。
- 訳が無いページは、自動的に日本語版が表示されます（Starlight のフォールバック）。全ページを一度に訳す必要はありません。
- サイドバーの見出しの訳は `astro.config.mjs` の `translations` に書きます（ページ本文とは別）。
- 事実を直すときは、まず日本語を直し、訳があるロケールにも同じ修正を入れます。
- **見出しのアンカー（スラッグ）はロケールごとに異なります**（見出しの文言が違うため）。同じページ内でも、日本語版の `#見出し` を英語版・繁体字版にそのまま流用できません。各ロケールのリンクは、そのロケールの見出しのスラッグで書き、`pnpm build` 後に各ロケールの `dist/` の HTML の `id` で確認してください。
- コード識別子、CLI のオプション、URL パラメータ、キー名、アプリ内の UI ラベル（`Look`、`Input device`、`Scene Deck` など）は訳さずにそのまま残します。

## 5. 実装に追従するためのチェックリスト

機能を変える PR では、該当するページを確認してください。各ページが説明している実装の場所です。

- [ ] **guide/screen.md / reference/shortcuts.md** — メイン窓のキー（`src/App.tsx` の keydown）、パネルの項目（`src/ui/ControlPanel.tsx`）、レベルメーターのしきい値（`src/ui/meter.ts`）。
- [ ] **reference/shortcuts.md / live/scene-deck.md** — Deck のキー（`src/deck/actions.ts` の `keyToAction`、`src/deck/DeckApp.tsx` の `Shift+S` / `F` / `Esc`）、自動送りの範囲（`src/deck/autoAdvance.ts`）、遷移プリセットの順（`PRESET_CYCLE`）。
- [ ] **reference/url-params.md** — `src/ui/useSettings.ts` の `readUrl`、`src/synth/bridgeClient.ts`（`room` / `bridge` / `mirror`）、`src/deck/protocol.ts`（`deck`）。
- [ ] **guide/semantic-synth.md** — Generator の数とカテゴリ（`src/synth/generators/`）、1 Patch の個数制限（`src/synth/validate.ts` の `COUNT_LIMITS`）、オーディオ・リアクション（`src/synth/gl/reactions.ts`）、時間の進み方（`src/synth/motion.ts`）、DPR（`src/render/Renderer.ts`）。
- [ ] **guide/tempo.md** — `src/audio/TempoTracker.ts` の定数、Auto-gacha の進み方（`src/App.tsx`）。
- [ ] **guide/timeline.md** — `src/ui/TimelinePanel.tsx`、`src/synth/timeline.ts`、`src/synth/types.ts` の `TRANSITION_PRESETS`。
- [ ] **live/banks.md** — `src/deck/bankStore.ts`、`src/deck/DeckApp.tsx` の手札まわり。
- [ ] **live/midi.md** — `src/deck/midi.ts`（learn の項目）、`src/deck/nanopad2.ts`（既定マップ）、`src/deck/useMidi.ts`。
- [ ] **live/remote.mdx / reference/hosted-vs-local.md** — `worker/index.ts`、`worker/relay.ts`、`scripts/vj-bridge.mjs`（Origin 制限）、`src/synth/bridgeClient.ts`、`wrangler.jsonc`。
- [ ] **ai/*.md** — 各 CLI の `USAGE`（`scripts/vj-ctl.mjs` / `vj-gen.mjs` / `vj-tweak.mjs` / `vj-recipe.mjs` / `vj-set.mjs`）と `.claude/skills/vj-director/SKILL.md`。
- [ ] **dev/*.md** — ルートの `package.json` の scripts、`flake.nix`、`vite.config.ts`、`.github/workflows/ci.yml`。
- [ ] **reference/storage.md** — `localStorage` のキー（`seedshade-settings`、`seedshade-deck-banks-v1`、`seedshade-deck-midi-v1`）と IndexedDB（`seedshade-images`）。

ホスト版の URL（`https://seedshade.tainakanchu.com`）が変わったら、`grep -rn seedshade.tainakanchu.com src/` で一括で直します。
