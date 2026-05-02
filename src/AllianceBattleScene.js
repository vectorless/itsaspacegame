import Phaser from 'phaser';
import { SHIPS, MISSILE, BLASTER, RAILGUN, HOMING } from './constants.js';
import { MISSIONS } from './missions.js';
import { ensureGameState, resetAfterDeath, completeMission } from './state.js';
import { WEAPONS, nextWeaponId } from './weapons.js';
import { getEquippedWeapons } from './cargo.js';

const SCROLL_SPEED = 80;
const WORLD_WIDTH = 4800;
const VIEW_W = 960;
const VIEW_H = 600;
const GROUND_Y = VIEW_H - 60;

const PLAYER = {
  speedX: 280,
  speedY: 240,
  drag: 0.92,
  bombCooldownMs: 350,
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
  { count: 3, pattern: 'straight' },
  { count: 4, pattern: 'sine' },
  { count: 5, pattern: 'mixed' },
  { count: 6, pattern: 'sine' },
  { count: 7, pattern: 'mixed' },
  { count: 8, pattern: 'mixed' }
];

const WAVE_SPAWN_INTERVAL_MS = 1100;
const WAVE_LEAD_DELAY_MS = 700;

function nearestActive(group, x, y) {
  let best = null, bestD2 = Infinity;
  group.children.iterate((e) => {
    if (!e || !e.active) return;
    const dx = e.x - x, dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = e; }
  });
  return best;
}

class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);
    this.expireAt = 0;
    this.damage = 1;
    this.homing = false;
    this.piercesLeft = 1;
    this.hitTargets = null;
  }
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (this.expireAt > 0 && time >= this.expireAt) {
      this.disableBody(true, true);
      return;
    }
    if (this.homing) {
      const target = nearestActive(this.scene.enemies, this.x, this.y);
      if (!target) return;
      const dt = delta / 1000;
      const ta = Math.atan2(target.y - this.y, target.x - this.x);
      const cur = Math.atan2(this.body.velocity.y, this.body.velocity.x);
      const diff = Phaser.Math.Angle.Wrap(ta - cur);
      const turn = Phaser.Math.Clamp(diff, -HOMING.turnRate * dt, HOMING.turnRate * dt);
      const nu = cur + turn;
      const speed = Math.hypot(this.body.velocity.x, this.body.velocity.y);
      this.body.velocity.x = Math.cos(nu) * speed;
      this.body.velocity.y = Math.sin(nu) * speed;
      this.setRotation(nu);
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
      classType: Projectile, defaultKey: 'bullet',
      maxSize: BLASTER.poolMax, runChildUpdate: true
    });
    this.missiles = this.physics.add.group({
      classType: Projectile, defaultKey: 'missile',
      maxSize: MISSILE.poolMax, runChildUpdate: true
    });
    this.railShots = this.physics.add.group({
      classType: Projectile, defaultKey: 'railshot',
      maxSize: RAILGUN.poolMax, runChildUpdate: true
    });
    this.bombs = this.physics.add.group({
      classType: Projectile, defaultKey: 'bomb',
      maxSize: 30, runChildUpdate: true
    });
    this.enemies = this.physics.add.group();
    this.enemyBullets = this.physics.add.group({
      classType: Projectile, defaultKey: 'enemy_bullet',
      maxSize: 40, runChildUpdate: true
    });
    this.turrets = this.physics.add.staticGroup();
    this.spawnTurrets();

    this.physics.add.overlap(this.bullets, this.enemies, this.onProjHitEnemy, null, this);
    this.physics.add.overlap(this.missiles, this.enemies, this.onProjHitEnemy, null, this);
    this.physics.add.overlap(this.railShots, this.enemies, this.onProjHitEnemy, null, this);
    this.physics.add.overlap(this.bullets, this.turrets, this.onProjHitTurret, null, this);
    this.physics.add.overlap(this.missiles, this.turrets, this.onProjHitTurret, null, this);
    this.physics.add.overlap(this.railShots, this.turrets, this.onProjHitTurret, null, this);
    this.physics.add.overlap(this.bombs, this.turrets, this.onBombHitTurret, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.onPlayerHitEnemyBullet, null, this);

    this.keys = this.input.keyboard.addKeys('A,D,W,S,E,F,LEFT,RIGHT,UP,DOWN,SPACE,SHIFT');

    const equipped = getEquippedWeapons(this.gameState);
    if (equipped.length > 0 && !equipped.includes(this.gameState.currentWeapon)) {
      this.gameState.currentWeapon = equipped[0];
    }

    this.lastFire = 0;
    this.lastBomb = 0;

    this.makeHud();
    this.outcomeShown = false;

    this.waveIdx = -1;
    this.waveActive = false;
    this.startNextWave();

    this.events.on('resume', () => {
      this.input.setDefaultCursor('crosshair');
    });
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
      this.time.delayedCall(i * WAVE_SPAWN_INTERVAL_MS + WAVE_LEAD_DELAY_MS, () => this.spawnEnemy(w.pattern));
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
    this.hudWeapon = this.add.text(12, 28, '', { ...style, color: '#cfe6ff' }).setScrollFactor(0).setDepth(100);
    this.hudWave = this.add.text(12, 48, '', { ...style, color: '#ffe28a' }).setScrollFactor(0).setDepth(100);
    this.hudTargets = this.add.text(12, 68, '', { ...style, color: '#88ffaa' }).setScrollFactor(0).setDepth(100);
    this.hudHelp = this.add.text(VIEW_W / 2, VIEW_H - 14,
      'WASD/arrows move • Click/Space fire • Shift / Right-click bomb • E weapon • F loadout',
      { ...style, color: '#5a7090', fontSize: '11px' }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.titleText = this.add.text(VIEW_W / 2, 70, '', {
      ...style, color: '#ffe28a', fontSize: '22px'
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

    if (Phaser.Input.Keyboard.JustDown(k.F)) {
      this.scene.pause();
      this.scene.launch('SchematicScene', { from: 'AllianceBattleScene' });
      return;
    }

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

    const equipped = getEquippedWeapons(this.gameState);
    if (equipped.length > 0 && !equipped.includes(this.gameState.currentWeapon)) {
      this.gameState.currentWeapon = equipped[0];
    }

    if (Phaser.Input.Keyboard.JustDown(k.E)) {
      this.gameState.currentWeapon = nextWeaponId(this.gameState.currentWeapon, equipped);
    }

    const pointer = this.input.activePointer;
    const fireHeld = k.SPACE.isDown || pointer.leftButtonDown();
    if (fireHeld) this.tryFireWeapon(time);

    const bombHeld = k.SHIFT.isDown || pointer.rightButtonDown();
    if (bombHeld && time - this.lastBomb >= PLAYER.bombCooldownMs) {
      this.firePlayerBomb();
      this.lastBomb = time;
    }

    this.updateEnemies(time, dt);
    this.updateTurrets(time);

    this.hudHull.setText(`HULL  ${Math.round(this.gameState.hull)} / ${this.gameState.maxHull}`);
    const w = WEAPONS[this.gameState.currentWeapon];
    const ammo = this.gameState.ammo[this.gameState.currentWeapon];
    const ammoTxt = w ? (Number.isFinite(ammo) ? `${ammo}` : '∞') : '—';
    this.hudWeapon.setText(`WEAPON  ${w ? w.name : '—'}  (${ammoTxt})`);
    const remaining = this.enemies.countActive(true);
    this.hudWave.setText(`WAVE  ${this.waveIdx + 1} / ${WAVES.length}    Enemies: ${remaining}`);
    const aliveTurrets = this.turretObjs.filter((t) => t.active).length;
    this.hudTargets.setText(`Ground targets: ${aliveTurrets} / ${TURRET.count}`);

    if (this.waveActive && remaining === 0) {
      this.waveActive = false;
      this.time.delayedCall(900, () => this.startNextWave());
    }
  }

  tryFireWeapon(time) {
    const id = this.gameState.currentWeapon;
    if (!id || id === 'mining_laser') return;
    const w = WEAPONS[id];
    if (!w || !w.fire || time - this.lastFire < w.cooldownMs) return;
    const ammo = this.gameState.ammo[id];
    if (Number.isFinite(ammo) && ammo <= 0) return;

    const shipObj = {
      x: this.player.x,
      y: this.player.y,
      vx: this.player.body.velocity.x,
      vy: this.player.body.velocity.y,
      angle: 0,
      aimAngle: 0
    };
    w.fire(this, shipObj);
    if (Number.isFinite(ammo)) this.gameState.ammo[id] = ammo - 1;
    this.lastFire = time;
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
    b.damage = 2;
    b.piercesLeft = 1;
    b.hitTargets = new Set();
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

  onProjHitEnemy(proj, enemy) {
    if (!proj.active || !enemy.active) return;
    if (proj.hitTargets && proj.hitTargets.has(enemy)) return;
    proj.hitTargets?.add(enemy);
    enemy.hp -= proj.damage ?? 1;
    this.tweens.add({ targets: enemy, alpha: 0.4, duration: 50, yoyo: true });
    if (enemy.hp <= 0) enemy.disableBody(true, true);
    proj.piercesLeft = (proj.piercesLeft ?? 1) - 1;
    if (proj.piercesLeft <= 0) proj.disableBody(true, true);
  }

  onProjHitTurret(proj, turret) {
    if (!proj.active || !turret.active) return;
    if (proj.hitTargets && proj.hitTargets.has(turret)) return;
    proj.hitTargets?.add(turret);
    turret.hp -= proj.damage ?? 1;
    this.tweens.add({ targets: turret, alpha: 0.5, duration: 50, yoyo: true });
    if (turret.hp <= 0) {
      turret.setActive(false).setVisible(false);
      this.cameras.main.shake(80, 0.003);
      this.checkWin();
    }
    proj.piercesLeft = (proj.piercesLeft ?? 1) - 1;
    if (proj.piercesLeft <= 0) proj.disableBody(true, true);
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
    const wavesDone = this.waveIdx >= WAVES.length - 1 && !this.waveActive && this.enemies.countActive(true) === 0;
    if (wavesDone) this.win();
  }

  win() {
    if (this.outcomeShown) return;
    this.outcomeShown = true;
    const m = MISSIONS[this.missionId];
    if (m && this.gameState.missions[this.missionId] === 'accepted') {
      completeMission(this.gameState, this.missionId);
    }
    this.showVictoryScreen(m);
  }

  showVictoryScreen(m) {
    const w = VIEW_W, h = VIEW_H;
    const cx = w / 2, cy = h / 2;

    const overlay = this.add.rectangle(0, 0, w, h, 0x000814, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(120);
    this.tweens.add({ targets: overlay, alpha: 0.78, duration: 600 });

    const panel = this.add.rectangle(cx, cy, 540, 380, 0x101a14, 0).setStrokeStyle(2, 0xffaa50, 0.9).setScrollFactor(0).setDepth(121);
    this.tweens.add({ targets: panel, alpha: 0.96, duration: 700, delay: 300 });

    const title = this.add.text(cx, cy - 130, 'MISSION COMPLETE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '32px', color: '#88ffaa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(122).setAlpha(0).setScale(0.3);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 600, ease: 'Back.easeOut', delay: 600 });

    const subtitle = this.add.text(cx, cy - 92, m?.name ?? '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#cfe6ff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(122).setAlpha(0);
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 400, delay: 1100 });

    const divider = this.add.rectangle(cx, cy - 60, 0, 1, 0xffaa50, 0.6).setScrollFactor(0).setDepth(122);
    this.tweens.add({ targets: divider, width: 400, duration: 500, delay: 1300, ease: 'Cubic.easeOut' });

    const creditsLabel = this.add.text(cx, cy - 24, 'Credits wired to your account', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#88aacc'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(122).setAlpha(0);
    this.tweens.add({ targets: creditsLabel, alpha: 1, duration: 400, delay: 1700 });

    const creditsAmount = this.add.text(cx, cy + 8, `+${(m?.reward ?? 0).toLocaleString()} cr`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '30px', color: '#ffe28a'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(122).setAlpha(0).setScale(0.4);
    this.tweens.add({ targets: creditsAmount, alpha: 1, scale: 1, duration: 500, delay: 2000, ease: 'Back.easeOut' });

    const hasRewards = Array.isArray(m?.physicalRewards) && m.physicalRewards.length > 0;
    const rewardsText = hasRewards
      ? `Physical rewards waiting at the star base:\n• ${m.physicalRewards.map((r) => r.name || r.id).join('\n• ')}`
      : 'No physical rewards this mission.';
    const rewardsLine = this.add.text(cx, cy + 70, rewardsText, {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px',
      color: hasRewards ? '#88ffaa' : '#5a7090', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(122).setAlpha(0);
    this.tweens.add({ targets: rewardsLine, alpha: 1, duration: 500, delay: 2500 });

    const prompt = this.add.text(cx, cy + 140, 'Press SPACE or click to return', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#5a7090'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(122).setAlpha(0);
    this.tweens.add({ targets: prompt, alpha: 1, duration: 400, delay: 3200 });
    this.tweens.add({ targets: prompt, alpha: 0.4, duration: 800, delay: 3700, yoyo: true, repeat: -1 });

    this.time.delayedCall(3000, () => {
      this.input.keyboard.once('keydown-SPACE', () => this.exitToSpace());
      this.input.once('pointerdown', () => this.exitToSpace());
    });
    this.time.delayedCall(10000, () => this.exitToSpace());
  }

  exitToSpace() {
    if (this.exiting) return;
    this.exiting = true;
    this.input.setDefaultCursor('none');
    this.scene.stop();
    this.scene.run('SpaceScene');
  }

  fail() {
    if (this.outcomeShown) return;
    this.outcomeShown = true;
    this.showFailScreen();
  }

  showFailScreen() {
    const w = VIEW_W, h = VIEW_H;
    const cx = w / 2, cy = h / 2;

    const overlay = this.add.rectangle(0, 0, w, h, 0x140404, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(120);
    this.tweens.add({ targets: overlay, alpha: 0.78, duration: 600 });

    const panel = this.add.rectangle(cx, cy, 480, 240, 0x1a1010, 0).setStrokeStyle(2, 0xff6060, 0.9).setScrollFactor(0).setDepth(121);
    this.tweens.add({ targets: panel, alpha: 0.96, duration: 700, delay: 300 });

    const title = this.add.text(cx, cy - 60, 'MISSION FAILED', {
      fontFamily: 'system-ui, sans-serif', fontSize: '32px', color: '#ff6060'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(122).setAlpha(0).setScale(0.3);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 600, ease: 'Back.easeOut', delay: 600 });

    const reason = this.add.text(cx, cy - 18, 'Hull breached', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffb8b8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(122).setAlpha(0);
    this.tweens.add({ targets: reason, alpha: 1, duration: 400, delay: 1200 });

    const next = this.add.text(cx, cy + 18, 'Recovery shuttle inbound. Returning to the starbase.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#cfe6ff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(122).setAlpha(0);
    this.tweens.add({ targets: next, alpha: 1, duration: 400, delay: 1700 });

    const note = this.add.text(cx, cy + 50, '(mission stays accepted — return to the gold marker to retry)', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#88aacc'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(122).setAlpha(0);
    this.tweens.add({ targets: note, alpha: 1, duration: 400, delay: 2200 });

    this.time.delayedCall(3000, () => this.exitToStarbase());
  }

  exitToStarbase() {
    if (this.exiting) return;
    this.exiting = true;
    resetAfterDeath(this.gameState);
    this.input.setDefaultCursor('default');
    if (this.scene.isPaused('SpaceScene') || this.scene.isActive('SpaceScene')) {
      this.scene.stop('SpaceScene');
    }
    this.scene.start('StarbaseScene');
  }
}
