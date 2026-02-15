import { Scene } from 'phaser';
import { InputManager, InputConfig } from '../core/InputManager';
import { SceneService } from '../core/SceneManager';
import { eventBus } from '../core/EventBus';

export interface GameOverSceneData {
  score: number;
  level: number;
  won: boolean;
  coins?: number;
  enemiesDefeated?: number;
  timeElapsed?: number;
}

export class GameOverScene extends Scene {
  private inputManager?: InputManager;
  private sceneService?: SceneService;
  private menuItems: Array<{
    text: Phaser.GameObjects.Text;
    action: () => void;
  }> = [];
  private selectedIndex = 0;
  private gameOverData?: GameOverSceneData;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameOverSceneData) {
    this.gameOverData = data;
  }

  create() {
    const { width, height } = this.cameras.main;
    const won = this.gameOverData?.won ?? false;

    // Background color based on win/loss
    const bgColor = won ? 0x27ae60 : 0xc0392b;
    this.add.rectangle(0, 0, width, height, bgColor).setOrigin(0);

    // Title
    const titleText = won ? 'VICTORY!' : 'GAME OVER';
    const titleColor = won ? '#f1c40f' : '#e74c3c';
    this.add
      .text(width / 2, height / 2 - 180, titleText, {
        fontSize: '72px',
        color: titleColor,
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Subtitle
    const subtitleText = won ? 'Level Complete!' : 'Try Again!';
    this.add
      .text(width / 2, height / 2 - 100, subtitleText, {
        fontSize: '32px',
        color: '#fff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Stats display
    this.displayStats();

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
      }
    });

    // Update initial selection
    this.updateMenuSelection();

    // Emit game over event
    eventBus.emit(won ? 'game:victory' : 'game:defeat', this.gameOverData);
  }

  update() {
    if (this.inputManager) {
      this.inputManager.update();
    }
  }

  private displayStats(): void {
    const { width, height } = this.cameras.main;
    const data = this.gameOverData;
    if (!data) return;

    const stats: Array<{ label: string; value: string | number }> = [
      { label: 'Final Score', value: data.score },
      { label: 'Level', value: data.level },
    ];

    if (data.coins !== undefined) {
      stats.push({ label: 'Coins Collected', value: data.coins });
    }

    if (data.enemiesDefeated !== undefined) {
      stats.push({ label: 'Enemies Defeated', value: data.enemiesDefeated });
    }

    if (data.timeElapsed !== undefined) {
      const minutes = Math.floor(data.timeElapsed / 60);
      const seconds = Math.floor(data.timeElapsed % 60);
      stats.push({
        label: 'Time',
        value: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      });
    }

    const startY = height / 2 - 40;
    const spacing = 30;

    stats.forEach((stat, index) => {
      const y = startY + index * spacing;
      this.add
        .text(width / 2 - 100, y, `${stat.label}:`, {
          fontSize: '20px',
          color: '#bdc3c7',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0.5);

      this.add
        .text(width / 2 + 100, y, String(stat.value), {
          fontSize: '20px',
          color: '#f1c40f',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(1, 0.5);
    });
  }

  private createMenu(): void {
    const { width, height } = this.cameras.main;
    const won = this.gameOverData?.won ?? false;
    const startY = height / 2 + 100;
    const spacing = 60;

    const menuOptions = [];

    if (won) {
      menuOptions.push({ label: 'Next Level', action: () => this.nextLevel() });
    }

    menuOptions.push(
      { label: 'Try Again', action: () => this.restartLevel() },
      { label: 'Main Menu', action: () => this.returnToMainMenu() },
    );

    menuOptions.forEach((option, index) => {
      const y = startY + index * spacing;
      const text = this.add
        .text(width / 2, y, option.label, {
          fontSize: '28px',
          color: '#fff',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
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

  private nextLevel(): void {
    eventBus.emit('game:next-level');
    const nextLevel = (this.gameOverData?.level ?? 1) + 1;
    if (this.sceneService) {
      this.sceneService.startScene({
        target: 'GameScene',
        stopCurrent: true,
        data: { level: nextLevel, restart: true },
      });
    } else {
      this.scene.start('GameScene', { level: nextLevel, restart: true });
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
    this.menuItems = [];
  }
}
