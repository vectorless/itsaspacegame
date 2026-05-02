import Phaser from 'phaser';
import { COLORS } from './constants.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.makeShipTexture();
    this.makeBulletTexture();
    this.makeMissileTexture();
    this.makeAsteroidTexture('asteroid_a', 56, 9);
    this.makeAsteroidTexture('asteroid_b', 56, 11);
    this.makeAsteroidTexture('asteroid_c', 56, 7);
    this.makeOreTexture();
    this.makeStationTexture();
    this.makeEnemyTexture();
    this.makeEnemyBulletTexture();
    this.makeEliteTexture();
    this.makeDroneTexture();
    this.makeRailshotTexture();
    this.makePortalDeviceTexture();
    this.makePortalTextures();
    this.makeCrosshairTexture();
    this.makeThrusterTexture();
    this.makeStarfieldTextures();

    this.scene.start('SpaceScene');
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
