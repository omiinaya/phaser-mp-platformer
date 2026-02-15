import { logger } from '../utils/logger';
/**
 * Save data structure for comprehensive game state persistence.
 */
export interface SaveData {
  /** Version of the save file format. */
  version: string;
  /** Timestamp when the save was created. */
  timestamp: number;

  /** Player progress data. */
  player: {
    /** Current health. */
    health: number;
    /** Maximum health. */
    maxHealth: number;
    /** Player's current level number. */
    currentLevel: number;
    /** Unlocked levels (by level number). */
    unlockedLevels: number[];
    /** Total score accumulated. */
    totalScore: number;
    /** Total coins collected. */
    totalCoins: number;
    /** Total enemies defeated. */
    totalEnemiesDefeated: number;
  };

  /** Level-specific data. */
  levels: {
    [levelNumber: number]: {
      /** Highest score achieved on this level. */
      highScore: number;
      /** Whether the level is completed. */
      completed: boolean;
      /** Best time (in seconds) for completion. */
      bestTime?: number;
      /** Checkpoint reached (0 for start, 1-N for checkpoints). */
      lastCheckpoint: number;
    };
  };

  /** Last known position for respawn or continue. */
  lastPosition?: {
    /** Level number. */
    level: number;
    /** X position. */
    x: number;
    /** Y position. */
    y: number;
  };

  /** Optional settings data. */
  settings?: {
    /** Audio volume (0-100). */
    musicVolume: number;
    /** Sound effects volume (0-100). */
    sfxVolume: number;
    /** Whether music is enabled. */
    musicEnabled: boolean;
    /** Whether sound effects are enabled. */
    sfxEnabled: boolean;
  };
}

/**
 * Save slot information for save game UI.
 */
export interface SaveSlot {
  /** Slot index (0-4). */
  index: number;
  /** Whether this slot contains a save. */
  exists: boolean;
  /** Save data (if slot exists). */
  data?: SaveData;
  /** Last played level name (for UI display). */
  levelName?: string;
  /** Formatted timestamp for UI display. */
  timestamp?: string;
}

/**
 * Manages game save/load functionality using LocalStorage.
 * Supports multiple save slots and auto-save functionality.
 */
export class SaveManager {
  /** Maximum number of save slots. */
  private static readonly MAX_SLOTS = 5;

  /** Current save version for migration. */
  private static readonly CURRENT_VERSION = "1.0.0";

  /** Key prefix for LocalStorage keys. */
  private static readonly STORAGE_PREFIX = "phaser_platformer_";

  /** Auto-save enabled flag. */
  private autoSaveEnabled: boolean;

  /** Auto-save interval in milliseconds. */
  private autoSaveInterval: number;

  /** Auto-save timer reference. */
  private autoSaveTimer?: Phaser.Time.TimerEvent;

  /** Scene reference for auto-save timer. */
  private scene?: Phaser.Scene;

  /** Encryption key for save data. In production, this should be from a secure source. */
  private static readonly ENCRYPTION_KEY = "PhaserPlatformerSaveKey2024!";

  /**
   * Encrypt data using XOR encryption.
   * @param data Data to encrypt.
   * @returns Encrypted base64 string.
   */
  private static encryptData(data: string): string {
    let encrypted = "";
    const key = SaveManager.ENCRYPTION_KEY;
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    return btoa(encrypted);
  }

  /**
   * Decrypt data using XOR decryption.
   * @param encryptedData Encrypted base64 string.
   * @returns Decrypted string.
   */
  private static decryptData(encryptedData: string): string {
    try {
      const decoded = atob(encryptedData);
      let decrypted = "";
      const key = SaveManager.ENCRYPTION_KEY;
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(charCode);
      }
      return decrypted;
    } catch (error) {
      logger.error("Failed to decrypt save data:", error);
      return "";
    }
  }

  /**
   * Creates an instance of SaveManager.
   * @param scene Optional scene reference for auto-save timer.
   * @param autoSave Whether auto-save is enabled (defaults to true).
   * @param autoSaveIntervalMs Auto-save interval in milliseconds (defaults to 60000ms = 1 minute).
   */
  constructor(
    scene?: Phaser.Scene,
    autoSave: boolean = true,
    autoSaveIntervalMs: number = 60000,
  ) {
    this.scene = scene;
    this.autoSaveEnabled = autoSave;
    this.autoSaveInterval = autoSaveIntervalMs;

    if (this.scene && this.autoSaveEnabled) {
      this.startAutoSave();
    }
  }

  /**
   * Get the LocalStorage key for a specific save slot.
   */
  private getSlotKey(slotIndex: number): string {
    return `${SaveManager.STORAGE_PREFIX}save_${slotIndex}`;
  }

  /**
   * Get the LocalStorage key for auto-save data.
   */
  private getAutoSaveKey(): string {
    return `${SaveManager.STORAGE_PREFIX}autosave`;
  }

  /**
   * Create a new empty save data structure.
   */
  private createEmptySaveData(): SaveData {
    return {
      version: SaveManager.CURRENT_VERSION,
      timestamp: Date.now(),
      player: {
        health: 20,
        maxHealth: 20,
        currentLevel: 1,
        unlockedLevels: [1],
        totalScore: 0,
        totalCoins: 0,
        totalEnemiesDefeated: 0,
      },
      levels: {},
      settings: {
        musicVolume: 100,
        sfxVolume: 100,
        musicEnabled: true,
        sfxEnabled: true,
      },
    };
  }

  /**
   * Check if a specific save slot exists.
   * @param slotIndex Save slot index (0-4).
   * @returns True if the slot contains a save.
   */
  hasSave(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= SaveManager.MAX_SLOTS) {
      return false;
    }

    const key = this.getSlotKey(slotIndex);
    const data = localStorage.getItem(key);
    return data !== null && data !== "";
  }

  /**
   * Check if auto-save data exists.
   * @returns True if auto-save exists.
   */
  hasAutoSave(): boolean {
    const key = this.getAutoSaveKey();
    const data = localStorage.getItem(key);
    return data !== null && data !== "";
  }

  /**
   * Save game data to a specific slot.
   * @param slotIndex Save slot index (0-4).
   * @param data The save data to store.
   * @returns True if the save was successful.
   */
  saveGame(slotIndex: number, data: Partial<SaveData>): boolean {
    if (slotIndex < 0 || slotIndex >= SaveManager.MAX_SLOTS) {
      logger.error(`Invalid save slot index: ${slotIndex}`);
      return false;
    }

    // Get existing data and merge with new data
    const existingData = this.loadGame(slotIndex);
    const saveData: SaveData = {
      ...this.createEmptySaveData(),
      ...existingData,
      ...data,
      timestamp: Date.now(),
      version: SaveManager.CURRENT_VERSION,
    };

    const key = this.getSlotKey(slotIndex);
    try {
      const encrypted = SaveManager.encryptData(JSON.stringify(saveData));
      localStorage.setItem(key, encrypted);
      logger.info(`Game saved to slot ${slotIndex} (encrypted)`);
      return true;
    } catch (error) {
      logger.error(`Failed to save game to slot ${slotIndex}:`, error);
      return false;
    }
  }

  /**
   * Save as auto-save (separate slot).
   * @param data The save data to store.
   * @returns True if the save was successful.
   */
  saveAutoGame(data: Partial<SaveData>): boolean {
    const existingData = this.loadAutoGame();
    const saveData: SaveData = {
      ...this.createEmptySaveData(),
      ...existingData,
      ...data,
      timestamp: Date.now(),
      version: SaveManager.CURRENT_VERSION,
    };

    const key = this.getAutoSaveKey();
    try {
      const encrypted = SaveManager.encryptData(JSON.stringify(saveData));
      localStorage.setItem(key, encrypted);
      logger.info("Auto-save completed (encrypted)");
      return true;
    } catch (error) {
      logger.error("Failed to create auto-save:", error);
      return false;
    }
  }

  /**
   * Load game data from a specific slot (async version).
   * @param slotIndex Save slot index (0-4).
   * @returns The save data, or undefined if slot is empty or invalid.
   */
  async loadGameAsync(slotIndex: number): Promise<SaveData | undefined> {
    return Promise.resolve(this.loadGame(slotIndex));
  }

  /**
   * Load game data from a specific slot.
   * @param slotIndex Save slot index (0-4).
   * @returns The save data, or undefined if slot is empty or invalid.
   */
  loadGame(slotIndex: number): SaveData | undefined {
    if (slotIndex < 0 || slotIndex >= SaveManager.MAX_SLOTS) {
      logger.error(`Invalid save slot index: ${slotIndex}`);
      return undefined;
    }

    const key = this.getSlotKey(slotIndex);
    const data = localStorage.getItem(key);

    if (!data) {
      return undefined;
    }

    try {
      const decrypted = SaveManager.decryptData(data);
      if (!decrypted) {
        logger.error(`Failed to decrypt game data from slot ${slotIndex}`);
        return undefined;
      }
      const saveData: SaveData = JSON.parse(decrypted);
      // Migrate save data if needed (version check)
      return this.migrateSaveData(saveData);
    } catch (error) {
      logger.error(`Failed to load game from slot ${slotIndex}:`, error);
      return undefined;
    }
  }

  /**
   * Load auto-save data (async version).
   * @returns The save data, or undefined if no auto-save exists.
   */
  async loadAutoGameAsync(): Promise<SaveData | undefined> {
    return Promise.resolve(this.loadAutoGame());
  }

  /**
   * Load auto-save data.
   * @returns The save data, or undefined if no auto-save exists.
   */
  loadAutoGame(): SaveData | undefined {
    const key = this.getAutoSaveKey();
    const data = localStorage.getItem(key);

    if (!data) {
      return undefined;
    }

    try {
      const decrypted = SaveManager.decryptData(data);
      if (!decrypted) {
        logger.error("Failed to decrypt auto-save data");
        return undefined;
      }
      const saveData: SaveData = JSON.parse(decrypted);
      return this.migrateSaveData(saveData);
    } catch (error) {
      logger.error("Failed to load auto-save:", error);
      return undefined;
    }
  }

  /**
   * Delete a save game from a specific slot.
   * @param slotIndex Save slot index (0-4).
   * @returns True if the deletion was successful.
   */
  deleteSave(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= SaveManager.MAX_SLOTS) {
      logger.error(`Invalid save slot index: ${slotIndex}`);
      return false;
    }

    const key = this.getSlotKey(slotIndex);
    try {
      localStorage.removeItem(key);
      logger.info(`Save deleted from slot ${slotIndex}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete save from slot ${slotIndex}:`, error);
      return false;
    }
  }

  /**
   * Get information about all save slots.
   * @returns Array of save slot information.
   */
  getSaveSlots(): SaveSlot[] {
    const slots: SaveSlot[] = [];

    for (let i = 0; i < SaveManager.MAX_SLOTS; i++) {
      const exists = this.hasSave(i);
      const slot: SaveSlot = {
        index: i,
        exists,
      };

      if (exists) {
        const data = this.loadGame(i);
        if (data) {
          slot.data = data;
          slot.timestamp = new Date(data.timestamp).toLocaleString();
          slot.levelName = `Level ${data.player.currentLevel}`;
        }
      }

      slots.push(slot);
    }

    return slots;
  }

  /**
   * Get formatted auto-save info.
   * @returns Save slot info for auto-save, or null if no auto-save exists.
   */
  getAutoSaveInfo(): SaveSlot | null {
    if (!this.hasAutoSave()) {
      return null;
    }

    const data = this.loadAutoGame();
    if (!data) {
      return null;
    }

    return {
      index: -1, // -1 indicates auto-save
      exists: true,
      data,
      timestamp: new Date(data.timestamp).toLocaleString(),
      levelName: `Level ${data.player.currentLevel}`,
    };
  }

  /**
   * Start auto-save timer.
   */
  startAutoSave(): void {
    if (!this.scene || !this.autoSaveEnabled) {
      return;
    }

    this.stopAutoSave();

    this.autoSaveTimer = this.scene.time.addEvent({
      delay: this.autoSaveInterval,
      callback: () => {
        if (this.scene) {
          // Emit event so GameScene can provide data
          this.scene.events.emit("save:autosave");
        }
      },
      loop: true,
    });

    logger.info("Auto-save timer started");
  }

  /**
   * Stop auto-save timer.
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      this.autoSaveTimer.remove();
      this.autoSaveTimer = undefined;
      logger.info("Auto-save timer stopped");
    }
  }

  /**
   * Set whether auto-save is enabled.
   */
  setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    if (enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }

  /**
   * Check if auto-save is enabled.
   */
  isAutoSaveEnabled(): boolean {
    return this.autoSaveEnabled;
  }

  /**
   * Migrate save data from older versions.
   * @param data The save data to migrate.
   * @returns The migrated save data.
   */
  private migrateSaveData(data: SaveData): SaveData {
    // Handle version migrations here
    // For now, just ensure required fields exist
    const migrated = { ...data };

    // Ensure settings exists
    if (!migrated.settings) {
      migrated.settings = {
        musicVolume: 100,
        sfxVolume: 100,
        musicEnabled: true,
        sfxEnabled: true,
      };
    }

    // Ensure levels object exists
    if (!migrated.levels) {
      migrated.levels = {};
    }

    return migrated;
  }

  /**
   * Create a quick save capture from current game state.
   * Call this before level transitions, death, checkpoints, etc.
   * @param currentLevel Current level number.
   * @param playerHealth Player's current health.
   * @param playerMaxHealth Player's max health.
   * @param score Current score.
   * @param coins Coin count.
   * @param checkpoint Checkpoint number (0 for start).
   * @returns Save data object ready to be saved.
   */
  createCheckpointData({
    currentLevel,
    playerHealth,
    playerMaxHealth,
    score,
    coins,
    checkpoint = 0,
  }: {
    currentLevel: number;
    playerHealth: number;
    playerMaxHealth: number;
    score: number;
    coins: number;
    checkpoint?: number;
  }): Partial<SaveData> {
    return {
      player: {
        health: playerHealth,
        maxHealth: playerMaxHealth,
        currentLevel,
        unlockedLevels: [], // This should be loaded from existing save
        totalScore: score,
        totalCoins: coins,
        totalEnemiesDefeated: 0,
      },
      levels: {
        [currentLevel]: {
          highScore: score,
          completed: false,
          lastCheckpoint: checkpoint,
        },
      },
      lastPosition: {
        level: currentLevel,
        x: 0,
        y: 0,
      },
    };
  }

  /**
   * Merge player progress (stats, unlocks) with existing save.
   * Used when loading player data from save but keeping gameplay state intact.
   * @param playerData Player data to merge.
   * @returns Merged save data.
   */
  mergePlayerProgress(playerData: SaveData["player"]): Partial<SaveData> {
    return {
      player: playerData,
    };
  }

  /**
   * Clear all save data (useful for testing/reset).
   */
  clearAllSaves(): void {
    for (let i = 0; i < SaveManager.MAX_SLOTS; i++) {
      const key = this.getSlotKey(i);
      localStorage.removeItem(key);
    }
    localStorage.removeItem(this.getAutoSaveKey());
    logger.info("All save data cleared");
  }

  /**
   * Destroy the save manager and clean up.
   */
  destroy(): void {
    this.stopAutoSave();
    this.scene = undefined;
  }
}
