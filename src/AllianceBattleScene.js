import Phaser from 'phaser';
import { SHIPS } from './constants.js';
import { MISSIONS } from './missions.js';
import { ensureGameState, resetAfterDeath } from './state.js';

const SCROLL_SPEED = 80;
const WORLD_WIDTH = 4800;
const VIEW_W = 960;
const VIEW_H = 600;
const GROUND_Y = VIEW_H - 60;

const PLAYER = {
  speedX: 280,
  speedY: 240,
  drag: 0.92,
  fireCooldownMs: 150,
  bombCooldownMs: 350,
  bulletSpeed: 600,
  bulletTtlMs: 900,
  bombGravity: 600,
  contactDmg: 25
};

const ENEMY = {
  speed: 150,
  hp: 2,
  fireCooldownMs: 1400,
  bulletSpeed: 220,
  bulletDmg: 8
};

const TURRET = {
  hp: 4,
  fireCooldownMs: 2000,
  bulletSpeed: 200,
  bulletDmg: 10,
  count: 6,
  spacing: 600
};

const WAVES = [
  { count: 5, pattern: 'straight' },
  { count: 7, pattern: 'sine' },
  { count: 10, pattern: 'mixed' }
];

class SimpleProjectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);
    this.expireAt = 0;
  }
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (this.expireAt > 0 && time >= this.expireAt) {
      this.disableBody(true, true);
    }
  }
}

export default class AllianceBattleScene extends Phaser.Scene {
  constructor() { super('AllianceBattleScene'); }

  init(data = {}) {
    this.missionId = data.missionId ?? 'support_alliance';
  }

  create() {
    this.scene.bringToTop();
    this.cameras.main.setBackgroundColor('#0a1230');
    this.input.setDefaultCursor('crosshair');
    this.gameState = ensureGameState(this.registry);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, VIEW_H);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, VIEW_H);

    this.drawBackground();
    this.drawGround();

    const shipCfg = SHIPS[this.gameState.currentShipId];
    this.player = this.physics.add.image(120, VIEW_H / 2, shipCfg.sprite).setDepth(10);
    this.player.body.setAllowGravity(false);
    this.player.body.setCollideWorldBounds(true);
    this.player.setRotation(0);

    this.bullets = this.physics.add.group({
      classType: SimpleProjectile, defaultKey: 'bullet',
      maxSize: 80, runChildUpdate: true
    });
    this.bombs = this.physics.add.group({
      classType: SimpleProjectile, defaultKey: 'bomb',
      maxSize: 30, runChildUpdate: true
    });
    this.enemies = this.physics.add.group();
    this.enemyBullets = this.physics.add.group({
      classType: SimpleProjectile, defaultKey: 'enemy_bullet',
      maxSize: 40, runChildUpdate: true
    });
    this.turrets = this.physics.add.staticGroup();
    this.spawnTurrets();

    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.bullets, this.turrets, this.onBulletHitTurret, null, this);
    this.physics.add.overlap(this.bombs, this.turrets, this.onBombHitTurret, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.onPlayerHitEnemyBullet, null, this);

    this.keys = this.input.keyboard.addKeys('A,D,W,S,LEFT,RIGHT,UP,DOWN,SPACE,SHIFT');

    this.lastFire = 0;
    this.lastBomb = 0;

    this.waveIdx = -1;
    this.waveActive = false;
    this.startNextWave();

    this.makeHud();
    this.outcomeShown = false;
  }

  drawBackground() {
    const g = this.add.graphics().setScrollFactor(0).setDepth(-30);
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * VIEW_W;
      const y = Math.random() * (VIEW_H - 100);
      g.fillStyle(0xffffff, 0.4 + Math.random() * 0.4);
      g.fillRect(x, y, 1, 1);
    }
    const horizon = this.add.graphics().setScrollFactor(0).setDepth(-25);
    horizon.fillStyle(0x182238, 0.7);
    horizon.fillRect(0, GROUND_Y - 80, VIEW_W, 80);
  }

  drawGround() {
    for (let x = 0; x < WORLD_WIDTH; x += 64) {
      this.add.image(x, GROUND_Y, 'ground_tile').setOrigin(0, 0).setDepth(-10);
    }
  }

  spawnTurrets() {
    this.turretObjs = [];
    for (let i = 0; i < TURRET.count; i++) {
      const x = 600 + i * TURRET.spacing;
      const t = this.turrets.create(x, GROUND_Y - 9, 'turret').setDepth(2);
      t.hp = TURRET.hp;
      t.fireCooldown = this.time.now + Phaser.Math.Between(500, 2000);
      this.turretObjs.push(t);
    }
  }

  startNextWave() {
    this.waveIdx++;
    if (this.waveIdx >= WAVES.length) {
      this.waveActive = false;
      this.checkWin();
      return;
    }
    this.waveActive = true;
    const w = WAVES[this.waveIdx];
    for (let i = 0; i < w.count; i++) {
      this.time.delayedCall(i * 600 + 500, () => this.spawnEnemy(w.pattern));
    }
    this.flashTitle(`WAVE ${this.waveIdx + 1} of ${WAVES.length}`);
  }

  spawnEnemy(pattern) {
    const cam = this.cameras.main;
    const x = cam.scrollX + VIEW_W + 40;
    const y = Phaser.Math.Between(60, GROUND_Y - 80);
    const e = this.enemies.create(x, y, 'enemy_ship');
    e.setFlipX(true).setDepth(8);
    e.body.setAllowGravity(false);
    e.body.setVelocityX(-ENEMY.speed);
    e.hp = ENEMY.hp;
    e.fireCooldown = this.time.now + Phaser.Math.Between(400, 1400);
    e.pattern = pattern;
    e.baseY = y;
    e.spawnTime = this.time.now;
    if (pattern === 'mixed' && Math.random() < 0.5) e.dive = true;
  }

  makeHud() {
    const style = { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#cfe6ff' };
    this.hudHull = this.add.text(12, 8, '', { ...style, color: '#ffb8b8' }).setScrollFactor(0).setDepth(100);
    this.hudWave = this.add.text(12, 28, '', { ...style, color: '#ffe28a' }).setScrollFactor(0).setDepth(100);
    this.hudTargets = this.add.text(12, 48, '', { ...style, color: '#88ffaa' }).setScrollFactor(0).setDepth(100);
    this.hudHelp = this.add.text(VIEW_W / 2, VIEW_H - 14, 'A/D/W/S move • Click/Space fire • Shift / Right-click bomb', {
      ...style, color: '#5a7090', fontSize: '11px'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.titleText = this.add.text(VIEW_W / 2, 60, '', {
      ...style, color: '#ffe28a', fontSize: '24px'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
  }

  flashTitle(text) {
    this.titleText.setText(text);
    this.titleText.setAlpha(1);
    this.tweens.add({ targets: this.titleText, alpha: 0, duration: 1800 });
  }

  update(time, deltaMs) {
    if (this.outcomeShown) return;
    const dt = Math.min(deltaMs, 33) / 1000;
    const k = this.keys;

    this.cameras.main.scrollX += SCROLL_SPEED * dt;

    const left = k.A.isDown || k.LEFT.isDown;
    const right = k.D.isDown || k.RIGHT.isDown;
    const up = k.W.isDown || k.UP.isDown;
    const down = k.S.isDown || k.DOWN.isDown;
    const v = this.player.body.velocity;
    if (left)  v.x -= PLAYER.speedX * 8 * dt;
    if (right) v.x += PLAYER.speedX * 8 * dt;
    if (up)    v.y -= PLAYER.speedY * 8 * dt;
    if (down)  v.y += PLAYER.speedY * 8 * dt;
    v.x *= PLAYER.drag;
    v.y *= PLAYER.drag;
    if (v.x > PLAYER.speedX) v.x = PLAYER.speedX;
    if (v.x < -PLAYER.speedX) v.x = -PLAYER.speedX;
    if (v.y > PLAYER.speedY) v.y = PLAYER.speedY;
    if (v.y < -PLAYER.speedY) v.y = -PLAYER.speedY;

    const camLeft = this.cameras.main.scrollX + 40;
    const camRight = this.cameras.main.scrollX + VIEW_W - 40;
    if (this.player.x < camLeft) { this.player.x = camLeft; v.x = Math.max(0, v.x); }
    if (this.player.x > camRight) { this.player.x = camRight; v.x = Math.min(0, v.x); }
    if (this.player.y > GROUND_Y - 12) { this.player.y = GROUND_Y - 12; v.y = Math.min(0, v.y); }
    if (this.player.y < 30) { this.player.y = 30; v.y = Math.max(0, v.y); }

    const pointer = this.input.activePointer;
    const fireHeld = k.SPACE.isDown || pointer.leftButtonDown();
    if (fireHeld && time - this.lastFire >= PLAYER.fireCooldownMs) {
      this.firePlayerBullet();
      this.lastFire = time;
    }

    const bombHeld = k.SHIFT.isDown || pointer.rightButtonDown();
    if (bombHeld && time - this.lastBomb >= PLAYER.bombCooldownMs) {
      this.firePlayerBomb();
      this.lastBomb = time;
    }

    this.updateEnemies(time, dt);
    this.updateTurrets(time);

    this.hudHull.setText(`HULL  ${Math.round(this.gameState.hull)} / ${this.gameState.maxHull}`);
    const remaining = this.enemies.countActive(true);
    this.hudWave.setText(`WAVE  ${this.waveIdx + 1} / ${WAVES.length}    Enemies: ${remaining}`);
    const aliveTurrets = this.turretObjs.filter((t) => t.active).length;
    this.hudTargets.setText(`Ground targets: ${aliveTurrets} / ${TURRET.count}`);

    if (this.waveActive && remaining === 0) {
      this.waveActive = false;
      this.time.delayedCall(900, () => this.startNextWave());
    }
  }

  firePlayerBullet() {
    const b = this.bullets.get();
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.body.enable = true;
    b.body.setAllowGravity(false);
    b.setPosition(this.player.x + 18, this.player.y);
    b.setVelocity(PLAYER.bulletSpeed, 0);
    b.expireAt = this.time.now + PLAYER.bulletTtlMs;
  }

  firePlayerBomb() {
    const b = this.bombs.get();
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.body.enable = true;
    b.body.setAllowGravity(false);
    b.setPosition(this.player.x, this.player.y + 8);
    b.setVelocity(this.player.body.velocity.x * 0.5, 60);
    b.body.setAccelerationY(PLAYER.bombGravity);
    b.expireAt = this.time.now + 4000;
  }

  updateEnemies(time, dt) {
    const camLeft = this.cameras.main.scrollX - 100;
    this.enemies.children.iterate((e) => {
      if (!e || !e.active) return;
      if (e.x < camLeft) { e.disableBody(true, true); return; }

      if (e.pattern === 'sine') {
        e.y = e.baseY + Math.sin((time - e.spawnTime) / 300) * 30;
      } else if (e.dive) {
        const dy = this.player.y - e.y;
        e.body.velocity.y = Phaser.Math.Clamp(dy * 1.2, -120, 120);
      }

      if (time > e.fireCooldown && Math.abs(e.x - this.player.x) < 600 && e.x > this.player.x) {
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const eb = this.enemyBullets.get();
        if (eb) {
          eb.setActive(true).setVisible(true);
          eb.body.enable = true;
          eb.body.setAllowGravity(false);
          eb.setPosition(e.x - 8, e.y);
          eb.setVelocity((dx / d) * ENEMY.bulletSpeed, (dy / d) * ENEMY.bulletSpeed);
          eb.expireAt = time + 2400;
          eb.damage = ENEMY.bulletDmg;
        }
        e.fireCooldown = time + ENEMY.fireCooldownMs + Phaser.Math.Between(-300, 600);
      }
    });
  }

  updateTurrets(time) {
    for (const t of this.turretObjs) {
      if (!t.active) continue;
      if (time > t.fireCooldown && Math.abs(t.x - this.player.x) < 350) {
        const dx = this.player.x - t.x;
        const dy = this.player.y - t.y;
        const d = Math.hypot(dx, dy) || 1;
        const eb = this.enemyBullets.get();
        if (eb) {
          eb.setActive(true).setVisible(true);
          eb.body.enable = true;
          eb.body.setAllowGravity(false);
          eb.setPosition(t.x, t.y - 8);
          eb.setVelocity((dx / d) * TURRET.bulletSpeed, (dy / d) * TURRET.bulletSpeed);
          eb.expireAt = time + 3000;
          eb.damage = TURRET.bulletDmg;
        }
        t.fireCooldown = time + TURRET.fireCooldownMs;
      }
    }
  }

  onBulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    bullet.disableBody(true, true);
    enemy.hp -= 1;
    this.tweens.add({ targets: enemy, alpha: 0.4, duration: 50, yoyo: true });
    if (enemy.hp <= 0) enemy.disableBody(true, true);
  }

  onBulletHitTurret(bullet, turret) {
    if (!bullet.active || !turret.active) return;
    bullet.disableBody(true, true);
    turret.hp -= 1;
    this.tweens.add({ targets: turret, alpha: 0.5, duration: 50, yoyo: true });
    if (turret.hp <= 0) {
      turret.setActive(false).setVisible(false);
      this.cameras.main.shake(80, 0.003);
      this.checkWin();
    }
  }

  onBombHitTurret(bomb, turret) {
    if (!bomb.active || !turret.active) return;
    bomb.disableBody(true, true);
    turret.hp -= 2;
    this.cameras.main.shake(120, 0.005);
    this.tweens.add({ targets: turret, alpha: 0.4, duration: 60, yoyo: true });
    if (turret.hp <= 0) {
      turret.setActive(false).setVisible(false);
      this.checkWin();
    }
  }

  onPlayerHitEnemy(_player, enemy) {
    if (!enemy.active || this.outcomeShown) return;
    enemy.disableBody(true, true);
    this.takeDamage(PLAYER.contactDmg);
  }

  onPlayerHitEnemyBullet(_player, bullet) {
    if (!bullet.active || this.outcomeShown) return;
    bullet.disableBody(true, true);
    this.takeDamage(bullet.damage ?? ENEMY.bulletDmg);
  }

  takeDamage(amount) {
    this.gameState.hull = Math.max(0, this.gameState.hull - amount);
    this.cameras.main.shake(120, 0.005);
    this.tweens.add({ targets: this.player, alpha: 0.3, duration: 50, yoyo: true });
    if (this.gameState.hull <= 0) this.fail();
  }

  checkWin() {
    if (this.outcomeShown) return;
    const aliveTurrets = this.turretObjs.filter((t) => t.active).length;
    const wavesDone = this.waveIdx >= WAVES.length - 1 && !this.waveActive && this.enemies.countActive(true) === 0;
    if (wavesDone && aliveTurrets === 0) this.win();
  }

  win() {
    if (this.outcomeShown) return;
    this.outcomeShown = true;
    const m = MISSIONS[this.missionId];
    if (m) {
      this.gameState.credits += m.reward;
      this.gameState.missions[this.missionId] = 'completed';
      if (typeof m.onComplete === 'function') m.onComplete(this.gameState);
    }
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.55).setOrigin(0, 0).setScrollFactor(0).setDepth(120);
    this.add.text(VIEW_W / 2, VIEW_H / 2 - 30, 'MISSION COMPLETE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '36px', color: '#88ffaa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(121);
    this.add.text(VIEW_W / 2, VIEW_H / 2 + 12, m ? `+${m.reward} credits` : '+credits', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffe28a'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(121);
    this.time.delayedCall(2200, () => {
      this.input.setDefaultCursor('none');
      this.scene.stop();
      this.scene.run('SpaceScene');
    });
  }

  fail() {
    if (this.outcomeShown) return;
    this.outcomeShown = true;
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.6).setOrigin(0, 0).setScrollFactor(0).setDepth(120);
    this.add.text(VIEW_W / 2, VIEW_H / 2 - 30, 'MISSION FAILED', {
      fontFamily: 'system-ui, sans-serif', fontSize: '36px', color: '#ff6060'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(121);
    this.add.text(VIEW_W / 2, VIEW_H / 2 + 12, 'Hull breached. Returning to starbase.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#cfe6ff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(121);
    this.time.delayedCall(2000, () => {
      resetAfterDeath(this.gameState);
      this.input.setDefaultCursor('default');
      const space = this.scene.get('SpaceScene');
      if (space && space.scene.isPaused()) space.scene.stop();
      this.scene.stop();
      this.scene.start('StarbaseScene');
    });
  }
}
