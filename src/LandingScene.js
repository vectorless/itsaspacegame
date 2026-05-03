import Phaser from 'phaser';
import { LANDING, EXOTICS, SHIPS } from './constants.js';
import { resetAfterDeath } from './state.js';

export default class LandingScene extends Phaser.Scene {
  constructor() {
    super('LandingScene');
  }

  init(data = {}) {
    this.mode = data && data.mode === 'takeoff' ? 'takeoff' : 'land';
    this.canEnterStarbase = false;
    this.outcomeShown = false;
    this.takeoffDone = false;
    this.takeoffPhase = null;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor('#020410');

    this.starsGfx = this.add.graphics();
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h * 0.7;
      this.starsGfx.fillStyle(0xffffff, 0.4 + Math.random() * 0.5);
      this.starsGfx.fillRect(x, y, 1, 1);
    }

    this.terrainPoints = [];
    const baseY = h - 70;
    let x = 0;
    this.terrainPoints.push({ x: 0, y: baseY + Phaser.Math.Between(-30, 30) });
    while (x < w) {
      x += Phaser.Math.Between(20, 60);
      this.terrainPoints.push({
        x: Math.min(x, w),
        y: baseY + Phaser.Math.Between(-50, 40)
      });
    }
    this.terrainPoints[this.terrainPoints.length - 1].x = w;

    const padIdx = Math.floor(Math.random() * (this.terrainPoints.length - 5)) + 1;
    const padY = this.terrainPoints[padIdx].y;
    this.terrainPoints[padIdx + 1].y = padY;
    this.terrainPoints[padIdx + 2].y = padY;
    this.padX1 = this.terrainPoints[padIdx].x;
    this.padX2 = this.terrainPoints[padIdx + 2].x;
    this.padY = padY;

    this.terrainGfx = this.add.graphics();
    this.drawTerrain();

    this.lander = this.add.image(w / 2, 70, 'ship').setDepth(10);
    this.landerRestOffset = Math.max(8, Math.floor(this.lander.displayHeight / 2) - 4);
    this.x = this.lander.x;
    this.y = this.lander.y;
    this.angle = -Math.PI / 2;
    this.lander.setRotation(this.angle);
    this.vx = Phaser.Math.FloatBetween(-LANDING.startVxRange, LANDING.startVxRange);
    this.vy = LANDING.startVy;

    this.thrust = this.add.image(0, 0, 'thruster')
      .setOrigin(0, 0.5)
      .setDepth(9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    this.fuel = SHIPS[this.registry.get('gameState').currentShipId]?.fuelCapacity ?? 200;

    this.keys = this.input.keyboard.addKeys('A,D,W,E');
    this.canEnterStarbase = false;

    const style = { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cfe6ff' };
    this.altText = this.add.text(10, 10, '', style);
    this.vText = this.add.text(10, 28, '', style);
    this.fuelText = this.add.text(10, 46, '', style);

    this.outcomeShown = false;

    if (this.mode === 'takeoff') {
      this.setupTakeoff();
    } else {
      this.setupLand(style);
    }
  }

  setupLand(style) {
    const w = this.scale.width;
    this.abortPhase = null;
    this.abortThresholdY = 60;
    this.abortBand = this.add.rectangle(0, 0, w, this.abortThresholdY, 0x3a8aff, 0.08)
      .setOrigin(0, 0).setDepth(1);
    this.add.line(0, 0, 0, this.abortThresholdY, w, this.abortThresholdY, 0x6cd0ff, 0.5)
      .setOrigin(0, 0).setDepth(1);
    this.add.text(w / 2, this.abortThresholdY - 12, '↑ ABORT — RETURN TO SPACE ↑', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#6cd0ff'
    }).setOrigin(0.5).setDepth(1);

    this.add.text(w / 2, this.scale.height - 24, 'LAND ON THE LIT PAD — speed < 30 — keep upright', {
      ...style, color: '#88aacc'
    }).setOrigin(0.5);
    this.add.text(w / 2, this.scale.height - 8, 'A/D rotate  •  W thrust  •  pull up to abort', {
      ...style, color: '#5a7090', fontSize: '12px'
    }).setOrigin(0.5);
  }

  setupTakeoff() {
    this.x = (this.padX1 + this.padX2) / 2;
    this.y = this.padY - (this.landerRestOffset ?? 12);
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.lander.setPosition(this.x, this.y);
    this.lander.setRotation(this.angle);
    this.fuel = SHIPS[this.registry.get('gameState').currentShipId]?.fuelCapacity ?? 200;
    this.takeoffPhase = 'manual';
    this.takeoffDone = false;
    this.exitThresholdY = 130;

    this.exitBand = this.add.rectangle(0, 0, this.scale.width, this.exitThresholdY, 0x3a8aff, 0.08)
      .setOrigin(0, 0).setDepth(1);
    this.add.line(0, 0, 0, this.exitThresholdY, this.scale.width, this.exitThresholdY, 0x6cd0ff, 0.5)
      .setOrigin(0, 0).setDepth(1);
    this.add.text(this.scale.width / 2, this.exitThresholdY - 12, '↑ EXIT ORBIT ↑', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#6cd0ff'
    }).setOrigin(0.5).setDepth(1);

    this.add.text(this.scale.width / 2, this.scale.height - 24, 'TAKEOFF — fly into the EXIT ORBIT band to leave', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#88c0ff'
    }).setOrigin(0.5);
    this.add.text(this.scale.width / 2, this.scale.height - 8, 'A/D rotate  •  W thrust', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#5a7090'
    }).setOrigin(0.5);

    this.reenterPrompt = this.add.text(this.scale.width / 2, this.scale.height - 50, 'Press E to re-enter the starbase', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#ffe28a'
    }).setOrigin(0.5).setDepth(20).setAlpha(0);
  }

  drawTerrain() {
    const g = this.terrainGfx;
    g.clear();
    g.fillStyle(0x102030, 0.6);
    g.beginPath();
    g.moveTo(0, this.scale.height);
    for (const p of this.terrainPoints) g.lineTo(p.x, p.y);
    g.lineTo(this.scale.width, this.scale.height);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x88aacc, 1);
    g.beginPath();
    g.moveTo(this.terrainPoints[0].x, this.terrainPoints[0].y);
    for (let i = 1; i < this.terrainPoints.length; i++) {
      g.lineTo(this.terrainPoints[i].x, this.terrainPoints[i].y);
    }
    g.strokePath();
    g.lineStyle(4, 0x66ddff, 1);
    g.lineBetween(this.padX1, this.padY, this.padX2, this.padY);
    g.fillStyle(0x66ddff, 0.18);
    g.fillRect(this.padX1, this.padY - 1, this.padX2 - this.padX1, 4);
  }

  update(_time, deltaMs) {
    const dt = deltaMs / 1000;

    if (this.mode === 'takeoff') {
      this.updateTakeoff(dt);
      return;
    }

    if (this.canEnterStarbase && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.canEnterStarbase = false;
      this.scene.start('StarbaseScene');
      return;
    }

    if (this.outcomeShown) return;

    if (this.abortPhase === 'leaving') {
      this.vy -= LANDING.thrustAccel * 1.6 * dt;
      this.y += this.vy * dt;
      this.lander.setPosition(this.x, this.y);

      const back = 14;
      this.thrust.setPosition(
        this.x - Math.cos(this.angle) * back,
        this.y - Math.sin(this.angle) * back
      );
      this.thrust.setRotation(this.angle + Math.PI);
      this.thrust.setScale(0.85 + Math.random() * 0.3, 0.9 + Math.random() * 0.2);
      this.thrust.setAlpha(0.75 + Math.random() * 0.25);
      this.thrust.setVisible(true);

      if (this.y < -40) {
        this.outcomeShown = true;
        this.scene.stop();
        if (this.scene.isPaused('SpaceScene')) this.scene.resume('SpaceScene');
        else this.scene.run('SpaceScene');
      }
      return;
    }

    if (this.keys.A.isDown) this.angle -= LANDING.rotSpeed * dt;
    if (this.keys.D.isDown) this.angle += LANDING.rotSpeed * dt;
    this.lander.setRotation(this.angle);

    const thrusting = this.keys.W.isDown && this.fuel > 0;
    if (thrusting) {
      this.vx += Math.cos(this.angle) * LANDING.thrustAccel * dt;
      this.vy += Math.sin(this.angle) * LANDING.thrustAccel * dt;
      this.fuel = Math.max(0, this.fuel - LANDING.fuelBurnPerSec * dt);

      const back = 14;
      this.thrust.setPosition(
        this.x - Math.cos(this.angle) * back,
        this.y - Math.sin(this.angle) * back
      );
      this.thrust.setRotation(this.angle + Math.PI);
      this.thrust.setScale(0.85 + Math.random() * 0.3, 0.9 + Math.random() * 0.2);
      this.thrust.setAlpha(0.75 + Math.random() * 0.25);
      this.thrust.setVisible(true);
    } else {
      this.thrust.setVisible(false);
    }

    this.vy += LANDING.gravity * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < 0) { this.x = 0; this.vx = -this.vx * 0.3; }
    else if (this.x > this.scale.width) { this.x = this.scale.width; this.vx = -this.vx * 0.3; }

    this.lander.setPosition(this.x, this.y);

    if (this.y < this.abortThresholdY && this.vy < 0) {
      this.abortPhase = 'leaving';
      this.add.text(this.scale.width / 2, 90, 'ABORTING — RETURNING TO SPACE', {
        fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#6cd0ff'
      }).setOrigin(0.5).setDepth(20);
      return;
    }

    const terrainY = this.terrainYAt(this.x);
    if (this.y >= terrainY - this.landerRestOffset) {
      this.y = terrainY - this.landerRestOffset;
      this.lander.setPosition(this.x, this.y);
      this.checkLanding();
    }

    const altitude = Math.max(0, terrainY - this.y - this.landerRestOffset);
    this.altText.setText(`Alt:  ${Math.round(altitude)}`);
    this.vText.setText(`vx: ${this.vx.toFixed(1)}   vy: ${this.vy.toFixed(1)}`);
    this.fuelText.setText(`Fuel: ${Math.round(this.fuel)}`);
  }

  updateTakeoff(dt) {
    if (this.takeoffDone) return;

    const padTerrainY = this.terrainYAt(this.x);
    const onGround = this.y >= padTerrainY - 18 && Math.abs(this.vy) < 60;
    const onPad = this.x >= this.padX1 && this.x <= this.padX2;
    const canReenter = this.takeoffPhase === 'manual' && onGround && onPad;
    if (this.reenterPrompt) this.reenterPrompt.setAlpha(canReenter ? 0.95 : 0);
    if (canReenter && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.takeoffDone = true;
      this.scene.start('StarbaseScene');
      return;
    }

    if (this.takeoffPhase === 'leaving') {
      this.vy -= LANDING.thrustAccel * 1.6 * dt;
      this.y += this.vy * dt;
      this.lander.setPosition(this.x, this.y);

      const back = 14;
      this.thrust.setPosition(
        this.x - Math.cos(this.angle) * back,
        this.y - Math.sin(this.angle) * back
      );
      this.thrust.setRotation(this.angle + Math.PI);
      this.thrust.setScale(0.85 + Math.random() * 0.3, 0.9 + Math.random() * 0.2);
      this.thrust.setAlpha(0.75 + Math.random() * 0.25);
      this.thrust.setVisible(true);

      if (this.y < -40) {
        this.takeoffDone = true;
        this.scene.run('SpaceScene');
        this.scene.stop();
      }
      return;
    }

    if (this.keys.A.isDown) this.angle -= LANDING.rotSpeed * dt;
    if (this.keys.D.isDown) this.angle += LANDING.rotSpeed * dt;
    this.lander.setRotation(this.angle);

    const thrusting = this.keys.W.isDown && this.fuel > 0;
    if (thrusting) {
      this.vx += Math.cos(this.angle) * LANDING.thrustAccel * dt;
      this.vy += Math.sin(this.angle) * LANDING.thrustAccel * dt;
      this.fuel = Math.max(0, this.fuel - LANDING.fuelBurnPerSec * dt);

      const back = 14;
      this.thrust.setPosition(
        this.x - Math.cos(this.angle) * back,
        this.y - Math.sin(this.angle) * back
      );
      this.thrust.setRotation(this.angle + Math.PI);
      this.thrust.setScale(0.85 + Math.random() * 0.3, 0.9 + Math.random() * 0.2);
      this.thrust.setAlpha(0.75 + Math.random() * 0.25);
      this.thrust.setVisible(true);
    } else {
      this.thrust.setVisible(false);
    }

    this.vy += LANDING.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < 0) { this.x = 0; this.vx = -this.vx * 0.3; }
    else if (this.x > this.scale.width) { this.x = this.scale.width; this.vx = -this.vx * 0.3; }

    const terrainY = this.terrainYAt(this.x);
    if (this.y >= terrainY - this.landerRestOffset) {
      this.y = terrainY - this.landerRestOffset;
      if (this.vy > 0) this.vy = 0;
      this.vx *= 0.5;
    }

    this.lander.setPosition(this.x, this.y);

    const altitude = Math.max(0, terrainY - this.y - this.landerRestOffset);
    this.altText.setText(`Alt:  ${Math.round(altitude)}`);
    this.vText.setText(`vx: ${this.vx.toFixed(1)}   vy: ${this.vy.toFixed(1)}`);
    this.fuelText.setText(`Fuel: ${Math.round(this.fuel)}`);

    if (this.y < this.exitThresholdY) {
      this.takeoffPhase = 'leaving';
      this.add.text(this.scale.width / 2, 60, 'LEAVING ORBIT', {
        fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#6cd0ff'
      }).setOrigin(0.5).setDepth(20);
    }
  }

  terrainYAt(x) {
    for (let i = 0; i < this.terrainPoints.length - 1; i++) {
      const p1 = this.terrainPoints[i];
      const p2 = this.terrainPoints[i + 1];
      if (x >= p1.x && x <= p2.x) {
        const t = (x - p1.x) / (p2.x - p1.x);
        return p1.y + (p2.y - p1.y) * t;
      }
    }
    return this.scale.height;
  }

  checkLanding() {
    if (this.outcomeShown) return;
    const speed = Math.hypot(this.vx, this.vy);
    const onPad = this.x >= this.padX1 && this.x <= this.padX2;
    const upright = Math.sin(this.angle) < -1 + LANDING.uprightTolerance;

    if (onPad && speed < LANDING.safeLandingSpeed && upright) {
      this.success();
    } else {
      this.crash();
    }
  }

  success() {
    this.outcomeShown = true;
    this.thrust.setVisible(false);
    const w = this.scale.width;
    const h = this.scale.height;

    const state = this.registry.get('gameState');
    const impactSpeed = Math.hypot(this.vx, this.vy);
    const impactDamage = Math.floor(Math.max(0, impactSpeed - 20) / 4);
    state.hull = Math.max(0, state.hull - impactDamage);
    state.shield = state.maxShield;

    let cargoEarnings = 0;
    cargoEarnings += state.cargo.ore || 0;
    cargoEarnings += state.cargo.scrap || 0;
    for (const id of state.cargo.exotics || []) {
      cargoEarnings += EXOTICS[id]?.value ?? 0;
    }
    state.cargo.ore = 0;
    state.cargo.scrap = 0;
    state.cargo.exotics = [];

    state.credits += LANDING.rewardOre + cargoEarnings;

    if (state.hull <= 0) {
      this.add.rectangle(0, 0, w, h, 0x000000, 0.6).setOrigin(0, 0).setDepth(20);
      this.add.text(w / 2, h / 2 - 30, 'HULL DESTROYED', {
        fontFamily: 'system-ui, sans-serif', fontSize: '36px', color: '#ff6060'
      }).setOrigin(0.5).setDepth(21);
      this.add.text(w / 2, h / 2 + 14, `Impact damage: ${impactDamage}\nReturning to starbase…`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#cfe6ff', align: 'center'
      }).setOrigin(0.5).setDepth(21);
      this.time.delayedCall(1800, () => {
        resetAfterDeath(state);
        if (this.scene.isPaused('SpaceScene') || this.scene.isActive('SpaceScene')) {
          this.scene.stop('SpaceScene');
        }
        this.scene.start('StarbaseScene');
      });
      return;
    }

    this.add.rectangle(0, 0, w, h, 0x000000, 0.45).setOrigin(0, 0).setDepth(20);
    this.add.text(w / 2, h / 2 - 50, 'TOUCHDOWN', {
      fontFamily: 'system-ui, sans-serif', fontSize: '40px', color: '#66ffaa'
    }).setOrigin(0.5).setDepth(21);
    const lines = [];
    if (impactDamage > 0) lines.push(`Hull -${impactDamage} from impact  •  Shield refilled  •  +${LANDING.rewardOre} cr fee`);
    else lines.push(`Soft landing  •  Shield refilled  •  +${LANDING.rewardOre} cr fee`);
    if (cargoEarnings > 0) lines.push(`Cargo sold:  +${cargoEarnings} cr`);
    this.add.text(w / 2, h / 2, lines.join('\n'), {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#cfe6ff', align: 'center'
    }).setOrigin(0.5).setDepth(21);

    const prompt = this.add.text(w / 2, h / 2 + 70, 'Press E to enter starbase', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffe28a'
    }).setOrigin(0.5).setDepth(21);
    this.tweens.add({ targets: prompt, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });

    this.canEnterStarbase = true;
  }

  crash() {
    this.outcomeShown = true;
    this.thrust.setVisible(false);
    this.lander.setVisible(false);

    const g = this.add.graphics().setDepth(15);
    g.fillStyle(0xff8030, 0.85);
    g.fillCircle(this.x, this.y, 30);
    g.fillStyle(0xffd060, 0.95);
    g.fillCircle(this.x, this.y, 14);

    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(0, 0, w, h, 0x000000, 0.5).setOrigin(0, 0).setDepth(20);
    this.add.text(w / 2, h / 2 - 30, 'CRASHED', {
      fontFamily: 'system-ui, sans-serif', fontSize: '40px', color: '#ff6060'
    }).setOrigin(0.5).setDepth(21);
    this.add.text(w / 2, h / 2 + 14, `Hull -${LANDING.crashHullDamage}`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#cfe6ff'
    }).setOrigin(0.5).setDepth(21);

    const state = this.registry.get('gameState');
    state.hull = Math.max(0, state.hull - LANDING.crashHullDamage);
    const fatal = state.hull <= 0;

    if (fatal) {
      this.add.text(w / 2, h / 2 + 50, 'Hull destroyed', {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#ff8888'
      }).setOrigin(0.5).setDepth(21);
    }

    this.time.delayedCall(1500, () => {
      if (fatal) {
        resetAfterDeath(state);
        if (this.scene.isPaused('SpaceScene') || this.scene.isActive('SpaceScene')) {
          this.scene.stop('SpaceScene');
        }
        this.scene.start('StarbaseScene');
      } else {
        this.scene.stop();
        this.scene.resume('SpaceScene');
      }
    });
  }
}
