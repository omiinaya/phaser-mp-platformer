import { Scene } from 'phaser';
import { AssetManager } from '../core/AssetManager';
import { InputManager, InputConfig } from '../core/InputManager';
import { PhysicsManager } from '../core/PhysicsManager';
import { GameLoop, GameLoopEvent } from '../core/GameLoop';
import { eventBus } from '../core/EventBus';
import { EntityFactory } from '../factories/EntityFactory';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Item } from '../entities/Item';
import { Platform } from '../entities/Platform';

export class GameScene extends Scene {
  private player!: Player;
  private assetManager?: AssetManager;
  private inputManager?: InputManager;
  private physicsManager?: PhysicsManager;
  private gameLoop?: GameLoop;
  private entityFactory?: EntityFactory;
  private enemies: Enemy[] = [];
  private items: Item[] = [];
  private platforms: Platform[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Use AssetManager to load assets
    this.assetManager = new AssetManager(this);
    // Load player texture
    this.assetManager.loadAsset({
      key: 'player',
      type: 'image',
      url: 'assets/sprites/player.png',
    });
    // Load enemy textures (placeholder)
    this.assetManager.loadAsset({
      key: 'slime',
      type: 'image',
      url: 'assets/sprites/slime.png',
    });
    this.assetManager.loadAsset({
      key: 'flying',
      type: 'image',
      url: 'assets/sprites/flying.png',
    });
    // Load item textures
    this.assetManager.loadAsset({
      key: 'health_potion',
      type: 'image',
      url: 'assets/sprites/health_potion.png',
    });
    this.assetManager.loadAsset({
      key: 'coin',
      type: 'image',
      url: 'assets/sprites/coin.png',
    });
    this.assetManager.loadAsset({
      key: 'platform',
      type: 'image',
      url: 'assets/sprites/platform.png',
    });
    this.assetManager.startLoad().catch(err => console.error('Failed to load assets:', err));
  }

  create() {
    // Background
    this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x1a1a2e).setOrigin(0);

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
      ],
    };
    this.inputManager = new InputManager(this, inputConfig);
    this.inputManager.onInputEvent(event => {
      if (event.action === 'pause' && event.active) {
        eventBus.emit('game:pause');
      }
    });

    // Initialize EntityFactory
    this.entityFactory = new EntityFactory(this);

    // Create player using factory
    this.player = this.entityFactory.createPlayer(100, 300, {
      sessionId: 'test',
      name: 'Hero',
      health: 20,
      moveSpeed: -1, // use default
    });
    this.player.bindInputManager(this.inputManager);
    this.physicsManager.enableBody(this.player);
    this.physicsManager.setBodyCollisionWithBounds(this.player.body as Phaser.Physics.Arcade.Body);

    // Create platforms
    const ground = this.entityFactory.createPlatform(400, 500, {
      tileWidth: 10,
      tileHeight: 1,
      tileSize: 32,
    });
    this.platforms.push(ground);

    const movingPlatform = this.entityFactory.createMovingHorizontalPlatform(200, 400, 200, 100);
    this.platforms.push(movingPlatform);

    // Create enemies
    const slime = this.entityFactory.createSlime(300, 400);
    this.enemies.push(slime);

    const flyingEnemy = this.entityFactory.createFlyingEnemy(500, 200);
    this.enemies.push(flyingEnemy);

    // Create items
    const healthPotion = this.entityFactory.createHealthPotion(150, 350);
    this.items.push(healthPotion);

    const coin = this.entityFactory.createCoin(250, 350);
    this.items.push(coin);

    // Set up collisions
    this.physicsManager.setCollision(this.player, ground);
    this.physicsManager.setOverlap(this.player, healthPotion, (playerObj, itemObj) => {
      const item = itemObj as Item;
      const player = playerObj as Player;
      item.onCollide(player);
    });
    this.physicsManager.setOverlap(this.player, coin, (playerObj, itemObj) => {
      const item = itemObj as Item;
      const player = playerObj as Player;
      item.onCollide(player);
    });
    this.physicsManager.setCollision(this.player, slime);
    this.physicsManager.setCollision(this.player, flyingEnemy);

    // Initialize GameLoop
    this.gameLoop = new GameLoop(this);
    this.gameLoop.on(GameLoopEvent.Update, delta => {
      this.handleInput(delta);
      this.updateEntities(delta);
    });
    this.gameLoop.start();

    // Camera follow
    this.cameras.main.startFollow(this.player);

    // Subscribe to events
    eventBus.on('game:pause', this.togglePause.bind(this));
  }

  update(time: number, delta: number) {
    // Update input manager
    if (this.inputManager) {
      this.inputManager.update();
    }
    // GameLoop updates are handled via its own event
  }

  private handleInput(delta: number): void {
    // Input handling is now delegated to Player via InputManager binding
    // Additional global input (e.g., pause) can be handled here
  }

  private updateEntities(delta: number): void {
    // Update player (always)
    this.player.update(delta);

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
    this.enemies.forEach(enemy => {
      if (isInView(enemy)) {
        enemy.update(delta);
      }
    });

    // Update items within view
    this.items.forEach(item => {
      if (isInView(item)) {
        item.update(delta);
      }
    });

    // Update platforms within view (optional, but platforms may move)
    this.platforms.forEach(platform => {
      if (isInView(platform)) {
        platform.update(delta);
      }
    });
  }

  private togglePause(): void {
    if (this.physicsManager) {
      if (this.physicsManager.isPaused()) {
        this.physicsManager.resume();
        this.gameLoop?.start();
      } else {
        this.physicsManager.pause();
        this.gameLoop?.stop();
      }
    }
  }

  destroy() {
    // Clean up
    this.gameLoop?.destroy();
    eventBus.off('game:pause', this.togglePause.bind(this));
  }
}