import { logger } from '../utils/logger';

/**
 * Represents a player input with a sequence number.
 */
export interface InputEntry {
  sequence: number;
  input: any;
  timestamp: number;
  applied: boolean;
}

/**
 * Configuration for prediction service.
 */
export interface PredictionConfig {
  /** Maximum size of input history. */
  historySize?: number;
  /** Whether to enable reconciliation. */
  enableReconciliation?: boolean;
}

/**
 * Handles client-side prediction and server reconciliation.
 */
export class PredictionService {
  private inputHistory: InputEntry[] = [];
  private lastProcessedSequence: number = -1;
  private config: PredictionConfig;

  constructor(config: PredictionConfig = {}) {
    this.config = {
      historySize: 100,
      enableReconciliation: true,
      ...config,
    };
  }

  /**
   * Record a new input from the player.
   * @param sequence Input sequence number.
   * @param input The input data.
   * @returns The recorded entry.
   */
  public recordInput(sequence: number, input: any): InputEntry {
    const entry: InputEntry = {
      sequence,
      input,
      timestamp: Date.now(),
      applied: true, // assume applied locally
    };
    this.inputHistory.push(entry);
    // Trim history if exceeds size
    if (this.inputHistory.length > this.config.historySize!) {
      this.inputHistory.shift();
    }
    return entry;
  }

  /**
   * Apply server reconciliation by adjusting game state based on server snapshot.
   * @param serverState The authoritative state from server.
   * @param entityId The entity ID to reconcile.
   * @param applyCorrection Callback to apply correction to the entity.
   */
  public reconcile(
    serverState: any,
    entityId: string,
    applyCorrection: (correctedState: any) => void
  ): void {
    if (!this.config.enableReconciliation) return;

    // Find the last server‑acknowledged input sequence
    const serverSequence = serverState.lastProcessedInput;
    if (serverSequence === undefined) return;

    // Remove inputs that have been acknowledged by server
    this.inputHistory = this.inputHistory.filter(entry => entry.sequence > serverSequence);

    // If the server state differs from our predicted state, we need to correct
    // For simplicity, we just snap to server state (more advanced systems would re‑simulate)
    applyCorrection(serverState);
    logger.debug(`Reconciled entity ${entityId} to server state`);
  }

  /**
   * Get the input history.
   */
  public getHistory(): InputEntry[] {
    return [...this.inputHistory];
  }

  /**
   * Clear input history.
   */
  public clear(): void {
    this.inputHistory = [];
    this.lastProcessedSequence = -1;
  }

  /**
   * Set the last processed sequence from server.
   */
  public setLastProcessedSequence(sequence: number): void {
    this.lastProcessedSequence = sequence;
  }
}