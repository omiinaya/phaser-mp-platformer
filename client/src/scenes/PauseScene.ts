import { Scene } from 'phaser';
import { InputManager, InputConfig } from '../core/InputManager';
import { SceneService } from '../core/SceneManager';
import { eventBus } from '../core/EventBus';

export interface PauseSceneData {
  score?: number;
  level?: number;
  fromScene?: string;
}

export class PauseScene extends Scene {
  private inputManager?: InputManager;
  private sceneService?: SceneService;
  private menuItems: Array<{
    text: Phaser.GameObjects.Text;
    action: () => void;
  }> = [];
  private selectedIndex = 0;
  private overlay?: Phaser.GameObjects.Rectangle;
  private title?: Phaser.GameObjects.Text;
  private pauseData?: PauseSceneData;

  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data: PauseSceneData) {
    this.pauseData = data;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Create semi-transparent overlay
    this.overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0)
      .setScrollFactor(0);

    // Title
    this.title = this.add
      .text(width / 2, height / 2 - 150, 'PAUSED', {
        fontSize: '64px',
        color: '#fff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Score display if available
    if (this.pauseData?.score !== undefined) {
      this.add
        .text(width / 2, height / 2 - 80, `Score: ${this.pauseData.score}`, {
          fontSize: '24px',
          color: '#f1c40f',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
    }

    // Initialize SceneService
    this.sceneService = new SceneService(this.game);

    // Create menu items
    this.createMenu();

    // Initialize InputManager
    const inputConfig: InputConfig = {
      actions: [
        { id: 'up', keys: ['Up', 'W'], description: 'Navigate up' },
        { id: 'down', keys: ['Down', 'S'], description: 'Navigate down' },
        {
          id: 'select',
          keys: ['Enter', 'Space'],
          description: 'Select option',
        },
        { id: 'back', keys: ['Escape', 'P'], description: 'Resume game' },
      ],
    };
    this.inputManager = new InputManager(this, inputConfig);
    this.inputManager.onInputEvent((event) => {
      if (event.action === 'up' && event.active) {
        this.navigateMenu(-1);
      } else if (event.action === 'down' && event.active) {
        this.navigateMenu(1);
      } else if (event.action === 'select' && event.active) {
        this.selectMenuItem();
      } else if (event.action === 'back' && event.active) {
        this.resumeGame();
      }
    });

    // Update initial selection
    this.updateMenuSelection();

    // Subscribe to pause event
    eventBus.on('game:pause', this.resumeGame.bind(this));
  }

  update() {
    if (this.inputManager) {
      this.inputManager.update();
    }
  }

  private createMenu(): void {
    const { width, height } = this.cameras.main;
    const startY = height / 2 - 20;
    const spacing = 60;

    const menuOptions = [
      { label: 'Resume', action: () => this.resumeGame() },
      { label: 'Restart Level', action: () => this.restartLevel() },
      { label: 'Main Menu', action: () => this.returnToMainMenu() },
    ];

    menuOptions.forEach((option, index) => {
      const y = startY + index * spacing;
      const text = this.add
        .text(width / 2, y, option.label, {
          fontSize: '32px',
          color: '#fff',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setInteractive();

      text.on('pointerover', () => {
        this.selectedIndex = index;
        this.updateMenuSelection();
      });

      text.on('pointerdown', () => {
        option.action();
      });

      this.menuItems.push({ text, action: option.action });
    });
  }

  private navigateMenu(direction: number): void {
    this.selectedIndex += direction;
    if (this.selectedIndex < 0) {
      this.selectedIndex = this.menuItems.length - 1;
    } else if (this.selectedIndex >= this.menuItems.length) {
      this.selectedIndex = 0;
    }
    this.updateMenuSelection();
  }

  private updateMenuSelection(): void {
    this.menuItems.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.text.setColor('#f1c40f');
        item.text.setScale(1.1);
      } else {
        item.text.setColor('#fff');
        item.text.setScale(1);
      }
    });
  }

  private selectMenuItem(): void {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.menuItems.length) {
      this.menuItems[this.selectedIndex].action();
    }
  }

  private resumeGame(): void {
    eventBus.emit('game:resume');
    if (this.pauseData?.fromScene) {
      this.sceneService?.resumeScene(this.pauseData.fromScene);
    }
    this.scene.stop();
  }

  private restartLevel(): void {
    eventBus.emit('game:restart');
    if (this.sceneService) {
      this.sceneService.startScene({
        target: 'GameScene',
        stopCurrent: true,
        data: { restart: true },
      });
    } else {
      this.scene.start('GameScene', { restart: true });
    }
  }

  private returnToMainMenu(): void {
    eventBus.emit('game:quit');
    if (this.sceneService) {
      this.sceneService.startScene({
        target: 'MainMenuScene',
        stopCurrent: true,
      });
    } else {
      this.scene.start('MainMenuScene');
    }
  }

  destroy() {
    eventBus.off('game:pause', this.resumeGame.bind(this));
    this.menuItems = [];
  }
}
