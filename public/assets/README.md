# Assets

Drop PNGs (and later WAVs/OGGs) into the matching subfolder. Vite serves
`/assets/...` directly because everything under `public/` is copied to the
build root.

## How loading works

In `src/BootScene.js`, every existing texture is generated procedurally with
`this.add.graphics().generateTexture(key, w, h)`. To replace one with a real
sprite, swap the generator for a `this.load.image(key, '/assets/...')` call
inside `preload()` (we currently have no preload — we'd add one). The rest
of the code refers to textures by their string key, so once the key resolves
to your image instead of the generated texture, everything wires up
automatically.

Example (Cruiser ship):

```js
// In BootScene
preload() {
  this.load.image('ship', '/assets/ships/cruiser.png');
}
create() {
  // delete the line: this.makeShipTexture();
  // … keep everything else …
}
```

The asset is now used everywhere `'ship'` is referenced (SpaceScene player,
Schematic preview, Alliance battle, etc.).

## Folder map and texture keys

Each row lists the existing texture key the engine expects; drop a PNG with
the suggested name to override.

### `ships/`
| File | Texture key | Approx size |
|---|---|---|
| `cruiser.png` | `ship` | 36 × 28 |
| `scout.png` | `ship_scout` | 28 × 22 |
| `heavy.png` | `ship_heavy` | 44 × 36 |

Ships are drawn pointing **right** (nose at +X). Phaser rotates around the
sprite center.

### `enemies/`
| File | Texture key | Approx size |
|---|---|---|
| `pirate.png` | `enemy_ship` | 32 × 26 (nose at +X) |
| `elite.png` | `elite_ship` | 52 × 42 (nose at +X) |
| `drone.png` | `drone` | 12 × 12 |

### `items/`
| File | Texture key | Approx size |
|---|---|---|
| `ore.png` | `ore` | 10 × 10 |
| `scrap.png` | `scrap` | 10 × 10 |
| `exotic_crystal.png` | `exotic_crystal` | 12 × 12 |
| `exotic_box.png` | `exotic_box` | 12 × 12 |
| `exotic_data.png` | `exotic_data` | 12 × 12 |
| `portal_device.png` | `portal_device` | 14 × 14 |

### `tiles/`
| File | Texture key | Approx size |
|---|---|---|
| `wall.png` | `tile_wall` | 24 × 24 |
| `spike_up.png` | `tile_spike_up` | 24 × 24 |
| `spike_down.png` | `tile_spike_down` | 24 × 24 |
| `ground.png` | `ground_tile` | 64 × 24 (alliance battle ground strip) |

### `props/`
Starbase floor terminals (24 × 24 each):

| File | Texture key |
|---|---|
| `engineering.png` | `prop_engineering` |
| `airlock.png` | `prop_airlock` |
| `repair.png` | `prop_repair` |
| `mission.png` | `prop_mission` |
| `insurance.png` | `prop_insurance` |

Plus the on-foot character: `crew.png` → `crew` (12 × 16).

### `ui/`
| File | Texture key | Approx size |
|---|---|---|
| `crosshair.png` | `crosshair` | 22 × 22 |
| `bullet.png` | `bullet` | 6 × 6 |
| `missile.png` | `missile` | 14 × 6 (nose at +X) |
| `enemy_bullet.png` | `enemy_bullet` | 6 × 6 |
| `railshot.png` | `railshot` | 32 × 4 (nose at +X) |
| `bomb.png` | `bomb` | 8 × 8 |

### `effects/`
| File | Texture key | Approx size |
|---|---|---|
| `thruster.png` | `thruster` | 32 × 14 (hot end at +X edge, set origin (0, 0.5) at use) |
| `mission_zone.png` | `mission_zone` | 144 × 144 |
| `wreck.png` | `wreck` | 28 × 28 |
| `blackhole.png` | `blackhole` | 160 × 160 (faint rings + tiny dark core) |

### `audio/`
Reserved for future SFX/music. Placeholder.

## Conventions

- **Format:** PNG with alpha channel. WebP also works in modern browsers if
  size matters.
- **Naming:** lowercase with underscores; keep file basename matching the
  texture key when possible.
- **Pixel art:** the game has `pixelArt: true` in `main.js`, so any PNG you
  drop will render with nearest-neighbor scaling. Author at the displayed
  resolution; do not pre-scale up. A 12×12 ore icon stays 12×12 on screen.
- **Origin:** Phaser defaults sprite origin to (0.5, 0.5). Effects with
  intentional anchor points (thruster, missile, railshot) call
  `setOrigin(...)` in code — keep those textures aligned to the same
  anchor.
- **Rotation reference:** sprites that get rotated in code (ships,
  projectiles) should face **right** (nose at +X) in the source PNG so
  rotation maths in `weapons.js`/`SpaceScene.js` align.

## Suggested workflow

1. Author a PNG at the listed size, save under the right subfolder using the
   suggested filename.
2. In `BootScene.js`, add a `preload()` (if absent) and a
   `this.load.image(key, '/assets/.../file.png')` call. Remove the matching
   `this.makeXTexture()` call from `create()`.
3. Refresh — the rest of the codebase already uses the texture key, no
   other changes needed.
4. If the new sprite is a different size from the procedural placeholder,
   adjust the body radius / hit area in the consumer scene
   (e.g. `SHIPS[id].radius`, `ENEMY.radius`).
