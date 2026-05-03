import Phaser from 'phaser';
import { COLORS } from './constants.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('ship', 'assets/ships/cruiser.png');
    this.load.image('elite_ship', 'assets/enemies/elite.png');
    this.load.image('drone', 'assets/enemies/drone.png');
    this.load.image('station', 'assets/planets/starbase.png');
    this.load.image('alien_signal', 'assets/aliens/alien_signal.png');
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
    if (!this.textures.exists('station')) this.makeStationTexture();
    this.makeEnemyTexture();
    this.makeEnemyBulletTexture();
    if (!this.textures.exists('elite_ship')) this.makeEliteTexture();
    if (!this.textures.exists('drone')) this.makeDroneTexture();
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
    const t = 96;

    const px = (g, color, x, y, w = 1, h = 1) => {
      g.fillStyle(color, 1);
      g.fillRect(Math.floor(x), Math.floor(y), w, h);
    };
    const outline = (g, color, x, y, w, h) => {
      g.fillStyle(color, 1);
      g.fillRect(x, y, w, 1);             // top
      g.fillRect(x, y + h - 1, w, 1);     // bottom
      g.fillRect(x, y, 1, h);             // left
      g.fillRect(x + w - 1, y, 1, h);     // right
    };

    // Solid wall tile — bulkhead panel with rivets, beveled edge, vent grille
    {
      const g = this.add.graphics();
      // base panel
      px(g, 0x33445a, 0, 0, t, t);
      // light bevel (top, left)
      px(g, 0x6a82a0, 0, 0, t, 4);
      px(g, 0x6a82a0, 0, 0, 4, t);
      // dark bevel (bottom, right)
      px(g, 0x121a26, 0, t - 4, t, 4);
      px(g, 0x121a26, t - 4, 0, 4, t);
      // outer line-art outline
      outline(g, 0x0a121c, 0, 0, t, t);
      // inset panel
      outline(g, 0x1a2638, 8, 8, t - 16, t - 16);
      px(g, 0x29384e, 9, 9, t - 18, t - 18);
      // central plate
      px(g, 0x3c5070, 28, 28, t - 56, t - 56);
      outline(g, 0x10182a, 28, 28, t - 56, t - 56);
      // grille slots (line-art horizontal)
      for (let i = 0; i < 4; i++) {
        const ry = 36 + i * 6;
        px(g, 0x141d2c, 36, ry, t - 72, 2);
        px(g, 0x4c648a, 36, ry + 1, t - 72, 1);
      }
      // corner rivets (small dark + highlight)
      const rivets = [[12, 12], [t - 16, 12], [12, t - 16], [t - 16, t - 16]];
      for (const [rx, ry] of rivets) {
        px(g, 0x0a121c, rx, ry, 4, 4);
        px(g, 0x6a82a0, rx + 1, ry + 1, 1, 1);
      }
      g.generateTexture('tile_wall', t, t);
      g.destroy();
    }

    // Spike up — row of spikes with floor base
    {
      const g = this.add.graphics();
      // floor base
      px(g, 0x222a36, 0, t - 12, t, 12);
      px(g, 0x445566, 0, t - 12, t, 2);
      // spikes
      const spikes = 4;
      const sw = t / spikes;
      for (let i = 0; i < spikes; i++) {
        const cx = i * sw + sw / 2;
        // shadow side
        g.fillStyle(0x802020, 1);
        g.fillTriangle(i * sw + 4, t - 8, cx, 12, cx, t - 8);
        // bright side
        g.fillStyle(0xff5050, 1);
        g.fillTriangle(cx, 12, (i + 1) * sw - 4, t - 8, cx, t - 8);
        // line-art outline
        g.lineStyle(2, 0x2a0808, 1);
        g.beginPath();
        g.moveTo(i * sw + 4, t - 8);
        g.lineTo(cx, 12);
        g.lineTo((i + 1) * sw - 4, t - 8);
        g.strokePath();
        // glint
        px(g, 0xffd0d0, cx, 16, 1, 8);
      }
      g.generateTexture('tile_spike_up', t, t);
      g.destroy();
    }

    // Spike down — mirror
    {
      const g = this.add.graphics();
      px(g, 0x222a36, 0, 0, t, 12);
      px(g, 0x445566, 0, 10, t, 2);
      const spikes = 4;
      const sw = t / spikes;
      for (let i = 0; i < spikes; i++) {
        const cx = i * sw + sw / 2;
        g.fillStyle(0x802020, 1);
        g.fillTriangle(i * sw + 4, 8, cx, t - 12, cx, 8);
        g.fillStyle(0xff5050, 1);
        g.fillTriangle(cx, t - 12, (i + 1) * sw - 4, 8, cx, 8);
        g.lineStyle(2, 0x2a0808, 1);
        g.beginPath();
        g.moveTo(i * sw + 4, 8);
        g.lineTo(cx, t - 12);
        g.lineTo((i + 1) * sw - 4, 8);
        g.strokePath();
        px(g, 0xffd0d0, cx, t - 24, 1, 8);
      }
      g.generateTexture('tile_spike_down', t, t);
      g.destroy();
    }

    // Crew sprite — 48x56 detailed pixel-art astronaut with helmet visor
    {
      const w = 48, h = 56;
      const g = this.add.graphics();
      // ====== Helmet ======
      // helmet base (rounded rect approximated)
      g.fillStyle(0xe8eef5, 1);
      g.fillRect(8, 4, 32, 22);
      g.fillRect(6, 8, 36, 16);
      // helmet outline (line-art)
      g.lineStyle(2, 0x101820, 1);
      g.strokeRect(8, 4, 32, 22);
      g.strokeRect(6, 8, 36, 16);
      // visor cavity
      g.fillStyle(0x0a1830, 1);
      g.fillRect(11, 9, 26, 12);
      // visor glass — gradient bands
      g.fillStyle(0x2a8fcf, 1);
      g.fillRect(12, 10, 24, 10);
      g.fillStyle(0x66ddff, 1);
      g.fillRect(12, 10, 24, 4);
      // visor highlight streak
      px(g, 0xffffff, 14, 11, 6, 1);
      px(g, 0xffffff, 14, 12, 3, 1);
      // visor outline
      g.lineStyle(1, 0x101820, 1);
      g.strokeRect(11, 9, 26, 12);
      // helmet rivets
      px(g, 0x808a98, 9, 13, 2, 2);
      px(g, 0x808a98, 37, 13, 2, 2);
      // ====== Suit / torso ======
      g.fillStyle(0xc94a3a, 1);            // suit red-orange
      g.fillRect(8, 26, 32, 18);
      g.fillStyle(0xa53224, 1);            // suit shadow
      g.fillRect(8, 38, 32, 6);
      g.lineStyle(2, 0x2a0a08, 1);
      g.strokeRect(8, 26, 32, 18);
      // chest plate
      g.fillStyle(0xe8eef5, 1);
      g.fillRect(18, 28, 12, 10);
      g.lineStyle(1, 0x101820, 1);
      g.strokeRect(18, 28, 12, 10);
      // chest tabs / lights
      px(g, 0x66ff88, 20, 30, 2, 2);
      px(g, 0xfff0a0, 24, 30, 2, 2);
      px(g, 0xff6060, 26, 34, 2, 2);
      // shoulder caps
      g.fillStyle(0xe8eef5, 1);
      g.fillRect(6, 26, 4, 6);
      g.fillRect(38, 26, 4, 6);
      g.lineStyle(1, 0x101820, 1);
      g.strokeRect(6, 26, 4, 6);
      g.strokeRect(38, 26, 4, 6);
      // arms
      g.fillStyle(0xc94a3a, 1);
      g.fillRect(4, 30, 6, 14);
      g.fillRect(38, 30, 6, 14);
      g.lineStyle(2, 0x2a0a08, 1);
      g.strokeRect(4, 30, 6, 14);
      g.strokeRect(38, 30, 6, 14);
      // gloves
      g.fillStyle(0xe8eef5, 1);
      g.fillRect(3, 42, 8, 6);
      g.fillRect(37, 42, 8, 6);
      g.lineStyle(1, 0x101820, 1);
      g.strokeRect(3, 42, 8, 6);
      g.strokeRect(37, 42, 8, 6);
      // belt
      g.fillStyle(0x2a3040, 1);
      g.fillRect(8, 42, 32, 4);
      g.lineStyle(1, 0x000000, 1);
      g.strokeRect(8, 42, 32, 4);
      px(g, 0xfff0a0, 22, 43, 4, 2);  // belt buckle
      // ====== Legs / boots ======
      g.fillStyle(0xc94a3a, 1);
      g.fillRect(11, 46, 10, 6);
      g.fillRect(27, 46, 10, 6);
      g.lineStyle(2, 0x2a0a08, 1);
      g.strokeRect(11, 46, 10, 6);
      g.strokeRect(27, 46, 10, 6);
      // boots
      g.fillStyle(0x202028, 1);
      g.fillRect(9, 50, 14, 6);
      g.fillRect(25, 50, 14, 6);
      g.lineStyle(2, 0x000000, 1);
      g.strokeRect(9, 50, 14, 6);
      g.strokeRect(25, 50, 14, 6);
      // boot toe highlight
      px(g, 0x4c5466, 21, 52, 2, 2);
      px(g, 0x4c5466, 25, 52, 2, 2);
      g.generateTexture('crew', w, h);
      g.destroy();
    }

    // Engineering / Shop terminal — console with screen, keyboard, status lights
    {
      const g = this.add.graphics();
      // base box
      g.fillStyle(0x1a2638, 1);
      g.fillRect(8, 16, t - 16, t - 24);
      // line-art outline
      g.lineStyle(2, 0x000000, 1);
      g.strokeRect(8, 16, t - 16, t - 24);
      // top bezel
      g.fillStyle(0x2c3e58, 1);
      g.fillRect(8, 16, t - 16, 8);
      g.lineStyle(1, 0x000000, 1);
      g.strokeRect(8, 16, t - 16, 8);
      // monitor cavity
      g.fillStyle(0x081020, 1);
      g.fillRect(16, 26, t - 32, 36);
      g.lineStyle(2, 0x000000, 1);
      g.strokeRect(16, 26, t - 32, 36);
      // screen content — graph bars + scan-lines
      g.fillStyle(0x88ddff, 1);
      g.fillRect(20, 30, 10, 28);
      g.fillRect(34, 38, 10, 20);
      g.fillRect(48, 32, 10, 26);
      g.fillRect(62, 44, 10, 14);
      g.fillStyle(0xfff0a0, 1);
      g.fillRect(20, 30, 10, 4);
      g.fillRect(34, 38, 10, 4);
      g.fillRect(48, 32, 10, 4);
      g.fillRect(62, 44, 10, 4);
      // scan lines
      g.fillStyle(0x000000, 0.25);
      for (let y = 28; y < 60; y += 3) g.fillRect(16, y, t - 32, 1);
      // status LEDs
      px(g, 0x66ff88, 14, 20, 3, 3);
      px(g, 0xfff0a0, 22, 20, 3, 3);
      px(g, 0xff6060, 30, 20, 3, 3);
      // keyboard tray
      g.fillStyle(0x223450, 1);
      g.fillRect(12, 66, t - 24, 14);
      g.lineStyle(1, 0x000000, 1);
      g.strokeRect(12, 66, t - 24, 14);
      // keys
      for (let kx = 0; kx < 6; kx++) {
        const x = 16 + kx * 11;
        px(g, 0x445672, x, 70, 8, 6);
        px(g, 0x6a82a0, x, 70, 8, 1);
      }
      // base shadow
      g.fillStyle(0x0a1018, 1);
      g.fillRect(8, t - 8, t - 16, 4);
      g.generateTexture('prop_engineering', t, t);
      g.destroy();
    }

    // Airlock door — heavy door with porthole, hazard stripes, lock indicator
    {
      const g = this.add.graphics();
      // frame
      g.fillStyle(0x445566, 1);
      g.fillRect(0, 0, t, t);
      g.lineStyle(3, 0x000000, 1);
      g.strokeRect(0, 0, t, t);
      // door panel
      g.fillStyle(0x2a3a4c, 1);
      g.fillRect(10, 6, t - 20, t - 12);
      g.lineStyle(2, 0x101820, 1);
      g.strokeRect(10, 6, t - 20, t - 12);
      // hazard stripes top + bottom
      const stripeY1 = 12;
      const stripeY2 = t - 18;
      for (let s = 0; s < 5; s++) {
        const sx = 14 + s * 14;
        g.fillStyle(0xfff0a0, 1);
        g.fillTriangle(sx, stripeY1, sx + 8, stripeY1, sx + 4, stripeY1 + 6);
        g.fillStyle(0x202028, 1);
        g.fillTriangle(sx + 4, stripeY1 + 6, sx + 8, stripeY1, sx + 12, stripeY1 + 6);
        g.fillStyle(0xfff0a0, 1);
        g.fillTriangle(sx, stripeY2, sx + 8, stripeY2, sx + 4, stripeY2 - 6);
        g.fillStyle(0x202028, 1);
        g.fillTriangle(sx + 4, stripeY2 - 6, sx + 8, stripeY2, sx + 12, stripeY2 - 6);
      }
      // central seam (sliding door split)
      g.fillStyle(0x101820, 1);
      g.fillRect(t / 2 - 1, 22, 2, t - 44);
      // porthole (round-ish glass)
      g.fillStyle(0x0a2030, 1);
      g.fillRect(t / 2 - 12, t / 2 - 12, 24, 24);
      g.fillStyle(0x66ddff, 1);
      g.fillRect(t / 2 - 10, t / 2 - 10, 20, 20);
      g.lineStyle(2, 0x101820, 1);
      g.strokeRect(t / 2 - 12, t / 2 - 12, 24, 24);
      // glass highlight
      px(g, 0xffffff, t / 2 - 8, t / 2 - 8, 4, 1);
      px(g, 0xffffff, t / 2 - 8, t / 2 - 6, 2, 1);
      // lock indicator
      px(g, 0x66ff88, 14, t - 12, 4, 4);
      // outline pulse
      g.lineStyle(1, 0x000000, 1);
      g.strokeRect(14, t - 12, 4, 4);
      g.generateTexture('prop_airlock', t, t);
      g.destroy();
    }

    // Repair / med-pad — green cross with tech frame, pulse rings
    {
      const g = this.add.graphics();
      // base
      g.fillStyle(0x14181f, 1);
      g.fillRect(6, 6, t - 12, t - 12);
      g.lineStyle(3, 0x000000, 1);
      g.strokeRect(6, 6, t - 12, t - 12);
      // inner panel
      g.fillStyle(0x1a3024, 1);
      g.fillRect(12, 12, t - 24, t - 24);
      g.lineStyle(1, 0x66ff88, 0.5);
      g.strokeRect(12, 12, t - 24, t - 24);
      // pulse ring
      g.lineStyle(2, 0x66ff88, 0.25);
      g.strokeRect(20, 20, t - 40, t - 40);
      // cross — vertical bar
      g.fillStyle(0x66ff88, 1);
      g.fillRect(t / 2 - 6, 24, 12, t - 48);
      g.fillStyle(0xa8ffc0, 1);
      g.fillRect(t / 2 - 5, 24, 4, t - 48);
      g.lineStyle(2, 0x142410, 1);
      g.strokeRect(t / 2 - 6, 24, 12, t - 48);
      // cross — horizontal bar
      g.fillStyle(0x66ff88, 1);
      g.fillRect(24, t / 2 - 6, t - 48, 12);
      g.fillStyle(0xa8ffc0, 1);
      g.fillRect(24, t / 2 - 5, t - 48, 4);
      g.lineStyle(2, 0x142410, 1);
      g.strokeRect(24, t / 2 - 6, t - 48, 12);
      // corner LEDs
      px(g, 0x66ff88, 10, 10, 3, 3);
      px(g, 0x66ff88, t - 13, 10, 3, 3);
      px(g, 0x66ff88, 10, t - 13, 3, 3);
      px(g, 0x66ff88, t - 13, t - 13, 3, 3);
      g.generateTexture('prop_repair', t, t);
      g.destroy();
    }

    // Checkpoint flag — pole and triangular flag, base plate
    {
      const g = this.add.graphics();
      // base plate
      g.fillStyle(0x202028, 1);
      g.fillRect(20, t - 14, t - 40, 8);
      g.lineStyle(1, 0x000000, 1);
      g.strokeRect(20, t - 14, t - 40, 8);
      // pole
      g.fillStyle(0x808a98, 1);
      g.fillRect(t / 2 - 2, 16, 4, t - 30);
      g.lineStyle(1, 0x000000, 1);
      g.strokeRect(t / 2 - 2, 16, 4, t - 30);
      // pole highlight
      px(g, 0xc8d4e4, t / 2 - 1, 18, 1, t - 36);
      // flag
      g.fillStyle(0xffe060, 1);
      g.fillTriangle(t / 2 + 2, 16, t / 2 + 32, 28, t / 2 + 2, 40);
      g.fillStyle(0xb09020, 1);
      g.fillTriangle(t / 2 + 2, 28, t / 2 + 32, 28, t / 2 + 2, 40);
      g.lineStyle(2, 0x402a00, 1);
      g.beginPath();
      g.moveTo(t / 2 + 2, 16);
      g.lineTo(t / 2 + 32, 28);
      g.lineTo(t / 2 + 2, 40);
      g.strokePath();
      g.generateTexture('prop_checkpoint', t, t);
      g.destroy();
    }

    // Insurance terminal — kiosk with shield emblem and check mark
    {
      const g = this.add.graphics();
      // base frame
      g.fillStyle(0x102030, 1);
      g.fillRect(8, 8, t - 16, t - 16);
      g.lineStyle(3, 0x000000, 1);
      g.strokeRect(8, 8, t - 16, t - 16);
      // header bar
      g.fillStyle(0x1a3450, 1);
      g.fillRect(8, 8, t - 16, 14);
      g.lineStyle(1, 0x000000, 1);
      g.strokeRect(8, 8, t - 16, 14);
      // header text dots (tiny)
      px(g, 0xfff0a0, 14, 14, 2, 2);
      px(g, 0xfff0a0, 18, 14, 2, 2);
      px(g, 0xfff0a0, 22, 14, 2, 2);
      // screen background
      g.fillStyle(0x081020, 1);
      g.fillRect(14, 26, t - 28, t - 50);
      g.lineStyle(1, 0x000000, 1);
      g.strokeRect(14, 26, t - 28, t - 50);
      // shield body
      g.fillStyle(0x1a4a78, 1);
      g.fillRect(t / 2 - 18, 32, 36, 28);
      g.fillTriangle(t / 2 - 18, 60, t / 2 + 18, 60, t / 2, 78);
      // shield highlight
      g.fillStyle(0x66ddff, 1);
      g.fillRect(t / 2 - 18, 32, 36, 8);
      g.fillTriangle(t / 2 - 18, 60, t / 2, 60, t / 2 - 8, 70);
      // shield outline
      g.lineStyle(2, 0x051828, 1);
      g.strokeRect(t / 2 - 18, 32, 36, 28);
      g.beginPath();
      g.moveTo(t / 2 - 18, 60);
      g.lineTo(t / 2, 78);
      g.lineTo(t / 2 + 18, 60);
      g.strokePath();
      // check mark inside shield
      g.lineStyle(4, 0x88ffaa, 1);
      g.beginPath();
      g.moveTo(t / 2 - 12, 50);
      g.lineTo(t / 2 - 4, 60);
      g.lineTo(t / 2 + 14, 40);
      g.strokePath();
      g.lineStyle(1, 0x103820, 1);
      g.beginPath();
      g.moveTo(t / 2 - 12, 50);
      g.lineTo(t / 2 - 4, 60);
      g.lineTo(t / 2 + 14, 40);
      g.strokePath();
      // base panel
      g.fillStyle(0x18283a, 1);
      g.fillRect(8, t - 16, t - 16, 8);
      g.lineStyle(1, 0x000000, 1);
      g.strokeRect(8, t - 16, t - 16, 8);
      g.generateTexture('prop_insurance', t, t);
      g.destroy();
    }

    // Mission terminal — clipboard / datapad with paper, paperclip, alert badge
    {
      const g = this.add.graphics();
      // clipboard backing
      g.fillStyle(0x4a3320, 1);
      g.fillRect(10, 10, t - 20, t - 20);
      g.lineStyle(3, 0x000000, 1);
      g.strokeRect(10, 10, t - 20, t - 20);
      // paper sheet
      g.fillStyle(0xf2dcc0, 1);
      g.fillRect(16, 18, t - 32, t - 36);
      g.lineStyle(1, 0x4a3320, 1);
      g.strokeRect(16, 18, t - 32, t - 36);
      // paper lines (text simulation)
      g.fillStyle(0x6a4a30, 1);
      for (let i = 0; i < 6; i++) {
        const ry = 26 + i * 8;
        const lw = i === 0 ? 36 : (32 + Math.sin(i) * 12);
        g.fillRect(20, ry, lw, 2);
      }
      // header underline
      g.fillStyle(0x000000, 1);
      g.fillRect(20, 30, 36, 1);
      // checkbox bullets
      for (let i = 0; i < 3; i++) {
        const ry = 50 + i * 8;
        g.fillStyle(0xffffff, 1);
        g.fillRect(18, ry, 4, 4);
        g.lineStyle(1, 0x000000, 1);
        g.strokeRect(18, ry, 4, 4);
      }
      // first checkbox checked
      g.lineStyle(2, 0x66ff88, 1);
      g.beginPath();
      g.moveTo(19, 53);
      g.lineTo(20, 54);
      g.lineTo(22, 51);
      g.strokePath();
      // paperclip on top
      g.lineStyle(2, 0xc8d4e4, 1);
      g.strokeRect(t / 2 - 6, 8, 12, 14);
      g.lineStyle(1, 0x808a98, 1);
      g.strokeRect(t / 2 - 4, 10, 8, 10);
      // alert badge top-right
      g.fillStyle(0xff5050, 1);
      g.fillRect(t - 22, 14, 12, 12);
      g.lineStyle(1, 0x4a0a0a, 1);
      g.strokeRect(t - 22, 14, 12, 12);
      g.fillStyle(0xffffff, 1);
      g.fillRect(t - 17, 16, 2, 6);
      g.fillRect(t - 17, 23, 2, 2);
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
