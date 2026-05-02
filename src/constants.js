export const VIEW_W = 960;
export const VIEW_H = 600;

export const WORLD_W = 6000;
export const WORLD_H = 6000;

export const SHIP = {
  rotSpeed: 3.5,
  accel: 220,
  reverseAccel: 140,
  maxSpeed: 420,
  radius: 14,
  maxShield: 100,
  maxHull: 100,
  shieldRegenDelayMs: 4000,
  shieldRegenPerSec: 14,
  hitCooldownMs: 450,
  bounce: 0.55
};

export const DAMAGE = {
  asteroidMin: 5,
  asteroidMax: 50,
  asteroidPerSpeedUnit: 1 / 12
};

export const ENEMY = {
  maxAlive: 2,
  spawnDelayMinMs: 22000,
  spawnDelayMaxMs: 48000,
  spawnRingMin: 900,
  spawnRingMax: 1500,
  hp: 6,
  rotSpeed: 2.4,
  accel: 150,
  maxSpeed: 240,
  engageRange: 520,
  fleeRange: 220,
  fireRange: 620,
  fireCooldownMs: 850,
  bulletSpeed: 480,
  bulletTTLms: 1500,
  bulletDamage: 14,
  bulletPoolMax: 40,
  contactDamage: 28,
  oreOnDeath: 3,
  radius: 14
};

export const BLASTER = {
  cooldownMs: 320,
  projSpeed: 700,
  ttlMs: 1200,
  poolMax: 200,
  damage: 1
};

export const MISSILE = {
  cooldownMs: 600,
  projSpeed: 350,
  ttlMs: 3000,
  poolMax: 32,
  damage: 8,
  startAmmo: 12
};

export const SPREAD = {
  cooldownMs: 700,
  projSpeed: 600,
  ttlMs: 850,
  damage: 0.7,
  count: 5,
  fanRad: 0.55,
  cost: 5
};

export const HOMING = {
  cooldownMs: 850,
  projSpeed: 320,
  ttlMs: 4500,
  damage: 12,
  startAmmo: 8,
  turnRate: 4.5,
  cost: 15
};

export const RAILGUN = {
  cooldownMs: 1700,
  projSpeed: 1500,
  ttlMs: 800,
  damage: 25,
  pierces: 3,
  poolMax: 12,
  cost: 30
};

export const REPAIR = {
  hpPerBuy: 10,
  costPerBuy: 2
};

export const MAGNET = {
  maxLevel: 5,
  radiusByLevel: [0, 80, 150, 240, 360, 500],
  costByLevel:   [0, 80, 150, 280, 500, 800],
  accel: 600,
  maxOreSpeed: 280
};

export const SHIELD_UPGRADE = {
  maxLevel: 6,
  bonusPerLevel: 25,
  costByLevel: [0, 2, 8, 30, 100, 300, 900]
};

export const COLORS = {
  bg: 0x05060a,
  ship: 0xb6e3ff,
  shipOutline: 0x3aa1ff,
  shieldBar: 0x6cd0ff,
  hullBar: 0xff5a5a,
  hullBarLow: 0xff3030,
  blaster: 0xfff0a0,
  missile: 0xff8050,
  asteroid: 0x6f6450,
  asteroidOutline: 0x3a3528,
  ore: 0xf2c542,
  oreLight: 0xfff0a0,
  station: 0x2a4a6e,
  stationOutline: 0x6cd0ff,
  enemy: 0xff7575,
  enemyOutline: 0xc02020,
  enemyBullet: 0xff5050,
  elite: 0xc864ff,
  eliteOutline: 0x6020a0,
  drone: 0xff9050,
  droneOutline: 0xa04020,
  portalRing: 0x66ddff,
  portalCore: 0xa0f0ff,
  portalClosed: 0x445566,
  portalDevice: 0xff80ff,
  rail: 0xc8f0ff,
  starNear: 0xffffff,
  starFar: 0x6677aa
};

export const ASTEROID_COUNT = 20;

export const ORE = {
  dropChancePerHit: 0.35,
  bonusOnDestroy: 1,
  collectRadius: 22,
  driftSpeed: 60
};

export const STATION = {
  count: 1,
  minDistFromCenter: 1500
};

export const LANDING = {
  gravity: 80,
  thrustAccel: 200,
  rotSpeed: 2.6,
  fuelStart: 200,
  fuelBurnPerSec: 25,
  startVxRange: 60,
  startVy: 10,
  safeLandingSpeed: 70,
  uprightTolerance: 1.0,
  rewardOre: 20,
  crashHullDamage: 30,
  dockCooldownMs: 4000,
  dockTriggerRadius: 50
};

export const ELITE = {
  spawnDelayMinMs: 90000,
  spawnDelayMaxMs: 180000,
  hp: 32,
  rotSpeed: 2.0,
  accel: 130,
  maxSpeed: 220,
  engageRange: 600,
  fleeRange: 180,
  fireRange: 720,
  fireCooldownMs: 380,
  bulletSpeed: 540,
  bulletDamage: 22,
  contactDamage: 40,
  oreOnDeath: 8,
  radius: 22
};

export const DRONE = {
  swarmSize: 6,
  triggerRadius: 700,
  resetRadius: 1500,
  hp: 1,
  maxSpeed: 260,
  accel: 380,
  separationRadius: 36,
  flockRadius: 120,
  separationWeight: 1.6,
  alignmentWeight: 0.8,
  cohesionWeight: 0.6,
  seekWeight: 1.4,
  fireRange: 320,
  fireCooldownMs: 1200,
  bulletSpeed: 380,
  bulletDamage: 4,
  contactDamage: 8,
  radius: 7
};

export const PORTAL = {
  ringRadius: 50,
  triggerRadius: 60,
  minDistFromShipStart: 2400
};

export const LEVEL = {
  asteroidsPerLevel: 6,
  enemySpawnSpeedup: 0.85
};
