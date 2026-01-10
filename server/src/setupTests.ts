// Jest setup file for server tests
import { jest } from '@jest/globals';

// Mock database connections
jest.mock('./persistence/database', () => ({
  initialize: jest.fn(),
  getDataSource: jest.fn(),
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

// Mock Socket.IO server
jest.mock('socket.io', () => ({
  Server: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => ({
      emit: jest.fn(),
    })),
  })),
}));