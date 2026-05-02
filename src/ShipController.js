export default class ShipController {
  constructor(x, y, shipConfig) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.aimAngle = this.angle;
    this.vx = 0;
    this.vy = 0;
    this.config = shipConfig;
  }

  setShip(shipConfig) {
    this.config = shipConfig;
  }

  rotate(dtSec, leftHeld, rightHeld) {
    const dir = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
    this.angle += this.config.rotSpeed * dir * dtSec;
  }

  thrust(dtSec, forwardHeld) {
    if (!forwardHeld) return;
    this.vx += Math.cos(this.angle) * this.config.accel * dtSec;
    this.vy += Math.sin(this.angle) * this.config.accel * dtSec;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > this.config.maxSpeed) {
      const k = this.config.maxSpeed / speed;
      this.vx *= k;
      this.vy *= k;
    }
  }

  reverseThrust(dtSec, held) {
    if (!held) return;
    this.vx -= Math.cos(this.angle) * this.config.reverseAccel * dtSec;
    this.vy -= Math.sin(this.angle) * this.config.reverseAccel * dtSec;
  }

  integrate(dtSec) {
    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;
  }

  speed() {
    return Math.hypot(this.vx, this.vy);
  }
}
