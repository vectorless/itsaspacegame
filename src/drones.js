import Phaser from 'phaser';
import { DRONE, DROPS } from './constants.js';
import { spawnScrap } from './ore.js';

export function spawnDroneSwarm(scene, cx, cy) {
  for (let i = 0; i < DRONE.swarmSize; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Phaser.Math.FloatBetween(20, 60);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const d = scene.drones.create(x, y, 'drone');
    d.setDepth(8);
    d.hp = DRONE.hp;
    d.fireCooldown = scene.time.now + Phaser.Math.Between(400, 1800);
    d.body.setCircle(DRONE.radius, d.width / 2 - DRONE.radius, d.height / 2 - DRONE.radius);
    d.body.setCollideWorldBounds(true);
    d.body.setBounce(1, 1);
    const ang = Math.random() * Math.PI * 2;
    d.body.setVelocity(Math.cos(ang) * 60, Math.sin(ang) * 60);
  }
}

export function updateDrones(scene, time, dtSec) {
  const ship = scene.controller;
  const view = scene.cameras.main.worldView;
  const list = scene.drones.getChildren().filter((d) => d.active);
  if (list.length === 0) return;

  const sepR2 = DRONE.separationRadius * DRONE.separationRadius;
  const flockR2 = DRONE.flockRadius * DRONE.flockRadius;

  for (const d of list) {
    if (!view.contains(d.x, d.y)) {
      d.body.velocity.x *= 0.985;
      d.body.velocity.y *= 0.985;
      continue;
    }
    let sepX = 0, sepY = 0;
    let aliX = 0, aliY = 0;
    let cohX = 0, cohY = 0;
    let aliN = 0, cohN = 0;

    for (const o of list) {
      if (o === d) continue;
      const dx = d.x - o.x;
      const dy = d.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < sepR2 && d2 > 0.01) {
        const inv = 1 / d2;
        sepX += dx * inv;
        sepY += dy * inv;
      }
      if (d2 < flockR2) {
        aliX += o.body.velocity.x;
        aliY += o.body.velocity.y;
        aliN++;
        cohX += o.x;
        cohY += o.y;
        cohN++;
      }
    }

    let alignAx = 0, alignAy = 0;
    if (aliN > 0) {
      aliX /= aliN; aliY /= aliN;
      const aLen = Math.hypot(aliX, aliY) || 1;
      alignAx = (aliX / aLen) * DRONE.alignmentWeight;
      alignAy = (aliY / aLen) * DRONE.alignmentWeight;
    }

    let cohAx = 0, cohAy = 0;
    if (cohN > 0) {
      cohX /= cohN; cohY /= cohN;
      const dx = cohX - d.x;
      const dy = cohY - d.y;
      const cLen = Math.hypot(dx, dy) || 1;
      cohAx = (dx / cLen) * DRONE.cohesionWeight;
      cohAy = (dy / cLen) * DRONE.cohesionWeight;
    }

    const sLen = Math.hypot(sepX, sepY) || 1;
    const sepAx = (sepX / sLen) * DRONE.separationWeight;
    const sepAy = (sepY / sLen) * DRONE.separationWeight;

    const dxs = ship.x - d.x;
    const dys = ship.y - d.y;
    const sLen2 = Math.hypot(dxs, dys) || 1;
    const seekAx = (dxs / sLen2) * DRONE.seekWeight;
    const seekAy = (dys / sLen2) * DRONE.seekWeight;

    const ax = (sepAx + alignAx + cohAx + seekAx) * DRONE.accel;
    const ay = (sepAy + alignAy + cohAy + seekAy) * DRONE.accel;
    d.body.velocity.x += ax * dtSec;
    d.body.velocity.y += ay * dtSec;

    const sp = Math.hypot(d.body.velocity.x, d.body.velocity.y);
    if (sp > DRONE.maxSpeed) {
      const k = DRONE.maxSpeed / sp;
      d.body.velocity.x *= k;
      d.body.velocity.y *= k;
    }
    d.setRotation(Math.atan2(d.body.velocity.y, d.body.velocity.x));

    const dShip = Math.hypot(dxs, dys);
    if (dShip < DRONE.fireRange && time > d.fireCooldown) {
      fireDroneBullet(scene, d, dxs, dys, dShip);
      d.fireCooldown = time + DRONE.fireCooldownMs + Phaser.Math.Between(-300, 600);
    }
  }
}

function fireDroneBullet(scene, drone, dx, dy, dist) {
  const b = scene.enemyBullets.get();
  if (!b) return;
  const nx = dx / dist;
  const ny = dy / dist;
  b.setActive(true).setVisible(true);
  b.body.enable = true;
  b.setPosition(drone.x + nx * 8, drone.y + ny * 8);
  b.setRotation(Math.atan2(ny, nx));
  b.setVelocity(nx * DRONE.bulletSpeed, ny * DRONE.bulletSpeed);
  b.expireAt = scene.time.now + 1400;
  b.damage = DRONE.bulletDamage;
}

export function damageDrone(scene, drone, dmg) {
  drone.hp -= dmg;
  if (drone.hp <= 0) {
    const x = drone.x, y = drone.y;
    const drop = DROPS.drone;
    const n = Phaser.Math.Between(drop.scrapMin, drop.scrapMax);
    for (let i = 0; i < n; i++) spawnScrap(scene, x, y);
    scene.tweens.add({ targets: drone, alpha: 0, duration: 80, onComplete: () => {
      drone.disableBody(true, true);
      drone.destroy();
    }});
  } else {
    scene.tweens.add({ targets: drone, alpha: 0.4, duration: 50, yoyo: true });
  }
}
