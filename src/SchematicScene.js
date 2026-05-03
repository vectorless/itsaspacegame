import Phaser from 'phaser';
import { WEAPONS } from './weapons.js';
import { SHIPS, CARGO, EXOTICS } from './constants.js';
import { ensureHardpointsValid, maxSlots } from './cargo.js';

const HP_RADIUS = 16;
const SHIP_SCALE = 6;

function weaponSprite(id) {
  if (id === 'railgun') return 'railshot';
  if (id === 'missile' || id === 'homing') return 'missile';
  if (id === 'mining_laser') return 'railshot';
  return 'bullet';
}

function weaponTint(id) {
  if (id === 'blaster') return 0xfff0a0;
  if (id === 'spread')  return 0x88ffaa;
  if (id === 'missile') return 0xff8050;
  if (id === 'homing')  return 0x66ddff;
  if (id === 'railgun') return 0xc8f0ff;
  if (id === 'mining_laser') return 0x66ff88;
  return 0xffffff;
}

export default class SchematicScene extends Phaser.Scene {
  constructor() { super('SchematicScene'); }

  init(data = {}) {
    this.fromScene = data.from ?? 'SpaceScene';
  }

  create() {
    this.scene.bringToTop();
    this.state = this.registry.get('gameState');
    ensureHardpointsValid(this.state);

    const w = this.scale.width;
    const h = this.scale.height;
    const ship = SHIPS[this.state.currentShipId];

    this.add.rectangle(0, 0, w, h, 0x000814, 0.88).setOrigin(0, 0);
    this.add.rectangle(w / 2, h / 2, 720, 540, 0x102030, 0.97).setStrokeStyle(2, 0x6cd0ff);

    this.add.text(w / 2, 36, `LOADOUT — ${ship.name.toUpperCase()}`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#cfe6ff'
    }).setOrigin(0.5);

    this.add.text(w / 2, 62, 'Drag a weapon onto a hardpoint to equip. Drag a mounted weapon away to unequip.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#88aacc'
    }).setOrigin(0.5);

    this.shipCenterX = w / 2;
    this.shipCenterY = h / 2 - 20;
    this.add.image(this.shipCenterX, this.shipCenterY, ship.sprite)
      .setScale(SHIP_SCALE)
      .setAlpha(0.85);

    this.hardpointObjects = [];
    for (const hp of ship.hardpoints) {
      const wx = this.shipCenterX + hp.x * SHIP_SCALE;
      const wy = this.shipCenterY + hp.y * SHIP_SCALE;
      const marker = this.add.circle(wx, wy, HP_RADIUS, 0x224458, 0.55).setStrokeStyle(2, 0x6cd0ff, 0.9);
      const label = this.add.text(wx, wy + HP_RADIUS + 8, hp.label, {
        fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#88aacc'
      }).setOrigin(0.5);
      this.hardpointObjects.push({ id: hp.id, x: wx, y: wy, marker, label });
    }

    this.cargoY = h - 90;
    this.add.text(w / 2, this.cargoY - 32, 'CARGO HOLD', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#88aacc'
    }).setOrigin(0.5);

    this.draggables = [];
    this.gridArtifacts = [];
    this.renderItems();

    this.add.text(w / 2, h - 16, 'F or ESC to close', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#5a7090'
    }).setOrigin(0.5);

    this.input.on('drag', (_p, obj, dx, dy) => {
      obj.x = dx;
      obj.y = dy;
      if (obj.label) obj.label.setPosition(dx, dy + 18);
    });

    this.input.on('dragend', (_p, obj) => this.handleDrop(obj));

    this.input.keyboard.on('keydown-F', () => this.close());
    this.input.keyboard.on('keydown-ESC', () => this.close());

    this.input.setDefaultCursor('default');
  }

  renderItems() {
    for (const d of this.draggables) {
      d.sprite.destroy();
      if (d.label) d.label.destroy();
    }
    this.draggables = [];

    for (const a of this.gridArtifacts) a.destroy();
    this.gridArtifacts = [];

    for (const hp of this.hardpointObjects) {
      const slot = this.state.hardpoints[hp.id];
      const wid = slot?.weaponId;
      if (!wid) continue;
      this.draggables.push(this.makeDraggable(wid, hp.x, hp.y, { source: 'hp', hardpointId: hp.id }));
    }

    this.renderCargoGrid();
  }

  buildSlotList() {
    const slots = [];
    const equipped = new Set(
      Object.values(this.state.hardpoints)
        .map((s) => s?.weaponId)
        .filter(Boolean)
    );
    for (const w of this.state.cargo.weapons) {
      if (!equipped.has(w)) slots.push({ kind: 'weapon', id: w });
    }
    for (const e of this.state.cargo.exotics) {
      slots.push({ kind: 'exotic', id: e });
    }
    let oreLeft = this.state.cargo.ore || 0;
    while (oreLeft > 0) {
      const qty = Math.min(oreLeft, CARGO.orePerSlot);
      slots.push({ kind: 'ore', qty });
      oreLeft -= qty;
    }
    let scrapLeft = this.state.cargo.scrap || 0;
    while (scrapLeft > 0) {
      const qty = Math.min(scrapLeft, CARGO.scrapPerSlot);
      slots.push({ kind: 'scrap', qty });
      scrapLeft -= qty;
    }
    return slots;
  }

  renderCargoGrid() {
    const slots = this.buildSlotList();
    const total = maxSlots(this.state);
    const cols = total <= 8 ? Math.max(4, total) : 8;
    const cellSize = 32;
    const gap = 4;
    const totalWidth = cols * cellSize + (cols - 1) * gap;
    const startX = this.scale.width / 2 - totalWidth / 2 + cellSize / 2;
    const startY = this.cargoY;

    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cellSize + gap);
      const cy = startY + row * (cellSize + gap);

      const cell = this.add.rectangle(cx, cy, cellSize, cellSize, 0x0a1828, 0.7)
        .setStrokeStyle(1, 0x3a607a, 0.55);
      this.gridArtifacts.push(cell);

      if (i >= slots.length) continue;
      const item = slots[i];

      if (item.kind === 'weapon') {
        this.draggables.push(this.makeDraggable(item.id, cx, cy, { source: 'cargo' }));
      } else if (item.kind === 'ore') {
        const icon = this.add.image(cx, cy - 5, 'ore').setScale(1.4);
        const label = this.add.text(cx, cy + 9, `${item.qty}`, {
          fontFamily: 'system-ui, sans-serif', fontSize: '9px', color: '#ffd060'
        }).setOrigin(0.5);
        this.gridArtifacts.push(icon, label);
      } else if (item.kind === 'scrap') {
        const icon = this.add.image(cx, cy - 5, 'scrap').setScale(1.4);
        const label = this.add.text(cx, cy + 9, `${item.qty}`, {
          fontFamily: 'system-ui, sans-serif', fontSize: '9px', color: '#b8b8c8'
        }).setOrigin(0.5);
        this.gridArtifacts.push(icon, label);
      } else if (item.kind === 'exotic') {
        const icon = this.add.image(cx, cy, EXOTICS[item.id].sprite).setScale(1.6);
        this.gridArtifacts.push(icon);
      }
    }
  }

  makeDraggable(weaponId, x, y, info) {
    const sprite = this.add.image(x, y, weaponSprite(weaponId)).setScale(2.5);
    sprite.setTint(weaponTint(weaponId));
    sprite.weaponId = weaponId;
    sprite.dragInfo = info;
    sprite.startX = x;
    sprite.startY = y;
    sprite.setInteractive({ draggable: true });
    sprite.setDepth(20);

    const label = this.add.text(x, y + 18, WEAPONS[weaponId]?.name ?? weaponId, {
      fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#cfe6ff'
    }).setOrigin(0.5).setDepth(20);
    sprite.label = label;

    return { sprite, label };
  }

  handleDrop(obj) {
    let target = null;
    let bestD2 = HP_RADIUS * HP_RADIUS * 4;
    for (const hp of this.hardpointObjects) {
      const dx = obj.x - hp.x;
      const dy = obj.y - hp.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; target = hp; }
    }

    if (target) {
      const targetSlot = this.state.hardpoints[target.id];
      const evictedId = targetSlot?.weaponId ?? null;
      if (obj.dragInfo.source === 'hp') {
        const sourceSlot = this.state.hardpoints[obj.dragInfo.hardpointId];
        if (sourceSlot) {
          sourceSlot.weaponId = evictedId;
          if (!evictedId) sourceSlot.active = false;
        }
      }
      if (targetSlot) {
        if (targetSlot.weaponId !== obj.weaponId) {
          targetSlot.active = false;
          targetSlot.lastFire = 0;
        }
        targetSlot.weaponId = obj.weaponId;
      }
    } else if (obj.dragInfo.source === 'hp') {
      const sourceSlot = this.state.hardpoints[obj.dragInfo.hardpointId];
      if (sourceSlot) {
        sourceSlot.weaponId = null;
        sourceSlot.active = false;
      }
    }

    this.refreshCurrentWeapon();
    this.renderItems();
  }

  refreshCurrentWeapon() {
    const equipped = Object.values(this.state.hardpoints)
      .map((s) => s?.weaponId)
      .filter(Boolean);
    if (equipped.length === 0) {
      this.state.currentWeapon = null;
    } else if (!equipped.includes(this.state.currentWeapon)) {
      this.state.currentWeapon = equipped[0];
    }
  }

  close() {
    if (this.fromScene === 'SpaceScene') this.input.setDefaultCursor('none');
    else this.input.setDefaultCursor('default');
    this.scene.stop('SchematicScene');
    this.scene.run(this.fromScene);
  }
}
