import { logger } from '../utils/logger';
import Phaser from 'phaser';

/**
 * Error severity levels.
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Error data structure.
 */
export interface GameError {
  id: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: number;
  recoverable: boolean;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
  action?: () => void;
}

/**
 * Error handler for managing game errors and displaying user-friendly messages.
 */
export class ErrorHandler {
  private scene?: Phaser.Scene;
  private errorQueue: GameError[] = [];
  private activeError?: GameError;
  private errorContainer?: Phaser.GameObjects.Container;
  private errorText?: Phaser.GameObjects.Text;
  private errorBg?: Phaser.GameObjects.Graphics;
  private retryButton?: Phaser.GameObjects.Text;
  private dismissButton?: Phaser.GameObjects.Text;
  private isVisible: boolean = false;
  private readonly maxQueueSize: number = 10;

  constructor(scene?: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show an error message to the user.
   * @param message The error message to display.
   * @param severity The severity level of the error.
   * @param recoverable Whether the error is recoverable.
   * @param retryable Whether the error can be retried.
   * @param action Optional action to execute on retry.
   */
  public showError(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    recoverable: boolean = true,
    retryable: boolean = true,
    action?: () => void,
  ): void {
    const error: GameError = {
      id: `error_${Date.now()}_${Math.random()}`,
      message,
      severity,
      timestamp: Date.now(),
      recoverable,
      retryable,
      retryCount: 0,
      maxRetries: 3,
      action,
    };

    this.errorQueue.push(error);

    // Remove oldest errors if queue is full
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    if (!this.isVisible) {
      this.showNextError();
    }

    // Log to console
    logger.error(`[${severity.toUpperCase()}] ${message}`);
  }

  /**
   * Show the next error in the queue.
   */
  private showNextError(): void {
    if (!this.scene || this.errorQueue.length === 0) {
      this.hideError();
      return;
    }

    this.activeError = this.errorQueue.shift();
    if (!this.activeError) return;

    this.createErrorUI();
    this.isVisible = true;
  }

  /**
   * Create the error UI elements.
   */
  private createErrorUI(): void {
    if (!this.scene || !this.activeError) return;

    // Create container if not exists
    if (!this.errorContainer) {
      this.errorContainer = this.scene.add.container(0, 0);
      this.errorContainer.setScrollFactor(0);
      this.errorContainer.setDepth(1000);
    }

    const { width, height } = this.scene.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // Background
    this.errorBg = this.scene.add.graphics();
    this.errorBg.fillStyle(
      this.getSeverityColor(this.activeError.severity),
      0.9,
    );
    this.errorBg.fillRoundedRect(-200, -80, 400, 160, 16);
    this.errorBg.lineStyle(3, 0xffffff, 1);
    this.errorBg.strokeRoundedRect(-200, -80, 400, 160, 16);

    // Error title
    const title = this.scene.add.text(
      0,
      -60,
      this.getSeverityTitle(this.activeError.severity),
      {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      },
    );
    title.setOrigin(0.5);

    // Error message
    this.errorText = this.scene.add.text(
      0,
      -20,
      this.wrapText(this.activeError.message, 50),
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center',
      },
    );
    this.errorText.setOrigin(0.5);

    // Retry button (if retryable)
    if (this.activeError.retryable) {
      this.retryButton = this.scene.add.text(-60, 40, 'Retry', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial',
        backgroundColor: '#3498db',
        padding: { x: 20, y: 10 },
      });
      this.retryButton.setOrigin(0.5);
      this.retryButton.setInteractive({ useHandCursor: true });
      this.retryButton.on('pointerdown', () => this.handleRetry());
      this.retryButton.on('pointerover', () => this.retryButton?.setScale(1.1));
      this.retryButton.on('pointerout', () => this.retryButton?.setScale(1));
    }

    // Dismiss button
    this.dismissButton = this.scene.add.text(
      this.activeError.retryable ? 60 : 0,
      40,
      'Dismiss',
      {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial',
        backgroundColor: '#e74c3c',
        padding: { x: 20, y: 10 },
      },
    );
    this.dismissButton.setOrigin(0.5);
    this.dismissButton.setInteractive({ useHandCursor: true });
    this.dismissButton.on('pointerdown', () => this.handleDismiss());
    this.dismissButton.on('pointerover', () =>
      this.dismissButton?.setScale(1.1),
    );
    this.dismissButton.on('pointerout', () => this.dismissButton?.setScale(1));

    // Position container
    this.errorContainer.setPosition(centerX, centerY);

    // Add all elements to container
    this.errorContainer.add([
      this.errorBg,
      title,
      this.errorText,
      ...(this.retryButton ? [this.retryButton] : []),
      this.dismissButton,
    ]);

    // Animate in
    this.errorContainer.setScale(0);
    this.scene.tweens.add({
      targets: this.errorContainer,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Get color for severity level.
   */
  private getSeverityColor(severity: ErrorSeverity): number {
    switch (severity) {
    case ErrorSeverity.INFO:
      return 0x3498db;
    case ErrorSeverity.WARNING:
      return 0xf1c40f;
    case ErrorSeverity.ERROR:
      return 0xe74c3c;
    case ErrorSeverity.CRITICAL:
      return 0x8e44ad;
    default:
      return 0x95a5a6;
    }
  }

  /**
   * Get title for severity level.
   */
  private getSeverityTitle(severity: ErrorSeverity): string {
    switch (severity) {
    case ErrorSeverity.INFO:
      return 'Information';
    case ErrorSeverity.WARNING:
      return 'Warning';
    case ErrorSeverity.ERROR:
      return 'Error';
    case ErrorSeverity.CRITICAL:
      return 'Critical Error';
    default:
      return 'Error';
    }
  }

  /**
   * Wrap text to specified length.
   */
  private wrapText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > maxLength) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    lines.push(currentLine.trim());

    return lines.join('\n');
  }

  /**
   * Handle retry action.
   */
  private handleRetry(): void {
    if (!this.activeError) return;

    this.activeError.retryCount++;

    if (this.activeError.retryCount >= this.activeError.maxRetries) {
      this.showError(
        'Max retry attempts reached. Please try again later.',
        ErrorSeverity.ERROR,
        false,
        false,
      );
      return;
    }

    if (this.activeError.action) {
      try {
        this.activeError.action();
        this.hideError();
      } catch (error) {
        this.showError(
          `Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ErrorSeverity.ERROR,
          true,
          true,
          this.activeError.action,
        );
      }
    } else {
      this.hideError();
    }
  }

  /**
   * Handle dismiss action.
   */
  private handleDismiss(): void {
    this.hideError();
  }

  /**
   * Hide the current error and show next if any.
   */
  private hideError(): void {
    if (this.scene && this.errorContainer) {
      this.scene.tweens.add({
        targets: this.errorContainer,
        scale: 0,
        duration: 150,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.errorContainer?.removeAll(true);
          this.errorBg?.destroy();
          this.errorText?.destroy();
          this.retryButton?.destroy();
          this.dismissButton?.destroy();
          this.errorBg = undefined;
          this.errorText = undefined;
          this.retryButton = undefined;
          this.dismissButton = undefined;

          this.isVisible = false;
          this.activeError = undefined;

          // Show next error if queue not empty
          if (this.errorQueue.length > 0) {
            this.showNextError();
          }
        },
      });
    } else {
      this.isVisible = false;
      this.activeError = undefined;
    }
  }

  /**
   * Clear all errors from the queue.
   */
  public clearErrors(): void {
    this.errorQueue = [];
    if (this.isVisible) {
      this.hideError();
    }
  }

  /**
   * Update the scene reference (useful for scene transitions).
   * @param scene The new scene reference.
   */
  public setScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /**
   * Destroy the error handler and clean up.
   */
  public destroy(): void {
    this.clearErrors();
    this.errorContainer?.destroy();
    this.errorContainer = undefined;
    this.scene = undefined;
  }
}

/**
 * Global error handler instance.
 */
let globalErrorHandler: ErrorHandler | null = null;

/**
 * Initialize the global error handler.
 * @param scene Optional scene reference.
 */
export function initErrorHandler(scene?: Phaser.Scene): ErrorHandler {
  globalErrorHandler = new ErrorHandler(scene);
  return globalErrorHandler;
}

/**
 * Get the global error handler instance.
 */
export function getErrorHandler(): ErrorHandler | null {
  return globalErrorHandler;
}

/**
 * Show an error using the global error handler.
 * @param message The error message.
 * @param severity The error severity.
 * @param recoverable Whether the error is recoverable.
 * @param retryable Whether the error can be retried.
 * @param action Optional retry action.
 */
export function showGameError(
  message: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  recoverable: boolean = true,
  retryable: boolean = true,
  action?: () => void,
): void {
  globalErrorHandler?.showError(
    message,
    severity,
    recoverable,
    retryable,
    action,
  );
}

/**
 * Show a connection error with retry option.
 * @param retryAction Function to call on retry.
 */
export function showConnectionError(retryAction: () => void): void {
  showGameError(
    'Connection lost. Please check your internet connection and try again.',
    ErrorSeverity.ERROR,
    true,
    true,
    retryAction,
  );
}

/**
 * Show a save error.
 */
export function showSaveError(): void {
  showGameError(
    'Failed to save game progress. Your progress may be lost if you continue.',
    ErrorSeverity.WARNING,
    true,
    false,
  );
}

/**
 * Show a disconnection error for multiplayer.
 * @param onReturnToMenu Function to call when returning to menu.
 */
export function showDisconnectionError(onReturnToMenu: () => void): void {
  showGameError(
    'Disconnected from server. You have been returned to the main menu.',
    ErrorSeverity.ERROR,
    false,
    false,
    onReturnToMenu,
  );
}
