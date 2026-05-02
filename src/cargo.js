import { CARGO, SHIPS, EXOTICS, DROPS, MISSILE, HOMING } from './constants.js';
import { WEAPONS, STARTING_AMMO } from './weapons.js';

export function freshCargo() {
  return { weapons: ['blaster', 'missile'], exotics: [], scrap: 0 };
}

export function freshAmmo() {
  return { blaster: Infinity, missile: MISSILE.startAmmo };
}

export function usedSlots(cargo) {
  return cargo.weapons.length + cargo.exotics.length + Math.ceil(cargo.scrap / CARGO.scrapPerSlot);
}

export function maxSlots(state) {
  return SHIPS[state.currentShipId].cargoSlots;
}

export function freeSlots(state) {
  return maxSlots(state) - usedSlots(state.cargo);
}

function scrapWouldFit(state, additional) {
  const c = state.cargo;
  const newScrap = c.scrap + additional;
  const newSlotCount = c.weapons.length + c.exotics.length + Math.ceil(newScrap / CARGO.scrapPerSlot);
  return newSlotCount <= maxSlots(state);
}

export function canAdd(state, kind, id) {
  if (kind === 'weapon') {
    if (state.cargo.weapons.includes(id)) return false;
    return freeSlots(state) >= 1;
  }
  if (kind === 'exotic') return freeSlots(state) >= 1;
  if (kind === 'scrap') return scrapWouldFit(state, 1);
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
    if (!scrapWouldFit(state, qty)) {
      const room = (maxSlots(state) - state.cargo.weapons.length - state.cargo.exotics.length) * CARGO.scrapPerSlot;
      const fit = Math.max(0, room - state.cargo.scrap);
      if (fit <= 0) return false;
      state.cargo.scrap += fit;
      return fit;
    }
    state.cargo.scrap += qty;
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
    state.ore += value;
    return value;
  }
  if (kind === 'exotic') {
    const idx = idOrIndex;
    const id = state.cargo.exotics[idx];
    if (!id) return 0;
    state.cargo.exotics.splice(idx, 1);
    const value = EXOTICS[id]?.value ?? 0;
    state.ore += value;
    return value;
  }
  if (kind === 'scrap') {
    const value = state.cargo.scrap * DROPS.scrapValueOre;
    state.ore += value;
    state.cargo.scrap = 0;
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
  state.ore += oreEarned;
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
