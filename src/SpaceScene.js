import Phaser from 'phaser';
import {
  VIEW_W, VIEW_H, WORLD_W, WORLD_H,
  ASTEROID_COUNT, MISSILE, BLASTER, RAILGUN, HOMING,
  STATION, SHIP, SHIPS, DAMAGE, ENEMY, ELITE, DRONE, PORTAL, LEVEL, COLORS, LANDING, STARBASE_PADS
} from './constants.js';
import ShipController from './ShipController.js';
import { WEAPONS, nextWeaponId } from './weapons.js';
import { spawnAsteroid, damageAsteroid } from './asteroids.js';
import { updateOre } from './ore.js';
import { freshCargo, freshAmmo } from './cargo.js';
import { spawnEnemyAtRing, spawnElite, updateEnemies, damageEnemy } from './enemy.js';
import { spawnDroneSwarm, updateDrones, damageDrone } from './drones.js';

class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);
    this.expireAt = 0;
    this.damage = 1;
    this.homing = false;
    this.piercesLeft = 1;
    this.hitTargets = null;
  }
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (time >= this.expireAt) { this.disableBody(true, true); return; }
    if (this.homing) this.steerHoming(delta / 1000);
  }
  steerHoming(dtSec) {
    const target = nearestActive(this.scene.enemies, this.x, this.y);
    if (!target) return;
    const ta = Math.atan2(target.y - this.y, target.x - this.x);
    const cur = Math.atan2(this.body.velocity.y, this.body.velocity.x);
    const diff = Phaser.Math.Angle.Wrap(ta - cur);
    const turn = Phaser.Math.Clamp(diff, -HOMING.turnRate * dtSec, HOMING.turnRate * dtSec);
    const nu = cur + turn;
    const speed = Math.hypot(this.body.velocity.x, this.body.velocity.y);
    this.body.velocity.x = Math.cos(nu) * speed;
    this.body.velocity.y = Math.sin(nu) * speed;
    this.setRotation(nu);
  }
}

function nearestActive(group, x, y) {
  let best = null, bestD2 = Infinity;
  group.children.iterate((e) => {
    if (!e || !e.active) return;
    const dx = e.x - x, dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = e; }
  });
  return best;
}

export default class SpaceScene extends Phaser.Scene {
  constructor() { super('SpaceScene'); }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.input.mouse.disableContextMenu();

    this.starsFar = this.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'stars_far')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-20);
    this.starsNear = this.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'stars_near')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-19);

    const state = this.registry.get('gameState') ?? this.freshState();
    this.registry.set('gameState', state);
    this.gameState = state;

    this.asteroidGroup = this.physics.add.group();
    const asteroidsThisLevel = ASTEROID_COUNT + LEVEL.asteroidsPerLevel * (state.level - 1);
    for (let i = 0; i < asteroidsThisLevel; i++) {
      const x = Phaser.Math.Between(200, WORLD_W - 200);
      const y = Phaser.Math.Between(200, WORLD_H - 200);
      const scale = Phaser.Math.FloatBetween(0.7, 1.4);
      spawnAsteroid(this, x, y, scale);
    }

    this.collectables = this.physics.add.group({ allowGravity: false });

    this.stations = [];
    this.spawnStation();

    this.spawnPortal();

    const shipCfg = SHIPS[state.currentShipId];
    this.controller = new ShipController(WORLD_W / 2, WORLD_H / 2, shipCfg);
    this.thruster = this.add.image(this.controller.x, this.controller.y, 'thruster')
      .setOrigin(0, 0.5)
      .setDepth(9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.retroL = this.add.image(0, 0, 'thruster')
      .setOrigin(0, 0.5).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.retroR = this.add.image(0, 0, 'thruster')
      .setOrigin(0, 0.5).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.ship = this.physics.add.image(this.controller.x, this.controller.y, shipCfg.sprite).setDepth(10);
    this.applyShipBody(shipCfg);
    this.ship.body.setAllowGravity(false);

    this.crosshair = this.add.image(this.scale.width / 2, this.scale.height / 2, 'crosshair')
      .setScrollFactor(0)
      .setDepth(1000);
    this.input.setDefaultCursor('none');

    this.cameras.main.startFollow(this.ship, true, 0.12, 0.12);

    this.bullets = this.physics.add.group({
      classType: Projectile, defaultKey: 'bullet',
      maxSize: BLASTER.poolMax, runChildUpdate: true
    });
    this.missiles = this.physics.add.group({
      classType: Projectile, defaultKey: 'missile',
      maxSize: MISSILE.poolMax, runChildUpdate: true
    });
    this.railShots = this.physics.add.group({
      classType: Projectile, defaultKey: 'railshot',
      maxSize: RAILGUN.poolMax, runChildUpdate: true
    });
    this.enemies = this.physics.add.group({ allowGravity: false });
    this.drones = this.physics.add.group({ allowGravity: false });
    this.enemyBullets = this.physics.add.group({
      classType: Projectile, defaultKey: 'enemy_bullet',
      maxSize: ENEMY.bulletPoolMax, runChildUpdate: true
    });
    this.portalDevices = this.physics.add.group({ allowGravity: false });

    this.physics.add.overlap(this.bullets, this.asteroidGroup, this.onProjHitAsteroid, null, this);
    this.physics.add.overlap(this.missiles, this.asteroidGroup, this.onProjHitAsteroid, null, this);
    this.physics.add.overlap(this.railShots, this.asteroidGroup, this.onProjHitAsteroid, null, this);
    this.physics.add.overlap(this.bullets, this.enemies, this.onProjHitEnemy, null, this);
    this.physics.add.overlap(this.missiles, this.enemies, this.onProjHitEnemy, null, this);
    this.physics.add.overlap(this.railShots, this.enemies, this.onProjHitEnemy, null, this);
    this.physics.add.overlap(this.bullets, this.drones, this.onProjHitDrone, null, this);
    this.physics.add.overlap(this.missiles, this.drones, this.onProjHitDrone, null, this);
    this.physics.add.overlap(this.railShots, this.drones, this.onProjHitDrone, null, this);
    this.physics.add.overlap(this.ship, this.asteroidGroup, this.onShipHitAsteroid, null, this);
    this.physics.add.overlap(this.ship, this.enemies, this.onShipHitEnemy, null, this);
    this.physics.add.overlap(this.ship, this.drones, this.onShipHitDrone, null, this);
    this.physics.add.overlap(this.ship, this.enemyBullets, this.onShipHitEnemyBullet, null, this);
    this.physics.add.overlap(this.ship, this.portalDevices, this.onShipPickupDevice, null, this);
    for (const st of this.stations) {
      this.physics.add.overlap(this.ship, st, this.onShipDockBase, null, this);
    }

    this.keys = this.input.keyboard.addKeys('A,D,W,S,SPACE,E');
    this.lastFireTime = 0;
    this.lastHitTime = -10000;
    this.dockCooldownUntil = this.time.now + LANDING.dockCooldownMs;

    this.events.on('resume', () => {
      this.dockCooldownUntil = this.time.now + LANDING.dockCooldownMs;
    });

    this.swarmHadDrones = false;
    this.eliteSpawnedFromSwarm = false;

    this.scheduleNextEnemySpawn();
  }

  freshState() {
    const shipId = 'cruiser';
    const ship = SHIPS[shipId];
    return {
      currentShipId: shipId,
      currentWeapon: 'blaster',
      cargo: freshCargo(),
      ammo: freshAmmo(),
      speed: 0,
      ore: 0,
      shield: ship.maxShield,
      maxShield: ship.maxShield,
      hull: ship.maxHull,
      maxHull: ship.maxHull,
      gameOver: false,
      level: 1,
      hasPortalDevice: false,
      magnetLevel: 1,
      shieldLevel: 0
    };
  }

  applyShipBody(shipCfg) {
    const r = shipCfg.radius;
    this.ship.body.setCircle(r, this.ship.width / 2 - r, this.ship.height / 2 - r);
  }

  swapShip(newShipId) {
    const cfg = SHIPS[newShipId];
    this.gameState.currentShipId = newShipId;
    this.controller.setShip(cfg);
    this.ship.setTexture(cfg.sprite);
    this.applyShipBody(cfg);
    const shieldBonus = (this.gameState.shieldLevel ?? 0) * 25;
    this.gameState.maxShield = cfg.maxShield + shieldBonus;
    this.gameState.maxHull = cfg.maxHull;
    this.gameState.shield = Math.min(this.gameState.shield, this.gameState.maxShield);
    this.gameState.hull = Math.min(this.gameState.hull, this.gameState.maxHull);
  }

  spawnStation() {
    const cx = WORLD_W / 2, cy = WORLD_H / 2;
    let x, y;
    do {
      x = Phaser.Math.Between(400, WORLD_W - 400);
      y = Phaser.Math.Between(400, WORLD_H - 400);
    } while (Phaser.Math.Distance.Between(x, y, cx, cy) < STATION.minDistFromCenter);
    const s = this.physics.add.staticImage(x, y, 'station').setDepth(2);
    this.stations.push(s);

    if (!this.stationInventory) {
      const padIdx = Math.min((this.gameState.level ?? 1) - 1, STARBASE_PADS.byLevel.length - 1);
      const pads = STARBASE_PADS.byLevel[padIdx] ?? 1;
      const pool = Object.keys(SHIPS).filter((id) => id !== this.gameState.currentShipId);
      Phaser.Utils.Array.Shuffle(pool);
      this.stationInventory = pool.slice(0, Math.max(1, pads));
    }

    this.add.text(x, y - 40, 'STAR BASE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cfe6ff'
    }).setOrigin(0.5).setDepth(2);
    this.add.text(x, y + 40, 'fly close to land', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#5a7090'
    }).setOrigin(0.5).setDepth(2);
  }

  spawnPortal() {
    const cx = WORLD_W / 2, cy = WORLD_H / 2;
    let x, y;
    do {
      x = Phaser.Math.Between(300, WORLD_W - 300);
      y = Phaser.Math.Between(300, WORLD_H - 300);
    } while (Phaser.Math.Distance.Between(x, y, cx, cy) < PORTAL.minDistFromShipStart);
    this.portal = this.add.image(x, y, 'portal_closed').setDepth(1);
    this.portalLabel = this.add.text(x, y - 76, 'WORMHOLE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#88c0e0'
    }).setOrigin(0.5).setDepth(1);
    this.portalSwarmTriggered = false;
  }

  spawnPortalDevice(x, y) {
    const d = this.portalDevices.create(x, y, 'portal_device');
    d.setDepth(6);
    const ang = Math.random() * Math.PI * 2;
    d.body.setVelocity(Math.cos(ang) * 40, Math.sin(ang) * 40);
    d.body.setCollideWorldBounds(true);
    d.body.setBounce(1, 1);
    d.body.setAngularVelocity(60);
    this.tweens.add({ targets: d, scale: 1.4, duration: 700, yoyo: true, repeat: -1 });
  }

  scheduleNextEnemySpawn() {
    const speedup = Math.pow(LEVEL.enemySpawnSpeedup, this.gameState.level - 1);
    const min = ENEMY.spawnDelayMinMs * speedup;
    const max = ENEMY.spawnDelayMaxMs * speedup;
    this.time.delayedCall(Phaser.Math.Between(min, max), () => {
      if (this.gameState.gameOver) return;
      const liveRegular = this.enemies.getChildren().filter((e) => e.active && e.kind === 'regular').length;
      if (liveRegular < ENEMY.maxAlive) spawnEnemyAtRing(this);
      this.scheduleNextEnemySpawn();
    });
  }

  openShop() {
    if (this.scene.isActive('ShopScene')) return;
    this.scene.pause();
    this.scene.launch('ShopScene');
  }

  onShipDockBase(_ship, _base) {
    if (this.gameState.gameOver) return;
    if (this.time.now < this.dockCooldownUntil) return;
    if (this.scene.isActive('LandingScene') || this.scene.isActive('ShopScene')) return;
    this.dockCooldownUntil = this.time.now + LANDING.dockCooldownMs;
    this.scene.pause();
    this.scene.launch('LandingScene');
  }

  onProjHitAsteroid(proj, asteroid) {
    if (!proj.active || !asteroid.active) return;
    if (proj.hitTargets && proj.hitTargets.has(asteroid)) return;
    proj.hitTargets?.add(asteroid);
    damageAsteroid(this, asteroid, proj.damage ?? 1, proj);
    this.consumePierce(proj);
  }

  onProjHitEnemy(proj, enemy) {
    if (!proj.active || !enemy.active) return;
    if (proj.hitTargets && proj.hitTargets.has(enemy)) return;
    proj.hitTargets?.add(enemy);
    damageEnemy(this, enemy, proj.damage ?? 1);
    this.consumePierce(proj);
  }

  onProjHitDrone(proj, drone) {
    if (!proj.active || !drone.active) return;
    if (proj.hitTargets && proj.hitTargets.has(drone)) return;
    proj.hitTargets?.add(drone);
    damageDrone(this, drone, proj.damage ?? 1);
    this.consumePierce(proj);
  }

  consumePierce(proj) {
    proj.piercesLeft = (proj.piercesLeft ?? 1) - 1;
    if (proj.piercesLeft <= 0) proj.disableBody(true, true);
  }

  onShipHitAsteroid(_ship, asteroid) {
    if (!asteroid.active || this.gameState.gameOver) return;
    const ax = asteroid.x, ay = asteroid.y;
    const dx = this.controller.x - ax;
    const dy = this.controller.y - ay;
    const d = Math.hypot(dx, dy) || 0.0001;
    const nx = dx / d, ny = dy / d;
    const aRadius = (asteroid.width * (asteroid.scaleValue || 1)) * 0.42;
    const penetration = (SHIPS[this.gameState.currentShipId].radius + aRadius) - d;
    if (penetration > 0) {
      this.controller.x += nx * penetration;
      this.controller.y += ny * penetration;
    }
    const c = this.controller;
    const av = asteroid.body.velocity;
    const relVx = c.vx - av.x;
    const relVy = c.vy - av.y;
    const vn = relVx * nx + relVy * ny;
    if (vn < 0) {
      const j = -(1 + SHIP.bounce) * vn;
      c.vx += j * nx;
      c.vy += j * ny;
    }
    const relSpeed = Math.hypot(relVx, relVy);
    const dmg = Phaser.Math.Clamp(
      Math.floor(relSpeed * DAMAGE.asteroidPerSpeedUnit),
      DAMAGE.asteroidMin, DAMAGE.asteroidMax
    );
    this.takeDamage(dmg);
  }

  onShipHitEnemy(_ship, enemy) {
    if (!enemy.active || this.gameState.gameOver) return;
    const cfg = enemy.kind === 'elite' ? ELITE : ENEMY;
    const dx = this.controller.x - enemy.x;
    const dy = this.controller.y - enemy.y;
    const d = Math.hypot(dx, dy) || 0.0001;
    const nx = dx / d, ny = dy / d;
    const penetration = (SHIPS[this.gameState.currentShipId].radius + cfg.radius) - d;
    if (penetration > 0) {
      this.controller.x += nx * penetration;
      this.controller.y += ny * penetration;
    }
    this.takeDamage(cfg.contactDamage);
    damageEnemy(this, enemy, 4);
  }

  onShipHitDrone(_ship, drone) {
    if (!drone.active || this.gameState.gameOver) return;
    this.takeDamage(DRONE.contactDamage);
    damageDrone(this, drone, 99);
  }

  onShipHitEnemyBullet(_ship, bullet) {
    if (!bullet.active || this.gameState.gameOver) return;
    bullet.disableBody(true, true);
    this.takeDamage(bullet.damage ?? ENEMY.bulletDamage);
  }

  onShipPickupDevice(_ship, device) {
    if (!device.active) return;
    device.disableBody(true, true);
    device.destroy();
    this.gameState.hasPortalDevice = true;
    this.cameras.main.flash(220, 200, 80, 220);
  }

  takeDamage(amount) {
    if (this.gameState.gameOver) return;
    if (this.time.now - this.lastHitTime < SHIP.hitCooldownMs) return;
    this.lastHitTime = this.time.now;
    let remaining = amount;
    if (this.gameState.shield > 0) {
      const absorb = Math.min(this.gameState.shield, remaining);
      this.gameState.shield -= absorb;
      remaining -= absorb;
    }
    if (remaining > 0) this.gameState.hull -= remaining;
    this.cameras.main.shake(140, 0.006);
    this.tweens.add({
      targets: this.ship, alpha: 0.3, duration: 60, yoyo: true,
      onComplete: () => this.ship.setAlpha(1)
    });
    if (this.gameState.hull <= 0) {
      this.gameState.hull = 0;
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    if (this.gameState.gameOver) return;
    this.gameState.gameOver = true;
    this.cameras.main.flash(400, 255, 80, 80);
    this.time.delayedCall(450, () => {
      this.scene.launch('GameOverScene', { ore: this.gameState.ore, level: this.gameState.level });
      this.scene.pause();
    });
  }

  regenShield(dtSec) {
    if (this.gameState.gameOver) return;
    if (this.time.now - this.lastHitTime < SHIP.shieldRegenDelayMs) return;
    if (this.gameState.shield >= this.gameState.maxShield) return;
    this.gameState.shield = Math.min(
      this.gameState.maxShield,
      this.gameState.shield + SHIP.shieldRegenPerSec * dtSec
    );
  }

  updatePortal() {
    const distToPortal = Phaser.Math.Distance.Between(
      this.controller.x, this.controller.y,
      this.portal.x, this.portal.y
    );
    const open = !!this.gameState.hasPortalDevice;
    this.portal.setTexture(open ? 'portal_open' : 'portal_closed');
    if (open) this.portal.setRotation(this.time.now * 0.0008);

    if (open && distToPortal < PORTAL.triggerRadius) {
      this.advanceLevel();
      return;
    }

    if (!this.portalSwarmTriggered && distToPortal < DRONE.triggerRadius) {
      this.portalSwarmTriggered = true;
      this.swarmHadDrones = true;
      this.eliteSpawnedFromSwarm = false;
      spawnDroneSwarm(this, this.portal.x, this.portal.y);
    } else if (this.portalSwarmTriggered && distToPortal > DRONE.resetRadius) {
      this.portalSwarmTriggered = false;
    }

    if (this.swarmHadDrones && !this.eliteSpawnedFromSwarm
        && this.drones.countActive(true) === 0) {
      this.eliteSpawnedFromSwarm = true;
      this.swarmHadDrones = false;
      const ang = Math.random() * Math.PI * 2;
      spawnElite(this, this.portal.x + Math.cos(ang) * 90, this.portal.y + Math.sin(ang) * 90);
      this.cameras.main.flash(220, 200, 80, 220);
      this.flashEliteWarning();
    }
  }

  flashEliteWarning() {
    const t = this.add.text(this.controller.x, this.controller.y - 80, 'ELITE INCOMING', {
      fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#ff60ff'
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: t, alpha: 0, y: t.y - 30, duration: 1400,
      onComplete: () => t.destroy()
    });
  }

  advanceLevel() {
    if (this.gameState.gameOver) return;
    const newLevel = this.gameState.level + 1;
    this.gameState.level = newLevel;
    this.gameState.hasPortalDevice = false;
    this.gameState.shield = this.gameState.maxShield;
    this.cameras.main.flash(600, 120, 220, 255);
    this.time.delayedCall(300, () => {
      this.scene.restart();
    });
  }

  update(time, deltaMs) {
    try {
      this._update(time, deltaMs);
    } catch (err) {
      console.error('[SpaceScene.update]', err, {
        ship: { x: this.controller?.x, y: this.controller?.y, vx: this.controller?.vx, vy: this.controller?.vy },
        cam: { sx: this.cameras?.main?.scrollX, sy: this.cameras?.main?.scrollY }
      });
    }
  }

  _update(time, deltaMs) {
    if (this.gameState.gameOver) return;
    const dt = deltaMs / 1000;
    const k = this.keys;

    this.controller.rotate(dt, k.A.isDown, k.D.isDown);
    this.controller.thrust(dt, k.W.isDown);
    this.controller.reverseThrust(dt, k.S.isDown);
    this.controller.integrate(dt);

    if (this.controller.x <= 0) { this.controller.x = 0; if (this.controller.vx < 0) this.controller.vx = 0; }
    else if (this.controller.x >= WORLD_W) { this.controller.x = WORLD_W; if (this.controller.vx > 0) this.controller.vx = 0; }
    if (this.controller.y <= 0) { this.controller.y = 0; if (this.controller.vy < 0) this.controller.vy = 0; }
    else if (this.controller.y >= WORLD_H) { this.controller.y = WORLD_H; if (this.controller.vy > 0) this.controller.vy = 0; }

    if (!Number.isFinite(this.controller.vx)) this.controller.vx = 0;
    if (!Number.isFinite(this.controller.vy)) this.controller.vy = 0;

    this.ship.setPosition(this.controller.x, this.controller.y);
    this.ship.setRotation(this.controller.angle);

    if (k.W.isDown) {
      const back = 14;
      this.thruster.setPosition(
        this.controller.x - Math.cos(this.controller.angle) * back,
        this.controller.y - Math.sin(this.controller.angle) * back
      );
      this.thruster.setRotation(this.controller.angle + Math.PI);
      this.thruster.setScale(0.85 + Math.random() * 0.3, 0.9 + Math.random() * 0.2);
      this.thruster.setAlpha(0.75 + Math.random() * 0.25);
      this.thruster.setVisible(true);
    } else {
      this.thruster.setVisible(false);
    }

    if (k.S.isDown) {
      const fwdX = Math.cos(this.controller.angle);
      const fwdY = Math.sin(this.controller.angle);
      const perpX = -fwdY;
      const perpY = fwdX;
      const sideOff = 9;
      const fwdOff = 4;
      this.retroL.setPosition(
        this.controller.x + perpX * sideOff + fwdX * fwdOff,
        this.controller.y + perpY * sideOff + fwdY * fwdOff
      );
      this.retroL.setRotation(this.controller.angle);
      this.retroL.setScale(0.45 + Math.random() * 0.2, 0.5 + Math.random() * 0.15);
      this.retroL.setAlpha(0.65 + Math.random() * 0.3);
      this.retroL.setVisible(true);

      this.retroR.setPosition(
        this.controller.x - perpX * sideOff + fwdX * fwdOff,
        this.controller.y - perpY * sideOff + fwdY * fwdOff
      );
      this.retroR.setRotation(this.controller.angle);
      this.retroR.setScale(0.45 + Math.random() * 0.2, 0.5 + Math.random() * 0.15);
      this.retroR.setAlpha(0.65 + Math.random() * 0.3);
      this.retroR.setVisible(true);
    } else {
      this.retroL.setVisible(false);
      this.retroR.setVisible(false);
    }

    const pointer = this.input.activePointer;
    const cam = this.cameras.main;
    const aimX = pointer.x + cam.scrollX;
    const aimY = pointer.y + cam.scrollY;
    this.controller.aimAngle = Math.atan2(aimY - this.controller.y, aimX - this.controller.x);
    this.crosshair.setPosition(pointer.x, pointer.y);

    this.starsFar.tilePositionX = this.cameras.main.scrollX * 0.2;
    this.starsFar.tilePositionY = this.cameras.main.scrollY * 0.2;
    this.starsNear.tilePositionX = this.cameras.main.scrollX * 0.5;
    this.starsNear.tilePositionY = this.cameras.main.scrollY * 0.5;

    if (Phaser.Input.Keyboard.JustDown(k.E)) {
      this.gameState.currentWeapon = nextWeaponId(
        this.gameState.currentWeapon,
        this.gameState.cargo.weapons
      );
    }

    const fireHeld = k.SPACE.isDown || pointer.leftButtonDown();
    if (fireHeld) {
      const weapon = WEAPONS[this.gameState.currentWeapon];
      if (time - this.lastFireTime >= weapon.cooldownMs) {
        const ammo = this.gameState.ammo[this.gameState.currentWeapon];
        if (ammo === undefined || ammo > 0) {
          weapon.fire(this, this.controller);
          if (Number.isFinite(ammo)) this.gameState.ammo[this.gameState.currentWeapon] = ammo - 1;
          this.lastFireTime = time;
        }
      }
    }

    updateOre(this, dt);
    updateEnemies(this, time, dt);
    updateDrones(this, time, dt);
    this.updatePortal();
    this.regenShield(dt);

    this.gameState.speed = this.controller.speed();
  }
}
