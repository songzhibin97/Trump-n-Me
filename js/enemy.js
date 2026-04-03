import { BOSS_HP, FINAL_BOSS_HP, GROUND_Y, MINION_HP, WALK_LANE_MAX, WALK_LANE_MIN } from "./constants.js";
import { CUSTOM_ENEMY_ANIMATIONS } from "./sprite-config.js";
import { applyFriction, applyGravity, moveEntity } from "./physics.js";
import { drawSprite, getFrameCount, getFrameSource, getLoadedImage, getSpriteAnimation } from "./sprite-loader.js";

export const ENEMY_STATES = Object.freeze({
  IDLE: "IDLE",
  WALK: "WALK",
  ATTACK: "ATTACK",
  HIT: "HIT",
  LAUNCHED: "LAUNCHED",
  DEAD: "DEAD",
});

const HURT_QUOTES = ["Fake News!", "Wrong!", "Not fair!"];
const GOLF_HURT_QUOTES = ["FORE!", "That was out of bounds!"];
const TWITTER_HURT_QUOTES = ["My followers will hear about this!", "I'm being censored!"];
const FINAL_PHASE_QUOTES = Object.freeze({
  2: "You think this is over? I'm just getting started!",
  3: "MAKE AMERICA GREAT AGAIN!",
});
const LOOPING_STATES = new Set([ENEMY_STATES.IDLE, ENEMY_STATES.WALK]);
const STATE_TO_ANIM = {
  [ENEMY_STATES.IDLE]: "idle",
  [ENEMY_STATES.WALK]: "walk",
  [ENEMY_STATES.ATTACK]: "attack",
  [ENEMY_STATES.HIT]: "hit",
  [ENEMY_STATES.LAUNCHED]: "hit",
  [ENEMY_STATES.DEAD]: "dead",
};

const CUSTOM_ANIMATIONS = CUSTOM_ENEMY_ANIMATIONS;

const ENEMY_CONFIG = {
  minion: {
    displayName: "Trump Minion",
    sheetKey: "minion",
    hp: MINION_HP,
    scale: 0.38,
    width: 56,
    height: 92,
    footOffset: 90,
    shadowWidth: 64,
    shadowHeight: 11,
    chaseRange: 300,
    attackRange: 80,
    moveSpeed: 1.5,
    attackCooldown: 2100,
    attackDelayMin: 500,
    attackDelayMax: 1500,
    attackDamageMin: 10,
    attackDamageMax: 15,
    attackReach: 42,
    attackHeight: 72,
    attackOffsetY: 12,
    attackKnockbackX: 4,
    attackOriginInset: 14,
    hurtboxInsetX: 9,
    hurtboxInsetTop: 10,
    hurtboxInsetBottom: 8,
    deathHoldMs: 1000,
    maxConcurrentAttackers: 2,
    boss: false,
  },
  bodyguard: {
    displayName: "Bodyguard",
    sheetKey: "minion",
    animationSet: "bodyguard",
    hp: 80,
    scale: 0.45,
    width: 62,
    height: 100,
    footOffset: 96,
    shadowWidth: 72,
    shadowHeight: 12,
    chaseRange: 400,
    attackRange: 90,
    moveSpeed: 2,
    attackCooldown: 1750,
    attackDelayMin: 250,
    attackDelayMax: 650,
    attackDamageMin: 20,
    attackDamageMax: 20,
    attackReach: 56,
    attackHeight: 84,
    attackOffsetY: 8,
    attackKnockbackX: 7,
    attackOriginInset: 16,
    hurtboxInsetX: 10,
    hurtboxInsetTop: 10,
    hurtboxInsetBottom: 8,
    deathHoldMs: 1200,
    maxConcurrentAttackers: 2,
    boss: false,
  },
  phoneThrower: {
    displayName: "Phone Thrower",
    sheetKey: "minion",
    hp: 50,
    scale: 0.39,
    width: 56,
    height: 92,
    footOffset: 90,
    shadowWidth: 64,
    shadowHeight: 11,
    chaseRange: 520,
    attackRange: 320,
    moveSpeed: 1.8,
    attackCooldown: 3000,
    attackDelayMin: 200,
    attackDelayMax: 450,
    attackDamageMin: 12,
    attackDamageMax: 12,
    attackReach: 0,
    attackHeight: 0,
    attackOffsetY: 0,
    attackKnockbackX: 5,
    attackOriginInset: 16,
    hurtboxInsetX: 10,
    hurtboxInsetTop: 10,
    hurtboxInsetBottom: 8,
    deathHoldMs: 1000,
    preferredDistanceMin: 200,
    preferredDistanceMax: 300,
    projectileSpeed: 5.9,
    maxConcurrentAttackers: 1,
    boss: false,
  },
  miniBoss: {
    displayName: "Mini-Trump",
    sheetKey: "bosses",
    animationSet: "miniBoss",
    hp: BOSS_HP,
    scale: 0.54,
    width: 104,
    height: 144,
    footOffset: 118,
    shadowWidth: 104,
    shadowHeight: 14,
    chaseRange: 500,
    attackRange: 96,
    moveSpeed: 2,
    attackCooldown: 1500,
    attackDelayMin: 280,
    attackDelayMax: 720,
    attackDamageMin: 25,
    attackDamageMax: 25,
    attackReach: 68,
    attackHeight: 116,
    attackOffsetY: 16,
    attackKnockbackX: 7,
    attackOriginInset: 20,
    hurtboxInsetX: 14,
    hurtboxInsetTop: 14,
    hurtboxInsetBottom: 10,
    deathHoldMs: 1500,
    maxConcurrentAttackers: 1,
    boss: true,
  },
  golfBoss: {
    displayName: "Golf Trump",
    sheetKey: "bosses",
    animationSet: "golfBoss",
    hp: BOSS_HP,
    scale: 0.58,
    width: 110,
    height: 148,
    footOffset: 120,
    shadowWidth: 108,
    shadowHeight: 15,
    chaseRange: 620,
    attackRange: 132,
    moveSpeed: 2.1,
    attackCooldown: 1550,
    attackDelayMin: 220,
    attackDelayMax: 540,
    attackDamageMin: 30,
    attackDamageMax: 30,
    attackReach: 104,
    attackHeight: 120,
    attackOffsetY: 10,
    attackKnockbackX: 10,
    attackOriginInset: 20,
    hurtboxInsetX: 16,
    hurtboxInsetTop: 14,
    hurtboxInsetBottom: 10,
    deathHoldMs: 1600,
    projectileSpeed: 6.2,
    hurtQuotes: GOLF_HURT_QUOTES,
    maxConcurrentAttackers: 1,
    boss: true,
  },
  twitterBoss: {
    displayName: "Twitter Trump",
    sheetKey: "bosses",
    animationSet: "twitterBoss",
    hp: BOSS_HP,
    scale: 0.56,
    width: 108,
    height: 146,
    footOffset: 120,
    shadowWidth: 106,
    shadowHeight: 15,
    chaseRange: 660,
    attackRange: 340,
    moveSpeed: 2,
    attackCooldown: 1700,
    attackDelayMin: 200,
    attackDelayMax: 480,
    attackDamageMin: 10,
    attackDamageMax: 10,
    attackReach: 0,
    attackHeight: 0,
    attackOffsetY: 0,
    attackKnockbackX: 8,
    attackOriginInset: 20,
    hurtboxInsetX: 16,
    hurtboxInsetTop: 14,
    hurtboxInsetBottom: 10,
    deathHoldMs: 1600,
    projectileSpeed: 6.4,
    hurtQuotes: TWITTER_HURT_QUOTES,
    preferredDistanceMin: 180,
    preferredDistanceMax: 300,
    maxConcurrentAttackers: 1,
    boss: true,
  },
  finalBoss: {
    displayName: "Final Boss",
    sheetKey: "finalBoss",
    hp: FINAL_BOSS_HP,
    scale: 0.46,
    width: 108,
    height: 152,
    footOffset: 108,
    shadowWidth: 108,
    shadowHeight: 16,
    chaseRange: 620,
    attackRange: 120,
    moveSpeed: 2.15,
    attackCooldown: 1350,
    attackDelayMin: 180,
    attackDelayMax: 420,
    attackDamageMin: 25,
    attackDamageMax: 25,
    attackReach: 76,
    attackHeight: 124,
    attackOffsetY: 10,
    attackKnockbackX: 11,
    attackOriginInset: 22,
    hurtboxInsetX: 18,
    hurtboxInsetTop: 16,
    hurtboxInsetBottom: 12,
    deathHoldMs: 1800,
    maxConcurrentAttackers: 1,
    boss: true,
  },
};

let nextEnemyId = 1;
let nextHazardId = 1;

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.round(randomBetween(min, max));
}

function rotateVector(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function normalizeVector(dx, dy, speed) {
  const distance = Math.hypot(dx, dy) || 1;
  return {
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
  };
}

function clampLaneTarget(playerBaseY, offset, range) {
  return clamp(playerBaseY + clamp(offset, -range, range), WALK_LANE_MIN, WALK_LANE_MAX);
}

export class Enemy {
  constructor(type, x, y = null, options = {}) {
    const config = ENEMY_CONFIG[type];

    if (!config) {
      throw new Error(`Unsupported enemy type: ${type}`);
    }

    this.id = nextEnemyId++;
    this.type = type;
    this.x = x;
    this.baseY = y !== null ? y + config.height : GROUND_Y;
    this.y = y ?? this.baseY - config.height;
    this.vx = 0;
    this.vy = 0;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.state = ENEMY_STATES.IDLE;
    this.facingRight = false;
    this.animFrame = 0;
    this.animTime = 0;
    this.stateTimer = 0;
    this.invincibleTimer = 0;
    this.alive = true;
    this.sheetKey = config.sheetKey;
    this.animationSet = config.animationSet ?? null;
    this.scale = config.scale;
    this.width = config.width;
    this.height = config.height;
    this.footOffset = config.footOffset;
    this.shadowWidth = config.shadowWidth;
    this.shadowHeight = config.shadowHeight;
    this.onGround = true;
    this.bouncedOnce = false;
    this.removable = false;
    this.displayName = config.displayName;
    this.isBoss = config.boss;
    this.chaseRange = config.chaseRange;
    this.attackRange = config.attackRange;
    this.moveSpeed = config.moveSpeed;
    this.baseMoveSpeed = config.moveSpeed * randomBetween(0.85, 1.15);
    this.attackCooldownDuration = config.attackCooldown;
    this.attackCooldownTimer = randomBetween(0, config.attackCooldown * 0.6);
    this.attackDelayMin = config.attackDelayMin;
    this.attackDelayMax = config.attackDelayMax;
    this.attackPrepareTimer = 0;
    this.attackDamageMin = config.attackDamageMin;
    this.attackDamageMax = config.attackDamageMax;
    this.currentAttackDamage = config.attackDamageMin;
    this.attackReach = config.attackReach;
    this.attackHeight = config.attackHeight;
    this.attackOffsetY = config.attackOffsetY;
    this.attackKnockbackX = config.attackKnockbackX;
    this.attackOriginInset = config.attackOriginInset ?? 12;
    this.hurtboxInsetX = config.hurtboxInsetX ?? 8;
    this.hurtboxInsetTop = config.hurtboxInsetTop ?? 8;
    this.hurtboxInsetBottom = config.hurtboxInsetBottom ?? 6;
    this.deathHoldMs = config.deathHoldMs ?? 900;
    this.attackId = 0;
    this.entering = false;
    this.entranceTargetX = x;
    this.engaged = config.boss;
    this.speechText = "";
    this.speechTimer = 0;
    this.tintColor = config.tintColor ?? null;
    this.hurtQuotes = config.hurtQuotes ?? HURT_QUOTES;
    this.maxConcurrentAttackers = config.maxConcurrentAttackers ?? 2;
    this.preferredDistanceMin = config.preferredDistanceMin ?? 0;
    this.preferredDistanceMax = config.preferredDistanceMax ?? 0;
    this.projectileSpeed = config.projectileSpeed ?? 0;
    this.attackProfile = null;
    this.attackMarkersFired = new Set();
    this.attackCountsAsAttacker = false;
    this.hazards = [];
    this.pendingEvents = [];
    this.beamCooldownTimer = 0;
    this.slamCooldownTimer = 0;
    this.phase = 1;
    this.phaseTransitionTimer = 0;
    this.pendingPhase2Summon = false;
    this.phaseAura = false;
    this.options = options;
    this.repositionTimer = randomBetween(180, 520);
    this.laneOffset = randomBetween(-52, 52);
  }

  emit(event) {
    this.pendingEvents.push(event);
  }

  consumeEvents() {
    if (this.pendingEvents.length === 0) {
      return [];
    }

    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  getAnimationKey() {
    if (this.state === ENEMY_STATES.ATTACK && this.attackProfile?.animKey) {
      return this.attackProfile.animKey;
    }

    return STATE_TO_ANIM[this.state] ?? "idle";
  }

  getAnimation(animKey = this.getAnimationKey()) {
    if (this.animationSet && CUSTOM_ANIMATIONS[this.animationSet]?.[animKey]) {
      return CUSTOM_ANIMATIONS[this.animationSet][animKey];
    }

    return getSpriteAnimation(this.sheetKey, animKey);
  }

  getAttackDuration() {
    if (this.attackProfile?.duration) {
      return this.attackProfile.duration;
    }

    const animation = this.getAnimation(this.getAnimationKey());
    return animation.frames.length * animation.speed * 16;
  }

  setState(nextState, { resetAnim = true } = {}) {
    if (this.state === nextState) {
      return;
    }

    this.state = nextState;
    this.stateTimer = 0;

    if (resetAnim) {
      this.animTime = 0;
      this.animFrame = 0;
    }

    if (nextState === ENEMY_STATES.LAUNCHED) {
      this.bouncedOnce = false;
    }
  }

  beginBossEntrance(startX, targetX, text) {
    this.x = startX;
    this.entranceTargetX = targetX;
    this.entering = true;
    this.speak(text, 2200);
    this.setState(ENEMY_STATES.WALK);
    this.facingRight = false;
  }

  speak(text, duration = 900) {
    this.speechText = text;
    this.speechTimer = duration;
  }

  updateAnimFrame() {
    const animKey = this.getAnimationKey();
    const animation = this.getAnimation(animKey);
    const frameCount = animation.frames.length;
    const frameDuration = animation.speed * 16;
    const rawIndex = Math.floor(this.animTime / frameDuration);

    this.animFrame = LOOPING_STATES.has(this.state) ? rawIndex % frameCount : Math.min(rawIndex, frameCount - 1);

    if (this.state === ENEMY_STATES.DEAD && rawIndex >= frameCount - 1) {
      this.removable = this.animTime >= frameCount * frameDuration + this.deathHoldMs;
    }
  }

  startAttack(profile, battleContext = null) {
    this.attackProfile = {
      cooldown: this.attackCooldownDuration,
      countsAsAttacker: false,
      knockbackX: this.attackKnockbackX,
      hitWindow: [0.42, 0.72],
      ...profile,
    };
    this.currentAttackDamage = this.attackProfile.damage ?? this.currentAttackDamage;
    this.attackId += 1;
    this.attackMarkersFired.clear();
    this.attackCountsAsAttacker = this.attackProfile.countsAsAttacker === true;
    this.attackPrepareTimer = 0;
    this.setState(ENEMY_STATES.ATTACK);

    if (this.attackCountsAsAttacker && battleContext) {
      battleContext.activeAttackers += 1;
    }
  }

  finishAttack(battleContext = null) {
    if (this.attackCountsAsAttacker && battleContext) {
      battleContext.activeAttackers = Math.max(0, battleContext.activeAttackers - 1);
    }

    this.attackCooldownTimer = this.attackProfile?.cooldown ?? this.attackCooldownDuration;
    this.attackCountsAsAttacker = false;
    this.attackProfile = null;
    this.attackMarkersFired.clear();
    this.vx = 0;
    this.setState(ENEMY_STATES.IDLE);
  }

  getMoveSpeed() {
    if (this.type !== "finalBoss") {
      return this.baseMoveSpeed;
    }

    if (this.phase === 3) {
      return this.baseMoveSpeed * 1.3;
    }

    if (this.phase === 2) {
      return this.baseMoveSpeed * 1.15;
    }

    return this.baseMoveSpeed;
  }

  updateHazards(dt, effects) {
    const frameScale = dt / 16.6667;

    this.hazards = this.hazards.filter((hazard) => {
      hazard.life -= dt;

      if (hazard.life <= 0 || hazard.alive === false) {
        return false;
      }

      if (hazard.kind === "beam") {
        effects?.addBeamEffect(hazard.x1, hazard.y, hazard.x2, hazard.y);
        return true;
      }

      hazard.x += hazard.vx * frameScale;
      hazard.y += hazard.vy * frameScale;
      hazard.rotation = (hazard.rotation ?? 0) + (hazard.rotSpeed ?? 0) * frameScale;
      effects?.addProjectileTrail(hazard.x, hazard.y);

      return hazard.x > -240 && hazard.x < 5000 && hazard.y > -160 && hazard.y < 980;
    });
  }

  update(dt, player, battleContext = null, effects = null) {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const centerX = this.x + this.width / 2;
    const distance = Math.abs(playerCenterX - centerX);
    const direction = playerCenterX >= centerX ? 1 : -1;

    this.stateTimer += dt;
    this.animTime += dt;
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);
    this.beamCooldownTimer = Math.max(0, this.beamCooldownTimer - dt);
    this.slamCooldownTimer = Math.max(0, this.slamCooldownTimer - dt);
    this.speechTimer = Math.max(0, this.speechTimer - dt);
    this.updateHazards(dt, effects);

    if (this.state === ENEMY_STATES.DEAD) {
      applyFriction(this);

      if (!this.onGround) {
        applyGravity(this);
      }

      moveEntity(this);
      this.updateAnimFrame();
      return this.consumeEvents();
    }

    if (this.state === ENEMY_STATES.LAUNCHED) {
      applyFriction(this);
      applyGravity(this);
      moveEntity(this);

      if (this.onGround) {
        if (!this.bouncedOnce) {
          this.bouncedOnce = true;
          this.vy = -4.5;
          this.y -= 1;
          this.onGround = false;
        } else {
          this.vx *= 0.4;
          this.vy = 0;
          this.setState(ENEMY_STATES.HIT);
        }
      }

      this.updateAnimFrame();
      return this.consumeEvents();
    }

    if (this.state === ENEMY_STATES.HIT) {
      applyFriction(this);

      if (!this.onGround) {
        applyGravity(this);
      }

      moveEntity(this);

      if (this.stateTimer >= 300 && this.alive) {
        this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
      }

      this.updateAnimFrame();
      return this.consumeEvents();
    }

    if (this.entering) {
      const dx = this.entranceTargetX - this.x;
      this.facingRight = dx >= 0;
      this.vx = clamp(dx * 0.06, -this.getMoveSpeed() * 1.2, this.getMoveSpeed() * 1.2);
      moveEntity(this);

      if (Math.abs(dx) <= 6) {
        this.x = this.entranceTargetX;
        this.vx = 0;
        this.entering = false;
        this.setState(ENEMY_STATES.IDLE);
      } else {
        this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      }

      this.updateAnimFrame();
      return this.consumeEvents();
    }

    if (this.phaseTransitionTimer > 0) {
      this.phaseTransitionTimer = Math.max(0, this.phaseTransitionTimer - dt);
      applyFriction(this);
      moveEntity(this);

      this.updateAnimFrame();
      return this.consumeEvents();
    }

    this.facingRight = direction >= 0;

    if (distance <= this.chaseRange) {
      this.engaged = true;
    }

    if (this.state === ENEMY_STATES.ATTACK) {
      this.updateAttackState(dt, player, direction, battleContext, effects);
      this.updateAnimFrame();
      return this.consumeEvents();
    }

    switch (this.type) {
      case "bodyguard":
        this.updateBodyguardAI(distance, direction, player, battleContext);
        break;
      case "phoneThrower":
        this.updatePhoneThrowerAI(distance, direction, playerCenterY, battleContext);
        break;
      case "miniBoss":
        this.updateMiniBossAI(distance, direction, player, battleContext);
        break;
      case "golfBoss":
        this.updateGolfBossAI(distance, direction, playerCenterY, battleContext);
        break;
      case "twitterBoss":
        this.updateTwitterBossAI(distance, direction, playerCenterY, battleContext);
        break;
      case "finalBoss":
        this.updateFinalBossAI(distance, direction, battleContext);
        break;
      default:
        this.updateMinionAI(distance, direction, player, battleContext);
        break;
    }

    if (this.state === ENEMY_STATES.WALK && !this.entering) {
      const targetBaseY = player.baseY ?? GROUND_Y;
      const yDist = targetBaseY - this.baseY;
      if (Math.abs(yDist) > 3) {
        this.baseY += clamp(yDist * 0.05, -this.getMoveSpeed() * 0.45, this.getMoveSpeed() * 0.45);
      }
    }

    if (!this.onGround) {
      applyGravity(this);
    }

    moveEntity(this);

    if (Math.abs(this.vx) < 0.05) {
      this.vx = 0;
    }

    this.updateAnimFrame();
    return this.consumeEvents();
  }

  updateAttackState(dt, player, direction, battleContext, effects) {
    const profile = this.attackProfile;
    const duration = this.getAttackDuration();
    const progress = duration > 0 ? this.stateTimer / duration : 1;
    const playerCenterX = player.x + player.width / 2;
    const centerX = this.x + this.width / 2;
    const distance = Math.abs(playerCenterX - centerX);

    if (profile.mode === "dash" && progress <= 0.66) {
      this.vx = this.getMoveSpeed() * (profile.dashMultiplier ?? 3.6) * direction;
    } else {
      this.vx = 0;
    }

    if (profile.mode === "projectile" || profile.mode === "burstProjectile") {
      for (let index = 0; index < profile.fireAt.length; index += 1) {
        const marker = profile.fireAt[index];
        const markerKey = `fire-${index}`;

        if (progress >= marker && !this.attackMarkersFired.has(markerKey)) {
          this.attackMarkersFired.add(markerKey);

          if (profile.mode === "projectile") {
            this.spawnProjectileToward(player, {
              kind: profile.projectileKind,
              damage: profile.damage,
              speed: profile.projectileSpeed,
              spread: 0,
              yBias: profile.yBias ?? 0,
            });
          } else {
            const spread = profile.spreads?.[index] ?? 0;
            this.spawnProjectileToward(player, {
              kind: profile.projectileKind,
              damage: profile.damage,
              speed: profile.projectileSpeed,
              spread,
              yBias: profile.yBias ?? 0,
            });
          }
        }
      }
    }

    if (profile.mode === "beam" && progress >= profile.beamWindow[0] && progress <= profile.beamWindow[1]) {
      if (!this.attackMarkersFired.has("beam")) {
        this.attackMarkersFired.add("beam");
        this.spawnBeam(profile.damage);
        this.beamCooldownTimer = 4200;
        effects?.addBeamEffect(
          this.getMuzzlePosition().x,
          this.getMuzzlePosition().y,
          this.facingRight ? this.getMuzzlePosition().x + 1300 : this.getMuzzlePosition().x - 1300,
          this.getMuzzlePosition().y,
        );
      }
    }

    if (profile.mode === "slam" && progress >= profile.impactAt && !this.attackMarkersFired.has("slam")) {
      this.attackMarkersFired.add("slam");
      this.emit({
        type: "screenShake",
        intensity: profile.shakeIntensity ?? 14,
        duration: profile.shakeDuration ?? 300,
      });
    }

    if (!this.onGround) {
      applyGravity(this);
    }

    moveEntity(this);

    if (this.stateTimer >= duration) {
      if (
        (profile.comboStepsLeft ?? 0) > 0 &&
        distance <= (profile.chainRange ?? this.attackRange + 34)
      ) {
        this.attackProfile = {
          ...profile,
          comboStepsLeft: Math.max(0, (profile.comboStepsLeft ?? 1) - 1),
          cooldown: profile.finalCooldown ?? profile.cooldown,
        };
        this.attackId += 1;
        this.attackMarkersFired.clear();
        this.stateTimer = 0;
        this.animTime = 0;
        this.animFrame = 0;
        this.vx = 0;
        return;
      }

      if (profile.mode === "slam") {
        this.slamCooldownTimer = profile.extraCooldown ?? 2600;
      }

      this.finishAttack(battleContext);
    }
  }

  updateMinionAI(distance, direction, player, battleContext) {
    const playerBaseY = player.baseY ?? GROUND_Y;
    const laneSpeed = this.getMoveSpeed() * 0.55;
    this.repositionTimer = Math.max(0, this.repositionTimer - 16.6667);

    if (this.repositionTimer <= 0) {
      this.laneOffset = randomBetween(-24, 24);
      this.repositionTimer = randomBetween(180, 520);
    }

    const targetBaseY = clampLaneTarget(playerBaseY, this.laneOffset, 24);
    const laneDelta = targetBaseY - this.baseY;
    const adjustLane = (multiplier = 1) => {
      if (Math.abs(laneDelta) <= 3) {
        return;
      }

      this.baseY += clamp(laneDelta * 0.08, -laneSpeed * multiplier, laneSpeed * multiplier);
    };

    if (!this.engaged && distance <= 900) {
      this.vx = this.getMoveSpeed() * direction;
      adjustLane(0.8);
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    if (distance > this.chaseRange) {
      this.attackPrepareTimer = 0;
      applyFriction(this);
      adjustLane(0.55);
      this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
      return;
    }

    if (distance > this.attackRange + 14) {
      this.attackPrepareTimer = 0;
      this.vx = this.getMoveSpeed() * direction * (distance > this.attackRange + 72 ? 1.12 : 0.9);
      adjustLane();
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    if (this.attackCooldownTimer > 0) {
      this.attackPrepareTimer = 0;
      const retreatThreshold = Math.max(this.attackRange * 0.76, this.attackRange - 10);
      const pressureThreshold = this.attackRange + 42;

      if (distance < retreatThreshold) {
        this.vx = this.getMoveSpeed() * -direction * 0.62;
      } else if (distance > pressureThreshold) {
        this.vx = this.getMoveSpeed() * direction * 0.72;
      } else {
        this.vx = Math.abs(laneDelta) > 10 ? this.getMoveSpeed() * 0.22 * Math.sign(laneDelta) : 0;
      }

      adjustLane();
      this.setState(Math.abs(this.vx) > 0.08 || Math.abs(laneDelta) > 8 ? ENEMY_STATES.WALK : ENEMY_STATES.IDLE, {
        resetAnim: false,
      });
      return;
    }

    if (this.attackPrepareTimer <= 0) {
      const activeAttackers = battleContext?.activeAttackers ?? 0;

      if (activeAttackers < this.maxConcurrentAttackers) {
        this.attackPrepareTimer = randomBetween(140, 360);
      }

      this.vx = 0;
      adjustLane(0.75);
      this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
      return;
    }

    this.attackPrepareTimer -= 16.6667;

    if (this.attackPrepareTimer <= 0 && (battleContext?.activeAttackers ?? 0) < this.maxConcurrentAttackers) {
      const damage = randomInt(this.attackDamageMin, this.attackDamageMax);
      const shouldDash = distance > this.attackRange * 0.94 && Math.random() > 0.58;
      const profile = shouldDash
        ? this.createMeleeProfile(damage, this.attackReach + 12, this.attackHeight, this.attackOffsetY, this.attackKnockbackX + 2, {
            mode: "dash",
            dashMultiplier: 1.9,
            hitWindow: [0.26, 0.56],
            cooldown: 1500,
            comboStepsLeft: 1,
            chainRange: this.attackRange + 18,
            finalCooldown: 1750,
          })
        : this.createMeleeProfile(damage, this.attackReach, this.attackHeight, this.attackOffsetY, this.attackKnockbackX, {
            hitWindow: [0.48, 0.74],
            cooldown: 1350,
            comboStepsLeft: 1,
            finalCooldown: 1650,
          });

      this.startAttack(profile, battleContext);
      return;
    }

    this.vx = distance < this.attackRange * 0.82 ? this.getMoveSpeed() * -direction * 0.24 : this.getMoveSpeed() * direction * 0.2;
    adjustLane(0.85);
    this.setState(ENEMY_STATES.WALK, { resetAnim: false });
  }

  updateBodyguardAI(distance, direction, player, battleContext) {
    const playerBaseY = player.baseY ?? GROUND_Y;
    this.repositionTimer = Math.max(0, this.repositionTimer - 16.6667);

    if (this.repositionTimer <= 0) {
      this.laneOffset = randomBetween(-16, 16);
      this.repositionTimer = randomBetween(320, 760);
    }

    const targetBaseY = clampLaneTarget(playerBaseY, this.laneOffset, 16);
    const laneDelta = targetBaseY - this.baseY;
    const adjustLane = (multiplier = 1) => {
      if (Math.abs(laneDelta) <= 3) {
        return;
      }

      this.baseY += clamp(laneDelta * 0.06, -this.getMoveSpeed() * 0.28 * multiplier, this.getMoveSpeed() * 0.28 * multiplier);
    };

    if (distance > this.chaseRange) {
      this.attackPrepareTimer = 0;
      this.vx = 0;
      adjustLane(0.6);
      this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
      return;
    }

    if (distance > this.attackRange + 36) {
      this.attackPrepareTimer = 0;
      this.vx = this.getMoveSpeed() * direction * 0.88;
      adjustLane();
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    if (this.attackCooldownTimer > 0) {
      this.attackPrepareTimer = 0;
      this.vx = Math.abs(laneDelta) > 10 ? this.getMoveSpeed() * 0.16 * Math.sign(laneDelta) : 0;
      adjustLane();
      this.setState(Math.abs(this.vx) > 0.08 ? ENEMY_STATES.WALK : ENEMY_STATES.IDLE, { resetAnim: false });
      return;
    }

    if (this.attackPrepareTimer <= 0) {
      if ((battleContext?.activeAttackers ?? 0) < this.maxConcurrentAttackers) {
        this.attackPrepareTimer = randomBetween(260, 520);
      }

      this.vx = 0;
      adjustLane(0.7);
      this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
      return;
    }

    this.attackPrepareTimer -= 16.6667;

    if (this.attackPrepareTimer <= 0 && (battleContext?.activeAttackers ?? 0) < this.maxConcurrentAttackers) {
      const profile =
        distance > this.attackRange * 0.86
          ? this.createMeleeProfile(24, 88, 92, 4, 10, {
              mode: "dash",
              dashMultiplier: 2.35,
              hitWindow: [0.24, 0.54],
              cooldown: 2100,
              comboStepsLeft: 1,
              chainRange: this.attackRange + 26,
              finalCooldown: 2400,
              superArmor: true,
              armorDamageMult: 0.5,
            })
          : this.createMeleeProfile(20, 72, 88, 8, 8, {
              hitWindow: [0.34, 0.62],
              cooldown: 1850,
              comboStepsLeft: 1,
              finalCooldown: 2150,
              superArmor: true,
              armorDamageMult: 0.55,
            });
      this.startAttack(profile, battleContext);
      return;
    }

    this.vx = 0;
    adjustLane(0.8);
    this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
  }

  updateMiniBossAI(distance, direction, player, battleContext) {
    const playerBaseY = player.baseY ?? GROUND_Y;
    this.repositionTimer = Math.max(0, this.repositionTimer - 16.6667);

    if (this.repositionTimer <= 0) {
      this.laneOffset = randomBetween(-12, 12);
      this.repositionTimer = randomBetween(220, 540);
    }

    const targetBaseY = clampLaneTarget(playerBaseY, this.laneOffset, 12);
    const laneDelta = targetBaseY - this.baseY;
    const adjustLane = () => {
      if (Math.abs(laneDelta) <= 2) {
        return;
      }

      this.baseY += clamp(laneDelta * 0.08, -this.getMoveSpeed() * 0.34, this.getMoveSpeed() * 0.34);
    };

    if (distance > this.attackRange + 54) {
      this.attackPrepareTimer = 0;
      this.vx = this.getMoveSpeed() * direction * 1.08;
      adjustLane();
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    if (this.attackCooldownTimer > 0) {
      this.attackPrepareTimer = 0;
      this.vx = distance < this.attackRange * 0.78 ? this.getMoveSpeed() * -direction * 0.24 : 0;
      adjustLane();
      this.setState(Math.abs(this.vx) > 0.08 ? ENEMY_STATES.WALK : ENEMY_STATES.IDLE, { resetAnim: false });
      return;
    }

    if (this.attackPrepareTimer <= 0) {
      this.attackPrepareTimer = randomBetween(180, 360);
      this.vx = 0;
      this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
      return;
    }

    this.attackPrepareTimer -= 16.6667;

    if (this.attackPrepareTimer <= 0) {
      const profile =
        distance < this.attackRange * 0.92 && Math.random() > 0.52
          ? {
              mode: "slam",
              animKey: "attack",
              damage: 28,
              reach: 116,
              height: 118,
              offsetY: 8,
              knockbackX: 10,
              centeredHitbox: true,
              hitWindow: [0.42, 0.72],
              impactAt: 0.48,
              cooldown: 1950,
              shakeIntensity: 10,
              comboStepsLeft: 1,
              chainRange: this.attackRange + 18,
              finalCooldown: 2200,
              superArmor: true,
              armorDamageMult: 0.5,
            }
          : this.createMeleeProfile(24, 84, 112, 12, 9, {
              mode: "dash",
              dashMultiplier: 2.6,
              hitWindow: [0.24, 0.6],
              cooldown: 1650,
              comboStepsLeft: 1,
              chainRange: this.attackRange + 24,
              finalCooldown: 1950,
              superArmor: true,
              armorDamageMult: 0.45,
            });
      this.startAttack(profile, battleContext);
      return;
    }

    this.vx = 0;
    adjustLane();
    this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
  }

  updatePhoneThrowerAI(distance, direction, playerCenterY, battleContext) {
    if (this.attackCooldownTimer <= 0 && distance <= this.chaseRange) {
      if (this.attackPrepareTimer <= 0) {
        this.attackPrepareTimer = randomBetween(160, 340);
      } else {
        this.attackPrepareTimer -= 16.6667;

        if (this.attackPrepareTimer <= 0) {
          this.startAttack(
            {
              mode: "burstProjectile",
              animKey: "attack",
              damage: 9,
              projectileKind: "phone",
              projectileSpeed: this.projectileSpeed * 0.88,
              fireAt: [0.34, 0.56],
              spreads: [-0.08, 0.08],
              yBias: clamp(playerCenterY - (this.y + this.height * 0.35), -28, 28),
              cooldown: 2850,
            },
            battleContext,
          );
          return;
        }
      }
    }

    if (distance < this.preferredDistanceMin) {
      this.vx = this.getMoveSpeed() * -direction * 1.12;
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    if (distance > this.preferredDistanceMax && distance <= this.chaseRange) {
      this.vx = this.getMoveSpeed() * direction * 0.84;
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    this.vx = 0;
    this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
  }

  updateGolfBossAI(distance, direction, playerCenterY, battleContext) {
    const orbitDir = (Math.floor(this.id + this.stateTimer / 420) % 2 === 0 ? 1 : -1);

    if (distance > this.chaseRange) {
      this.vx = 0;
      this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
      return;
    }

    if (this.attackCooldownTimer <= 0) {
      if (this.attackPrepareTimer <= 0) {
        this.attackPrepareTimer = randomBetween(this.attackDelayMin, this.attackDelayMax);
      } else {
        this.attackPrepareTimer -= 16.6667;

        if (this.attackPrepareTimer <= 0) {
          if (distance <= 128 && Math.random() > 0.42) {
            this.startAttack(
              this.createMeleeProfile(30, 98, 124, 12, 10, {
                hitWindow: [0.28, 0.64],
                cooldown: 1700,
                comboStepsLeft: 1,
                finalCooldown: 2000,
                superArmor: true,
                armorDamageMult: 0.55,
              }),
              battleContext,
            );
          } else {
            this.startAttack(
              {
                mode: distance > 240 ? "burstProjectile" : "projectile",
                animKey: "ranged",
                damage: 15,
                projectileKind: "golfBall",
                projectileSpeed: this.projectileSpeed,
                fireAt: distance > 240 ? [0.24, 0.38, 0.52] : [0.45],
                spreads: distance > 240 ? [-0.14, 0, 0.14] : undefined,
                yBias: playerCenterY - (this.y + this.height * 0.38),
                cooldown: distance > 240 ? 2200 : 1750,
              },
              battleContext,
            );
          }
          return;
        }
      }
    }

    if (distance < 138) {
      this.vx = this.getMoveSpeed() * -direction * 0.72;
      this.baseY = clamp(this.baseY + orbitDir * 0.26, WALK_LANE_MIN, WALK_LANE_MAX);
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    if (distance > 280) {
      this.vx = this.getMoveSpeed() * direction * 0.82;
      this.baseY = clamp(this.baseY + orbitDir * 0.22, WALK_LANE_MIN, WALK_LANE_MAX);
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    if (distance > 190) {
      this.vx = orbitDir * this.getMoveSpeed() * 0.24;
      this.baseY = clamp(this.baseY + orbitDir * 0.28, WALK_LANE_MIN, WALK_LANE_MAX);
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    this.vx = 0;
    this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
  }

  updateTwitterBossAI(distance, direction, playerCenterY, battleContext) {
    if (this.attackCooldownTimer <= 0 && distance <= this.chaseRange) {
      if (this.attackPrepareTimer <= 0) {
        this.attackPrepareTimer = randomBetween(140, 320);
      } else {
        this.attackPrepareTimer -= 16.6667;

        if (this.attackPrepareTimer <= 0) {
          if (this.beamCooldownTimer <= 0 && distance >= 220 && distance <= 360) {
            this.startAttack(
              {
                mode: "beam",
                animKey: "attack",
                damage: 35,
                beamWindow: [0.34, 0.82],
                cooldown: 3100,
              },
              battleContext,
            );
          } else {
            this.startAttack(
              {
                mode: "burstProjectile",
                animKey: "attack",
                damage: 9,
                projectileKind: "phone",
                projectileSpeed: this.projectileSpeed * 0.92,
                fireAt: [0.2, 0.34, 0.48, 0.62],
                spreads: [-0.22, -0.08, 0.08, 0.22],
                yBias: clamp(playerCenterY - (this.y + this.height * 0.38), -36, 36),
                cooldown: 2550,
              },
              battleContext,
            );
          }
          return;
        }
      }
    }

    if (distance < this.preferredDistanceMin) {
      this.vx = this.getMoveSpeed() * -direction * 1.18;
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    if (distance > this.preferredDistanceMax) {
      this.vx = this.getMoveSpeed() * direction * 0.82;
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    if (Math.abs((playerCenterY - (this.y + this.height * 0.4))) > 28) {
      this.baseY = clamp(this.baseY + clamp((playerCenterY - (this.y + this.height * 0.4)) * 0.03, -0.6, 0.6), WALK_LANE_MIN, WALK_LANE_MAX);
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    this.vx = 0;
    this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
  }

  updateFinalBossAI(distance, direction, battleContext) {
    const phaseOne = this.phase === 1;
    const phaseTwo = this.phase === 2;

    if (this.attackCooldownTimer <= 0) {
      if (this.attackPrepareTimer <= 0) {
        this.attackPrepareTimer = randomBetween(
          phaseOne ? 220 : phaseTwo ? 160 : 100,
          phaseOne ? 420 : phaseTwo ? 280 : 180,
        );
      } else {
        this.attackPrepareTimer -= 16.6667;

        if (this.attackPrepareTimer <= 0) {
          this.startAttack(this.chooseFinalBossAttack(distance), battleContext);
          return;
        }
      }
    }

    if (distance > this.attackRange + (phaseOne ? 50 : phaseTwo ? 34 : 18)) {
      this.vx = this.getMoveSpeed() * direction * (phaseOne ? 0.92 : phaseTwo ? 1.08 : 1.2);
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    if (!phaseOne && distance < this.attackRange * 0.78) {
      this.vx = this.getMoveSpeed() * -direction * (phaseTwo ? 0.18 : 0.28);
      this.setState(ENEMY_STATES.WALK, { resetAnim: false });
      return;
    }

    this.vx = 0;
    this.setState(ENEMY_STATES.IDLE, { resetAnim: false });
  }

  chooseFinalBossAttack(distance) {
    const baseCooldown = this.phase === 3 ? 900 : this.phase === 2 ? 1100 : 1350;

    if (this.phase === 1) {
      if (this.slamCooldownTimer <= 0 && (distance < 156 || Math.random() > 0.58)) {
        return {
          mode: "slam",
          animKey: "attack",
          damage: 28,
          reach: 148,
          height: 140,
          offsetY: 4,
          knockbackX: 14,
          centeredHitbox: true,
          hitWindow: [0.46, 0.7],
          impactAt: 0.54,
          cooldown: 1650,
          shakeIntensity: 15,
          extraCooldown: 3000,
          comboStepsLeft: 1,
          finalCooldown: 2100,
          superArmor: true,
          armorDamageMult: 0.48,
        };
      }

      return this.createMeleeProfile(25, 78, 126, 10, 11, {
        hitWindow: [0.32, 0.74],
        cooldown: baseCooldown,
        comboStepsLeft: 1,
        finalCooldown: 1650,
        superArmor: true,
        armorDamageMult: 0.52,
      });
    }

    if (this.phase === 2) {
      if (distance > 170 && Math.random() > 0.36) {
        return {
          mode: "dash",
          animKey: "attack",
          damage: 28,
          reach: 132,
          height: 134,
          offsetY: 6,
          knockbackX: 15,
          hitWindow: [0.22, 0.62],
          dashMultiplier: 3.2,
          cooldown: 1150,
          comboStepsLeft: 1,
          finalCooldown: 1450,
          superArmor: true,
          armorDamageMult: 0.42,
        };
      }

      if (this.slamCooldownTimer <= 0 && Math.random() > 0.3) {
        return {
          mode: "slam",
          animKey: "attack",
          damage: 32,
          reach: 188,
          height: 150,
          offsetY: -6,
          knockbackX: 15,
          centeredHitbox: true,
          hitWindow: [0.42, 0.72],
          impactAt: 0.5,
          cooldown: 1250,
          shakeIntensity: 18,
          extraCooldown: 2600,
          comboStepsLeft: 1,
          finalCooldown: 1500,
          superArmor: true,
          armorDamageMult: 0.42,
        };
      }

      return this.createMeleeProfile(25, 84, 128, 10, 12, {
        hitWindow: [0.3, 0.74],
        cooldown: baseCooldown,
        comboStepsLeft: 1,
        finalCooldown: 1500,
        superArmor: true,
        armorDamageMult: 0.46,
      });
    }

    if (distance > 138 || Math.random() > 0.38) {
      return {
        mode: "dash",
        animKey: "attack",
        damage: 30,
        reach: 118,
        height: 124,
        offsetY: 8,
        knockbackX: 18,
        hitWindow: [0.18, 0.66],
        dashMultiplier: 3.4,
        cooldown: baseCooldown,
        comboStepsLeft: 1,
        finalCooldown: 1350,
        superArmor: true,
        armorDamageMult: 0.36,
      };
    }

    if (this.slamCooldownTimer <= 0 && Math.random() > 0.44) {
      return {
        mode: "slam",
        animKey: "attack",
        damage: 34,
        reach: 206,
        height: 154,
        offsetY: -10,
        knockbackX: 16,
        centeredHitbox: true,
        hitWindow: [0.4, 0.72],
        impactAt: 0.48,
        cooldown: 1000,
        shakeIntensity: 20,
        extraCooldown: 2200,
        comboStepsLeft: 1,
        finalCooldown: 1400,
        superArmor: true,
        armorDamageMult: 0.34,
      };
    }

    return this.createMeleeProfile(25, 88, 128, 8, 13, {
      hitWindow: [0.26, 0.72],
      cooldown: baseCooldown,
      comboStepsLeft: 2,
      finalCooldown: 1450,
      superArmor: true,
      armorDamageMult: 0.38,
    });
  }

  createMeleeProfile(damage, reach, height, offsetY, knockbackX, overrides = {}) {
    return {
      mode: "melee",
      animKey: "attack",
      damage,
      reach,
      height,
      offsetY,
      knockbackX,
      countsAsAttacker: true,
      ...overrides,
    };
  }

  getMuzzlePosition() {
    return {
      x: this.facingRight ? this.x + this.width + 6 : this.x - 6,
      y: this.y + this.height * 0.42,
    };
  }

  spawnProjectileToward(player, { kind, damage, speed, spread = 0, yBias = 0 }) {
    const origin = this.getMuzzlePosition();
    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height * 0.35 + yBias * 0.12;
    const base = normalizeVector(targetX - origin.x, targetY - origin.y, speed);
    const rotated = rotateVector(base.vx, base.vy, spread);

    this.hazards.push({
      id: nextHazardId++,
      kind: "projectile",
      projectileKind: kind,
      x: origin.x,
      y: origin.y,
      vx: rotated.x,
      vy: rotated.y,
      rotation: 0,
      rotSpeed: kind === "phone" ? 0.24 : 0.08,
      radius: kind === "golfBall" ? 9 : 12,
      damage,
      knockbackX: kind === "phone" ? (rotated.x >= 0 ? 1 : -1) : rotated.x >= 0 ? 6 : -6,
      stagger: kind === "phone" ? false : true,
      life: 2200,
      alive: true,
      consumeOnHit: true,
    });
  }

  spawnBeam(damage) {
    const origin = this.getMuzzlePosition();
    this.hazards.push({
      id: nextHazardId++,
      kind: "beam",
      x1: origin.x,
      x2: this.facingRight ? origin.x + 1300 : origin.x - 1300,
      y: origin.y,
      height: 46,
      damage,
      knockbackX: this.facingRight ? 12 : -12,
      life: 260,
      alive: true,
      consumeOnHit: false,
    });
  }

  draw(ctx, drawScaledSpriteFn = null) {
    const animKey = this.getAnimationKey();
    const animation = this.getAnimation(animKey);
    const frame = animation.frames[Math.max(0, Math.floor(this.animFrame)) % animation.frames.length];
    const source = getFrameSource(frame);
    const anchorX = this.x + this.width / 2;
    const anchorY = this.baseY;
    const renderTop = anchorY - frame.h * this.scale + source.dy * this.scale;

    ctx.save();

    if (this.type === "finalBoss" && this.phase === 3) {
      ctx.shadowColor = "rgba(255, 128, 48, 0.92)";
      ctx.shadowBlur = 28 + Math.sin(this.animTime / 70) * 8;
    }

    if (drawScaledSpriteFn && !this.animationSet) {
      drawScaledSpriteFn(this.sheetKey, animKey, this.animFrame, anchorX, anchorY, this.scale, !this.facingRight);
    } else if (this.animationSet) {
      const image = getLoadedImage(this.sheetKey);

      if (image) {
        const dx = Math.round(anchorX - frame.w * this.scale * 0.5);
        const dy = Math.round(anchorY - frame.h * this.scale);
        ctx.translate(dx, dy);
        ctx.scale(this.scale, this.scale);

        if (!this.facingRight) {
          ctx.translate(frame.w, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(
          image,
          source.sx,
          source.sy,
          source.sw,
          source.sh,
          this.facingRight ? source.dx : frame.w - source.dx - source.sw,
          source.dy,
          source.sw,
          source.sh,
        );
      }
    } else {
      ctx.translate(
        Math.round(anchorX - frame.w * this.scale * 0.5),
        Math.round(anchorY - frame.h * this.scale),
      );
      ctx.scale(this.scale, this.scale);
      drawSprite(ctx, this.sheetKey, animKey, this.animFrame, 0, 0, !this.facingRight);
    }

    if (this.tintColor) {
      const source = getFrameSource(frame);
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = this.tintColor;
      ctx.fillRect(0, 0, source.sw, source.sh);
    }

    ctx.restore();

    this.drawHazards(ctx);

    if (this.alive && !this.isBoss) {
      const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
      const barWidth = 56;
      const barX = this.x + (this.width - barWidth) / 2;
      const barY = renderTop - 10;

      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(barX - 1, barY - 1, barWidth + 2, 6);
      ctx.fillStyle = "#3f1010";
      ctx.fillRect(barX, barY, barWidth, 4);
      ctx.fillStyle = this.type === "bodyguard" ? "#ff9d4d" : this.type === "phoneThrower" ? "#5ad4ff" : "#ff4d4d";
      ctx.fillRect(barX, barY, barWidth * ratio, 4);
      ctx.restore();
    }

    if (this.speechTimer > 0 && this.speechText) {
      this.drawSpeechBubble(ctx);
    }
  }

  drawHazards(ctx) {
    for (const hazard of this.hazards) {
      if (hazard.kind !== "projectile") {
        continue;
      }

      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.rotate(hazard.rotation ?? 0);

      if (hazard.projectileKind === "golfBall") {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(160, 160, 160, 0.65)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-2, -1, 2.2, 0, Math.PI * 2);
        ctx.arc(2, 2, 1.6, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#49c6ff";
        ctx.strokeStyle = "#d9f6ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-8, -13, 16, 26, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#0b1b2f";
        ctx.fillRect(-5, -9, 10, 16);
      }

      ctx.restore();
    }
  }

  drawSpeechBubble(ctx) {
    const bubbleWidth = Math.max(124, this.speechText.length * 9);
    const bubbleX = this.x + this.width / 2 - bubbleWidth / 2;
    const bubbleY = this.y - 48;

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, 34, 10);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2 - 10, bubbleY + 34);
    ctx.lineTo(this.x + this.width / 2 + 4, bubbleY + 34);
    ctx.lineTo(this.x + this.width / 2 - 4, bubbleY + 48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#2a0000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '900 16px "Impact", "Arial Black", sans-serif';
    ctx.fillText(this.speechText, bubbleX + bubbleWidth / 2, bubbleY + 17);
    ctx.restore();
  }

  getAttackInfo() {
    if (!this.alive || this.state !== ENEMY_STATES.ATTACK || !this.attackProfile) {
      return null;
    }

    if (!["melee", "slam", "dash"].includes(this.attackProfile.mode)) {
      return null;
    }

    const duration = this.getAttackDuration();
    const progress = duration > 0 ? this.stateTimer / duration : 0;
    const [windowStart, windowEnd] = this.attackProfile.hitWindow ?? [0.42, 0.72];

    if (progress < windowStart || progress > windowEnd) {
      return null;
    }

    const reach = this.attackProfile.reach ?? this.attackReach;
    const height = this.attackProfile.height ?? this.attackHeight;
    const offsetY = this.attackProfile.offsetY ?? this.attackOffsetY;
    const knockbackX = this.attackProfile.knockbackX ?? this.attackKnockbackX;
    const centered = this.attackProfile.centeredHitbox === true;
    const originInset = this.attackProfile.originInset ?? this.attackOriginInset;
    const hitboxX = centered
      ? this.x + (this.width - reach) / 2
      : this.facingRight
        ? this.x + this.width - originInset
        : this.x - reach + originInset;

    return {
      attackId: this.attackId,
      damage: this.attackProfile.damage ?? this.currentAttackDamage,
      knockbackX: this.facingRight ? knockbackX : -knockbackX,
      hitbox: {
        x: hitboxX,
        y: this.y + offsetY,
        w: reach,
        h: height,
      },
    };
  }

  getHazards() {
    return this.hazards
      .filter((hazard) => hazard.alive !== false)
      .map((hazard) => {
        if (hazard.kind === "beam") {
          return {
            hazardId: hazard.id,
            damage: hazard.damage,
            knockbackX: hazard.knockbackX,
            consumeOnHit: hazard.consumeOnHit,
            hitbox: {
              x: Math.min(hazard.x1, hazard.x2),
              y: hazard.y - hazard.height / 2,
              w: Math.abs(hazard.x2 - hazard.x1),
              h: hazard.height,
            },
          };
        }

        const radius = hazard.radius ?? 10;
        return {
          hazardId: hazard.id,
          damage: hazard.damage,
          knockbackX: hazard.knockbackX,
          consumeOnHit: hazard.consumeOnHit,
          hitbox: {
            x: hazard.x - radius,
            y: hazard.y - radius,
            w: radius * 2,
            h: radius * 2,
          },
        };
      });
  }

  consumeHazard(hazardId) {
    const hazard = this.hazards.find((entry) => entry.id === hazardId);

    if (hazard) {
      hazard.alive = false;
    }
  }

  getHurtbox() {
    const insetX = Math.min(this.hurtboxInsetX, Math.max(0, this.width / 2 - 8));
    const insetTop = Math.min(this.hurtboxInsetTop, Math.max(0, this.height - 24));
    const insetBottom = Math.min(this.hurtboxInsetBottom, Math.max(0, this.height - insetTop - 16));

    return {
      x: this.x + insetX,
      y: this.y + insetTop,
      w: Math.max(18, this.width - insetX * 2),
      h: Math.max(22, this.height - insetTop - insetBottom),
    };
  }

  triggerPhaseTransition(nextPhase) {
    this.phase = nextPhase;
    this.phaseTransitionTimer = 1100;
    this.invincibleTimer = 1200;
    this.attackPrepareTimer = 0;
    this.attackCooldownTimer = 900;
    this.attackProfile = null;
    this.attackCountsAsAttacker = false;
    this.attackMarkersFired.clear();
    this.vx = 0;
    this.vy = 0;
    this.setState(ENEMY_STATES.IDLE);
    this.phaseAura = nextPhase >= 3;

    const text = FINAL_PHASE_QUOTES[nextPhase];
    this.speak(text, 2000);
    this.emit({
      type: "bossPhaseTransition",
      phase: nextPhase,
      text,
      x: this.x + this.width / 2,
      y: this.y - 16,
    });

    if (nextPhase === 2) {
      this.pendingPhase2Summon = false;
      this.emit({
        type: "spawnMinions",
        enemies: [
          { type: "minion", x: this.x - 150 },
          { type: "minion", x: this.x + 150 },
        ],
      });
      this.emit({ type: "screenShake", intensity: 14, duration: 280 });
    }
  }

  takeHit(damage, knockbackX, knockbackY, attackType) {
    if (!this.alive || this.state === ENEMY_STATES.DEAD || this.invincibleTimer > 0) {
      return { killed: false, damage: 0, quote: null, phaseTransition: null, finalBossDefeated: false };
    }

    const armoredHit =
      this.state === ENEMY_STATES.ATTACK &&
      this.attackProfile?.superArmor === true &&
      attackType !== "uppercut";
    const finalDamage = armoredHit
      ? Math.max(1, Math.round(damage * (this.attackProfile.armorDamageMult ?? 0.6)))
      : damage;
    const prevHp = this.hp;
    this.hp = Math.max(0, this.hp - finalDamage);
    this.vx = knockbackX;
    this.vy = knockbackY;
    this.onGround = knockbackY >= 0;

    let quote = null;
    let phaseTransition = null;

    if (this.hp <= 0) {
      this.alive = false;
      this.setState(ENEMY_STATES.DEAD);

      if (this.type === "finalBoss") {
        this.emit({
          type: "finalBossDefeated",
          x: this.x + this.width / 2,
          y: this.y + this.height * 0.4,
        });
      }

      return {
        killed: true,
        damage: finalDamage,
        quote,
        phaseTransition,
        finalBossDefeated: this.type === "finalBoss",
      };
    }

    if (this.type === "finalBoss") {
      const phaseTwoThreshold = this.maxHp * 0.6;
      const phaseThreeThreshold = this.maxHp * 0.3;

      if (prevHp > phaseTwoThreshold && this.hp <= phaseTwoThreshold) {
        this.triggerPhaseTransition(2);
        phaseTransition = { phase: 2, text: FINAL_PHASE_QUOTES[2] };
      } else if (prevHp > phaseThreeThreshold && this.hp <= phaseThreeThreshold) {
        this.triggerPhaseTransition(3);
        phaseTransition = { phase: 3, text: FINAL_PHASE_QUOTES[3] };
      }
    }

    if (!phaseTransition && !armoredHit) {
      this.invincibleTimer = 300;

      if (attackType === "uppercut") {
        this.setState(ENEMY_STATES.LAUNCHED);
        this.onGround = false;
      } else {
        this.setState(ENEMY_STATES.HIT);
      }
    }

    if (armoredHit) {
      this.invincibleTimer = Math.max(this.invincibleTimer, 90);
      this.vx *= 0.25;
      this.vy = Math.min(0, this.vy);
      quote = quote ?? "Not enough!";
    }

    if (this.isBoss && Math.random() < 0.34) {
      quote = this.hurtQuotes[Math.floor(Math.random() * this.hurtQuotes.length)];
      this.speak(quote, 900);
    }

    this.engaged = true;

    return {
      killed: false,
      damage: finalDamage,
      quote,
      phaseTransition,
      finalBossDefeated: false,
    };
  }

  getBossPhase() {
    return this.type === "finalBoss" ? this.phase : null;
  }

  isBossEnemy() {
    return this.isBoss;
  }

  isDead() {
    return this.state === ENEMY_STATES.DEAD && this.removable;
  }
}
