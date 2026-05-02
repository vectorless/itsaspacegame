import Phaser from 'phaser';
import { ENEMY, ELITE, WORLD_W, WORLD_H, DROPS } from './constants.js';
import { spawnScrap, spawnExotic, spawnWeaponDrop } from './ore.js';
import { pickWeightedExotic, pickRandomWeapon } from './cargo.js';

export function spawnEnemyAtRing(scene) {
  const ship = scene.controller;
  const ang = Math.random() * Math.PI * 2;
  const dist = Phaser.Math.FloatBetween(ENEMY.spawnRingMin, ENEMY.spawnRingMax);
  let x = ship.x + Math.cos(ang) * dist;
  let y = ship.y + Math.sin(ang) * dist;
  x = Phaser.Math.Clamp(x, 80, WORLD_W - 80);
  y = Phaser.Math.Clamp(y, 80, WORLD_H - 80);
  return spawnEnemy(scene, x, y);
}

export function spawnEnemy(scene, x, y) {
  const e = scene.enemies.create(x, y, 'enemy_ship');
  e.setDepth(8);
  e.kind = 'regular';
  e.hp = ENEMY.hp;
  e.fireCooldown = 0;
  e.body.setCircle(ENEMY.radius, e.width / 2 - ENEMY.radius, e.height / 2 - ENEMY.radius);
  e.body.setCollideWorldBounds(true);
  return e;
}

export function spawnEliteAtRing(scene) {
  const ship = scene.controller;
  const ang = Math.random() * Math.PI * 2;
  const dist = Phaser.Math.FloatBetween(ENEMY.spawnRingMin, ENEMY.spawnRingMax);
  let x = ship.x + Math.cos(ang) * dist;
  let y = ship.y + Math.sin(ang) * dist;
  x = Phaser.Math.Clamp(x, 120, WORLD_W - 120);
  y = Phaser.Math.Clamp(y, 120, WORLD_H - 120);
  return spawnElite(scene, x, y);
}

export function spawnElite(scene, x, y) {
  const e = scene.enemies.create(x, y, 'elite_ship');
  e.setDepth(8);
  e.kind = 'elite';
  e.hp = ELITE.hp;
  e.fireCooldown = 0;
  e.body.setCircle(ELITE.radius, e.width / 2 - ELITE.radius, e.height / 2 - ELITE.radius);
  e.body.setCollideWorldBounds(true);
  return e;
}

export function updateEnemies(scene, time, dtSec) {
  const ship = scene.controller;
  const view = scene.cameras.main.worldView;
  scene.enemies.children.iterate((e) => {
    if (!e || !e.active) return;
    const cfg = e.kind === 'elite' ? ELITE : ENEMY;

    if (!view.contains(e.x, e.y)) {
      e.body.velocity.x *= 0.985;
      e.body.velocity.y *= 0.985;
      return;
    }

    const dx = ship.x - e.x;
    const dy = ship.y - e.y;
    const d = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);

    let diff = Phaser.Math.Angle.Wrap(targetAngle - e.rotation);
    const turn = Phaser.Math.Clamp(diff, -cfg.rotSpeed * dtSec, cfg.rotSpeed * dtSec);
    e.setRotation(e.rotation + turn);

    let thrust = 0;
    if (d > cfg.engageRange) thrust = 1;
    else if (d < cfg.fleeRange) thrust = -0.6;

    if (thrust !== 0) {
      const ang = e.rotation;
      e.body.velocity.x += Math.cos(ang) * cfg.accel * dtSec * thrust;
      e.body.velocity.y += Math.sin(ang) * cfg.accel * dtSec * thrust;
    } else {
      e.body.velocity.x *= 0.985;
      e.body.velocity.y *= 0.985;
    }

    const sp = Math.hypot(e.body.velocity.x, e.body.velocity.y);
    if (sp > cfg.maxSpeed) {
      const k = cfg.maxSpeed / sp;
      e.body.velocity.x *= k;
      e.body.velocity.y *= k;
    }

    if (d < cfg.fireRange && Math.abs(diff) < 0.25 && time > e.fireCooldown) {
      fireEnemyBullet(scene, e, cfg);
      e.fireCooldown = time + cfg.fireCooldownMs;
    }
  });
}

function fireEnemyBullet(scene, e, cfg) {
  if (e.kind === 'elite') {
    fireOne(scene, e, e.rotation - 0.1, cfg);
    fireOne(scene, e, e.rotation + 0.1, cfg);
  } else {
    fireOne(scene, e, e.rotation, cfg);
  }
}

function fireOne(scene, e, ang, cfg) {
  const b = scene.enemyBullets.get();
  if (!b) return;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  b.setActive(true).setVisible(true);
  b.body.enable = true;
  b.setPosition(e.x + dx * 16, e.y + dy * 16);
  b.setRotation(ang);
  b.setVelocity(dx * cfg.bulletSpeed, dy * cfg.bulletSpeed);
  b.expireAt = scene.time.now + ENEMY.bulletTTLms;
  b.damage = cfg.bulletDamage;
}

export function damageEnemy(scene, enemy, dmg) {
  enemy.hp -= dmg;
  scene.tweens.add({
    targets: enemy, alpha: 0.4, duration: 60, yoyo: true,
    onComplete: () => enemy.setAlpha(1)
  });
  if (enemy.hp <= 0) destroyEnemy(scene, enemy);
}

function destroyEnemy(scene, enemy) {
  const isElite = enemy.kind === 'elite';
  const drop = isElite ? DROPS.elite : DROPS.regular;

  const scrapCount = Phaser.Math.Between(drop.scrapMin, drop.scrapMax);
  for (let i = 0; i < scrapCount; i++) spawnScrap(scene, enemy.x, enemy.y);

  if (drop.exoticChance > 0 && Math.random() < drop.exoticChance) {
    spawnExotic(scene, enemy.x, enemy.y, pickWeightedExotic());
  }
  if (drop.weaponChance > 0 && Math.random() < drop.weaponChance) {
    spawnWeaponDrop(scene, enemy.x, enemy.y, pickRandomWeapon());
  }

  if (isElite && !scene.gameState.hasPortalDevice) {
    scene.spawnPortalDevice(enemy.x, enemy.y);
  }
  scene.cameras.main.shake(isElite ? 220 : 120, isElite ? 0.008 : 0.004);
  enemy.disableBody(true, true);
  enemy.destroy();
}
