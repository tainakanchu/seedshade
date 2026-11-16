/**
 * 共有 GLSL プリリュード。
 *
 * RNG_GLSL は全 Patch に無条件で注入される（どの Generator も使いうるので）。
 * プリリュードはその逆で opt-in: InlineGenerator が `preludes` にキーを宣言した
 * ときだけ、assembler が Generator 関数群の前に一度だけ出力する。宣言しない
 * Patch のシェーダは 1 バイトも変わらない。
 *
 * 未知のキーは throw する。サイレントに無視すると、タイプミスした Generator が
 * 「なぜかリンクエラーになる Patch」として本番で初めて発覚することになる。
 */

/**
 * 3D SDF のプリミティブと演算子。レイマーチする source が共有する。
 *
 * **純粋関数のみ**。scene の `map()` に依存するもの（march ループ・法線推定）は
 * ここに置けない: GLSL に関数ポインタが無く、map は Generator ごとに違うため。
 * 各 Generator が自分の `<fnName>_map` と march ループを書く。ハードサーフェス /
 * フォグ蓄積の使い分けができるので、むしろ都合がよい。
 *
 * 命名は `sd3*` / `op3*` / `rot2`。GLSL ES 3.00 の予約語（`half` など）や
 * 既存の Generator 関数名と衝突しないこと。
 */
const SDF3D_GLSL = /* glsl */ `
// ---- prelude: sdf3d (primitives + operators, pure functions only) ----
float sd3Sphere(vec3 p, float r) {
  return length(p) - r;
}

float sd3Box(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// ring in the xz plane; p.y is the axis
float sd3Torus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float sd3Capsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a;
  vec3 ba = b - a;
  float seg = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * seg) - r;
}

float sd3Plane(vec3 p, vec3 n, float h) {
  return dot(p, normalize(n)) + h;
}

float op3SmoothUnion(float a, float b, float k) {
  float kk = max(k, 1e-4);
  float t = clamp(0.5 + 0.5 * (b - a) / kk, 0.0, 1.0);
  return mix(b, a, t) - kk * t * (1.0 - t);
}

// carve b out of a
float op3SmoothSubtract(float a, float b, float k) {
  float kk = max(k, 1e-4);
  float t = clamp(0.5 - 0.5 * (a + b) / kk, 0.0, 1.0);
  return mix(a, -b, t) + kk * t * (1.0 - t);
}

// infinite domain repetition; axes whose cell size is <= 0 are left untouched
vec3 op3Rep(vec3 p, vec3 c) {
  vec3 safe = max(c, vec3(1e-3));
  vec3 q = mod(p + 0.5 * safe, safe) - 0.5 * safe;
  return mix(p, q, step(1e-3, c));
}

vec2 rot2(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}
`;

/**
 * 文字ノード（type / typeMask / typeWarp）が共有する配置と SDF 読み出し。
 *
 * テクスチャの中身の約束は `../texts.ts` の冒頭（R = SDF で 0.5 が輪郭、G = 文字
 * インデックス / 文字数、B = グリフ内の横位置、A = 1。未割り当ては透明ダミーで
 * A = 0）。配置は stamp と同じ p 空間の fit / scale の考え方だが、tile は
 * 「contain の大きさで敷き詰める」にしてある（横長の 1 行テキストを高さ 1 で
 * 敷くと画面からはみ出して 1 枚にしか見えないため）。
 *
 * uRes を読むので、ヘッダの uniform 宣言より後（= プリリュードの位置）に置く。
 */
const TYPE_LAYOUT_GLSL = /* glsl */ `
// ---- prelude: typeLayout (text-slot placement + SDF reads) ----
// fit: 0 = contain, 1 = cover, 2 = tile. Returns the uv into the text raster;
// mask = 1 inside the placed box (tile: everywhere), 0 outside.
vec2 typePlace(vec2 p, vec2 texSize, int fit, float scale, out float mask, out vec2 extent) {
  vec2 size = max(texSize, vec2(1.0));
  float imgAspect = size.x / size.y;
  float canvasAspect = uRes.x / max(uRes.y, 1.0);
  float h = (fit == 1) ? max(1.0, canvasAspect / imgAspect) : min(1.0, canvasAspect / imgAspect);
  h *= max(scale, 1e-3);
  extent = vec2(max(h * imgAspect, 1e-4), max(h, 1e-4));
  vec2 uv = p / extent + 0.5;
  if (fit == 2) {
    mask = 1.0;
    return fract(uv);
  }
  vec2 inside = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  mask = inside.x * inside.y;
  return uv;
}

// Coverage of the glyph shape for an SDF sample. weight (-1..1) moves the
// threshold (bolder / thinner), softness (0..1) widens the edge, outline (0..1)
// turns the fill into a band of that width around the threshold.
float typeCoverage(float sdf, float weight, float softness, float outline) {
  float th = 0.5 - clamp(weight, -1.0, 1.0) * 0.35;
  float aa = max(fwidth(sdf) * 0.75, 1e-4) + clamp(softness, 0.0, 1.0) * 0.25;
  float fill = smoothstep(th - aa, th + aa, sdf);
  float w = clamp(outline, 0.0, 1.0) * 0.3;
  float band = 1.0 - smoothstep(w - aa, w + aa, abs(sdf - th));
  // Crossfade instead of branching so a modulated outline never pops at 0.
  return mix(fill, band, smoothstep(0.0, 0.04, outline));
}
`;

/** キー → GLSL。Map なので get() が `string | undefined` になり、未知キーを型で拾える。 */
const PRELUDE_SOURCES: ReadonlyMap<string, string> = new Map([
  ['sdf3d', SDF3D_GLSL],
  ['typeLayout', TYPE_LAYOUT_GLSL],
]);

/** 登録済みプリリュードキー（宣言順）。 */
export function knownPreludeKeys(): string[] {
  return [...PRELUDE_SOURCES.keys()];
}

/**
 * キー列を重複排除して GLSL に展開する。
 *
 * 出力順は **最初に現れた順**（assembler は operator 配列順で渡す）なので、
 * 同じ Patch なら常に同じ文字列になる = fragSrc の決定性が保たれる。
 * 1 つも無ければ空文字列を返し、assembler は何も出力しない。
 */
export function resolvePreludes(keys: Iterable<string>): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    const src = PRELUDE_SOURCES.get(key);
    if (src === undefined) {
      throw new Error(
        `resolvePreludes: unknown prelude "${key}" (known: ${knownPreludeKeys().join(', ')})`,
      );
    }
    parts.push(src.trim());
  }
  return parts.join('\n\n');
}
