# Space Game — Build Log

A retrospective capture of every system in the prototype, what it does, and where to find / tune it. Read top-to-bottom for an overview, or jump to the relevant section.

## Project shape

- `/home/pd/space-game/` — independent project (no relation to the Lucky Tower prototype in `/home/pd/games/`).
- **Phaser 3** + **Vite**. `npm run dev` serves at `http://127.0.0.1:5175/` (5173/5174 are squatted by the Lucky Tower dev server).
- One-page game: `index.html` → `src/main.js` → Phaser, scenes registered as `[Boot, Space, HUD, GameOver, Shop]`.

## Controls (current)

| Action | Input |
|---|---|
| Rotate ship | A / D |
| Thrust | W |
| Decelerate / reverse thrust | S |
| Aim weapon | Mouse |
| Fire | Left-click *or* Space |
| Switch weapon (cycle owned) | E |
| Open engineering anywhere | F |
| Land at star base | Fly into the STAR BASE sprite |
| Close engineering | ESC or right-click |
| Respawn after death | R |

A/D + W drive the ship body and the thrust direction; the mouse controls the gun independently — twin-stick with momentum.

## Ship & physics

- `src/ShipController.js` is engine-agnostic: holds `x, y, angle, aimAngle, vx, vy` and `rotate / thrust / integrate / speed`. Movement is *not* glued to Phaser's body so we can swap to Matter.js later without touching gameplay logic.
- Ship body is a Phaser Arcade circle used purely for overlap detection; the controller writes position into the sprite each frame.
- Newtonian movement — releasing W does **not** decelerate. `MAX_SPEED` cap.
- Manual collision response with asteroids: penetration push-out + reflected velocity along the impact normal with bounce coefficient `SHIP.bounce`.
- World-edge guard: when `controller.x/y` is clamped to bounds, the corresponding velocity component is zeroed; NaN guards added defensively.

## Weapons (5)

Defined data-driven in `src/weapons.js`. Each weapon is `{ name, desc, cooldownMs, fire, cost }`. Adding a sixth weapon = one more table entry + one fire function.

| Weapon | Pattern | Ammo | Cooldown | Damage | Cost |
|---|---|---|---|---|---|
| **Blaster** | Single fast bullet | ∞ | 320 ms | 1 | 0 (starter) |
| **Missile** | Single heavy projectile | 12 | 600 ms | 8 | 0 (starter) |
| **Scatter** | 5-bullet fan, fires from ship nose (not mouse aim) | ∞ | 700 ms | 0.7 / shot | 5 |
| **Homing** | Heat-seeking, turns toward nearest enemy | 8 | 850 ms | 12 | 15 |
| **Railgun** | Single fast pierce shot, cuts up to 3 targets in a line | ∞ | 1700 ms | 25 | 30 |

**Implementation notes**

- All projectiles are pooled (`physics.add.group({ classType: Projectile, maxSize, runChildUpdate })`).
- `Projectile.preUpdate` handles TTL expiry and homing steering (uses `nearestActive(scene.enemies)`).
- Hit handlers use `proj.damage`, `proj.piercesLeft`, and a `proj.hitTargets` Set so the same projectile can't hit one asteroid multiple frames in a row.
- Railgun shake on fire (`cameras.main.shake(80, 0.003)`).
- `STARTING_AMMO[id]` defines initial ammo on purchase / refill.

## Asteroids

`src/asteroids.js` — `spawnAsteroid`, `damageAsteroid`, `splitAsteroid` with a small **profile table**:

| Profile | HP×scale | Children when destroyed |
|---|---|---|
| **even** | 2× | 2 medium chunks perpendicular to impact |
| **spray** | 1.5× | 3 chunks fanning forward in impact direction |
| **burst** | 2.5× | 4–6 chunks radiating in all directions |
| **lopsided** | 2× | 1 big slow chunk + 1 small fast chunk |
| **tough** | 5× | 6 small fast pieces all at once |

Each asteroid rolls a profile at spawn; children re-roll on split, so ancestry stays varied. Below `MIN_SCALE = 0.22` they vanish without splitting. Three jagged base textures are picked randomly for visual variety.

Ship-asteroid contact damage scales with relative impact speed (`relSpeed * DAMAGE.asteroidPerSpeedUnit`, clamped to 5–50).

## Ore

- 35% chance per asteroid hit + 1 guaranteed on destruction (`ORE.dropChancePerHit`, `ORE.bonusOnDestroy`).
- **Constant trajectory** by default — ore drifts in a straight line at `ORE.driftSpeed` until magnet kicks in. Bounces off world bounds with bounce 1.
- Collected on ship contact (`ORE.collectRadius`).
- **Tractor Field** (5 levels, **player starts at level 1**): pulls ore toward the ship within `MAGNET.radiusByLevel[level]` (80 → 150 → 240 → 360 → 500 px). Above 280 px/s the pull velocity is capped. Upgrade levels 2–5 still purchased at the shop.

## Enemies

`src/enemy.js` — two variants share the same AI loop, parametrised by `cfg = ENEMY` or `ELITE`.

**Regular (red triangle)**
- Spawns every 22–48 s, max 2 alive, on a 900–1500 px ring around the player.
- 6 HP, single-shot bullets at 14 dmg.
- **Off-screen passive**: when not in `cameras.main.worldView`, AI is skipped and velocity is dampened. Only chases / shoots when on screen.
- 28 dmg ramming damage to the player.

**Elite (purple, larger sprite)**
- Now triggered by clearing the drone swarm (see Portal section), not on a timer.
- 32 HP, twin-shot bursts (2 bullets each fire), 22 dmg per bullet, 40 dmg ramming.
- Drops the **Portal Device** + 8 ore on death.
- Persists regardless of camera view (no on-screen gate).

**Drones (orange, tiny)**
- `src/drones.js`. Boids flocking: separation, alignment, cohesion, plus seek-toward-player.
- 6 drones spawned in a tight cluster at the portal when player enters `DRONE.triggerRadius` (700 px); reset flag clears past `DRONE.resetRadius` (1500 px).
- 1 HP each (one-shot kills), but small + fast (max 260 px/s) so they're hard to hit.
- 4 dmg per pulse, 8 dmg ramming, fire range 320 px, irregular cooldown.

## Wormhole / portal

- Spawned once per sector at a fixed location ≥ 2400 px from spawn point.
- Closed (dim grey ring) by default; **open** (bright cyan vortex, slow rotation) when `gameState.hasPortalDevice`.
- Approach within `PORTAL.triggerRadius` while open → camera flash → `scene.restart()`, level++, world regenerates with +6 asteroids (`LEVEL.asteroidsPerLevel`), enemies spawn 15% faster (`LEVEL.enemySpawnSpeedup`), shield refilled.

**Two paths to the device**
1. **Combat**: get within 700 px of portal → drone swarm spawns → clear all drones → Elite drops in (with screen flash + "ELITE INCOMING" callout) → kill it → device drops as drifting pickup → fly into device → portal opens.
2. **Trade**: walk into the SHOP station → buy Portal Device for 20 ore → portal opens.

Either way, the device is consumed on entering the portal and you start the next sector without one.

## Engineering (formerly Shop) + Star Base

`src/ShopScene.js` — title now reads "ENGINEERING BAY". Overlay scene that pauses `SpaceScene`. Two access paths:

- **F key** anywhere in space → instant open. Convenience access for spending ore between fights.
- **Touch the STAR BASE** in the world → triggers `LandingScene`, a Lunar Lander mini-game. Soft landing on the lit pad opens engineering automatically *and* awards full hull repair + shield refill + 20 ore. Crash → −30 hull and bounce back to space. 4 second dock cooldown after returning so you can fly away cleanly.

Lines render dynamically from a single `ITEMS` array.

| Line | Function |
|---|---|
| Scatter | One-shot purchase, 5 ore |
| Homing | One-shot purchase + ammo refills (15 ore each) |
| Railgun | One-shot purchase, 30 ore |
| **Tractor Field** | 5 levels, costs `[80, 150, 280, 500, 800]` |
| **Shield Capacitor** | 6 levels, +25 max shield each, costs `[2, 8, 30, 100, 300, 900]`. Refills shield to new max. |
| **Portal Device** | 20 ore, one-time per sector |
| **Hull repair** | +10 HP for 2 ore, repeatable up to max |

Buttons hover-highlight, clamp purchases on insufficient ore / already-owned / max-level / hull-full.

## Game-over / respawn

`src/GameOverScene.js`. When hull hits 0 the camera flashes red, `SpaceScene` pauses, and an overlay shows final ore + sector. **R** wipes registry state and restarts a fresh sector 1.

## HUD

`src/HUDScene.js` — separate scene rendered over `SpaceScene`.

**Top-left stack**
- Shield bar (cyan) + numeric value
- Hull bar (red, deep red below 30%) + numeric value
- Current weapon name
- Current ammo (∞ for infinite)
- Speed
- Ore counter
- Sector N
- "Portal Device ✓" when carrying

**Bottom-left**
- Help line: "A/D rotate • W thrust • Mouse aim • Click/Space fire • E weapon • Right-click shop"

**Top-right minimap (160×160)**
- Asteroids (grey, scaled by size)
- Ore (yellow specks)
- SHOP station (cyan square)
- Portal (dim ring closed, bright ring with halo when open)
- Portal device pickup (pink)
- Regular enemies (red), Elite (purple-pink, bigger), Drones (orange micro-dots)
- Camera viewport rectangle (translucent cyan)
- Player ship triangle (cyan, points in ship's heading direction)

## Crosshair

- Custom reticle texture (`crosshair`) rendered at depth 1000.
- **Screen-locked** (`setScrollFactor(0)`) and positioned via `pointer.x, pointer.y` so it stays glued to the OS mouse position regardless of camera lerp / world scrolling.
- The OS cursor is hidden over the canvas (`input.setDefaultCursor('none')`).
- `aimAngle` is computed from the world-projected pointer (`pointer.x + cam.scrollX, pointer.y + cam.scrollY`) so firing math stays correct.

## File map

```
src/
├── main.js            # Phaser.Game config + scene list
├── constants.js       # All tuning knobs (SHIP, BLASTER, ENEMY, ELITE, DRONE, PORTAL, SHIELD_UPGRADE, MAGNET, …)
├── BootScene.js       # Generates every placeholder texture procedurally
├── SpaceScene.js      # The gameplay scene (orchestrates everything)
├── HUDScene.js        # Persistent overlay (bars, weapon, minimap)
├── GameOverScene.js   # Death overlay + R to restart
├── ShopScene.js       # Engineering bay UI (paused overlay)
├── LandingScene.js    # Lunar Lander mini-game when docking at the star base
├── ShipController.js  # Engine-agnostic ship physics
├── weapons.js         # WEAPONS table + fire functions + STARTING_AMMO
├── asteroids.js       # Spawn / damage / split (5 profiles)
├── ore.js             # Spawn / collect + magnet logic
├── enemy.js           # Regular + Elite ships, AI loop
└── drones.js          # Drone swarm with boids flocking
```

## Architecture invariants (kept across all changes)

- **Phaser scenes are modes.** `SpaceScene` for in-flight, `ShopScene` overlay for trading, `GameOverScene` overlay for death. `HUDScene` is a persistent overlay. Don't merge them.
- **Game state lives on `scene.registry`** as a single `gameState` object so it survives `scene.restart()` (level transitions) and is shared with the HUD/shop. Reset with `registry.remove('gameState')` on death.
- **Movement physics live in `ShipController`**, not in scene `update`, so swapping Arcade for Matter is a controller swap.
- **Weapons are data**, not classes — see `weapons.js`. Same for asteroid split profiles.
- **Projectiles are pooled** with `physics.add.group({ classType, maxSize, runChildUpdate: true })`.
- **All per-frame motion uses `delta`** (ms) so behaviour is framerate-independent.
- Right-click context menu is disabled (`input.mouse.disableContextMenu()`) so the shop's right-click open/close doesn't fight the browser.

## Tuning surface

Every gameplay number is a constant — no magic in code. Quick map:

- Ship feel → `SHIP.rotSpeed / accel / maxSpeed / bounce`
- Damage taken → `DAMAGE.asteroid*`, `ENEMY.bulletDamage / contactDamage`, `ELITE.*`, `DRONE.*`
- Shield/hull → `SHIP.maxShield / maxHull / shieldRegenDelayMs / shieldRegenPerSec`
- Weapon balance → per-weapon block (`BLASTER`, `MISSILE`, `SPREAD`, `HOMING`, `RAILGUN`)
- Enemy spawn frequency → `ENEMY.spawnDelayMin/MaxMs`, `ENEMY.maxAlive`
- Drone behaviour → `DRONE.{ swarmSize, separation/alignment/cohesion/seekWeight, fireRange, triggerRadius, resetRadius }`
- Magnet curve → `MAGNET.radiusByLevel / costByLevel / accel`
- Shield upgrade curve → `SHIELD_UPGRADE.bonusPerLevel / costByLevel`
- Level scaling → `LEVEL.asteroidsPerLevel / enemySpawnSpeedup`

## What's still deferred (next planning sessions)

- **Audio**: zero sound effects or music. Thrust loop, fire SFX, explosion stingers, shop UI clicks.
- **Asteroid-asteroid collision**: they currently pass through each other.
- **Sprite art**: everything is a procedurally-drawn placeholder texture from `BootScene`.
- **Persistent saves**: progress resets on death and on browser reload.
- **Stations beyond shop**: docking + station interiors (the original "adventure" half of the design).
- **Multiple sectors with distinct theming**: every level is the same regenerated world, just denser.
- **Loot variety beyond ore**: blueprints, rare drops, currency tiers.
- **Better death feedback**: explosion animation when ship/asteroid/enemy dies.
- **Sector map / minimap legend**: knowing what each colour means without reading the code.
- **Performance**: bundle is 1.5 MB unminified; could lazy-split scenes if it ever matters.

## Recent fixes worth remembering

- Crosshair was placed in world space using `pointer.worldX/Y`, which lagged a frame behind the camera lerp; switched to screen-locked (scrollFactor 0) at `pointer.x, pointer.y`, and the world-projected aim point is computed only for firing math.
- Ore had a magnetic pull that was removed (constant trajectory was requested), then re-added as a *purchasable* upgrade (Tractor Field), so default behaviour is still constant straight-line drift.
- Ship velocity used to grind into world edges; now zeroed on the relevant axis when clamped, plus NaN guards.
- Elite used to spawn on a 90–180 s timer; now gated behind clearing the drone swarm at the portal — so combat feeds directly into the progression loop.
- Aim line from ship to crosshair removed at user request.
- Blaster initial cooldown raised 120 → 320 ms so the starter rate feels deliberate; weapon prices and hull repair cut by ~90% to match (early game economy is now generous).
