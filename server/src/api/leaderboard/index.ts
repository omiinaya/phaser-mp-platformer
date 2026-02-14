import { Router } from 'express';
import { AppDataSource } from '../../persistence/database';
import { PlayerStatsRepository } from '../../persistence/repositories/PlayerStatsRepository';
import { PlayerProfileRepository } from '../../persistence/repositories/PlayerProfileRepository';
import { LeaderboardService } from '../../services/LeaderboardService';
import { logger } from '../../utils/logger';

const router: Router = Router();
const dataSource = AppDataSource;

// Input validation helpers
const isValidPlayerId = (id: string): boolean => {
  return /^[a-zA-Z0-9_-]{3,50}$/.test(id);
};

const isValidLimit = (limit: unknown): boolean => {
  const parsed = parseInt(limit as string);
  return !isNaN(parsed) && parsed > 0 && parsed <= 100;
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

// Apply playerId validation to rank route
router.get('/rank/:playerId', validatePlayerId);

const statsRepo = new PlayerStatsRepository(dataSource);
const profileRepo = new PlayerProfileRepository(dataSource);
const leaderboardService = new LeaderboardService(dataSource, statsRepo, profileRepo);

// Get top players by score
router.get('/top/score', async (req, res) => {
  try {
    const limitParam = req.query.limit;
    const limit = isValidLimit(limitParam) ? parseInt(limitParam as string) : 10;
    const useCache = req.query.cache !== 'false';
    const top = await leaderboardService.getTopPlayersByScore(limit, useCache);
    res.json(top);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top players by level
router.get('/top/level', async (req, res) => {
  try {
    const limitParam = req.query.limit;
    const limit = isValidLimit(limitParam) ? parseInt(limitParam as string) : 10;
    const top = await leaderboardService.getTopPlayersByLevel(limit);
    res.json(top);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get player rank by score
router.get('/rank/:playerId', async (req, res) => {
  try {
    const rank = await leaderboardService.getPlayerRankByScore(req.params.playerId);
    if (rank === -1) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ rank });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh leaderboard caches (admin endpoint)
router.post('/refresh', async (req, res) => {
  try {
    await leaderboardService.refreshAllLeaderboards();
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;