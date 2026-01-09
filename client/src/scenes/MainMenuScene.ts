import { Scene } from 'phaser';

export class MainMenuScene extends Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, height / 2 - 100, 'Phaser Platformer', {
      fontSize: '48px',
      color: '#fff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    const startButton = this.add.text(width / 2, height / 2, 'Start Game', {
      fontSize: '32px',
      color: '#0f0',
      fontFamily: 'Arial',
    }).setOrigin(0.5).setInteractive();

    startButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    startButton.on('pointerover', () => {
      startButton.setColor('#ff0');
    });

    startButton.on('pointerout', () => {
      startButton.setColor('#0f0');
    });
  }
}