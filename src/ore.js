import Phaser from 'phaser';
import { ORE, MAGNET } from './constants.js';

export function spawnOre(scene, x, y) {
  const o = scene.oreGroup.create(x, y, 'ore');
  o.setDepth(5);
  const ang = Math.random() * Math.PI * 2;
  const speed = Phaser.Math.FloatBetween(ORE.driftSpeed * 0.6, ORE.driftSpeed * 1.4);
  o.body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
  o.body.setAngularVelocity(Phaser.Math.FloatBetween(-90, 90));
  o.body.setCollideWorldBounds(true);
  o.body.setBounce(1, 1);
  o.setRotation(Math.random() * Math.PI * 2);
  return o;
}

export function updateOre(scene, dtSec) {
  const ship = scene.controller;
  const colR2 = ORE.collectRadius * ORE.collectRadius;
  const lvl = scene.gameState.magnetLevel ?? 0;
  const magR = MAGNET.radiusByLevel[lvl] ?? 0;
  const magR2 = magR * magR;

  scene.oreGroup.children.iterate((o) => {
    if (!o || !o.active) return;
    const dx = ship.x - o.x;
    const dy = ship.y - o.y;
    const d2 = dx * dx + dy * dy;

    if (d2 < colR2) {
      scene.gameState.ore = (scene.gameState.ore || 0) + 1;
      o.disableBody(true, true);
      o.destroy();
      return;
    }

    if (lvl > 0 && d2 < magR2 && d2 > 0.01) {
      const d = Math.sqrt(d2);
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
