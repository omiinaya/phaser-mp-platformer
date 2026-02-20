// Mock Phaser
jest.mock('phaser', () => ({
  Scene: jest.fn().mockImplementation(function (this: any) {
    this.scene = { start: jest.fn() };
    this.preload = jest.fn();
    this.create = jest.fn();
  }),
}));

import { BootScene } from '../../../src/scenes/BootScene';

describe('BootScene', () => {
  describe('constructor', () => {
    it('should create a BootScene instance', () => {
      const bootScene = new BootScene();
      expect(bootScene).toBeDefined();
    });
  });

  describe('preload', () => {
    it('should have a preload method', () => {
      const bootScene = new BootScene();
      expect(typeof bootScene.preload).toBe('function');
    });
  });

  describe('create', () => {
    it('should have a create method', () => {
      const bootScene = new BootScene();
      expect(typeof bootScene.create).toBe('function');
    });
  });
});
