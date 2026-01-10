// Jest setup file for client tests
import 'jest-canvas-mock';

// Mock Phaser
jest.mock('phaser', () => ({
  Game: jest.fn(),
  Scene: jest.fn(),
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));