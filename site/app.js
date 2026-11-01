// Seedshade landing page: language switch, nav, live hero shader, overlay demo.
// Zero dependencies. The hero shader is a port of the app's `caustics`
// generator (src/synth/generators/caustics.ts) driven by a synthetic beat.

/* ============================================================
   i18n (日本語 / English / 繁體中文)
   data-i18n       -> textContent
   data-i18n-html  -> innerHTML (only strings from this file)
   data-i18n-alt   -> alt
   data-i18n-aria  -> aria-label
   ============================================================ */
const I18N = {
  ja: {
    "meta.title": "Seedshade — seed から GLSL を合成する、音に反応する VJ ツール",
    "meta.desc":
      "Seedshade は seed の文字列から GLSL シェーダを合成し、音に合わせて描くブラウザだけで動く VJ ツール。127 種類の Generator、ビート / BPM 検出、OBS 向けの透過背景、Scene Deck と MIDI、AI からの演出操作に対応。",
    "nav.skip": "本文へ移動",
    "nav.menu": "メニュー",
    "nav.how": "仕組み",
    "nav.gallery": "ギャラリー",
    "nav.live": "本番で使う",
    "nav.ai": "AI 操縦",
    "nav.docs": "使い方",
    "cta.open": "アプリを開く",
    "cta.docs": "使い方を読む",
    "hero.lead":
      "seed の文字列から GLSL シェーダを合成し、音に合わせて描く。ブラウザだけで動く VJ ツールです。",
    "hero.reroll": "引き直す",
    "hero.note": "背景はアプリの caustics Generator をこのページ用に移植したものです。",
    "how.title": "seed から、1 本のシェーダへ",
    "how.body":
      "seed を入れると、127 種類の Generator から組み合わせが決定的に選ばれ、1 本のフラグメントシェーダに組み上がります。同じ seed なら、いつ開いても同じ見た目。気に入った画は seed の文字列を控えておけば再現できます。",
    "how.s1": "seed を入れる",
    "how.s2": "Generator を選んで重ねる",
    "how.s3": "GLSL に組み立てる",
    "how.s3body":
      "選ばれた Generator のコードを 1 本のフラグメントシェーダにまとめ、音の解析値を uniform で流し込みます。",
    "how.s4": "音に合わせて描く",
    "how.alt": "seed iris-engine-404 のフレーム",
    "how.cat.source": "形を生む。線、格子、粒子、SDF の立体、スペクトラム。",
    "how.cat.field": "ノイズや流れなど、面に広がる場。",
    "how.cat.modifier": "鏡像、万華鏡、ずれ、渦。座標を曲げる。",
    "how.cat.material": "CRT、リソグラフ、網点、金箔。最後の質感。",
    "gallery.title": "同じエンジン、別の seed",
    "gallery.body":
      "どれもアプリに seed を入れて撮ったフレームです。キャプションは seed と、そこから選ばれた Generator。",
    "gallery.sheetTitle": "カタログの 127 Generator",
    "gallery.sheetBody":
      "<code>pnpm vj:preview --contact-sheet</code> で書き出した一覧です。Generator を 1 つずつ、既定のパラメータで単独描画しています。Patch を組む前に、まずここで目で選びます。",
    "gallery.sheetOpen": "原寸で開く",
    "gallery.sheetAlt": "127 種類の Generator を単独で描いたコンタクトシート",
    "features.title": "音を聴いて、絵が変わる",
    "f.gacha.t": "look gacha",
    "f.gacha.d":
      "<kbd>R</kbd> で seed を引き直すと、配色、構図、Generator の組み合わせまでまとめて変わります。切り替えはクロスフェード。<kbd>D</kbd> なら構成はそのままに細部だけ引き直します。",
    "f.audio.t": "音への反応",
    "f.audio.d":
      "マイク、ライン入力、ループバックを解析します。bass / mid / treble が Patch のパラメータを動かし、拍で起きるグリッチの種類は Patch ごとに決まります。無音ではほぼ止まり、大音量が続いても画面が暗く沈むことはありません。",
    "f.tempo.t": "テンポ同期",
    "f.tempo.d":
      "低域のオンセットから BPM を推定してビートグリッドを作ります。ブレイク中も拍を刻み続け、TAP で手動指定もできます。N 小節ごとの自動ガチャも拍に合わせて進みます。",
    "f.textures.t": "スペクトラムと波形",
    "f.textures.d":
      "128 バンドのスペクトラムと 256 サンプルの波形を GPU に送り、<code>spectrumBars</code>、<code>oscilloscope</code>、<code>lissajousScope</code> などの Generator が直接読みます。",
    "f.timeline.t": "Timeline",
    "f.timeline.d":
      "seed の変更やトランジションを N 秒後、N 小節後に予約できます。演出を記録して JSON に書き出し、あとから再生することもできます。",
    "f.images.t": "画像を素材に",
    "f.images.d": "PNG / JPG / WebP / SVG をページにドロップすると、Patch が読む画像として使えます。",
    "f.perf.t": "内蔵 GPU で 1080p",
    "f.perf.d":
      "ノート PC の内蔵 GPU での常用を想定しています。重くなると内部解像度を段階的に下げてフレームレートを保ち、余裕が戻れば元に戻します。",
    "live.title": "本番の卓で",
    "live.body":
      "メイン窓は <code>?ui=hide</code> でフルスクリーンにしてプロジェクターへ。操作は手元の別窓から行います。",
    "live.mainAlt": "Seedshade のメイン画面。左にコントロールパネル、右に Timeline パネル",
    "live.main.t": "メイン窓",
    "live.mainCap": "左がコントロールパネル、右が Timeline。パネルはマウスを止めると消え、H で隠せます。",
    "live.deck.t": "Scene Deck",
    "live.deck.d":
      "いまの Patch から 8 面のバリエーションを作り、<kbd>1</kbd>〜<kbd>8</kbd> でポン出しする別窓の操作卓です。秒や小節での自動送り、手札の保存（A〜H）、JSON での持ち運びもできます。Deck 窓では音声解析も描画ループも起動しないので、マイクの許可も常時の GPU 負荷もありません。",
    "live.midi.t": "MIDI",
    "live.midi.d":
      "Deck は Web MIDI を受けます。nanoPAD2 は Native モードで自動マップ、ほかのコントローラは learn で割り当て。Deck が背面にあっても反応します。",
    "live.deckAlt": "Scene Deck 窓。8 つのスロットにサムネイルが並ぶ",
    "live.deckCap": "BPM 121 でロックし、8 スロットのサムネイルが並んだところ。",
    "live.overlayAlt": "背景を透過にしたフレーム",
    "live.obs.t": "OBS にそのまま重ねる",
    "live.obs.d":
      "<code>?bg=transparent&amp;ui=hide</code> を付けて OBS のブラウザソースに入れると、背景は透過のまま出力されます。<code>?mirror=1</code> の表示専用窓を足せば、複数の画面に同じ映像を出せます。",
    "live.bgLabel": "背景",
    "live.bg.checker": "市松",
    "live.bg.paper": "白",
    "live.bg.stage": "青",
    "ai.title": "演出を AI に任せる",
    "ai.body":
      "中継（ローカルの bridge か、Cloudflare Workers の room）越しに、CLI からパネルと同じ操作ができます。Claude Code 用のスキル vj-director を同梱しているので、「サビで青く静かに」と頼めば、気分語から Patch を合成して小節単位で予約するところまで、AI が CLI を叩いて進めます。",
    "ai.gen": "気分語から Patch を合成する",
    "ai.tweak": "いまの Patch の一部だけ差し替える",
    "ai.recipe": "ムードと seed と差分を JSON で持ち回る",
    "ai.set": "セットを cue として仕込み、本番で順に出す",
    "ai.preview": "Patch を PNG に描いて、送る前に確かめる",
    "ai.termLabel": "CLI の例",
    "ai.c1": "# room を作り、返ってきた pageUrl をブラウザで開く",
    "ai.c2": "# 気分語から Patch を合成して送る",
    "ai.c3": "# 8 小節後に、ゆっくり別の seed へ",
    "start.title": "3 ステップで始める",
    "start.s1.t": "アプリを開く",
    "start.s1.d":
      '<a href="https://seedshade.tainakanchu.com">seedshade.tainakanchu.com</a> を WebGL2 が使えるブラウザで開きます。インストールは要りません。',
    "start.s2.t": "マイクを許可する",
    "start.s2.d":
      "許可すると、すぐに音へ反応し始めます。流している曲に反応させたいときは、Input device でループバックを選びます。始まらなければパネルの「Click to start audio」を押してください。",
    "start.s3.t": "R を押す",
    "start.s3.d":
      "気に入る画が出るまで引き直します。<kbd>H</kbd> でパネルを隠し、<kbd>F</kbd> でフルスクリーン、<kbd>S</kbd> で Scene Deck。",
    "req.title": "動作環境",
    "req.webgl": "WebGL2 が使えるブラウザ。使えない環境では何も描画されません。",
    "req.audio":
      "マイク、またはループバック デバイス（Windows は VB-CABLE、macOS は BlackHole、Linux は PipeWire / PulseAudio の Monitor）。",
    "req.midi": "MIDI を使うなら Chrome か Edge。Firefox はアドオンが必要で、Safari は非対応です。",
    "req.local": "音声の解析はブラウザの中だけで行われ、音はどこにも送られません。",
    "footer.built": "React と素の WebGL2 で作っています。",
  },

  en: {
    "meta.title": "Seedshade — an audio-reactive VJ tool that synthesizes GLSL from a seed",
    "meta.desc":
      "Seedshade turns a seed string into a GLSL shader and plays it to your music, right in the browser. 127 generators, beat and BPM detection, transparent output for OBS, a Scene Deck with MIDI, and remote control for AI directors.",
    "nav.skip": "Skip to content",
    "nav.menu": "Menu",
    "nav.how": "How it works",
    "nav.gallery": "Gallery",
    "nav.live": "Live use",
    "nav.ai": "AI direction",
    "nav.docs": "Docs",
    "cta.open": "Open the app",
    "cta.docs": "Read the docs",
    "hero.lead":
      "Seedshade turns a seed string into a GLSL shader and plays it to your music. A VJ tool that runs entirely in the browser.",
    "hero.reroll": "Reroll",
    "hero.note": "This background is the app's caustics generator, ported to run on this page.",
    "how.title": "From a seed to a single shader",
    "how.body":
      "Type a seed and Seedshade deterministically picks a combination from 127 generators, then assembles them into one fragment shader. The same seed always gives the same look, so a seed string is all you need to keep a look you like.",
    "how.s1": "Enter a seed",
    "how.s2": "Pick and stack generators",
    "how.s3": "Assemble the GLSL",
    "how.s3body":
      "The chosen generators' code becomes one fragment shader, with the audio analysis fed in as uniforms.",
    "how.s4": "Draw it to the music",
    "how.alt": "A frame from seed iris-engine-404",
    "how.cat.source": "Makes shapes: lines, lattices, particles, SDF solids, spectra.",
    "how.cat.field": "Fields that spread across the plane, like noise and flow.",
    "how.cat.modifier": "Bends coordinates: mirrors, kaleidoscopes, slips, vortices.",
    "how.cat.material": "The final surface: CRT, risograph, halftone, gold foil.",
    "gallery.title": "Same engine, different seeds",
    "gallery.body":
      "Every frame here was captured from the app after typing in a seed. Captions show the seed and the generators it picked.",
    "gallery.sheetTitle": "All 127 generators in the catalog",
    "gallery.sheetBody":
      "Exported with <code>pnpm vj:preview --contact-sheet</code>. Each generator is drawn on its own with default parameters. Pick by eye here before you build a patch.",
    "gallery.sheetOpen": "Open full size",
    "gallery.sheetAlt": "Contact sheet with each of the 127 generators drawn on its own",
    "features.title": "It listens, and the picture changes",
    "f.gacha.t": "Look gacha",
    "f.gacha.d":
      "Press <kbd>R</kbd> to reroll the seed: palette, composition and the set of generators all change together, with a crossfade. Press <kbd>D</kbd> to keep the structure and reroll only the details.",
    "f.audio.t": "Audio reactivity",
    "f.audio.d":
      "Analyzes a mic, line-in or loopback device. Bass, mid and treble drive patch parameters, and each patch gets its own set of beat-triggered glitches. In silence the motion nearly stops, and loud music never leaves the screen sunk in black.",
    "f.tempo.t": "Tempo sync",
    "f.tempo.d":
      "Estimates BPM from low-end onsets and builds a beat grid that keeps ticking through breakdowns. Tap in a tempo by hand if you prefer. Auto-gacha every N bars follows the beat.",
    "f.textures.t": "Spectrum and waveform",
    "f.textures.d":
      "A 128-band spectrum and a 256-sample waveform go to the GPU, where generators like <code>spectrumBars</code>, <code>oscilloscope</code> and <code>lissajousScope</code> read them directly.",
    "f.timeline.t": "Timeline",
    "f.timeline.d":
      "Schedule seed changes and transitions N seconds or N bars ahead. Record a performance, export it as JSON and replay it later.",
    "f.images.t": "Bring your own images",
    "f.images.d": "Drop a PNG, JPG, WebP or SVG onto the page and patches can sample it.",
    "f.perf.t": "1080p on integrated graphics",
    "f.perf.d":
      "Built for a laptop's integrated GPU. When frames get heavy, the internal resolution steps down to hold the frame rate, and steps back up when there is headroom.",
    "live.title": "At the booth",
    "live.body":
      "Put the main window in fullscreen with <code>?ui=hide</code> and send it to the projector. Control it from a second window at hand.",
    "live.mainAlt": "Seedshade main view with the control panel on the left and the Timeline panel on the right",
    "live.main.t": "Main window",
    "live.mainCap":
      "Control panel on the left, Timeline on the right. Panels fade out when the mouse stops; H hides them.",
    "live.deck.t": "Scene Deck",
    "live.deck.d":
      "A separate control window that builds eight variations of the current patch and fires them with <kbd>1</kbd>–<kbd>8</kbd>. It can auto-advance by seconds or bars, save hands to slots A–H, and carry them as JSON. The Deck window starts no audio analysis and no render loop, so it asks for no mic and adds no constant GPU load.",
    "live.midi.t": "MIDI",
    "live.midi.d":
      "The Deck listens to Web MIDI. A nanoPAD2 maps itself in Native mode; any other controller can be assigned with learn. It responds even while the Deck is in the background.",
    "live.deckAlt": "Scene Deck window with thumbnails in eight slots",
    "live.deckCap": "Locked at 121 BPM, with all eight slot thumbnails rendered.",
    "live.overlayAlt": "A frame rendered with a transparent background",
    "live.obs.t": "Straight into OBS",
    "live.obs.d":
      "Add <code>?bg=transparent&amp;ui=hide</code> and load it as an OBS browser source: the background stays transparent. Add display-only windows with <code>?mirror=1</code> to show the same picture on several screens.",
    "live.bgLabel": "Backdrop",
    "live.bg.checker": "Checker",
    "live.bg.paper": "White",
    "live.bg.stage": "Blue",
    "ai.title": "Let an AI direct the visuals",
    "ai.body":
      "Through a relay (a local bridge or a Cloudflare Workers room), a CLI can do everything the panel does. The repo ships a Claude Code skill, vj-director: ask for \"quiet and blue for the chorus\" and the AI runs the CLI to synthesize a patch from mood words and schedule it on the bar.",
    "ai.gen": "Synthesize a patch from mood words",
    "ai.tweak": "Swap out part of the current patch",
    "ai.recipe": "Carry mood, seed and tweaks as JSON",
    "ai.set": "Load a set as cues and fire them during the show",
    "ai.preview": "Render a patch to PNG to check it before sending",
    "ai.termLabel": "CLI example",
    "ai.c1": "# create a room, then open the returned pageUrl in a browser",
    "ai.c2": "# synthesize a patch from mood words and send it",
    "ai.c3": "# in 8 bars, ease into another seed",
    "start.title": "Start in three steps",
    "start.s1.t": "Open the app",
    "start.s1.d":
      'Open <a href="https://seedshade.tainakanchu.com">seedshade.tainakanchu.com</a> in a browser with WebGL2. Nothing to install.',
    "start.s2.t": "Allow the microphone",
    "start.s2.d":
      "Once allowed, it starts reacting right away. To react to the music you are playing, choose a loopback device under Input device. If nothing starts, press \"Click to start audio\" in the panel.",
    "start.s3.t": "Press R",
    "start.s3.d":
      "Reroll until you like what you see. <kbd>H</kbd> hides the panel, <kbd>F</kbd> goes fullscreen, <kbd>S</kbd> opens the Scene Deck.",
    "req.title": "Requirements",
    "req.webgl": "A browser with WebGL2. Without it, nothing is drawn.",
    "req.audio":
      "A microphone or a loopback device (VB-CABLE on Windows, BlackHole on macOS, a PipeWire / PulseAudio Monitor on Linux).",
    "req.midi": "For MIDI, Chrome or Edge. Firefox needs an add-on; Safari is not supported.",
    "req.local": "Audio is analyzed inside the browser and never sent anywhere.",
    "footer.built": "Made with React and plain WebGL2.",
  },

  "zh-Hant": {
    "meta.title": "Seedshade — 從 seed 合成 GLSL、隨音樂反應的 VJ 工具",
    "meta.desc":
      "Seedshade 從一串 seed 合成 GLSL 著色器，隨著音樂即時繪製，只用瀏覽器就能運作。127 種 Generator、節拍與 BPM 偵測、給 OBS 用的透明背景、Scene Deck 與 MIDI，也能讓 AI 遠端操控演出。",
    "nav.skip": "跳到主要內容",
    "nav.menu": "選單",
    "nav.how": "運作方式",
    "nav.gallery": "作品",
    "nav.live": "現場使用",
    "nav.ai": "AI 操控",
    "nav.docs": "使用說明",
    "cta.open": "開啟 App",
    "cta.docs": "閱讀使用說明",
    "hero.lead": "從一串 seed 合成 GLSL 著色器，隨著音樂即時繪製。只用瀏覽器就能運作的 VJ 工具。",
    "hero.reroll": "重抽",
    "hero.note": "這個背景是把 App 的 caustics Generator 移植到本頁執行。",
    "how.title": "從 seed 到一支著色器",
    "how.body":
      "輸入 seed 後，會從 127 種 Generator 中以決定性的方式選出組合，組成一支片段著色器。同一個 seed 永遠得到同樣的畫面，喜歡的畫面只要記下 seed 字串就能重現。",
    "how.s1": "輸入 seed",
    "how.s2": "挑選並疊加 Generator",
    "how.s3": "組成 GLSL",
    "how.s3body": "把選中的 Generator 程式碼合併成一支片段著色器，再以 uniform 傳入音訊分析值。",
    "how.s4": "隨音樂繪製",
    "how.alt": "seed iris-engine-404 的畫面",
    "how.cat.source": "產生形狀：線條、格子、粒子、SDF 立體、頻譜。",
    "how.cat.field": "在平面上擴散的場，例如雜訊與流動。",
    "how.cat.modifier": "彎曲座標：鏡像、萬花筒、錯位、漩渦。",
    "how.cat.material": "最後的質感：CRT、孔版印刷、網點、金箔。",
    "gallery.title": "同一個引擎，不同的 seed",
    "gallery.body": "每一張都是在 App 中輸入 seed 後擷取的畫面。說明文字是 seed 與它選出的 Generator。",
    "gallery.sheetTitle": "目錄中的 127 種 Generator",
    "gallery.sheetBody":
      "以 <code>pnpm vj:preview --contact-sheet</code> 輸出的一覽。每個 Generator 都以預設參數單獨繪製。組 Patch 之前，先在這裡用眼睛挑選。",
    "gallery.sheetOpen": "開啟原尺寸",
    "gallery.sheetAlt": "127 種 Generator 各自單獨繪製的縮圖總表",
    "features.title": "聽著聲音，畫面跟著變",
    "f.gacha.t": "look gacha",
    "f.gacha.d":
      "按 <kbd>R</kbd> 重抽 seed，配色、構圖到 Generator 的組合會一起改變，並以交叉淡化切換。按 <kbd>D</kbd> 則保留結構、只重抽細節。",
    "f.audio.t": "聲音反應",
    "f.audio.d":
      "分析麥克風、線路輸入或 loopback 裝置。bass / mid / treble 驅動 Patch 的參數，每個 Patch 在節拍上觸發的故障效果各不相同。無聲時幾乎靜止，音量再大也不會讓畫面一直沉到全黑。",
    "f.tempo.t": "節奏同步",
    "f.tempo.d":
      "從低頻起音推估 BPM 並建立節拍格線，breakdown 期間也持續走拍，也可以用 TAP 手動指定。每 N 小節的自動抽選也會對齊節拍。",
    "f.textures.t": "頻譜與波形",
    "f.textures.d":
      "把 128 頻段的頻譜與 256 取樣的波形送進 GPU，<code>spectrumBars</code>、<code>oscilloscope</code>、<code>lissajousScope</code> 等 Generator 會直接讀取。",
    "f.timeline.t": "Timeline",
    "f.timeline.d": "可以預約 N 秒後、N 小節後的 seed 變更與轉場。也能錄下演出、輸出成 JSON，之後再重播。",
    "f.images.t": "使用自己的圖片",
    "f.images.d": "把 PNG / JPG / WebP / SVG 拖進頁面，就能當作 Patch 讀取的圖片。",
    "f.perf.t": "內顯也能跑 1080p",
    "f.perf.d": "以筆電內建 GPU 長時間使用為前提。負載變重時會逐步降低內部解析度以維持影格率，有餘裕時再恢復。",
    "live.title": "在現場的控台",
    "live.body": "主視窗加上 <code>?ui=hide</code> 全螢幕輸出到投影機，操作則交給手邊的另一個視窗。",
    "live.mainAlt": "Seedshade 主畫面，左邊是控制面板，右邊是 Timeline 面板",
    "live.main.t": "主視窗",
    "live.mainCap": "左邊是控制面板，右邊是 Timeline。滑鼠停住後面板會淡出，按 H 可隱藏。",
    "live.deck.t": "Scene Deck",
    "live.deck.d":
      "獨立視窗的操作台：從目前的 Patch 產生 8 個變化，用 <kbd>1</kbd>〜<kbd>8</kbd> 即時切換。可依秒數或小節自動前進、把手牌存到 A〜H，也能以 JSON 帶著走。Deck 視窗不啟動音訊分析也不跑繪製迴圈，所以不需要麥克風權限，也沒有常駐的 GPU 負載。",
    "live.midi.t": "MIDI",
    "live.midi.d":
      "Deck 接收 Web MIDI。nanoPAD2 會以 Native 模式自動對應，其他控制器可用 learn 指派。Deck 在背景時也會反應。",
    "live.deckAlt": "Scene Deck 視窗，8 個欄位排列著縮圖",
    "live.deckCap": "鎖定在 BPM 121，8 個欄位的縮圖都已產生。",
    "live.overlayAlt": "以透明背景輸出的畫面",
    "live.obs.t": "直接疊進 OBS",
    "live.obs.d":
      "加上 <code>?bg=transparent&amp;ui=hide</code> 放進 OBS 的瀏覽器來源，背景會維持透明輸出。再加開 <code>?mirror=1</code> 的僅顯示視窗，就能在多個螢幕上播放同樣的畫面。",
    "live.bgLabel": "背景",
    "live.bg.checker": "棋盤格",
    "live.bg.paper": "白",
    "live.bg.stage": "藍",
    "ai.title": "把演出交給 AI",
    "ai.body":
      "透過中繼（本機的 bridge，或 Cloudflare Workers 的 room），CLI 能做到和面板相同的操作。專案內附 Claude Code 技能 vj-director，只要說「副歌時安靜一點、偏藍」，AI 就會執行 CLI，從氛圍詞合成 Patch 並以小節為單位預約。",
    "ai.gen": "從氛圍詞合成 Patch",
    "ai.tweak": "只替換目前 Patch 的一部分",
    "ai.recipe": "以 JSON 保存氛圍、seed 與差異",
    "ai.set": "把整套演出設成 cue，現場依序送出",
    "ai.preview": "把 Patch 繪成 PNG，送出前先確認",
    "ai.termLabel": "CLI 範例",
    "ai.c1": "# 建立 room，在瀏覽器開啟回傳的 pageUrl",
    "ai.c2": "# 從氛圍詞合成 Patch 並送出",
    "ai.c3": "# 8 小節後，緩緩換到另一個 seed",
    "start.title": "三個步驟開始",
    "start.s1.t": "開啟 App",
    "start.s1.d":
      '用支援 WebGL2 的瀏覽器開啟 <a href="https://seedshade.tainakanchu.com">seedshade.tainakanchu.com</a>，不需要安裝。',
    "start.s2.t": "允許麥克風",
    "start.s2.d":
      "允許後會立刻開始對聲音反應。想讓它跟著正在播放的音樂反應，就在 Input device 選擇 loopback 裝置。沒有開始的話，請按面板上的「Click to start audio」。",
    "start.s3.t": "按 R",
    "start.s3.d": "重抽到喜歡的畫面為止。<kbd>H</kbd> 隱藏面板，<kbd>F</kbd> 全螢幕，<kbd>S</kbd> 開啟 Scene Deck。",
    "req.title": "執行環境",
    "req.webgl": "支援 WebGL2 的瀏覽器。不支援時不會繪製任何畫面。",
    "req.audio":
      "麥克風或 loopback 裝置（Windows 用 VB-CABLE，macOS 用 BlackHole，Linux 用 PipeWire / PulseAudio 的 Monitor）。",
    "req.midi": "使用 MIDI 請用 Chrome 或 Edge。Firefox 需要附加元件，Safari 不支援。",
    "req.local": "音訊只在瀏覽器內分析，不會傳送到任何地方。",
    "footer.built": "以 React 與原生 WebGL2 製作。",
  },
};

const SUPPORTED = ["ja", "en", "zh-Hant"];
const STORAGE_KEY = "seedshade-lp-lang";

function storageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode etc. */
  }
}

function detectLang() {
  const saved = storageGet(STORAGE_KEY);
  if (saved && SUPPORTED.includes(saved)) return saved;
  const nav = (navigator.language || "ja").toLowerCase();
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("zh")) return "zh-Hant";
  return "en";
}

function applyLang(lang) {
  if (!SUPPORTED.includes(lang)) lang = "en";
  const dict = I18N[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const val = dict[el.getAttribute("data-i18n")];
    if (val !== undefined) el.textContent = val;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const val = dict[el.getAttribute("data-i18n-html")];
    if (val !== undefined) el.innerHTML = val;
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
    const val = dict[el.getAttribute("data-i18n-alt")];
    if (val !== undefined) el.setAttribute("alt", val);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const val = dict[el.getAttribute("data-i18n-aria")];
    if (val !== undefined) el.setAttribute("aria-label", val);
  });
  document.title = dict["meta.title"];
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", dict["meta.desc"]);
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    const active = btn.getAttribute("data-lang") === lang;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  storageSet(STORAGE_KEY, lang);
}

/* ============================================================
   Hero shader: port of src/synth/generators/caustics.ts
   ============================================================ */
const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// The caustics body is copied from the generator; synthRand() offsets become
// uOff, and the palette / beat layer stands in for the app's material stack
// and its common audio layer (5% zoom + 15% lift on the beat).
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uBeat;
uniform vec2 uOff;
uniform float uScale;
uniform float uSharp;
uniform float uMirror;
uniform vec3 uColA;
uniform vec3 uColB;
out vec4 outColor;

float caustics(vec2 p) {
  float sc = clamp(uScale, 0.8, 8.0);
  float spd = 0.5;
  float sharp = clamp(uSharp, 2.0, 14.0);
  float ox = uOff.x;
  float oy = uOff.y;
  vec2 q = p * sc * 2.2 + vec2(ox, oy) - 250.0;
  float t = uTime * spd * 0.6 + 23.0;
  q += 1.1 * vec2(sin(p.y * 2.1 + t * 0.21 + ox), sin(p.x * 1.7 - t * 0.17 + oy));
  vec2 i = q;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 5; n++) {
    float tt = t * (1.0 - 3.5 / float(n + 1));
    i = q + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    float sx = sin(i.x + tt);
    float cy = cos(i.y + tt);
    vec2 e = vec2(q.x * inten / (abs(sx) + 1e-4), q.y * inten / (abs(cy) + 1e-4));
    c += 1.0 / max(length(e), 1e-4);
  }
  c /= 5.0;
  c = 1.17 - pow(max(c, 0.0), 1.4);
  float v = pow(clamp(abs(c), 0.0, 1.0), sharp);
  return clamp(v, 0.0, 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  uv *= 1.0 - 0.05 * uBeat;
  if (uMirror > 0.5) uv.x = abs(uv.x);
  float v = caustics(uv * 0.55);
  float glow = smoothstep(0.0, 0.9, v);
  vec3 col = uColA * glow + uColB * pow(v, 3.0) * 1.2;
  col *= 1.0 + 0.15 * uBeat;
  // Soft-clamp: keep the hue and cap the brightness so the hero never blows
  // out to a large near-white area (the nav and type sit on top of it).
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float capped = 0.62 * (1.0 - exp(-lum * 1.6)) / 0.8;
  col *= capped / max(lum, 1e-4);
  col = min(col, vec3(0.78));
  outColor = vec4(col, 1.0);
}
`;

// Palettes picked from colors the app produced in the gallery captures.
const PALETTES = [
  [[1.0, 0.62, 0.22], [1.0, 0.93, 0.75]], // sodium
  [[0.33, 0.93, 1.0], [0.85, 1.0, 1.0]], // phosphor
  [[1.0, 0.24, 0.16], [1.0, 0.78, 0.6]], // brake light
  [[0.62, 0.38, 1.0], [0.95, 0.82, 1.0]], // uv
  [[0.55, 1.0, 0.45], [0.92, 1.0, 0.8]], // phosphor green
  [[1.0, 0.45, 0.72], [1.0, 0.88, 0.95]], // pink
];

function hashString(s) {
  // FNV-1a
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Page-local seeds are short hex strings so they are not mistaken for app
// seeds (an app seed picks a whole patch, not just caustics parameters).
function randomSeed() {
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
}
function lookFromSeed(seed) {
  const rnd = mulberry(hashString(seed));
  const pal = PALETTES[Math.floor(rnd() * PALETTES.length)];
  return {
    off: [rnd() * 40, rnd() * 40],
    scale: 2.6 + rnd() * 2.6,
    sharp: 3.2 + rnd() * 3.0,
    mirror: rnd() < 0.4 ? 1 : 0,
    colA: pal[0],
    colB: pal[1],
  };
}

function initHero() {
  const hero = document.querySelector(".hero");
  const canvas = document.querySelector(".hero-canvas");
  const seedEl = document.querySelector(".readout-seed");
  const rerollBtn = document.querySelector(".reroll");
  if (!hero || !canvas) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let gl = null;
  try {
    gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
  } catch {
    gl = null;
  }

  let seed = "5eed5a";
  let target = lookFromSeed(seed);
  let from = target;
  let morphStart = -1;
  const MORPH_MS = 900;

  const showSeed = () => {
    if (seedEl) seedEl.textContent = `caustics #${seed}`;
  };
  showSeed();

  if (!gl) {
    // Static fallback image stays visible; hide the reroll control.
    if (rerollBtn) rerollBtn.hidden = true;
    if (seedEl) seedEl.hidden = true;
    return;
  }

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed");
    }
    return sh;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link failed");
  } catch {
    if (rerollBtn) rerollBtn.hidden = true;
    if (seedEl) seedEl.hidden = true;
    return;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ["uRes", "uTime", "uBeat", "uOff", "uScale", "uSharp", "uMirror", "uColA", "uColB"].forEach((n) => {
    U[n] = gl.getUniformLocation(prog, n);
  });

  // Render below native resolution: the field is soft, and this keeps the
  // page light on integrated GPUs.
  const resize = () => {
    const scale = 0.6;
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // Synthetic audio: 124 BPM kick envelope and a slow level swell. As in the
  // app, time advances faster when the "music" is louder.
  const BPM = 124;
  let simTime = 7.0;
  let last = performance.now();
  let beatClock = 0;

  const draw = (now, animate) => {
    resize();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let beat = 0;
    if (animate) {
      beatClock += dt;
      const level = 0.65 + 0.35 * Math.sin(beatClock * 0.21);
      simTime += dt * (0.35 + 0.65 * level);
      const phase = (beatClock * BPM) / 60 % 1;
      beat = Math.exp(-phase * 6.5) * level;
    }
    let k = 1;
    if (morphStart >= 0) {
      k = Math.min(1, (now - morphStart) / MORPH_MS);
      k = k * k * (3 - 2 * k);
      if (k >= 1) morphStart = -1;
    }
    const off = [lerp(from.off[0], target.off[0], k), lerp(from.off[1], target.off[1], k)];
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, simTime);
    gl.uniform1f(U.uBeat, beat);
    gl.uniform2f(U.uOff, off[0], off[1]);
    gl.uniform1f(U.uScale, lerp(from.scale, target.scale, k));
    gl.uniform1f(U.uSharp, lerp(from.sharp, target.sharp, k));
    gl.uniform1f(U.uMirror, k < 0.5 ? from.mirror : target.mirror);
    gl.uniform3fv(U.uColA, lerp3(from.colA, target.colA, k));
    gl.uniform3fv(U.uColB, lerp3(from.colB, target.colB, k));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  let raf = 0;
  let visible = true;
  const loop = (now) => {
    raf = 0;
    draw(now, true);
    schedule();
  };
  const schedule = () => {
    if (raf || reduce.matches || !visible || document.hidden) return;
    raf = requestAnimationFrame(loop);
  };
  const drawStill = () => {
    // Reduced motion: one frame, no loop. Morphs jump straight to the target.
    morphStart = -1;
    from = target;
    last = performance.now();
    draw(last, false);
  };

  const reroll = () => {
    from = target;
    seed = randomSeed();
    target = lookFromSeed(seed);
    showSeed();
    if (reduce.matches) {
      drawStill();
    } else {
      morphStart = performance.now();
      schedule();
    }
  };

  if (rerollBtn) rerollBtn.addEventListener("click", reroll);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "r" && e.key !== "R") return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    reroll();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) {
        last = performance.now();
        schedule();
      }
    }).observe(hero);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      last = performance.now();
      schedule();
    }
  });
  reduce.addEventListener?.("change", () => {
    if (reduce.matches) drawStill();
    else {
      last = performance.now();
      schedule();
    }
  });
  window.addEventListener("resize", () => {
    if (reduce.matches) drawStill();
  });

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    hero.classList.remove("is-live");
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  });

  hero.classList.add("is-live");
  if (reduce.matches) drawStill();
  else schedule();
}

/* ============================================================
   Overlay backdrop toggle
   ============================================================ */
function initBackdrops() {
  const stage = document.querySelector(".overlay-stage");
  const buttons = document.querySelectorAll(".backdrops button[data-backdrop]");
  if (!stage) return;
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-backdrop");
      stage.setAttribute("data-backdrop", v);
      buttons.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
    });
  });
}

/* ============================================================
   Init
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  applyLang(detectLang());
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => applyLang(btn.getAttribute("data-lang")));
  });

  const nav = document.querySelector(".nav");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks && nav) {
    const setOpen = (open) => {
      navLinks.classList.toggle("is-open", open);
      nav.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    };
    navToggle.addEventListener("click", () => setOpen(!navLinks.classList.contains("is-open")));
    navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  initHero();
  initBackdrops();
});
