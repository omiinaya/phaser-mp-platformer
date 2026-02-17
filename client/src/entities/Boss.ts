import 'phaser';
import { Enemy, EnemyAIConfig, Slime } from './Enemy';
import { Player } from './Player';

export type BossPhase = 'idle' | 'phase1' | 'phase2' | 'phase3' | 'dying';

export interface BossAttackPattern {
  id: string;
  cooldown: number;
  execute: (boss: Boss, target?: Player) => void;
  canUse: (boss: Boss) => boolean;
}

export class Boss extends Enemy {
  protected currentPhase: BossPhase = 'phase1';
  protected phaseHealthThreshold: number[] = [0.66, 0.33, 0];
  protected lastAttackTime: number = 0;
  protected attackCooldown: number = 2000;
  protected currentAttackIndex: number = 0;
  protected attackPatterns: BossAttackPattern[] = [];
  protected isInvulnerable: boolean = false;
  protected invulnerabilityTimer: number = 0;
  protected bossUI?: Phaser.GameObjects.Container;
  protected healthBar?: Phaser.GameObjects.Graphics;
  protected healthBarBg?: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    config: EnemyAIConfig = {},
  ) {
    super(scene, x, y, texture, {
      detectionRange: 600,
      attackRange: 400,
      patrolSpeed: 0,
      chaseSpeed: 100,
      flying: true,
      ...config,
    });

    this.health = 100;
    this.maxHealth = this.health;
    this.scale = 2;

    this.setupAttackPatterns();
    this.setupBossUI();
  }

  protected setupAttackPatterns(): void {
    this.attackPatterns = [
      {
        id: 'charge',
        cooldown: 3000,
        canUse: () => true,
        execute: (boss, target) => {
          if (!target) return;
          const direction = target.x > boss.x ? 1 : -1;
          const body = boss.body as Phaser.Physics.Arcade.Body;
          if (body) {
            body.setVelocityX(direction * 800);
            boss.scene.time.delayedCall(500, () => {
              body.setVelocityX(0);
            });
          }
        },
      },
      {
        id: 'projectile',
        cooldown: 2000,
        canUse: () => true,
        execute: (boss, target) => {
          if (!target) return;
          const direction = target.x > boss.x ? 1 : -1;
          const projectile = boss.scene.physics.add.sprite(
            boss.x + direction * 30,
            boss.y,
            'fireball',
          );
          projectile.setVelocityX(direction * 400);
          projectile.setScale(1.5);
          projectile.setData('damage', 15);
          boss.scene.time.delayedCall(3000, () => projectile.destroy());
        },
      },
      {
        id: 'summon',
        cooldown: 5000,
        canUse: (boss) =>
          boss.currentPhase === 'phase2' || boss.currentPhase === 'phase3',
        execute: (boss) => {
          const enemyCount = Math.floor(Math.random() * 2) + 1;
          for (let i = 0; i < enemyCount; i++) {
            const offsetX = (Math.random() - 0.5) * 200;
            const minion = new Slime(boss.scene, boss.x + offsetX, boss.y + 50);
            boss.scene.add.existing(minion);
            boss.scene.events.emit('boss:minion-spawned', { boss, minion });
          }
        },
      },
      {
        id: 'shockwave',
        cooldown: 4000,
        canUse: (boss) => boss.currentPhase === 'phase3',
        execute: (boss) => {
          const shockwave = boss.scene.add.graphics();
          shockwave.fillStyle(0xff0000, 0.5);
          shockwave.fillCircle(boss.x, boss.y, 50);
          boss.scene.tweens.add({
            targets: shockwave,
            scaleX: 10,
            scaleY: 10,
            alpha: 0,
            duration: 1000,
            onComplete: () => shockwave.destroy(),
          });

          boss.scene.time.delayedCall(500, () => {
            const players = boss.scene.children.list.filter(
              (child) => child instanceof Player,
            ) as Player[];
            players.forEach((player) => {
              const distance = Phaser.Math.Distance.Between(
                boss.x,
                boss.y,
                player.x,
                player.y,
              );
              if (distance < 300) {
                player.takeDamage(20);
              }
            });
          });
        },
      },
    ];
  }

  protected setupBossUI(): void {
    this.bossUI = this.scene.add.container();
    this.bossUI.setScrollFactor(0);

    const barWidth = 400;
    const barHeight = 20;
    const x = this.scene.cameras.main.width / 2;
    const y = 50;

    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.7);
    this.healthBarBg.fillRoundedRect(
      x - barWidth / 2,
      y,
      barWidth,
      barHeight,
      5,
    );
    this.bossUI.add(this.healthBarBg);

    this.healthBar = this.scene.add.graphics();
    this.bossUI.add(this.healthBar);

    const phaseText = this.scene.add
      .text(x, y - 20, 'PHASE 1', {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.bossUI.add(phaseText);
    this.bossUI.setData('phaseText', phaseText);

    this.bossUI.setVisible(false);
  }

  public update(delta: number): void {
    if (this.currentPhase === 'dying') {
      return;
    }

    super.update(delta);

    this.updateInvulnerability(delta);
    this.checkPhaseTransition();
    this.updateUI();
  }

  protected updateInvulnerability(delta: number): void {
    if (this.isInvulnerable) {
      this.invulnerabilityTimer += delta;
      if (this.invulnerabilityTimer >= 1000) {
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.alpha = 1;
      } else {
        this.alpha = 0.5 + Math.sin(this.invulnerabilityTimer / 50) * 0.5;
      }
    }
  }

  protected checkPhaseTransition(): void {
    const healthPercent = this.health / this.maxHealth;

    if (
      healthPercent <= this.phaseHealthThreshold[2] &&
      this.currentPhase !== 'phase3'
    ) {
      this.transitionPhase('phase3');
    } else if (
      healthPercent <= this.phaseHealthThreshold[1] &&
      this.currentPhase !== 'phase2'
    ) {
      this.transitionPhase('phase2');
    } else if (
      healthPercent <= this.phaseHealthThreshold[0] &&
      this.currentPhase !== 'phase1'
    ) {
      this.transitionPhase('phase1');
    }
  }

  protected transitionPhase(newPhase: BossPhase): void {
    this.currentPhase = newPhase;
    this.isInvulnerable = true;
    this.invulnerabilityTimer = 0;

    const phaseNum = newPhase === 'phase1' ? 1 : newPhase === 'phase2' ? 2 : 3;
    const phaseText = this.bossUI?.getData(
      'phaseText',
    ) as Phaser.GameObjects.Text;
    if (phaseText) {
      phaseText.setText(`PHASE ${phaseNum}`);
    }

    this.scene.events.emit('boss:phase-change', {
      boss: this,
      phase: newPhase,
    });

    this.scene.time.delayedCall(2000, () => {
      this.isInvulnerable = false;
    });
  }

  protected updatePatrol(_delta: number): void {
    // Boss doesn't patrol
  }

  protected updateChase(_delta: number): void {
    if (!this.target) {
      this.setAIState('attack');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y,
    );

    if (distance <= this.aiConfig.attackRange!) {
      this.setAIState('attack');
      return;
    }

    const direction = this.target.x > this.x ? 1 : -1;
    this.moveSpeed = this.aiConfig.chaseSpeed!;
    this.move(direction);

    if (Math.abs(this.y - this.target.y) > 50) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setVelocityY((this.target.y > this.y ? 1 : -1) * 100);
      }
    }
  }

  protected updateAttack(delta: number): void {
    this.lastAttackTime += delta;

    const availableAttacks = this.attackPatterns.filter((pattern) =>
      pattern.canUse(this),
    );
    if (
      availableAttacks.length > 0 &&
      this.lastAttackTime >= this.attackCooldown
    ) {
      const attack =
        availableAttacks[this.currentAttackIndex % availableAttacks.length];
      attack.execute(this, this.target);
      this.currentAttackIndex++;
      this.lastAttackTime = 0;
      this.attackCooldown = attack.cooldown;
    }
  }

  public takeDamage(amount: number): boolean {
    if (this.isInvulnerable) {
      return true;
    }

    const alive = super.takeDamage(amount);

    this.scene.events.emit('boss:damage', { boss: this, damage: amount });

    if (this.health <= 0) {
      this.startDeathSequence();
    }

    return alive;
  }

  protected startDeathSequence(): void {
    this.currentPhase = 'dying';
    this.bossUI?.setVisible(false);

    this.scene.events.emit('boss:defeated', { boss: this });

    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 2000,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  protected updateUI(): void {
    if (!this.healthBar || !this.healthBarBg) return;

    const healthPercent = Math.max(0, this.health / this.maxHealth);
    const barWidth = 400 * healthPercent;

    this.healthBar.clear();

    let color = 0x2ecc71;
    if (this.currentPhase === 'phase2') color = 0xf1c40f;
    if (this.currentPhase === 'phase3') color = 0xe74c3c;

    this.healthBar.fillStyle(color);
    this.healthBar.fillRoundedRect(
      this.scene.cameras.main.width / 2 - 200,
      50,
      barWidth,
      20,
      5,
    );
  }

  protected die(): void {
    this.dropLoot();
    super.die();
  }

  public showUI(): void {
    this.bossUI?.setVisible(true);
  }

  public destroy(): void {
    this.bossUI?.destroy();
    super.destroy();
  }
}
