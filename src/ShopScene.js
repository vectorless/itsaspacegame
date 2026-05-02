import Phaser from 'phaser';
import { WEAPONS, STARTING_AMMO } from './weapons.js';
import { REPAIR, MAGNET, SHIELD_UPGRADE, SHIPS, EXOTICS, DROPS, MARKETPLACE } from './constants.js';
import { sellItem, autoSellOverflow, usedSlots, maxSlots, freeSlots, addItem } from './cargo.js';

const PANEL_W = 720;
const PANEL_H = 520;

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  init(data = {}) {
    this.fromScene = data.from ?? 'StarbaseScene';
  }

  create() {
    try {
      this._create();
    } catch (err) {
      console.error('[ShopScene.create]', err);
      const w = this.scale.width, h = this.scale.height;
      this.add.rectangle(0, 0, w, h, 0x000000, 0.9).setOrigin(0, 0);
      this.add.text(w / 2, h / 2, `ShopScene crashed:\n${err && err.message}\nESC to close`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ff8080', align: 'center'
      }).setOrigin(0.5);
      this.input.keyboard.once('keydown-ESC', () => this.close());
    }
  }

  _create() {
    this.scene.bringToTop();
    this.state = this.registry.get('gameState');

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(0, 0, w, h, 0x000814, 0.85).setOrigin(0, 0);
    this.add.rectangle(w / 2, h / 2, PANEL_W, PANEL_H, 0x102030, 0.97)
      .setStrokeStyle(2, 0x6cd0ff);

    this.add.text(w / 2, h / 2 - PANEL_H / 2 + 22, 'SHOP', {
      fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#cfe6ff'
    }).setOrigin(0.5);

    this.headerText = this.add.text(w / 2, h / 2 - PANEL_H / 2 + 50, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffe28a'
    }).setOrigin(0.5);

    this.tabs = ['marketplace', 'weapons', 'upgrades', 'ships'];
    this.currentTab = 'marketplace';
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

    this.input.setDefaultCursor('default');

    this.refresh();
  }

  switchTab(id) {
    this.currentTab = id;
    this.refresh();
  }

  close() {
    this.scene.stop('ShopScene');
    this.scene.run(this.fromScene);
  }

  refresh() {
    this.headerText.setText(`Credits: ${this.state.credits}    Raw ore: ${this.state.cargo.ore || 0}    Scrap: ${this.state.cargo.scrap}    Cargo: ${usedSlots(this.state.cargo)}/${maxSlots(this.state)}`);

    for (const t of this.tabButtons) {
      const active = t.id === this.currentTab;
      t.btn.fillColor = active ? 0x223a52 : 0x18283a;
      t.btn.setStrokeStyle(active ? 2 : 1, active ? 0x6cd0ff : 0x3aa1ff, active ? 0.9 : 0.5);
      t.txt.setColor(active ? '#fff0a0' : '#cfe6ff');
    }

    this.bodyContainer.removeAll(true);

    if (this.currentTab === 'marketplace') this.renderMarketplace();
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
    if ((this.state.cargo.ore || 0) > 0) {
      const value = this.state.cargo.ore;
      this.addRow(i++,
        `Raw ore × ${this.state.cargo.ore}`,
        `Sell all for ${value} credits`, '#ffe28a',
        () => { sellItem(this.state, 'ore', null); this.refresh(); });
    }
    if (this.state.cargo.scrap > 0) {
      const value = this.state.cargo.scrap * DROPS.scrapValueOre;
      this.addRow(i++,
        `Scrap × ${this.state.cargo.scrap}`,
        `Sell all for ${value} credits`, '#b8b8c8',
        () => { sellItem(this.state, 'scrap', null); this.refresh(); });
    }
    for (const id of this.state.cargo.weapons) {
      const w = WEAPONS[id];
      const sellPrice = Math.floor((w?.cost ?? 0) * DROPS.weaponSellRatio);
      const isStarter = id === 'blaster' || id === 'mining_laser';
      this.addRow(i++,
        `${w?.name ?? id} (weapon)`,
        isStarter ? '— starter —' : `Sell for ${sellPrice} credits`,
        isStarter ? '#5a7090' : '#a8dcff',
        isStarter ? null : () => { sellItem(this.state, 'weapon', id); this.refresh(); });
    }
    this.state.cargo.exotics.forEach((id, idx) => {
      const e = EXOTICS[id];
      this.addRow(i++,
        `${e?.name ?? id} (exotic)`,
        `Sell for ${e?.value ?? 0} credits`, '#a8dcff',
        () => { sellItem(this.state, 'exotic', idx); this.refresh(); });
    });
    if (i === 0) {
      this.addRow(0, 'Cargo hold is empty.', '', '#5a7090', null);
    }
  }

  renderWeapons() {
    const ids = ['missile', 'spread', 'homing', 'railgun'];
    let i = 0;
    for (const id of ids) {
      const w = WEAPONS[id];
      const owned = this.state.cargo.weapons.includes(id);
      const room = freeSlots(this.state) >= 1;
      let actionText, color, fn;
      if (!owned) {
        if (this.state.credits < w.cost) { actionText = `${w.cost} credits`; color = '#7a3a3a'; fn = null; }
        else if (!room) { actionText = `${w.cost} credits (no cargo space)`; color = '#7a3a3a'; fn = null; }
        else {
          actionText = `Buy: ${w.cost} credits`; color = '#a8dcff';
          fn = () => {
            if (this.state.credits < w.cost) return;
            if (!addItem(this.state, 'weapon', id)) return;
            this.state.credits -= w.cost;
            this.refresh();
          };
        }
      } else if (id === 'homing') {
        const cur = this.state.ammo.homing ?? 0;
        const max = STARTING_AMMO.homing;
        if (cur >= max) { actionText = 'Ammo full'; color = '#5a7090'; fn = null; }
        else if (this.state.credits < w.cost) { actionText = `Refill: ${w.cost} credits`; color = '#7a3a3a'; fn = null; }
        else {
          actionText = `Refill: ${w.cost} credits`; color = '#a8dcff';
          fn = () => {
            if (this.state.credits < w.cost) return;
            this.state.credits -= w.cost;
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
        const can = this.state.credits >= cost;
        this.addRow(i++, label, `${cost} credits`, can ? '#a8dcff' : '#7a3a3a',
          can ? () => {
            this.state.credits -= cost;
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
        const can = this.state.credits >= cost;
        this.addRow(i++, label, `${cost} credits`, can ? '#a8dcff' : '#7a3a3a',
          can ? () => {
            this.state.credits -= cost;
            this.state.shieldLevel = next;
            this.state.maxShield = baseShield + next * SHIELD_UPGRADE.bonusPerLevel;
            this.state.shield = this.state.maxShield;
            this.refresh();
          } : null);
      }
    }
    // Hull repair
    {
      const full = this.state.hull >= this.state.maxHull;
      const can = !full && this.state.credits >= REPAIR.costPerBuy;
      this.addRow(i++,
        `Hull repair  +${REPAIR.hpPerBuy} HP   (${Math.round(this.state.hull)}/${this.state.maxHull})`,
        full ? 'Hull full' : `${REPAIR.costPerBuy} credits`,
        full ? '#5a7090' : (can ? '#a8dcff' : '#7a3a3a'),
        can ? () => {
          this.state.credits -= REPAIR.costPerBuy;
          this.state.hull = Math.min(this.state.maxHull, this.state.hull + REPAIR.hpPerBuy);
          this.refresh();
        } : null);
    }
  }

  getStation() {
    const space = this.scene.get('SpaceScene');
    return space?.stations?.[0] ?? null;
  }

  marketPrice(itemId, basePrice) {
    const station = this.getStation();
    const mod = station?.priceModifiers?.[itemId] ?? 1;
    return Math.max(1, Math.round(basePrice * mod));
  }

  renderMarketplace() {
    const station = this.getStation();
    const stationName = station?.stationName ?? 'this station';
    let i = 0;

    this.addRow(i++, `Market — ${stationName}  (prices vary by station)`, '', '#88aacc', null);

    for (const item of MARKETPLACE) {
      const price = this.marketPrice(item.id, item.basePrice);
      const mod = station?.priceModifiers?.[item.id] ?? 1;
      const modPct = Math.round((mod - 1) * 100);
      const modTag = mod === 1 ? '' : (mod > 1 ? ` +${modPct}%` : ` ${modPct}%`);

      let label = '', actionText = '', color = '#a8dcff', fn = null;

      if (item.kind === 'weapon') {
        const w = WEAPONS[item.id];
        const owned = this.state.cargo.weapons.includes(item.id);
        const room = freeSlots(this.state) >= 1;
        label = `${w.name} (weapon)  base ${item.basePrice}${modTag}`;
        if (owned) {
          actionText = 'OWNED'; color = '#5a7090';
        } else if (this.state.credits < price) {
          actionText = `Buy ${price} cr`; color = '#7a3a3a';
        } else if (!room) {
          actionText = `Buy ${price} cr (no cargo)`; color = '#7a3a3a';
        } else {
          actionText = `Buy ${price} cr`;
          fn = () => {
            if (this.state.credits < price) return;
            if (!addItem(this.state, 'weapon', item.id)) return;
            this.state.credits -= price;
            this.refresh();
          };
        }
      } else if (item.kind === 'exotic') {
        const e = EXOTICS[item.id];
        const inCargo = (this.state.cargo.exotics ?? []).filter((x) => x === item.id).length;
        label = `${e.name} (exotic)  base ${item.basePrice}${modTag}    in cargo: ${inCargo}`;
        const room = freeSlots(this.state) >= 1;
        if (this.state.credits < price) {
          actionText = `Buy ${price} cr`; color = '#7a3a3a';
        } else if (!room) {
          actionText = `Buy ${price} cr (no cargo)`; color = '#7a3a3a';
        } else {
          actionText = `Buy ${price} cr`;
          fn = () => {
            if (this.state.credits < price) return;
            if (!addItem(this.state, 'exotic', item.id)) return;
            this.state.credits -= price;
            this.refresh();
          };
        }
      } else if (item.kind === 'consumable' && item.id === 'portal_device') {
        label = `Portal Device (consumable)  base ${item.basePrice}${modTag}`;
        if (this.state.hasPortalDevice) {
          actionText = 'OWNED'; color = '#5a7090';
        } else if (this.state.credits < price) {
          actionText = `Buy ${price} cr`; color = '#7a3a3a';
        } else {
          actionText = `Buy ${price} cr`;
          fn = () => {
            if (this.state.credits < price) return;
            this.state.credits -= price;
            this.state.hasPortalDevice = true;
            this.refresh();
          };
        }
      }

      this.addRow(i++, label, actionText, color, fn);
    }

    // SELL section
    const sellable = [];
    for (const wid of this.state.cargo.weapons) {
      if (wid === 'blaster' || wid === 'mining_laser') continue;
      const item = MARKETPLACE.find((m) => m.id === wid);
      if (item) sellable.push({ kind: 'weapon', id: wid, item });
    }
    const exoticCounts = {};
    for (const id of this.state.cargo.exotics ?? []) {
      exoticCounts[id] = (exoticCounts[id] ?? 0) + 1;
    }
    for (const [id, count] of Object.entries(exoticCounts)) {
      const item = MARKETPLACE.find((m) => m.id === id);
      if (item) sellable.push({ kind: 'exotic', id, item, count });
    }

    if (sellable.length > 0) {
      this.addRow(i++, '— SELL FROM CARGO —', '', '#88aacc', null);
      for (const s of sellable) {
        const price = this.marketPrice(s.id, s.item.basePrice);
        const sellPrice = s.kind === 'weapon' ? Math.floor(price * DROPS.weaponSellRatio) : price;
        const label = s.kind === 'weapon'
          ? `${WEAPONS[s.id].name} (weapon)`
          : `${EXOTICS[s.id].name} (exotic) × ${s.count}`;
        this.addRow(i++, label, `Sell ${sellPrice} cr`, '#88ffaa', () => {
          if (s.kind === 'weapon') sellItem(this.state, 'weapon', s.id);
          else sellItem(this.state, 'exotic', this.state.cargo.exotics.indexOf(s.id));
          this.refresh();
        });
      }
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
      const can = this.state.credits >= cost;
      const label = `${s.name} — H${s.maxHull}/S${s.maxShield} • Acc${s.accel} • Cargo ${s.cargoSlots} • Fuel ${s.fuelCapacity ?? 200}`;
      this.addRow(i++, label,
        `${actionPrefix}: ${cost} credits`,
        can ? '#a8dcff' : '#7a3a3a',
        can ? () => {
          if (this.state.credits < cost) return;
          this.state.credits -= cost;
          const result = autoSellOverflow(this.state, id);
          if (space && space.swapShip) space.swapShip(id);
          else this.state.currentShipId = id;
          if (result.itemsSold > 0) {
            this.flashToast(`Auto-sold ${result.itemsSold} items for ${result.oreEarned} credits`);
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
