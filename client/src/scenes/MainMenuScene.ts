import { Scene } from 'phaser';
import { InputManager, InputConfig } from '../core/InputManager';
import { SceneService } from '../core/SceneManager';

export class MainMenuScene extends Scene {
  private inputManager?: InputManager;
  private sceneService?: SceneService;
  private startButton?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Title
    this.add.text(width / 2, height / 2 - 100, 'Phaser Platformer', {
      fontSize: '48px',
      color: '#fff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Start button
    this.startButton = this.add.text(width / 2, height / 2, 'Start Game', {
      fontSize: '32px',
      color: '#0f0',
      fontFamily: 'Arial',
    }).setOrigin(0.5).setInteractive();

    this.startButton.on('pointerdown', () => {
      this.startGame();
    });

    this.startButton.on('pointerover', () => {
      this.startButton!.setColor('#ff0');
    });

    this.startButton.on('pointerout', () => {
      this.startButton!.setColor('#0f0');
    });

    // Initialize SceneService
    this.sceneService = new SceneService(this.game);

    // Initialize InputManager
    const inputConfig: InputConfig = {
      actions: [
        {
          id: 'start',
          keys: ['Enter', 'Space'],
          description: 'Start the game',
        },
        {
          id: 'quit',
          keys: ['Escape'],
          description: 'Quit to menu',
        },
      ],
    };
    this.inputManager = new InputManager(this, inputConfig);
    this.inputManager.onInputEvent(event => {
      if (event.action === 'start' && event.active) {
        this.startGame();
      }
      if (event.action === 'quit' && event.active) {
        // Could return to boot scene or exit
        console.log('Quit pressed');
      }
    });
  }

  update() {
    if (this.inputManager) {
      this.inputManager.update();
    }
  }

  private startGame(): void {
    if (this.sceneService) {
      this.sceneService.startScene({
        target: 'GameScene',
        stopCurrent: true,
      });
    } else {
      this.scene.start('GameScene');
    }
  }
}