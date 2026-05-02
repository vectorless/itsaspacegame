import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalOre = data?.ore ?? 0;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(0, 0, w, h, 0x000000, 0.65).setOrigin(0, 0);

    this.add.text(w / 2, h / 2 - 60, 'HULL BREACH', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '48px',
      color: '#ff6060'
    }).setOrigin(0.5);

    this.add.text(w / 2, h / 2 - 10, `Ore mined: ${this.finalOre}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffe28a'
    }).setOrigin(0.5);

    this.add.text(w / 2, h / 2 + 40, 'Press R to respawn', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#cfe6ff'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-R', () => this.restart());
  }

  restart() {
    this.registry.remove('gameState');
    this.scene.stop('HUDScene');
    this.scene.stop('SpaceScene');
    this.scene.stop('GameOverScene');
    this.scene.start('SpaceScene');
    this.scene.launch('HUDScene');
  }
}
