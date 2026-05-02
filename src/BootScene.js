import Phaser from 'phaser';
import { COLORS } from './constants.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('ship', '/assets/ships/cruiser.png');
    this.load.image('elite_ship', '/assets/enemies/elite.png');
  }

  create() {
    if (!this.textures.exists('ship')) this.makeShipTexture();
    this.makeScoutTexture();
    this.makeHeavyTexture();
    this.makeScrapTexture();
    this.makeExoticTextures();
    this.makeBulletTexture();
    this.makeMissileTexture();
    this.makeAsteroidTexture('asteroid_a', 56, 9);
    this.makeAsteroidTexture('asteroid_b', 56, 11);
    this.makeAsteroidTexture('asteroid_c', 56, 7);
    this.makeOreTexture();
    this.makeStationTexture();
    this.makeEnemyTexture();
    this.makeEnemyBulletTexture();
    if (!this.textures.exists('elite_ship')) this.makeEliteTexture();
    this.makeDroneTexture();
    this.makeRailshotTexture();
    this.makePortalDeviceTexture();
    this.makePortalTextures();
    this.makeCrosshairTexture();
    this.makeThrusterTexture();
    this.makeStarbaseTextures();
    this.makeBlackholeTexture();
    this.makeWreckTexture();
    this.makeMissionZoneTexture();
    this.makeBombTexture();
    this.makeTurretTexture();
    this.makeGroundTexture();
    this.makeStarfieldTextures();

    this.scene.start('StarbaseScene');
    this.scene.launch('HUDScene');
  }

  makeShipTexture() {
    const w = 36, h = 28;
    const g = this.add.graphics();
    g.lineStyle(2, COLORS.shipOutline, 1);
    g.fillStyle(COLORS.ship, 1);
    g.beginPath();
    g.moveTo(w - 2, h / 2);
    g.lineTo(2, 2);
    g.lineTo(10, h / 2);
    g.lineTo(2, h - 2);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture('ship', w, h);
    g.destroy();
  }

  makeScoutTexture() {
    const w = 28, h = 22;
    const g = this.add.graphics();
    g.lineStyle(2, COLORS.shipOutline, 1);
    g.fillStyle(COLORS.ship, 1);
    g.beginPath();
    g.moveTo(w - 1, h / 2);
    g.lineTo(2, 1);
    g.lineTo(8, h / 2);
    g.lineTo(2, h - 1);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture('ship_scout', w, h);
    g.destroy();
  }

  makeHeavyTexture() {
    const w = 44, h = 36;
    const g = this.add.graphics();
    g.lineStyle(2, COLORS.shipOutline, 1);
    g.fillStyle(COLORS.ship, 1);
    g.beginPath();
    g.moveTo(w - 2, h / 2);
    g.lineTo(w - 14, 4);
    g.lineTo(2, 6);
    g.lineTo(8, h / 2);
    g.lineTo(2, h - 6);
    g.lineTo(w - 14, h - 4);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.fillStyle(COLORS.shipOutline, 0.85);
    g.fillRect(w - 22, 6, 6, 4);
    g.fillRect(w - 22, h - 10, 6, 4);
    g.generateTexture('ship_heavy', w, h);
    g.destroy();
  }

  makeScrapTexture() {
    const s = 10;
    const g = this.add.graphics();
    g.fillStyle(COLORS.scrapDark, 1);
    g.fillRect(1, 1, s - 2, s - 2);
    g.fillStyle(COLORS.scrap, 1);
    g.fillRect(2, 2, s - 4, s - 4);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(3, 3, 2, 2);
    g.generateTexture('scrap', s, s);
    g.destroy();
  }

  makeExoticTextures() {
    const make = (key, color, draw) => {
      const s = 12;
      const g = this.add.graphics();
      draw(g, s);
      g.generateTexture(key, s, s);
      g.destroy();
    };
    make('exotic_crystal', COLORS.exoticCrystal, (g, s) => {
      g.fillStyle(COLORS.exoticCrystal, 1);
      g.fillTriangle(s / 2, 0, s, s / 2, s / 2, s);
      g.fillTriangle(s / 2, 0, 0, s / 2, s / 2, s);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(s / 2 - 1, s / 2 - 1, 2, 2);
    });
    make('exotic_box', COLORS.exoticBox, (g, s) => {
      g.fillStyle(COLORS.exoticBox, 1);
      g.fillRect(2, 2, s - 4, s - 4);
      g.fillStyle(0x000000, 0.5);
      g.fillRect(s / 2 - 1, 4, 2, s - 8);
    });
    make('exotic_data', COLORS.exoticData, (g, s) => {
      g.fillStyle(COLORS.exoticData, 1);
      g.fillRect(2, 1, s - 4, s - 2);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(3, 3, 2, 2);
      g.fillRect(s - 5, 3, 2, 2);
      g.fillRect(3, s - 5, 2, 2);
      g.fillRect(s - 5, s - 5, 2, 2);
    });
  }

  makeBulletTexture() {
    const s = 6;
    const g = this.add.graphics();
    g.fillStyle(COLORS.blaster, 1);
    g.fillCircle(s / 2, s / 2, s / 2);
    g.generateTexture('bullet', s, s);
    g.destroy();
  }

  makeMissileTexture() {
    const w = 14, h = 6;
    const g = this.add.graphics();
    g.fillStyle(COLORS.missile, 1);
    g.fillRect(0, 1, w - 3, h - 2);
    g.fillStyle(0xffd080, 1);
    g.fillTriangle(w - 3, 0, w, h / 2, w - 3, h);
    g.generateTexture('missile', w, h);
    g.destroy();
  }

  makeAsteroidTexture(key, size, segments) {
    const r = size / 2;
    const g = this.add.graphics();
    g.lineStyle(2, COLORS.asteroidOutline, 1);
    g.fillStyle(COLORS.asteroid, 1);
    const pts = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const jitter = 0.65 + Math.random() * 0.5;
      pts.push({ x: r + Math.cos(a) * r * jitter, y: r + Math.sin(a) * r * jitter });
    }
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture(key, size, size);
    g.destroy();
  }

  makeOreTexture() {
    const s = 10;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ore, 1);
    g.fillTriangle(s / 2, 1, s - 1, s / 2, s / 2, s - 1);
    g.fillStyle(COLORS.oreLight, 1);
    g.fillTriangle(s / 2, 1, 1, s / 2, s / 2, s - 1);
    g.generateTexture('ore', s, s);
    g.destroy();
  }

  makeStationTexture() {
    const s = 56;
    const g = this.add.graphics();
    g.fillStyle(COLORS.station, 1);
    g.fillRect(8, 8, s - 16, s - 16);
    g.lineStyle(2, COLORS.stationOutline, 1);
    g.strokeRect(8, 8, s - 16, s - 16);
    g.fillStyle(COLORS.stationOutline, 1);
    g.fillRect(2, s / 2 - 3, 6, 6);
    g.fillRect(s - 8, s / 2 - 3, 6, 6);
    g.fillRect(s / 2 - 3, 2, 6, 6);
    g.fillRect(s / 2 - 3, s - 8, 6, 6);
    g.generateTexture('station', s, s);
    g.destroy();
  }

  makeEnemyTexture() {
    const w = 32, h = 26;
    const g = this.add.graphics();
    g.lineStyle(2, COLORS.enemyOutline, 1);
    g.fillStyle(COLORS.enemy, 1);
    g.beginPath();
    g.moveTo(w - 2, h / 2);
    g.lineTo(2, 4);
    g.lineTo(8, h / 2);
    g.lineTo(2, h - 4);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture('enemy_ship', w, h);
    g.destroy();
  }

  makeEnemyBulletTexture() {
    const s = 6;
    const g = this.add.graphics();
    g.fillStyle(COLORS.enemyBullet, 1);
    g.fillCircle(s / 2, s / 2, s / 2);
    g.generateTexture('enemy_bullet', s, s);
    g.destroy();
  }

  makeEliteTexture() {
    const w = 52, h = 42;
    const g = this.add.graphics();
    g.lineStyle(2, COLORS.eliteOutline, 1);
    g.fillStyle(COLORS.elite, 1);
    g.beginPath();
    g.moveTo(w - 2, h / 2);
    g.lineTo(w - 18, 4);
    g.lineTo(2, h / 2 - 6);
    g.lineTo(12, h / 2);
    g.lineTo(2, h / 2 + 6);
    g.lineTo(w - 18, h - 4);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture('elite_ship', w, h);
    g.destroy();
  }

  makeDroneTexture() {
    const s = 12;
    const g = this.add.graphics();
    g.lineStyle(1, COLORS.droneOutline, 1);
    g.fillStyle(COLORS.drone, 1);
    g.beginPath();
    g.moveTo(s - 1, s / 2);
    g.lineTo(2, 2);
    g.lineTo(2, s - 2);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture('drone', s, s);
    g.destroy();
  }

  makeRailshotTexture() {
    const w = 32, h = 4;
    const g = this.add.graphics();
    g.fillStyle(COLORS.rail, 1);
    g.fillRect(0, 1, w, h - 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(w / 2 - 6, 0, 12, h);
    g.generateTexture('railshot', w, h);
    g.destroy();
  }

  makePortalDeviceTexture() {
    const s = 14;
    const g = this.add.graphics();
    g.fillStyle(COLORS.portalDevice, 1);
    g.fillTriangle(s / 2, 1, s - 1, s / 2, s / 2, s - 1);
    g.fillTriangle(s / 2, 1, 1, s / 2, s / 2, s - 1);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(s / 2 - 1, s / 2 - 1, 2, 2);
    g.generateTexture('portal_device', s, s);
    g.destroy();
  }

  makePortalTextures() {
    const s = 128, c = s / 2;
    const closed = this.add.graphics();
    closed.lineStyle(3, COLORS.portalClosed, 0.85);
    closed.strokeCircle(c, c, 50);
    closed.lineStyle(1, COLORS.portalClosed, 0.55);
    closed.strokeCircle(c, c, 36);
    closed.strokeCircle(c, c, 22);
    closed.generateTexture('portal_closed', s, s);
    closed.destroy();

    const open = this.add.graphics();
    open.lineStyle(4, COLORS.portalRing, 1);
    open.strokeCircle(c, c, 50);
    open.lineStyle(2, COLORS.portalRing, 0.7);
    open.strokeCircle(c, c, 38);
    open.fillStyle(COLORS.portalCore, 0.35);
    open.fillCircle(c, c, 30);
    open.fillStyle(COLORS.portalCore, 0.5);
    open.fillCircle(c, c, 18);
    open.fillStyle(0xffffff, 0.6);
    open.fillCircle(c, c, 8);
    open.generateTexture('portal_open', s, s);
    open.destroy();
  }

  makeCrosshairTexture() {
    const s = 22, c = s / 2;
    const g = this.add.graphics();
    g.lineStyle(1.5, 0xfff0a0, 0.9);
    g.strokeCircle(c, c, 6);
    g.beginPath();
    g.moveTo(c, 0); g.lineTo(c, 4);
    g.moveTo(c, s - 4); g.lineTo(c, s);
    g.moveTo(0, c); g.lineTo(4, c);
    g.moveTo(s - 4, c); g.lineTo(s, c);
    g.strokePath();
    g.fillStyle(0xfff0a0, 1);
    g.fillRect(c - 0.5, c - 0.5, 1, 1);
    g.generateTexture('crosshair', s, s);
    g.destroy();
  }

  makeThrusterTexture() {
    const w = 32, h = 14;
    const g = this.add.graphics();
    g.fillStyle(0xc02000, 0.55);
    g.fillTriangle(0, h / 2, w, 0, w, h);
    g.fillStyle(0xff7030, 0.75);
    g.fillTriangle(0, h / 2, w * 0.7, 2, w * 0.7, h - 2);
    g.fillStyle(0xffd060, 0.9);
    g.fillTriangle(0, h / 2, w * 0.45, 4, w * 0.45, h - 4);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(0, h / 2, w * 0.22, h * 0.35, w * 0.22, h * 0.65);
    g.generateTexture('thruster', w, h);
    g.destroy();
  }

  makeStarbaseTextures() {
    const t = 24;

    // Solid wall tile
    {
      const g = this.add.graphics();
      g.fillStyle(0x33445a, 1);
      g.fillRect(0, 0, t, t);
      g.fillStyle(0x556a82, 1);
      g.fillRect(0, 0, t, 2);
      g.fillRect(0, 0, 2, t);
      g.fillStyle(0x1a2638, 1);
      g.fillRect(0, t - 2, t, 2);
      g.fillRect(t - 2, 0, 2, t);
      g.fillStyle(0x222d40, 1);
      g.fillRect(8, 8, 8, 8);
      g.generateTexture('tile_wall', t, t);
      g.destroy();
    }

    // Spike up
    {
      const g = this.add.graphics();
      g.fillStyle(0xff5050, 1);
      g.fillTriangle(0, t, t / 4, 4, t / 2, t);
      g.fillTriangle(t / 4, t, t / 2, 4, 3 * t / 4, t);
      g.fillTriangle(t / 2, t, 3 * t / 4, 4, t, t);
      g.fillStyle(0xffffff, 0.6);
      g.fillRect(t / 4 - 1, t - 4, 1, 3);
      g.fillRect(t / 2 - 1, t - 4, 1, 3);
      g.fillRect(3 * t / 4 - 1, t - 4, 1, 3);
      g.generateTexture('tile_spike_up', t, t);
      g.destroy();
    }

    // Spike down
    {
      const g = this.add.graphics();
      g.fillStyle(0xff5050, 1);
      g.fillTriangle(0, 0, t / 4, t - 4, t / 2, 0);
      g.fillTriangle(t / 4, 0, t / 2, t - 4, 3 * t / 4, 0);
      g.fillTriangle(t / 2, 0, 3 * t / 4, t - 4, t, 0);
      g.fillStyle(0xffffff, 0.6);
      g.fillRect(t / 4 - 1, 1, 1, 3);
      g.fillRect(t / 2 - 1, 1, 1, 3);
      g.fillRect(3 * t / 4 - 1, 1, 1, 3);
      g.generateTexture('tile_spike_down', t, t);
      g.destroy();
    }

    // Crew sprite (16x16)
    {
      const w = 12, h = 16;
      const g = this.add.graphics();
      g.fillStyle(0xfff0a0, 1);
      g.fillRect(3, 0, 6, 5);          // head
      g.fillStyle(0x222244, 1);
      g.fillRect(4, 1, 1, 1);          // eye
      g.fillRect(7, 1, 1, 1);
      g.fillStyle(0x66ddff, 1);
      g.fillRect(2, 5, 8, 7);          // torso
      g.fillStyle(0x224458, 1);
      g.fillRect(2, 12, 3, 4);         // legs
      g.fillRect(7, 12, 3, 4);
      g.generateTexture('crew', w, h);
      g.destroy();
    }

    // Engineering terminal
    {
      const g = this.add.graphics();
      g.fillStyle(0x223a52, 1);
      g.fillRect(2, 6, t - 4, t - 6);
      g.fillStyle(0x88ddff, 1);
      g.fillRect(4, 8, t - 8, 8);
      g.fillStyle(0xfff0a0, 1);
      g.fillRect(6, 18, 2, 2);
      g.fillRect(10, 18, 2, 2);
      g.fillRect(14, 18, 2, 2);
      g.generateTexture('prop_engineering', t, t);
      g.destroy();
    }

    // Airlock
    {
      const g = this.add.graphics();
      g.fillStyle(0x445566, 1);
      g.fillRect(0, 0, t, t);
      g.fillStyle(0x223344, 1);
      g.fillRect(4, 2, t - 8, t - 2);
      g.fillStyle(0x66ddff, 1);
      g.fillRect(t / 2 - 1, 4, 2, t - 8);
      g.fillStyle(0xfff0a0, 1);
      g.fillRect(6, t - 6, 4, 2);
      g.generateTexture('prop_airlock', t, t);
      g.destroy();
    }

    // Repair (cross / med-pad)
    {
      const g = this.add.graphics();
      g.fillStyle(0x202028, 1);
      g.fillRect(2, 2, t - 4, t - 4);
      g.fillStyle(0x66ff88, 1);
      g.fillRect(t / 2 - 2, 6, 4, 12);
      g.fillRect(6, t / 2 - 2, 12, 4);
      g.generateTexture('prop_repair', t, t);
      g.destroy();
    }

    // Checkpoint (flag)
    {
      const g = this.add.graphics();
      g.fillStyle(0x202028, 1);
      g.fillRect(11, 4, 2, t - 6);
      g.fillStyle(0xffe060, 1);
      g.fillTriangle(13, 4, 21, 8, 13, 12);
      g.fillStyle(0x88aacc, 1);
      g.fillRect(8, t - 4, 8, 2);
      g.generateTexture('prop_checkpoint', t, t);
      g.destroy();
    }

    // Insurance terminal (shield with check)
    {
      const g = this.add.graphics();
      g.fillStyle(0x102030, 1);
      g.fillRect(2, 2, t - 4, t - 4);
      g.fillStyle(0x66ddff, 1);
      g.fillRect(7, 4, t - 14, 12);
      g.fillTriangle(7, 16, t - 7, 16, t / 2, t - 4);
      g.lineStyle(2, 0x0a1830, 1);
      g.beginPath();
      g.moveTo(8, 10);
      g.lineTo(11, 13);
      g.lineTo(t - 8, 7);
      g.strokePath();
      g.generateTexture('prop_insurance', t, t);
      g.destroy();
    }

    // Mission terminal (clipboard / datapad)
    {
      const g = this.add.graphics();
      g.fillStyle(0x4a3320, 1);
      g.fillRect(4, 4, t - 8, t - 6);
      g.fillStyle(0xffaa50, 1);
      g.fillRect(6, 6, t - 12, t - 10);
      g.fillStyle(0x4a3320, 1);
      g.fillRect(8, 9, t - 16, 1);
      g.fillRect(8, 13, t - 16, 1);
      g.fillRect(8, 17, t - 16, 1);
      g.fillStyle(0xff5050, 1);
      g.fillRect(t - 8, 5, 3, 3);
      g.generateTexture('prop_mission', t, t);
      g.destroy();
    }
  }

  makeMissionZoneTexture() {
    const s = 144, c = s / 2;
    const g = this.add.graphics();
    g.lineStyle(3, 0xffaa50, 0.55);
    g.strokeCircle(c, c, 60);
    g.lineStyle(2, 0xffe080, 0.4);
    g.strokeCircle(c, c, 46);
    g.fillStyle(0xffaa50, 0.12);
    g.fillCircle(c, c, 50);
    g.fillStyle(0xffe080, 0.7);
    g.fillCircle(c, c, 4);
    g.generateTexture('mission_zone', s, s);
    g.destroy();
  }

  makeBombTexture() {
    const s = 8;
    const g = this.add.graphics();
    g.fillStyle(0x202028, 1);
    g.fillRect(2, 0, 4, s);
    g.fillStyle(0xff5050, 1);
    g.fillRect(2, s - 2, 4, 2);
    g.fillStyle(0xffe080, 0.8);
    g.fillRect(3, 1, 2, 1);
    g.generateTexture('bomb', s, s);
    g.destroy();
  }

  makeTurretTexture() {
    const w = 24, h = 18;
    const g = this.add.graphics();
    g.fillStyle(0x556a82, 1);
    g.fillRect(2, h - 8, w - 4, 8);
    g.fillStyle(0x33445a, 1);
    g.fillRect(4, h - 10, w - 8, 2);
    g.fillStyle(0x88aacc, 1);
    g.fillRect(w / 2 - 2, 2, 4, h - 8);
    g.fillStyle(0xffaa50, 0.9);
    g.fillRect(w / 2 - 1, 0, 2, 4);
    g.generateTexture('turret', w, h);
    g.destroy();
  }

  makeGroundTexture() {
    const w = 64, h = 24;
    const g = this.add.graphics();
    g.fillStyle(0x33291a, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x4a3a26, 1);
    g.fillRect(0, 0, w, 3);
    g.fillStyle(0x2a200f, 1);
    for (let i = 0; i < 12; i++) {
      g.fillRect(Math.random() * w, 4 + Math.random() * (h - 6), 2, 2);
    }
    g.generateTexture('ground_tile', w, h);
    g.destroy();
  }

  makeBlackholeTexture() {
    const s = 160, c = s / 2;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.85);
    g.fillCircle(c, c, 18);
    g.lineStyle(1, 0x8060ff, 0.32);
    g.strokeCircle(c, c, 36);
    g.lineStyle(1, 0xa080ff, 0.22);
    g.strokeCircle(c, c, 50);
    g.lineStyle(1, 0x6040c0, 0.16);
    g.strokeCircle(c, c, 64);
    g.generateTexture('blackhole', s, s);
    g.destroy();
  }

  makeWreckTexture() {
    const s = 28;
    const g = this.add.graphics();
    g.fillStyle(0x33445a, 1);
    g.fillRect(2, 6, 8, 6);
    g.fillStyle(0x556a82, 1);
    g.fillRect(11, 4, 7, 8);
    g.fillStyle(0x222d40, 1);
    g.fillRect(18, 14, 6, 5);
    g.fillStyle(0xff8050, 1);
    g.fillRect(7, 16, 5, 4);
    g.fillStyle(0xffe28a, 0.9);
    g.fillRect(14, 18, 3, 3);
    g.fillRect(4, 12, 2, 2);
    g.generateTexture('wreck', s, s);
    g.destroy();
  }

  makeStarfieldTextures() {
    const makeStars = (key, count, color, alphaMin, alphaMax, size) => {
      const tile = 512;
      const g = this.add.graphics();
      for (let i = 0; i < count; i++) {
        const x = Math.random() * tile;
        const y = Math.random() * tile;
        const a = alphaMin + Math.random() * (alphaMax - alphaMin);
        g.fillStyle(color, a);
        g.fillRect(x, y, size, size);
      }
      g.generateTexture(key, tile, tile);
      g.destroy();
    };
    makeStars('stars_far', 80, COLORS.starFar, 0.4, 0.8, 1);
    makeStars('stars_near', 40, COLORS.starNear, 0.6, 1.0, 2);
  }
}
