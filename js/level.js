import { WORLD_WIDTH } from "./constants.js";
import { Enemy } from "./enemy.js";
import { Item } from "./items.js";
import { checkAABB } from "./physics.js";

export const LEVEL_DATA = [
  {
    id: 1,
    name: "White House Lawn",
    bgSection: "whiteHouseLawn",
    worldWidth: 2880,
    waves: [
      {
        trigger: "start",
        callout: "WAVE 1  LAWN SECURITY",
        enemies: [
          { type: "minion", x: 800 },
          { type: "minion", x: 1000 },
        ],
      },
      {
        trigger: "cleared",
        callout: "WAVE 2  GARDEN AMBUSH",
        enemies: [
          { type: "minion", x: 860, y: 24 },
          { type: "minion", x: 1100 },
          { type: "minion", x: 1300, y: -18 },
        ],
      },
      {
        trigger: "cleared",
        callout: "BOSS  MINI-TRUMP",
        boss: { type: "miniBoss", x: 1400 },
      },
    ],
    items: [{ type: "golfClub", x: 600, y: null }],
  },
  {
    id: 2,
    name: "Golf Course",
    bgSection: "golfCourse",
    worldWidth: 3200,
    waves: [
      {
        trigger: "start",
        callout: "WAVE 1  CLUBHOUSE CROWD",
        enemies: [
          { type: "minion", x: 880 },
          { type: "minion", x: 1060 },
          { type: "minion", x: 1240 },
        ],
      },
      {
        trigger: "cleared",
        callout: "WAVE 2  BODYGUARD LINE",
        enemies: [
          { type: "minion", x: 1180 },
          { type: "minion", x: 1360, y: 18 },
          { type: "bodyguard", x: 1540 },
        ],
      },
      {
        trigger: "cleared",
        callout: "WAVE 3  FAIRWAY RUSH",
        enemies: [
          { type: "bodyguard", x: 1500, y: -8 },
          { type: "minion", x: 1690, y: 16 },
          { type: "minion", x: 1850, y: -16 },
        ],
      },
      {
        trigger: "cleared",
        callout: "BOSS  GOLF TRUMP",
        boss: { type: "golfBoss", x: 1700 },
      },
    ],
    items: [{ type: "magaHat", x: 700, y: null }],
  },
  {
    id: 3,
    name: "Twitter/X HQ",
    bgSection: "twitterHQ",
    worldWidth: 3200,
    waves: [
      {
        trigger: "start",
        callout: "WAVE 1  TROLL FARM",
        enemies: [
          { type: "minion", x: 900 },
          { type: "minion", x: 1080 },
          { type: "phoneThrower", x: 1280 },
        ],
      },
      {
        trigger: "cleared",
        callout: "WAVE 2  PHONE STORM",
        enemies: [
          { type: "phoneThrower", x: 1180 },
          { type: "phoneThrower", x: 1380 },
          { type: "phoneThrower", x: 1580 },
        ],
      },
      {
        trigger: "cleared",
        callout: "WAVE 3  CROSSFEED",
        enemies: [
          { type: "minion", x: 1320, y: 18 },
          { type: "phoneThrower", x: 1500 },
          { type: "minion", x: 1680, y: -20 },
        ],
      },
      {
        trigger: "cleared",
        callout: "BOSS  TWITTER TRUMP",
        boss: { type: "twitterBoss", x: 1760 },
      },
    ],
    items: [{ type: "twitterPhone", x: 800, y: null }],
  },
  {
    id: 4,
    name: "Campaign Stage",
    bgSection: "campaignStage",
    worldWidth: 3840,
    waves: [
      {
        trigger: "start",
        callout: "WAVE 1  STAGE CRASHERS",
        enemies: [
          { type: "minion", x: 980 },
          { type: "minion", x: 1140 },
          { type: "bodyguard", x: 1340 },
          { type: "bodyguard", x: 1540 },
        ],
      },
      {
        trigger: "cleared",
        callout: "WAVE 2  SECURITY SWARM",
        enemies: [
          { type: "bodyguard", x: 1380 },
          { type: "bodyguard", x: 1580 },
          { type: "phoneThrower", x: 1780 },
          { type: "phoneThrower", x: 1980 },
        ],
      },
      {
        trigger: "cleared",
        callout: "WAVE 3  LAST DEFENSE",
        enemies: [
          { type: "bodyguard", x: 1700, y: -12 },
          { type: "phoneThrower", x: 1880 },
          { type: "bodyguard", x: 2060, y: 16 },
        ],
      },
      {
        trigger: "cleared",
        callout: "FINAL BOSS  THE FINALE",
        boss: { type: "finalBoss", x: 2280 },
      },
    ],
    items: [{ type: "goldenWig", x: 900, y: null }],
  },
];

const BOSS_INTRO_QUOTES = Object.freeze({
  miniBoss: "I'm gonna build a wall!",
  golfBoss: "Let me show you a real swing!",
  twitterBoss: "Time to go viral!",
  finalBoss: "You wanted the finale. Here I am!",
});

function createItem(itemData) {
  return new Item(itemData.type, itemData.x, itemData.y ?? undefined);
}

export class Level {
  constructor(levelData) {
    this.data = levelData ?? LEVEL_DATA[0];
    this.currentWave = -1;
    this.enemies = [];
    this.items = [];
    this.bossActive = false;
    this.cleared = false;
    this.titleDuration = 2600;
    this.titleTimer = this.titleDuration;
    this.elapsedTime = 0;
    this.clearEventEmitted = false;
  }

  start() {
    this.currentWave = -1;
    this.enemies = [];
    this.items = (this.data.items ?? []).map(createItem);
    this.bossActive = false;
    this.cleared = false;
    this.elapsedTime = 0;
    this.titleTimer = this.titleDuration;
    this.clearEventEmitted = false;
    this.spawnWave(0, null, []);
  }

  update(dt, player, combatSystem, effects) {
    const events = [];

    this.elapsedTime += dt;
    this.titleTimer = Math.max(0, this.titleTimer - dt);

    for (const item of this.items) {
      item.update(dt);
    }

    const activeCharacter = player.getActiveCharacter();
    const battleContext = {
      activeAttackers: this.enemies.filter((enemy) => enemy.alive && enemy.state === "ATTACK").length,
    };

    for (const enemy of this.enemies) {
      const enemyEvents = enemy.update(dt, activeCharacter, battleContext, effects);
      events.push(...enemyEvents);
    }

    this.handleEnemyEvents(events, effects);
    this.handleItemPickup(player, effects, events);

    this.enemies = this.enemies.filter((enemy) => !enemy.isDead());
    this.items = this.items.filter((item) => !item.collected);

    if (this.shouldAdvanceWave()) {
      this.spawnWave(this.currentWave + 1, effects, events);
    } else if (this.currentWave >= (this.data.waves?.length ?? 0) - 1 && !this.hasRemainingEnemies()) {
      this.cleared = true;
    }

    if (this.cleared && !this.clearEventEmitted) {
      this.clearEventEmitted = true;
      events.push({ type: "levelCleared", levelId: this.data.id });
    }

    this.bossActive = this.enemies.some((enemy) => enemy.alive && enemy.isBossEnemy());
    void combatSystem;
    return events;
  }

  handleEnemyEvents(events, effects) {
    for (const event of events) {
      if (event.type === "spawnMinions") {
        for (const enemyData of event.enemies) {
          this.enemies.push(new Enemy(enemyData.type, enemyData.x, enemyData.y, enemyData.options));
        }
      }

      if (event.type === "screenShake") {
        effects?.addScreenShake(event.intensity, event.duration);
      }

      if (event.type === "bossPhaseTransition") {
        effects?.addBossPhaseTransition(event.x, event.y, event.text);
      }

      if (event.type === "waveCallout") {
        effects?.addText({
          screenSpace: true,
          x: 480,
          y: 128,
          vy: -0.04,
          text: event.text,
          fontSize: 34,
          color: event.color ?? "#fff4cb",
          life: 1100,
          maxLife: 1100,
          strokeColor: "rgba(20, 0, 0, 0.92)",
          fontWeight: 900,
        });
      }

      if (event.type === "finalBossDefeated") {
        effects?.addGoldCoinRain(event.x, event.y);
      }
    }
  }

  handleItemPickup(player, effects, events) {
    const hurtbox = player.getHurtbox();

    for (const item of this.items) {
      if (item.collected || !checkAABB(item.getPickupBox(), hurtbox)) {
        continue;
      }

      player.equipWeapon(item.type);
      item.collected = true;
      effects?.addWeaponPickup(item.x, item.y - 16, item.config.name);
      events.push({
        type: "pickup",
        itemType: item.type,
        x: item.x,
        y: item.y,
      });
    }
  }

  shouldAdvanceWave() {
    return !this.cleared && !this.hasRemainingEnemies() && this.currentWave < (this.data.waves?.length ?? 0) - 1;
  }

  hasRemainingEnemies() {
    return this.enemies.length > 0;
  }

  spawnWave(index, effects, events = []) {
    if (index < 0 || index >= (this.data.waves?.length ?? 0)) {
      return;
    }

    const wave = this.data.waves[index];
    this.currentWave = index;
    events.push({
      type: "waveCallout",
      text: wave.callout ?? `WAVE ${index + 1}`,
      color: wave.calloutColor ?? "#ffe179",
    });

    for (const enemyData of wave.enemies ?? []) {
      this.enemies.push(new Enemy(enemyData.type, enemyData.x, enemyData.y, enemyData.options));
    }

    if (!wave.boss) {
      return;
    }

    const spawnTargetX = wave.boss.x ?? Math.min(this.data.worldWidth - 280, WORLD_WIDTH - 220);
    const introText = BOSS_INTRO_QUOTES[wave.boss.type] ?? "You can't stop me!";
    const boss = new Enemy(wave.boss.type, this.data.worldWidth + 180, wave.boss.y, wave.boss.options);
    boss.beginBossEntrance(this.data.worldWidth + 180, spawnTargetX, introText);
    this.enemies.push(boss);
    this.bossActive = true;

    effects?.addScreenShake(12, 520);
    effects?.addBossEntrance(spawnTargetX, boss.y - 24, introText.toUpperCase());
    events.push({
      type: "bossEntrance",
      bossType: wave.boss.type,
      x: spawnTargetX,
      y: boss.y,
      text: introText,
    });
  }

  draw(ctx, drawScaledSpriteFn = null) {
    for (const item of this.items) {
      item.draw(ctx);
    }

    [...this.enemies]
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .forEach((enemy) => enemy.draw(ctx, drawScaledSpriteFn));
  }

  isCleared() {
    return this.cleared;
  }

  getEnemies() {
    return this.enemies;
  }

  getActiveBoss() {
    return this.enemies.find((enemy) => enemy.alive && enemy.isBossEnemy()) ?? null;
  }
}
