import Phaser from 'phaser';
import { loadLevel } from './levels.js';
import CrewController, { CREW } from './CrewController.js';
import { ensureGameState } from './state.js';

const PROP_SPRITES = {
  engineering: 'prop_engineering',
  airlock: 'prop_airlock',
  repair: 'prop_repair',
  checkpoint: 'prop_checkpoint'
};

export default class StarbaseScene extends Phaser.Scene {
  constructor() { super('StarbaseScene'); }

  init(data = {}) {
    this.levelId = data.levelId ?? 'starbase_bay_1';
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0e18');
    this.input.setDefaultCursor('default');

    ensureGameState(this.registry);

    this.level = loadLevel(this.levelId);
    this.tile = this.level.tileSize;

    this.drawTilesAndProps();
    this.spawnCrew();
    this.bindKeys();
    this.makePromptText();

    this.lastCheckpoint = {
      x: this.level.spawn.x * this.tile + this.tile / 2,
      y: this.level.spawn.y * this.tile + this.tile / 2,
      gravity: this.level.spawn.gravity === 'up' ? -1 : 1
    };

    this.events.on('shutdown', () => this.input.setDefaultCursor('none'));
  }

  drawTilesAndProps() {
    this.tilesArr = this.level.tilesArr;
    for (let r = 0; r < this.level.height; r++) {
      const row = this.tilesArr[r];
      for (let c = 0; c < this.level.width; c++) {
        const ch = row[c];
        const x = c * this.tile;
        const y = r * this.tile;
        if (ch === '#') {
          this.add.image(x, y, 'tile_wall').setOrigin(0, 0);
        } else if (ch === '^') {
          this.add.image(x, y, 'tile_spike_up').setOrigin(0, 0);
        } else if (ch === 'v') {
          this.add.image(x, y, 'tile_spike_down').setOrigin(0, 0);
        }
      }
    }

    this.props = [];
    for (const p of this.level.props) {
      const sprite = PROP_SPRITES[p.type];
      if (!sprite) continue;
      const px = p.x * this.tile + this.tile / 2;
      const py = p.y * this.tile + this.tile / 2;
      const img = this.add.image(px, py, sprite).setDepth(2);
      const label = this.add.text(px, py - this.tile, p.type.toUpperCase(), {
        fontFamily: 'system-ui, sans-serif', fontSize: '9px', color: '#88aacc'
      }).setOrigin(0.5).setDepth(2);
      this.props.push({ ...p, img, label, px, py });
    }
  }

  spawnCrew() {
    const sx = this.level.spawn.x * this.tile + this.tile / 2;
    const sy = this.level.spawn.y * this.tile + this.tile / 2;
    const grav = this.level.spawn.gravity === 'up' ? -1 : 1;
    this.controller = new CrewController(sx, sy, grav);
    this.crew = this.add.image(sx, sy, 'crew').setDepth(10);
    this.crew.setOrigin(0.5, 0.5);
  }

  bindKeys() {
    this.keys = this.input.keyboard.addKeys('A,D,LEFT,RIGHT,SPACE,UP,W,E,F');
  }

  makePromptText() {
    this.promptText = this.add.text(this.scale.width / 2, this.scale.height - 24, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#88aacc'
    }).setOrigin(0.5).setDepth(40);
    this.helpText = this.add.text(12, 8, 'A/D move • SPACE flip gravity • E interact', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#5a7090'
    }).setDepth(40);
  }

  isSolid(col, row) {
    if (row < 0 || row >= this.level.height || col < 0 || col >= this.level.width) return true;
    return this.tilesArr[row][col] === '#';
  }

  isSpike(col, row) {
    if (row < 0 || row >= this.level.height || col < 0 || col >= this.level.width) return false;
    const ch = this.tilesArr[row][col];
    return ch === '^' || ch === 'v';
  }

  resolveX(c) {
    const halfW = CREW.width / 2;
    const halfH = CREW.height / 2;
    const left = c.x - halfW;
    const right = c.x + halfW;
    const top = c.y - halfH + 1;
    const bottom = c.y + halfH - 1;
    const topRow = Math.floor(top / this.tile);
    const bottomRow = Math.floor(bottom / this.tile);

    if (c.vx > 0) {
      const col = Math.floor(right / this.tile);
      for (let r = topRow; r <= bottomRow; r++) {
        if (this.isSolid(col, r)) {
          c.x = col * this.tile - halfW - 0.01;
          c.vx = 0;
          break;
        }
      }
    } else if (c.vx < 0) {
      const col = Math.floor(left / this.tile);
      for (let r = topRow; r <= bottomRow; r++) {
        if (this.isSolid(col, r)) {
          c.x = (col + 1) * this.tile + halfW + 0.01;
          c.vx = 0;
          break;
        }
      }
    }
  }

  resolveY(c) {
    const halfW = CREW.width / 2;
    const halfH = CREW.height / 2;
    const left = c.x - halfW + 1;
    const right = c.x + halfW - 1;
    const top = c.y - halfH;
    const bottom = c.y + halfH;
    const leftCol = Math.floor(left / this.tile);
    const rightCol = Math.floor(right / this.tile);

    c.onSurface = false;
    if (c.vy > 0) {
      const row = Math.floor(bottom / this.tile);
      for (let col = leftCol; col <= rightCol; col++) {
        if (this.isSolid(col, row)) {
          c.y = row * this.tile - halfH - 0.01;
          c.vy = 0;
          if (c.gravitySign > 0) c.onSurface = true;
          break;
        }
      }
    } else if (c.vy < 0) {
      const row = Math.floor(top / this.tile);
      for (let col = leftCol; col <= rightCol; col++) {
        if (this.isSolid(col, row)) {
          c.y = (row + 1) * this.tile + halfH + 0.01;
          c.vy = 0;
          if (c.gravitySign < 0) c.onSurface = true;
          break;
        }
      }
    }
  }

  spikeOverlap(c) {
    const halfW = CREW.width / 2;
    const halfH = CREW.height / 2;
    const cols = [Math.floor((c.x - halfW + 1) / this.tile), Math.floor((c.x + halfW - 1) / this.tile)];
    const rows = [Math.floor((c.y - halfH + 1) / this.tile), Math.floor((c.y + halfH - 1) / this.tile)];
    for (let r = rows[0]; r <= rows[1]; r++) {
      for (let col = cols[0]; col <= cols[1]; col++) {
        if (this.isSpike(col, r)) return true;
      }
    }
    return false;
  }

  respawn() {
    this.cameras.main.flash(180, 255, 80, 80);
    this.controller.x = this.lastCheckpoint.x;
    this.controller.y = this.lastCheckpoint.y;
    this.controller.vx = 0;
    this.controller.vy = 0;
    this.controller.gravitySign = this.lastCheckpoint.gravity;
    this.controller.onSurface = false;
  }

  nearestProp() {
    const c = this.controller;
    for (const p of this.props) {
      const dx = p.px - c.x;
      const dy = p.py - c.y;
      if (Math.abs(dx) < this.tile * 0.7 && Math.abs(dy) < this.tile) return p;
    }
    return null;
  }

  interact(prop) {
    try {
      this.doInteract(prop);
    } catch (err) {
      console.error('[StarbaseScene.interact]', prop?.type, err);
    }
  }

  doInteract(prop) {
    if (prop.type === 'engineering') {
      this.scene.pause();
      this.scene.launch('ShopScene', { from: 'StarbaseScene' });
    } else if (prop.type === 'airlock') {
      this.scene.stop();
      this.scene.launch('LandingScene', { mode: 'takeoff' });
    } else if (prop.type === 'repair') {
      const state = this.registry.get('gameState');
      if (state && state.hull < state.maxHull) {
        state.hull = state.maxHull;
        this.cameras.main.flash(200, 80, 255, 120);
      }
    } else if (prop.type === 'checkpoint') {
      this.lastCheckpoint = {
        x: prop.px,
        y: prop.py,
        gravity: this.controller.gravitySign
      };
      this.cameras.main.flash(160, 200, 200, 80);
    }
  }

  update(time, deltaMs) {
    try {
      this._update(time, deltaMs);
    } catch (err) {
      console.error('[StarbaseScene.update]', err);
    }
  }

  _update(_time, deltaMs) {
    const dt = Math.min(deltaMs, 33) / 1000;
    const k = this.keys;
    const c = this.controller;

    const left = k.A.isDown || k.LEFT.isDown;
    const right = k.D.isDown || k.RIGHT.isDown;
    c.setInput(left, right);

    if (Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.UP) || Phaser.Input.Keyboard.JustDown(k.W)) {
      c.flip();
    }

    c.x += c.vx * dt;
    this.resolveX(c);

    c.applyGravity(dt);
    c.y += c.vy * dt;
    this.resolveY(c);

    if (this.spikeOverlap(c)) {
      this.respawn();
    }

    this.crew.setPosition(c.x, c.y);
    this.crew.setFlipX(c.facing < 0);
    this.crew.setFlipY(c.gravitySign < 0);

    const prop = this.nearestProp();
    if (prop) {
      this.promptText.setText(`E to ${prop.type === 'engineering' ? 'open engineering' : prop.type === 'airlock' ? 'leave starbase' : prop.type === 'repair' ? 'repair hull' : 'set checkpoint'}`);
      if (Phaser.Input.Keyboard.JustDown(k.E)) {
        this.interact(prop);
      }
    } else {
      this.promptText.setText('');
    }
  }
}
