import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";

import { ConnectionManager } from "./network/ConnectionManager";
import { Matchmaker } from "./network/Matchmaker";
import { RoomManager } from "./network/RoomManager";
import { GameSync } from "./network/GameSync";
import { EventHandler } from "./network/events/EventHandler";
import { authenticateSocket } from "./network/middleware/authMiddleware";
import {
  rateLimit,
  validatePlayerInput,
  requireRoom,
} from "./network/middleware/validationMiddleware";
import {
  httpRateLimit,
  startCleanupInterval,
} from "./network/middleware/httpRateLimit";
import { metricsMiddleware } from "./network/middleware/metricsMiddleware";
import { logger } from "./utils/logger";
import { AppDataSource } from "./persistence/database";
import playersRouter from "./api/players";
import leaderboardRouter from "./api/leaderboard";
import { PlayerProfileRepository } from "./persistence/repositories/PlayerProfileRepository";
import { PlayerStatsRepository } from "./persistence/repositories/PlayerStatsRepository";
import { PlayerUnlockRepository } from "./persistence/repositories/PlayerUnlockRepository";
import { UnlockableRepository } from "./persistence/repositories/UnlockableRepository";
import { AchievementProgressRepository } from "./persistence/repositories/AchievementProgressRepository";
import { ProgressionService } from "./services/ProgressionService";

dotenv.config();

// Validate required environment variables
if (!process.env.CLIENT_URL) {
  throw new Error('CLIENT_URL environment variable is required');
}

// Initialize database
AppDataSource.initialize()
  .then(() => {
    logger.info("Database connection established");

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"],
      },
      pingInterval: 5000,
      pingTimeout: 2000,
      transports: ["websocket", "polling"], // allow fallback
      maxHttpBufferSize: 1e6, // 1 MB
      connectTimeout: 45000,
    });

    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(compression()); // Enable gzip compression
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(metricsMiddleware); // Performance metrics

    // Apply HTTP rate limiting to API routes
    app.use("/api/players", httpRateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes
    app.use("/api/leaderboard", httpRateLimit(100, 15 * 60 * 1000));

    // API Routes
    app.use("/api/players", playersRouter);
    app.use("/api/leaderboard", leaderboardRouter);

    // Health check endpoint (no rate limiting)
    app.get("/health", (req, res) => {
      res
        .status(200)
        .json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Prometheus metrics endpoint
    app.get("/metrics", async (req, res) => {
      try {
        const { getMetrics } = await import("./utils/metrics");
        const metrics = await getMetrics();
        res.set("Content-Type", "text/plain");
        res.send(metrics);
      } catch (error) {
        logger.error("Failed to get metrics:", error);
        res.status(500).send("Failed to get metrics");
      }
    });

    // Create progression service and repositories
    const profileRepo = new PlayerProfileRepository(AppDataSource);
    const statsRepo = new PlayerStatsRepository(AppDataSource);
    const unlockRepo = new PlayerUnlockRepository(AppDataSource);
    const unlockableRepo = new UnlockableRepository(AppDataSource);
    const achievementProgressRepo = new AchievementProgressRepository(
      AppDataSource,
    );

    const progressionService = new ProgressionService(
      AppDataSource,
      profileRepo,
      statsRepo,
      unlockRepo,
      achievementProgressRepo,
      unlockableRepo,
    );

    // Initialize core modules
    const connectionManager = new ConnectionManager(io, progressionService);
    const roomManager = new RoomManager(io, connectionManager);
    const matchmaker = new Matchmaker(io, connectionManager, roomManager);
    const gameSync = new GameSync(io, roomManager, 20); // 20 Hz tick rate
    const eventHandler = new EventHandler(
      connectionManager,
      matchmaker,
      roomManager,
      gameSync,
    );

    // Start game synchronization
    gameSync.start();

    // Socket.IO middleware
    io.use(authenticateSocket);
    io.use(rateLimit());
    io.use(validatePlayerInput);
    io.use(requireRoom);

    // Socket.IO connection handling
    io.on("connection", (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Register event handlers
      eventHandler.registerSocket(socket);

      // Handle disconnection
      socket.on("disconnect", () => {
        logger.info(`Client disconnected: ${socket.id}`);
        // ConnectionManager already handles cleanup
      });
    });

    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
      // Start cleanup of rate limit buckets
      startCleanupInterval();
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully");
      gameSync.stop();
      matchmaker.stop();
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    });
  })
  .catch((error) => {
    logger.error("Database connection failed:", error);
    process.exit(1);
  });
