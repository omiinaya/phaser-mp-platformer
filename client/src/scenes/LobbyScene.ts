import { logger } from '../utils/logger';
import { Scene } from 'phaser';
import { InputManager } from '../core/InputManager';
import { NetworkService } from '../services/NetworkService';

export interface LobbySceneData {
  fromMenu?: boolean;
}

export class LobbyScene extends Scene {
  private networkService?: NetworkService;
  private roomCodeText?: Phaser.GameObjects.Text;
  private playerListText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private roomId: string = '';
  private inRoom: boolean = false;
  private players: string[] = [];

  constructor() {
    super({ key: 'LobbyScene' });
  }

  init(data: LobbySceneData) {
    logger.info('LobbyScene init:', data);
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Title
    this.add
      .text(width / 2, 80, 'MULTIPLAYER LOBBY', {
        fontSize: '48px',
        color: '#fff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Initialize Network Service
    this.networkService = new NetworkService();

    // Setup network event listeners
    this.setupNetworkListeners();

    // Connect to server
    this.statusText = this.add
      .text(width / 2, 200, 'Connecting...', {
        fontSize: '24px',
        color: '#ffff00',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    this.networkService.connect().catch((err) => {
      this.statusText?.setText('Connection Failed');
      this.statusText?.setColor('#ff0000');
      logger.error('Failed to connect:', err);
    });

    // Room code display
    this.add
      .text(width / 2, 300, 'Room Code:', {
        fontSize: '20px',
        color: '#aaa',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    this.roomCodeText = this.add
      .text(width / 2, 340, '...', {
        fontSize: '36px',
        color: '#fff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setInteractive();

    this.roomCodeText.on('pointerdown', () => {
      this.copyRoomCode();
    });

    this.add
      .text(width / 2, 385, '(Click to copy)', {
        fontSize: '12px',
        color: '#888',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Player list
    this.add
      .text(width / 2, 450, 'Players:', {
        fontSize: '20px',
        color: '#aaa',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    this.playerListText = this.add
      .text(width / 2, 490, 'Waiting...', {
        fontSize: '18px',
        color: '#fff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Start Game button (initially hidden/disabled)
    const startButton = this.add
      .text(width / 2, 600, 'START GAME', {
        fontSize: '32px',
        color: '#555',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0.5);

    startButton.on('pointerdown', () => {
      if (this.inRoom && this.players.length >= 1) {
        this.startGame();
      }
    });

    startButton.setData('startButton', startButton);
    this.events.on('enableStartButton', () => {
      startButton.setAlpha(1);
      startButton.setColor('#4CAF50');
      startButton.setInteractive();

      startButton.on('pointerover', () => {
        startButton.setColor('#8BC34A');
      });

      startButton.on('pointerout', () => {
        startButton.setColor('#4CAF50');
      });
    });

    // Back button
    const backButton = this.add
      .text(width / 2, 700, 'Back to Menu', {
        fontSize: '24px',
        color: '#fff',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setInteractive();

    backButton.on('pointerdown', () => {
      this.networkService?.disconnect();
      this.scene.start('MainMenuScene');
    });

    backButton.on('pointerover', () => {
      backButton.setColor('#ff0');
    });

    backButton.on('pointerout', () => {
      backButton.setColor('#fff');
    });

    // Create room on connection
    this.networkService.on('connected', (data: { playerId: string }) => {
      logger.info('Connected with player ID:', data.playerId);
      this.statusText?.setText('Creating Room...');
      this.statusText?.setColor('#00ff00');

      // Room created will happen when we emit create_room
      this.networkService?.once(
        'room_created',
        (roomData: { roomId: string }) => {
          this.roomId = roomData.roomId;
          this.inRoom = true;
          this.roomCodeText?.setText(this.roomId);
          this.statusText?.setText('Waiting for players...');
        },
      );

      // Create a new room
      this.createNewRoom();
    });
  }

  private setupNetworkListeners(): void {
    if (!this.networkService) return;

    this.networkService.on(
      'room_joined',
      (data: { roomId: string; players?: any[] }) => {
        this.roomId = data.roomId;
        this.inRoom = true;
        this.roomCodeText?.setText(data.roomId);
        this.statusText?.setText('Joined room. Waiting for players...');

        if (data.players) {
          this.players = data.players;
          this.updatePlayerList();
        }
      },
    );

    this.networkService.on(
      'room_created',
      (data: { roomId: string; gameMode: string; players: any[] }) => {
        this.roomId = data.roomId;
        this.inRoom = true;
        this.roomCodeText?.setText(data.roomId);
        this.statusText?.setText('Room created. Share the code!');

        if (data.players) {
          this.players = data.players;
          this.updatePlayerList();
        }
      },
    );

    this.networkService.on(
      'player_joined',
      (data: { playerId: string; socketId: string; roomId: string }) => {
        if (!this.players.includes(data.playerId)) {
          this.players.push(data.playerId);
          this.updatePlayerList();
          this.showPlayerName(data.playerId, 'joined');
        }

        if (this.players.length >= 2) {
          this.events.emit('enableStartButton');
        }
      },
    );

    this.networkService.on(
      'player_left',
      (data: { playerId: string; roomId: string }) => {
        const index = this.players.indexOf(data.playerId);
        if (index > -1) {
          this.players.splice(index, 1);
          this.updatePlayerList();
          this.showPlayerName(data.playerId, 'left');

          if (this.players.length < 2) {
            const startBtn = this.children.getByName(
              'startButton',
            ) as Phaser.GameObjects.Text;
            if (startBtn) {
              startBtn.setAlpha(0.5);
              startBtn.setColor('#555');
              startBtn.disableInteractive();
            }
          }
        }
      },
    );

    this.networkService.on('error', (error: { message: string }) => {
      this.statusText?.setText(`Error: ${error.message}`);
      this.statusText?.setColor('#ff0000');
    });
  }

  private createNewRoom(): void {
    this.networkService?.requestMatchmaking({
      gameMode: 'platformer',
      maxPlayers: 4,
    });
  }

  private updatePlayerList(): void {
    if (!this.playerListText) return;

    if (this.players.length === 0) {
      this.playerListText.setText('Waiting for players...');
    } else {
      const playerTexts = this.players
        .map((id, index) => {
          const isMe = id === this.networkService?.getPlayerId();
          return `${index + 1}. ${id.substring(0, 12)}${isMe ? ' (You)' : ''}`;
        })
        .join('\n');
      this.playerListText.setText(playerTexts);
    }
  }

  private showPlayerName(playerId: string, action: string): void {
    const { width } = this.cameras.main;
    const text = this.add
      .text(width / 2, 520, `Player ${playerId.substring(0, 8)} ${action}`, {
        fontSize: '20px',
        color: action === 'joined' ? '#4CAF50' : '#f44336',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: 500,
      alpha: 0,
      duration: 2000,
      ease: 'Sine.easeIn',
      onComplete: () => text.destroy(),
    });
  }

  private copyRoomCode(): void {
    if (this.roomId) {
      navigator.clipboard
        .writeText(this.roomId)
        .then(() => {
          const copyText = this.add
            .text(this.cameras.main.width / 2, 420, 'Copied!', {
              fontSize: '16px',
              color: '#4CAF50',
              fontFamily: 'Arial',
              fontStyle: 'bold',
            })
            .setOrigin(0.5);

          this.tweens.add({
            targets: copyText,
            alpha: 0,
            y: 400,
            duration: 1500,
            ease: 'Sine.easeOut',
            onComplete: () => copyText.destroy(),
          });
        })
        .catch((err) => {
          logger.error('Failed to copy:', err);
        });
    }
  }

  private startGame(): void {
    if (this.inRoom) {
      this.scene.start('GameScene', {
        level: 1,
        roomId: this.roomId,
      });
    }
  }

  update() {
    // Update logic if needed
  }

  destroy() {
    this.networkService?.disconnect();
    this.networkService?.removeAllListeners();
  }
}
