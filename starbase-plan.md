# Phase 2 Plan — Starbase, Engineering Revamp, Pixel Visuals

This is the forward plan for the next major chunk. It replaces the placeholder shop UI and introduces the on-foot half of the game (VVVVVV-style platformer inside the starbase) plus a substantially deeper economy.

The existing `plan.md` is the *build log* of what shipped through Phase 1. This file is what comes next.

## Context

Phase 1 delivered a flyable space-shooter with shop, weapons, asteroids, enemies, drones, elite, portal, and a Lunar Lander mini-game when docking at a starbase. The shop is currently a flat overlay menu launched after a successful landing.

Phase 2 makes the starbase a **place you walk around in**. The shop becomes one terminal among several inside a VVVVVV-style platforming room. Ships and exotic objects join the economy. Visuals shift game-wide to pixel art.

## Goals (what "done" looks like for this phase)

- Successful landing at a starbase cuts to a side-view platforming scene where the player moves on foot.
- Movement: A/D horizontal + gravity flip. No jump. Floor-contact required to flip.
- One hand-crafted starbase room with engineering, airlock, repair, and checkpoint props.
- A simple level editor for designing rooms (and producing the JSON format procedural will eventually output).
- Engineering UI in the starbase sells **weapons, upgrades, and ships**, and accepts **weapons, exotics, and scrap** for trade.
- Cargo system per-ship; ship choice (Scout / Cruiser / Heavy) is a meaningful tradeoff.
- Drops: every enemy drops scrap; regulars sometimes drop weapons; elites always drop exotics.
- Tractor beam upgrade locks collectables to the player ship instead of pulling-then-releasing.
- Game-wide visual flip to pixel art (`pixelArt: true`).

## Out of scope for Phase 2

- Multi-room starbases. (One room per starbase, single screen.)
- Procedural starbase generation. (Hand-crafted only; editor produces the same JSON format procedural will use later.)
- Paid hangar storage. (Cargo overflow on ship swap = forced auto-sell at half price.)
- Advanced VVVVVV elements: gravity lines, conveyors, screen wrap. (Spikes only for v1.)
- Multiple checkpoints in one room. (One checkpoint at the entrance for v1.)
- NPC dialog / story content.

## Visual style change (game-wide)

Single line in `main.js`: `pixelArt: true`. All textures rendered nearest-neighbor, no antialiasing. Existing space textures (ship triangles, asteroid polygons, ring portals) become crisper but stay structurally the same. New starbase textures designed pixel-first.

Tile size in starbase: **24 px**. Crew sprite: **16 px** tall. Canvas remains 960×600.

## Starbase scene (`StarbaseScene`)

Triggered from `LandingScene.success()` in place of opening the shop overlay. Loads a level by id from `levels.js`.

### Crew controller

New file `CrewController.js`. Engine-agnostic, sibling of `ShipController`:

- Fields: `x, y, vx, gravitySign (-1 or +1), onSurface (bool), facing (-1 or +1)`.
- Methods: `move(dt, leftHeld, rightHeld)`, `flip()` (only succeeds when `onSurface`), `integrate(dt)`, `respawn(checkpoint)`.
- Walk speed: ~140 px/s. No acceleration, no inertia (instant stop on key release — VVVVVV crisp feel).
- Vertical motion is pure gravity. No jump. `gravitySign` = +1 (down) or -1 (up). Vertical velocity grows from 0 each flip until landing on a surface.

### Tile collision

Cell-based. For each frame:

1. Apply horizontal velocity, clamp against solid tiles.
2. Apply vertical velocity (`gravity * gravitySign * dt`), clamp against solid tiles. Set `onSurface = true` on tile contact.
3. Spike-tile overlap → respawn.

### Death / respawn

Touch a `^` (spike-up) or `v` (spike-down) tile → fade-flash → teleport to `lastCheckpoint`, `gravitySign = +1`. Hull is **not** affected. (You already paid the docking attempt with the lander game.)

### Props (interactables)

Walk over a prop tile and press **E** to interact:

| Prop | Effect |
|---|---|
| `engineering` | Opens the rewritten engineering UI as overlay (paused starbase). |
| `airlock` | Cuts back to `SpaceScene`, repositions ship near starbase, 4 s dock cooldown. |
| `repair` | Full hull repair. (Free here; the engineering terminal also offers paid repair.) |
| `checkpoint` | Sets `lastCheckpoint = (this.x, this.y)`. Highlights when set. |

### Scene flow

```
SpaceScene (ship overlap base)
  → LandingScene (Lunar Lander)
       crash → SpaceScene
       success → 750 ms transition (lander shrinks → fade-to-black 250 ms → fade-in)
                 → StarbaseScene
                       walk to airlock + E → SpaceScene
                       walk to engineering + E → ShopScene overlay (paused)
                       die on spike → respawn to checkpoint, stay in StarbaseScene
```

## Level data format (single source of truth)

Used by hand-crafted levels, the editor, and future procedural generation.

```jsonc
{
  "id": "starbase_bay_1",
  "width": 40, "height": 25, "tileSize": 24,
  "spawn":  { "x": 2, "y": 22, "gravity": "down" },
  "tiles":  "....#####.....\n.....^^^.....\n....#####....\n...",
  "npcs":   [{ "type": "patrol_h", "x": 14, "y": 12, "range": 6, "speed": 60 }],
  "props":  [
    { "type": "engineering", "x": 30, "y": 22 },
    { "type": "airlock",     "x": 38, "y": 22 },
    { "type": "checkpoint",  "x": 6,  "y": 22 },
    { "type": "repair",      "x": 22, "y": 22 }
  ]
}
```

**Tile glyphs**: `.` empty, `#` solid, `^` spike-up, `v` spike-down.
Future: `=` conveyor, `~` gravity line.

**NPC types** (v1): `patrol_h`, `patrol_v`. Each has `x`, `y`, `range` (in tiles), `speed` (px/s). NPCs are deadly on contact (= respawn).

**Prop types** (v1): `engineering`, `airlock`, `checkpoint`, `repair`.

## Editor (`EditorScene`)

Accessed via `?editor=1` URL flag. Phaser-rendered, no DOM.

Layout:

```
┌─ Tools ──┐  ┌── grid: live preview of placed tiles + props + NPCs ──┐
│ ▣ Wall   │  │                                                        │
│ ✱ Spike↑ │  │                                                        │
│ ✱ Spike↓ │  │                                                        │
│ ⌫ Erase  │  │                                                        │
│ ◉ Spawn  │  │                                                        │
│ ↔ NPC-H  │  │                                                        │
│ ↕ NPC-V  │  │                                                        │
│ ⚙ Eng    │  │                                                        │
│ 🚪 Air   │  │                                                        │
│ ✓ Check  │  └────────────────────────────────────────────────────────┘
│ + Repair │  [name: ____ ] [Save] [Load▾] [Test] [Export] [Import]
└──────────┘
```

- Left-click: place selected tool at grid cell.
- Right-click: erase whatever's at that cell.
- NPC placement: first click drops NPC, second click sets patrol endpoint along the dominant axis.
- Save: serializes JSON to `localStorage` under `level:<name>`. Auto-saves every 5 s.
- Load: dropdown of saved level names.
- Test: launches `StarbaseScene` with current data without persisting; ESC returns to editor.
- Export JSON / Import JSON: clipboard.

## Engineering UI (existing `ShopScene` revamped)

Still a paused overlay. Now organized into sections (tabs or scrollable panel):

### Section 1 — Cargo & Trade
- **Cargo slots used**: e.g. `5/8` for current ship.
- Per-item rows with **Sell** buttons:
  - Scrap: stacks of up to 30 per slot. Sell rate 1 → 1 ore.
  - Exotics: Crystalline (50), Black-box (100), Data core (200). One per slot.
  - Weapons (in cargo): sell back at 50% of buy cost.

### Section 2 — Weapons (buy)
- Same as today: Scatter (5), Homing (15), Railgun (30), buy adds to cargo (1 slot each).
- Owned weapons can also be bought as duplicates? **No** — one of each.
- Refill homing ammo: 15 ore.

### Section 3 — Upgrades
- Tractor Field (5 levels, costs as today).
- Shield Capacitor (6 levels, costs as today).
- Hull repair (+10 HP for 2 ore).
- Portal Device (20 ore, one per sector).

### Section 4 — Ships
- Lists `padCount` ships available at this starbase.
- Each row shows name, archetype description, key stats, cargo slots, buy cost.
- **1-pad station**: only one ship listed, action = "Trade your *Cruiser* for *Scout* — pay net N ore" (net = `newCost − 0.5 × oldCost`).
- **Multi-pad station**: each row action = "Buy: N ore" (full price; old ship discarded on swap, no hangar storage).
- Cargo overflow on swap is auto-sold at the standard 50% rate; UI shows "Auto-sold N items for M ore" toast.

## Ships

`SHIPS` table in constants:

| Id | Name | Hull | Shield | Accel | MaxSpeed | Rot | Cargo | Cost |
|---|---|---|---|---|---|---|---|---|
| `scout`   | Scout   |  60 |  80 | 320 | 540 | 5.0 |  4 | 200 |
| `cruiser` | Cruiser | 100 | 100 | 220 | 420 | 3.5 |  8 |   0 |
| `heavy`   | Heavy   | 200 | 180 | 150 | 320 | 2.4 | 16 | 1500 |

State changes:
- `gameState.currentShipId` (replaces fixed SHIP constants for live values).
- `gameState.maxHull`/`maxShield` derived from current ship + shield-upgrade bonus.
- `gameState.cargo` (replaces `ownedWeapons[]`): array of `{ type: 'weapon'|'exotic'|'scrap', id?, qty? }`. Scrap stacks (qty up to 30).
- Visual: `this.ship.setTexture(SHIPS[id].sprite)` on swap.

Carry-over upgrades on ship swap:
- `magnetLevel` and `shieldLevel` persist (operator skill).
- Cargo: as much as fits in the new ship's slots transfers; surplus auto-sells.
- Currently-equipped weapon: if it's still in cargo, stays equipped; otherwise reverts to blaster.
- Portal Device: persists.

## Pad count + station inventory

Each starbase rolled at sector generation:

- `padCount` ∈ {1, 2, 3} — distribution scales gently with `state.level`. Sector 1: padCount = 1. Sector 2: 1 or 2. Sector 3+: 2 or 3.
- Station inventory = `padCount` random ships from `SHIPS` (excluding any matching the player's *current* ship).
- Inventory is **maintained** for the life of the sector — visit, leave, revisit, same ships still there. Refresh only on portal transition.
- Visual in `LandingScene`: occupied pads show silhouettes of the for-sale ships parked on them (extra rendering before the player lands).

## Drops

| Enemy | Always drops | Sometimes drops |
|---|---|---|
| Drone | 1 scrap | nothing else |
| Regular | 2–4 scrap | random weapon (15%) |
| Elite | 5–8 scrap + 1 exotic | random weapon (30%) |

Asteroid drops unchanged — ore only. Exotic types drop with weighted probability (Crystalline most common, Data core rarest).

## Tractor lock-on

`ore.js` mechanic update:

- Each collectable (ore, scrap, exotic, weapon, portal device) has `locked: false` flag.
- Each frame: if `!locked` and within `MAGNET.radiusByLevel[lvl]` of ship → set `locked = true`.
- Each frame: if `locked`, accelerate toward ship (no distance fall-off). Velocity capped at `MAGNET.maxOreSpeed` so the item doesn't slingshot through the player.
- Once locked, the item follows the ship indefinitely until collected.

This applies to ALL collectables, not just ore. Magnet level still gates the *initial* lock-on radius.

## Architecture impact

New files:
- `src/CrewController.js` — on-foot physics + flip rule.
- `src/StarbaseScene.js` — the platformer scene.
- `src/EditorScene.js` — the level editor (dev-only).
- `src/levels.js` — `LEVELS` table with built-in `starbase_bay_1`.

Modified files:
- `main.js` — `pixelArt: true`, register `StarbaseScene` and `EditorScene`, conditional editor entry on `?editor=1`.
- `LandingScene.js` — `success()` triggers transition to `StarbaseScene` instead of launching `ShopScene`.
- `ShopScene.js` — full rewrite: cargo + trade + weapons + upgrades + ships sections.
- `SpaceScene.js` — drop F-key engineering shortcut; consume `gameState.currentShipId` for SHIP-derived constants; cargo-aware loot drops.
- `enemy.js` / `drones.js` / `asteroids.js` — enemy/drop callbacks emit cargo items, not just ore.
- `ore.js` — generalize to handle scrap/exotics/weapons/devices, plus lock-on flag.
- `BootScene.js` — pixel-style retexturing pass; new sprites for crew, scout, heavy, exotics, scrap, props (terminal/airlock/repair/checkpoint).
- `constants.js` — `SHIPS`, `EXOTICS`, `STARBASE_PADS`, drop chances/amounts.

## Build order (concrete steps)

1. **Pixel flag flip + texture audit.** `pixelArt: true`. Quick visual check; tweak any textures that look wrong.
2. **Cargo data model.** Replace `gameState.ownedWeapons[]` with `gameState.cargo[]` (1 slot per weapon, slot count gated by current ship). Plumb existing buy/sell flow through it. ShopScene shows slot count.
3. **Ships table + swap.** `SHIPS` constants, `gameState.currentShipId`, sprite swap, derived stats. Add Ships section to ShopScene with one starbase having padCount=1 (trade flow).
4. **Drops rework.** Scrap drops from every enemy; weapon drops from regulars and elites at the rates above; exotics from elites only. Pickup adds to cargo with overflow handling (forced auto-sell at 50%).
5. **Tractor lock-on.** Update `ore.js` to support lock flag for all collectable groups.
6. **Level data format + hardcoded `starbase_bay_1`.** Lets runtime be tested before editor exists.
7. **`CrewController` + `StarbaseScene`.** Tile rendering, gravity flip, spike respawn, prop interaction with E.
8. **Rewire `LandingScene.success()`** to transition into `StarbaseScene`. Engineering moves to the in-base terminal.
9. **Drop F-key everywhere shortcut.** Engineering reachable only via terminal.
10. **`EditorScene`.** Tile placement, NPC two-click placement, save/load via localStorage, export/import JSON, Test mode.
11. **Patrol NPC type.** Implement `patrol_h` and `patrol_v` movement + spike-equivalent collision (touching = respawn).
12. **Pad count visuals.** Render parked ship sprites on occupied pads in `LandingScene`. Per-station inventory persisted in `gameState.sectorInventory[stationId]`.

(Later phases: gravity lines + conveyors + screen wrap; multi-room starbases; procedural level generator; paid hangar storage; multi-checkpoint rooms; NPC dialog.)

## Open / soft questions

These don't block starting Phase 2 but are worth resolving before they bite:

a. **Save points / persistence across deaths in space.** Today, `R` after game-over wipes state. Should the starbase save room concept ever come into play, or do we keep it strictly run-based?

b. **Sector inventory for stations** — does the same starbase exist sector-to-sector, or does each sector roll a fresh starbase? Phase 2 assumes the latter.

c. **Weapon duplicates in cargo.** Default: only one of each. (No reason to carry two blasters.) But an alternative model lets you stockpile and sell duplicates.

d. **Exotic drop weights.** Crystalline 60%, Black-box 30%, Data core 10% — placeholder, tune in playtest.

e. **Ship prices.** Scout 200 / Heavy 1500 are guesses. After Phase 2 plays, retune so progression takes ~3 sectors to reach Heavy.

## Defaults locked in this planning round

| # | Question | Answer |
|---|---|---|
| 3 | Death model in starbase | VVVVVV-style respawn at checkpoint, no hull cost |
| 4 | v1 starbase props | Engineering, Airlock, Repair, Checkpoint |
| 5 | F-key engineering | **Removed** — engineering only via in-starbase terminal |
| 6 | Exit from starbase | Walk to airlock + press E |
| 7 | Visual style | **Pixel-based, game-wide** |
| 8 | Landing → starbase | Lander shrinks → 250 ms fade-to-black → fade-in (~750 ms) |
| 9 | Hazards in v1 | Spikes only |
| 10 | Checkpoints | One per room |
| 11 | Room size | 40 × 25 tiles at 24 px (fits 960×600 exactly) |
| 12 | Where ships are sold | Same engineering terminal |
| 13 | Ship variants | Sidegrades (Scout / Cruiser / Heavy) |
| 14 | Upgrades on swap | Carry over (magnet, shield) |
| 15 | Old ship handling | Discarded — no hangar |
| 16 | Trade discount | Trade-in = 50% of old ship cost |
| 17 | Station inventory | Random per sector, **maintained** until portal |
| 18 | Pad count distribution | Scales mildly with sector level (1 → 1–2 → 2–3) |
| 19 | Inventory refresh | Only on portal to new sector |
| 20 | Parked ships visible | Yes, sprites on occupied pads in LandingScene |
| 21 | Cargo overflow | Forced auto-sell at 50% (no manual choose) |
| 22 | Exotic sources | Elites always; no asteroids |
| 23 | Exotic types | Crystalline 50 / Black-box 100 / Data core 200 |
| 24 | Weapon sell-back | 50% of buy cost |
| 25 | Cargo UI | Section in same ShopScene |
| 26 | Scrap form | Cargo, stacks up to 30 per slot |
| 27 | Scrap purpose | Selling only, 1 → 1 ore |
| – | Tractor lock-on | Yes, all collectables, no fall-off after lock |

## Final question before code

Is the build order acceptable, or do you want to front-load the starbase scene (steps 6–8) ahead of the cargo/drops rework (steps 2–4)? Front-loading makes the new scene visible faster but means cargo work has to ship in a second pass.
