# Sound-effect credits

Every file in this folder is an original sound synthesized from scratch by
[`tools/make-sfx.mjs`](../../tools/make-sfx.mjs): no samples, no recordings, no third-party
material. Regenerate them with `node tools/make-sfx.mjs` (needs ffmpeg with libmp3lame); this
file is written by that tool.

- **Source:** `tools/make-sfx.mjs` in this repository (local synthesis; nothing downloaded)
- **Author:** The Farm project
- **Licence:** CC0 1.0 Universal public-domain dedication
  (<https://creativecommons.org/publicdomain/zero/1.0/>)

Format: mono MP3, 44100 Hz, 64k. Each file is trimmed, eased out at its tail and normalised so
the RMS of its loud part is -18 dBFS with peaks at or below -1 dBFS (levels.json).
The mix level of each cue lives in `src/audio/sfx.js`.

| File | Sound | Seconds | Bytes | Source | Author | Licence |
| --- | --- | ---: | ---: | --- | --- | --- |
| step-1.mp3 | footstep on earth and grass | 0.12 | 1461 | tools/make-sfx.mjs (`step-1`) | The Farm project | CC0 1.0 |
| step-2.mp3 | footstep on earth and grass | 0.12 | 1461 | tools/make-sfx.mjs (`step-2`) | The Farm project | CC0 1.0 |
| step-3.mp3 | footstep on earth and grass | 0.12 | 1461 | tools/make-sfx.mjs (`step-3`) | The Farm project | CC0 1.0 |
| step-4.mp3 | footstep on earth and grass | 0.12 | 1461 | tools/make-sfx.mjs (`step-4`) | The Farm project | CC0 1.0 |
| weed.mp3 | weeds pulled: leaf rustle and a soft uprooting tug | 0.37 | 3551 | tools/make-sfx.mjs (`weed`) | The Farm project | CC0 1.0 |
| tick.mp3 | gathering tick: a light woody tock | 0.09 | 1252 | tools/make-sfx.mjs (`tick`) | The Farm project | CC0 1.0 |
| pop.mp3 | pickup pop: a soft rounded pop | 0.10 | 1252 | tools/make-sfx.mjs (`pop`) | The Farm project | CC0 1.0 |
| full.mp3 | stack full: two muted wooden notes stepping down | 0.50 | 4596 | tools/make-sfx.mjs (`full`) | The Farm project | CC0 1.0 |
| land-wood.mp3 | a wood unit lands on a pile: hollow knock | 0.20 | 2088 | tools/make-sfx.mjs (`land-wood`) | The Farm project | CC0 1.0 |
| land-stone.mp3 | a stone unit lands on a pile: dry clack | 0.12 | 1461 | tools/make-sfx.mjs (`land-stone`) | The Farm project | CC0 1.0 |
| crack.mp3 | a dead branch snaps free in the tree: short dry crack | 0.31 | 2924 | tools/make-sfx.mjs (`crack`) | The Farm project | CC0 1.0 |
| thud.mp3 | the branch lands on the ground: soft woody thud | 0.30 | 2924 | tools/make-sfx.mjs (`thud`) | The Farm project | CC0 1.0 |
| coin-1.mp3 | a coin into the purse: small clink | 0.60 | 5223 | tools/make-sfx.mjs (`coin-1`) | The Farm project | CC0 1.0 |
| coin-2.mp3 | a coin into the purse: small clink | 0.60 | 5223 | tools/make-sfx.mjs (`coin-2`) | The Farm project | CC0 1.0 |
| confirm.mp3 | Confirm delivery: two marimba notes stepping up | 0.79 | 6895 | tools/make-sfx.mjs (`confirm`) | The Farm project | CC0 1.0 |
| complete.mp3 | building completes: a small kalimba arpeggio | 2.59 | 21314 | tools/make-sfx.mjs (`complete`) | The Farm project | CC0 1.0 |
| sell.mp3 | crop sold: a soft thud into the crate, then a small coin | 0.55 | 5014 | tools/make-sfx.mjs (`sell`) | The Farm project | CC0 1.0 |
| chirp-1.mp3 | bird chirp | 0.26 | 2715 | tools/make-sfx.mjs (`chirp-1`) | The Farm project | CC0 1.0 |
| chirp-2.mp3 | bird chirp | 0.39 | 3760 | tools/make-sfx.mjs (`chirp-2`) | The Farm project | CC0 1.0 |
| squawk.mp3 | theft squawk: a short throaty "kraa" | 0.30 | 2924 | tools/make-sfx.mjs (`squawk`) | The Farm project | CC0 1.0 |
| tap.mp3 | UI tap: the lightest woody tick | 0.05 | 834 | tools/make-sfx.mjs (`tap`) | The Farm project | CC0 1.0 |
| cue.mp3 | tutorial cue: one kalimba note with a quiet octave | 1.26 | 10656 | tools/make-sfx.mjs (`cue`) | The Farm project | CC0 1.0 |
| brush.mp3 | colour wash: one soft brush stroke across paper | 0.55 | 5014 | tools/make-sfx.mjs (`brush`) | The Farm project | CC0 1.0 |

Total: 95464 bytes in 23 files.
