import { logger } from '../utils/logger';
import { Scene } from 'phaser';

export interface LevelConfig {
  key: string;
  tilemap: string;
  playerStart?: { x: number; y: number };
  targetScore?: number;
  timeLimit?: number;
  requiredItems?: string[];
  requiredEnemies?: number;
  backgroundColor?: number;
  theme?: 'forest' | 'cave' | 'sky';
}

export interface LevelState {
  score: number;
  coins: number;
  enemiesDefeated: number;
  itemsCollected: string[];
  startTime: number;
  isComplete: boolean;
}

// Predefined level configurations
export const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: {
    key: 'level1',
    tilemap: 'assets/tilemaps/level1.json',
    playerStart: { x: 100, y: 300 },
    targetScore: 100,
    backgroundColor: 0x1a1a2e,
    theme: 'forest',
  },
  2: {
    key: 'level2',
    tilemap: 'assets/tilemaps/level2.json',
    playerStart: { x: 400, y: 2050 },
    targetScore: 200,
    timeLimit: 180,
    backgroundColor: 0x0d0d1a,
    theme: 'cave',
  },
  3: {
    key: 'level3',
    tilemap: 'assets/tilemaps/level3.json',
    playerStart: { x: 100, y: 500 },
    targetScore: 300,
    timeLimit: 240,
    backgroundColor: 0x87ceeb,
    theme: 'sky',
  },
};

export class LevelManager {
  private scene: Scene;
  private currentLevel?: LevelConfig;
  private currentLevelNumber: number = 1;
  private levelState: LevelState;
  private onScoreChange?: (score: number) => void;
  private onLevelComplete?: () => void;
  private onGameOver?: () => void;

  constructor(scene: Scene) {
    this.scene = scene;
    this.levelState = this.createInitialState();
  }

  private createInitialState(): LevelState {
    return {
      score: 0,
      coins: 0,
      enemiesDefeated: 0,
      itemsCollected: [],
      startTime: Date.now(),
      isComplete: false,
    };
  }

  public loadLevel(config: LevelConfig): void {
    this.currentLevel = config;
    this.levelState = this.createInitialState();
  }

  public loadLevelByNumber(levelNumber: number): boolean {
    const config = LEVEL_CONFIGS[levelNumber];
    if (!config) {
      logger.warn(`Level ${levelNumber} not found`);
      return false;
    }
    this.currentLevelNumber = levelNumber;
    this.loadLevel(config);
    return true;
  }

  public getCurrentLevelNumber(): number {
    return this.currentLevelNumber;
  }

  public getTotalLevels(): number {
    return Object.keys(LEVEL_CONFIGS).length;
  }

  public canAccessLevel(levelNumber: number): boolean {
    // For now, all levels are accessible
    // In the future, this could check if previous levels are completed
    return levelNumber >= 1 && levelNumber <= this.getTotalLevels();
  }

  public addScore(points: number): void {
    this.levelState.score += points;
    this.onScoreChange?.(this.levelState.score);

    // Check if target score reached
    if (
      this.currentLevel?.targetScore &&
      this.levelState.score >= this.currentLevel.targetScore
    ) {
      this.checkLevelCompletion();
    }
  }

  public collectCoin(): void {
    this.levelState.coins++;
    this.addScore(10);
  }

  public defeatEnemy(points: number = 50): void {
    this.levelState.enemiesDefeated++;
    this.addScore(points);

    // Check if required enemies defeated
    if (
      this.currentLevel?.requiredEnemies &&
      this.levelState.enemiesDefeated >= this.currentLevel.requiredEnemies
    ) {
      this.checkLevelCompletion();
    }
  }

  public collectItem(itemId: string): void {
    if (!this.levelState.itemsCollected.includes(itemId)) {
      this.levelState.itemsCollected.push(itemId);
      this.addScore(5);

      // Check if all required items collected
      if (this.currentLevel?.requiredItems) {
        const allRequiredCollected = this.currentLevel.requiredItems.every(
          (item) => this.levelState.itemsCollected.includes(item),
        );
        if (allRequiredCollected) {
          this.checkLevelCompletion();
        }
      }
    }
  }

  public getTimeElapsed(): number {
    return (Date.now() - this.levelState.startTime) / 1000;
  }

  public checkTimeLimit(): boolean {
    if (this.currentLevel?.timeLimit) {
      const elapsed = this.getTimeElapsed();
      return elapsed < this.currentLevel.timeLimit;
    }
    return true;
  }

  private checkLevelCompletion(): void {
    if (this.levelState.isComplete) return;

    const canComplete = this.canCompleteLevel();
    if (canComplete) {
      this.levelState.isComplete = true;
      this.onLevelComplete?.();
    }
  }

  private canCompleteLevel(): boolean {
    if (!this.currentLevel) return false;

    const checks: boolean[] = [];

    // Check target score
    if (this.currentLevel.targetScore) {
      checks.push(this.levelState.score >= this.currentLevel.targetScore);
    }

    // Check required enemies
    if (this.currentLevel.requiredEnemies) {
      checks.push(
        this.levelState.enemiesDefeated >= this.currentLevel.requiredEnemies,
      );
    }

    // Check required items
    if (this.currentLevel.requiredItems) {
      const allCollected = this.currentLevel.requiredItems.every((item) =>
        this.levelState.itemsCollected.includes(item),
      );
      checks.push(allCollected);
    }

    // If no specific requirements, complete when score > 0
    if (checks.length === 0) {
      return this.levelState.score > 0;
    }

    return checks.every((check) => check);
  }

  public getState(): LevelState {
    return { ...this.levelState };
  }

  public getCurrentLevel(): LevelConfig | undefined {
    return this.currentLevel;
  }

  public setScoreCallback(callback: (score: number) => void): void {
    this.onScoreChange = callback;
  }

  public setLevelCompleteCallback(callback: () => void): void {
    this.onLevelComplete = callback;
  }

  public setGameOverCallback(callback: () => void): void {
    this.onGameOver = callback;
  }

  public triggerGameOver(): void {
    this.onGameOver?.();
  }

  public reset(): void {
    this.levelState = this.createInitialState();
  }
}
