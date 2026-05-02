import { BLASTER, MISSILE, SPREAD, HOMING, RAILGUN, MINING_LASER } from './constants.js';

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

function fireBlaster(scene, ship) {
  const aim = ship.aimAngle ?? ship.angle;
  shoot(scene.bullets, ship, aim, BLASTER.projSpeed, BLASTER.ttlMs, BLASTER.damage);
}

function fireMissile(scene, ship) {
  const aim = ship.aimAngle ?? ship.angle;
  shoot(scene.missiles, ship, aim, MISSILE.projSpeed, MISSILE.ttlMs, MISSILE.damage);
}

function fireSpread(scene, ship) {
  const aim = ship.angle;
  const n = SPREAD.count;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) - 0.5;
    shoot(scene.bullets, ship, aim + t * SPREAD.fanRad, SPREAD.projSpeed, SPREAD.ttlMs, SPREAD.damage);
  }
}

function fireHoming(scene, ship) {
  const aim = ship.aimAngle ?? ship.angle;
  shoot(scene.missiles, ship, aim, HOMING.projSpeed, HOMING.ttlMs, HOMING.damage, { homing: true });
}

function fireRailgun(scene, ship) {
  const aim = ship.aimAngle ?? ship.angle;
  shoot(scene.railShots, ship, aim, RAILGUN.projSpeed, RAILGUN.ttlMs, RAILGUN.damage, { pierces: RAILGUN.pierces });
  scene.cameras.main.shake(80, 0.003);
}

export const WEAPONS = {
  blaster: {
    id: 'blaster', name: 'Blaster',
    desc: 'Standard rapid-fire',
    cooldownMs: BLASTER.cooldownMs, fire: fireBlaster, cost: 0
  },
  mining_laser: {
    id: 'mining_laser', name: 'Mining Laser',
    desc: 'Continuous beam, extracts ore (no fragment)',
    cooldownMs: 0, fire: null, cost: 0
  },
  missile: {
    id: 'missile', name: 'Missile',
    desc: 'Heavy dumb-fire',
    cooldownMs: MISSILE.cooldownMs, fire: fireMissile, cost: 25
  },
  spread: {
    id: 'spread', name: 'Scatter',
    desc: '5-bullet fan, infinite ammo',
    cooldownMs: SPREAD.cooldownMs, fire: fireSpread, cost: SPREAD.cost
  },
  homing: {
    id: 'homing', name: 'Homing',
    desc: 'Heat-seeking, hunts enemies',
    cooldownMs: HOMING.cooldownMs, fire: fireHoming, cost: HOMING.cost
  },
  railgun: {
    id: 'railgun', name: 'Railgun',
    desc: 'Slow, pierces 3 targets',
    cooldownMs: RAILGUN.cooldownMs, fire: fireRailgun, cost: RAILGUN.cost
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

export function nextWeaponId(currentId, owned) {
  if (!owned || owned.length === 0) return currentId;
  const i = owned.indexOf(currentId);
  if (i === -1) return owned[0];
  return owned[(i + 1) % owned.length];
}
