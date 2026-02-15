import { Item } from './Item';

/**
 * Represents a slot in the inventory.
 * Can hold a single item type with a quantity.
 */
export interface InventorySlot {
  /** The item in this slot (undefined if empty). */
  item?: Item;
  /** The quantity of items in this slot. */
  quantity: number;
  /** Maximum quantity this slot can hold (for stackable items). */
  maxQuantity: number;
}

/**
 * Represents an item that can be dropped/removed from inventory.
 */
export interface DroppedItem {
  /** The item being dropped. */
  item: Item;
  /** The quantity being dropped. */
  quantity: number;
  /** The position where the item is dropped. */
  position: { x: number; y: number };
}

/**
 * Player inventory for managing collected items.
 * Supports item stacking with configurable slot limits.
 */
export class Inventory {
  /** Maximum number of slots in the inventory. */
  private maxSlots: number;

  /** The inventory slots. */
  private slots: InventorySlot[];

  /** Scene reference for creating dropped items. */
  private scene?: Phaser.Scene;

  /** Whether the inventory UI is currently visible. */
  private uiVisible: boolean = false;

  /**
   * Creates an instance of Inventory.
   * @param scene The scene this inventory belongs to (optional, for drop functionality).
   * @param maxSlots Maximum number of slots (defaults to 10).
   */
  constructor(scene?: Phaser.Scene, maxSlots: number = 10) {
    this.scene = scene;
    this.maxSlots = maxSlots;
    this.slots = Array.from({ length: maxSlots }, () => ({
      quantity: 0,
      maxQuantity: 99,
    }));
  }

  /**
   * Get the number of slots in the inventory.
   */
  getMaxSlots(): number {
    return this.maxSlots;
  }

  /**
   * Get the number of occupied slots.
   */
  getOccupiedSlots(): number {
    return this.slots.filter((slot) => slot.quantity > 0).length;
  }

  /**
   * Get the number of empty slots.
   */
  getEmptySlots(): number {
    return this.maxSlots - this.getOccupiedSlots();
  }

  /**
   * Get a specific slot by index.
   * @param index Slot index (0 to maxSlots-1).
   * @returns The slot, or undefined if index is invalid.
   */
  getSlot(index: number): InventorySlot | undefined {
    if (index < 0 || index >= this.maxSlots) {
      return undefined;
    }
    return this.slots[index];
  }

  /**
   * Add an item to the inventory.
   * Will try to stack with existing items of the same type.
   * @param item The item to add.
   * @param quantity The quantity to add (defaults to 1).
   * @returns True if the item was successfully added.
   */
  addItem(item: Item, quantity: number = 1): boolean {
    // First, try to find an existing slot with the same item type
    for (let i = 0; i < this.maxSlots; i++) {
      const slot = this.slots[i];
      if (
        slot.item &&
        slot.item.id === item.id &&
        slot.quantity < slot.maxQuantity
      ) {
        // Can stack - add as much as possible to this slot
        const canAdd = Math.min(quantity, slot.maxQuantity - slot.quantity);
        slot.quantity += canAdd;
        quantity -= canAdd;

        if (quantity <= 0) {
          this.emitChange('add', {
            item,
            quantity: 1,
            slotIndex: i,
          });
          return true;
        }
      }
    }

    // If we still have items to add, try to find an empty slot
    while (quantity > 0) {
      const emptySlotIndex = this.slots.findIndex(
        (slot) => slot.quantity === 0,
      );
      if (emptySlotIndex === -1) {
        // No more empty slots - cannot add all items
        this.emitChange('add-failed', { item, quantity });
        return false;
      }

      const slot = this.slots[emptySlotIndex];
      const canAdd = Math.min(quantity, slot.maxQuantity);
      slot.item = item;
      slot.quantity = canAdd;
      quantity -= canAdd;

      this.emitChange('add', {
        item,
        quantity: canAdd,
        slotIndex: emptySlotIndex,
      });
    }

    return true;
  }

  /**
   * Remove a quantity of items from the inventory.
   * @param itemId The ID of the item to remove.
   * @param quantity The quantity to remove (defaults to 1).
   * @returns The number of items actually removed (may be less than requested).
   */
  removeItem(itemId: string, quantity: number = 1): number {
    let removed = 0;

    for (let i = 0; i < this.maxSlots && removed < quantity; i++) {
      const slot = this.slots[i];
      if (slot.item && slot.item.id === itemId && slot.quantity > 0) {
        const canRemove = Math.min(quantity - removed, slot.quantity);
        slot.quantity -= canRemove;
        removed += canRemove;

        if (slot.quantity <= 0) {
          slot.item = undefined;
        }

        this.emitChange('remove', {
          itemId,
          quantity: canRemove,
          slotIndex: i,
        });
      }
    }

    return removed;
  }

  /**
   * Remove all items from a specific slot.
   * @param slotIndex The slot index to clear.
   * @returns True if the slot was cleared.
   */
  clearSlot(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.maxSlots) {
      return false;
    }

    const slot = this.slots[slotIndex];
    if (slot.item) {
      this.emitChange('clear', {
        itemId: slot.item.id,
        quantity: slot.quantity,
        slotIndex,
      });
      slot.item = undefined;
      slot.quantity = 0;
      return true;
    }

    return false;
  }

  /**
   * Drop an item from the inventory at a position.
   * @param slotIndex The slot index to drop from.
   * @param position The position to drop the item at.
   * @param quantity The quantity to drop (defaults to all).
   * @returns The dropped item data, or undefined if failed.
   */
  dropItem(
    slotIndex: number,
    position: { x: number; y: number },
    quantity?: number,
  ): DroppedItem | undefined {
    if (slotIndex < 0 || slotIndex >= this.maxSlots) {
      return undefined;
    }

    const slot = this.slots[slotIndex];
    if (!slot.item || slot.quantity <= 0) {
      return undefined;
    }

    const dropQuantity = quantity
      ? Math.min(quantity, slot.quantity)
      : slot.quantity;
    const item = slot.item;

    slot.quantity -= dropQuantity;
    if (slot.quantity <= 0) {
      slot.item = undefined;
    }

    this.emitChange('drop', {
      itemId: item.id,
      quantity: dropQuantity,
      slotIndex,
      position,
    });

    const droppedItem: DroppedItem = {
      item,
      quantity: dropQuantity,
      position,
    };

    // Create the dropped item in the scene
    if (this.scene) {
      this.createDroppedItemEntity(droppedItem);
    }

    return droppedItem;
  }

  /**
   * Create a dropped item entity in the scene.
   * @param droppedItem The dropped item data.
   */
  private createDroppedItemEntity(droppedItem: DroppedItem): void {
    if (!this.scene) return;

    const { item, quantity, position } = droppedItem;

    // Emit an event so the GameScene or EntityFactory can create
    // the appropriate item type based on the item's ID or config
    this.scene.events.emit('inventory:item-dropped', {
      itemId: item.id,
      config: item.config,
      texture: item.texture.key,
      quantity,
      position,
    });
  }

  /**
   * Check if the inventory contains an item.
   * @param itemId The ID of the item to check for.
   * @param minimumQuantity Minimum quantity required (defaults to 1).
   * @returns True if the inventory contains at least the specified quantity.
   */
  hasItem(itemId: string, minimumQuantity: number = 1): boolean {
    let total = 0;
    for (const slot of this.slots) {
      if (slot.item && slot.item.id === itemId) {
        total += slot.quantity;
        if (total >= minimumQuantity) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get the total quantity of a specific item in the inventory.
   * @param itemId The ID of the item to count.
   * @returns Total quantity of the item across all slots.
   */
  getItemQuantity(itemId: string): number {
    let total = 0;
    for (const slot of this.slots) {
      if (slot.item && slot.item.id === itemId) {
        total += slot.quantity;
      }
    }
    return total;
  }

  /**
   * Get all unique item IDs in the inventory.
   * @returns Array of unique item IDs.
   */
  getAllItemIds(): string[] {
    const ids = new Set<string>();
    for (const slot of this.slots) {
      if (slot.item) {
        ids.add(slot.item.id);
      }
    }
    return Array.from(ids);
  }

  /**
   * Get all items with their quantities.
   * @returns Array of slot data.
   */
  getAllInventoryData(): InventorySlot[] {
    return this.slots.map((slot) => ({
      item: slot.item,
      quantity: slot.quantity,
      maxQuantity: slot.maxQuantity,
    }));
  }

  /**
   * Swap items between two slots.
   * @param slotIndex1 First slot index.
   * @param slotIndex2 Second slot index.
   * @returns True if the swap was successful.
   */
  swapSlots(slotIndex1: number, slotIndex2: number): boolean {
    if (
      slotIndex1 < 0 ||
      slotIndex1 >= this.maxSlots ||
      slotIndex2 < 0 ||
      slotIndex2 >= this.maxSlots ||
      slotIndex1 === slotIndex2
    ) {
      return false;
    }

    const temp = this.slots[slotIndex1];
    this.slots[slotIndex1] = this.slots[slotIndex2];
    this.slots[slotIndex2] = temp;

    this.emitChange('swap', {
      slotIndex1,
      slotIndex2,
    });

    return true;
  }

  /**
   * Show the inventory UI.
   */
  showUI(): void {
    this.uiVisible = true;
    this.emitChange('ui-show', {});
  }

  /**
   * Hide the inventory UI.
   */
  hideUI(): void {
    this.uiVisible = false;
    this.emitChange('ui-hide', {});
  }

  /**
   * Toggle the inventory UI visibility.
   */
  toggleUI(): void {
    if (this.uiVisible) {
      this.hideUI();
    } else {
      this.showUI();
    }
  }

  /**
   * Check if the inventory UI is visible.
   */
  isUIVisible(): boolean {
    return this.uiVisible;
  }

  /**
   * Serialize the inventory data for saving.
   * @returns Serializable inventory data.
   */
  serialize(): any[] {
    return this.slots.map((slot) => ({
      itemId: slot.item?.id,
      quantity: slot.quantity,
    }));
  }

  /**
   * Deserialize inventory data from save.
   * @param data Serialized inventory data.
   * @param getItemById Function to retrieve items by ID.
   */
  deserialize(
    data: any[],
    getItemById: (id: string) => Item | undefined,
  ): void {
    for (let i = 0; i < Math.min(data.length, this.maxSlots); i++) {
      const slotData = data[i];
      if (slotData.itemId && slotData.quantity > 0) {
        const item = getItemById(slotData.itemId);
        if (item) {
          this.slots[i].item = item;
          this.slots[i].quantity = Math.min(
            slotData.quantity,
            this.slots[i].maxQuantity,
          );
        }
      }
    }
  }

  /**
   * Clear all items from the inventory.
   */
  clear(): void {
    for (const slot of this.slots) {
      if (slot.item) {
        this.emitChange('remove', {
          itemId: slot.item.id,
          quantity: slot.quantity,
          cleared: true,
        });
      }
      slot.item = undefined;
      slot.quantity = 0;
    }
  }

  /**
   * Emit an inventory change event.
   * @param type The type of change.
   * @param data The event data.
   */
  private emitChange(type: string, data: any): void {
    if (this.scene) {
      this.scene.events.emit(`inventory:${type}`, data);
    }
  }

  /**
   * Destroy the inventory and clean up resources.
   */
  destroy(): void {
    this.scene = undefined;
    this.slots = [];
  }
}
