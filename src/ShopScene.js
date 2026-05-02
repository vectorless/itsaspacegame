import Phaser from 'phaser';
import { WEAPONS, STARTING_AMMO } from './weapons.js';
import { REPAIR, MAGNET, SHIELD_UPGRADE, SHIP } from './constants.js';

const ITEMS = [
  { kind: 'weapon', id: 'spread' },
  { kind: 'weapon', id: 'homing' },
  { kind: 'weapon', id: 'railgun' },
  { kind: 'magnet' },
  { kind: 'shield' },
  { kind: 'portalDevice' },
  { kind: 'repair' }
];

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  create() {
    this.state = this.registry.get('gameState');

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(0, 0, w, h, 0x000814, 0.78).setOrigin(0, 0);
    this.add.rectangle(w / 2, h / 2, 540, 470, 0x102030, 0.97)
      .setStrokeStyle(2, 0x6cd0ff);

    this.add.text(w / 2, h / 2 - 210, 'ENGINEERING BAY', {
      fontFamily: 'system-ui, sans-serif', fontSize: '26px', color: '#cfe6ff'
    }).setOrigin(0.5);

    this.oreText = this.add.text(w / 2, h / 2 - 175, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#ffe28a'
    }).setOrigin(0.5);

    this.lines = [];
    let y = h / 2 - 130;
    for (const item of ITEMS) {
      this.lines.push(this.buildLine(w / 2, y, item));
      y += 46;
    }

    this.add.text(w / 2, h / 2 + 210, 'ESC or right-click to close', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#5a7090'
    }).setOrigin(0.5);

    this.refresh();

    this.input.keyboard.once('keydown-ESC', () => this.close());
    this.input.on('pointerdown', (p) => {
      if (p.button === 2) this.close();
    });
  }

  buildLine(cx, cy, item) {
    const rect = this.add.rectangle(cx, cy, 480, 42, 0x18283a, 0.95)
      .setStrokeStyle(1, 0x3aa1ff, 0.5);
    const label = this.add.text(cx - 230, cy, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#cfe6ff', wordWrap: { width: 340 }
    }).setOrigin(0, 0.5);
    const action = this.add.text(cx + 230, cy, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#a8dcff'
    }).setOrigin(1, 0.5);

    rect.setInteractive({ useHandCursor: true });
    rect.on('pointerdown', (p) => {
      if (p.button !== 0) return;
      this.tryBuy(item);
    });
    rect.on('pointerover', () => rect.setFillStyle(0x223a52, 0.95));
    rect.on('pointerout', () => rect.setFillStyle(0x18283a, 0.95));
    return { item, rect, label, action };
  }

  tryBuy(item) {
    if (item.kind === 'repair') {
      if (this.state.hull >= this.state.maxHull) return;
      if (this.state.ore < REPAIR.costPerBuy) return;
      this.state.ore -= REPAIR.costPerBuy;
      this.state.hull = Math.min(this.state.maxHull, this.state.hull + REPAIR.hpPerBuy);
      this.refresh();
      return;
    }

    if (item.kind === 'magnet') {
      const cur = this.state.magnetLevel ?? 0;
      if (cur >= MAGNET.maxLevel) return;
      const cost = MAGNET.costByLevel[cur + 1];
      if (this.state.ore < cost) return;
      this.state.ore -= cost;
      this.state.magnetLevel = cur + 1;
      this.refresh();
      return;
    }

    if (item.kind === 'shield') {
      const cur = this.state.shieldLevel ?? 0;
      if (cur >= SHIELD_UPGRADE.maxLevel) return;
      const cost = SHIELD_UPGRADE.costByLevel[cur + 1];
      if (this.state.ore < cost) return;
      this.state.ore -= cost;
      this.state.shieldLevel = cur + 1;
      this.state.maxShield = SHIP.maxShield + this.state.shieldLevel * SHIELD_UPGRADE.bonusPerLevel;
      this.state.shield = this.state.maxShield;
      this.refresh();
      return;
    }

    if (item.kind === 'portalDevice') {
      if (this.state.hasPortalDevice) return;
      if (this.state.ore < 20) return;
      this.state.ore -= 20;
      this.state.hasPortalDevice = true;
      this.refresh();
      return;
    }

    const id = item.id;
    const cost = WEAPONS[id].cost;
    const owned = this.state.ownedWeapons.includes(id);
    if (!owned) {
      if (this.state.ore < cost) return;
      this.state.ore -= cost;
      this.state.ownedWeapons.push(id);
      this.state.ammo[id] = STARTING_AMMO[id];
    } else if (id === 'homing') {
      if (this.state.ore < cost) return;
      if (this.state.ammo.homing >= STARTING_AMMO.homing) return;
      this.state.ore -= cost;
      this.state.ammo.homing = STARTING_AMMO.homing;
    }
    this.refresh();
  }

  refresh() {
    this.oreText.setText(`Ore: ${this.state.ore}`);
    for (const line of this.lines) {
      const { item, label, action } = line;

      if (item.kind === 'repair') {
        const full = this.state.hull >= this.state.maxHull;
        label.setText(`Hull repair  +${REPAIR.hpPerBuy} HP   (${Math.round(this.state.hull)}/${this.state.maxHull})`);
        if (full) { action.setText('Hull full'); action.setColor('#5a7090'); }
        else if (this.state.ore < REPAIR.costPerBuy) { action.setText(`${REPAIR.costPerBuy} ore`); action.setColor('#7a3a3a'); }
        else { action.setText(`${REPAIR.costPerBuy} ore`); action.setColor('#a8dcff'); }
        continue;
      }

      if (item.kind === 'magnet') {
        const cur = this.state.magnetLevel ?? 0;
        const radius = MAGNET.radiusByLevel[cur];
        if (cur >= MAGNET.maxLevel) {
          label.setText(`Tractor Field — Level ${cur} (range ${radius}px) MAX`);
          action.setText('Maxed'); action.setColor('#5a7090');
        } else {
          const next = cur + 1;
          const nextR = MAGNET.radiusByLevel[next];
          const cost = MAGNET.costByLevel[next];
          if (cur === 0) {
            label.setText(`Tractor Field — pulls nearby ore (level 1 = ${nextR}px)`);
          } else {
            label.setText(`Tractor Field — Lvl ${cur} (${radius}px) → Lvl ${next} (${nextR}px)`);
          }
          action.setText(`${cost} ore`);
          action.setColor(this.state.ore >= cost ? '#a8dcff' : '#7a3a3a');
        }
        continue;
      }

      if (item.kind === 'shield') {
        const cur = this.state.shieldLevel ?? 0;
        const maxS = SHIP.maxShield + cur * SHIELD_UPGRADE.bonusPerLevel;
        if (cur >= SHIELD_UPGRADE.maxLevel) {
          label.setText(`Shield Capacitor — Lvl ${cur} (${maxS}) MAX`);
          action.setText('Maxed'); action.setColor('#5a7090');
        } else {
          const next = cur + 1;
          const nextMax = SHIP.maxShield + next * SHIELD_UPGRADE.bonusPerLevel;
          const cost = SHIELD_UPGRADE.costByLevel[next];
          if (cur === 0) {
            label.setText(`Shield Capacitor — boost max shield (Lvl 1 = ${nextMax})`);
          } else {
            label.setText(`Shield Capacitor — Lvl ${cur} (${maxS}) → Lvl ${next} (${nextMax})`);
          }
          action.setText(`${cost} ore`);
          action.setColor(this.state.ore >= cost ? '#a8dcff' : '#7a3a3a');
        }
        continue;
      }

      if (item.kind === 'portalDevice') {
        if (this.state.hasPortalDevice) {
          label.setText('Portal Device — already in cargo');
          action.setText('OWNED'); action.setColor('#5a7090');
        } else {
          label.setText('Portal Device — opens the wormhole');
          action.setText('20 ore');
          action.setColor(this.state.ore >= 20 ? '#a8dcff' : '#7a3a3a');
        }
        continue;
      }

      const w = WEAPONS[item.id];
      const owned = this.state.ownedWeapons.includes(item.id);
      label.setText(`${w.name} — ${w.desc}`);
      if (!owned) {
        action.setText(`${w.cost} ore`);
        action.setColor(this.state.ore >= w.cost ? '#a8dcff' : '#7a3a3a');
      } else if (item.id === 'homing') {
        const cur = this.state.ammo.homing ?? 0;
        const max = STARTING_AMMO.homing;
        if (cur >= max) { action.setText('Ammo full'); action.setColor('#5a7090'); }
        else {
          action.setText(`Refill: ${w.cost} ore`);
          action.setColor(this.state.ore >= w.cost ? '#a8dcff' : '#7a3a3a');
        }
      } else {
        action.setText('OWNED'); action.setColor('#5a7090');
      }
    }
  }

  close() {
    this.scene.stop('ShopScene');
    this.scene.resume('SpaceScene');
  }
}
