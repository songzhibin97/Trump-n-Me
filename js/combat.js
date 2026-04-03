import { COMBO_TIMEOUT, RAGE_DURATION, RAGE_MAX } from "./constants.js";
import { checkAABB } from "./physics.js";

const PLAYER_RAGE_GAIN = 10;
const TAKEN_DAMAGE_RAGE_GAIN = 8;
const RAGE_AUTO_TRIGGER_DELAY = 900;
const HIT_HEAL = Object.freeze({
  minion: 3,
  bodyguard: 5,
  phoneThrower: 4,
  boss: 8,
});
const KILL_HEAL = Object.freeze({
  minion: 16,
  bodyguard: 22,
  phoneThrower: 18,
  boss: 40,
});

export class CombatSystem {
  constructor() {
    this.comboCount = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.rage = 0;
    this.rageActive = false;
    this.rageTimer = 0;
    this.rageReadyTimer = 0;
    this.hitThisFrame = new Set();
    this.activeAttackId = null;
    this.enemyHitRegistry = new Map();
    this.hazardHitRegistry = new Set();
  }

  gainRage(amount) {
    this.rage = Math.min(RAGE_MAX, this.rage + Math.max(0, amount));
  }

  registerSuccessfulHit(rageGain = PLAYER_RAGE_GAIN) {
    this.comboCount += 1;
    this.maxCombo = Math.max(this.maxCombo, this.comboCount);
    this.comboTimer = COMBO_TIMEOUT;
    this.gainRage(rageGain);
  }

  createHitRecord(enemy, result, attackType, extra = {}) {
    return {
      enemy,
      damage: result.damage,
      killed: result.killed,
      quote: result.quote ?? null,
      phaseTransition: result.phaseTransition ?? null,
      finalBossDefeated: result.finalBossDefeated ?? false,
      x: enemy.x + enemy.width / 2,
      y: enemy.y + enemy.height * 0.35,
      attackType,
      ...extra,
    };
  }

  getSustainAmount(enemy, table) {
    return enemy.isBossEnemy?.() ? table.boss : table[enemy.type] ?? table.minion;
  }

  getEnemyCenter(enemy) {
    return {
      x: enemy.x + enemy.width / 2,
      y: enemy.y + enemy.height * 0.45,
    };
  }

  getDamageForAttack(attack, enemy) {
    let damage = Math.round(attack.damage * this.getDamageMultiplier());
    const weapon = attack.weapon;

    if (weapon?.executeThreshold && enemy.hp <= weapon.executeThreshold) {
      damage = Math.round(damage * (weapon.finisherMult ?? 1.6));
    }

    return damage;
  }

  getRageGainForAttack(attack, scale = 1) {
    const weapon = attack.weapon;
    const baseGain = PLAYER_RAGE_GAIN + (weapon?.bonusRageOnHit ?? 0);
    return Math.max(1, Math.round(baseGain * (weapon?.rageGainMult ?? 1) * scale));
  }

  applyAttackToEnemy(player, enemy, attack, hits, options = {}) {
    if (!enemy.alive || this.hitThisFrame.has(enemy.id)) {
      return null;
    }

    const damage = options.damage ?? this.getDamageForAttack(attack, enemy);
    const knockbackX = options.knockbackX ?? attack.knockbackX;
    const knockbackY = options.knockbackY ?? attack.knockbackY;
    const attackType = options.attackType ?? attack.attackType;
    const result = enemy.takeHit(damage, knockbackX, knockbackY, attackType);
    let healApplied = 0;

    if (result.damage <= 0) {
      return null;
    }

    this.hitThisFrame.add(enemy.id);
    this.registerSuccessfulHit(options.rageGain ?? this.getRageGainForAttack(attack, options.rageScale ?? 1));

    if (options.heal) {
      player.restoreHp(options.heal);
      healApplied += options.heal;
    }

    const sustainHeal = options.sustainHeal ?? this.getSustainAmount(enemy, HIT_HEAL);
    if (sustainHeal > 0) {
      player.restoreHp(sustainHeal);
      healApplied += sustainHeal;
    }

    if (result.killed) {
      const killHeal = this.getSustainAmount(enemy, KILL_HEAL);
      player.restoreHp(killHeal);
      healApplied += killHeal;
    }

    const record = this.createHitRecord(enemy, result, attackType, {
      heal: healApplied,
      ...(options.extra ?? {}),
    });
    hits.push(record);
    return record;
  }

  triggerGolfClubSplash(player, attack, primaryHit, enemies, hits, effects) {
    const weapon = attack.weapon;

    if (!weapon?.splashDamageMult || !weapon.splashOn?.includes(attack.attackType)) {
      return;
    }

    const origin = this.getEnemyCenter(primaryHit.enemy);
    let splashed = 0;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.id === primaryHit.enemy.id || this.hitThisFrame.has(enemy.id)) {
        continue;
      }

      const center = this.getEnemyCenter(enemy);
      const distance = Math.hypot(center.x - origin.x, center.y - origin.y);

      if (distance > weapon.splashRadius) {
        continue;
      }

      const direction = center.x >= origin.x ? 1 : -1;
      const splashHit = this.applyAttackToEnemy(player, enemy, attack, hits, {
        damage: Math.max(1, Math.round(attack.damage * weapon.splashDamageMult * this.getDamageMultiplier())),
        knockbackX: direction * Math.max(4, Math.abs(attack.knockbackX) * 0.7),
        knockbackY: attack.attackType === "uppercut" ? -8 : -2,
        rageScale: 0.55,
      });

      if (!splashHit) {
        continue;
      }

      splashed += 1;
    }

    if (splashed > 0) {
      effects?.addWeaponPulse(origin.x, origin.y, `SWEEP ${splashed + 1}`, "#ffd76a");
    }
  }

  triggerTwitterPhoneChain(player, attack, primaryHit, enemies, hits, effects) {
    const weapon = attack.weapon;

    if (!weapon?.chainDamage || !weapon.chainOn?.includes(attack.attackType)) {
      return;
    }

    let source = this.getEnemyCenter(primaryHit.enemy);
    let chained = 0;

    while (chained < (weapon.chainCount ?? 0)) {
      let nextEnemy = null;
      let nextDistance = Infinity;

      for (const enemy of enemies) {
        if (!enemy.alive || this.hitThisFrame.has(enemy.id)) {
          continue;
        }

        const center = this.getEnemyCenter(enemy);
        const distance = Math.hypot(center.x - source.x, center.y - source.y);

        if (distance > weapon.chainRadius || distance >= nextDistance) {
          continue;
        }

        nextEnemy = enemy;
        nextDistance = distance;
      }

      if (!nextEnemy) {
        break;
      }

      const targetCenter = this.getEnemyCenter(nextEnemy);
      const direction = targetCenter.x >= source.x ? 1 : -1;
      const chainedHit = this.applyAttackToEnemy(player, nextEnemy, attack, hits, {
        damage: Math.round(weapon.chainDamage * this.getDamageMultiplier()),
        knockbackX: direction * Math.max(3, Math.abs(attack.knockbackX) * 0.45),
        knockbackY: -1,
        rageScale: 0.45,
      });

      if (!chainedHit) {
        break;
      }

      effects?.addBeamEffect(source.x, source.y, targetCenter.x, targetCenter.y, {
        color: "rgba(91, 210, 255, 0.9)",
        coreColor: "rgba(255, 255, 255, 0.96)",
        width: 12,
        coreWidth: 4,
      });
      effects?.addWeaponPulse(targetCenter.x, targetCenter.y, `CHAIN ${chained + 1}`, "#8fd7ff");
      source = targetCenter;
      chained += 1;
    }
  }

  triggerGoldenWigShockwave(player, attack, primaryHit, enemies, hits, effects) {
    const weapon = attack.weapon;

    if (!weapon?.shockwaveDamage || !weapon.shockwaveOn?.includes(attack.attackType)) {
      return;
    }

    const origin = {
      x: attack.character.x + attack.character.width / 2,
      y: attack.character.y + attack.character.height * 0.5,
    };
    let shocked = 0;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.id === primaryHit.enemy.id || this.hitThisFrame.has(enemy.id)) {
        continue;
      }

      const center = this.getEnemyCenter(enemy);
      const distance = Math.hypot(center.x - origin.x, center.y - origin.y);

      if (distance > weapon.shockwaveRadius) {
        continue;
      }

      const direction = center.x >= origin.x ? 1 : -1;
      const shockHit = this.applyAttackToEnemy(player, enemy, attack, hits, {
        damage: Math.round(weapon.shockwaveDamage * this.getDamageMultiplier()),
        knockbackX: direction * 5,
        knockbackY: -3,
        rageScale: 0.4,
      });

      if (!shockHit) {
        continue;
      }

      shocked += 1;
    }

    if (shocked > 0) {
      effects?.addWeaponPulse(origin.x, origin.y, `CROWN ${shocked + 1}`, "#ffe27a");
    }
  }

  checkPlayerAttacks(player, enemies, effects = null) {
    const hitbox = player.getHitbox();
    const attack = player.getAttackInfo();
    const hits = [];

    if (!attack || !hitbox.w || !hitbox.h) {
      this.hitThisFrame.clear();
      this.activeAttackId = null;
      return hits;
    }

    if (this.activeAttackId !== attack.attackId) {
      this.activeAttackId = attack.attackId;
      this.hitThisFrame.clear();
    }

    for (const enemy of enemies) {
      if (!enemy.alive || this.hitThisFrame.has(enemy.id)) {
        continue;
      }

      if (!checkAABB(hitbox, enemy.getHurtbox())) {
        continue;
      }

      const executeHit = attack.weapon?.executeThreshold && enemy.hp <= attack.weapon.executeThreshold;
      const primaryHit = this.applyAttackToEnemy(player, enemy, attack, hits, {
        heal: attack.weapon?.healOnHit ?? 0,
      });

      if (!primaryHit) {
        continue;
      }

      if (executeHit) {
        effects?.addWeaponPulse(primaryHit.x, primaryHit.y - 18, "FINISH", "#ffcf69");
      }

      this.triggerGolfClubSplash(player, attack, primaryHit, enemies, hits, effects);
      this.triggerTwitterPhoneChain(player, attack, primaryHit, enemies, hits, effects);
      this.triggerGoldenWigShockwave(player, attack, primaryHit, enemies, hits, effects);
    }

    return hits;
  }

  checkEnemyAttacks(player, enemies) {
    const playerHurtbox = player.getHurtbox();
    const hits = [];

    for (const enemy of enemies) {
      if (!enemy.alive) {
        continue;
      }

      const attack = enemy.getAttackInfo();

      if (attack && attack.hitbox.w && attack.hitbox.h) {
        const directKey = `${enemy.id}:${attack.attackId}`;

        if (!this.enemyHitRegistry.has(directKey) && checkAABB(attack.hitbox, playerHurtbox)) {
          const didHit = player.takeHit(attack.damage, attack.knockbackX);

          if (didHit) {
            this.enemyHitRegistry.set(directKey, true);
            this.comboCount = 0;
            this.comboTimer = 0;
            this.gainRage(TAKEN_DAMAGE_RAGE_GAIN);

            hits.push({
              enemy,
              damage: attack.damage,
              source: "melee",
              x: playerHurtbox.x + playerHurtbox.w / 2,
              y: playerHurtbox.y + playerHurtbox.h * 0.28,
            });
          }
        }
      }

      for (const hazard of enemy.getHazards()) {
        if (this.hazardHitRegistry.has(hazard.hazardId)) {
          continue;
        }

        if (!checkAABB(hazard.hitbox, playerHurtbox)) {
          continue;
        }

        const didHit = player.takeHit(hazard.damage, hazard.knockbackX, {
          stagger: hazard.stagger !== false,
          knockbackVy: hazard.stagger === false ? 0 : -3,
          invincibleMs: hazard.stagger === false ? 420 : undefined,
        });

        if (!didHit) {
          continue;
        }

        this.hazardHitRegistry.add(hazard.hazardId);
        this.comboCount = 0;
        this.comboTimer = 0;
        this.gainRage(TAKEN_DAMAGE_RAGE_GAIN);

        if (hazard.consumeOnHit) {
          enemy.consumeHazard(hazard.hazardId);
        }

        hits.push({
          enemy,
          damage: hazard.damage,
          source: "hazard",
          x: playerHurtbox.x + playerHurtbox.w / 2,
          y: playerHurtbox.y + playerHurtbox.h * 0.28,
        });
      }
    }

    return hits;
  }

  update(dt, input = null, player = null, effects = null) {
    const events = {
      rageActivated: false,
      rageExpired: false,
    };

    if (this.comboCount > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);

      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    if (!this.rageActive && this.rage >= RAGE_MAX) {
      this.rageReadyTimer += dt;

      if (this.shouldTriggerRage(input) || this.rageReadyTimer >= RAGE_AUTO_TRIGGER_DELAY) {
        events.rageActivated = this.activateRage(player, effects);
      }
    } else if (!this.rageActive) {
      this.rageReadyTimer = 0;
    }

    if (!this.rageActive) {
      return events;
    }

    this.rageTimer = Math.max(0, this.rageTimer - dt);

    if (this.rageTimer <= 0) {
      this.rageActive = false;
      this.rageTimer = 0;
      events.rageExpired = true;
    }

    return events;
  }

  shouldTriggerRage(input) {
    if (!input) {
      return false;
    }

    const uppercutCombo =
      (input.isDown("KeyA") || input.isDown("KeyJ")) &&
      (input.isDown("KeyS") || input.isDown("KeyK")) &&
      (
        input.justPressed("KeyA") ||
        input.justPressed("KeyJ") ||
        input.justPressed("KeyS") ||
        input.justPressed("KeyK")
      );

    return uppercutCombo || input.justPressed("Space");
  }

  activateRage(player = null, effects = null) {
    if (this.rage < RAGE_MAX || this.rageActive) {
      return false;
    }

    this.rage = 0;
    this.rageActive = true;
    this.rageTimer = RAGE_DURATION;
    this.rageReadyTimer = 0;

    if (player && effects) {
      const active = player.getActiveCharacter();
      effects.addRageActivation(active.x + active.width / 2, active.y + active.height / 2);
    }

    return true;
  }

  getDamageMultiplier() {
    return this.rageActive ? 2 : 1;
  }
}
