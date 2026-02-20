import {
  MatchmakingWorker,
  MatchmakingResult,
} from '../../../src/workers/MatchmakingWorker';

// Mock worker_threads
jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    postMessage: jest.fn(),
    terminate: jest.fn(),
  })),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MatchmakingWorker', () => {
  let worker: MatchmakingWorker;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    worker?.terminate();
  });

  describe('constructor', () => {
    it('should create a worker instance', () => {
      const { Worker } = require('worker_threads');
      worker = new MatchmakingWorker();
      expect(Worker).toHaveBeenCalled();
    });
  });

  describe('process', () => {
    it('should successfully process queue when worker is available', async () => {
      worker = new MatchmakingWorker();
      const mockWorker = (worker as any).worker;
      mockWorker.postMessage = jest.fn();

      // Call process - should succeed
      const request = {
        requestId: 'req-1',
        playerId: 'player1',
        socketId: 'socket-1',
        preferences: { gameMode: 'deathmatch', region: 'us' },
        queuedAt: new Date(),
      };
      const promise = worker.process([request]);

      // Worker should now be busy
      expect((worker as any).busy).toBe(true);
      expect((worker as any).queue).toEqual([request]);
      expect(mockWorker.postMessage).toHaveBeenCalledWith([request]);

      // Clean up - resolve the promise
      (worker as any).resolveCallback([]);
      await promise;
    });

    it('should reject if worker is busy', async () => {
      worker = new MatchmakingWorker();
      // First call sets busy to true
      // We need to manually set it to simulate busy state
      const mockWorker = (worker as any).worker;
      mockWorker.postMessage = jest.fn(); // Prevent actual message sending

      // Try calling process again while busy
      (worker as any).busy = true;

      await expect(worker.process([])).rejects.toThrow('Worker is busy');
    });

    it('should reject if worker not available', async () => {
      worker = new MatchmakingWorker();
      (worker as any).worker = null;

      await expect(worker.process([])).rejects.toThrow('Worker not available');
    });
  });

  describe('terminate', () => {
    it('should terminate the worker', () => {
      worker = new MatchmakingWorker();
      const mockWorker = (worker as any).worker;

      worker.terminate();

      expect(mockWorker.terminate).toHaveBeenCalled();
      expect((worker as any).worker).toBeNull();
    });

    it('should not throw if worker already null', () => {
      worker = new MatchmakingWorker();
      (worker as any).worker = null;

      expect(() => worker.terminate()).not.toThrow();
    });
  });

  describe('handleWorkerMessage', () => {
    it('should handle successful message', () => {
      worker = new MatchmakingWorker();
      const mockWorker = (worker as any).worker;

      // Simulate a message handler
      const messageHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === 'message',
      )?.[1];

      if (messageHandler) {
        const mockResolve = jest.fn();
        (worker as any).resolveCallback = mockResolve;

        messageHandler({ matches: [{ matchedRequests: [] }] });

        expect(mockResolve).toHaveBeenCalledWith([{ matchedRequests: [] }]);
        expect((worker as any).busy).toBe(false);
      }
    });

    it('should handle error message', () => {
      worker = new MatchmakingWorker();
      const mockWorker = (worker as any).worker;

      const messageHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === 'message',
      )?.[1];

      if (messageHandler) {
        const mockResolve = jest.fn();
        (worker as any).resolveCallback = mockResolve;

        messageHandler({ error: 'Some error' });

        expect(mockResolve).toHaveBeenCalledWith([]);
        expect((worker as any).busy).toBe(false);
      }
    });
  });

  describe('handleWorkerError', () => {
    it('should handle worker error', () => {
      worker = new MatchmakingWorker();
      const mockWorker = (worker as any).worker;

      const errorHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === 'error',
      )?.[1];

      if (errorHandler) {
        const mockResolve = jest.fn();
        (worker as any).resolveCallback = mockResolve;

        errorHandler(new Error('Worker crash'));

        expect(mockResolve).toHaveBeenCalledWith([]);
        expect((worker as any).busy).toBe(false);
      }
    });
  });

  describe('handleWorkerExit', () => {
    it('should handle worker exit', () => {
      worker = new MatchmakingWorker();
      const mockWorker = (worker as any).worker;

      const exitHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === 'exit',
      )?.[1];

      if (exitHandler) {
        const mockResolve = jest.fn();
        (worker as any).resolveCallback = mockResolve;

        exitHandler(1);

        expect(mockResolve).toHaveBeenCalledWith([]);
        expect((worker as any).worker).toBeNull();
      }
    });
  });
});
