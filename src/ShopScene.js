import Phaser from 'phaser';
import { WEAPONS, STARTING_AMMO } from './weapons.js';
import { REPAIR, MAGNET, SHIELD_UPGRADE, SHIPS, EXOTICS, DROPS } from './constants.js';
import { sellItem, autoSellOverflow, usedSlots, maxSlots, freeSlots, addItem } from './cargo.js';

const PANEL_W = 720;
const PANEL_H = 520;

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  create() {
    this.state = this.registry.get('gameState');

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(0, 0, w, h, 0x000814, 0.85).setOrigin(0, 0);
    this.add.rectangle(w / 2, h / 2, PANEL_W, PANEL_H, 0x102030, 0.97)
      .setStrokeStyle(2, 0x6cd0ff);

    this.add.text(w / 2, h / 2 - PANEL_H / 2 + 22, 'ENGINEERING BAY', {
      fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#cfe6ff'
    }).setOrigin(0.5);

    this.headerText = this.add.text(w / 2, h / 2 - PANEL_H / 2 + 50, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffe28a'
    }).setOrigin(0.5);

    this.tabs = ['cargo', 'weapons', 'upgrades', 'ships'];
    this.currentTab = 'cargo';
    this.tabButtons = [];
    const tabY = h / 2 - PANEL_H / 2 + 86;
    this.tabs.forEach((t, i) => {
      const x = w / 2 - 240 + i * 160;
      const btn = this.add.rectangle(x, tabY, 140, 28, 0x18283a, 0.95)
        .setStrokeStyle(1, 0x3aa1ff, 0.5).setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, tabY, t.toUpperCase(), {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cfe6ff'
      }).setOrigin(0.5);
      btn.on('pointerdown', (p) => { if (p.button === 0) this.switchTab(t); });
      this.tabButtons.push({ id: t, btn, txt });
    });

    this.bodyContainer = this.add.container(w / 2, tabY + 30);

    this.add.text(w / 2, h / 2 + PANEL_H / 2 - 18, 'ESC or right-click to close', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#5a7090'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-ESC', () => this.close());
    this.input.on('pointerdown', (p) => { if (p.button === 2) this.close(); });

    this.refresh();
  }

  switchTab(id) {
    this.currentTab = id;
    this.refresh();
  }

  close() {
    this.scene.stop('ShopScene');
    this.scene.resume('SpaceScene');
  }

  refresh() {
    this.headerText.setText(`Ore: ${this.state.ore}    Scrap: ${this.state.cargo.scrap}    Cargo: ${usedSlots(this.state.cargo)}/${maxSlots(this.state)}`);

    for (const t of this.tabButtons) {
      const active = t.id === this.currentTab;
      t.btn.fillColor = active ? 0x223a52 : 0x18283a;
      t.btn.setStrokeStyle(active ? 2 : 1, active ? 0x6cd0ff : 0x3aa1ff, active ? 0.9 : 0.5);
      t.txt.setColor(active ? '#fff0a0' : '#cfe6ff');
    }

    this.bodyContainer.removeAll(true);

    if (this.currentTab === 'cargo') this.renderCargo();
    else if (this.currentTab === 'weapons') this.renderWeapons();
    else if (this.currentTab === 'upgrades') this.renderUpgrades();
    else if (this.currentTab === 'ships') this.renderShips();
  }

  rowY(i) { return 16 + i * 38; }

  addRow(i, labelText, actionText, actionColor, onClick) {
    const rect = this.add.rectangle(0, this.rowY(i), PANEL_W - 60, 32, 0x18283a, 0.95)
      .setStrokeStyle(1, 0x3aa1ff, 0.4);
    const label = this.add.text(-(PANEL_W / 2 - 50), this.rowY(i), labelText, {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cfe6ff'
    }).setOrigin(0, 0.5);
    const action = this.add.text(PANEL_W / 2 - 50, this.rowY(i), actionText, {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: actionColor
    }).setOrigin(1, 0.5);
    if (onClick) {
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', (p) => { if (p.button === 0) onClick(); });
      rect.on('pointerover', () => rect.setFillStyle(0x223a52, 0.95));
      rect.on('pointerout', () => rect.setFillStyle(0x18283a, 0.95));
    }
    this.bodyContainer.add([rect, label, action]);
  }

  renderCargo() {
    let i = 0;
    if (this.state.cargo.scrap > 0) {
      const value = this.state.cargo.scrap * DROPS.scrapValueOre;
      this.addRow(i++,
        `Scrap × ${this.state.cargo.scrap}`,
        `Sell all for ${value} ore`, '#a8dcff',
        () => { sellItem(this.state, 'scrap', null); this.refresh(); });
    }
    for (const id of this.state.cargo.weapons) {
      const w = WEAPONS[id];
      const sellPrice = Math.floor((w?.cost ?? 0) * DROPS.weaponSellRatio);
      const isStarter = id === 'blaster' || id === 'missile';
      this.addRow(i++,
        `${w?.name ?? id} (weapon)`,
        isStarter ? '— starter —' : `Sell for ${sellPrice} ore`,
        isStarter ? '#5a7090' : '#a8dcff',
        isStarter ? null : () => { sellItem(this.state, 'weapon', id); this.refresh(); });
    }
    this.state.cargo.exotics.forEach((id, idx) => {
      const e = EXOTICS[id];
      this.addRow(i++,
        `${e?.name ?? id} (exotic)`,
        `Sell for ${e?.value ?? 0} ore`, '#a8dcff',
        () => { sellItem(this.state, 'exotic', idx); this.refresh(); });
    });
    if (i === 0) {
      this.addRow(0, 'Cargo hold is empty.', '', '#5a7090', null);
    }
  }

  renderWeapons() {
    const ids = ['spread', 'homing', 'railgun'];
    let i = 0;
    for (const id of ids) {
      const w = WEAPONS[id];
      const owned = this.state.cargo.weapons.includes(id);
      const room = freeSlots(this.state) >= 1;
      let actionText, color, fn;
      if (!owned) {
        if (this.state.ore < w.cost) { actionText = `${w.cost} ore`; color = '#7a3a3a'; fn = null; }
        else if (!room) { actionText = `${w.cost} ore (no cargo space)`; color = '#7a3a3a'; fn = null; }
        else {
          actionText = `Buy: ${w.cost} ore`; color = '#a8dcff';
          fn = () => {
            if (this.state.ore < w.cost) return;
            if (!addItem(this.state, 'weapon', id)) return;
            this.state.ore -= w.cost;
            this.refresh();
          };
        }
      } else if (id === 'homing') {
        const cur = this.state.ammo.homing ?? 0;
        const max = STARTING_AMMO.homing;
        if (cur >= max) { actionText = 'Ammo full'; color = '#5a7090'; fn = null; }
        else if (this.state.ore < w.cost) { actionText = `Refill: ${w.cost} ore`; color = '#7a3a3a'; fn = null; }
        else {
          actionText = `Refill: ${w.cost} ore`; color = '#a8dcff';
          fn = () => {
            if (this.state.ore < w.cost) return;
            this.state.ore -= w.cost;
            this.state.ammo.homing = STARTING_AMMO.homing;
            this.refresh();
          };
        }
      } else {
        actionText = 'OWNED'; color = '#5a7090'; fn = null;
      }
      this.addRow(i++, `${w.name} — ${w.desc}`, actionText, color, fn);
    }
  }

  renderUpgrades() {
    let i = 0;
    // Tractor field
    {
      const cur = this.state.magnetLevel ?? 0;
      const radius = MAGNET.radiusByLevel[cur];
      if (cur >= MAGNET.maxLevel) {
        this.addRow(i++, `Tractor Field — Lvl ${cur} (${radius}px) MAX`, 'Maxed', '#5a7090', null);
      } else {
        const next = cur + 1;
        const cost = MAGNET.costByLevel[next];
        const nextR = MAGNET.radiusByLevel[next];
        const label = cur === 0
          ? `Tractor Field — pulls nearby loot (Lvl 1 = ${nextR}px)`
          : `Tractor Field — Lvl ${cur} (${radius}px) → Lvl ${next} (${nextR}px)`;
        const can = this.state.ore >= cost;
        this.addRow(i++, label, `${cost} ore`, can ? '#a8dcff' : '#7a3a3a',
          can ? () => {
            this.state.ore -= cost;
            this.state.magnetLevel = next;
            this.refresh();
          } : null);
      }
    }
    // Shield capacitor
    {
      const cur = this.state.shieldLevel ?? 0;
      const baseShield = SHIPS[this.state.currentShipId].maxShield;
      const maxS = baseShield + cur * SHIELD_UPGRADE.bonusPerLevel;
      if (cur >= SHIELD_UPGRADE.maxLevel) {
        this.addRow(i++, `Shield Capacitor — Lvl ${cur} (${maxS}) MAX`, 'Maxed', '#5a7090', null);
      } else {
        const next = cur + 1;
        const cost = SHIELD_UPGRADE.costByLevel[next];
        const nextMax = baseShield + next * SHIELD_UPGRADE.bonusPerLevel;
        const label = cur === 0
          ? `Shield Capacitor — boost max shield (Lvl 1 = ${nextMax})`
          : `Shield Capacitor — Lvl ${cur} (${maxS}) → Lvl ${next} (${nextMax})`;
        const can = this.state.ore >= cost;
        this.addRow(i++, label, `${cost} ore`, can ? '#a8dcff' : '#7a3a3a',
          can ? () => {
            this.state.ore -= cost;
            this.state.shieldLevel = next;
            this.state.maxShield = baseShield + next * SHIELD_UPGRADE.bonusPerLevel;
            this.state.shield = this.state.maxShield;
            this.refresh();
          } : null);
      }
    }
    // Portal device
    if (this.state.hasPortalDevice) {
      this.addRow(i++, 'Portal Device — already in cargo', 'OWNED', '#5a7090', null);
    } else {
      const can = this.state.ore >= 20;
      this.addRow(i++, 'Portal Device — opens the wormhole', '20 ore',
        can ? '#a8dcff' : '#7a3a3a',
        can ? () => {
          this.state.ore -= 20;
          this.state.hasPortalDevice = true;
          this.refresh();
        } : null);
    }
    // Hull repair
    {
      const full = this.state.hull >= this.state.maxHull;
      const can = !full && this.state.ore >= REPAIR.costPerBuy;
      this.addRow(i++,
        `Hull repair  +${REPAIR.hpPerBuy} HP   (${Math.round(this.state.hull)}/${this.state.maxHull})`,
        full ? 'Hull full' : `${REPAIR.costPerBuy} ore`,
        full ? '#5a7090' : (can ? '#a8dcff' : '#7a3a3a'),
        can ? () => {
          this.state.ore -= REPAIR.costPerBuy;
          this.state.hull = Math.min(this.state.maxHull, this.state.hull + REPAIR.hpPerBuy);
          this.refresh();
        } : null);
    }
  }

  renderShips() {
    const space = this.scene.get('SpaceScene');
    const inv = (space && space.stationInventory) ?? ['scout', 'heavy'];
    const isOnePad = inv.length === 1;
    let i = 0;
    for (const id of inv) {
      if (id === this.state.currentShipId) continue;
      const s = SHIPS[id];
      const cur = SHIPS[this.state.currentShipId];
      let cost = s.cost;
      let actionPrefix = 'Buy';
      if (isOnePad) {
        cost = Math.max(0, s.cost - Math.floor(cur.cost * 0.5));
        actionPrefix = 'Trade';
      }
      const can = this.state.ore >= cost;
      const label = `${s.name} — H${s.maxHull}/S${s.maxShield} • Acc${s.accel} • Cargo ${s.cargoSlots}`;
      this.addRow(i++, label,
        `${actionPrefix}: ${cost} ore`,
        can ? '#a8dcff' : '#7a3a3a',
        can ? () => {
          if (this.state.ore < cost) return;
          this.state.ore -= cost;
          const result = autoSellOverflow(this.state, id);
          if (space && space.swapShip) space.swapShip(id);
          else this.state.currentShipId = id;
          if (result.itemsSold > 0) {
            this.flashToast(`Auto-sold ${result.itemsSold} items for ${result.oreEarned} ore`);
          }
          this.refresh();
        } : null);
    }
    if (i === 0) {
      this.addRow(0, 'No ships available at this station.', '', '#5a7090', null);
    }
  }

  flashToast(msg) {
    const w = this.scale.width;
    const h = this.scale.height;
    const t = this.add.text(w / 2, h / 2 + PANEL_H / 2 - 50, msg, {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#ffe28a'
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, duration: 2200, onComplete: () => t.destroy() });
  }
}
