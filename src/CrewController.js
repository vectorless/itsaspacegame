export const CREW = {
  walkSpeed: 560,
  gravity: 6000,
  maxFall: 2400,
  width: 48,
  height: 56
};

export default class CrewController {
  constructor(x, y, gravitySign = 1) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.gravitySign = gravitySign;
    this.onSurface = false;
    this.facing = 1;
  }

  setInput(leftHeld, rightHeld) {
    if (leftHeld && !rightHeld) { this.vx = -CREW.walkSpeed; this.facing = -1; }
    else if (rightHeld && !leftHeld) { this.vx = CREW.walkSpeed; this.facing = 1; }
    else { this.vx = 0; }
  }

  flip() {
    if (!this.onSurface) return false;
    this.gravitySign = -this.gravitySign;
    this.vy = 0;
    this.onSurface = false;
    return true;
  }

  applyGravity(dtSec) {
    this.vy += CREW.gravity * this.gravitySign * dtSec;
    if (Math.abs(this.vy) > CREW.maxFall) {
      this.vy = Math.sign(this.vy) * CREW.maxFall;
    }
  }
}
