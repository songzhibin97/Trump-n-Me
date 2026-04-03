export const CANVAS_W = 960;
export const CANVAS_H = 540;

export const GRAVITY = 0.6;
export const FRICTION = 0.85;
export const GROUND_Y = 440;
export const WALK_LANE_MIN = 318;
export const WALK_LANE_MAX = 470;

export const DAD = {
  speed: 3,
  lightDmg: 15,
  heavyDmg: 35,
  uppercutDmg: 45,
  lightFrames: 12,
  heavyFrames: 18,
  width: 48,
  height: 64,
};

export const SON = {
  speed: 5,
  lightDmg: 8,
  heavyDmg: 18,
  uppercutDmg: 25,
  lightFrames: 6,
  heavyFrames: 10,
  width: 32,
  height: 48,
};

export const MINION_HP = 55;
export const BOSS_HP = 220;
export const FINAL_BOSS_HP = 420;

export const PLAYER_HP = 260;

export const COMBO_TIMEOUT = 2000;
export const RAGE_MAX = 100;
export const RAGE_DURATION = 3000;

export const DASH_SPEED_MULT = 2.5;
export const DASH_DURATION = 300;
export const DOUBLE_TAP_THRESHOLD = 250;

export const SWITCH_INVINCIBLE = 500;

export const WORLD_WIDTH = 2880;

export const PLAYER_STATS = Object.freeze({
  dad: DAD,
  son: SON,
});
