import { SHIP } from './constants.js';

export default class ShipController {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.aimAngle = this.angle;
    this.vx = 0;
    this.vy = 0;
  }

  rotate(dtSec, leftHeld, rightHeld) {
    const dir = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
    this.angle += SHIP.rotSpeed * dir * dtSec;
  }

  thrust(dtSec, forwardHeld) {
    if (!forwardHeld) return;
    this.vx += Math.cos(this.angle) * SHIP.accel * dtSec;
    this.vy += Math.sin(this.angle) * SHIP.accel * dtSec;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > SHIP.maxSpeed) {
      const k = SHIP.maxSpeed / speed;
      this.vx *= k;
      this.vy *= k;
    }
  }

  reverseThrust(dtSec, held) {
    if (!held) return;
    this.vx -= Math.cos(this.angle) * SHIP.reverseAccel * dtSec;
    this.vy -= Math.sin(this.angle) * SHIP.reverseAccel * dtSec;
  }

  integrate(dtSec) {
    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;
  }

  speed() {
    return Math.hypot(this.vx, this.vy);
  }
}
