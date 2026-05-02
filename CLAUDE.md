# Space Game (prototype)

Hybrid space-shooter + adventure game. Top-down Asteroids-style flight/combat layer; later, the ship will dock at stations for an adventure-game layer (NPCs, dialog, trade, inventory).

## Phase 1 (current)

Flight physics + two weapons. Nothing else yet.

- **Controls.** A/D rotate, W thrust (Newtonian, no auto-stop), Space fire, E switch weapon.
- **Weapons.** Blaster (fast, infinite ammo, short cooldown). Missile (slow, 12 ammo, big cooldown). Data-driven via `src/weapons.js`.
- **World.** Single open `SpaceScene` (~6000×6000 px), camera follows ship, parallax starfield, ~20 placeholder asteroids (decorative — no collision yet).
- **HUD** is a separate scene overlay, reads from a shared `gameState` object on `scene.registry`.

## Architecture invariants — keep these

- **Phaser scenes are modes.** `SpaceScene` (in-flight) and `StationScene` (future, docked) are siblings; `HUDScene` is a persistent overlay. Do not stuff HUD into gameplay scenes.
- **Game state lives on `scene.registry`** so it survives scene swaps. Never hold persistent state on a single gameplay scene.
- **Movement lives in `ShipController`**, not in scene `update`. This keeps the door open to swapping Arcade physics for Matter.js later.
- **Weapons are data**, not classes. Add a third weapon = one entry in `WEAPONS` table + one `fireXxx` function. Don't grow a switch statement in the ship.
- **Projectiles are pooled**, not allocated per shot — `physics.add.group({ classType, maxSize, runChildUpdate: true })`.
- **Use `delta` (ms) for every per-frame update** so physics is framerate-independent.

## What's deliberately deferred

Asteroid collisions, hull damage, explosions, audio, docking, station interiors, NPCs, inventory, save/load, enemy AI, minimap. Each gets its own planning session.

## Run

```
npm install
npm run dev    # http://127.0.0.1:5173
```
