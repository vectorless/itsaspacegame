import Phaser from 'phaser';
import { ORE, MAGNET, EXOTICS } from './constants.js';
import { addItem, canAdd } from './cargo.js';

function spawnCollectable(scene, x, y, texture, kind, payload) {
  const o = scene.collectables.create(x, y, texture);
  o.setDepth(5);
  const ang = Math.random() * Math.PI * 2;
  const speed = Phaser.Math.FloatBetween(ORE.driftSpeed * 0.6, ORE.driftSpeed * 1.4);
  o.body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
  o.body.setAngularVelocity(Phaser.Math.FloatBetween(-90, 90));
  o.body.setCollideWorldBounds(true);
  o.body.setBounce(1, 1);
  o.setRotation(Math.random() * Math.PI * 2);
  o.kind = kind;
  o.payload = payload;
  o.locked = false;
  return o;
}

export function spawnOre(scene, x, y) {
  return spawnCollectable(scene, x, y, 'ore', 'ore', null);
}

export function spawnScrap(scene, x, y) {
  return spawnCollectable(scene, x, y, 'scrap', 'scrap', null);
}

export function spawnExotic(scene, x, y, exoticId) {
  const sprite = EXOTICS[exoticId]?.sprite ?? 'exotic_crystal';
  return spawnCollectable(scene, x, y, sprite, 'exotic', exoticId);
}

export function spawnWeaponDrop(scene, x, y, weaponId) {
  const tex = weaponId === 'spread' ? 'bullet'
            : weaponId === 'homing' ? 'missile'
            : weaponId === 'railgun' ? 'railshot'
            : 'bullet';
  const o = spawnCollectable(scene, x, y, tex, 'weapon', weaponId);
  o.setScale(1.5);
  return o;
}

function fitsCargo(state, c) {
  if (c.kind === 'ore') return canAdd(state, 'ore');
  if (c.kind === 'scrap') return canAdd(state, 'scrap');
  if (c.kind === 'exotic') return canAdd(state, 'exotic');
  if (c.kind === 'weapon') return canAdd(state, 'weapon', c.payload);
  return false;
}

function collect(scene, c) {
  const state = scene.gameState;
  if (c.kind === 'ore') return addItem(state, 'ore', null, 1) !== false;
  if (c.kind === 'scrap') return addItem(state, 'scrap', null, 1) !== false;
  if (c.kind === 'exotic') return addItem(state, 'exotic', c.payload);
  if (c.kind === 'weapon') return addItem(state, 'weapon', c.payload);
  return false;
}

export function updateOre(scene, dtSec) {
  const ship = scene.controller;
  const state = scene.gameState;
  const colR2 = ORE.collectRadius * ORE.collectRadius;
  const lvl = state.magnetLevel ?? 0;
  const magR = MAGNET.radiusByLevel[lvl] ?? 0;
  const magR2 = magR * magR;

  scene.collectables.children.iterate((o) => {
    if (!o || !o.active) return;
    const dx = ship.x - o.x;
    const dy = ship.y - o.y;
    const d2 = dx * dx + dy * dy;

    if (d2 < colR2) {
      if (collect(scene, o)) {
        o.disableBody(true, true);
        o.destroy();
      }
      return;
    }

    if (!o.locked && d2 < magR2 && fitsCargo(state, o)) {
      o.locked = true;
    }

    if (o.locked) {
      const d = Math.sqrt(d2) || 0.001;
      const ax = (dx / d) * MAGNET.accel;
      const ay = (dy / d) * MAGNET.accel;
      o.body.velocity.x += ax * dtSec;
      o.body.velocity.y += ay * dtSec;
      const sp = Math.hypot(o.body.velocity.x, o.body.velocity.y);
      if (sp > MAGNET.maxOreSpeed) {
        const k = MAGNET.maxOreSpeed / sp;
        o.body.velocity.x *= k;
        o.body.velocity.y *= k;
      }
    }
  });
}
