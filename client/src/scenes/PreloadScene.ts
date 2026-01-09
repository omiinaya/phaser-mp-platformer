import { Scene } from 'phaser';

export class PreloadScene extends Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Load assets
    this.load.image('logo', 'assets/sprites/logo.png');
    this.load.audio('bgm', 'assets/audio/background.mp3');
  }

  create() {
    this.scene.start('MainMenuScene');
  }
}