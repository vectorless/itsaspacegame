import Phaser from 'phaser';
import { MISSIONS } from './missions.js';
import { ensureGameState, resetAfterDeath } from './state.js';
import { addItem } from './cargo.js';

const VIEW_W = 960;
const VIEW_H = 600;

// Placeholder dialogue — silly + sinister.
const DIALOGUE = {
  intro: '"Hello, small bipedal life-shape. We bring tidings of ancient cosmic indifference."',
  positive: {
    button: 'POSITIVE\n"Greetings, friend!"',
    response: '"Glorious! A reciprocator! Take this small data shard. We have many. Do not open it indoors."',
    flavor: '+5000 credits • Encrypted Data Core deposited in cargo'
  },
  neutral: {
    button: 'NEUTRAL\n"Acknowledged."',
    response: '"Acknowledged in return. Your blandness has been logged for eternity. We are pleased."',
    flavor: '+2000 credits'
  },
  aggressive: {
    button: 'AGGRESSIVE\n"Eat lasers, slime!"',
    response: '"Cute. Your shouting frequency tastes of lemon. We will eat now."',
    flavor: 'Hull damage taken'
  }
};

const REWARD = {
  positive: { credits: 5000, exotic: 'datacore' },
  neutral:  { credits: 2000 },
  aggressive: { hullDamage: 50 }
};

export default class AlienEncounterScene extends Phaser.Scene {
  constructor() { super('AlienEncounterScene'); }

  init(data = {}) {
    this.missionId = data.missionId ?? 'unknown_signal';
    this.choiceMade = false;
  }

  create() {
    this.scene.bringToTop();
    this.input.setDefaultCursor('default');
    this.gameState = ensureGameState(this.registry);

    this.cameras.main.setBackgroundColor('#0a0820');
    this.cameras.main.flash(800, 80, 40, 120);

    this.drawStars();
    this.drawAlien();

    this.add.text(VIEW_W / 2, 40, 'FIRST CONTACT', {
      fontFamily: 'system-ui, sans-serif', fontSize: '32px', color: '#a080ff'
    }).setOrigin(0.5).setAlpha(0).setScale(0.4);
    this.tweens.add({ targets: this.children.list[this.children.list.length - 1], alpha: 1, scale: 1, duration: 700, ease: 'Back.easeOut' });

    this.add.text(VIEW_W / 2, 80, 'A pulsating green form drifts into view, tentacles undulating in the void.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cfe6ff', align: 'center', wordWrap: { width: 700 }
    }).setOrigin(0.5);

    this.dialogueText = this.add.text(VIEW_W / 2, 360, DIALOGUE.intro, {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#80ff80',
      align: 'center', wordWrap: { width: 760 }, fontStyle: 'italic'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.dialogueText, alpha: 1, duration: 1200, delay: 600 });

    this.flavorText = this.add.text(VIEW_W / 2, 420, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#ffe28a', align: 'center'
    }).setOrigin(0.5);

    this.choiceButtons = [];
    const choices = ['positive', 'neutral', 'aggressive'];
    const colors  = [{ base: 0x447755, hover: 0x66aa77 }, { base: 0x556666, hover: 0x778888 }, { base: 0x884444, hover: 0xaa5555 }];
    let bx = VIEW_W / 2 - 280;
    choices.forEach((c, i) => {
      const cfg = colors[i];
      const rect = this.add.rectangle(bx, 510, 240, 76, cfg.base, 0.95)
        .setStrokeStyle(2, 0xa080ff, 0.6).setAlpha(0);
      const txt = this.add.text(bx, 510, DIALOGUE[c].button, {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#ffffff', align: 'center'
      }).setOrigin(0.5).setAlpha(0);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', (p) => { if (p.button === 0) this.makeChoice(c); });
      rect.on('pointerover', () => rect.setFillStyle(cfg.hover, 0.95));
      rect.on('pointerout', () => rect.setFillStyle(cfg.base, 0.95));
      this.tweens.add({ targets: [rect, txt], alpha: 1, duration: 600, delay: 1800 + i * 200 });
      this.choiceButtons.push(rect);
      bx += 280;
    });

    this.add.text(VIEW_W / 2, VIEW_H - 14, 'How do you respond?', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#5a7090'
    }).setOrigin(0.5);
  }

  drawStars() {
    const g = this.add.graphics().setDepth(-10);
    for (let i = 0; i < 100; i++) {
      g.fillStyle(0xffffff, 0.2 + Math.random() * 0.5);
      g.fillRect(Math.random() * VIEW_W, Math.random() * VIEW_H, 1, 1);
    }
  }

  drawAlien() {
    const cx = VIEW_W / 2;
    const cy = 220;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x66cc66, 0.4);
    g.fillCircle(cx, cy, 90);
    g.fillStyle(0x88ee88, 0.85);
    g.fillCircle(cx, cy, 60);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(cx - 18, cy - 8, 12);
    g.fillCircle(cx + 18, cy - 8, 12);
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx - 16, cy - 6, 5);
    g.fillCircle(cx + 20, cy - 6, 5);
    g.fillStyle(0x224422, 0.9);
    g.fillRect(cx - 14, cy + 18, 28, 4);
    g.fillStyle(0x66cc66, 0.7);
    for (let i = 0; i < 8; i++) {
      const a = Math.PI + (i / 7) * Math.PI;
      const tx = cx + Math.cos(a) * 65;
      const ty = cy + Math.sin(a) * 65 + 30;
      g.fillCircle(tx, ty, 9);
    }
    this.tweens.add({ targets: g, alpha: { from: 1, to: 0.85 }, duration: 1200, yoyo: true, repeat: -1 });
  }

  makeChoice(choice) {
    if (this.choiceMade) return;
    this.choiceMade = true;
    for (const b of this.choiceButtons) b.disableInteractive();

    const reward = REWARD[choice];
    const state = this.gameState;
    const lines = [DIALOGUE[choice].response];
    let outcomeColor = '#cfe6ff';

    if (reward.credits) state.credits += reward.credits;
    let exoticAdded = false;
    if (reward.exotic) {
      exoticAdded = !!addItem(state, 'exotic', reward.exotic);
    }

    let fatal = false;
    if (reward.hullDamage) {
      state.hull = Math.max(0, state.hull - reward.hullDamage);
      fatal = state.hull <= 0;
      outcomeColor = '#ff8888';
    } else {
      outcomeColor = '#88ffaa';
    }

    if (state.missions[this.missionId] === 'accepted') {
      const m = MISSIONS[this.missionId];
      state.missions[this.missionId] = 'completed';
      if (typeof m.onComplete === 'function') m.onComplete(state);
    }

    this.dialogueText.setText(lines.join('\n'));
    this.dialogueText.setColor(outcomeColor);

    let flavor = DIALOGUE[choice].flavor;
    if (reward.exotic && !exoticAdded) flavor += ' (no cargo space — lost)';
    this.flavorText.setText(flavor);
    this.flavorText.setAlpha(0);
    this.tweens.add({ targets: this.flavorText, alpha: 1, duration: 600, delay: 200 });

    this.time.delayedCall(4500, () => {
      if (fatal) {
        resetAfterDeath(state);
        if (this.scene.isPaused('SpaceScene') || this.scene.isActive('SpaceScene')) {
          this.scene.stop('SpaceScene');
        }
        this.scene.stop();
        this.scene.start('StarbaseScene');
      } else {
        this.scene.stop();
        this.scene.run('SpaceScene');
      }
    });
  }
}
