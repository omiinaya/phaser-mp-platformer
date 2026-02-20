import { Scene } from 'phaser';

export class BootScene extends Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load any initial assets (e.g., loading bar)
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
