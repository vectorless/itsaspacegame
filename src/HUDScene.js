import Phaser from 'phaser';
import { WEAPONS } from './weapons.js';
import { WORLD_W, WORLD_H, COLORS, SHIPS } from './constants.js';
import { MISSIONS } from './missions.js';
import { usedSlots, maxSlots } from './cargo.js';

const MINIMAP_SIZE = 160;
const MINIMAP_PAD = 12;
const BAR_W = 180;
const BAR_H = 10;

export default class HUDScene extends Phaser.Scene {
  constructor() { super('HUDScene'); }

  create() {
    const style = {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#cfe6ff'
    };

    this.shieldLabel = this.add.text(12, 10, 'SHIELD', { ...style, color: '#a8dcff' });
    this.shieldBarBg = this.add.rectangle(12, 28, BAR_W, BAR_H, 0x10202c, 0.85)
      .setOrigin(0, 0).setStrokeStyle(1, 0x3a607a);
    this.shieldBar = this.add.rectangle(13, 29, BAR_W - 2, BAR_H - 2, COLORS.shieldBar, 0.95)
      .setOrigin(0, 0);

    this.hullLabel = this.add.text(12, 44, 'HULL', { ...style, color: '#ffb8b8' });
    this.hullBarBg = this.add.rectangle(12, 62, BAR_W, BAR_H, 0x2c1010, 0.85)
      .setOrigin(0, 0).setStrokeStyle(1, 0x7a3a3a);
    this.hullBar = this.add.rectangle(13, 63, BAR_W - 2, BAR_H - 2, COLORS.hullBar, 0.95)
      .setOrigin(0, 0);

    this.energyLabel = this.add.text(12, 78, 'ENERGY', { ...style, color: '#88ffaa' });
    this.energyBarBg = this.add.rectangle(12, 96, BAR_W, BAR_H, 0x102818, 0.85)
      .setOrigin(0, 0).setStrokeStyle(1, 0x3a7a4a);
    this.energyBar = this.add.rectangle(13, 97, BAR_W - 2, BAR_H - 2, 0x66ff88, 0.95)
      .setOrigin(0, 0);
    this.chargingText = this.add.text(BAR_W + 20, 78, '', { ...style, color: '#a080ff', fontSize: '12px' });

    this.shipText = this.add.text(12, 114, '', { ...style, color: '#a0c0ff' });
    this.weaponText = this.add.text(12, 132, '', style);
    this.ammoText = this.add.text(12, 150, '', style);
    this.speedText = this.add.text(12, 168, '', style);
    this.oreText = this.add.text(12, 190, '', { ...style, color: '#ffe28a', fontSize: '16px' });
    this.rawOreText = this.add.text(12, 212, '', { ...style, color: '#ffd060' });
    this.scrapText = this.add.text(12, 230, '', { ...style, color: '#b8b8c8' });
    this.cargoText = this.add.text(12, 248, '', { ...style, color: '#cfe6ff' });
    this.levelText = this.add.text(12, 270, '', { ...style, color: '#a0c0ff' });
    this.deviceText = this.add.text(12, 288, '', { ...style, color: '#ff80ff' });

    this.helpText = this.add.text(12, this.scale.height - 24,
      'A/D rotate • W/S thrust • Mouse aim • Click/Space fire • E cycle • F loadout • dock star base',
      { ...style, color: '#5a7090', fontSize: '12px' });

    this.minimapX = this.scale.width - MINIMAP_SIZE - MINIMAP_PAD;
    this.minimapY = MINIMAP_PAD;

    this.add.rectangle(
      this.minimapX, this.minimapY, MINIMAP_SIZE, MINIMAP_SIZE, 0x000814, 0.55
    ).setOrigin(0, 0).setStrokeStyle(1, 0x3aa1ff, 0.7);

    this.minimapG = this.add.graphics();
  }

  update() {
    const state = this.registry.get('gameState');
    if (!state) return;
    const weapon = WEAPONS[state.currentWeapon];
    const ammo = state.ammo[state.currentWeapon];
    const ship = SHIPS[state.currentShipId];

    const sFrac = Phaser.Math.Clamp(state.shield / state.maxShield, 0, 1);
    const hFrac = Phaser.Math.Clamp(state.hull / state.maxHull, 0, 1);
    this.shieldBar.width = (BAR_W - 2) * sFrac;
    this.hullBar.width = (BAR_W - 2) * hFrac;
    this.hullBar.fillColor = hFrac < 0.3 ? COLORS.hullBarLow : COLORS.hullBar;

    this.shieldLabel.setText(`SHIELD  ${Math.round(state.shield)} / ${state.maxShield}`);
    this.hullLabel.setText(`HULL  ${Math.round(state.hull)} / ${state.maxHull}`);

    const eFrac = Phaser.Math.Clamp((state.energy ?? 0) / (state.maxEnergy ?? 100), 0, 1);
    this.energyBar.width = (BAR_W - 2) * eFrac;
    this.energyLabel.setText(`ENERGY  ${Math.round(state.energy ?? 0)} / ${state.maxEnergy ?? 100}`);
    this.chargingText.setText(state.charging ? '◆ CHARGING' : '');

    this.shipText.setText(`Ship:   ${ship.name}`);
    this.weaponText.setText(`Weapon: ${weapon ? weapon.name : '—'}`);
    this.ammoText.setText(`Ammo:   ${weapon && Number.isFinite(ammo) ? ammo : '∞'}`);
    this.speedText.setText(`Speed:  ${Math.round(state.speed)}`);
    this.oreText.setText(`Credits: ${state.credits ?? 0}`);
    this.rawOreText.setText(`Raw ore: ${state.cargo.ore || 0}`);
    this.scrapText.setText(`Scrap:   ${state.cargo.scrap}`);
    this.cargoText.setText(`Cargo:  ${usedSlots(state.cargo)} / ${maxSlots(state)}`);
    this.levelText.setText(`Sector ${state.level ?? 1}`);
    this.deviceText.setText(state.hasPortalDevice ? 'Portal Device  ✓' : '');

    this.drawMinimap();
  }

  drawMinimap() {
    try {
      this._drawMinimap();
    } catch (err) {
      console.error('[HUDScene.drawMinimap]', err);
      this.minimapG.clear();
    }
  }

  _drawMinimap() {
    const space = this.scene.get('SpaceScene');
    const spaceLive = (space && this.scene.isActive('SpaceScene'))
                      || (space && this.scene.isPaused('SpaceScene'));
    if (!spaceLive || !space.controller || !space.asteroidGroup) {
      this.minimapG.clear();
      return;
    }

    const g = this.minimapG;
    const ox = this.minimapX, oy = this.minimapY;
    const sx = MINIMAP_SIZE / WORLD_W;
    const sy = MINIMAP_SIZE / WORLD_H;

    g.clear();

    g.fillStyle(COLORS.asteroid, 0.95);
    space.asteroidGroup.children.iterate((a) => {
      if (!a || !a.active) return;
      const r = Math.max(1, (a.scaleValue || 1) * 1.6);
      g.fillCircle(ox + a.x * sx, oy + a.y * sy, r);
    });

    if (space.collectables) {
      space.collectables.children.iterate((c) => {
        if (!c || !c.active) return;
        let color = COLORS.ore;
        if (c.kind === 'scrap') color = COLORS.scrap;
        else if (c.kind === 'exotic') color = COLORS.exoticData;
        else if (c.kind === 'weapon') color = COLORS.blaster;
        g.fillStyle(color, 1);
        g.fillRect(ox + c.x * sx - 1, oy + c.y * sy - 1, 2, 2);
      });
    }

    if (space.stations) {
      g.fillStyle(COLORS.stationOutline, 1);
      for (const s of space.stations) {
        g.fillRect(ox + s.x * sx - 2, oy + s.y * sy - 2, 4, 4);
      }
    }

    if (space.blackhole) {
      g.fillStyle(0x8060ff, 0.6);
      g.fillCircle(ox + space.blackhole.x * sx, oy + space.blackhole.y * sy, 3);
    }

    if (space.portal) {
      const open = !!(space.gameState && space.gameState.hasPortalDevice);
      g.fillStyle(open ? COLORS.portalRing : COLORS.portalClosed, 1);
      g.fillCircle(ox + space.portal.x * sx, oy + space.portal.y * sy, 3);
      if (open) {
        g.lineStyle(1, COLORS.portalRing, 0.8);
        g.strokeCircle(ox + space.portal.x * sx, oy + space.portal.y * sy, 5);
      }
    }

    if (space.missionZones) {
      for (const z of space.missionZones) {
        if (!z.active) continue;
        const m = MISSIONS[z.missionId];
        const fill = m?.markerColor ?? 0xffaa50;
        const stroke = m?.markerColor ? 0xcfb8ff : 0xffe080;
        g.fillStyle(fill, 1);
        g.fillCircle(ox + z.x * sx, oy + z.y * sy, 3.5);
        g.lineStyle(1, stroke, 0.9);
        g.strokeCircle(ox + z.x * sx, oy + z.y * sy, 5.5);
      }
    }

    if (space.wrecks) {
      g.fillStyle(0xffaa50, 1);
      space.wrecks.children.iterate((w) => {
        if (!w || !w.active) return;
        g.fillRect(ox + w.x * sx - 2.5, oy + w.y * sy - 2.5, 5, 5);
        g.lineStyle(1, 0xffe28a, 0.8);
        g.strokeRect(ox + w.x * sx - 2.5, oy + w.y * sy - 2.5, 5, 5);
      });
    }

    if (space.portalDevices) {
      g.fillStyle(COLORS.portalDevice, 1);
      space.portalDevices.children.iterate((d) => {
        if (!d || !d.active) return;
        g.fillRect(ox + d.x * sx - 2, oy + d.y * sy - 2, 4, 4);
      });
    }

    if (space.enemies) {
      space.enemies.children.iterate((e) => {
        if (!e || !e.active) return;
        const isElite = e.kind === 'elite';
        g.fillStyle(isElite ? COLORS.elite : COLORS.enemy, 1);
        g.fillCircle(ox + e.x * sx, oy + e.y * sy, isElite ? 3.6 : 2.4);
      });
    }

    if (space.drones) {
      g.fillStyle(COLORS.drone, 1);
      space.drones.children.iterate((d) => {
        if (!d || !d.active) return;
        g.fillRect(ox + d.x * sx - 0.5, oy + d.y * sy - 0.5, 1.5, 1.5);
      });
    }

    const view = space.cameras.main.worldView;
    g.lineStyle(1, 0x3aa1ff, 0.45);
    g.strokeRect(ox + view.x * sx, oy + view.y * sy, view.width * sx, view.height * sy);

    const ship = space.controller;
    const px = ox + ship.x * sx, py = oy + ship.y * sy;
    const a = ship.angle;
    const len = 6, half = 2.4;
    const tipX = px + Math.cos(a) * len, tipY = py + Math.sin(a) * len;
    const baseLX = px + Math.cos(a + Math.PI * 0.85) * half;
    const baseLY = py + Math.sin(a + Math.PI * 0.85) * half;
    const baseRX = px + Math.cos(a - Math.PI * 0.85) * half;
    const baseRY = py + Math.sin(a - Math.PI * 0.85) * half;
    g.fillStyle(COLORS.ship, 1);
    g.fillTriangle(tipX, tipY, baseLX, baseLY, baseRX, baseRY);
  }
}
