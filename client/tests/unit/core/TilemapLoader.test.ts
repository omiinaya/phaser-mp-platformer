// Mock Phaser
jest.mock('phaser', () => ({
  Scene: jest.fn().mockImplementation(() => ({
    load: {
      tilemapTiledJSON: jest.fn(),
    },
    make: {
      tilemap: jest.fn().mockReturnValue(null),
    },
  })),
}));

import { TilemapLoader } from '../../../src/core/TilemapLoader';

describe('TilemapLoader', () => {
  let mockScene: any;
  let loader: TilemapLoader;

  beforeEach(() => {
    mockScene = {
      load: {
        tilemapTiledJSON: jest.fn(),
      },
      make: {
        tilemap: jest.fn().mockReturnValue(null),
      },
    };
    loader = new TilemapLoader(mockScene);
  });

  describe('constructor', () => {
    it('should create a TilemapLoader instance', () => {
      expect(loader).toBeInstanceOf(TilemapLoader);
    });
  });

  describe('loadTilemap', () => {
    it('should call scene.load.tilemapTiledJSON', () => {
      loader.loadTilemap('level1', 'assets/level1.json');
      expect(mockScene.load.tilemapTiledJSON).toHaveBeenCalledWith(
        'level1',
        'assets/level1.json',
      );
    });
  });

  describe('createFromTilemap', () => {
    it('should return null when tilemap is null', () => {
      mockScene.make.tilemap.mockReturnValueOnce(null);
      const result = loader.createFromTilemap('level1');
      expect(result).toBeNull();
    });
  });
});
