import { DataSource } from 'typeorm';
import { BaseRepository } from './BaseRepository';
import { Inventory } from '../models/Inventory';

export class InventoryRepository extends BaseRepository<Inventory> {
  constructor(dataSource: DataSource) {
    super(dataSource, Inventory);
  }

  async findByPlayerId(playerId: string): Promise<Inventory[]> {
    return this.safeOperation(
      this.find({ where: { playerId } }),
      `Failed to find inventory items by playerId: ${playerId}`,
    );
  }

  async findByItemId(
    playerId: string,
    itemId: string,
  ): Promise<Inventory | null> {
    return this.safeOperation(
      this.findOne({ where: { playerId, itemId } }),
      'Failed to find inventory item',
    );
  }

  async addItem(
    playerId: string,
    itemId: string,
    quantity: number = 1,
    metadata?: any,
  ): Promise<Inventory> {
    const existing = await this.findByItemId(playerId, itemId);
    if (existing) {
      existing.quantity += quantity;
      if (metadata) {
        existing.metadata = { ...existing.metadata, ...metadata };
      }
      return this.safeOperation(
        this.save(existing),
        'Failed to update inventory item',
      );
    } else {
      const item = this.create({
        playerId,
        itemId,
        quantity,
        metadata,
        acquiredAt: new Date(),
      });
      return this.safeOperation(
        this.save(item),
        'Failed to add inventory item',
      );
    }
  }

  async removeItem(
    playerId: string,
    itemId: string,
    quantity: number = 1,
  ): Promise<boolean> {
    const item = await this.findByItemId(playerId, itemId);
    if (!item) {
      return false;
    }
    if (item.quantity <= quantity) {
      await this.safeOperation(
        this.delete({ playerId, itemId }),
        'Failed to delete inventory item',
      );
      return true;
    } else {
      item.quantity -= quantity;
      await this.safeOperation(
        this.save(item),
        'Failed to update inventory item quantity',
      );
      return true;
    }
  }

  async getTotalItemCount(playerId: string): Promise<number> {
    const result = await this.safeOperation(
      this.createQueryBuilder('inventory')
        .select('SUM(inventory.quantity)', 'total')
        .where('inventory.player_id = :playerId', { playerId })
        .getRawOne(),
      'Failed to get total item count',
    );
    return parseInt(result?.total || '0', 10);
  }
}
