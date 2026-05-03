import { CARGO, SHIPS, EXOTICS, DROPS, MISSILE, HOMING } from './constants.js';
import { WEAPONS, STARTING_AMMO } from './weapons.js';

export function freshCargo() {
  return { weapons: ['blaster', 'mining_laser'], exotics: [], scrap: 0, ore: 0 };
}

export function freshAmmo() {
  return { blaster: Infinity, mining_laser: Infinity };
}

function newSlot(weaponId = null) {
  return { weaponId, active: false, lastFire: 0 };
}

export function autoEquipFromCargo(state) {
  const ship = SHIPS[state.currentShipId];
  const hp = {};
  ship.hardpoints.forEach((h) => { hp[h.id] = newSlot(); });
  ship.hardpoints.forEach((h, i) => {
    if (i < state.cargo.weapons.length) hp[h.id] = newSlot(state.cargo.weapons[i]);
  });
  state.hardpoints = hp;
}

export function getEquippedWeapons(state) {
  if (!state.hardpoints) return [];
  const ship = SHIPS[state.currentShipId];
  return ship.hardpoints
    .map((h) => state.hardpoints[h.id]?.weaponId)
    .filter(Boolean);
}

export function getActiveSlots(state) {
  if (!state.hardpoints) return [];
  const ship = SHIPS[state.currentShipId];
  return ship.hardpoints
    .map((h) => state.hardpoints[h.id])
    .filter((s) => s && s.active && s.weaponId);
}

export function ensureHardpointsValid(state) {
  if (!state.hardpoints) {
    autoEquipFromCargo(state);
    return;
  }
  const ship = SHIPS[state.currentShipId];
  const validIds = new Set(ship.hardpoints.map((h) => h.id));
  for (const id of Object.keys(state.hardpoints)) {
    if (!validIds.has(id)) delete state.hardpoints[id];
  }
  for (const h of ship.hardpoints) {
    const cur = state.hardpoints[h.id];
    if (cur === undefined || cur === null) {
      state.hardpoints[h.id] = newSlot();
    } else if (typeof cur === 'string') {
      state.hardpoints[h.id] = newSlot(cur);
    } else if (typeof cur !== 'object') {
      state.hardpoints[h.id] = newSlot();
    } else {
      if (cur.weaponId === undefined) cur.weaponId = null;
      if (cur.active === undefined) cur.active = false;
      if (cur.lastFire === undefined) cur.lastFire = 0;
    }
  }
  for (const h of ship.hardpoints) {
    const slot = state.hardpoints[h.id];
    if (slot.weaponId && !state.cargo.weapons.includes(slot.weaponId)) {
      slot.weaponId = null;
      slot.active = false;
    }
  }
}

export function usedSlots(cargo) {
  return cargo.weapons.length
    + cargo.exotics.length
    + Math.ceil((cargo.scrap || 0) / CARGO.scrapPerSlot)
    + Math.ceil((cargo.ore || 0) / CARGO.orePerSlot);
}

export function maxSlots(state) {
  return SHIPS[state.currentShipId].cargoSlots;
}

export function freeSlots(state) {
  return maxSlots(state) - usedSlots(state.cargo);
}

function stackWouldFit(state, currentQty, additional, perSlot, otherKindQty, otherKindPerSlot) {
  const c = state.cargo;
  const newQty = currentQty + additional;
  const otherSlots = Math.ceil(otherKindQty / otherKindPerSlot);
  const newSlotCount = c.weapons.length + c.exotics.length + Math.ceil(newQty / perSlot) + otherSlots;
  return newSlotCount <= maxSlots(state);
}

export function canAdd(state, kind, id) {
  if (kind === 'weapon') {
    if (state.cargo.weapons.includes(id)) return false;
    return freeSlots(state) >= 1;
  }
  if (kind === 'exotic') return freeSlots(state) >= 1;
  if (kind === 'scrap') return stackWouldFit(state, state.cargo.scrap, 1, CARGO.scrapPerSlot, state.cargo.ore || 0, CARGO.orePerSlot);
  if (kind === 'ore') return stackWouldFit(state, state.cargo.ore || 0, 1, CARGO.orePerSlot, state.cargo.scrap, CARGO.scrapPerSlot);
  return false;
}

export function addItem(state, kind, id, qty = 1) {
  if (kind === 'weapon') {
    if (state.cargo.weapons.includes(id)) return false;
    if (freeSlots(state) < 1) return false;
    state.cargo.weapons.push(id);
    if (state.ammo[id] === undefined) state.ammo[id] = STARTING_AMMO[id] ?? Infinity;
    return true;
  }
  if (kind === 'exotic') {
    if (freeSlots(state) < 1) return false;
    state.cargo.exotics.push(id);
    return true;
  }
  if (kind === 'scrap') {
    if (!stackWouldFit(state, state.cargo.scrap, qty, CARGO.scrapPerSlot, state.cargo.ore || 0, CARGO.orePerSlot)) {
      const otherSlots = Math.ceil((state.cargo.ore || 0) / CARGO.orePerSlot);
      const room = (maxSlots(state) - state.cargo.weapons.length - state.cargo.exotics.length - otherSlots) * CARGO.scrapPerSlot;
      const fit = Math.max(0, room - state.cargo.scrap);
      if (fit <= 0) return false;
      state.cargo.scrap += fit;
      return fit;
    }
    state.cargo.scrap += qty;
    return qty;
  }
  if (kind === 'ore') {
    state.cargo.ore = state.cargo.ore || 0;
    if (!stackWouldFit(state, state.cargo.ore, qty, CARGO.orePerSlot, state.cargo.scrap, CARGO.scrapPerSlot)) {
      const otherSlots = Math.ceil(state.cargo.scrap / CARGO.scrapPerSlot);
      const room = (maxSlots(state) - state.cargo.weapons.length - state.cargo.exotics.length - otherSlots) * CARGO.orePerSlot;
      const fit = Math.max(0, room - state.cargo.ore);
      if (fit <= 0) return false;
      state.cargo.ore += fit;
      return fit;
    }
    state.cargo.ore += qty;
    return qty;
  }
  return false;
}

export function sellItem(state, kind, idOrIndex) {
  if (kind === 'weapon') {
    const id = idOrIndex;
    if (!state.cargo.weapons.includes(id)) return 0;
    if (id === state.currentWeapon && state.cargo.weapons.length === 1) return 0;
    state.cargo.weapons = state.cargo.weapons.filter((w) => w !== id);
    delete state.ammo[id];
    if (state.currentWeapon === id) {
      state.currentWeapon = state.cargo.weapons[0] ?? 'blaster';
    }
    const value = Math.floor((WEAPONS[id]?.cost ?? 0) * DROPS.weaponSellRatio);
    state.credits += value;
    return value;
  }
  if (kind === 'exotic') {
    const idx = idOrIndex;
    const id = state.cargo.exotics[idx];
    if (!id) return 0;
    state.cargo.exotics.splice(idx, 1);
    const value = EXOTICS[id]?.value ?? 0;
    state.credits += value;
    return value;
  }
  if (kind === 'scrap') {
    const value = state.cargo.scrap * DROPS.scrapValueOre;
    state.credits += value;
    state.cargo.scrap = 0;
    return value;
  }
  if (kind === 'ore') {
    const value = state.cargo.ore || 0;
    state.credits += value;
    state.cargo.ore = 0;
    return value;
  }
  return 0;
}

export function autoSellOverflow(state, newShipId) {
  const newSlots = SHIPS[newShipId].cargoSlots;
  let oreEarned = 0;
  let itemsSold = 0;
  while (state.cargo.exotics.length > 0
      && state.cargo.weapons.length + state.cargo.exotics.length + Math.ceil(state.cargo.scrap / CARGO.scrapPerSlot) > newSlots) {
    const id = state.cargo.exotics.pop();
    oreEarned += Math.floor((EXOTICS[id]?.value ?? 0) * 0.5);
    itemsSold++;
  }
  while (state.cargo.weapons.length > 1
      && state.cargo.weapons.length + state.cargo.exotics.length + Math.ceil(state.cargo.scrap / CARGO.scrapPerSlot) > newSlots) {
    const id = state.cargo.weapons.pop();
    if (id !== 'blaster') {
      oreEarned += Math.floor((WEAPONS[id]?.cost ?? 0) * DROPS.weaponSellRatio * 0.5);
      delete state.ammo[id];
      itemsSold++;
    }
  }
  while (state.cargo.weapons.length + state.cargo.exotics.length + Math.ceil(state.cargo.scrap / CARGO.scrapPerSlot) > newSlots) {
    const reduce = Math.min(state.cargo.scrap, CARGO.scrapPerSlot);
    if (reduce <= 0) break;
    state.cargo.scrap -= reduce;
    oreEarned += Math.floor(reduce * DROPS.scrapValueOre * 0.5);
    itemsSold += reduce;
  }
  state.credits += oreEarned;
  if (!state.cargo.weapons.includes(state.currentWeapon)) {
    state.currentWeapon = state.cargo.weapons[0] ?? 'blaster';
  }
  return { oreEarned, itemsSold };
}

export function pickWeightedExotic() {
  const total = Object.values(EXOTICS).reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of Object.values(EXOTICS)) {
    if (r < e.weight) return e.id;
    r -= e.weight;
  }
  return 'crystalline';
}

export function pickRandomWeapon() {
  return DROPS.weaponPool[Math.floor(Math.random() * DROPS.weaponPool.length)];
}
