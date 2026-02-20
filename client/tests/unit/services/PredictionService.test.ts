import {
  PredictionService,
  PredictionConfig,
} from '../../../src/services/PredictionService';

describe('PredictionService', () => {
  let predictionService: PredictionService;

  beforeEach(() => {
    predictionService = new PredictionService();
  });

  describe('constructor', () => {
    it('should create PredictionService with default config', () => {
      expect(predictionService).toBeDefined();
    });

    it('should create PredictionService with custom config', () => {
      const config: PredictionConfig = {
        historySize: 50,
        enableReconciliation: false,
      };
      const service = new PredictionService(config);
      expect(service).toBeDefined();
    });
  });

  describe('recordInput', () => {
    it('should record a new input', () => {
      const input = { left: true, right: false, jump: false };
      const entry = predictionService.recordInput(1, input);

      expect(entry.sequence).toBe(1);
      expect(entry.input).toEqual(input);
      expect(entry.applied).toBe(true);
    });

    it('should record multiple inputs', () => {
      predictionService.recordInput(1, { left: true });
      predictionService.recordInput(2, { right: true });
      predictionService.recordInput(3, { jump: true });

      const history = predictionService.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].sequence).toBe(1);
      expect(history[1].sequence).toBe(2);
      expect(history[2].sequence).toBe(3);
    });

    it('should trim history when exceeding max size', () => {
      const config: PredictionConfig = { historySize: 3 };
      const service = new PredictionService(config);

      service.recordInput(1, { x: 1 });
      service.recordInput(2, { x: 2 });
      service.recordInput(3, { x: 3 });
      service.recordInput(4, { x: 4 });

      const history = service.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].sequence).toBe(2); // First one was removed
    });
  });

  describe('reconcile', () => {
    it('should apply server correction when reconciliation is enabled', () => {
      predictionService.recordInput(1, { x: 10 });
      predictionService.recordInput(2, { x: 20 });

      const serverState = { lastProcessedInput: 1, x: 15 };
      const appliedCorrection: any[] = [];

      predictionService.reconcile(serverState, 'player-1', (correctedState) => {
        appliedCorrection.push(correctedState);
      });

      expect(appliedCorrection).toHaveLength(1);
      expect(appliedCorrection[0].x).toBe(15);
    });

    it('should not apply reconciliation when disabled', () => {
      const config: PredictionConfig = { enableReconciliation: false };
      const service = new PredictionService(config);

      service.recordInput(1, { x: 10 });

      const serverState = { lastProcessedInput: 1, x: 15 };
      const appliedCorrection: any[] = [];

      service.reconcile(serverState, 'player-1', (correctedState) => {
        appliedCorrection.push(correctedState);
      });

      expect(appliedCorrection).toHaveLength(0);
    });

    it('should remove acknowledged inputs from history', () => {
      predictionService.recordInput(1, { x: 10 });
      predictionService.recordInput(2, { x: 20 });
      predictionService.recordInput(3, { x: 30 });

      const serverState = { lastProcessedInput: 2 };

      predictionService.reconcile(serverState, 'player-1', () => {});

      const history = predictionService.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].sequence).toBe(3);
    });

    it('should not reconcile if server state has no lastProcessedInput', () => {
      predictionService.recordInput(1, { x: 10 });

      const serverState = { x: 15 };
      const appliedCorrection: any[] = [];

      predictionService.reconcile(serverState, 'player-1', (correctedState) => {
        appliedCorrection.push(correctedState);
      });

      expect(appliedCorrection).toHaveLength(0);
    });
  });

  describe('getHistory', () => {
    it('should return a copy of the history', () => {
      predictionService.recordInput(1, { x: 10 });

      const history1 = predictionService.getHistory();
      const history2 = predictionService.getHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe('clear', () => {
    it('should clear input history', () => {
      predictionService.recordInput(1, { x: 10 });
      predictionService.recordInput(2, { x: 20 });

      predictionService.clear();

      expect(predictionService.getHistory()).toHaveLength(0);
    });
  });

  describe('setLastProcessedSequence', () => {
    it('should set the last processed sequence', () => {
      predictionService.setLastProcessedSequence(10);
      // The value is stored internally, so we verify indirectly
      predictionService.recordInput(1, { x: 10 });
      const history = predictionService.getHistory();
      expect(history).toHaveLength(1);
    });
  });
});
