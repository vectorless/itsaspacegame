import { SHIPS, ENERGY, MISSILE, INSURANCE } from './constants.js';
import { autoEquipFromCargo } from './cargo.js';
import { MISSIONS } from './missions.js';
import { WEAPONS } from './weapons.js';

function freshWeaponUpgrades() {
  const out = {};
  for (const id of Object.keys(WEAPONS)) {
    out[id] = { damage: 0, rate: 0, range: 0, special: 0 };
  }
  return out;
}

export function freshGameState() {
  const shipId = 'cruiser';
  const ship = SHIPS[shipId];
  const state = {
    currentShipId: shipId,
    currentWeapon: 'blaster',
    cargo: { weapons: ['blaster', 'mining_laser'], exotics: [], scrap: 0, ore: 0 },
    ammo: { blaster: Infinity, mining_laser: Infinity },
    speed: 0,
    credits: 1000,
    shield: ship.maxShield,
    maxShield: ship.maxShield,
    hull: ship.maxHull,
    maxHull: ship.maxHull,
    gameOver: false,
    level: 1,
    hasPortalDevice: false,
    magnetLevel: 1,
    shieldLevel: 0,
    energy: ENERGY.max,
    maxEnergy: ENERGY.max,
    charging: false,
    deathSites: [],
    missions: { support_alliance: 'available', mine_ore: 'available', unknown_signal: 'available' },
    missionFlags: {},
    missionProgress: {},
    starbasePickups: [],
    insurance: { active: false, claimsCount: 0 },
    lastInsurancePayout: 0,
    weaponUpgrades: freshWeaponUpgrades(),
    autoAimEnabled: true
  };
  autoEquipFromCargo(state);
  return state;
}

export function ensureWeaponUpgrades(state) {
  if (!state.weaponUpgrades) state.weaponUpgrades = freshWeaponUpgrades();
  for (const id of Object.keys(WEAPONS)) {
    if (!state.weaponUpgrades[id]) {
      state.weaponUpgrades[id] = { damage: 0, rate: 0, range: 0, special: 0 };
    } else {
      const u = state.weaponUpgrades[id];
      if (u.damage === undefined) u.damage = 0;
      if (u.rate === undefined) u.rate = 0;
      if (u.range === undefined) u.range = 0;
      if (u.special === undefined) u.special = 0;
    }
  }
}

export function ensureGameState(registry) {
  let state = registry.get('gameState');
  if (!state) {
    state = freshGameState();
    registry.set('gameState', state);
  }
  ensureWeaponUpgrades(state);
  if (state.autoAimEnabled === undefined) state.autoAimEnabled = true;
  return state;
}

export function loadoutValue(state) {
  let v = SHIPS[state.currentShipId]?.cost ?? 0;
  for (const wid of state.cargo.weapons || []) {
    v += WEAPONS[wid]?.cost ?? 0;
  }
  return v;
}

export function insurancePremium(state) {
  const claims = state.insurance?.claimsCount ?? 0;
  const rate = INSURANCE.baseRate + claims * INSURANCE.claimIncrement;
  return Math.ceil(loadoutValue(state) * rate);
}

export function insuranceRate(state) {
  const claims = state.insurance?.claimsCount ?? 0;
  return INSURANCE.baseRate + claims * INSURANCE.claimIncrement;
}

export function resetAfterDeath(state) {
  let payout = 0;
  if (state.insurance && state.insurance.active) {
    payout = loadoutValue(state);
    state.insurance.active = false;
    state.insurance.claimsCount = (state.insurance.claimsCount ?? 0) + 1;
  }

  state.currentShipId = 'cruiser';
  state.cargo.weapons = ['blaster', 'mining_laser'];
  state.cargo.exotics = [];
  state.cargo.scrap = 0;
  state.cargo.ore = 0;
  state.ammo = { blaster: Infinity, mining_laser: Infinity };
  const ship = SHIPS['cruiser'];
  state.shield = ship.maxShield + (state.shieldLevel ?? 0) * 25;
  state.maxShield = ship.maxShield + (state.shieldLevel ?? 0) * 25;
  state.hull = ship.maxHull;
  state.maxHull = ship.maxHull;
  state.energy = ENERGY.max;
  state.maxEnergy = ENERGY.max;
  state.charging = false;
  state.gameOver = false;
  state.currentWeapon = 'blaster';

  state.credits += payout;
  state.lastInsurancePayout = payout;

  if (state.autoAimEnabled === undefined) state.autoAimEnabled = true;
  ensureWeaponUpgrades(state);

  autoEquipFromCargo(state);
}

export function completeMission(state, id) {
  const m = MISSIONS[id];
  if (!m) return;
  state.missions[id] = 'completed';
  state.credits += m.reward;
  if (typeof m.onComplete === 'function') m.onComplete(state);
  if (Array.isArray(m.physicalRewards) && m.physicalRewards.length) {
    state.starbasePickups = (state.starbasePickups || []).concat(m.physicalRewards);
  }
}

export function progressMission(state, id, amount = 1) {
  if (!state.missions || state.missions[id] !== 'accepted') return false;
  const m = MISSIONS[id];
  if (!m || !m.target) return false;
  state.missionProgress = state.missionProgress || {};
  state.missionProgress[id] = (state.missionProgress[id] || 0) + amount;
  if (state.missionProgress[id] >= m.target) {
    completeMission(state, id);
    return true;
  }
  return false;
}

export function snapshotCargoToWreck(state, survivalChance = 0.6) {
  const items = [];
  for (const w of state.cargo.weapons) {
    if (w === 'blaster' || w === 'missile') continue;
    if (Math.random() < survivalChance) items.push({ type: 'weapon', id: w });
  }
  for (const e of state.cargo.exotics) {
    if (Math.random() < survivalChance) items.push({ type: 'exotic', id: e });
  }
  let scrap = state.cargo.scrap;
  while (scrap > 0) {
    const stack = Math.min(scrap, 30);
    if (Math.random() < survivalChance) items.push({ type: 'scrap', qty: stack });
    scrap -= stack;
  }
  let ore = state.cargo.ore;
  while (ore > 0) {
    const stack = Math.min(ore, 10);
    if (Math.random() < survivalChance) items.push({ type: 'ore', qty: stack });
    ore -= stack;
  }
  return items;
}
