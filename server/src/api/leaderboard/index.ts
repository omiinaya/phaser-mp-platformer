import { Router } from 'express';
import { AppDataSource } from '../../persistence/database';
import { PlayerStatsRepository } from '../../persistence/repositories/PlayerStatsRepository';
import { PlayerProfileRepository } from '../../persistence/repositories/PlayerProfileRepository';
import { LeaderboardService } from '../../services/LeaderboardService';

const router: Router = Router();
const dataSource = AppDataSource;

const statsRepo = new PlayerStatsRepository(dataSource);
const profileRepo = new PlayerProfileRepository(dataSource);
const leaderboardService = new LeaderboardService(dataSource, statsRepo, profileRepo);

// Get top players by score
router.get('/top/score', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const useCache = req.query.cache !== 'false';
    const top = await leaderboardService.getTopPlayersByScore(limit, useCache);
    res.json(top);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top players by level
router.get('/top/level', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const top = await leaderboardService.getTopPlayersByLevel(limit);
    res.json(top);
  } catch (error) {
    console.error(error);
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
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh leaderboard caches (admin endpoint)
router.post('/refresh', async (req, res) => {
  try {
    await leaderboardService.refreshAllLeaderboards();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;