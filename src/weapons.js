import { BLASTER, MISSILE, SPREAD, HOMING, RAILGUN, MINING_LASER, WEAPON_UPGRADES } from './constants.js';

function shoot(group, ship, aim, speed, ttl, damage, opts = {}) {
  const proj = group.get();
  if (!proj) return null;
  const dx = Math.cos(aim);
  const dy = Math.sin(aim);
  proj.setActive(true).setVisible(true);
  proj.body.enable = true;
  proj.setPosition(ship.x + dx * 18, ship.y + dy * 18);
  proj.setRotation(aim);
  proj.setVelocity(ship.vx + dx * speed, ship.vy + dy * speed);
  proj.expireAt = group.scene.time.now + ttl;
  proj.damage = damage;
  proj.homing = !!opts.homing;
  proj.piercesLeft = opts.pierces ?? 1;
  proj.hitTargets = new Set();
  return proj;
}

function fireBlaster(scene, ship, aim, stats) {
  shoot(scene.bullets, ship, aim, stats.projSpeed, BLASTER.ttlMs, stats.damage);
}

function fireMissile(scene, ship, aim, stats) {
  shoot(scene.missiles, ship, aim, stats.projSpeed, MISSILE.ttlMs, stats.damage);
}

function fireSpread(scene, ship, aim, stats) {
  const n = stats.special ?? SPREAD.count;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) - 0.5;
    shoot(scene.bullets, ship, aim + t * SPREAD.fanRad, stats.projSpeed, SPREAD.ttlMs, stats.damage);
  }
}

function fireHoming(scene, ship, aim, stats) {
  const proj = shoot(scene.missiles, ship, aim, stats.projSpeed, HOMING.ttlMs, stats.damage, { homing: true });
  if (proj) proj.homingTurnRate = stats.special ?? HOMING.turnRate;
}

function fireRailgun(scene, ship, aim, stats) {
  shoot(scene.railShots, ship, aim, stats.projSpeed, RAILGUN.ttlMs, stats.damage, { pierces: stats.special ?? RAILGUN.pierces });
  scene.cameras.main.shake(80, 0.003);
}

export const WEAPONS = {
  blaster: {
    id: 'blaster', name: 'Blaster', short: 'BLAS',
    desc: 'Standard rapid-fire',
    cooldownMs: BLASTER.cooldownMs,
    damage: BLASTER.damage,
    projSpeed: BLASTER.projSpeed,
    fire: fireBlaster, cost: 0,
    special: {
      label: 'Heat Sink',
      desc: '−30 ms cooldown per level',
      maxLevel: 3,
      base: BLASTER.cooldownMs,
      apply: (base, lvl) => Math.max(40, base - lvl * 30),
      cost: (curLvl) => 90 * Math.pow(2, curLvl)
    }
  },
  mining_laser: {
    id: 'mining_laser', name: 'Mining Laser', short: 'LASR',
    desc: 'Continuous beam, extracts ore (no fragment)',
    cooldownMs: 0,
    damage: 0,
    projSpeed: MINING_LASER.range,
    fire: null, cost: 0,
    special: {
      label: 'Extraction',
      desc: '+0.5 ore/sec per level',
      maxLevel: 3,
      base: MINING_LASER.extractRatePerSec,
      apply: (base, lvl) => base + lvl * 0.5,
      cost: (curLvl) => 100 * Math.pow(3, curLvl)
    }
  },
  missile: {
    id: 'missile', name: 'Missile', short: 'MISL',
    desc: 'Heavy dumb-fire',
    cooldownMs: MISSILE.cooldownMs,
    damage: MISSILE.damage,
    projSpeed: MISSILE.projSpeed,
    fire: fireMissile, cost: 25,
    special: {
      label: 'Magazine',
      desc: '+4 max ammo per level',
      maxLevel: 3,
      base: MISSILE.startAmmo,
      apply: (base, lvl) => base + lvl * 4,
      cost: (curLvl) => 120 * Math.pow(2, curLvl)
    }
  },
  spread: {
    id: 'spread', name: 'Scatter', short: 'SPRD',
    desc: '5-bullet fan, infinite ammo',
    cooldownMs: SPREAD.cooldownMs,
    damage: SPREAD.damage,
    projSpeed: SPREAD.projSpeed,
    fire: fireSpread, cost: SPREAD.cost,
    special: {
      label: 'Pellets',
      desc: '+1 bullet per shot per level',
      maxLevel: 3,
      base: SPREAD.count,
      apply: (base, lvl) => base + lvl,
      cost: (curLvl) => 80 * Math.pow(3, curLvl)
    }
  },
  homing: {
    id: 'homing', name: 'Homing', short: 'HOM',
    desc: 'Heat-seeking, hunts enemies',
    cooldownMs: HOMING.cooldownMs,
    damage: HOMING.damage,
    projSpeed: HOMING.projSpeed,
    fire: fireHoming, cost: HOMING.cost,
    special: {
      label: 'Tracking',
      desc: '+1.5 turn rate per level',
      maxLevel: 3,
      base: HOMING.turnRate,
      apply: (base, lvl) => base + lvl * 1.5,
      cost: (curLvl) => 100 * Math.pow(3, curLvl)
    }
  },
  railgun: {
    id: 'railgun', name: 'Railgun', short: 'RAIL',
    desc: 'Slow, pierces 3 targets',
    cooldownMs: RAILGUN.cooldownMs,
    damage: RAILGUN.damage,
    projSpeed: RAILGUN.projSpeed,
    fire: fireRailgun, cost: RAILGUN.cost,
    special: {
      label: 'Penetration',
      desc: '+1 pierce per level',
      maxLevel: 2,
      base: RAILGUN.pierces,
      apply: (base, lvl) => base + lvl,
      cost: (curLvl) => 200 * Math.pow(3, curLvl)
    }
  }
};

export const STARTING_AMMO = {
  blaster: Infinity,
  mining_laser: Infinity,
  missile: MISSILE.startAmmo,
  spread: Infinity,
  homing: HOMING.startAmmo,
  railgun: Infinity
};

export function maxAmmoFor(weaponId, upgrades) {
  if (weaponId === 'missile') {
    const lvl = upgrades?.missile?.special ?? 0;
    return WEAPONS.missile.special.apply(MISSILE.startAmmo, lvl);
  }
  if (weaponId === 'homing') {
    return HOMING.startAmmo;
  }
  return STARTING_AMMO[weaponId];
}

export function effectiveStats(weaponId, upgrades) {
  const base = WEAPONS[weaponId];
  if (!base) return null;
  const u = upgrades?.[weaponId] ?? { damage: 0, rate: 0, range: 0, special: 0 };
  return {
    cooldownMs: WEAPON_UPGRADES.rate.apply(base.cooldownMs ?? 0, u.rate),
    damage: WEAPON_UPGRADES.damage.apply(base.damage ?? 1, u.damage),
    projSpeed: WEAPON_UPGRADES.range.apply(base.projSpeed ?? 1, u.range),
    special: base.special ? base.special.apply(base.special.base, u.special) : null
  };
}

export function nextWeaponId(currentId, owned) {
  if (!owned || owned.length === 0) return currentId;
  const i = owned.indexOf(currentId);
  if (i === -1) return owned[0];
  return owned[(i + 1) % owned.length];
}
