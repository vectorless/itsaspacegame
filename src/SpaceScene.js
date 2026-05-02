import Phaser from 'phaser';
import {
  VIEW_W, VIEW_H, WORLD_W, WORLD_H,
  ASTEROID_COUNT, MISSILE, BLASTER, RAILGUN, HOMING,
  STATION, SHIP, SHIPS, DAMAGE, ENEMY, ELITE, DRONE, PORTAL, LEVEL, COLORS, LANDING, STARBASE_PADS, BLACKHOLE, ENERGY, MINING_LASER, MARKETPLACE, MARKET_PRICE_VARIANCE
} from './constants.js';
import ShipController from './ShipController.js';
import { WEAPONS, nextWeaponId } from './weapons.js';
import { spawnAsteroid, damageAsteroid } from './asteroids.js';
import { updateOre } from './ore.js';
import { freshCargo, freshAmmo, autoEquipFromCargo, ensureHardpointsValid, getEquippedWeapons, addItem } from './cargo.js';
import { ensureGameState, resetAfterDeath, snapshotCargoToWreck, progressMission } from './state.js';
import { MISSIONS } from './missions.js';
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

    const state = ensureGameState(this.registry);
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
    this.spawnBlackhole();

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

    this.laserGfx = this.add.graphics().setDepth(11);
    this.miningExtractAccum = 0;

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
    this.wrecks = this.physics.add.group({ allowGravity: false });
    this.spawnDeathSites();

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
    this.physics.add.overlap(this.ship, this.wrecks, this.onShipHitWreck, null, this);
    for (const st of this.stations) {
      this.physics.add.overlap(this.ship, st, this.onShipDockBase, null, this);
    }
    this.spawnMissionZones();

    this.keys = this.input.keyboard.addKeys('A,D,W,S,F,SPACE,E');
    ensureHardpointsValid(this.gameState);
    this.lastFireTime = 0;
    this.lastHitTime = -10000;
    this.dockCooldownUntil = this.time.now + LANDING.dockCooldownMs;

    this.events.on('resume', () => {
      this.dockCooldownUntil = this.time.now + LANDING.dockCooldownMs;
      this.repositionShipClearOfStation();
      this.refreshMissionZones();
    });

    this.swarmHadDrones = false;
    this.eliteSpawnedFromSwarm = false;

    this.scheduleNextEnemySpawn();
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
    autoEquipFromCargo(this.gameState);
    this.gameState.currentWeapon = getEquippedWeapons(this.gameState)[0] ?? null;
  }

  spawnStation() {
    const cx = WORLD_W / 2, cy = WORLD_H / 2;
    let x, y;
    do {
      x = Phaser.Math.Between(400, WORLD_W - 400);
      y = Phaser.Math.Between(400, WORLD_H - 400);
    } while (Phaser.Math.Distance.Between(x, y, cx, cy) < STATION.minDistFromCenter);
    const s = this.physics.add.staticImage(x, y, 'station').setDepth(2);
    s.stationName = `Sector-${this.gameState.level}-Alpha`;
    s.priceModifiers = {};
    for (const item of MARKETPLACE) {
      s.priceModifiers[item.id] = Math.round(
        (MARKET_PRICE_VARIANCE.min + Math.random() * (MARKET_PRICE_VARIANCE.max - MARKET_PRICE_VARIANCE.min)) * 100
      ) / 100;
    }
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

  spawnMissionZones() {
    this.missionZones = [];
    if (!this.gameState.missions) return;
    const cx = WORLD_W / 2, cy = WORLD_H / 2;
    for (const id of Object.keys(this.gameState.missions)) {
      if (this.gameState.missions[id] !== 'accepted') continue;
      if (!MISSIONS[id]?.sceneKey) continue;
      let x, y, tries = 0;
      do {
        x = Phaser.Math.Between(500, WORLD_W - 500);
        y = Phaser.Math.Between(500, WORLD_H - 500);
        tries++;
        const farFromCenter = Phaser.Math.Distance.Between(x, y, cx, cy) > 1500;
        const farFromStation = this.stations.every((s) =>
          Phaser.Math.Distance.Between(x, y, s.x, s.y) > 1200);
        const farFromPortal = !this.portal ||
          Phaser.Math.Distance.Between(x, y, this.portal.x, this.portal.y) > 1000;
        const farFromBh = !this.blackhole ||
          Phaser.Math.Distance.Between(x, y, this.blackhole.x, this.blackhole.y) > 1200;
        if (farFromCenter && farFromStation && farFromPortal && farFromBh) break;
      } while (tries < 30);

      const zone = this.physics.add.image(x, y, 'mission_zone').setDepth(2);
      zone.body.setAllowGravity(false);
      zone.body.setImmovable(true);
      zone.missionId = id;
      this.missionZones.push(zone);
      this.tweens.add({ targets: zone, angle: 360, duration: 14000, repeat: -1 });

      const label = this.add.text(x, y - 80, `MISSION: ${id.replace(/_/g, ' ').toUpperCase()}`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#ffe28a'
      }).setOrigin(0.5).setDepth(2);
      zone.label = label;

      this.physics.add.overlap(this.ship, zone, this.onShipEnterMission, null, this);
    }
  }

  refreshMissionZones() {
    if (!this.missionZones) return;
    const remaining = [];
    for (const z of this.missionZones) {
      const status = this.gameState.missions?.[z.missionId];
      if (status !== 'accepted') {
        if (z.label) z.label.destroy();
        if (z.body) z.disableBody(true, true);
        z.destroy();
      } else {
        remaining.push(z);
      }
    }
    this.missionZones = remaining;
  }

  onShipEnterMission(_ship, zone) {
    if (!zone.active) return;
    if (this.scene.isActive('AllianceBattleScene')) return;
    this.scene.pause();
    this.scene.launch(MISSIONS[zone.missionId]?.sceneKey ?? 'AllianceBattleScene', { missionId: zone.missionId });
  }

  spawnBlackhole() {
    const cx = WORLD_W / 2, cy = WORLD_H / 2;
    let x, y, tries = 0;
    do {
      x = Phaser.Math.Between(400, WORLD_W - 400);
      y = Phaser.Math.Between(400, WORLD_H - 400);
      tries++;
      const tooCloseStation = this.stations.some((s) =>
        Phaser.Math.Distance.Between(x, y, s.x, s.y) < BLACKHOLE.minDistFromOther);
      const tooClosePortal = this.portal &&
        Phaser.Math.Distance.Between(x, y, this.portal.x, this.portal.y) < BLACKHOLE.minDistFromOther;
      const tooCloseCenter = Phaser.Math.Distance.Between(x, y, cx, cy) < BLACKHOLE.minDistFromCenter;
      if (!tooCloseStation && !tooClosePortal && !tooCloseCenter) break;
    } while (tries < 30);
    this.blackhole = this.add.image(x, y, 'blackhole').setDepth(1);
    this.tweens.add({
      targets: this.blackhole,
      angle: 360,
      duration: 12000,
      repeat: -1
    });
  }

  applyBlackholeGravity(dtSec) {
    if (!this.blackhole) return;
    const bx = this.blackhole.x;
    const by = this.blackhole.y;
    const grR = BLACKHOLE.gravityRadius;
    const grR2 = grR * grR;
    const ehR2 = BLACKHOLE.eventHorizonRadius * BLACKHOLE.eventHorizonRadius;

    const sdx = this.controller.x - bx;
    const sdy = this.controller.y - by;
    const sdist = Math.hypot(sdx, sdy);
    if (sdist >= BLACKHOLE.chargeBandMin && sdist <= BLACKHOLE.chargeBandMax
        && this.gameState.energy < this.gameState.maxEnergy) {
      this.gameState.energy = Math.min(
        this.gameState.maxEnergy,
        this.gameState.energy + ENERGY.chargePerSec * dtSec
      );
      this.gameState.charging = true;
    } else {
      this.gameState.charging = false;
    }

    const pull = (obj, getVel, setVel) => {
      const dx = bx - obj.x;
      const dy = by - obj.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > grR2 || d2 < 1) return false;
      const d = Math.sqrt(d2);
      const strength = BLACKHOLE.maxAccel * (1 - d / grR);
      const ax = (dx / d) * strength;
      const ay = (dy / d) * strength;
      const v = getVel(obj);
      v.x += ax * dtSec;
      v.y += ay * dtSec;
      setVel(obj, v);
      return d2 < ehR2;
    };

    const c = this.controller;
    const shipCaught = pull(
      c,
      (o) => ({ x: o.vx, y: o.vy }),
      (o, v) => { o.vx = v.x; o.vy = v.y; }
    );
    if (shipCaught) {
      this.takeDamage(BLACKHOLE.hullDamageOnEventHorizon);
      const dx = c.x - bx;
      const dy = c.y - by;
      const d = Math.hypot(dx, dy) || 0.001;
      const push = BLACKHOLE.eventHorizonRadius + 20;
      c.x = bx + (dx / d) * push;
      c.y = by + (dy / d) * push;
      const speed = 120;
      c.vx = (dx / d) * speed;
      c.vy = (dy / d) * speed;
    }

    const pullBody = (o) => pull(
      o,
      (oo) => oo.body.velocity,
      (oo, v) => { oo.body.velocity.x = v.x; oo.body.velocity.y = v.y; }
    );

    if (this.asteroidGroup) {
      this.asteroidGroup.children.iterate((a) => {
        if (!a || !a.active || !a.body) return;
        const consumed = pullBody(a);
        if (consumed && a.active && a.body) { a.disableBody(true, true); a.destroy(); }
      });
    }
    if (this.collectables) {
      this.collectables.children.iterate((co) => {
        if (!co || !co.active || !co.body) return;
        const consumed = pullBody(co);
        if (consumed && co.active && co.body) { co.disableBody(true, true); co.destroy(); }
      });
    }
    if (this.enemies) {
      this.enemies.children.iterate((e) => {
        if (!e || !e.active || !e.body) return;
        const consumed = pullBody(e);
        if (consumed) damageEnemy(this, e, 999);
      });
    }
    if (this.drones) {
      this.drones.children.iterate((d) => {
        if (!d || !d.active || !d.body) return;
        const consumed = pullBody(d);
        if (consumed) damageDrone(this, d, 999);
      });
    }
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

  repositionShipClearOfStation() {
    if (!this.controller || !this.stations) return;
    const nearRadius = 400;
    const launchDistance = 220;
    const outwardDrift = 60;
    for (const s of this.stations) {
      const dx = this.controller.x - s.x;
      const dy = this.controller.y - s.y;
      if (Math.hypot(dx, dy) > nearRadius) continue;
      const ang = Math.random() * Math.PI * 2;
      let nx = s.x + Math.cos(ang) * launchDistance;
      let ny = s.y + Math.sin(ang) * launchDistance;
      nx = Phaser.Math.Clamp(nx, 200, WORLD_W - 200);
      ny = Phaser.Math.Clamp(ny, 200, WORLD_H - 200);
      this.controller.x = nx;
      this.controller.y = ny;
      this.controller.vx = Math.cos(ang) * outwardDrift;
      this.controller.vy = Math.sin(ang) * outwardDrift;
      if (this.ship) this.ship.setPosition(nx, ny);
      break;
    }
  }

  openSchematic() {
    if (this.scene.isActive('SchematicScene')) return;
    this.scene.pause();
    this.scene.launch('SchematicScene', { from: 'SpaceScene' });
  }

  onShipDockBase(_ship, _base) {
    if (this.gameState.gameOver) return;
    if (this.time.now < this.dockCooldownUntil) return;
    if (this.scene.isActive('LandingScene') || this.scene.isActive('ShopScene')) return;
    this.dockCooldownUntil = this.time.now + LANDING.dockCooldownMs;
    this.scene.pause();
    this.scene.launch('LandingScene', { mode: 'land' });
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
    try {
      this.gameState.gameOver = true;

      const wreckItems = snapshotCargoToWreck(this.gameState);
      if (wreckItems.length > 0) {
        this.gameState.deathSites = this.gameState.deathSites || [];
        this.gameState.deathSites.push({
          x: this.controller.x,
          y: this.controller.y,
          level: this.gameState.level,
          items: wreckItems
        });
      }

      resetAfterDeath(this.gameState);

      this.cameras.main.flash(500, 255, 80, 80);
      this.time.delayedCall(550, () => {
        try {
          this.scene.stop();
          this.scene.start('StarbaseScene');
        } catch (err) {
          console.error('[SpaceScene gameOver transition]', err);
        }
      });
    } catch (err) {
      console.error('[SpaceScene.triggerGameOver]', err);
      this.gameState.gameOver = false;
    }
  }

  updateMiningLaser(fireHeld, dtSec) {
    this.laserGfx.clear();
    if (!fireHeld) { this.miningExtractAccum = 0; return; }
    const cost = ENERGY.laserCostPerSec * dtSec;
    if (this.gameState.energy < cost) { this.miningExtractAccum = 0; return; }
    this.gameState.energy = Math.max(0, this.gameState.energy - cost);

    const aim = this.controller.aimAngle ?? this.controller.angle;
    const dx = Math.cos(aim);
    const dy = Math.sin(aim);
    const sx = this.controller.x;
    const sy = this.controller.y;
    let endDist = MINING_LASER.range;
    let hitAsteroid = null;

    this.asteroidGroup.children.iterate((a) => {
      if (!a || !a.active) return;
      const vx = a.x - sx;
      const vy = a.y - sy;
      const along = vx * dx + vy * dy;
      if (along < 0 || along > endDist) return;
      const projX = sx + dx * along;
      const projY = sy + dy * along;
      const perp = Math.hypot(a.x - projX, a.y - projY);
      const r = (a.width || 56) * (a.scaleValue || 1) * 0.5;
      if (perp < r) {
        endDist = along;
        hitAsteroid = a;
      }
    });

    const tipX = sx + dx * endDist;
    const tipY = sy + dy * endDist;

    this.laserGfx.lineStyle(4, MINING_LASER.beamColor, 0.35);
    this.laserGfx.lineBetween(sx, sy, tipX, tipY);
    this.laserGfx.lineStyle(1, MINING_LASER.beamColorCore, 0.95);
    this.laserGfx.lineBetween(sx, sy, tipX, tipY);

    if (hitAsteroid) {
      this.miningExtractAccum += MINING_LASER.extractRatePerSec * dtSec;
      while (this.miningExtractAccum >= 1) {
        const added = addItem(this.gameState, 'ore', null, 1);
        if (added === false || added === 0) { this.miningExtractAccum = 0; break; }
        this.miningExtractAccum -= 1;
        const done = progressMission(this.gameState, 'mine_ore', 1);
        if (done) this.flashMissionComplete('mine_ore');
      }
    } else {
      this.miningExtractAccum = 0;
    }
  }

  flashMissionComplete(missionId) {
    const m = MISSIONS[missionId];
    if (!m) return;
    const txt = this.add.text(this.scale.width / 2, 80,
      `MISSION COMPLETE\n${m.name}\n+${m.reward.toLocaleString()} cr`,
      { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#88ffaa', align: 'center', backgroundColor: '#001020', padding: { x: 12, y: 8 } }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.tweens.add({ targets: txt, alpha: 0, y: 56, duration: 4500, ease: 'Cubic.easeIn', onComplete: () => txt.destroy() });
  }

  spawnDeathSites() {
    if (!this.gameState.deathSites) return;
    for (const ds of this.gameState.deathSites) {
      if (ds.level !== this.gameState.level) continue;
      const w = this.wrecks.create(ds.x, ds.y, 'wreck').setDepth(3);
      w.body.setAllowGravity(false);
      w.deathSite = ds;
      this.tweens.add({ targets: w, alpha: { from: 0.7, to: 1 }, duration: 800, yoyo: true, repeat: -1 });
    }
  }

  onShipHitWreck(_ship, wreck) {
    if (!wreck.active || !wreck.deathSite) return;
    const remaining = [];
    let collected = 0;
    for (const item of wreck.deathSite.items) {
      let added = false;
      if (item.type === 'weapon') added = addItem(this.gameState, 'weapon', item.id);
      else if (item.type === 'exotic') added = addItem(this.gameState, 'exotic', item.id);
      else if (item.type === 'ore') added = addItem(this.gameState, 'ore', null, item.qty) !== false;
      else if (item.type === 'scrap') added = addItem(this.gameState, 'scrap', null, item.qty) !== false;
      if (added) collected++;
      else remaining.push(item);
    }
    if (remaining.length === 0) {
      this.gameState.deathSites = (this.gameState.deathSites || []).filter((ds) => ds !== wreck.deathSite);
      wreck.disableBody(true, true);
      wreck.destroy();
    } else {
      wreck.deathSite.items = remaining;
    }
    if (collected > 0) this.cameras.main.flash(120, 200, 220, 80);
  }

  regenShield(dtSec) {
    if (this.gameState.gameOver) return;
    if (this.time.now - this.lastHitTime < SHIP.shieldRegenDelayMs) return;
    if (this.gameState.shield >= this.gameState.maxShield) return;
    if (this.gameState.energy <= 0) return;
    const want = SHIP.shieldRegenPerSec * dtSec;
    const delta = Math.min(want, this.gameState.maxShield - this.gameState.shield, this.gameState.energy / ENERGY.shieldRegenCost);
    this.gameState.shield += delta;
    this.gameState.energy = Math.max(0, this.gameState.energy - delta * ENERGY.shieldRegenCost);
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

    if (Phaser.Input.Keyboard.JustDown(k.F)) {
      this.openSchematic();
      return;
    }

    const equipped = getEquippedWeapons(this.gameState);
    if (equipped.length > 0 && !equipped.includes(this.gameState.currentWeapon)) {
      this.gameState.currentWeapon = equipped[0];
    }

    if (Phaser.Input.Keyboard.JustDown(k.E)) {
      this.gameState.currentWeapon = nextWeaponId(this.gameState.currentWeapon, equipped);
    }

    const fireHeld = (k.SPACE.isDown || pointer.leftButtonDown()) && this.gameState.currentWeapon;

    if (this.gameState.currentWeapon === 'mining_laser') {
      this.updateMiningLaser(fireHeld, dt);
    } else {
      this.laserGfx.clear();
    }

    if (fireHeld && this.gameState.currentWeapon !== 'mining_laser') {
      const weapon = WEAPONS[this.gameState.currentWeapon];
      if (weapon && weapon.fire && time - this.lastFireTime >= weapon.cooldownMs) {
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
    this.applyBlackholeGravity(dt);
    this.regenShield(dt);

    this.gameState.speed = this.controller.speed();
  }
}
