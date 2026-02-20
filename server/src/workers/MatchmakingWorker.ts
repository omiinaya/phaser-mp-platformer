import { Worker } from 'worker_threads';
import { MatchmakingRequest } from '../types/matchmaking';
import { logger } from '../utils/logger';

export interface MatchmakingResult {
  matchedRequests: MatchmakingRequest[];
}

export class MatchmakingWorker {
  private worker: Worker | null = null;
  private busy = false;
  private queue: MatchmakingRequest[] = [];
  private resolveCallback: ((results: MatchmakingResult[]) => void) | null =
    null;

  constructor() {
    this.worker = new Worker('./dist/workers/matchmaking.worker.js', {
      // Ensure the worker file is compiled (we assume dist exists)
    });
    this.worker.on('message', this.handleWorkerMessage.bind(this));
    this.worker.on('error', this.handleWorkerError.bind(this));
    this.worker.on('exit', this.handleWorkerExit.bind(this));
  }

  /**
   * Process the queue asynchronously using the worker.
   * Returns a promise that resolves with match results.
   */
  public process(queue: MatchmakingRequest[]): Promise<MatchmakingResult[]> {
    if (this.busy) {
      return Promise.reject(new Error('Worker is busy'));
    }
    if (!this.worker) {
      return Promise.reject(new Error('Worker not available'));
    }
    this.busy = true;
    this.queue = queue;
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.worker!.postMessage(queue);
    });
  }

  private handleWorkerMessage(message: {
    matches?: MatchmakingResult[];
    error?: string;
  }): void {
    if (message.error) {
      logger.error('Matchmaking worker error:', message.error);
      this.resolveCallback?.([]);
    } else {
      this.resolveCallback?.(message.matches || []);
    }
    this.busy = false;
    this.resolveCallback = null;
  }

  private handleWorkerError(error: Error): void {
    logger.error('Matchmaking worker crashed:', error);
    this.busy = false;
    this.resolveCallback?.([]);
    this.resolveCallback = null;
  }

  private handleWorkerExit(code: number): void {
    logger.warn(`Matchmaking worker exited with code ${code}`);
    this.worker = null;
    this.busy = false;
    this.resolveCallback?.([]);
    this.resolveCallback = null;
  }

  /**
   * Terminate the worker.
   */
  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
