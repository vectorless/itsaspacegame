import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from './constants.js';
import BootScene from './BootScene.js';
import SpaceScene from './SpaceScene.js';
import HUDScene from './HUDScene.js';
import GameOverScene from './GameOverScene.js';
import ShopScene from './ShopScene.js';
import LandingScene from './LandingScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#05060a',
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [BootScene, SpaceScene, HUDScene, GameOverScene, ShopScene, LandingScene]
};

new Phaser.Game(config);
