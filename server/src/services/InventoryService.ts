import { DataSource } from 'typeorm';
import { InventoryRepository } from '../persistence/repositories/InventoryRepository';
import { logger } from '../utils/logger';

/**
 * Service for managing player inventory operations.
 * Handles item acquisition, removal, transfer, and querying.
 */
export class InventoryService {
  /**
   * Creates a new InventoryService instance.
   * @param dataSource - The TypeORM data source for database transactions.
   * @param inventoryRepo - The inventory repository for data access.
   */
  constructor(
    private dataSource: DataSource,
    private inventoryRepo: InventoryRepository,
  ) {}

  /**
   * Retrieves all items in a player's inventory.
   * @param playerId - The unique identifier of the player.
   * @returns Promise resolving to an array of inventory items with itemId, quantity, metadata, and acquiredAt.
   */
  async getInventory(playerId: string): Promise<any[]> {
    const items = await this.inventoryRepo.findByPlayerId(playerId);
    return items.map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      metadata: item.metadata,
      acquiredAt: item.acquiredAt,
    }));
  }

  /**
   * Adds an item to a player's inventory.
   * @param playerId - The unique identifier of the player.
   * @param itemId - The unique identifier of the item to add.
   * @param quantity - The quantity of the item to add (default: 1).
   * @param metadata - Optional metadata to attach to the item.
   * @returns Promise resolving to true if successful, false otherwise.
   */
  async addItem(
    playerId: string,
    itemId: string,
    quantity: number = 1,
    metadata?: any,
  ): Promise<boolean> {
    try {
      await this.inventoryRepo.addItem(playerId, itemId, quantity, metadata);
      logger.info(`Added item ${itemId} x${quantity} to player ${playerId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to add item: ${error}`);
      return false;
    }
  }

  /**
   * Removes an item from a player's inventory.
   * @param playerId - The unique identifier of the player.
   * @param itemId - The unique identifier of the item to remove.
   * @param quantity - The quantity of the item to remove (default: 1).
   * @returns Promise resolving to true if successful, false otherwise.
   */
  async removeItem(
    playerId: string,
    itemId: string,
    quantity: number = 1,
  ): Promise<boolean> {
    try {
      const success = await this.inventoryRepo.removeItem(
        playerId,
        itemId,
        quantity,
      );
      if (success) {
        logger.info(
          `Removed item ${itemId} x${quantity} from player ${playerId}`,
        );
      } else {
        logger.warn(`Item ${itemId} not found in player ${playerId} inventory`);
      }
      return success;
    } catch (error) {
      logger.error(`Failed to remove item: ${error}`);
      return false;
    }
  }

  /**
   * Transfers an item from one player to another.
   * @param fromPlayerId - The source player's unique identifier.
   * @param toPlayerId - The destination player's unique identifier.
   * @param itemId - The unique identifier of the item to transfer.
   * @param quantity - The quantity of the item to transfer (default: 1).
   * @returns Promise resolving to true if successful, false otherwise.
   * @throws Error if the source player doesn't have enough items.
   */
  async transferItem(
    fromPlayerId: string,
    toPlayerId: string,
    itemId: string,
    quantity: number = 1,
  ): Promise<boolean> {
    return this.dataSource
      .transaction(async (_manager) => {
        // Use the injected repository instance for both operations
        const removed = await this.inventoryRepo.removeItem(
          fromPlayerId,
          itemId,
          quantity,
        );
        if (!removed) {
          throw new Error('Source player does not have enough items');
        }
        await this.inventoryRepo.addItem(
          toPlayerId,
          itemId,
          quantity,
          undefined,
        );
        logger.info(
          `Transferred item ${itemId} x${quantity} from ${fromPlayerId} to ${toPlayerId}`,
        );
        return true;
      })
      .catch((error) => {
        logger.error(`Transfer failed: ${error}`);
        return false;
      });
  }

  /**
   * Gets the quantity of a specific item in a player's inventory.
   * @param playerId - The unique identifier of the player.
   * @param itemId - The unique identifier of the item.
   * @returns Promise resolving to the quantity of the item (0 if not found).
   */
  async getItemCount(playerId: string, itemId: string): Promise<number> {
    const item = await this.inventoryRepo.findByItemId(playerId, itemId);
    return item?.quantity || 0;
  }

  /**
   * Gets the total count of all items in a player's inventory.
   * @param playerId - The unique identifier of the player.
   * @returns Promise resolving to the total item count.
   */
  async getTotalItemCount(playerId: string): Promise<number> {
    return this.inventoryRepo.getTotalItemCount(playerId);
  }
}
