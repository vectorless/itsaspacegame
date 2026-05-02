import Phaser from 'phaser';
import { WEAPONS } from './weapons.js';
import { SHIPS } from './constants.js';
import { ensureHardpointsValid } from './cargo.js';

const HP_RADIUS = 16;
const SHIP_SCALE = 6;

function weaponSprite(id) {
  if (id === 'railgun') return 'railshot';
  if (id === 'missile' || id === 'homing') return 'missile';
  return 'bullet';
}

function weaponTint(id) {
  if (id === 'blaster') return 0xfff0a0;
  if (id === 'spread')  return 0x88ffaa;
  if (id === 'missile') return 0xff8050;
  if (id === 'homing')  return 0x66ddff;
  if (id === 'railgun') return 0xc8f0ff;
  return 0xffffff;
}

export default class SchematicScene extends Phaser.Scene {
  constructor() { super('SchematicScene'); }

  create() {
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

    this.cargoY = h - 80;
    this.add.text(w / 2 - 280, this.cargoY - 22, 'CARGO', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#cfe6ff'
    });
    this.cargoEmptyText = this.add.text(w / 2 - 230, this.cargoY, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#5a7090'
    }).setOrigin(0, 0.5);

    this.draggables = [];
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

    for (const hp of this.hardpointObjects) {
      const wid = this.state.hardpoints[hp.id];
      if (!wid) continue;
      this.draggables.push(this.makeDraggable(wid, hp.x, hp.y, { source: 'hp', hardpointId: hp.id }));
    }

    const equippedSet = new Set(Object.values(this.state.hardpoints).filter(Boolean));
    let cx = this.scale.width / 2 - 230;
    let made = 0;
    for (const wid of this.state.cargo.weapons) {
      if (equippedSet.has(wid)) continue;
      this.draggables.push(this.makeDraggable(wid, cx, this.cargoY, { source: 'cargo' }));
      cx += 60;
      made++;
    }
    this.cargoEmptyText.setText(made === 0 ? '(all weapons mounted)' : '');
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
      const evicted = this.state.hardpoints[target.id];
      if (obj.dragInfo.source === 'hp') {
        this.state.hardpoints[obj.dragInfo.hardpointId] = evicted ?? null;
      }
      this.state.hardpoints[target.id] = obj.weaponId;
    } else if (obj.dragInfo.source === 'hp') {
      this.state.hardpoints[obj.dragInfo.hardpointId] = null;
    }

    this.refreshCurrentWeapon();
    this.renderItems();
  }

  refreshCurrentWeapon() {
    const equipped = Object.values(this.state.hardpoints).filter(Boolean);
    if (equipped.length === 0) {
      this.state.currentWeapon = null;
    } else if (!equipped.includes(this.state.currentWeapon)) {
      this.state.currentWeapon = equipped[0];
    }
  }

  close() {
    this.input.setDefaultCursor('none');
    this.scene.stop('SchematicScene');
    this.scene.resume('SpaceScene');
  }
}
