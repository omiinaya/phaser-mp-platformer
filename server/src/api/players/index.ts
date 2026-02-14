import { Router } from 'express';
import { AppDataSource } from '../../persistence/database';
import { PlayerProfileRepository } from '../../persistence/repositories/PlayerProfileRepository';
import { PlayerStatsRepository } from '../../persistence/repositories/PlayerStatsRepository';
import { PlayerUnlockRepository } from '../../persistence/repositories/PlayerUnlockRepository';
import { InventoryRepository } from '../../persistence/repositories/InventoryRepository';
import { AchievementProgressRepository } from '../../persistence/repositories/AchievementProgressRepository';
import { ProgressionService } from '../../services/ProgressionService';
import { InventoryService } from '../../services/InventoryService';
import { logger } from '../../utils/logger';

const router: Router = Router();
const dataSource = AppDataSource;

// Input validation helpers
const isValidPlayerId = (id: string): boolean => {
  // Allow UUIDs or alphanumeric IDs (3-50 chars)
  return /^[a-zA-Z0-9_-]{3,50}$/.test(id);
};

const isValidItemId = (id: unknown): boolean => {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,50}$/.test(id);
};

const isValidQuantity = (qty: unknown): boolean => {
  return typeof qty === 'number' && Number.isInteger(qty) && qty > 0 && qty <= 1000;
};

// Middleware to validate playerId param
const validatePlayerId = (req: any, res: any, next: any) => {
  const { playerId } = req.params;
  if (!playerId || !isValidPlayerId(playerId)) {
    logger.warn(`Invalid playerId format: ${playerId}`);
    return res.status(400).json({ error: 'Invalid playerId format' });
  }
  next();
};

// Apply playerId validation to all routes
router.use('/:playerId', validatePlayerId);

const profileRepo = new PlayerProfileRepository(dataSource);
const statsRepo = new PlayerStatsRepository(dataSource);
const unlockRepo = new PlayerUnlockRepository(dataSource);
const inventoryRepo = new InventoryRepository(dataSource);
const achievementProgressRepo = new AchievementProgressRepository(dataSource);

const progressionService = new ProgressionService(
  dataSource,
  profileRepo,
  statsRepo,
  unlockRepo,
  achievementProgressRepo,
  new (require('../../persistence/repositories/UnlockableRepository').UnlockableRepository)(dataSource)
);
const inventoryService = new InventoryService(dataSource, inventoryRepo);

// Get player profile
router.get('/:playerId/profile', async (req, res) => {
  try {
    const profile = await profileRepo.findOne({ where: { id: req.params.playerId } });
    if (!profile) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(profile);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get player stats
router.get('/:playerId/stats', async (req, res) => {
  try {
    const stats = await statsRepo.findByPlayerId(req.params.playerId);
    if (!stats) {
      return res.status(404).json({ error: 'Stats not found' });
    }
    res.json(stats);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update player stats (partial update)
router.patch('/:playerId/stats', async (req, res) => {
  try {
    await progressionService.updateStats(req.params.playerId, req.body);
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get player unlocks
router.get('/:playerId/unlocks', async (req, res) => {
  try {
    const unlocks = await unlockRepo.findByPlayerId(req.params.playerId);
    res.json(unlocks);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grant unlock
router.post('/:playerId/unlocks', async (req, res) => {
  try {
    const { unlockableId } = req.body;
    if (!isValidItemId(unlockableId)) {
      return res.status(400).json({ error: 'Invalid unlockableId' });
    }
    const success = await progressionService.grantUnlock(req.params.playerId, unlockableId);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to grant unlock' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory
router.get('/:playerId/inventory', async (req, res) => {
  try {
    const inventory = await inventoryService.getInventory(req.params.playerId);
    res.json(inventory);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to inventory
router.post('/:playerId/inventory', async (req, res) => {
  try {
    const { itemId, quantity, metadata } = req.body;
    if (!isValidItemId(itemId)) {
      return res.status(400).json({ error: 'Invalid itemId' });
    }
    if (quantity !== undefined && !isValidQuantity(quantity)) {
      return res.status(400).json({ error: 'Invalid quantity (must be 1-1000)' });
    }
    const success = await inventoryService.addItem(req.params.playerId, itemId, quantity, metadata);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to add item' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from inventory
router.delete('/:playerId/inventory', async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    if (!isValidItemId(itemId)) {
      return res.status(400).json({ error: 'Invalid itemId' });
    }
    if (quantity !== undefined && !isValidQuantity(quantity)) {
      return res.status(400).json({ error: 'Invalid quantity (must be 1-1000)' });
    }
    const success = await inventoryService.removeItem(req.params.playerId, itemId, quantity);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get player summary
router.get('/:playerId/summary', async (req, res) => {
  try {
    const summary = await progressionService.getPlayerSummary(req.params.playerId);
    res.json(summary);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;