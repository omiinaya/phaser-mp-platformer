import { Scene } from 'phaser';
import { InputManager, InputConfig } from '../core/InputManager';
import { SceneService } from '../core/SceneManager';
import { LEVEL_CONFIGS } from '../core/LevelManager';

export interface LevelSelectSceneData {
  unlockedLevels?: number[];
}

export class LevelSelectScene extends Scene {
  private inputManager?: InputManager;
  private sceneService?: SceneService;
  private selectedLevel: number = 1;
  private levelButtons: Map<number, Phaser.GameObjects.Container> = new Map();
  private unlockedLevels: number[] = [1];
  private levelCards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  init(data: LevelSelectSceneData) {
    this.unlockedLevels = data.unlockedLevels || [1];
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Title
    this.add
      .text(width / 2, 60, 'SELECT LEVEL', {
        fontSize: '48px',
        color: '#fff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Create level cards
    this.createLevelCards(width, height);

    // Back button
    const backButton = this.add
      .text(width / 2, height - 60, 'Back to Menu', {
        fontSize: '24px',
        color: '#fff',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setInteractive();

    backButton.on('pointerdown', () => {
      this.goBack();
    });

    backButton.on('pointerover', () => {
      backButton.setColor('#ff0');
    });

    backButton.on('pointerout', () => {
      backButton.setColor('#fff');
    });

    // Initialize InputManager
    const inputConfig: InputConfig = {
      actions: [
        {
          id: 'select',
          keys: ['Enter', 'Space'],
        },
        {
          id: 'back',
          keys: ['Escape'],
        },
        {
          id: 'left',
          keys: ['Left', 'A'],
        },
        {
          id: 'right',
          keys: ['Right', 'D'],
        },
        {
          id: 'up',
          keys: ['Up', 'W'],
        },
        {
          id: 'down',
          keys: ['Down', 'S'],
        },
      ],
    };
    this.inputManager = new InputManager(this, inputConfig);
    this.inputManager.onInputEvent((event) => {
      if (event.action === 'select' && event.active) {
        this.startLevel(this.selectedLevel);
      }
      if (event.action === 'back' && event.active) {
        this.goBack();
      }
      if (event.action === 'left' && event.active) {
        this.navigateLevel(-1);
      }
      if (event.action === 'right' && event.active) {
        this.navigateLevel(1);
      }
    });

    this.updateSelection();
  }

  private createLevelCards(width: number, _height: number): void {
    const totalLevels = Object.keys(LEVEL_CONFIGS).length;
    const levelsPerRow = 3;
    const cardWidth = 120;
    const cardHeight = 160;
    const gap = 30;
    const startY = 140;
    const startX =
      (width -
        (Math.min(totalLevels, levelsPerRow) * (cardWidth + gap) - gap)) /
      2;

    Object.entries(LEVEL_CONFIGS).forEach(([levelNum, config], index) => {
      const level = parseInt(levelNum);
      const isUnlocked = this.unlockedLevels.includes(level);

      // Calculate position
      const row = Math.floor(index / levelsPerRow);
      const col = index % levelsPerRow;
      const x = startX + col * (cardWidth + gap);
      const y = startY + row * (cardHeight + gap);

      // Create container for the card
      const card = this.add.container(x, y);

      // Card background
      const bgColor = isUnlocked ? 0x2ecc71 : 0x7f8c8d;
      const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, bgColor, 0.8);
      card.add(bg);

      // Level number
      const levelText = this.add
        .text(-50, -70, `Level ${level}`, {
          fontSize: '20px',
          color: '#fff',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      card.add(levelText);

      // Level theme name
      const themeText = this.add
        .text(0, 0, config.theme?.toUpperCase() || '', {
          fontSize: '14px',
          color: '#fff',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5);
      card.add(themeText);

      // Status indicator
      const statusText = this.add
        .text(0, 70, isUnlocked ? 'UNLOCKED' : 'LOCKED', {
          fontSize: '12px',
          color: isUnlocked ? '#fff' : '#95a5a6',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      card.add(statusText);

      // Lock icon for locked levels
      if (!isUnlocked) {
        const lock = this.add
          .text(0, 30, '🔒', {
            fontSize: '30px',
          })
          .setOrigin(0.5);
        card.add(lock);
      }

      // Make card interactive
      if (isUnlocked) {
        card.setSize(cardWidth, cardHeight);
        card.setInteractive({ useHandCursor: true });

        card.on('pointerdown', () => {
          this.selectLevel(level);
        });

        card.on('pointerover', () => {
          if (this.unlockedLevels.includes(level)) {
            bg.setFillStyle(0xf1c40f);
            levelText.setColor('#000');
          }
        });

        card.on('pointerout', () => {
          bg.setFillStyle(isUnlocked ? 0x2ecc71 : 0x7f8c8d);
          levelText.setColor('#fff');
        });
      }

      this.levelButtons.set(level, card);
      this.levelCards.push(card);
    });
  }

  private selectLevel(level: number): void {
    if (!this.unlockedLevels.includes(level)) return;

    this.selectedLevel = level;
    this.updateSelection();

    // Add selection feedback
    this.playSelectSound();
  }

  private updateSelection(): void {
    this.levelButtons.forEach((card, level) => {
      const isUnlocked = this.unlockedLevels.includes(level);
      const bg = card.first as Phaser.GameObjects.Rectangle;

      if (level === this.selectedLevel && isUnlocked) {
        bg.setStrokeStyle(4, 0xf1c40f);
        bg.setScale(1.1);
      } else {
        bg.setStrokeStyle(0, 0x000000);
        bg.setScale(1);
      }
    });
  }

  private navigateLevel(direction: number): void {
    const totalLevels = Object.keys(LEVEL_CONFIGS).length;
    let newLevel = this.selectedLevel + direction;

    // Find the next unlocked level
    while (newLevel > 0 && newLevel <= totalLevels) {
      if (this.unlockedLevels.includes(newLevel)) {
        this.selectLevel(newLevel);
        break;
      }
      newLevel += direction;
    }
  }

  private startLevel(level: number): void {
    if (!this.unlockedLevels.includes(level)) {
      this.playLockedSound();
      return;
    }

    this.sceneService = new SceneService(this.game);
    this.sceneService?.startScene({
      target: 'GameScene',
      stopCurrent: true,
      data: { level },
    });
  }

  private goBack(): void {
    this.scene.start('MainMenuScene');
  }

  private playSelectSound(): void {
    if (this.cache.audio.exists('ui_select')) {
      this.sound.play('ui_select');
    }
  }

  private playLockedSound(): void {
    if (this.cache.audio.exists('ui_locked')) {
      this.sound.play('ui_locked');
    }
  }

  update() {
    if (this.inputManager) {
      this.inputManager.update();
    }
  }
}
