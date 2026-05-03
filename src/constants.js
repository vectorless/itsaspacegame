export const VIEW_W = 960;
export const VIEW_H = 600;

export const WORLD_W = 6000;
export const WORLD_H = 6000;

export const SHIP = {
  shieldRegenDelayMs: 4000,
  shieldRegenPerSec: 14,
  hitCooldownMs: 450,
  bounce: 0.55
};

export const SHIPS = {
  scout: {
    id: 'scout', name: 'Scout', desc: 'Fast and fragile',
    rotSpeed: 5.0, accel: 320, reverseAccel: 200, maxSpeed: 540, radius: 12,
    maxShield: 80, maxHull: 60,
    cargoSlots: 4, cost: 200, sprite: 'ship_scout', fuelCapacity: 140,
    hardpoints: [
      { id: 'fwd',  x: 10, y: 0,  label: 'Nose' },
      { id: 'rear', x: -8, y: 0,  label: 'Rear' }
    ]
  },
  cruiser: {
    id: 'cruiser', name: 'Cruiser', desc: 'Nimble multi-role fighter',
    rotSpeed: 3.5, accel: 380, reverseAccel: 220, maxSpeed: 380, radius: 14,
    maxShield: 100, maxHull: 100,
    cargoSlots: 8, cost: 0, sprite: 'ship', fuelCapacity: 200,
    hardpoints: [
      { id: 'fwd',   x: 12, y: 0,   label: 'Nose' },
      { id: 'left',  x: -4, y: -10, label: 'Left wing' },
      { id: 'right', x: -4, y: 10,  label: 'Right wing' }
    ]
  },
  heavy: {
    id: 'heavy', name: 'Heavy', desc: 'Slow and tanky',
    rotSpeed: 2.4, accel: 150, reverseAccel: 100, maxSpeed: 320, radius: 18,
    maxShield: 180, maxHull: 200,
    cargoSlots: 16, cost: 1500, sprite: 'ship_heavy', fuelCapacity: 320,
    hardpoints: [
      { id: 'fwd1',  x: 16, y: -4,  label: 'Top fwd' },
      { id: 'fwd2',  x: 16, y: 4,   label: 'Btm fwd' },
      { id: 'left',  x: -2, y: -14, label: 'Left' },
      { id: 'right', x: -2, y: 14,  label: 'Right' },
      { id: 'rear',  x: -18, y: 0,  label: 'Rear' }
    ]
  }
};

export const CARGO = {
  scrapPerSlot: 30,
  orePerSlot: 10
};

export const EXOTICS = {
  crystalline: { id: 'crystalline', name: 'Crystalline ore sample', value: 50, weight: 6, sprite: 'exotic_crystal' },
  blackbox:    { id: 'blackbox',    name: 'Black-box recorder',    value: 100, weight: 3, sprite: 'exotic_box' },
  datacore:    { id: 'datacore',    name: 'Encrypted data core',   value: 200, weight: 1, sprite: 'exotic_data' }
};

export const DROPS = {
  drone:   { scrapMin: 1, scrapMax: 1, weaponChance: 0,    exoticChance: 0 },
  regular: { scrapMin: 2, scrapMax: 4, weaponChance: 0.15, exoticChance: 0 },
  elite:   { scrapMin: 5, scrapMax: 8, weaponChance: 0.30, exoticChance: 1 },
  weaponPool: ['spread', 'homing', 'railgun'],
  scrapValueOre: 1,
  weaponSellRatio: 0.5
};

export const STARBASE_PADS = {
  byLevel: [1, 1, 2, 2, 3, 3, 3]
};

export const MARKETPLACE = [
  { id: 'missile',       kind: 'weapon',     basePrice: 25 },
  { id: 'spread',        kind: 'weapon',     basePrice: 5 },
  { id: 'homing',        kind: 'weapon',     basePrice: 15 },
  { id: 'railgun',       kind: 'weapon',     basePrice: 30 },
  { id: 'crystalline',   kind: 'exotic',     basePrice: 50 },
  { id: 'blackbox',      kind: 'exotic',     basePrice: 100 },
  { id: 'datacore',      kind: 'exotic',     basePrice: 200 },
  { id: 'portal_device', kind: 'consumable', basePrice: 20 }
];

export const MARKET_PRICE_VARIANCE = {
  min: 0.7,
  max: 1.4
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

export const INSURANCE = {
  baseRate: 0.05,
  claimIncrement: 0.04
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
  scrap: 0xb8b8c8,
  scrapDark: 0x4a4a55,
  exoticCrystal: 0x60ffd0,
  exoticBox: 0xffaa50,
  exoticData: 0xff70ff,
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

export const BLACKHOLE = {
  count: 1,
  gravityRadius: 700,
  maxAccel: 350,
  eventHorizonRadius: 30,
  hullDamageOnEventHorizon: 60,
  minDistFromCenter: 1500,
  minDistFromOther: 1200,
  chargeBandMin: 90,
  chargeBandMax: 320
};

export const ENERGY = {
  max: 100,
  shieldRegenCost: 1,
  chargePerSec: 35,
  laserCostPerSec: 30,
  passiveRegenPerSec: 2
};

export const MINING_LASER = {
  range: 560,
  extractRatePerSec: 3.0,
  beamColor: 0x66ff88,
  beamColorCore: 0xffffff,
  cost: 0
};

export const LEVEL = {
  asteroidsPerLevel: 6,
  enemySpawnSpeedup: 0.85
};
