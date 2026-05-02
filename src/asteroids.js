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
        { angle: perp,           scale: parent.scaleValue * 0.62, speed: 80 },
        { angle: perp + Math.PI, scale: parent.scaleValue * 0.62, speed: 80 }
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
          scale: parent.scaleValue * Phaser.Math.FloatBetween(0.4, 0.6),
          speed: Phaser.Math.Between(90, 150)
        });
      }
      return out;
    }
  },
  burst: {
    hpMul: 2.5,
    children(parent, impactAngle) {
      const n = Phaser.Math.Between(4, 6);
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push({
          angle: (i / n) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2),
          scale: parent.scaleValue * Phaser.Math.FloatBetween(0.3, 0.5),
          speed: Phaser.Math.Between(60, 130)
        });
      }
      return out;
    }
  },
  lopsided: {
    hpMul: 2.0,
    children(parent, impactAngle) {
      return [
        { angle: impactAngle + Math.PI / 3, scale: parent.scaleValue * 0.78, speed: 50 },
        { angle: impactAngle - Math.PI / 3, scale: parent.scaleValue * 0.34, speed: 140 }
      ];
    }
  },
  tough: {
    hpMul: 5.0,
    children(parent, impactAngle) {
      const n = 6;
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push({
          angle: (i / n) * Math.PI * 2,
          scale: parent.scaleValue * 0.3,
          speed: Phaser.Math.Between(100, 180)
        });
      }
      return out;
    }
  }
};

const PROFILE_IDS = Object.keys(PROFILES);
const MIN_SCALE = 0.22;

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

export function damageAsteroid(scene, asteroid, dmg, proj) {
  asteroid.hp -= dmg;
  scene.tweens.add({
    targets: asteroid,
    alpha: 0.35,
    duration: 50,
    yoyo: true,
    onComplete: () => asteroid.setAlpha(1)
  });

  if (Math.random() < ORE.dropChancePerHit) {
    spawnOre(scene, asteroid.x, asteroid.y);
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
    spawnOre(scene, px, py);
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
