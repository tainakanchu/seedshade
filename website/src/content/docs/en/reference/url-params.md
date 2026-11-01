---
title: URL parameters
description: A list of the parameters that set startup configuration through the URL.
---

You can specify startup settings in the form `?key=value&key2=value2`.
**Values specified in the URL take priority over the settings saved in the browser** (default < saved settings < URL).
The specified values are saved as they are, so they carry over the next time you open without the URL (`ui` / `room` / `bridge` / `mirror` / `deck` are not saved).

## Look and audio

| Parameter | Value | Details |
| --- | --- | --- |
| `seed` | String (up to 64 characters) | The seed. Example: `seed=neon-tiger-042` |
| `bg` | `black` / `transparent` | Background |
| `ui` | `hide` | Hide the panels from the start (`H` brings them back) |
| `gain` | 0.5 to 4 | Input gain (out-of-range values are clamped) |
| `hue` | 0 to 360 | Fix the hue (when given, Hue becomes `Fixed`) |
| `autogacha` | `1` / `true` | Turn on auto-gacha every N bars (any other value is OFF) |
| `gachabars` | 1 to 512 | Auto-gacha interval (bars) |
| `device` | Device ID | Specify the audio input device |

## Window type and connection

| Parameter | Value | Details |
| --- | --- | --- |
| `deck` | `1` / `true` | Open as the Scene Deck window. Audio input and rendering are not started. → [Scene Deck](../../live/scene-deck/) |
| `room` | room id (8 to 64 characters of alphanumerics, `_`, `-`) | Connect to the hosted version's Worker relay (`/room/<id>`). → [Remote control](../../live/remote/) |
| `bridge` | `1` / `true` / no value / port number (2 to 65535) | Connect to the local relay (`ws://127.0.0.1:<port>`, default 7877). Local version only |
| `mirror` | `1` / `true` | Use together with `room` / `bridge` to connect as a display-only (mirror) screen |

- If both `room` and `bridge` are given, `room` takes priority.
- If the form of the `room` / `bridge` value is invalid, it connects nowhere (to prevent joining a different room by a typo).
- If neither `room` nor `bridge` is given, no network connection is made at all.

## Examples

```text
# For OBS: transparent background, hidden panels, gain 2
https://seedshade.tainakanchu.com/?bg=transparent&ui=hide&gain=2

# Lock the look and auto-gacha every 32 bars
https://seedshade.tainakanchu.com/?seed=neon-tiger-042&autogacha=1&gachabars=32

# Fix the hue at 200°
https://seedshade.tainakanchu.com/?hue=200

# A main controlled via room + a display-only sub screen
https://seedshade.tainakanchu.com/?room=<id>&ui=hide
https://seedshade.tainakanchu.com/?room=<id>&mirror=1&ui=hide

# Open the local version connected to the local relay
https://localhost:5173/?bridge=1
```

:::tip[Finding a device ID]
The ID you put in `device` is a string assigned by the browser, and it is not shown in the panel.
Normally, do not specify it in the URL; choose it under **Input device** in the panel instead (the selected device is saved).
:::
