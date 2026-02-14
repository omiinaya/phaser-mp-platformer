import { Scene } from "phaser";
import { InputManager, InputConfig } from "../core/InputManager";
import { SceneService } from "../core/SceneManager";
import { logger } from "../utils/logger";

export class MainMenuScene extends Scene {
  private inputManager?: InputManager;
  private sceneService?: SceneService;
  private startButton?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Title
    this.add
      .text(width / 2, height / 2 - 100, "Phaser Platformer", {
        fontSize: "48px",
        color: "#fff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);

    // Start button
    this.startButton = this.add
      .text(width / 2, height / 2 - 20, "Start Game", {
        fontSize: "32px",
        color: "#0f0",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setInteractive();

    this.startButton.on("pointerdown", () => {
      this.startGame();
    });

    this.startButton.on("pointerover", () => {
      this.startButton!.setColor("#ff0");
    });

    this.startButton.on("pointerout", () => {
      this.startButton!.setColor("#0f0");
    });

    // Level Select button
    const levelSelectButton = this.add
      .text(width / 2, height / 2 + 40, "Level Select", {
        fontSize: "32px",
        color: "#3498db",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setInteractive();

    levelSelectButton.on("pointerdown", () => {
      this.openLevelSelect();
    });

    levelSelectButton.on("pointerover", () => {
      levelSelectButton.setColor("#ff0");
    });

    levelSelectButton.on("pointerout", () => {
      levelSelectButton.setColor("#3498db");
    });

    // Multiplayer button
    const multiplayerButton = this.add
      .text(width / 2, height / 2 + 100, "Multiplayer", {
        fontSize: "32px",
        color: "#e91e63",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setInteractive();

    multiplayerButton.on("pointerdown", () => {
      this.openMultiplayer();
    });

    multiplayerButton.on("pointerover", () => {
      multiplayerButton.setColor("#ff0");
    });

    multiplayerButton.on("pointerout", () => {
      multiplayerButton.setColor("#e91e63");
    });

    // Initialize SceneService
    this.sceneService = new SceneService(this.game);

    // Initialize InputManager
    const inputConfig: InputConfig = {
      actions: [
        {
          id: "start",
          keys: ["Enter", "Space"],
          description: "Start the game",
        },
        {
          id: "quit",
          keys: ["Escape"],
          description: "Quit to menu",
        },
      ],
    };
    this.inputManager = new InputManager(this, inputConfig);
    this.inputManager.onInputEvent((event) => {
      if (event.action === "start" && event.active) {
        this.startGame();
      }
      if (event.action === "quit" && event.active) {
        // Could return to boot scene or exit
        logger.info("Quit pressed");
      }
    });
  }

  update() {
    if (this.inputManager) {
      this.inputManager.update();
    }
  }

  private startGame(): void {
    if (this.sceneService) {
      this.sceneService.startScene({
        target: "GameScene",
        stopCurrent: true,
      });
    } else {
      this.scene.start("GameScene");
    }
  }

  private openLevelSelect(): void {
    this.scene.start("LevelSelectScene");
  }

  private openMultiplayer(): void {
    this.scene.start("LobbyScene");
  }
}
