import Phaser from 'phaser';
import { ORE } from './constants.js';
import { spawnOre } from './ore.js';

const TEXTURE_KEYS = ['asteroid_a', 'asteroid_b', 'asteroid_c'];

const PROFILES = {
  even: {
    hpMul: 2.0,
    children(parent, impactAngle) {
      const perp = impactAngle + Math.PI / 2;
      return [
        { angle: perp,           scale: parent.scaleValue * 0.78, speed: 70 },
        { angle: perp + Math.PI, scale: parent.scaleValue * 0.78, speed: 70 }
      ];
    }
  },
  spray: {
    hpMul: 1.5,
    children(parent, impactAngle) {
      const out = [];
      const n = 3;
      for (let i = 0; i < n; i++) {
        out.push({
          angle: impactAngle + Phaser.Math.FloatBetween(-0.6, 0.6),
          scale: parent.scaleValue * Phaser.Math.FloatBetween(0.55, 0.72),
          speed: Phaser.Math.Between(80, 130)
        });
      }
      return out;
    }
  },
  burst: {
    hpMul: 2.5,
    children(parent, impactAngle) {
      const n = Phaser.Math.Between(3, 5);
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push({
          angle: (i / n) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2),
          scale: parent.scaleValue * Phaser.Math.FloatBetween(0.5, 0.66),
          speed: Phaser.Math.Between(55, 110)
        });
      }
      return out;
    }
  },
  lopsided: {
    hpMul: 2.0,
    children(parent, impactAngle) {
      return [
        { angle: impactAngle + Math.PI / 3, scale: parent.scaleValue * 0.88, speed: 45 },
        { angle: impactAngle - Math.PI / 3, scale: parent.scaleValue * 0.55, speed: 120 }
      ];
    }
  },
  tough: {
    hpMul: 5.0,
    children(parent, impactAngle) {
      const n = 5;
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push({
          angle: (i / n) * Math.PI * 2,
          scale: parent.scaleValue * 0.5,
          speed: Phaser.Math.Between(80, 150)
        });
      }
      return out;
    }
  }
};

const PROFILE_IDS = Object.keys(PROFILES);
const MIN_SCALE = 0.32;
const MINED_OUT_TINT = 0x4a4640;
const ORE_PER_SCALE_UNIT = 8;

function pickProfileId() {
  return PROFILE_IDS[Math.floor(Math.random() * PROFILE_IDS.length)];
}

function pickTexture() {
  return TEXTURE_KEYS[Math.floor(Math.random() * TEXTURE_KEYS.length)];
}

export function spawnAsteroid(scene, x, y, scale, profileId = pickProfileId(), drift = true) {
  const tex = pickTexture();
  const a = scene.asteroidGroup.create(x, y, tex);
  a.setScale(scale);
  a.setRotation(Math.random() * Math.PI * 2);

  const profile = PROFILES[profileId];
  a.scaleValue = scale;
  a.profileId = profileId;
  a.hp = Math.max(1, Math.ceil(scale * profile.hpMul));
  a.oreReserve = Math.max(2, Math.floor(scale * ORE_PER_SCALE_UNIT));
  a.minedOut = false;

  const bw = a.width * scale * 0.85;
  a.body.setSize(bw, bw, true);
  a.body.setCollideWorldBounds(true);
  a.body.setBounce(1, 1);
  a.body.setAngularVelocity(Phaser.Math.FloatBetween(-30, 30));

  if (drift) {
    const ang = Math.random() * Math.PI * 2;
    const sp = Phaser.Math.Between(8, 28);
    a.body.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
  }
  return a;
}

export function markAsteroidMinedOut(asteroid) {
  if (!asteroid || asteroid.minedOut) return;
  asteroid.minedOut = true;
  asteroid.oreReserve = 0;
  asteroid.setTint(MINED_OUT_TINT);
}

export function consumeAsteroidOre(asteroid, qty = 1) {
  if (!asteroid || asteroid.oreReserve <= 0) return 0;
  const taken = Math.min(qty, asteroid.oreReserve);
  asteroid.oreReserve -= taken;
  if (asteroid.oreReserve <= 0) markAsteroidMinedOut(asteroid);
  return taken;
}

export function damageAsteroid(scene, asteroid, dmg, proj) {
  asteroid.hp -= dmg;
  scene.tweens.add({
    targets: asteroid,
    alpha: 0.35,
    duration: 50,
    yoyo: true,
    onComplete: () => asteroid.setAlpha(asteroid.minedOut ? 0.85 : 1)
  });

  if (asteroid.oreReserve > 0 && Math.random() < ORE.dropChancePerHit) {
    spawnOre(scene, asteroid.x, asteroid.y);
    consumeAsteroidOre(asteroid, 1);
  }

  if (asteroid.hp <= 0) splitAsteroid(scene, asteroid, proj);
}

function splitAsteroid(scene, asteroid, proj) {
  const profile = PROFILES[asteroid.profileId];
  const impactAngle = proj && proj.body
    ? Math.atan2(proj.body.velocity.y, proj.body.velocity.x)
    : Math.random() * Math.PI * 2;

  const px = asteroid.x;
  const py = asteroid.y;
  const parentScale = asteroid.scaleValue;

  asteroid.disableBody(true, true);
  asteroid.destroy();

  for (let i = 0; i < ORE.bonusOnDestroy; i++) {
    if (asteroid.oreReserve <= 0) break;
    spawnOre(scene, px, py);
    asteroid.oreReserve -= 1;
  }

  const specs = profile.children({ scaleValue: parentScale }, impactAngle);
  for (const spec of specs) {
    if (spec.scale < MIN_SCALE) continue;
    const offset = 6 + parentScale * 8;
    const cx = px + Math.cos(spec.angle) * offset;
    const cy = py + Math.sin(spec.angle) * offset;
    const child = spawnAsteroid(scene, cx, cy, spec.scale, pickProfileId(), false);
    child.body.setVelocity(
      Math.cos(spec.angle) * spec.speed,
      Math.sin(spec.angle) * spec.speed
    );
    child.body.setAngularVelocity(Phaser.Math.FloatBetween(-180, 180));
  }
}
