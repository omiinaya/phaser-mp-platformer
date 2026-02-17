import Phaser from 'phaser';

/**
 * Minimap marker type.
 */
export enum MarkerType {
  /** Player position. */
  PLAYER = 'player',
  /** Enemy position. */
  ENEMY = 'enemy',
  /** Item collectible. */
  ITEM = 'item',
  /** Exit goal. */
  EXIT = 'exit',
  /** Checkpoint. */
  CHECKPOINT = 'checkpoint',
}

/**
 * Marker data for minimap.
 */
export interface MinimapMarker {
  /** Type of marker. */
  type: MarkerType;
  /** X position. */
  x: number;
  /** Y position. */
  y: number;
  /** Reference to the game object (optional). */
  gameObject?: Phaser.GameObjects.GameObject | any;
  /** Whether the marker is active. */
  active: boolean;
}

/**
 * Minimap configuration.
 */
export interface MinimapConfig {
  /** Width of minimap in pixels. */
  width: number;
  /** Height of minimap in pixels. */
  height: number;
  /** Position: 'top-left', 'top-right', 'bottom-left', 'bottom-right'. */
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Margin from screen edge. */
  margin: number;
  /** Whether to show grid. */
  showGrid: boolean;
  /** Grid size (pixels). */
  gridSize: number;
  /** Zoom level (scale of minimap). */
  zoom: number;
}

/**
 * Minimap class for rendering level overview.
 * Real-time tracking of player, enemies, items, and other entities.
 */
export class Minimap {
  /** Scene reference. */
  readonly scene: Phaser.Scene;

  /** Minimap container. */
  private container: Phaser.GameObjects.Container;

  /** Background graphics. */
  private background: Phaser.GameObjects.Graphics;

  /** Markers graphics layer. */
  private markersGraphics: Phaser.GameObjects.Graphics;

  /** Config. */
  private config: MinimapConfig;

  /** Level dimensions. */
  private levelWidth: number;
  private levelHeight: number;

  /** Registered markers. */
  private markers: Map<string, MarkerType>;

  /** Scale factors for position mapping. */
  private scaleX: number;
  private scaleY: number;

  /**
   * Creates an instance of Minimap.
   * @param scene The scene this minimap belongs to.
   * @param levelWidth Level width in pixels.
   * @param levelHeight Level height in pixels.
   * @param config Minimap configuration.
   */
  constructor(
    scene: Phaser.Scene,
    levelWidth: number,
    levelHeight: number,
    config: Partial<MinimapConfig> = {},
  ) {
    this.scene = scene;
    this.levelWidth = levelWidth;
    this.levelHeight = levelHeight;
    this.markers = new Map();

    // Default config
    this.config = {
      width: 200,
      height: 150,
      position: 'top-right',
      margin: 20,
      showGrid: true,
      gridSize: 50,
      zoom: 1,
      ...config,
    };

    // Calculate scale factors
    this.scaleX = this.config.width / (this.levelWidth / this.config.zoom);
    this.scaleY = this.config.height / (this.levelHeight / this.config.zoom);

    // Create container
    const x = this.calculatePositionX();
    const y = this.calculatePositionY();
    this.container = this.scene.add.container(x, y);

    // Create background
    this.background = this.scene.add.graphics();
    this.background.fillStyle(0x000000, 0.7);
    this.background.lineStyle(2, 0x444444, 1);
    this.background.fillRoundedRect(
      0,
      0,
      this.config.width,
      this.config.height,
      8,
    );
    this.background.strokeRoundedRect(
      0,
      0,
      this.config.width,
      this.config.height,
      8,
    );
    this.container.add(this.background);

    // Create markers layer
    this.markersGraphics = this.scene.add.graphics();
    this.container.add(this.markersGraphics);

    // Set scroll factor to stay on screen
    this.container.setScrollFactor(0, 0);
  }

  /**
   * Calculate X position based on position config.
   */
  private calculatePositionX(): number {
    const { width, position, margin } = this.config;
    const screenWidth = this.scene.cameras.main.width;

    switch (position) {
    case 'top-left':
    case 'bottom-left':
      return margin;
    case 'top-right':
    case 'bottom-right':
      return screenWidth - width - margin;
    }
  }

  /**
   * Calculate Y position based on position config.
   */
  private calculatePositionY(): number {
    const { height, position, margin } = this.config;
    const screenHeight = this.scene.cameras.main.height;

    switch (position) {
    case 'top-left':
    case 'top-right':
      return margin;
    case 'bottom-left':
    case 'bottom-right':
      return screenHeight - height - margin;
    }
  }

  /**
   * Register a marker to display on minimap.
   * @param id Unique marker ID (typically gameObject ID).
   * @param type Marker type.
   */
  registerMarker(id: string, type: MarkerType): void {
    this.markers.set(id, type);
  }

  /**
   * Unregister a marker from minimap.
   * @param id Marker ID to unregister.
   */
  unregisterMarker(id: string): void {
    this.markers.delete(id);
  }

  /**
   * Set minimap position.
   * @param position Position type.
   */
  setPosition(position: MinimapConfig['position']): void {
    this.config.position = position;
    this.container.x = this.calculatePositionX();
    this.container.y = this.calculatePositionY();
  }

  /**
   * Update minimap display.
   * @param player The player object.
   * @param enemies Array of enemies.
   * @param items Array of items.
   * @param exitPosition Optional exit/goal position.
   */
  update(
    player: { x: number; y: number; id: string } | null,
    enemies: Array<{ x: number; y: number; id: string; active: boolean }> = [],
    items: Array<{ x: number; y: number; id: string; active: boolean }> = [],
    exitPosition?: { x: number; y: number },
  ): void {
    // Clear previous markers
    this.markersGraphics.clear();

    // Draw grid if enabled
    if (this.config.showGrid) {
      this.drawGrid();
    }

    // Draw exit/goal
    if (exitPosition) {
      const exitX = this.mapX(exitPosition.x);
      const exitY = this.mapY(exitPosition.y);
      this.drawMarkerMarker(exitX, exitY, MarkerType.EXIT, 10);
    }

    // Draw items
    for (const item of items) {
      if (!item.active) continue;
      const markerType = this.markers.get(item.id) || MarkerType.ITEM;
      const itemX = this.mapX(item.x);
      const itemY = this.mapY(item.y);
      this.drawMarkerMarker(itemX, itemY, markerType, 4);
    }

    // Draw enemies
    for (const enemy of enemies) {
      const markerType = this.markers.get(enemy.id) || MarkerType.ENEMY;
      const enemyX = this.mapX(enemy.x);
      const enemyY = this.mapY(enemy.y);
      this.drawMarkerMarker(enemyX, enemyY, markerType, 5);
    }

    // Draw player
    if (player) {
      const playerX = this.mapX(player.x);
      const playerY = this.mapY(player.y);

      // Draw player indicator (larger, distinct color)
      this.markersGraphics.fillStyle(0x00ff00, 0.9);
      this.markersGraphics.fillCircle(playerX, playerY, 8);
      this.markersGraphics.lineStyle(2, 0xffffff, 1);
      this.markersGraphics.strokeCircle(playerX, playerY, 8);

      // Draw view direction indicator
      this.markersGraphics.lineStyle(2, 0x00ff00, 0.8);
      this.markersGraphics.beginPath();
      this.markersGraphics.moveTo(playerX, playerY);
      this.markersGraphics.lineTo(playerX, playerY - 12);
      this.markersGraphics.strokePath();
    }
  }

  /**
   * Map world X to minimap X.
   */
  private mapX(worldX: number): number {
    return worldX * this.scaleX;
  }

  /**
   * Map world Y to minimap Y.
   */
  private mapY(worldY: number): number {
    return worldY * this.scaleY;
  }

  /**
   * Draw a marker on the minimap.
   */
  private drawMarkerMarker(
    x: number,
    y: number,
    type: MarkerType,
    radius: number,
  ): void {
    let color = 0xffffff;
    let alpha = 0.7;

    switch (type) {
    case MarkerType.PLAYER:
      color = 0x00ff00;
      alpha = 1;
      break;
    case MarkerType.ENEMY:
      color = 0xff0000;
      break;
    case MarkerType.ITEM:
      color = 0xffff00;
      break;
    case MarkerType.EXIT:
      color = 0x00ffff;
      alpha = 0.9;
      break;
    case MarkerType.CHECKPOINT:
      color = 0xff8800;
      break;
    }

    this.markersGraphics.fillStyle(color, alpha);
    this.markersGraphics.fillCircle(x, y, radius);
  }

  /**
   * Draw grid lines.
   */
  private drawGrid(): void {
    const { width, height, gridSize } = this.config;
    const scaledGridSize = gridSize * this.scaleX;

    this.markersGraphics.lineStyle(1, 0x333333, 0.5);

    // Vertical lines
    for (let x = 0; x <= width; x += scaledGridSize) {
      this.markersGraphics.beginPath();
      this.markersGraphics.moveTo(x, 0);
      this.markersGraphics.lineTo(x, height);
      this.markersGraphics.strokePath();
    }

    // Horizontal lines
    for (
      let y = 0;
      y <= height;
      y += scaledGridSize * (this.scaleX / this.scaleY)
    ) {
      this.markersGraphics.beginPath();
      this.markersGraphics.moveTo(0, y);
      this.markersGraphics.lineTo(width, y);
      this.markersGraphics.strokePath();
    }
  }

  /**
   * Show minimap.
   */
  show(): void {
    this.container.setVisible(true);
  }

  /**
   * Hide minimap.
   */
  hide(): void {
    this.container.setVisible(false);
  }

  /**
   * Toggle minimap visibility.
   */
  toggle(): void {
    this.container.visible = !this.container.visible;
  }

  /**
   * Resize minimap.
   * @param width New width.
   * @param height New height.
   */
  resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;

    // Recalculate scale factors
    this.scaleX = width / (this.levelWidth / this.config.zoom);
    this.scaleY = height / (this.levelHeight / this.config.zoom);

    // Recreate background
    this.background.clear();
    this.background.fillStyle(0x000000, 0.7);
    this.background.lineStyle(2, 0x444444, 1);
    this.background.fillRoundedRect(0, 0, width, height, 8);
    this.background.strokeRoundedRect(0, 0, width, height, 8);
  }

  /**
   * Update level dimensions (useful for level transitions).
   * @param width New level width.
   * @param height New level height.
   */
  updateLevelSize(width: number, height: number): void {
    this.levelWidth = width;
    this.levelHeight = height;

    // Recalculate scale factors
    this.scaleX = this.config.width / (width / this.config.zoom);
    this.scaleY = this.config.height / (height / this.config.zoom);
  }

  /**
   * Destroy minimap and clean up.
   */
  destroy(): void {
    this.markers.clear();
    this.markersGraphics.destroy();
    this.background.destroy();
    this.container.destroy();
  }
}
