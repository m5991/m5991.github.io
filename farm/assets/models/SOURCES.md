# Model and motion sources

Every visible model is authored in code in this repository (`tools/make-vanessa.mjs`,
`src/world/`). No kit or store model is visible. Motion comes from free CC0 libraries,
retargeted offline onto Vanessa's rig by `tools/retarget.mjs` and baked into `vanessa.glb`.

## Motion source

| | |
| --- | --- |
| Pack | KayKit Adventurers Character Pack 1.0, by Kay Lousberg |
| Repository | https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 |
| Commit | `672074b73ba276876a19e8816ecdc5241817ab47` |
| File | `addons/kaykit_character_pack_adventures/Characters/gltf/Rogue.glb` (sha256 `e825437cd4d2ee9c1960b517a74a69101e33eb409ae7fa8cedc7134a998fbb7d`) |
| Licence | CC0 1.0 (repository `LICENSE.txt`) |

The source file is not committed. To rebuild, download it to `.tmp/kaykit/Rogue.glb`:

```sh
mkdir -p .tmp/kaykit
curl -L -o .tmp/kaykit/Rogue.glb https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/672074b73ba276876a19e8816ecdc5241817ab47/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue.glb
npm run vanessa
```

## Clips in vanessa.glb

Feet are locked by leg IK while planted, so they do not slide: standing clips pin them to her
own stance, locomotion clips to a point moving back at the clip's ground speed, which the game
uses as the playback-rate reference (`src/world/mover.js`). Residual slide is measured on the
baked clip at playback rate 1 (`.tmp/vanessa-report.json` after a build).

| Clip | Source clip | Licence | Length | Ground speed | Planted-foot slide before → after (mean / max, m/s) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `V_Idle` | `Idle` | CC0 1.0 | 4.8 s | — | 0.009 / 0.014 → 0 / 0 | 55% amplitude, slowed 4.5×, arms brought to her sides (§10.2 relaxed 4–6 s loop) |
| `V_Walk` | `Walking_A` | CC0 1.0 | 0.82 s | 1.57 m/s | 1.31 / 3.71 → 0.03 / 0.21 | 1.3× speed, swing height 40%, hips 4.5 cm below rest |
| `V_Run` | `Running_A` | CC0 1.0 | 0.66 s | 5.0 m/s | 1.97 / 3.07 → 0 / 0 | 1.21× speed, stance re-paced to the 5 m/s run (P24-1), swing height 70% |
| `V_Gather` | `PickUp` | CC0 1.0 | 0.75 s | — | — (upper body only, over idle legs) | one reach per 0.75 s work unit |
| `V_Celebrate` | `Cheer` | CC0 1.0 | 1.67 s | — | 0.109 / 0.197 → 0 / 0 | 60% amplitude, feet planted (§10.2) |
| `V_Finale` | authored (arm IK) | — | pose | — | — | hands on hips at D17 (spec §5, V9) |
| `V_Blink`, `V_Delight` | authored | — | 0.15 s, 1 s | — | — | face morphs `blink`, `smile` |

The ponytail's sway in every clip is simulated (a damped spring trailing the head), not taken
from the source.
