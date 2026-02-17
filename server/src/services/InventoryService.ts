import { DataSource } from 'typeorm';
import { InventoryRepository } from '../persistence/repositories/InventoryRepository';
import { logger } from '../utils/logger';

/**
 * Service for managing player inventory operations.
 */
export class InventoryService {
  constructor(
    private dataSource: DataSource,
    private inventoryRepo: InventoryRepository
  ) {}

  async getInventory(playerId: string): Promise<any[]> {
    const items = await this.inventoryRepo.findByPlayerId(playerId);
    return items.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      metadata: item.metadata,
      acquiredAt: item.acquiredAt,
    }));
  }

  async addItem(playerId: string, itemId: string, quantity: number = 1, metadata?: any): Promise<boolean> {
    try {
      await this.inventoryRepo.addItem(playerId, itemId, quantity, metadata);
      logger.info(`Added item ${itemId} x${quantity} to player ${playerId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to add item: ${error}`);
      return false;
    }
  }

  async removeItem(playerId: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      const success = await this.inventoryRepo.removeItem(playerId, itemId, quantity);
      if (success) {
        logger.info(`Removed item ${itemId} x${quantity} from player ${playerId}`);
      } else {
        logger.warn(`Item ${itemId} not found in player ${playerId} inventory`);
      }
      return success;
    } catch (error) {
      logger.error(`Failed to remove item: ${error}`);
      return false;
    }
  }

  async transferItem(fromPlayerId: string, toPlayerId: string, itemId: string, quantity: number = 1): Promise<boolean> {
    return this.dataSource.transaction(async (_manager) => {
      const fromRepo = new InventoryRepository(this.dataSource);
      const toRepo = new InventoryRepository(this.dataSource);
      const removed = await fromRepo.removeItem(fromPlayerId, itemId, quantity);
      if (!removed) {
        throw new Error('Source player does not have enough items');
      }
      await toRepo.addItem(toPlayerId, itemId, quantity);
      logger.info(`Transferred item ${itemId} x${quantity} from ${fromPlayerId} to ${toPlayerId}`);
      return true;
    }).catch(error => {
      logger.error(`Transfer failed: ${error}`);
      return false;
    });
  }

  async getItemCount(playerId: string, itemId: string): Promise<number> {
    const item = await this.inventoryRepo.findByItemId(playerId, itemId);
    return item?.quantity || 0;
  }

  async getTotalItemCount(playerId: string): Promise<number> {
    return this.inventoryRepo.getTotalItemCount(playerId);
  }
}