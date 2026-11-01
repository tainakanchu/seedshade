// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// GitHub Pages serves the LP (site/) at the repo root
// (https://tainakanchu.github.io/seedshade/) and these docs live under
// /seedshade/docs/. So site = the user/org origin and base = /seedshade/docs.
export default defineConfig({
  site: "https://tainakanchu.github.io",
  base: "/seedshade/docs",
  integrations: [
    starlight({
      title: "Seedshade Docs",
      defaultLocale: "root",
      locales: {
        root: { label: "日本語", lang: "ja" },
        en: { label: "English", lang: "en" },
        "zh-tw": { label: "繁體中文", lang: "zh-TW" },
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/tainakanchu/seedshade",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/tainakanchu/seedshade/edit/main/website/",
      },
      // (Local full-text search via pagefind is enabled by default.)
      sidebar: [
        {
          // Link back to the LP at the site root. Use an absolute URL so
          // Starlight treats it as external and does NOT prepend the docs
          // base (/seedshade/docs) or the locale segment.
          label: "← Seedshade",
          link: "https://tainakanchu.github.io/seedshade/",
          attrs: { target: "_self" },
          translations: {
            en: "← Seedshade",
            "zh-TW": "← Seedshade",
          },
        },
        {
          label: "はじめに",
          translations: { en: "Getting started", "zh-TW": "開始使用" },
          items: [
            {
              slug: "index",
              label: "Seedshade とは",
              translations: { en: "What is Seedshade", "zh-TW": "什麼是 Seedshade" },
            },
            {
              slug: "guide/quickstart",
              label: "クイックスタート",
              translations: { en: "Quick start", "zh-TW": "快速開始" },
            },
          ],
        },
        {
          label: "ガイド",
          translations: { en: "Guide", "zh-TW": "指南" },
          items: [
            {
              slug: "guide/screen",
              label: "画面とキー操作",
              translations: { en: "Screen & keys", "zh-TW": "畫面與按鍵操作" },
            },
            {
              slug: "guide/seed",
              label: "シード（look gacha）",
              translations: { en: "Seeds (look gacha)", "zh-TW": "種子（look gacha）" },
            },
            {
              slug: "guide/semantic-synth",
              label: "Semantic Synth のしくみ",
              translations: { en: "How Semantic Synth works", "zh-TW": "Semantic Synth 的原理" },
            },
            {
              slug: "guide/tempo",
              label: "テンポ同期（BPM）",
              translations: { en: "Tempo sync (BPM)", "zh-TW": "節拍同步（BPM）" },
            },
            {
              slug: "guide/timeline",
              label: "Timeline パネル",
              translations: { en: "Timeline panel", "zh-TW": "Timeline 面板" },
            },
          ],
        },
        {
          label: "本番で使う",
          translations: { en: "Performing live", "zh-TW": "現場演出" },
          items: [
            {
              slug: "live/scene-deck",
              label: "Scene Deck（別窓ポン出し）",
              translations: { en: "Scene Deck", "zh-TW": "Scene Deck（另開視窗切換）" },
            },
            {
              slug: "live/banks",
              label: "手札（バンク）の保存",
              translations: { en: "Saving banks", "zh-TW": "儲存手牌（Bank）" },
            },
            {
              slug: "live/midi",
              label: "MIDI コントローラ",
              translations: { en: "MIDI controllers", "zh-TW": "MIDI 控制器" },
            },
            {
              slug: "live/obs",
              label: "OBS・透過・デスクトップ音声",
              translations: {
                en: "OBS, transparency & desktop audio",
                "zh-TW": "OBS・透明背景・桌面音訊",
              },
            },
            {
              slug: "live/remote",
              label: "リモート操作と複数画面",
              translations: { en: "Remote control & multiple screens", "zh-TW": "遠端操作與多螢幕" },
            },
            {
              slug: "live/checklist",
              label: "現場セットアップのチェックリスト",
              translations: { en: "Venue setup checklist", "zh-TW": "現場設定檢查清單" },
            },
          ],
        },
        {
          label: "AI と操縦する",
          translations: { en: "Directing with AI", "zh-TW": "與 AI 一起操控" },
          items: [
            {
              slug: "ai/overview",
              label: "しくみと接続",
              translations: { en: "How it works & connecting", "zh-TW": "原理與連線" },
            },
            {
              slug: "ai/vj-ctl",
              label: "vj-ctl（基本操作）",
              translations: { en: "vj-ctl (basic commands)", "zh-TW": "vj-ctl（基本操作）" },
            },
            {
              slug: "ai/gen-tweak",
              label: "vj:gen / vj:tweak（生成と手直し）",
              translations: {
                en: "vj:gen / vj:tweak (generate & adjust)",
                "zh-TW": "vj:gen / vj:tweak（生成與微調）",
              },
            },
            {
              slug: "ai/recipe-set",
              label: "vj:recipe / vj:set（レシピとセット）",
              translations: {
                en: "vj:recipe / vj:set (recipes & sets)",
                "zh-TW": "vj:recipe / vj:set（配方與歌單）",
              },
            },
            {
              slug: "ai/claude-code",
              label: "Claude Code（vj-director）",
              translations: { en: "Claude Code (vj-director)", "zh-TW": "Claude Code（vj-director）" },
            },
          ],
        },
        {
          label: "リファレンス",
          translations: { en: "Reference", "zh-TW": "參考" },
          items: [
            {
              slug: "reference/shortcuts",
              label: "キーボードショートカット",
              translations: { en: "Keyboard shortcuts", "zh-TW": "鍵盤快捷鍵" },
            },
            {
              slug: "reference/url-params",
              label: "URL パラメータ",
              translations: { en: "URL parameters", "zh-TW": "URL 參數" },
            },
            {
              slug: "reference/hosted-vs-local",
              label: "ホスト版とローカル版",
              translations: { en: "Hosted vs. local", "zh-TW": "線上版與本機版" },
            },
            {
              slug: "reference/storage",
              label: "保存されるデータ",
              translations: { en: "Stored data", "zh-TW": "儲存的資料" },
            },
          ],
        },
        {
          label: "開発者向け",
          translations: { en: "For developers", "zh-TW": "開發者" },
          items: [
            {
              slug: "dev/local",
              label: "ローカル起動・ビルド・テスト",
              translations: { en: "Run, build & test locally", "zh-TW": "本機啟動・建置・測試" },
            },
            {
              slug: "dev/preview-validate",
              label: "vj:preview / vj:validate",
              translations: { en: "vj:preview / vj:validate", "zh-TW": "vj:preview / vj:validate" },
            },
          ],
        },
        {
          label: "困ったとき",
          translations: { en: "Help", "zh-TW": "疑難排解" },
          items: [
            {
              slug: "troubleshooting",
              label: "トラブルシューティング / FAQ",
              translations: { en: "Troubleshooting / FAQ", "zh-TW": "疑難排解 / FAQ" },
            },
          ],
        },
      ],
    }),
  ],
});
