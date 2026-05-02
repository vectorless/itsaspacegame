import Phaser from 'phaser';
import { MISSIONS, MISSION_ORDER } from './missions.js';

const PANEL_W = 720;
const PANEL_H = 460;

export default class MissionScene extends Phaser.Scene {
  constructor() {
    super('MissionScene');
  }

  init(data = {}) {
    this.fromScene = data.from ?? 'StarbaseScene';
  }

  create() {
    this.scene.bringToTop();
    this.state = this.registry.get('gameState');

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(0, 0, w, h, 0x000814, 0.85).setOrigin(0, 0);
    this.add.rectangle(w / 2, h / 2, PANEL_W, PANEL_H, 0x101a14, 0.97)
      .setStrokeStyle(2, 0xffaa50);

    this.add.text(w / 2, h / 2 - PANEL_H / 2 + 22, 'MISSION BOARD', {
      fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#ffe28a'
    }).setOrigin(0.5);

    this.headerText = this.add.text(w / 2, h / 2 - PANEL_H / 2 + 50, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#ffaa50'
    }).setOrigin(0.5);

    this.bodyContainer = this.add.container(w / 2, h / 2 - PANEL_H / 2 + 90);

    this.add.text(w / 2, h / 2 + PANEL_H / 2 - 18, 'ESC or right-click to close', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#5a7090'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-ESC', () => this.close());
    this.input.on('pointerdown', (p) => { if (p.button === 2) this.close(); });
    this.input.setDefaultCursor('default');

    this.refresh();
  }

  close() {
    this.input.setDefaultCursor('none');
    this.scene.stop('MissionScene');
    this.scene.run(this.fromScene);
  }

  refresh() {
    const accepted = MISSION_ORDER.filter((id) => this.state.missions[id] === 'accepted').length;
    const completed = MISSION_ORDER.filter((id) => this.state.missions[id] === 'completed').length;
    this.headerText.setText(`Available: ${MISSION_ORDER.length - accepted - completed}    Active: ${accepted}    Completed: ${completed}`);

    this.bodyContainer.removeAll(true);

    let i = 0;
    for (const id of MISSION_ORDER) {
      const m = MISSIONS[id];
      const status = this.state.missions[id] ?? 'available';
      const cy = 16 + i * 84;

      const rect = this.add.rectangle(0, cy, PANEL_W - 60, 76, 0x18202a, 0.95)
        .setStrokeStyle(1, 0xffaa50, 0.5);
      const name = this.add.text(-(PANEL_W / 2 - 50), cy - 22, m.name, {
        fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#fff0a0'
      }).setOrigin(0, 0.5);
      const desc = this.add.text(-(PANEL_W / 2 - 50), cy - 2, m.desc, {
        fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#cfe6ff', wordWrap: { width: PANEL_W - 220 }
      }).setOrigin(0, 0.5);
      const reward = this.add.text(-(PANEL_W / 2 - 50), cy + 22, `Reward: ${m.reward} credits`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#ffe28a'
      }).setOrigin(0, 0.5);

      let actionLabel, actionColor, fn;
      if (status === 'completed') {
        actionLabel = 'COMPLETED ✓';
        actionColor = '#5a7090';
        fn = null;
      } else if (status === 'accepted') {
        if (m.type === 'progress') {
          const cur = this.state.missionProgress?.[id] ?? 0;
          actionLabel = `ACTIVE\n${cur} / ${m.target} ${m.unit ?? ''}`.trim();
        } else {
          actionLabel = 'ACTIVE\nfind the gold marker';
        }
        actionColor = '#ffaa50';
        fn = null;
      } else {
        actionLabel = 'ACCEPT';
        actionColor = '#88ffaa';
        fn = () => {
          this.state.missions[id] = 'accepted';
          this.refresh();
        };
      }

      const action = this.add.text(PANEL_W / 2 - 50, cy, actionLabel, {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: actionColor, align: 'center'
      }).setOrigin(1, 0.5);

      if (fn) {
        rect.setInteractive({ useHandCursor: true });
        rect.on('pointerdown', (p) => { if (p.button === 0) fn(); });
        rect.on('pointerover', () => rect.setFillStyle(0x223a52, 0.95));
        rect.on('pointerout', () => rect.setFillStyle(0x18202a, 0.95));
      }

      this.bodyContainer.add([rect, name, desc, reward, action]);
      i++;
    }
  }
}
