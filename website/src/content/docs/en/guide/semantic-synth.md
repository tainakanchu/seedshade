---
title: How Semantic Synth works
description: The 4 Generator categories, how sound drives the visuals, and the audio-driven Generators ported from the old scenes.
---

All the visuals Seedshade draws come from a single engine called **Semantic Synth**.
Rather than switching between fixed rendering programs, it **assembles a GLSL shader from the seed every time** it draws.
This page explains the parts of the mechanism that are useful to know when operating it.

## Patches and Generators

One look is represented as a JSON document called a **VisualPatch** (a "Patch" below).
A Patch is a stack of **Generators**, the building blocks, layered from the bottom up. Generators fall into 4 categories.

| Category | Role | Count per Patch | Types |
| --- | --- | --- | --- |
| **Source** | Draws the base pattern or shape | 1 to 2 | 60 |
| **Field** | Bends or flows the coordinates (distortion, swell, lens, etc.) | 0 to 2 | 17 |
| **Modifier** | Processes color and tonality (threshold, gamma, etc.) | 1 to 3 | 23 |
| **Material** | Adds the final texture (light, highlights, material feel, etc.) | 1 | 27 |

That makes **127 types** in total. The stacking order is always Source → Field → Modifier → Material.
Drawing a seed decides the count and types within these ranges, along with each one's parameters, palette, and composition (symmetry count, scale, speed).

:::tip
The Generators currently in use are shown under **State** → `operators` in the Timeline panel (for example `qilouShutter › humidityLens › gamma › sodium`).
:::

To see what every Generator actually looks like in one place, the developer-oriented `vj:preview --contact-sheet` can render them into a single image ([vj:preview / vj:validate](../../dev/preview-validate/)).

## How sound drives the visuals

The audio analysis results (bass `bass`, mid `mid`, treble `treble`, volume `level`, beat `beat`, the bar phase, and so on) affect the visuals through the following 3 paths.

### 1. How fast time advances

Visual time does not advance at a constant rate; **its speed changes with how loud the sound is**.

- **It almost stops in silence** (about 5% of normal speed).
- It ramps up quickly when sound comes in, and decelerates slowly over a bit under a second after it stops.
- While BPM is locked, the overall speed varies between 0.7x and 1.25x with the tempo, and gets a small push forward at the top of each beat.

### 2. Modulation (routes inside the Patch)

A Patch contains routes that say "which audio value moves which parameter".
Routes generated automatically from a seed are built so that **louder sound only pushes toward "more visible / more motion"**.
By design, the screen will not keep getting darker in a club with sustained loud volume.

### 3. What happens on each beat

The whole screen gets beat-synced reactions (**audio reactions**).
For each Patch, 1 to 2 coordinate effects and 1 color effect are chosen from the Generator composition.
If you redraw the seed and the composition changes, what happens on the beat changes too. It does not change with 🧬 (redraw only the details).

| Coordinate effects | Details |
| --- | --- |
| `punchZoom` | The screen zooms in at the top of the beat |
| `sliceShift` | Horizontal bands shift sideways (a tape-skipping glitch) |
| `blockCrush` | Crushes into macroblocks on the beat |
| `jitter` | The picture jumps on the beat, and trembles finely with treble |
| `spinKick` | The rotation gets kicked on the beat |
| `waveTear` | Scanlines tear sideways and flow |
| `mirrorSnap` | Folds into a mirror image on the beat |
| `swellDrift` | The swell drifts sideways (like waves rolling in and out) |
| `setSurge` | Slowly pulls in and lifts with a long-period swell |

| Color effects | Details |
| --- | --- |
| `rgbSplit` | R/B shift sideways on the beat (a chromatic aberration glitch) |
| `echoGhost` | A slightly shrunken afterimage overlaps behind on the beat |
| `hueSlam` | The hue jumps on the beat |
| `posterCrush` | Tonality crushes into steps on the beat (bit crush) |
| `invertFlash` | Flashes to a negative for an instant, only on strong beats |
| `scanGlow` | A scan band flows and glows on the beat |
| `channelRoll` | RGB channels swap on strong beats |
| `crestGlow` | The crest of the swell slowly passes through and brightens |

- **In silence they stop having any effect entirely**, and the look returns to the Patch as it is.
- You can check the reactions on the current Patch with `reactions` in the CLI's `vj-ctl state` ([vj-ctl](../../ai/vj-ctl/)).

`swellDrift` / `setSurge` / `crestGlow` are driven not by the beat but by a long-period clock like an ocean swell, built from the audio energy. The swell arrives a little after a drop, and lingers after a breakdown.

## Generators that carry over the look of the old scenes

Earlier versions of Seedshade had fixed scenes such as spectrum bars and an oscilloscope.
They are now ported as Semantic Synth Generators (all Sources) and are part of the normal gacha pool.

| Generator | Look | How it reads sound |
| --- | --- | --- |
| `spectrumBars` | Spectrum bars (with peak hold) | Spectrum |
| `spectrumRadial` | Circular spectrum | Spectrum |
| `oscilloscope` | Oscilloscope (waveform) | Waveform |
| `lissajousScope` | X-Y Lissajous | Waveform |
| `beatRings` | Rings that expand on the beat (circle / polygon / arc) | Regular audio values |
| `particleField` | Particles (rising / orbiting / rain / starfield) | Regular audio values |
| `inkMarble` | Ink-marbling (the old Fluid) | Regular audio values |
| `smokeFog` | Smoke | Regular audio values |
| `auroraCurtain` | Aurora | Regular audio values |
| `lavaBlobs` | Lava lamp (the old Lava) | Regular audio values |

Generators that read the "spectrum" or "waveform" are sent a 128-band logarithmic spectrum (with smoothing and peak hold) and a 256-sample waveform every frame.
Patches that do not use them are sent nothing, so there is no extra load. In silence the spectrum is 0 and the waveform is flat.

:::note
Scene Deck thumbnails and test / preview rendering use a fixed synthetic signal that does not depend on time.
As a result, spectrum-type Generators look different in thumbnails than they do with real audio.
:::

In the CLI's `vj:gen`, you can call these with words such as "スペクトラム" (spectrum), "オシロ" (oscilloscope), "リサージュ" (Lissajous), "オーロラ" (aurora), "煙" (smoke), "パーティクル" (particles), "リング" (rings), and "マーブル" (marbling) ([vj:gen / vj:tweak](../../ai/gen-tweak/)).

## Images (stamps)

There is also a Generator called `stamp` that pastes in an image. It is **never chosen by seed gacha** (so that something like an event logo does not appear and disappear on its own).
When you want to use an image, add it yourself. → [Images in the Timeline panel](../timeline/#images-stamp-an-image)

## Load and image quality

- The canvas resolution caps the device pixel ratio (DPR) at 1.5 (to avoid overload on high-resolution displays).
- Frame time is monitored, and when it is heavy the **internal render resolution is lowered step by step automatically**, then restored when there is headroom again. The current scale is shown under **State** → `quality` in the Timeline panel (1.00 is native).
- It recovers automatically even if the WebGL context is lost.
- With a transparent background, the rendered output keeps its alpha as well (so it can be overlaid in OBS).
