const frame = (x, y, w, h) => ({ x, y, w, h });
const frameTrim = (x, y, w, h, tx, ty, tw, th) => ({
  x,
  y,
  w,
  h,
  trim: { x: tx, y: ty, w: tw, h: th },
});
const frames = (xs, y, w, h) => xs.map((x) => frame(x, y, w, h));

const HERO_W = 174;
const HERO_H = 188;

const DAD_X = {
  idle: [0, 175],
  walk: [0, 175, 350, 526, 703],
  attackLight: [0, 175, 350],
  attackHeavy: [0, 175, 350, 526, 703],
  uppercut: [0, 175, 350, 526],
  jump: [0, 175, 350],
  hit: [0, 175],
  dead: [0, 175, 350, 526],
};

const SON_X = {
  idle: [1407, 1581],
  walk: [1407, 1581, 1757, 1933, 2109, 2284],
  attackLight: [1407, 1581, 1757],
  attackHeavy: [1407, 1581, 1757, 1933, 2109],
  uppercut: [1407, 1581, 1757, 1933],
  jump: [1407, 1581, 1757],
  hit: [1407, 1581],
  dead: [1407, 1581, 1757, 1933],
};

const MINION_W = 345;
const MINION_H = 378;
const MINION_COLS = [0, 351, 702, 1053, 1404, 1755, 2106, 2457];
const MINION_ROWS = [0, 382, 764, 1146];

const BOSS_W = 380;
const BOSS_H = 430;
const BOSS_COLS = [0, 389, 868, 1186, 1505, 1900, 2255, 2614];
const BOSS_ROWS = [160, 1110, 1555, 2103, 2550];

const FINAL_BOSS_ROWS = [58, 538, 1038];
const FINAL_BOSS_FRAMES = [
  frame(18, FINAL_BOSS_ROWS[0], 280, 430),
  frame(334, FINAL_BOSS_ROWS[0], 280, 430),
  frame(764, FINAL_BOSS_ROWS[0], 360, 430),
  frame(1172, FINAL_BOSS_ROWS[0], 280, 430),
  frame(1456, FINAL_BOSS_ROWS[0], 320, 430),
  frame(1950, FINAL_BOSS_ROWS[0], 320, 430),
  frame(2324, FINAL_BOSS_ROWS[0], 430, 430),
];

const ITEM_W = 330;
const ITEM_H = 320;

export const CUSTOM_ENEMY_ANIMATIONS = {
  bodyguard: {
    attack: {
      frames: [
        frameTrim(0, 382, 345, 378, 9, 16, 284, 348),
        frameTrim(1053, 382, 345, 378, 32, 24, 278, 346),
        frameTrim(0, 382, 345, 378, 9, 16, 284, 348),
      ],
      speed: 5,
    },
  },
  miniBoss: {
    idle: {
      frames: [
        frameTrim(60, 186, 258, 332, 16, 4, 241, 302),
        frameTrim(448, 186, 258, 334, 16, 4, 242, 330),
      ],
      speed: 11,
    },
    walk: {
      frames: [
        frameTrim(1222, 176, 232, 344, 18, 4, 192, 334),
        frameTrim(1546, 178, 208, 341, 16, 4, 176, 333),
        frameTrim(1222, 176, 232, 344, 18, 4, 192, 334),
      ],
      speed: 7,
    },
    attack: {
      frames: [
        frameTrim(1944, 186, 250, 331, 1, 2, 245, 328),
        frameTrim(2274, 186, 316, 334, 6, 2, 306, 328),
        frameTrim(2636, 176, 308, 346, 0, 0, 308, 340),
        frameTrim(2994, 188, 336, 332, 6, 0, 330, 326),
      ],
      speed: 5,
    },
    hit: {
      frames: [
        frameTrim(58, 634, 259, 330, 13, 2, 246, 321),
        frameTrim(424, 634, 294, 327, 0, 4, 290, 319),
      ],
      speed: 8,
    },
    dead: {
      frames: [
        frameTrim(3922, 612, 248, 348, 20, 0, 228, 347),
        frameTrim(4276, 604, 304, 357, 4, 0, 300, 351),
        frameTrim(4682, 632, 308, 332, 4, 6, 302, 315),
        frameTrim(5042, 780, 406, 185, 14, 4, 391, 176),
      ],
      speed: 8,
    },
  },
  golfBoss: {
    idle: {
      frames: [
        frameTrim(28, 1174, 308, 360, 6, 4, 278, 352),
        frameTrim(418, 1174, 307, 360, 6, 4, 276, 352),
      ],
      speed: 11,
    },
    walk: {
      frames: [
        frameTrim(934, 1176, 174, 360, 8, 4, 154, 350),
        frameTrim(1246, 1178, 180, 358, 18, 4, 146, 346),
        frameTrim(1564, 1178, 182, 356, 14, 4, 152, 346),
      ],
      speed: 7,
    },
    attack: {
      frames: [
        frameTrim(1902, 1184, 294, 349, 0, 0, 294, 346),
        frameTrim(2244, 1180, 329, 356, 1, 2, 328, 348),
        frameTrim(2616, 1184, 345, 352, 2, 0, 343, 350),
      ],
      speed: 5,
    },
    ranged: { frames: [frameTrim(3892, 1180, 306, 355, 4, 4, 301, 345)], speed: 7 },
    hit: {
      frames: [
        frameTrim(90, 1630, 222, 352, 4, 3, 212, 340),
        frameTrim(452, 1624, 237, 351, 6, 4, 230, 346),
      ],
      speed: 8,
    },
    dead: {
      frames: [
        frameTrim(3936, 1618, 198, 356, 6, 4, 186, 350),
        frameTrim(4268, 1630, 274, 348, 4, 1, 269, 341),
        frameTrim(4600, 1648, 386, 297, 19, 1, 363, 293),
        frameTrim(5016, 1652, 436, 330, 0, 2, 436, 328),
      ],
      speed: 8,
    },
  },
  twitterBoss: {
    idle: {
      frames: [
        frameTrim(74, 2168, 248, 359, 34, 4, 210, 349),
        frameTrim(470, 2168, 248, 360, 34, 4, 212, 349),
      ],
      speed: 11,
    },
    walk: {
      frames: [
        frameTrim(924, 2168, 196, 359, 18, 4, 178, 349),
        frameTrim(1214, 2168, 198, 354, 18, 4, 180, 330),
        frameTrim(1499, 2168, 201, 352, 19, 4, 182, 330),
      ],
      speed: 7,
    },
    attack: {
      frames: [
        frameTrim(1864, 2168, 328, 359, 38, 4, 288, 182),
        frameTrim(2240, 2170, 334, 358, 34, 2, 290, 348),
        frameTrim(2618, 2168, 334, 359, 34, 2, 300, 350),
      ],
      speed: 5,
    },
    hit: {
      frames: [
        frameTrim(74, 2618, 288, 362, 34, 6, 254, 346),
        frameTrim(454, 2618, 270, 361, 52, 6, 216, 350),
      ],
      speed: 8,
    },
    dead: {
      frames: [
        frameTrim(3629, 2614, 401, 365, 1, 4, 400, 319),
        frameTrim(4084, 2614, 400, 364, 4, 2, 396, 325),
        frameTrim(4550, 2614, 386, 364, 0, 0, 386, 323),
        frameTrim(4990, 2696, 428, 288, 0, 4, 330, 280),
      ],
      speed: 8,
    },
  },
};

export const SPRITE_SHEETS = {
  heroes: {
    src: "assets/heroes-sheet.png",
    dad: {
      idle: { frames: frames(DAD_X.idle, 0, HERO_W, HERO_H), speed: 14 },
      walk: { frames: frames(DAD_X.walk, 192, HERO_W, HERO_H), speed: 7 },
      dash: { frames: frames(DAD_X.walk.slice(1, 4), 192, HERO_W, HERO_H), speed: 4 },
      jump: { frames: frames(DAD_X.jump, 959, HERO_W, 210), speed: 9 },
      attackLight: { frames: frames(DAD_X.attackLight, 383, HERO_W, HERO_H), speed: 5 },
      attackHeavy: { frames: frames(DAD_X.attackHeavy, 575, HERO_W, HERO_H), speed: 5 },
      uppercut: { frames: frames(DAD_X.uppercut, 767, HERO_W, HERO_H), speed: 5 },
      hit: { frames: frames(DAD_X.hit, 1151, HERO_W, HERO_H), speed: 8 },
      dead: { frames: frames(DAD_X.dead, 1343, HERO_W, HERO_H), speed: 12 },
    },
    son: {
      idle: { frames: frames(SON_X.idle, 0, HERO_W, HERO_H), speed: 12 },
      walk: { frames: frames(SON_X.walk, 192, HERO_W, HERO_H), speed: 5 },
      dash: { frames: frames(SON_X.walk.slice(1, 5), 192, HERO_W, HERO_H), speed: 3 },
      jump: { frames: frames(SON_X.jump, 959, HERO_W, 210), speed: 8 },
      attackLight: { frames: frames(SON_X.attackLight, 383, HERO_W, HERO_H), speed: 4 },
      attackHeavy: { frames: frames(SON_X.attackHeavy, 575, HERO_W, HERO_H), speed: 4 },
      uppercut: { frames: frames(SON_X.uppercut, 767, HERO_W, HERO_H), speed: 4 },
      hit: { frames: frames(SON_X.hit, 1151, HERO_W, HERO_H), speed: 7 },
      dead: { frames: frames(SON_X.dead, 1343, HERO_W, HERO_H), speed: 10 },
    },
  },
  minion: {
    src: "assets/trump-minion-sheet.png",
    idle: {
      frames: [
        frameTrim(0, 0, 345, 378, 69, 22, 205, 336),
        frameTrim(351, 0, 345, 378, 68, 23, 204, 334),
        frameTrim(702, 0, 345, 378, 73, 16, 191, 334),
      ],
      speed: 8,
    },
    walk: {
      frames: [
        frameTrim(702, 0, 345, 378, 73, 16, 191, 334),
        frameTrim(1053, 0, 345, 378, 1, 2, 259, 355),
        frameTrim(1404, 0, 345, 378, 2, 18, 303, 353),
        frameTrim(1755, 0, 345, 378, 3, 2, 293, 369),
        frameTrim(2106, 0, 345, 378, 4, 1, 289, 369),
        frameTrim(2457, 0, 345, 378, 44, 19, 255, 336),
      ],
      speed: 5,
    },
    attack: {
      frames: [
        frameTrim(1404, 382, 345, 378, 42, 20, 232, 344),
        frameTrim(1755, 382, 345, 378, 34, 18, 273, 346),
        frameTrim(2106, 382, 345, 378, 38, 18, 286, 344),
        frameTrim(2457, 382, 345, 378, 50, 28, 242, 342),
      ],
      speed: 4,
    },
    hit: {
      frames: [
        frameTrim(0, 764, 345, 378, 66, 34, 205, 326),
        frameTrim(351, 764, 345, 378, 62, 30, 213, 328),
      ],
      speed: 8,
    },
    dead: {
      frames: [
        frameTrim(702, 1146, 345, 378, 0, 6, 323, 372),
        frameTrim(1053, 1146, 345, 378, 1, 6, 344, 372),
        frameTrim(1404, 1146, 345, 378, 2, 6, 343, 372),
        frameTrim(1755, 1146, 345, 378, 0, 42, 345, 332),
        frameTrim(2106, 1146, 345, 378, 0, 7, 345, 371),
        frameTrim(2457, 1146, 345, 378, 0, 7, 345, 361),
      ],
      speed: 8,
    },
  },
  bosses: {
    src: "assets/boss-sheet.png",
    idle: {
      frames: [
        frameTrim(0, 160, 380, 430, 2, 1, 371, 429),
        frameTrim(389, 160, 380, 430, 32, 30, 285, 400),
        frameTrim(868, 160, 380, 430, 2, 22, 378, 408),
        frameTrim(1186, 160, 380, 430, 24, 20, 356, 410),
      ],
      speed: 11,
    },
    walk: {
      frames: [
        frameTrim(0, 1110, 380, 430, 2, 1, 371, 426),
        frameTrim(389, 1110, 380, 430, 35, 68, 276, 352),
        frameTrim(868, 1110, 380, 430, 1, 2, 235, 419),
        frameTrim(1186, 1110, 380, 430, 77, 72, 158, 343),
      ],
      speed: 7,
    },
    attack: {
      frames: [
        frameTrim(0, 1555, 380, 430, 2, 1, 374, 426),
        frameTrim(389, 1555, 380, 430, 27, 1, 327, 418),
        frameTrim(868, 1555, 380, 430, 2, 1, 378, 417),
        frameTrim(1186, 1555, 380, 430, 0, 83, 380, 215),
      ],
      speed: 5,
    },
    hit: {
      frames: [
        frameTrim(0, 2103, 380, 430, 1, 1, 378, 429),
        frameTrim(389, 2103, 380, 430, 115, 69, 212, 349),
      ],
      speed: 8,
    },
    dead: {
      frames: [
        frameTrim(0, 2550, 380, 430, 2, 1, 377, 429),
        frameTrim(389, 2550, 380, 430, 25, 11, 354, 413),
        frameTrim(868, 2550, 380, 430, 49, 2, 331, 418),
      ],
      speed: 8,
    },
  },
  finalBoss: {
    src: "assets/final-boss-sheet.png",
    idle: {
      frames: [
        frameTrim(18, 58, 280, 430, 4, 2, 270, 428),
        frameTrim(334, 58, 280, 430, 4, 2, 246, 380),
        frameTrim(764, 58, 360, 430, 4, 24, 344, 358),
      ],
      speed: 12,
    },
    walk: {
      frames: [
        frameTrim(764, 58, 360, 430, 4, 24, 344, 358),
        frameTrim(1172, 58, 280, 430, 4, 18, 252, 365),
        frameTrim(1456, 58, 320, 430, 4, 23, 294, 362),
      ],
      speed: 7,
    },
    attack: {
      frames: [
        frameTrim(1172, 58, 280, 430, 4, 18, 252, 365),
        frameTrim(1456, 58, 320, 430, 4, 23, 294, 362),
        frameTrim(1950, 58, 320, 430, 4, 29, 316, 401),
        frameTrim(2324, 58, 430, 430, 0, 33, 426, 397),
      ],
      speed: 5,
    },
    hit: {
      frames: [
        frameTrim(0, 538, 300, 430, 4, 0, 292, 348),
        frameTrim(336, 538, 378, 430, 2, 0, 372, 358),
      ],
      speed: 8,
    },
    dead: {
      frames: [
        frameTrim(728, 538, 310, 430, 4, 2, 303, 364),
        frameTrim(1086, 538, 402, 430, 3, 1, 396, 362),
        frameTrim(1994, 538, 286, 430, 0, 2, 286, 428),
      ],
      speed: 9,
    },
  },
  backgrounds: {
    src: "assets/backgrounds-sheet.jpeg",
    sections: [
      { key: "capitolDay", frames: [frame(0, 0, 2400, 448)], speed: 1 },
      { key: "whiteHouseLawn", frames: [frame(0, 448, 2400, 448)], speed: 1 },
      { key: "nightMall", frames: [frame(0, 896, 2400, 448)], speed: 1 },
      { key: "sunsetChaos", frames: [frame(0, 1344, 2400, 448)], speed: 1 },
    ],
    capitolDay: { frames: [frame(0, 0, 2400, 448)], speed: 1 },
    whiteHouseLawn: { frames: [frame(0, 448, 2400, 448)], speed: 1 },
    nightMall: { frames: [frame(0, 896, 2400, 448)], speed: 1 },
    sunsetChaos: { frames: [frame(0, 1344, 2400, 448)], speed: 1 },
  },
  itemsUI: {
    src: "assets/items-ui-sheet.png",
    showcase: {
      frames: [
        frame(0, 0, 520, 340),
        frame(180, 431, 353, 320),
        frame(743, 399, 264, 320),
        frame(1229, 371, 306, 320),
      ],
      speed: 10,
    },
    hud: {
      frames: [
        frame(145, 1, 364, ITEM_H),
        frame(713, 1, 330, ITEM_H),
        frame(1235, 0, 289, ITEM_H),
      ],
      speed: 12,
    },
    pickup: {
      frames: [
        frame(180, 431, 353, 320),
        frame(743, 399, 264, 320),
        frame(1229, 371, 306, 320),
        frame(1769, 405, 242, 320),
      ],
      speed: 10,
    },
    icons: {
      frames: [
        frame(1042, 739, 159, 220),
        frame(1381, 751, 248, 220),
        frame(1775, 727, 218, 220),
        frame(2227, 727, 218, 220),
      ],
      speed: 12,
    },
  },
};
