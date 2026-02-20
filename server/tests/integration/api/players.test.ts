import request from 'supertest';
import express from 'express';
import playersRouter from '../../../src/api/players';
import { AppDataSource } from '../../../src/persistence/database';
import { PlayerProfileRepository } from '../../../src/persistence/repositories/PlayerProfileRepository';
import { PlayerStatsRepository } from '../../../src/persistence/repositories/PlayerStatsRepository';
import { PlayerUnlockRepository } from '../../../src/persistence/repositories/PlayerUnlockRepository';
import { InventoryRepository } from '../../../src/persistence/repositories/InventoryRepository';
import { AchievementProgressRepository } from '../../../src/persistence/repositories/AchievementProgressRepository';
import { ProgressionService } from '../../../src/services/ProgressionService';
import { InventoryService } from '../../../src/services/InventoryService';

// Mock the database and repositories
jest.mock('../../../src/persistence/database', () => ({
  AppDataSource: {
    transaction: jest.fn(),
  },
}));

jest.mock('../../../src/persistence/repositories/PlayerProfileRepository');
jest.mock('../../../src/persistence/repositories/PlayerStatsRepository');
jest.mock('../../../src/persistence/repositories/PlayerUnlockRepository');
jest.mock('../../../src/persistence/repositories/InventoryRepository');
jest.mock(
  '../../../src/persistence/repositories/AchievementProgressRepository',
);
jest.mock('../../../src/persistence/repositories/UnlockableRepository');

describe('Players API Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/players', playersRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/players/:playerId/profile', () => {
    it('should return 404 if player not found', async () => {
      const mockProfileRepo = PlayerProfileRepository as jest.MockedClass<
        typeof PlayerProfileRepository
      >;
      mockProfileRepo.prototype.findOne.mockResolvedValue(null);

      const response = await request(app).get('/api/players/player1/profile');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Player not found' });
    });

    it('should return player profile', async () => {
      const mockProfile = { id: 'player1', name: 'Test Player' };
      const mockProfileRepo = PlayerProfileRepository as jest.MockedClass<
        typeof PlayerProfileRepository
      >;
      mockProfileRepo.prototype.findOne.mockResolvedValue(mockProfile as any);

      const response = await request(app).get('/api/players/player1/profile');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProfile);
    });
  });

  describe('GET /api/players/:playerId/stats', () => {
    it('should return 404 if stats not found', async () => {
      const mockStatsRepo = PlayerStatsRepository as jest.MockedClass<
        typeof PlayerStatsRepository
      >;
      mockStatsRepo.prototype.findByPlayerId.mockResolvedValue(null);

      const response = await request(app).get('/api/players/player1/stats');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Stats not found' });
    });

    it('should return player stats', async () => {
      const mockStats = { playerId: 'player1', kills: 10, deaths: 2 };
      const mockStatsRepo = PlayerStatsRepository as jest.MockedClass<
        typeof PlayerStatsRepository
      >;
      mockStatsRepo.prototype.findByPlayerId.mockResolvedValue(
        mockStats as any,
      );

      const response = await request(app).get('/api/players/player1/stats');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
    });
  });

  describe('PATCH /api/players/:playerId/stats', () => {
    it('should update stats and return success', async () => {
      // We need to mock ProgressionService used by the router
      // Since the router uses a real instance, we can't easily mock it.
      // Instead we can mock the underlying service methods by mocking the repository.
      // However the router creates its own instance of ProgressionService with mocked repos.
      // That's fine because we already mocked the repositories.
      // The updateStats method uses transaction; we can mock transaction to succeed.
      const mockTransaction = jest.fn().mockImplementation(async (cb) => {
        return cb({ save: jest.fn() });
      });
      (AppDataSource.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );
      const mockStatsRepo = PlayerStatsRepository as jest.MockedClass<
        typeof PlayerStatsRepository
      >;
      mockStatsRepo.prototype.findByPlayerId.mockResolvedValue({
        kills: 5,
      } as any);

      const response = await request(app)
        .patch('/api/players/player1/stats')
        .send({ kills: 3 });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should return 500 on error', async () => {
      (AppDataSource.transaction as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );
      const response = await request(app)
        .patch('/api/players/player1/stats')
        .send({ kills: 3 });
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('POST /api/players/:playerId/unlocks', () => {
    it('should grant unlock', async () => {
      // Mock the unlockRepo.unlock to succeed
      const mockUnlockRepo = PlayerUnlockRepository as jest.MockedClass<
        typeof PlayerUnlockRepository
      >;
      mockUnlockRepo.prototype.unlock.mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/players/player1/unlocks')
        .send({ unlockableId: 'unlock1' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should return 400 if missing unlockableId', async () => {
      const response = await request(app)
        .post('/api/players/player1/unlocks')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing unlockableId' });
    });

    it('should return 500 on failure', async () => {
      const mockUnlockRepo = PlayerUnlockRepository as jest.MockedClass<
        typeof PlayerUnlockRepository
      >;
      mockUnlockRepo.prototype.unlock.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/players/player1/unlocks')
        .send({ unlockableId: 'unlock1' });
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to grant unlock' });
    });
  });
});
