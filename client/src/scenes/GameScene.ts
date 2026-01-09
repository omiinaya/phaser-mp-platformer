import { Scene } from 'phaser';

export class GameScene extends Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load player sprite
    this.load.image('player', 'assets/sprites/player.png');
  }

  create() {
    // Add a simple background
    this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x1a1a2e).setOrigin(0);

    // Create player sprite
    this.player = this.add.sprite(100, 300, 'player');

    // Enable physics
    this.physics.world.enable(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

    // Keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Camera follow
    this.cameras.main.startFollow(this.player);
  }

  update() {
    const speed = 200;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    playerBody.setVelocity(0);

    if (this.cursors.left.isDown) {
      playerBody.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      playerBody.setVelocityX(speed);
    }

    if (this.cursors.up.isDown && playerBody.onFloor()) {
      playerBody.setVelocityY(-400);
    }
  }
}