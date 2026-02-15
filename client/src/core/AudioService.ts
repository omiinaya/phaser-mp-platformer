import { logger } from '../utils/logger';
import { Scene } from 'phaser';

export interface AudioConfig {
  masterVolume?: number;
  sfxVolume?: number;
  musicVolume?: number;
  muted?: boolean;
}

export interface SoundEffect {
  key: string;
  url: string;
  volume?: number;
  loop?: boolean;
  rate?: number;
}

export interface MusicTrack {
  key: string;
  url: string;
  volume?: number;
  loop?: boolean;
}

/**
 * Manages all audio in the game including sound effects and music.
 * Supports volume control, muting, and audio pooling.
 */
export class AudioService {
  private scene: Scene;
  private config: AudioConfig;
  private sfx: Map<string, Phaser.Sound.BaseSound> = new Map();
  private music: Map<string, Phaser.Sound.BaseSound> = new Map();
  private currentMusic?: string;
  private isMuted: boolean = false;
  private masterVolume: number = 1.0;
  private sfxVolume: number = 0.8;
  private musicVolume: number = 0.5;

  constructor(scene: Scene, config: AudioConfig = {}) {
    this.scene = scene;
    this.config = config;
    this.masterVolume = config.masterVolume ?? 1.0;
    this.sfxVolume = config.sfxVolume ?? 0.8;
    this.musicVolume = config.musicVolume ?? 0.5;
    this.isMuted = config.muted ?? false;
  }

  /**
   * Preload audio assets.
   */
  public preload(): void {
    // Sound Effects
    this.scene.load.audio('jump', 'assets/audio/jump.wav');
    this.scene.load.audio('coin', 'assets/audio/coin.wav');
    this.scene.load.audio('enemy_hit', 'assets/audio/enemy_hit.wav');
    this.scene.load.audio('player_hit', 'assets/audio/player_hit.wav');
    this.scene.load.audio('health_pickup', 'assets/audio/health_pickup.wav');
    this.scene.load.audio('level_complete', 'assets/audio/level_complete.wav');
    this.scene.load.audio('game_over', 'assets/audio/game_over.wav');
    this.scene.load.audio('attack', 'assets/audio/attack.wav');
    this.scene.load.audio('footstep', 'assets/audio/footstep.wav');
    this.scene.load.audio('landing', 'assets/audio/landing.wav');

    // Music
    this.scene.load.audio('menu_music', 'assets/audio/menu_music.mp3');
    this.scene.load.audio('gameplay_music', 'assets/audio/gameplay_music.mp3');
    this.scene.load.audio('victory_music', 'assets/audio/victory_music.mp3');
  }

  /**
   * Initialize audio after preload.
   */
  public create(): void {
    // Create sound effects
    this.createSFX('jump', { volume: 0.6 });
    this.createSFX('coin', { volume: 0.5 });
    this.createSFX('enemy_hit', { volume: 0.7 });
    this.createSFX('player_hit', { volume: 0.8 });
    this.createSFX('health_pickup', { volume: 0.6 });
    this.createSFX('level_complete', { volume: 0.8 });
    this.createSFX('game_over', { volume: 0.7 });
    this.createSFX('attack', { volume: 0.6 });
    this.createSFX('footstep', { volume: 0.3, rate: 1.2 });
    this.createSFX('landing', { volume: 0.4 });

    // Create music tracks
    this.createMusic('menu_music', { volume: this.musicVolume, loop: true });
    this.createMusic('gameplay_music', {
      volume: this.musicVolume,
      loop: true,
    });
    this.createMusic('victory_music', {
      volume: this.musicVolume,
      loop: false,
    });
  }

  /**
   * Create a sound effect.
   */
  private createSFX(
    key: string,
    config: { volume?: number; rate?: number } = {},
  ): void {
    const sound = this.scene.sound.add(key, {
      volume: this.isMuted
        ? 0
        : (config.volume ?? 1.0) * this.sfxVolume * this.masterVolume,
      rate: config.rate ?? 1.0,
    });
    this.sfx.set(key, sound);
  }

  /**
   * Create a music track.
   */
  private createMusic(
    key: string,
    config: { volume?: number; loop?: boolean } = {},
  ): void {
    const music = this.scene.sound.add(key, {
      volume: this.isMuted
        ? 0
        : (config.volume ?? 1.0) * this.musicVolume * this.masterVolume,
      loop: config.loop ?? true,
    });
    this.music.set(key, music);
  }

  /**
   * Play a sound effect.
   */
  public playSFX(
    key: string,
    config: { volume?: number; rate?: number; detune?: number } = {},
  ): void {
    if (this.isMuted) return;

    const sound = this.sfx.get(key);
    if (sound) {
      const volume =
        (config.volume ?? 1.0) * this.sfxVolume * this.masterVolume;
      const rate = config.rate ?? 1.0;
      const detune = config.detune ?? 0;

      // Play with variations for variety
      sound.play({ volume, rate, detune });
    } else {
      logger.warn(`Sound effect not found: ${key}`);
    }
  }

  /**
   * Play music track.
   */
  public playMusic(key: string, fadeIn: boolean = true): void {
    // Stop current music
    if (this.currentMusic && this.currentMusic !== key) {
      this.stopMusic(true);
    }

    const music = this.music.get(key);
    if (music) {
      this.currentMusic = key;

      if (this.isMuted) {
        (music as any).volume = 0;
      } else {
        const targetVolume = this.musicVolume * this.masterVolume;

        if (fadeIn) {
          (music as any).volume = 0;
          music.play();
          this.scene.tweens.add({
            targets: music,
            volume: targetVolume,
            duration: 1000,
          });
        } else {
          (music as any).volume = targetVolume;
          music.play();
        }
      }
    } else {
      logger.warn(`Music track not found: ${key}`);
    }
  }

  /**
   * Stop current music.
   */
  public stopMusic(fadeOut: boolean = true): void {
    if (!this.currentMusic) return;

    const music = this.music.get(this.currentMusic);
    if (music && music.isPlaying) {
      if (fadeOut) {
        this.scene.tweens.add({
          targets: music,
          volume: 0,
          duration: 500,
          onComplete: () => {
            music.stop();
          },
        });
      } else {
        music.stop();
      }
    }
    this.currentMusic = undefined;
  }

  /**
   * Pause current music.
   */
  public pauseMusic(): void {
    if (this.currentMusic) {
      const music = this.music.get(this.currentMusic);
      if (music) {
        music.pause();
      }
    }
  }

  /**
   * Resume paused music.
   */
  public resumeMusic(): void {
    if (this.currentMusic) {
      const music = this.music.get(this.currentMusic);
      if (music) {
        music.resume();
      }
    }
  }

  /**
   * Set master volume (0-1).
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Set SFX volume (0-1).
   */
  public setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateSFXVolumes();
  }

  /**
   * Set music volume (0-1).
   */
  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicVolumes();
  }

  /**
   * Mute all audio.
   */
  public mute(): void {
    this.isMuted = true;
    this.scene.sound.mute = true;
  }

  /**
   * Unmute all audio.
   */
  public unmute(): void {
    this.isMuted = false;
    this.scene.sound.mute = false;
  }

  /**
   * Toggle mute state.
   */
  public toggleMute(): boolean {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }

  /**
   * Check if audio is muted.
   */
  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Get current volume settings.
   */
  public getVolumeSettings(): { master: number; sfx: number; music: number } {
    return {
      master: this.masterVolume,
      sfx: this.sfxVolume,
      music: this.musicVolume,
    };
  }

  /**
   * Update all audio volumes.
   */
  private updateAllVolumes(): void {
    this.updateSFXVolumes();
    this.updateMusicVolumes();
  }

  /**
   * Update SFX volumes.
   */
  private updateSFXVolumes(): void {
    const volume = this.isMuted ? 0 : this.sfxVolume * this.masterVolume;
    this.sfx.forEach((sound) => {
      (sound as any).volume = volume;
    });
  }

  /**
   * Update music volumes.
   */
  private updateMusicVolumes(): void {
    const volume = this.isMuted ? 0 : this.musicVolume * this.masterVolume;
    this.music.forEach((music) => {
      (music as any).volume = volume;
    });
  }

  /**
   * Play sound effect with random pitch variation.
   */
  public playSFXRandomPitch(key: string, variation: number = 100): void {
    const detune = (Math.random() - 0.5) * variation;
    this.playSFX(key, { detune });
  }

  /**
   * Play footstep sound with timing based on movement.
   */
  public playFootstep(isRunning: boolean = false): void {
    const rate = isRunning ? 1.5 : 1.2;
    this.playSFX('footstep', { rate });
  }

  /**
   * Stop all sounds.
   */
  public stopAll(): void {
    this.scene.sound.stopAll();
    this.currentMusic = undefined;
  }

  /**
   * Destroy and clean up.
   */
  public destroy(): void {
    this.stopAll();
    this.sfx.clear();
    this.music.clear();
  }
}

/**
 * Global audio service instance for cross-scene access.
 */
let globalAudioService: AudioService | null = null;

export function setGlobalAudioService(service: AudioService): void {
  globalAudioService = service;
}

export function getGlobalAudioService(): AudioService | null {
  return globalAudioService;
}
