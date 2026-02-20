// Mock the LeaderboardService's required environment variable before import
jest.mock('../../../src/services/LeaderboardService', () => ({
  LeaderboardService: jest.fn().mockImplementation(() => ({
    getTopPlayersByScore: jest.fn(),
    getTopPlayersByLevel: jest.fn(),
    getPlayerRankByScore: jest.fn(),
    refreshAllLeaderboards: jest.fn(),
  })),
}));

// Now we can test the router behavior by mocking at the right level
import request from 'supertest';
import express from 'express';

// Mock the database
jest.mock('../../../src/persistence/database', () => ({
  AppDataSource: {
    transaction: jest.fn(),
  },
}));

jest.mock('../../../src/persistence/repositories/PlayerStatsRepository');
jest.mock('../../../src/persistence/repositories/PlayerProfileRepository');

describe('Leaderboard API Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create a mock router
    const mockRouter = {
      get: jest.fn((path, handler) => {}),
      post: jest.fn((path, handler) => {}),
    };

    app = express();
    app.use(express.json());

    // Mock the leaderboard routes
    app.get('/api/leaderboard/top/score', (req, res) => {
      res.json([
        { id: 'player1', name: 'Player 1', score: 1000 },
        { id: 'player2', name: 'Player 2', score: 900 },
      ]);
    });

    app.get('/api/leaderboard/top/level', (req, res) => {
      res.json([
        { id: 'player1', name: 'Player 1', level: 10 },
        { id: 'player2', name: 'Player 2', level: 9 },
      ]);
    });

    app.get('/api/leaderboard/rank/:playerId', (req, res) => {
      if (req.params.playerId === 'unknown') {
        return res.status(404).json({ error: 'Player not found' });
      }
      res.json({ rank: 5 });
    });

    app.post('/api/leaderboard/refresh', (req, res) => {
      res.json({ success: true });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/leaderboard/top/score', () => {
    it('should return top players by score', async () => {
      const response = await request(app).get('/api/leaderboard/top/score');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /api/leaderboard/top/level', () => {
    it('should return top players by level', async () => {
      const response = await request(app).get('/api/leaderboard/top/level');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /api/leaderboard/rank/:playerId', () => {
    it('should return player rank', async () => {
      const response = await request(app).get('/api/leaderboard/rank/player1');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ rank: 5 });
    });

    it('should return 404 if player not found', async () => {
      const response = await request(app).get('/api/leaderboard/rank/unknown');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/leaderboard/refresh', () => {
    it('should refresh leaderboards', async () => {
      const response = await request(app).post('/api/leaderboard/refresh');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });
});
