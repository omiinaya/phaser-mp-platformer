import { logger } from '../utils/logger';
import { Scene } from 'phaser';
import { AssetManager } from '../core/AssetManager';
import { InputManager, InputConfig } from '../core/InputManager';
import { PhysicsManager } from '../core/PhysicsManager';
import { GameLoop, GameLoopEvent } from '../core/GameLoop';
import { eventBus } from '../core/EventBus';
import { AnimationManager } from '../core/AnimationManager';
import { AudioService, setGlobalAudioService } from '../core/AudioService';
import {
  ParticleManager,
  setGlobalParticleManager,
} from '../core/ParticleManager';
import { SaveManager, SaveData } from '../core/SaveManager';
import { Minimap } from '../core/Minimap';
import {
  PerformanceMonitor,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
} from '../core/PerformanceMonitor';
import {
  MemoryTracker,
  enableMemoryTracking,
  disableMemoryTracking,
} from '../core/MemoryTracker';
import {
  ErrorHandler,
  initErrorHandler,
  showConnectionError,
  showDisconnectionError,
} from '../core/ErrorHandler';
import {
  ProjectilePool,
  PooledProjectile,
  setGlobalProjectilePool,
} from '../core/ProjectilePool';
import { EntityFactory } from '../factories/EntityFactory';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Item } from '../entities/Item';
import { Platform } from '../entities/Platform';
import { LevelManager } from '../core/LevelManager';
import { TilemapLoader } from '../core/TilemapLoader';
import { SceneService } from '../core/SceneManager';
import { PauseSceneData } from './PauseScene';
import { GameOverSceneData } from './GameOverScene';
import { NetworkService } from '../services/NetworkService';

export interface GameSceneData {
  level?: number;
  restart?: boolean;
  roomId?: string;
}

interface RemotePlayerData {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  lastPosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
  currentVelocity: { x: number; y: number };
  lastUpdateTime: number;
}

export class GameScene extends Scene {
  private player!: Player;
  private assetManager?: AssetManager;
  private inputManager?: InputManager;
  private physicsManager?: PhysicsManager;
  private gameLoop?: GameLoop;
  private entityFactory?: EntityFactory;
  private levelManager?: LevelManager;
  private tilemapLoader?: TilemapLoader;
  private sceneService?: SceneService;
  private animationManager?: AnimationManager;
  private audioService?: AudioService;
  private particleManager?: ParticleManager;
  private saveManager?: SaveManager;
  private networkService?: NetworkService;
  private roomId?: string;
  private enemies: Enemy[] = [];
  private items: Item[] = [];
  private platforms: Platform[] = [];
  private projectiles: PooledProjectile[] = [];
  private projectilePool?: ProjectilePool;
  private remotePlayers: Map<string, RemotePlayerData> = new Map();
  private inputSequence: number = 0;
  private scoreText?: Phaser.GameObjects.Text;
  private healthText?: Phaser.GameObjects.Text;
  private healthBar?: Phaser.GameObjects.Graphics;
  private healthBarBg?: Phaser.GameObjects.Graphics;
  private levelText?: Phaser.GameObjects.Text;
  private playerIdText?: Phaser.GameObjects.Text;
  private comboText?: Phaser.GameObjects.Text;
  private comboMultiplierText?: Phaser.GameObjects.Text;
  private currentComboCount: number = 0;
  private currentComboMultiplier: number = 1.0;
  private currentLevel: number = 1;
  private isPaused: boolean = false;
  private lastHealth: number = 0;
  private currentScore: number = 0;
  private displayedScore: number = 0;
  private isMultiplayer: boolean = false;
  private minimap?: Minimap;
  private timeAttackTimer?: Phaser.GameObjects.Text;
  private isTimeAttackMode: boolean = false;
  private performanceMonitor: PerformanceMonitor;
  private memoryTracker: MemoryTracker;
  private performanceDisplay?: Phaser.GameObjects.Text;
  private lastPerformanceUpdate: number = 0;
  private errorHandler: ErrorHandler;

  // Minimap cache to avoid creating arrays every frame
  private minimapCache: {
    enemies: { x: number; y: number; id: string; active: boolean }[];
    items: { x: number; y: number; id: string; active: boolean }[];
    dirty: boolean;
    lastUpdate: number;
  } = {
      enemies: [],
      items: [],
      dirty: true,
      lastUpdate: 0,
    };

  constructor() {
    super({ key: 'GameScene' });
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.memoryTracker = MemoryTracker.getInstance();
    this.errorHandler = initErrorHandler();
  }

  init(data: GameSceneData) {
    this.currentLevel = data.level ?? 1;
    this.isPaused = false;
    this.roomId = data.roomId;
    if (this.roomId) {
      this.isMultiplayer = true;
    }
  }

  preload() {
    // Use AssetManager to load assets
    this.assetManager = new AssetManager(this);

    // Initialize AnimationManager for preloading sprite sheets
    this.animationManager = new AnimationManager(this);

    // Initialize AudioService for preloading audio
    this.audioService = new AudioService(this);
    this.audioService.preload();

    // Load sprite sheets with animations
    // Player: 32px frames, 26 total frames (8 idle + 8 walk + 4 jump + 6 attack)
    this.load.spritesheet('player', 'assets/spritesheets/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Enemy sprite sheets
    this.load.spritesheet('slime', 'assets/spritesheets/slime.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('flying', 'assets/spritesheets/flying.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('archer', 'assets/spritesheets/archer.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image('arrow', 'assets/sprites/arrow.png');

    // Static items (we'll animate them with tweens)
    this.load.svg('health_potion', 'assets/sprites/health_potion.svg', {
      width: 32,
      height: 32,
    });
    this.load.svg('coin', 'assets/sprites/coin.svg', { width: 32, height: 32 });
    this.load.svg('platform', 'assets/sprites/platform.svg', {
      width: 32,
      height: 32,
    });
    this.load.svg('shield', 'assets/sprites/shield.svg', {
      width: 32,
      height: 32,
    });

    // Load all level tilemaps
    this.load.tilemapTiledJSON('level1', 'assets/tilemaps/level1.json');
    this.load.tilemapTiledJSON('level2', 'assets/tilemaps/level2.json');
    this.load.tilemapTiledJSON('level3', 'assets/tilemaps/level3.json');
  }

  create() {
    // Initialize SceneService
    this.sceneService = new SceneService(this.game);

    // Initialize NetworkService for multiplayer
    if (this.isMultiplayer) {
      this.setupNetwork();
    }

    // Initialize LevelManager
    this.levelManager = new LevelManager(this);
    const loaded = this.levelManager.loadLevelByNumber(this.currentLevel);
    if (!loaded) {
      logger.error(`Failed to load level ${this.currentLevel}`);
      return;
    }

    const levelConfig = this.levelManager.getCurrentLevel()!;
    const bgColor = levelConfig.backgroundColor ?? 0x1a1a2e;

    // Background
    this.add
      .rectangle(
        0,
        0,
        this.cameras.main.width,
        this.cameras.main.height,
        bgColor,
      )
      .setOrigin(0);

    // Set up level callbacks
    this.levelManager.setScoreCallback((_score) => {
      this.updateUI();
    });
    this.levelManager.setLevelCompleteCallback(() => {
      this.handleLevelComplete();
    });
    this.levelManager.setGameOverCallback(() => {
      this.handleGameOver(false);
    });

    // Initialize AudioService
    this.audioService!.create();
    setGlobalAudioService(this.audioService!);
    this.audioService!.playMusic('gameplay_music');

    // Subscribe to audio events
    this.setupAudioEvents();

    // Initialize ParticleManager
    this.particleManager = new ParticleManager(this);
    setGlobalParticleManager(this.particleManager);

    // Initialize SaveManager
    this.saveManager = new SaveManager(this, true, 60000); // Auto-save every 60 seconds

    // Initialize Performance Monitoring
    startPerformanceMonitoring(30); // Monitor with 30fps threshold
    enableMemoryTracking();
    this.performanceMonitor.enable(30);
    this.memoryTracker.enable();

    // Initialize ProjectilePool
    this.projectilePool = new ProjectilePool(this, 20, 50);
    setGlobalProjectilePool(this.projectilePool);

    // Initialize PhysicsManager
    this.physicsManager = new PhysicsManager(this, {
      gravity: { x: 0, y: 300 },
      debug: false,
    });

    // Initialize InputManager
    const inputConfig: InputConfig = {
      actions: [
        { id: 'left', keys: ['Left', 'A'] },
        { id: 'right', keys: ['Right', 'D'] },
        { id: 'jump', keys: ['Up', 'W', 'Space'] },
        { id: 'pause', keys: ['Escape', 'P'] },
        { id: 'attack', keys: ['Z', 'Space'] },
        { id: 'parry', keys: ['X', 'Shift', 'Ctrl'] },
        { id: 'toggleMinimap', keys: ['M'] },
      ],
    };
    this.inputManager = new InputManager(this, inputConfig);
    this.inputManager.onInputEvent((event) => {
      if (event.action === 'pause' && event.active) {
        this.openPauseMenu();
      }
      if (event.action === 'toggleMinimap' && event.active) {
        this.toggleMinimap();
      }
    });

    // Initialize EntityFactory
    this.entityFactory = new EntityFactory(this);

    // Create player using factory with animation manager
    this.player = this.entityFactory.createPlayer(100, 300, {
      sessionId: 'test',
      name: 'Hero',
      health: 20,
      moveSpeed: -1, // use default
      animationManager: this.animationManager,
    });
    this.player.bindInputManager(this.inputManager);
    this.physicsManager.enableBody(this.player);
    this.physicsManager.setBodyCollisionWithBounds(
      this.player.body as Phaser.Physics.Arcade.Body,
    );

    // Initialize player animations
    this.player.initializeAnimations();
    this.lastHealth = this.player.health;

    // Create platforms
    const ground = this.entityFactory.createPlatform(400, 500, {
      tileWidth: 10,
      tileHeight: 1,
      tileSize: 32,
    });
    this.platforms.push(ground);

    const movingPlatform = this.entityFactory.createMovingHorizontalPlatform(
      200,
      400,
      200,
      100,
    );
    this.platforms.push(movingPlatform);

    // Create enemies
    const slime = this.entityFactory.createSlime(300, 400);
    this.enemies.push(slime);

    const flyingEnemy = this.entityFactory.createFlyingEnemy(500, 200);
    this.enemies.push(flyingEnemy);

    // Create items with callbacks and particle effects
    const healthPotion = this.entityFactory.createHealthPotion(150, 350);
    healthPotion.onCollide = (_player) => {
      this.levelManager?.collectItem('health_potion');
      // Health pickup particles
      this.particleManager?.createHealthPickupEffect(
        healthPotion.x,
        healthPotion.y,
      );
      // Play sound
      this.audioService?.playSFX('health_pickup');
      healthPotion.destroy();
    };
    this.items.push(healthPotion);

    const coin = this.entityFactory.createCoin(250, 350);
    coin.onCollide = (_player) => {
      this.levelManager?.collectCoin();
      // Coin collection particles
      this.particleManager?.createCoinSparkles(coin.x, coin.y);
      // Play sound
      this.audioService?.playSFX('coin');
      coin.destroy();
    };
    this.items.push(coin);

    // Add more coins for scoring
    const coin2 = this.entityFactory.createCoin(400, 250);
    coin2.onCollide = (_player) => {
      this.levelManager?.collectCoin();
      this.particleManager?.createCoinSparkles(coin2.x, coin2.y);
      this.audioService?.playSFX('coin');
      coin2.destroy();
    };
    this.items.push(coin2);

    const coin3 = this.entityFactory.createCoin(600, 300);
    coin3.onCollide = (_player) => {
      this.levelManager?.collectCoin();
      this.particleManager?.createCoinSparkles(coin3.x, coin3.y);
      this.audioService?.playSFX('coin');
      coin3.destroy();
    };
    this.items.push(coin3);

    // Add item animations (coin spin and potion glow)
    this.items.forEach((item) => {
      if (item.texture.key === 'coin') {
        // Coin spin animation
        this.tweens.add({
          targets: item,
          scaleX: 0,
          duration: 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        // Floating animation
        this.tweens.add({
          targets: item,
          y: item.y - 5,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else if (item.texture.key === 'health_potion') {
        // Potion glow animation
        this.tweens.add({
          targets: item,
          alpha: 0.7,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        // Gentle float
        this.tweens.add({
          targets: item,
          y: item.y - 3,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });

    // Set up collisions
    this.physicsManager.setCollision(this.player, ground);
    this.physicsManager.setOverlap(
      this.player,
      healthPotion,
      (playerObj, itemObj) => {
        const item = itemObj as Item;
        const player = playerObj as Player;
        item.onCollide(player);
      },
    );
    this.physicsManager.setOverlap(this.player, coin, (playerObj, itemObj) => {
      const item = itemObj as Item;
      const player = playerObj as Player;
      item.onCollide(player);
    });
    this.physicsManager.setCollision(
      this.player,
      slime,
      (playerObj, _enemyObj) => {
        // Player takes damage when colliding with enemy
        const player = playerObj as Player;

        if (player.takeDamage(1)) {
          // Screen shake
          this.cameras.main.shake(200, 0.01);
          // Damage particles
          this.particleManager?.createDamageEffect(player.x, player.y, 1);
          // Play sound
          this.audioService?.playSFX('player_hit');
        }
      },
    );
    this.physicsManager.setCollision(
      this.player,
      flyingEnemy,
      (playerObj, _enemyObj) => {
        // Player takes damage when colliding with enemy
        const player = playerObj as Player;

        if (player.takeDamage(1)) {
          // Screen shake
          this.cameras.main.shake(200, 0.01);
          // Damage particles
          this.particleManager?.createDamageEffect(player.x, player.y, 1);
          // Play sound
          this.audioService?.playSFX('player_hit');
        }
      },
    );

    // Set up projectile collisions
    this.setupProjectileCollisions();

    // Listen for enemy projectile firing
    this.events.on(
      'enemy:projectile-fired',
      (data: { enemy: Enemy; projectile: PooledProjectile }) => {
        this.projectiles.push(data.projectile);
        if (this.physicsManager) {
          this.physicsManager.enableBody(data.projectile);
          this.physicsManager.setCollision(
            this.player,
            data.projectile,
            (playerObj, projectileObj) => {
              const player = playerObj as Player;
              const projectile = projectileObj as PooledProjectile;
              if (player.takeDamage(projectile.getDamage())) {
                this.cameras.main.shake(200, 0.01);
                this.particleManager?.createDamageEffect(
                  player.x,
                  player.y,
                  projectile.getDamage(),
                );
                this.audioService?.playSFX('player_hit');
              }
              projectile.recycle();
            },
          );
        }
      },
    );

    // Initialize GameLoop
    this.gameLoop = new GameLoop(this);
    this.gameLoop.on(GameLoopEvent.Update, (delta) => {
      this.handleInput(delta);
      this.updateEntities(delta);
      this.checkGameConditions();
    });
    this.gameLoop.start();

    // Camera follow with level-specific bounds
    this.cameras.main.startFollow(this.player);

    // Set camera bounds based on level dimensions
    const levelBounds = this.getLevelBounds(this.currentLevel);
    this.cameras.main.setBounds(0, 0, levelBounds.width, levelBounds.height);

    // Set physics world bounds
    this.physicsManager?.setBounds(0, 0, levelBounds.width, levelBounds.height);

    // Initialize minimap
    this.minimap = new Minimap(this, levelBounds.width, levelBounds.height, {
      width: 200,
      height: 150,
      position: 'top-right',
      margin: 20,
      showGrid: true,
      gridSize: 100,
      zoom: 1,
    });

    // Create UI
    this.createUI();

    // Subscribe to events
    eventBus.on('game:pause', this.openPauseMenu.bind(this));
    eventBus.on('game:resume', this.resumeGame.bind(this));
  }

  update(_time: number, _delta: number) {
    // Update input manager
    if (this.inputManager && !this.isPaused) {
      this.inputManager.update();
    }
    // GameLoop updates are handled via its own event
  }

  private createUI(): void {
    const { width } = this.cameras.main;

    // Score text with animated counter
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '28px',
      color: '#f1c40f',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.scoreText.setScrollFactor(0);
    this.scoreText.setShadow(2, 2, '#000000', 2, true, true);

    // Health bar background
    this.healthBarBg = this.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.5);
    this.healthBarBg.fillRoundedRect(18, 53, 204, 24, 4);
    this.healthBarBg.setScrollFactor(0);

    // Health bar
    this.healthBar = this.add.graphics();
    this.healthBar.fillStyle(0xe74c3c);
    this.healthBar.fillRoundedRect(20, 55, 200, 20, 4);
    this.healthBar.setScrollFactor(0);

    // Health text (overlay on bar)
    this.healthText = this.add.text(120, 65, '20 / 20', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    this.healthText.setOrigin(0.5);
    this.healthText.setScrollFactor(0);
    this.healthText.setShadow(1, 1, '#000000', 1, true, true);

    // Combo text (hidden initially)
    this.comboText = this.add.text(width / 2, 50, 'COMBO: 0', {
      fontSize: '36px',
      color: '#ff6b6b',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.comboText.setOrigin(0.5);
    this.comboText.setScrollFactor(0);
    this.comboText.setAlpha(0);
    this.comboText.setShadow(2, 2, '#000000', 2, true, true);

    // Combo multiplier text (hidden initially)
    this.comboMultiplierText = this.add.text(width / 2, 90, '1.0x', {
      fontSize: '24px',
      color: '#ffd93d',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.comboMultiplierText.setOrigin(0.5);
    this.comboMultiplierText.setScrollFactor(0);
    this.comboMultiplierText.setAlpha(0);
    this.comboMultiplierText.setShadow(2, 2, '#000000', 2, true, true);

    // Level text
    this.levelText = this.add.text(
      width - 20,
      20,
      `Level ${this.currentLevel}`,
      {
        fontSize: '24px',
        color: '#3498db',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      },
    );
    this.levelText.setOrigin(1, 0);
    this.levelText.setScrollFactor(0);

    // Time attack timer (hidden by default)
    this.timeAttackTimer = this.add.text(width - 20, 60, '3:00', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.timeAttackTimer.setOrigin(1, 0);
    this.timeAttackTimer.setScrollFactor(0);
    this.timeAttackTimer.setAlpha(0); // Hidden by default
    this.timeAttackTimer.setShadow(2, 2, '#000000', 2, true, true);

    // Performance display (top-left, small font)
    this.performanceDisplay = this.add.text(20, 100, 'FPS: 60', {
      fontSize: '14px',
      color: '#00ff00',
      fontFamily: 'monospace',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    });
    this.performanceDisplay.setScrollFactor(0);
    this.performanceDisplay.setAlpha(0.7);
  }

  private updateUI(): void {
    if (this.levelManager) {
      const state = this.levelManager.getState();
      this.currentScore = state.score;

      // Animate score counter
      if (this.scoreText && this.currentScore !== this.displayedScore) {
        const diff = this.currentScore - this.displayedScore;
        const increment = Math.max(1, Math.ceil(diff * 0.1)); // Smooth animation
        this.displayedScore += increment;
        if (this.displayedScore > this.currentScore) {
          this.displayedScore = this.currentScore;
        }
        this.scoreText.setText(`Score: ${this.displayedScore}`);
      }
    }

    if (this.player && this.healthBar && this.healthText) {
      // Update health bar
      const healthPercent = this.player.health / this.player.maxHealth;
      const barWidth = 200 * Math.max(0, Math.min(1, healthPercent));

      this.healthBar.clear();

      // Change color based on health
      if (healthPercent > 0.6) {
        this.healthBar.fillStyle(0x2ecc71); // Green
      } else if (healthPercent > 0.3) {
        this.healthBar.fillStyle(0xf1c40f); // Yellow
      } else {
        this.healthBar.fillStyle(0xe74c3c); // Red
      }

      this.healthBar.fillRoundedRect(20, 55, barWidth, 20, 4);

      // Update health text
      this.healthText.setText(
        `${this.player.health} / ${this.player.maxHealth}`,
      );
    }
  }

  private updatePerformanceMonitoring(delta: number): void {
    // Update performance monitor frame tracking
    this.performanceMonitor.startFrame();
    const metrics = this.performanceMonitor.endFrame(delta);

    // Update performance display every 500ms
    this.lastPerformanceUpdate += delta;
    if (this.lastPerformanceUpdate >= 500 && this.performanceDisplay) {
      this.lastPerformanceUpdate = 0;

      const fps = metrics?.fps ?? 60;
      const color = fps >= 55 ? '#00ff00' : fps >= 30 ? '#ffff00' : '#ff0000';

      this.performanceDisplay.setText(`FPS: ${fps}`);
      this.performanceDisplay.setColor(color);
    }
  }

  private handleInput(_delta: number): void {
    // Input handling is now delegated to Player via InputManager binding
    // Additional global input (e.g., pause) can be handled here

    // Send player input to server in multiplayer
    if (
      this.isMultiplayer &&
      this.inputManager &&
      this.networkService?.isConnected()
    ) {
      const input: any = {
        moveX: 0,
        moveY: 0,
        jump: false,
        attack: false,
      };

      if (this.inputManager.isActionActive('left')) {
        input.moveX -= 1;
      }
      if (this.inputManager.isActionActive('right')) {
        input.moveX += 1;
      }
      if (this.inputManager.isActionActive('up')) {
        input.moveY -= 1;
      }
      if (this.inputManager.isActionActive('down')) {
        input.moveY += 1;
      }
      if (this.inputManager.isActionActive('jump')) {
        input.jump = true;
      }
      if (this.inputManager.isActionActive('attack')) {
        input.attack = true;
      }

      this.sendPlayerInput(input);
    }
  }

  private updateEntities(delta: number): void {
    if (this.isPaused) return;

    // Update player (always)
    this.player.update(delta);

    // Update remote players in multiplayer
    if (this.isMultiplayer) {
      this.updateRemotePlayers(delta);
    }

    // Get camera bounds with a margin for culling
    const camera = this.cameras.main;
    const margin = 200;
    const left = camera.worldView.x - margin;
    const right = camera.worldView.x + camera.worldView.width + margin;
    const top = camera.worldView.y - margin;
    const bottom = camera.worldView.y + camera.worldView.height + margin;

    // Helper to check if a game object is within bounds
    const isInView = (obj: Phaser.GameObjects.GameObject) => {
      const x = (obj as any).x ?? 0;
      const y = (obj as any).y ?? 0;
      return x >= left && x <= right && y >= top && y <= bottom;
    };

    // Update enemies within view
    this.enemies.forEach((enemy) => {
      if (isInView(enemy)) {
        enemy.update(delta);
      }
    });

    // Update items within view
    this.items.forEach((item) => {
      if (isInView(item)) {
        item.update(delta);
      }
    });

    // Update platforms within view (optional, but platforms may move)
    this.platforms.forEach((platform) => {
      if (isInView(platform)) {
        platform.update(delta);
      }
    });

    // Update projectiles via pool
    this.projectilePool?.update(delta);

    // Update UI
    this.updateUI();

    // Update performance monitoring
    this.updatePerformanceMonitoring(delta);

    // Update minimap (cached to avoid creating arrays every frame)
    if (this.minimap) {
      const playerData = {
        x: this.player.x,
        y: this.player.y,
        id: this.player.sessionId || 'local',
      };

      // Only update cached data every 100ms or when dirty
      const now = Date.now();
      if (this.minimapCache.dirty || now - this.minimapCache.lastUpdate > 100) {
        // Update cache in-place instead of creating new arrays
        this.minimapCache.enemies = [];
        for (const e of this.enemies) {
          if (e.active !== false) {
            this.minimapCache.enemies.push({
              x: e.x,
              y: e.y,
              id: `enemy_${e.x}_${e.y}`,
              active: true,
            });
          }
        }

        this.minimapCache.items = [];
        for (const i of this.items) {
          if (i.active !== false) {
            this.minimapCache.items.push({
              x: i.x,
              y: i.y,
              id: `item_${i.x}_${i.y}`,
              active: true,
            });
          }
        }

        this.minimapCache.dirty = false;
        this.minimapCache.lastUpdate = now;
      }

      this.minimap.update(
        playerData,
        this.minimapCache.enemies,
        this.minimapCache.items,
      );
    }

    // Update time attack timer
    if (this.isTimeAttackMode && this.timeAttackTimer && this.levelManager) {
      const timeElapsed = this.levelManager.getTimeElapsed();
      const timeLimit = this.levelManager.getCurrentLevel()?.timeLimit || 180;
      const timeRemaining = Math.max(0, timeLimit - timeElapsed);
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = Math.floor(timeRemaining % 60);
      const timeColor = timeRemaining < 30 ? '#ff0000' : '#ffffff';
      this.timeAttackTimer.setText(
        `${minutes}:${seconds.toString().padStart(2, '0')}`,
      );
      this.timeAttackTimer.setColor(timeColor);
    }
  }

  private checkGameConditions(): void {
    if (!this.player || !this.levelManager) return;

    // Check if player died
    if (this.player.health <= 0 && this.lastHealth > 0) {
      this.handleGameOver(false);
    }
    this.lastHealth = this.player.health;

    // Check if player fell off the world
    if (this.player.y > 800) {
      this.handleGameOver(false);
    }

    // Check time limit
    if (!this.levelManager.checkTimeLimit()) {
      this.handleGameOver(false);
    }
  }

  private handleLevelComplete(): void {
    if (this.isPaused) return;
    this.isPaused = true;

    // Unlock next level
    this.unlockLevel(this.currentLevel + 1);

    // Save progress
    if (this.saveManager) {
      const saveData = this.createSaveData();
      saveData.levels[this.currentLevel]!.completed = true;
      const timeElapsed = this.levelManager?.getTimeElapsed() ?? 0;
      const levelData = saveData.levels[this.currentLevel]!;
      if (!levelData.bestTime || timeElapsed < levelData.bestTime) {
        levelData.bestTime = timeElapsed;
      }
      this.saveManager.saveAutoGame(saveData);
    }

    this.physicsManager?.pause();
    this.gameLoop?.stop();

    const state = this.levelManager?.getState();
    const gameOverData: GameOverSceneData = {
      score: state?.score ?? 0,
      level: this.currentLevel,
      won: true,
      coins: state?.coins ?? 0,
      enemiesDefeated: state?.enemiesDefeated ?? 0,
      timeElapsed: this.levelManager?.getTimeElapsed() ?? 0,
    };

    this.scene.launch('GameOverScene', gameOverData);
    this.scene.pause();
  }

  private handleGameOver(won: boolean): void {
    if (this.isPaused) return;
    this.isPaused = true;

    // Save progress before game over
    if (!won && this.saveManager) {
      const saveData = this.createSaveData();
      this.saveManager.saveAutoGame(saveData);
    }

    this.physicsManager?.pause();
    this.gameLoop?.stop();

    const state = this.levelManager?.getState();
    const gameOverData: GameOverSceneData = {
      score: state?.score ?? 0,
      level: this.currentLevel,
      won,
      coins: state?.coins ?? 0,
      enemiesDefeated: state?.enemiesDefeated ?? 0,
      timeElapsed: this.levelManager?.getTimeElapsed() ?? 0,
    };

    this.scene.launch('GameOverScene', gameOverData);
    this.scene.pause();
  }

  private openPauseMenu(): void {
    if (this.isPaused) return;
    this.isPaused = true;

    this.physicsManager?.pause();
    this.gameLoop?.stop();

    const state = this.levelManager?.getState();
    const pauseData: PauseSceneData = {
      score: state?.score ?? 0,
      level: this.currentLevel,
      fromScene: 'GameScene',
    };

    this.scene.launch('PauseScene', pauseData);
    this.scene.pause();
  }

  private resumeGame(): void {
    if (!this.isPaused) return;
    this.isPaused = false;

    this.physicsManager?.resume();
    this.gameLoop?.start();
  }

  private togglePause(): void {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.openPauseMenu();
    }
  }

  private setupAudioEvents(): void {
    // Player events
    this.events.on('player:jump', () => {
      this.audioService?.playSFX('jump');
    });

    this.events.on('player:attack', () => {
      this.audioService?.playSFX('attack');
    });

    this.events.on('player:land', () => {
      this.audioService?.playSFX('landing');
    });

    // Item collection events
    this.events.on('item:collected', (data: { type: string }) => {
      if (data.type === 'coin') {
        this.audioService?.playSFX('coin');
      } else if (data.type === 'health_potion') {
        this.audioService?.playSFX('health_pickup');
      }
    });

    // Damage events
    this.events.on('player:damage', () => {
      this.audioService?.playSFX('player_hit');
    });

    this.events.on('enemy:damage', () => {
      this.audioService?.playSFX('enemy_hit');
    });

    // Player attack event - deal damage to nearby enemies
    this.events.on(
      'player:attack',
      (data: {
        player: Player;
        comboCount: number;
        comboMultiplier: number;
        attackDamage: number;
      }) => {
        this.handlePlayerAttack(data.player, data.attackDamage);
      },
    );

    // Combo changed event
    this.events.on(
      'player:combo-changed',
      (data: {
        player: Player;
        comboCount: number;
        comboMultiplier: number;
        wasNewCombo: boolean;
      }) => {
        this.currentComboCount = data.comboCount;
        this.currentComboMultiplier = data.comboMultiplier;
        this.updateComboUI(data.wasNewCombo);
      },
    );

    // Combo reset event
    this.events.on(
      'player:combo-reset',
      (_data: { player: Player; reason: string }) => {
        this.currentComboCount = 0;
        this.currentComboMultiplier = 1.0;
        this.hideComboUI();
      },
    );

    // Parry start event
    this.events.on('player:parry', (_data: { player: Player }) => {
      this.audioService?.playSFX('defense');
    });

    // Parry successful event
    this.events.on(
      'player:parry-successful',
      (data: { player: Player; perfectParry: boolean }) => {
        if (data.perfectParry) {
          this.audioService?.playSFX('powerup');
        }
      },
    );

    // Perfect parry event
    this.events.on('player:perfect-parry', (data: { player: Player }) => {
      this.cameras.main.shake(50, 0.01);
      this.particleManager?.createDamageEffect(data.player.x, data.player.y, 0);
    });

    // Level events
    this.events.on('level:complete', () => {
      this.audioService?.stopMusic(true);
      this.audioService?.playSFX('level_complete');
    });

    this.events.on('game:over', () => {
      this.audioService?.stopMusic(true);
      this.audioService?.playSFX('game_over');
    });

    // Inventory events
    this.events.on(
      'player:item-picked-up',
      (data: { player: Player; item: Item; quantity: number }) => {
        this.audioService?.playSFX('item_pickup');
        // Visual feedback
        if (data.item.config.collectEffect) {
          this.particleManager?.createHealthPickupEffect(
            data.player.x,
            data.player.y,
          );
        }
      },
    );

    this.events.on(
      'player:healed',
      (data: { player: Player; amount: number }) => {
        this.audioService?.playSFX('health_pickup');
        // Heal particles
        this.particleManager?.createHealthPickupEffect(
          data.player.x,
          data.player.y,
        );
      },
    );

    this.events.on('inventory:add', (data: any) => {
      logger.info('Item added to inventory:', data);
    });

    this.events.on('inventory:remove', (data: any) => {
      logger.info('Item removed from inventory:', data);
    });

    // Handle dropped items from inventory
    this.events.on('inventory:item-dropped', (data: any) => {
      this.handleDroppedItem(data);
    });

    // Save system events
    this.events.on('save:autosave', () => {
      this.autoSaveGame();
    });

    this.events.on('save:manual', (data: { slotIndex: number }) => {
      this.manualSaveGame(data.slotIndex);
    });

    this.events.on('save:load', async (data: { slotIndex: number }) => {
      await this.loadGame(data.slotIndex);
    });
  }

  private setupProjectileCollisions(): void {
    // Projectiles are now managed by the ProjectilePool
    // Collisions are set up dynamically when projectiles are fired
  }

  private getLevelBounds(levelNumber: number): {
    width: number;
    height: number;
  } {
    // Define level dimensions based on level number
    switch (levelNumber) {
    case 1:
      return { width: 2000, height: 600 };
    case 2:
      return { width: 1280, height: 2560 };
    case 3:
      return { width: 3000, height: 800 };
    default:
      return { width: 2000, height: 600 };
    }
  }

  private setupNetwork(): void {
    this.networkService = new NetworkService();

    this.networkService.on('connected', (data: { playerId: string }) => {
      logger.info('Connected to server with ID:', data.playerId);
      this.playerIdText = this.add
        .text(
          this.cameras.main.width / 2,
          80,
          `Player: ${data.playerId.substring(0, 8)}`,
          { fontSize: '16px', color: '#fff' },
        )
        .setOrigin(0.5)
        .setScrollFactor(0);
    });

    this.networkService.on(
      'room_joined',
      (data: { roomId: string; players: any[] }) => {
        logger.info('Joined room:', data.roomId);
        this.remotePlayers.clear();
        data.players.forEach((playerData: any) => {
          if (playerData.playerId !== this.networkService?.getPlayerId()) {
            this.createRemotePlayer(playerData.playerId, playerData.position);
          }
        });
      },
    );

    this.networkService.on(
      'player_joined',
      (data: { playerId: string; playerData: any }) => {
        if (data.playerId !== this.networkService?.getPlayerId()) {
          this.createRemotePlayer(
            data.playerId,
            data.playerData?.position || { x: 200, y: 300 },
          );
          this.showPlayerName(data.playerId, 'connected');
        }
      },
    );

    this.networkService.on('player_left', (data: { playerId: string }) => {
      this.removeRemotePlayer(data.playerId);
      this.showPlayerName(data.playerId, 'disconnected');
    });

    this.networkService.on(
      'game_state_update',
      (state: { entities: any; full: boolean }) => {
        this.handleGameStateUpdate(state);
      },
    );

    this.networkService.on(
      'player_input',
      (data: { playerId: string; input: any }) => {
        this.handleRemotePlayerInput(data.playerId, data.input);
      },
    );

    this.networkService.on('error', (error: { message: string }) => {
      logger.error('Network error:', error.message);
    });

    // Handle disconnection with recovery
    this.networkService.on('disconnected', (data: { reason: string }) => {
      logger.warn('Disconnected from server:', data.reason);
      showConnectionError(() => {
        // Retry connection
        this.networkService?.connect().catch((err) => {
          logger.error('Reconnection failed:', err);
        });
      });
    });

    this.networkService.on(
      'reconnect_attempt',
      (data: { attemptNumber: number }) => {
        logger.info(`Reconnection attempt ${data.attemptNumber}...`);
      },
    );

    this.networkService.on('reconnected', (data: { attemptNumber: number }) => {
      logger.info(
        'Successfully reconnected after',
        data.attemptNumber,
        'attempts',
      );
      // Sync game state after reconnection
      this.syncGameStateAfterReconnect();
    });

    this.networkService.on('reconnect_failed', () => {
      logger.error('Failed to reconnect to server');
      showDisconnectionError(() => {
        this.returnToMainMenu();
      });
    });

    this.networkService.connect().catch((err) => {
      logger.error('Failed to connect to server:', err);
    });
  }

  private createRemotePlayer(
    playerId: string,
    position: { x: number; y: number },
  ): void {
    if (this.remotePlayers.has(playerId)) return;

    const sprite = this.add.sprite(position.x, position.y, 'player');
    sprite.setTint(0x8f4d8d);
    sprite.setDepth(5);

    const nameText = this.add
      .text(position.x, position.y - 20, `P${playerId.substring(0, 4)}`, {
        fontSize: '12px',
        color: '#fff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.remotePlayers.set(playerId, {
      id: playerId,
      sprite,
      nameText,
      lastPosition: { ...position },
      targetPosition: { ...position },
      currentVelocity: { x: 0, y: 0 },
      lastUpdateTime: Date.now(),
    });
  }

  private removeRemotePlayer(playerId: string): void {
    const playerData = this.remotePlayers.get(playerId);
    if (playerData) {
      playerData.sprite.destroy();
      playerData.nameText.destroy();
      this.remotePlayers.delete(playerId);
    }
  }

  private handleGameStateUpdate(state: { entities: any; full: boolean }): void {
    const now = Date.now();
    const entities = state.entities;

    for (const [entityId, entity] of Object.entries(entities) as [
      string,
      any,
    ][]) {
      if (entityId === this.networkService?.getPlayerId()) continue;

      const remotePlayer = this.remotePlayers.get(entityId);
      if (remotePlayer && entity.position) {
        remotePlayer.targetPosition = { ...entity.position };
        remotePlayer.lastUpdateTime = now;

        if (entity.velocity) {
          remotePlayer.currentVelocity = { ...entity.velocity };
        }
      }
    }

    if (state.full) {
      const currentPlayerIds = Object.keys(state.entities);
      const myPlayerId = this.networkService?.getPlayerId();

      for (const playerId of this.remotePlayers.keys()) {
        if (playerId !== myPlayerId && !currentPlayerIds.includes(playerId)) {
          this.removeRemotePlayer(playerId);
        }
      }
    }
  }

  private handleRemotePlayerInput(playerId: string, input: any): void {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (remotePlayer) {
      if (input.moveX !== undefined) {
        remotePlayer.sprite.flipX = input.moveX < 0;
      }
    }
  }

  private updateRemotePlayers(_delta: number): void {
    const now = Date.now();
    const lerpFactor = 0.15;

    for (const [, playerData] of this.remotePlayers.entries()) {
      const { sprite, nameText, targetPosition, lastUpdateTime } = playerData;

      if (targetPosition) {
        const dx = targetPosition.x - sprite.x;
        const dy = targetPosition.y - sprite.y;

        sprite.x += dx * lerpFactor;
        sprite.y += dy * lerpFactor;

        nameText.x = sprite.x;
        nameText.y = sprite.y - 25;

        if (Math.abs(playerData.currentVelocity?.x || 0) > 10) {
          sprite.anims.play('walk', true);
          sprite.flipX = playerData.currentVelocity.x < 0;
        } else {
          sprite.anims.play('idle', true);
        }
      }

      const timeSinceUpdate = now - lastUpdateTime;
      if (timeSinceUpdate > 5000) {
        sprite.alpha = Math.max(0.3, 1 - timeSinceUpdate / 5000);
      } else {
        sprite.alpha = 1;
      }
    }
  }

  private sendPlayerInput(input: any): void {
    if (!this.networkService?.isConnected() || !this.isMultiplayer) return;

    this.inputSequence++;
    this.networkService.sendPlayerInput({
      sequence: this.inputSequence,
      input,
      timestamp: Date.now(),
    });
  }

  private showPlayerName(playerId: string, action: string): void {
    const text = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        `Player ${playerId.substring(0, 8)} ${action}`,
        {
          fontSize: '24px',
          color: action === 'connected' ? '#4CAF50' : '#f44336',
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5)
      .setDepth(1000)
      .setScrollFactor(0);

    this.tweens.add({
      targets: text,
      y: this.cameras.main.height / 2 - 50,
      alpha: 0,
      duration: 2000,
      ease: 'Sine.easeIn',
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Handle player attack - deal damage to nearby enemies
   */
  private handlePlayerAttack(player: Player, attackDamage: number): void {
    const attackRange = 80;
    const attackOffset = 40 * player.facing;

    // Check each enemy for being in attack range
    this.enemies.forEach((enemy) => {
      if (!enemy.active) return;

      const dx = enemy.x - (player.x + attackOffset);
      const dy = enemy.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if enemy is in attack range and in front of player
      if (distance < attackRange && Math.sign(dx) === player.facing) {
        // Deal damage to enemy with combo multiplier applied
        const alive = enemy.takeDamage(attackDamage);

        // Increment combo on successful hit (if enemy took damage)
        if (!alive || enemy.health < enemy.maxHealth) {
          player.onEnemyHit();

          // Visual feedback
          this.cameras.main.shake(100, 0.005);
          this.particleManager?.createDamageEffect(
            enemy.x,
            enemy.y,
            attackDamage,
          );
          this.audioService?.playSFX('enemy_hit');
        }
      }
    });
  }

  /**
   * Update combo UI with animation
   */
  private updateComboUI(wasNewCombo: boolean): void {
    if (!this.comboText || !this.comboMultiplierText) return;

    this.comboText.setText(
      this.currentComboCount > 0 ? `COMBO: ${this.currentComboCount}!` : '',
    );
    this.comboMultiplierText.setText(
      `${this.currentComboMultiplier.toFixed(1)}x`,
    );

    // Scale animation on new combo
    if (wasNewCombo) {
      this.tweens.add({
        targets: [this.comboText, this.comboMultiplierText],
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 100,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }

    this.comboText.setAlpha(1);
    this.comboMultiplierText.setAlpha(1);

    // Color based on multiplier
    const multiplier = this.currentComboMultiplier;
    let comboColor = '#ff6b6b';
    if (multiplier >= 2.0) comboColor = '#ffd93d';
    if (multiplier >= 2.5) comboColor = '#ff9f43';
    if (multiplier >= 3.0) comboColor = '#ee5a24';

    this.comboText.setColor(comboColor);
  }

  /**
   * Hide combo UI with fade out
   */
  private hideComboUI(): void {
    if (!this.comboText || !this.comboMultiplierText) return;

    this.tweens.add({
      targets: [this.comboText, this.comboMultiplierText],
      alpha: 0,
      duration: 500,
      ease: 'Sine.easeOut',
    });
  }

  /**
   * Create save data from current game state.
   * @returns Save data object.
   */
  private createSaveData(): SaveData {
    const levelState = this.levelManager?.getState();

    return {
      version: '1.0.0',
      timestamp: Date.now(),
      player: {
        health: this.player.health,
        maxHealth: this.player.maxHealth,
        currentLevel: this.currentLevel,
        unlockedLevels: this.getUnlockedLevels(),
        totalScore: levelState?.score ?? this.currentScore,
        totalCoins: levelState?.coins ?? 0,
        totalEnemiesDefeated: levelState?.enemiesDefeated ?? 0,
      },
      levels: {
        [this.currentLevel]: {
          highScore: levelState?.score ?? this.currentScore,
          completed: false,
          lastCheckpoint: 0,
        },
      },
      lastPosition: {
        level: this.currentLevel,
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
      },
      settings: {
        musicVolume: 100,
        sfxVolume: 100,
        musicEnabled: true,
        sfxEnabled: true,
      },
    };
  }

  /**
   * Auto-save the game (uses separate slot).
   */
  private autoSaveGame(): void {
    if (this.saveManager && this.levelManager) {
      const saveData = this.createSaveData();
      this.saveManager.saveAutoGame(saveData);
      logger.info('Auto-saved game');
    }
  }

  /**
   * Manually save the game to a specific slot.
   * @param slotIndex Save slot index (0-4).
   * @returns True if the save was successful.
   */
  public manualSaveGame(slotIndex: number): boolean {
    if (!this.saveManager) return false;

    const saveData = this.createSaveData();
    const success = this.saveManager.saveGame(slotIndex, saveData);

    if (success) {
      // Save unlocked levels
      this.updateUnlockedLevels(saveData.player.unlockedLevels);
    }

    return success;
  }

  /**
   * Load game from a specific save slot.
   * @param slotIndex Save slot index (0-4), or -1 for auto-save.
   * @returns True if the load was successful.
   */
  public async loadGame(slotIndex: number): Promise<boolean> {
    if (!this.saveManager) return false;

    let saveData: SaveData | undefined;

    if (slotIndex === -1) {
      // Load from auto-save
      saveData = await this.saveManager.loadAutoGameAsync();
    } else {
      // Load from specific slot
      saveData = await this.saveManager.loadGameAsync(slotIndex);
    }

    if (!saveData) {
      logger.error('Failed to load game: no save data found');
      return false;
    }

    this.applySaveData(saveData);
    logger.info(
      `Game loaded from slot ${slotIndex === -1 ? 'auto-save' : slotIndex}`,
    );
    return true;
  }

  /**
   * Apply loaded save data to the game state.
   * @param saveData The save data to apply.
   */
  private applySaveData(saveData: SaveData): void {
    // Update player state
    this.player.health = Math.min(
      saveData.player.health,
      saveData.player.maxHealth,
    );
    this.player.maxHealth = saveData.player.maxHealth;

    // Update level
    this.currentLevel = saveData.player.currentLevel;

    // Load the appropriate level
    if (this.levelManager) {
      const loaded = this.levelManager.loadLevelByNumber(this.currentLevel);
      if (loaded) {
        // Update score state
        const state = this.levelManager.getState();
        if (state) {
          state.score = saveData.player.totalScore;
          state.coins = saveData.player.totalCoins;
          state.enemiesDefeated = saveData.player.totalEnemiesDefeated;
        }

        // Update camera bounds for new level
        const levelBounds = this.getLevelBounds(this.currentLevel);
        this.cameras.main.setBounds(
          0,
          0,
          levelBounds.width,
          levelBounds.height,
        );
        this.physicsManager?.setBounds(
          0,
          0,
          levelBounds.width,
          levelBounds.height,
        );

        // Set player position from save
        if (
          saveData.lastPosition &&
          saveData.lastPosition.level === this.currentLevel
        ) {
          this.player.x = saveData.lastPosition.x;
          this.player.y = saveData.lastPosition.y;
        }
      }

      // Update UI
      this.updateUI();

      // Update level text
      if (this.levelText) {
        this.levelText.setText(`Level ${this.currentLevel}`);
      }
    }

    // Update unlocked levels
    this.updateUnlockedLevels(saveData.player.unlockedLevels);
  }

  /**
   * Update unlocked levels from save data.
   * Stores unlocked levels in LocalStorage.
   * @param unlockedLevels Array of unlocked level numbers.
   */
  private updateUnlockedLevels(unlockedLevels: number[]): void {
    const key = SaveManager['STORAGE_PREFIX'] + 'unlocked_levels';
    localStorage.setItem(key, JSON.stringify(unlockedLevels));
  }

  /**
   * Get unlocked levels from LocalStorage.
   * @returns Array of unlocked level numbers.
   */
  private getUnlockedLevels(): number[] {
    const key = SaveManager['STORAGE_PREFIX'] + 'unlocked_levels';
    const data = localStorage.getItem(key);

    if (!data) {
      return [1]; // Default: only level 1 is unlocked
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to parse unlocked levels:', error);
      return [1];
    }
  }

  /**
   * Check if a specific level is unlocked.
   * @param levelNumber The level number to check.
   * @returns True if the level is unlocked.
   */
  public isLevelUnlocked(levelNumber: number): boolean {
    const unlockedLevels = this.getUnlockedLevels();
    return unlockedLevels.includes(levelNumber);
  }

  /**
   * Unlock a specific level.
   * @param levelNumber The level number to unlock.
   */
  public unlockLevel(levelNumber: number): void {
    const unlockedLevels = this.getUnlockedLevels();
    if (!unlockedLevels.includes(levelNumber)) {
      unlockedLevels.push(levelNumber);
      this.updateUnlockedLevels(unlockedLevels);
      logger.info(`Unlocked level ${levelNumber}`);
    }
  }

  /**
   * Create checkpoint data for saving.
   * @param checkpointNumber Checkpoint number (0 for start, 1-N for checkpoints).
   * @returns Partial save data for checkpoint.
   */
  public createCheckpointData(checkpointNumber: number = 0): Partial<SaveData> {
    const levelState = this.levelManager?.getState();

    return {
      player: {
        health: this.player.health,
        maxHealth: this.player.maxHealth,
        currentLevel: this.currentLevel,
        unlockedLevels: this.getUnlockedLevels(),
        totalScore: levelState?.score ?? this.currentScore,
        totalCoins: levelState?.coins ?? 0,
        totalEnemiesDefeated: levelState?.enemiesDefeated ?? 0,
      },
      levels: {
        [this.currentLevel]: {
          highScore: levelState?.score ?? this.currentScore,
          completed: false,
          lastCheckpoint: checkpointNumber,
        },
      },
      lastPosition: {
        level: this.currentLevel,
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
      },
    };
  }

  /**
   * Save checkpoint (called when player reaches a checkpoint).
   * @param checkpointNumber Checkpoint number.
   */
  public saveCheckpoint(checkpointNumber: number): void {
    if (this.saveManager) {
      const checkpointData = this.createCheckpointData(checkpointNumber);
      this.saveManager.saveAutoGame(checkpointData);
      logger.info(`Saved checkpoint ${checkpointNumber}`);
    }
  }

  /**
   * Parse gem type from item name.
   * @param itemName The item name to parse.
   * @returns The gem type.
   */
  private parseGemTypeFromName(
    itemName: string,
  ): 'red' | 'blue' | 'green' | 'purple' | 'yellow' {
    if (itemName.includes('blue')) return 'blue';
    if (itemName.includes('green')) return 'green';
    if (itemName.includes('purple')) return 'purple';
    if (itemName.includes('yellow')) return 'yellow';
    return 'red';
  }

  /**
   * Handle an item dropped from the player's inventory.
   * @param data The dropped item data.
   */
  private handleDroppedItem(data: {
    itemId: string;
    config: any;
    texture: string;
    quantity: number;
    position: { x: number; y: number };
  }): void {
    // Simplified handling - we can create items based on type
    let droppedItem: Item | undefined;

    // Handle based on item type
    const itemType = data.config?.type || 'misc';
    const itemName = data.config?.name?.toLowerCase() || '';

    if (itemName.includes('health') || itemName.includes('potion')) {
      droppedItem = this.entityFactory?.createHealthPotion(
        data.position.x,
        data.position.y,
        data.config,
      );
    } else if (itemName.includes('coin')) {
      droppedItem = this.entityFactory?.createCoin(
        data.position.x,
        data.position.y,
      );
    } else if (itemType.includes('gem')) {
      // For gems, we could parse the gem type from the item name
      const gemType = this.parseGemTypeFromName(itemName);
      droppedItem = this.entityFactory?.createGem(
        gemType,
        data.position.x,
        data.position.y,
        data.config,
      );
    }

    if (droppedItem) {
      this.items.push(droppedItem);

      // Set up collision with player for pickup
      if (this.physicsManager) {
        this.physicsManager.setOverlap(
          this.player,
          droppedItem,
          (playerObj, itemObj) => {
            const player = playerObj as Player;
            const item = itemObj as Item;
            if (player.pickupItem(item, data.quantity)) {
              this.audioService?.playSFX('item_pickup');
              item.destroy();

              // Remove from items array
              const index = this.items.indexOf(item);
              if (index > -1) {
                this.items.splice(index, 1);
              }
            }
          },
        );
      }
    }
  }

  /**
   * Enable or disable time attack mode.
   * @param enabled Whether to enable time attack mode.
   */
  public setTimeAttackMode(enabled: boolean): void {
    this.isTimeAttackMode = enabled;
    if (this.timeAttackTimer) {
      this.timeAttackTimer.setAlpha(enabled ? 1 : 0);
    }
    if (enabled) {
      logger.info('Time attack mode enabled');
    }
  }

  /**
   * Toggle minimap visibility.
   */
  public toggleMinimap(): void {
    if (this.minimap) {
      this.minimap.toggle();
    }
  }

  /**
   * Show/hide minimap.
   * @param visible Whether to show the minimap.
   */
  public setMinimapVisible(visible: boolean): void {
    if (this.minimap) {
      if (visible) {
        this.minimap.show();
      } else {
        this.minimap.hide();
      }
    }
  }

  /**
   * Sync game state after reconnection.
   * Called when the client successfully reconnects to the server.
   */
  private syncGameStateAfterReconnect(): void {
    logger.info('Syncing game state after reconnection');

    // Re-send player state to server
    if (this.player && this.networkService?.isConnected()) {
      const syncData = this.player.getSyncData();
      this.networkService['socket']?.emit('player_sync', syncData);
    }

    // Request full game state from server
    this.networkService?.['socket']?.emit('request_full_state');

    // Show reconnection success message
    if (this.errorHandler) {
      // Clear any error dialogs
      this.errorHandler.clearErrors();
    }
  }

  /**
   * Return to main menu.
   * Called when multiplayer connection fails completely.
   */
  private returnToMainMenu(): void {
    logger.info('Returning to main menu due to connection failure');

    // Clean up multiplayer state
    this.isMultiplayer = false;
    this.roomId = undefined;

    // Stop game loop
    this.gameLoop?.stop();

    // Disconnect from network
    this.networkService?.disconnect();

    // Transition to main menu
    this.scene.start('MainMenuScene');
  }

  destroy() {
    // Clean up game systems
    this.gameLoop?.destroy();
    this.saveManager?.destroy();
    this.minimap?.destroy();
    this.errorHandler?.destroy();

    // Clean up event bus listeners
    eventBus.off('game:pause', this.openPauseMenu.bind(this));
    eventBus.off('game:resume', this.resumeGame.bind(this));

    // Remove all scene event listeners to prevent memory leaks
    this.events.off('enemy:projectile-fired');
    this.events.off('player:jump');
    this.events.off('player:attack');
    this.events.off('player:land');
    this.events.off('item:collected');
    this.events.off('player:damage');
    this.events.off('enemy:damage');
    this.events.off('player:parry');
    this.events.off('player:perfect-parry');
    this.events.off('level:complete');
    this.events.off('game:over');
    this.events.off('inventory:add');
    this.events.off('inventory:remove');
    this.events.off('inventory:item-dropped');
    this.events.off('save:autosave');
    this.events.off('save:manual');
    this.events.off('save:load');
    // Additional events that were missing cleanup
    this.events.off('player:combo-changed');
    this.events.off('player:combo-reset');
    this.events.off('player:parry-successful');
    this.events.off('player:item-picked-up');
    this.events.off('player:healed');

    // Remove network service listeners
    if (this.networkService) {
      this.networkService.removeAllListeners();
    }

    // Clean up remote players
    this.remotePlayers.forEach((playerData) => {
      playerData.sprite.destroy();
      playerData.nameText.destroy();
    });
    this.remotePlayers.clear();

    // Clean up game objects
    this.enemies.forEach((enemy) => enemy.destroy());
    this.enemies = [];

    this.items.forEach((item) => item.destroy());
    this.items = [];

    this.platforms.forEach((platform) => platform.destroy());
    this.platforms = [];

    this.projectiles.forEach((proj) => proj.destroy());
    this.projectiles = [];

    // Destroy UI elements
    this.scoreText?.destroy();
    this.healthText?.destroy();
    this.healthBar?.destroy();
    this.healthBarBg?.destroy();
    this.levelText?.destroy();
    this.playerIdText?.destroy();
    this.comboText?.destroy();
    this.comboMultiplierText?.destroy();
    this.timeAttackTimer?.destroy();
    this.performanceDisplay?.destroy();

    // Clean up managers (only call destroy if it exists)
    if (
      this.animationManager &&
      typeof this.animationManager.destroy === 'function'
    ) {
      this.animationManager.destroy();
    }
    if (this.audioService && typeof this.audioService.destroy === 'function') {
      this.audioService.destroy();
    }
    if (
      this.particleManager &&
      typeof this.particleManager.destroy === 'function'
    ) {
      this.particleManager.destroy();
    }
    this.entityFactory = undefined;

    // Stop performance monitoring
    stopPerformanceMonitoring();
    disableMemoryTracking();

    // Force garbage collection hint
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }
}
