import { logger } from '../utils/logger';
import { Scene } from "phaser";
import { LevelConfig } from "./LevelManager";

export interface LoadedTilemapData {
  layers: {
    ground?: Phaser.Tilemaps.TilemapLayer;
    platforms?: Phaser.Tilemaps.ObjectLayer;
    enemies?: Phaser.Tilemaps.ObjectLayer;
    items?: Phaser.Tilemaps.ObjectLayer;
    player?: Phaser.Tilemaps.ObjectLayer;
  };
  objects: {
    platforms: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      properties?: any;
    }>;
    enemies: Array<{ x: number; y: number; type: string }>;
    items: Array<{ x: number; y: number; type: string }>;
    playerSpawn?: { x: number; y: number };
  };
}

export class TilemapLoader {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public loadTilemap(key: string, tilemapPath: string): void {
    this.scene.load.tilemapTiledJSON(key, tilemapPath);
  }

  public createFromTilemap(key: string): LoadedTilemapData | null {
    const map = this.scene.make.tilemap({ key });
    if (!map) {
      logger.error(`Failed to load tilemap: ${key}`);
      return null;
    }

    const result: LoadedTilemapData = {
      layers: {},
      objects: {
        platforms: [],
        enemies: [],
        items: [],
      },
    };

    // Load tilesets
    const tilesets: Phaser.Tilemaps.Tileset[] = [];
    map.tilesets.forEach((tilesetData, index) => {
      const tileset = map.addTilesetImage(
        tilesetData.name,
        tilesetData.name,
        tilesetData.tileWidth,
        tilesetData.tileHeight,
        0,
        0,
      );
      if (tileset) {
        tilesets.push(tileset);
      }
    });

    // Process layers
    map.layers.forEach((layerData) => {
      if (layerData.tilemapLayer) {
        const layer = map.createLayer(layerData.name, tilesets, 0, 0);
        if (layer) {
          layer.setCollisionByProperty({ collides: true });
          result.layers.ground = layer;
        }
      }
    });

    // Process object layers
    map.objects.forEach((objectLayer) => {
      const layerName = objectLayer.name.toLowerCase();

      if (layerName === "platforms") {
        objectLayer.objects.forEach((obj) => {
          result.objects.platforms.push({
            x: obj.x ?? 0,
            y: obj.y ?? 0,
            width: obj.width ?? 32,
            height: obj.height ?? 32,
            properties: obj.properties,
          });
        });
        result.layers.platforms = objectLayer;
      } else if (layerName === "enemies") {
        objectLayer.objects.forEach((obj) => {
          result.objects.enemies.push({
            x: obj.x ?? 0,
            y: obj.y ?? 0,
            type: obj.type || "slime",
          });
        });
        result.layers.enemies = objectLayer;
      } else if (layerName === "items") {
        objectLayer.objects.forEach((obj) => {
          result.objects.items.push({
            x: obj.x ?? 0,
            y: obj.y ?? 0,
            type: obj.type || "coin",
          });
        });
        result.layers.items = objectLayer;
      } else if (layerName === "player") {
        const spawnObj = objectLayer.objects.find(
          (obj) => obj.type === "spawn",
        );
        if (spawnObj) {
          result.objects.playerSpawn = {
            x: spawnObj.x ?? 100,
            y: spawnObj.y ?? 300,
          };
        }
        result.layers.player = objectLayer;
      }
    });

    return result;
  }

  public loadLevelFromJSON(levelConfig: LevelConfig): LoadedTilemapData | null {
    return this.createFromTilemap(levelConfig.key);
  }

  public preloadLevelAssets(levelConfig: LevelConfig): void {
    // Preload any additional assets needed for the level
    if (levelConfig.tilemap) {
      this.loadTilemap(levelConfig.key, levelConfig.tilemap);
    }
  }
}
