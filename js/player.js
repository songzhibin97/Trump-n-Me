import {
  DAD,
  DASH_DURATION,
  DASH_SPEED_MULT,
  GROUND_Y,
  PLAYER_HP,
  PLAYER_STATS,
  SON,
  SWITCH_INVINCIBLE,
  WALK_LANE_MAX,
  WALK_LANE_MIN,
  WORLD_WIDTH,
} from "./constants.js";
import { WEAPON_TYPES } from "./items.js";
import { applyFriction, applyGravity, moveEntity } from "./physics.js";
import { drawSprite, getFrameCount, getSpriteAnimation } from "./sprite-loader.js";

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export const PLAYER_STATES = Object.freeze({
  IDLE: "IDLE",
  WALK: "WALK",
  DASH: "DASH",
  JUMP: "JUMP",
  ATTACK_LIGHT: "ATTACK_LIGHT",
  ATTACK_HEAVY: "ATTACK_HEAVY",
  UPPERCUT: "UPPERCUT",
  HIT: "HIT",
  DEAD: "DEAD",
});

const LOCKED_STATES = new Set([
  PLAYER_STATES.DASH,
  PLAYER_STATES.ATTACK_LIGHT,
  PLAYER_STATES.ATTACK_HEAVY,
  PLAYER_STATES.UPPERCUT,
  PLAYER_STATES.HIT,
  PLAYER_STATES.DEAD,
]);

const ATTACK_STATES = new Set([
  PLAYER_STATES.ATTACK_LIGHT,
  PLAYER_STATES.ATTACK_HEAVY,
  PLAYER_STATES.UPPERCUT,
]);

const STATE_TO_ANIMATION = {
  [PLAYER_STATES.IDLE]: "idle",
  [PLAYER_STATES.WALK]: "walk",
  [PLAYER_STATES.DASH]: "dash",
  [PLAYER_STATES.JUMP]: "jump",
  [PLAYER_STATES.ATTACK_LIGHT]: "attackLight",
  [PLAYER_STATES.ATTACK_HEAVY]: "attackHeavy",
  [PLAYER_STATES.UPPERCUT]: "uppercut",
  [PLAYER_STATES.HIT]: "hit",
  [PLAYER_STATES.DEAD]: "dead",
};

const RENDER_SCALE = {
  dad: 0.78,
  son: 0.72,
};

const JUMP_FORCE = {
  dad: -12,
  son: -10.5,
};

const ATTACK_WINDOWS = {
  [PLAYER_STATES.ATTACK_LIGHT]: [0.34, 0.62],
  [PLAYER_STATES.ATTACK_HEAVY]: [0.4, 0.76],
  [PLAYER_STATES.UPPERCUT]: [0.26, 0.68],
};

const HIT_INVINCIBLE = 300;

export class Player {
  constructor({ x = 220, worldWidth = WORLD_WIDTH } = {}) {
    this.time = 0;
    this.worldWidth = worldWidth;
    this.hp = PLAYER_HP;
    this.maxHp = PLAYER_HP;
    this.score = 0;
    this.weapon = null;
    this.activeChar = "dad";
    this.characters = {
      dad: this.createCharacter("dad", x, GROUND_Y - DAD.height),
      son: this.createCharacter("son", x - 72, GROUND_Y - SON.height),
    };

    this.characters.dad.invincibleUntil = SWITCH_INVINCIBLE;
    this.syncCharacterState(this.characters.dad);
    this.syncCharacterState(this.characters.son);
    this.updateBoxes(this.characters.dad);
    this.updateBoxes(this.characters.son);
  }

  createCharacter(kind, x, y) {
    const stats = PLAYER_STATS[kind];

    return {
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      width: stats.width,
      height: stats.height,
      state: PLAYER_STATES.IDLE,
      stateTime: 0,
      stateTimer: 0,
      baseY: GROUND_Y,
      animTime: 0,
      animFrame: 0,
      onGround: true,
      facing: 1,
      facingRight: true,
      dashDir: 1,
      invincibleUntil: 0,
      uppercutLaunch: false,
      attackId: 0,
      attackBoost: null,
      hurtbox: { x, y, w: stats.width, h: stats.height },
      hitbox: { x: 0, y: 0, w: 0, h: 0 },
    };
  }

  get active() {
    return this.getActiveCharacter();
  }

  get inactive() {
    return this.getInactiveCharacter();
  }

  getActiveCharacter() {
    return this.characters[this.activeChar];
  }

  getInactiveCharacter() {
    return this.characters[this.activeChar === "dad" ? "son" : "dad"];
  }

  switchCharacter() {
    const current = this.getActiveCharacter();
    const nextKey = this.activeChar === "dad" ? "son" : "dad";
    const next = this.characters[nextKey];

    next.x = clamp(current.x - current.facing * 52, 0, this.worldWidth - next.width);
    next.baseY = current.baseY;
    next.y = Math.min(next.y, next.baseY - next.height);
    next.vx = current.vx * 0.45;
    next.vy = current.vy * 0.4;
    next.facing = current.facing;
    next.onGround = current.onGround;
    next.invincibleUntil = this.time + SWITCH_INVINCIBLE;
    current.invincibleUntil = this.time + SWITCH_INVINCIBLE;

    this.activeChar = nextKey;
  }

  setState(character, nextState, resetAnimation = true) {
    if (character.state === nextState) {
      return;
    }

    character.state = nextState;
    character.stateTime = 0;
    character.stateTimer = 0;

    if (resetAnimation) {
      character.animTime = 0;
      character.animFrame = 0;
    }
  }

  getAnimationKey(character) {
    return `${character.kind}.${STATE_TO_ANIMATION[character.state]}`;
  }

  getAttackDuration(kind, state) {
    const stats = PLAYER_STATS[kind];
    const animKey = `${kind}.${STATE_TO_ANIMATION[state]}`;

    if (ATTACK_STATES.has(state)) {
      const animation = getSpriteAnimation("heroes", animKey);
      return animation.frames.length * animation.speed * 16;
    }

    if (state === PLAYER_STATES.ATTACK_LIGHT) {
      return stats.lightFrames * 16;
    }

    if (state === PLAYER_STATES.ATTACK_HEAVY) {
      return stats.heavyFrames * 16;
    }

    if (state === PLAYER_STATES.UPPERCUT) {
      return (stats.heavyFrames + 4) * 16;
    }

    if (state === PLAYER_STATES.HIT) {
      return 220;
    }

    return 0;
  }

  equipWeapon(weaponType) {
    const config = WEAPON_TYPES[weaponType];

    if (!config) {
      return false;
    }

    this.weapon = {
      type: weaponType,
      config,
      timer: config.duration,
      maxTimer: config.duration,
      usesLeft: config.uses,
      maxUses: config.uses,
    };

    return true;
  }

  updateWeapon(dt) {
    if (!this.weapon) {
      return;
    }

    this.weapon.timer = Math.max(0, this.weapon.timer - dt);

    if (this.weapon.timer <= 0 || this.weapon.usesLeft <= 0) {
      this.weapon = null;
    }
  }

  getWeaponAttackBoost() {
    if (!this.weapon) {
      return {
        type: null,
        dmgMult: 1,
        rangeMult: 1,
        description: "",
      };
    }

    return {
      type: this.weapon.type,
      ...this.weapon.config,
    };
  }

  startAttack(character, state) {
    this.setState(character, state);
    character.vx *= 0.35;
    character.uppercutLaunch = false;
    character.attackId += 1;
    character.attackBoost = this.getWeaponAttackBoost();

    if (this.weapon) {
      this.weapon.usesLeft = Math.max(0, this.weapon.usesLeft - 1);
    }
  }

  update(dt, input) {
    this.time += dt;
    this.updateWeapon(dt);

    if (input.consumeSwitch()) {
      this.switchCharacter();
    }

    const active = this.getActiveCharacter();
    const inactive = this.getInactiveCharacter();

    this.updateActiveCharacter(active, dt, input);
    this.updateFollower(inactive, active);

    this.syncCharacterState(active);
    this.syncCharacterState(inactive);
    this.updateBoxes(active);
    this.updateBoxes(inactive);
  }

  updateActiveCharacter(character, dt, input) {
    const stats = PLAYER_STATS[character.kind];
    const moveDir = (input.isDown("ArrowRight") ? 1 : 0) - (input.isDown("ArrowLeft") ? 1 : 0);
    const moveDirY = (input.isDown("ArrowDown") ? 1 : 0) - (input.isDown("ArrowUp") ? 1 : 0);
    const lightPressed = input.justPressed("KeyA") || input.justPressed("KeyJ");
    const heavyPressed = input.justPressed("KeyS") || input.justPressed("KeyK");
    const wantsUppercut =
      (input.isDown("KeyA") || input.isDown("KeyJ")) &&
      (input.isDown("KeyS") || input.isDown("KeyK")) &&
      (lightPressed || heavyPressed);

    character.stateTime += dt;
    character.animTime += dt;

    if (LOCKED_STATES.has(character.state)) {
      this.updateLockedState(character, stats, moveDir, moveDirY, dt);
      return;
    }

    const dashDir = input.consumeDashDirection();

    if (dashDir !== 0 && character.onGround) {
      character.dashDir = dashDir;
      character.facing = dashDir;
      this.setState(character, PLAYER_STATES.DASH);
      return;
    }

    if (wantsUppercut) {
      this.startAttack(character, PLAYER_STATES.UPPERCUT);
      return;
    }

    if (lightPressed) {
      this.startAttack(character, PLAYER_STATES.ATTACK_LIGHT);
      return;
    }

    if (heavyPressed) {
      this.startAttack(character, PLAYER_STATES.ATTACK_HEAVY);
      return;
    }

    if (input.justPressed("KeyW") && character.onGround) {
      character.vy = JUMP_FORCE[character.kind];
      character.onGround = false;
      this.setState(character, PLAYER_STATES.JUMP);
    }

    if (moveDir !== 0 || moveDirY !== 0) {
      character.vx = moveDir * stats.speed;
      
      if (moveDirY !== 0) {
        character.baseY = clamp(character.baseY + moveDirY * stats.speed * 0.7, WALK_LANE_MIN, WALK_LANE_MAX);
        if (character.onGround) {
          character.y = character.baseY - character.height;
        }
      }

      if (moveDir !== 0) {
        character.facing = moveDir;
      }

      if (character.onGround) {
        this.setState(character, PLAYER_STATES.WALK, false);
      }
    } else if (character.onGround) {
      applyFriction(character);

      if (Math.abs(character.vx) < 0.08) {
        character.vx = 0;
      }

      if (Math.abs(character.vx) <= 0.08) {
        this.setState(character, PLAYER_STATES.IDLE, false);
      }
    }

    if (!character.onGround) {
      applyGravity(character);
      this.setState(character, PLAYER_STATES.JUMP, false);
    }

    moveEntity(character);
    this.constrainToWorld(character);

    if (character.onGround && character.state === PLAYER_STATES.JUMP) {
      if (Math.abs(moveDir) > 0 || Math.abs(moveDirY) > 0) {
        this.setState(character, PLAYER_STATES.WALK, false);
      } else {
        this.setState(character, PLAYER_STATES.IDLE, false);
      }
    }
  }

  updateLockedState(character, stats, moveDir, moveDirY, dt) {
    if (character.state === PLAYER_STATES.DASH) {
      character.vx = character.dashDir * stats.speed * DASH_SPEED_MULT;
      moveEntity(character);
      this.constrainToWorld(character);

      if (character.stateTime >= DASH_DURATION) {
        character.vx *= 0.45;
        this.setState(character, Math.abs(moveDir) > 0 || Math.abs(moveDirY) > 0 ? PLAYER_STATES.WALK : PLAYER_STATES.IDLE);
      }

      return;
    }

    if (ATTACK_STATES.has(character.state)) {
      applyFriction(character);

      if (character.state === PLAYER_STATES.UPPERCUT && !character.uppercutLaunch) {
        character.vy = -9;
        character.onGround = false;
        character.uppercutLaunch = true;
      }

      if (!character.onGround || character.state === PLAYER_STATES.UPPERCUT) {
        applyGravity(character);
      }

      moveEntity(character);
      this.constrainToWorld(character);

      if (character.stateTime >= this.getAttackDuration(character.kind, character.state)) {
        character.uppercutLaunch = false;
        character.attackBoost = null;
        this.setState(character, character.onGround ? PLAYER_STATES.IDLE : PLAYER_STATES.JUMP);
      }

      return;
    }

    if (character.state === PLAYER_STATES.HIT) {
      applyFriction(character);
      moveEntity(character);
      this.constrainToWorld(character);

      if (character.stateTime >= this.getAttackDuration(character.kind, PLAYER_STATES.HIT)) {
        this.setState(character, PLAYER_STATES.IDLE);
      }
    }

    if (character.state === PLAYER_STATES.DEAD) {
      moveEntity(character);
      this.constrainToWorld(character);
    }
  }

  updateFollower(character, leader) {
    const stats = PLAYER_STATS[character.kind];
    const followOffset = leader.facing * -78;
    const targetX = clamp(leader.x + followOffset, 0, this.worldWidth - character.width);
    const deltaX = targetX - character.x;
    const deltaY = leader.baseY - character.baseY;

    character.stateTime += 16;
    character.animTime += 16;
    character.facing = deltaX >= 0 ? 1 : -1;
    character.vx = clamp(deltaX * 0.12, -stats.speed * 0.8, stats.speed * 0.8);
    character.baseY += clamp(deltaY * 0.12, -stats.speed * 0.5, stats.speed * 0.5);
    character.baseY = clamp(character.baseY, WALK_LANE_MIN, WALK_LANE_MAX);
    character.vy = 0;
    character.y = character.baseY - character.height;
    character.onGround = true;

    if (Math.abs(deltaX) < 8) {
      character.vx *= 0.35;
    }

    moveEntity(character);
    this.constrainToWorld(character);
    character.y = character.baseY - character.height;
    character.vy = 0;
    character.onGround = true;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.setState(character, PLAYER_STATES.WALK, false);
    } else {
      this.setState(character, PLAYER_STATES.IDLE, false);
    }
  }

  syncCharacterState(character) {
    character.stateTimer = character.stateTime;
    character.facingRight = character.facing >= 0;
    character.animFrame = this.getAnimFrame(character);
  }

  constrainToWorld(character) {
    character.x = clamp(character.x, 0, this.worldWidth - character.width);
  }

  updateBoxes(character) {
    character.hurtbox = {
      x: character.x,
      y: character.y,
      w: character.width,
      h: character.height,
    };

    if (!ATTACK_STATES.has(character.state) || !this.isAttackActiveWindow(character)) {
      character.hitbox = { x: 0, y: 0, w: 0, h: 0 };
      return;
    }

    const attackConfig = this.getAttackConfig(character);
    const reach = attackConfig.reach;
    const hitX =
      character.facing === 1
        ? character.x + character.width - 6
        : character.x - reach + 6;

    character.hitbox = {
      x: hitX,
      y: attackConfig.y,
      w: reach,
      h: attackConfig.height,
    };
  }

  isInvincible(character) {
    return character.kind !== this.activeChar || this.time < character.invincibleUntil;
  }

  getAnimFrame(character) {
    const animationKey = this.getAnimationKey(character);
    const animation = getSpriteAnimation("heroes", animationKey);
    const frameCount = getFrameCount("heroes", animationKey);
    const frameDuration = animation.speed * 16;
    const rawIndex = Math.floor(character.animTime / frameDuration);

    return character.state === PLAYER_STATES.IDLE ||
      character.state === PLAYER_STATES.WALK ||
      character.state === PLAYER_STATES.DASH
      ? rawIndex % frameCount
      : Math.min(rawIndex, frameCount - 1);
  }

  isAttackActiveWindow(character) {
    if (!ATTACK_STATES.has(character.state)) {
      return false;
    }

    const duration = this.getAttackDuration(character.kind, character.state);
    const [startRatio, endRatio] = ATTACK_WINDOWS[character.state];
    const progress = duration > 0 ? character.stateTime / duration : 0;

    return progress >= startRatio && progress <= endRatio;
  }

  getAttackConfig(character = this.getActiveCharacter()) {
    const stats = PLAYER_STATS[character.kind];
    const boost = character.attackBoost ?? this.getWeaponAttackBoost();

    switch (character.state) {
      case PLAYER_STATES.ATTACK_LIGHT:
        return {
          type: "light",
          weapon: boost,
          damage: Math.round(stats.lightDmg * boost.dmgMult),
          knockbackX: 4,
          knockbackY: 0,
          reach: Math.round((character.kind === "dad" ? 38 : 28) * boost.rangeMult),
          y: character.y + 4,
          height: character.height + 6,
        };
      case PLAYER_STATES.ATTACK_HEAVY:
        return {
          type: "heavy",
          weapon: boost,
          damage: Math.round(stats.heavyDmg * boost.dmgMult),
          knockbackX: 8,
          knockbackY: -2,
          reach: Math.round((character.kind === "dad" ? 48 : 36) * boost.rangeMult),
          y: character.y + 2,
          height: character.height + 8,
        };
      case PLAYER_STATES.UPPERCUT:
        return {
          type: "uppercut",
          weapon: boost,
          damage: Math.round(stats.uppercutDmg * boost.dmgMult),
          knockbackX: 3,
          knockbackY: -12,
          reach: Math.round((character.kind === "dad" ? 34 : 28) * boost.rangeMult),
          y: character.y - 18,
          height: character.height + 30,
        };
      default:
        return null;
    }
  }

  getAttackInfo() {
    const character = this.getActiveCharacter();
    const attackConfig = this.getAttackConfig(character);

    if (!attackConfig || !this.isAttackActiveWindow(character)) {
      return null;
    }

    return {
      attackId: character.attackId,
      attackType: attackConfig.type,
      damage: attackConfig.damage,
      knockbackX: attackConfig.knockbackX * character.facing,
      knockbackY: attackConfig.knockbackY,
      weapon: attackConfig.weapon ?? null,
      character,
    };
  }

  getHitbox() {
    return { ...this.getActiveCharacter().hitbox };
  }

  getHurtbox() {
    return { ...this.getActiveCharacter().hurtbox };
  }

  takeHit(damage, knockbackVx = 0, options = {}) {
    const character = this.getActiveCharacter();

    if (this.isInvincible(character) || character.state === PLAYER_STATES.DEAD) {
      return false;
    }

    const stagger = options.stagger !== false;
    const knockbackVy = options.knockbackVy ?? -3;
    const invincibleMs = options.invincibleMs ?? HIT_INVINCIBLE;

    this.hp = clamp(this.hp - damage, 0, this.maxHp);
    character.vx = knockbackVx;
    character.vy = knockbackVy;
    character.onGround = knockbackVy >= 0;
    character.invincibleUntil = this.time + invincibleMs;
    character.attackBoost = null;

    if (this.hp <= 0) {
      this.setState(character, PLAYER_STATES.DEAD);
      return true;
    }

    if (stagger) {
      this.setState(character, PLAYER_STATES.HIT);
    }
    return true;
  }

  restoreHp(amount) {
    if (amount <= 0) {
      return;
    }

    this.hp = clamp(this.hp + amount, 0, this.maxHp);
  }

  getDrawInfo(character) {
    const animationKey = this.getAnimationKey(character);
    const animation = getSpriteAnimation("heroes", animationKey);
    const frameCount = getFrameCount("heroes", animationKey);
    const clampedIndex = this.getAnimFrame(character);
    const frame = animation.frames[clampedIndex];
    const scale = RENDER_SCALE[character.kind];

    return {
      animationKey,
      frameIndex: clampedIndex,
      frame,
      scale,
      drawX: character.x - (frame.w * scale - character.width) / 2,
      drawY: character.y - (frame.h * scale - character.height),
    };
  }

  drawCharacter(ctx, character, alpha, rageActive) {
    const { animationKey, frameIndex, scale, drawX, drawY } = this.getDrawInfo(character);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.isInvincible(character) && Math.floor(this.time / 80) % 2 === 0) {
      ctx.globalAlpha *= 0.72;
    }

    ctx.translate(Math.round(drawX), Math.round(drawY));

    if (rageActive && character.kind === this.activeChar) {
      ctx.shadowColor = "rgba(255, 64, 64, 0.9)";
      ctx.shadowBlur = 24 + Math.sin(this.time / 70) * 6;
    }

    ctx.scale(scale, scale);
    drawSprite(ctx, "heroes", animationKey, frameIndex, 0, 0, character.facing < 0);
    ctx.restore();
  }

  draw(ctx, { rageActive = false } = {}) {
    const inactive = this.getInactiveCharacter();
    const active = this.getActiveCharacter();

    this.drawCharacter(ctx, inactive, 0.48, false);
    this.drawCharacter(ctx, active, 1, rageActive);
  }

  getDebugState() {
    const active = this.getActiveCharacter();
    const inactive = this.getInactiveCharacter();

    return {
      activeChar: this.activeChar,
      active: {
        x: Number(active.x.toFixed(2)),
        y: Number(active.y.toFixed(2)),
        vx: Number(active.vx.toFixed(2)),
        vy: Number(active.vy.toFixed(2)),
        state: active.state,
        onGround: active.onGround,
        hp: this.hp,
      },
      inactive: {
        kind: inactive.kind,
        x: Number(inactive.x.toFixed(2)),
        y: Number(inactive.y.toFixed(2)),
        state: inactive.state,
      },
      score: this.score,
      weapon: this.weapon
        ? {
            type: this.weapon.type,
            timer: Math.round(this.weapon.timer),
            usesLeft: this.weapon.usesLeft,
          }
        : null,
    };
  }
}
