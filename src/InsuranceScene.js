import Phaser from 'phaser';
import { SHIPS, INSURANCE } from './constants.js';
import { WEAPONS } from './weapons.js';
import { loadoutValue, insurancePremium, insuranceRate } from './state.js';

const PANEL_W = 600;
const PANEL_H = 480;

export default class InsuranceScene extends Phaser.Scene {
  constructor() { super('InsuranceScene'); }

  init(data = {}) {
    this.fromScene = data.from ?? 'StarbaseScene';
  }

  create() {
    this.scene.bringToTop();
    this.state = this.registry.get('gameState');
    this.input.setDefaultCursor('default');

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(0, 0, w, h, 0x000814, 0.85).setOrigin(0, 0);
    this.add.rectangle(w / 2, h / 2, PANEL_W, PANEL_H, 0x10202c, 0.97)
      .setStrokeStyle(2, 0x66ddff);

    this.add.text(w / 2, h / 2 - PANEL_H / 2 + 22, 'SHIP INSURANCE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#cfe6ff'
    }).setOrigin(0.5);

    this.bodyContainer = this.add.container(w / 2, h / 2 - PANEL_H / 2 + 60);

    this.add.text(w / 2, h / 2 + PANEL_H / 2 - 18, 'ESC or right-click to close', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#5a7090'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-ESC', () => this.close());
    this.input.on('pointerdown', (p) => { if (p.button === 2) this.close(); });

    this.refresh();
  }

  close() {
    this.input.setDefaultCursor('none');
    this.scene.stop('InsuranceScene');
    this.scene.run(this.fromScene);
  }

  refresh() {
    this.bodyContainer.removeAll(true);

    const ship = SHIPS[this.state.currentShipId];
    const weapons = (this.state.cargo.weapons || []).filter((id) => WEAPONS[id]);
    const totalValue = loadoutValue(this.state);
    const premium = insurancePremium(this.state);
    const rate = insuranceRate(this.state);
    const claims = this.state.insurance?.claimsCount ?? 0;
    const active = !!this.state.insurance?.active;

    let y = 0;
    const sx = -PANEL_W / 2 + 40;

    this.bodyContainer.add(this.add.text(sx, y,
      `Credits: ${this.state.credits.toLocaleString()} cr`,
      { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#ffe28a' }));
    y += 22;
    this.bodyContainer.add(this.add.text(sx, y,
      `Claims to date: ${claims}    Current rate: ${(rate * 100).toFixed(1)}%`,
      { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#88aacc' }));
    y += 28;

    this.bodyContainer.add(this.add.rectangle(0, y, PANEL_W - 40, 1, 0x66ddff, 0.4));
    y += 14;

    this.bodyContainer.add(this.add.text(sx, y, 'REPLACEMENT VALUE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#a0c0ff'
    }));
    y += 22;

    this.bodyContainer.add(this.add.text(sx, y, `Ship — ${ship.name}`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cfe6ff'
    }));
    this.bodyContainer.add(this.add.text(PANEL_W / 2 - 40, y, `${ship.cost.toLocaleString()} cr`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cfe6ff'
    }).setOrigin(1, 0));
    y += 20;

    for (const wid of weapons) {
      const w = WEAPONS[wid];
      this.bodyContainer.add(this.add.text(sx, y, `Weapon — ${w.name}`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cfe6ff'
      }));
      this.bodyContainer.add(this.add.text(PANEL_W / 2 - 40, y, `${(w.cost ?? 0).toLocaleString()} cr`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cfe6ff'
      }).setOrigin(1, 0));
      y += 18;
    }
    y += 10;

    this.bodyContainer.add(this.add.rectangle(0, y, PANEL_W - 40, 1, 0xffe28a, 0.5));
    y += 14;

    this.bodyContainer.add(this.add.text(sx, y, 'TOTAL', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffe28a'
    }));
    this.bodyContainer.add(this.add.text(PANEL_W / 2 - 40, y, `${totalValue.toLocaleString()} cr`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffe28a'
    }).setOrigin(1, 0));
    y += 26;

    this.bodyContainer.add(this.add.text(sx, y, `PREMIUM (${(rate * 100).toFixed(1)}%)`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#88ffaa'
    }));
    this.bodyContainer.add(this.add.text(PANEL_W / 2 - 40, y, `${premium.toLocaleString()} cr`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#88ffaa'
    }).setOrigin(1, 0));
    y += 32;

    const statusText = active ? 'STATUS: ACTIVE — pays full replacement value on next death' : 'STATUS: NOT INSURED';
    this.bodyContainer.add(this.add.text(0, y, statusText, {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: active ? '#88ffaa' : '#ffaa50'
    }).setOrigin(0.5, 0));
    y += 28;

    let buttonLabel, buttonColor, fn;
    if (active) {
      buttonLabel = 'ALREADY COVERED';
      buttonColor = 0x335544;
      fn = null;
    } else if (totalValue === 0) {
      buttonLabel = 'NOTHING TO INSURE';
      buttonColor = 0x334455;
      fn = null;
    } else if (this.state.credits < premium) {
      buttonLabel = `Need ${premium.toLocaleString()} cr to insure`;
      buttonColor = 0x553333;
      fn = null;
    } else {
      buttonLabel = `PURCHASE INSURANCE — ${premium.toLocaleString()} cr`;
      buttonColor = 0x224458;
      fn = () => {
        this.state.credits -= premium;
        this.state.insurance = this.state.insurance || { active: false, claimsCount: 0 };
        this.state.insurance.active = true;
        this.refresh();
      };
    }

    const btn = this.add.rectangle(0, y, PANEL_W - 80, 36, buttonColor, 0.95)
      .setStrokeStyle(1, 0x66ddff, fn ? 0.9 : 0.3);
    const btnText = this.add.text(0, y, buttonLabel, {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: fn ? '#cfe6ff' : '#88aacc'
    }).setOrigin(0.5);
    if (fn) {
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', (p) => { if (p.button === 0) fn(); });
      btn.on('pointerover', () => btn.setFillStyle(0x335577, 0.95));
      btn.on('pointerout', () => btn.setFillStyle(buttonColor, 0.95));
    }
    this.bodyContainer.add([btn, btnText]);

    if (claims > 0) {
      y += 36;
      this.bodyContainer.add(this.add.text(0, y, `Each claim raises premium by ${(INSURANCE.claimIncrement * 100).toFixed(0)} percentage points.`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#5a7090'
      }).setOrigin(0.5, 0));
    }
  }
}
