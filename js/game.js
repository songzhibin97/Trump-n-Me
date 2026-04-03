import { AudioManager } from "./audio.js";
import { Camera } from "./camera.js";
import { CANVAS_H, CANVAS_W, GROUND_Y } from "./constants.js";
import { CombatSystem } from "./combat.js";
import { EffectsManager } from "./effects.js";
import { InputManager } from "./input.js";
import { WEAPON_TYPES } from "./items.js";
import { LEVEL_DATA, Level } from "./level.js";
import { Player } from "./player.js";
import { loadAllSprites } from "./sprite-loader.js";
import { UI } from "./ui.js";

const STEP = 1000 / 60;
const HIGH_SCORE_KEY = "trumpnme_highscore";
const LEVEL_CLEAR_DURATION = 3000;
const TRANSITION_DURATION = 2200;

const GAME_STATES = Object.freeze({
  LOADING: "LOADING",
  MENU: "MENU",
  PLAYING: "PLAYING",
  LEVEL_CLEAR: "LEVEL_CLEAR",
  NEXT_LEVEL_TRANSITION: "NEXT_LEVEL_TRANSITION",
  PAUSED: "PAUSED",
  GAME_OVER: "GAME_OVER",
  VICTORY: "VICTORY",
});

const BACKGROUND_SECTION_MAP = Object.freeze({
  whiteHouseLawn: "capitolDay",
  golfCourse: "whiteHouseLawn",
  twitterHQ: "nightMall",
  campaignStage: "sunsetChaos",
});

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const dpr = window.devicePixelRatio || 1;
canvas.width = CANVAS_W * dpr;
canvas.height = CANVAS_H * dpr;
ctx.scale(dpr, dpr);

ctx.imageSmoothingEnabled = false;

let input = null;
let player = null;
let camera = null;
let combatSystem = null;
let effects = null;
let ui = null;
let audio = null;
let level = null;
let gameState = GAME_STATES.LOADING;
let accumulator = 0;
let lastFrameTime = 0;
let worldTime = 0;
let currentLevelIndex = 0;
let pendingLevelIndex = 0;
let carryState = null;
let levelClearStats = null;
let levelClearTimer = 0;
let transitionTimer = 0;
let gameOverSelection = 0;
let menuHelpVisible = false;
let highScore = 0;
let victorySummary = null;
let runStats = {
  totalTimeMs: 0,
  maxCombo: 0,
};

function drawLoading(message = "Loading...") {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '600 28px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(message, CANVAS_W / 2, CANVAS_H / 2);
}

function loadHighScore() {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0) || 0;
  } catch (error) {
    console.warn("Failed to read high score", error);
    return 0;
  }
}

function storeHighScore(score) {
  if (score <= highScore) {
    return;
  }

  highScore = score;

  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch (error) {
    console.warn("Failed to store high score", error);
  }
}

function resolveBackgroundSection(sectionKey) {
  return BACKGROUND_SECTION_MAP[sectionKey] ?? "capitolDay";
}

function drawGround(worldWidth) {
  void worldWidth;
}

function captureCarryState() {
  if (!player) {
    return null;
  }

  return {
    hp: player.hp,
    score: player.score,
    activeChar: player.activeChar,
    weapon: player.weapon ? { ...player.weapon } : null,
  };
}

function applyCarryState(snapshot) {
  if (!snapshot || !player) {
    return;
  }

  player.hp = snapshot.hp;
  player.score = snapshot.score;
  player.activeChar = snapshot.activeChar ?? player.activeChar;
  player.weapon = snapshot.weapon ? { ...snapshot.weapon } : null;
}

function resetRunStats() {
  runStats = {
    totalTimeMs: 0,
    maxCombo: 0,
  };
}

function createCombatSystem() {
  combatSystem = new CombatSystem();
}

function loadLevel(index, { preservePlayer = false } = {}) {
  currentLevelIndex = index;
  level = new Level(LEVEL_DATA[index]);
  level.start();

  const snapshot = preservePlayer ? carryState : null;
  player = new Player({ x: 220, worldWidth: level.data.worldWidth });
  applyCarryState(snapshot);

  createCombatSystem();
  camera = camera ?? new Camera();
  effects = effects ?? new EffectsManager(camera);
  effects.setCamera(camera);
  camera.clamp(level.data.worldWidth);
  camera.follow(player.getActiveCharacter());
  worldTime = 0;
  accumulator = 0;
}

function startNewRun() {
  resetRunStats();
  currentLevelIndex = 0;
  pendingLevelIndex = 0;
  carryState = null;
  levelClearStats = null;
  levelClearTimer = 0;
  transitionTimer = 0;
  victorySummary = null;
  gameOverSelection = 0;
  menuHelpVisible = false;
  loadLevel(0, { preservePlayer: false });
  gameState = GAME_STATES.PLAYING;
}

function returnToMenu() {
  carryState = null;
  levelClearStats = null;
  victorySummary = null;
  levelClearTimer = 0;
  transitionTimer = 0;
  menuHelpVisible = false;
  gameOverSelection = 0;
  gameState = GAME_STATES.MENU;
}

function persistCurrentScore() {
  if (player) {
    storeHighScore(player.score);
  }
}

function beginNextLevelTransition() {
  pendingLevelIndex = currentLevelIndex + 1;
  transitionTimer = TRANSITION_DURATION;
  carryState = captureCarryState();
  gameState = GAME_STATES.NEXT_LEVEL_TRANSITION;
}

function finalizeStageClear() {
  if (gameState !== GAME_STATES.PLAYING || !level) {
    return;
  }

  const recoveredHp = player ? Math.max(72, Math.round(player.maxHp * 0.32)) : 0;
  if (player) {
    player.restoreHp(recoveredHp);
  }
  if (recoveredHp > 0) {
    effects?.addText({
      screenSpace: true,
      x: CANVAS_W / 2,
      y: 184,
      vy: -0.05,
      text: `RECOVER +${recoveredHp}`,
      fontSize: 28,
      color: "#c6ffd2",
      life: 1100,
      maxLife: 1100,
      strokeColor: "rgba(12, 40, 16, 0.92)",
      fontWeight: 900,
    });
  }

  runStats.maxCombo = Math.max(runStats.maxCombo, combatSystem.maxCombo);
  levelClearStats = {
    timeMs: level.elapsedTime,
    maxCombo: combatSystem.maxCombo,
    score: player.score,
    recoveredHp,
  };
  levelClearTimer = LEVEL_CLEAR_DURATION;
  carryState = captureCarryState();
  gameState = GAME_STATES.LEVEL_CLEAR;
}

function finalizeVictory() {
  if (!player || gameState === GAME_STATES.VICTORY) {
    return;
  }

  runStats.maxCombo = Math.max(runStats.maxCombo, combatSystem.maxCombo);
  persistCurrentScore();
  victorySummary = {
    score: player.score,
    totalTimeMs: runStats.totalTimeMs,
    maxCombo: runStats.maxCombo,
  };
  audio?.playVictory();
  gameState = GAME_STATES.VICTORY;
}

function finalizeGameOver() {
  persistCurrentScore();
  audio?.playGameOver();
  gameOverSelection = 0;
  gameState = GAME_STATES.GAME_OVER;
}

function handlePlayerHits(hits) {
  const active = player.getActiveCharacter();
  let finalBossDefeated = false;

  for (const hit of hits) {
    effects.addHitEffect(hit.x, hit.y, hit.attackType);
    effects.addDamageNumber(hit.x, hit.y - 8, hit.damage);
    player.score += hit.damage * 10 + (hit.killed ? 250 : 0);

    if (hit.attackType === "heavy") {
      audio?.playHeavyHit();
    } else if (hit.attackType === "uppercut") {
      audio?.playUppercut();
    } else {
      audio?.playPunch();
    }

    if (combatSystem.comboCount >= 2) {
      audio?.playCombo(combatSystem.comboCount);
    }

    if (combatSystem.comboCount >= 4) {
      effects.addComboText(combatSystem.comboCount, active.x + active.width / 2, active.y - 12);
    }

    if (hit.quote) {
      effects.addTrumpQuote(hit.x, hit.y - 30, hit.quote);
      if (hit.quote === "Not enough!") {
        effects.addWeaponPulse(hit.x, hit.y - 10, "CLANG", "#d6e4ff");
        audio?.playArmorHit?.();
      }
    }

    if (hit.enemy.isBossEnemy?.()) {
      effects.addScreenShake(8, 180);
      effects.addWeaponPulse(hit.x, hit.y - 8, "CRACK", "#ffcf69");
    } else if (hit.enemy.type === "bodyguard") {
      effects.addScreenShake(6, 130);
    }

    if (hit.killed) {
      effects.addDeathEffect(hit.x, hit.y);
      audio?.playDeath();
      effects.addKillBanner(
        hit.x,
        hit.y - 10,
        hit.enemy.isBossEnemy?.() ? "BOSS DOWN!" : hit.enemy.type === "bodyguard" ? "BREAK!" : "KO!",
        hit.enemy.isBossEnemy?.() ? "#ffcf69" : hit.enemy.type === "bodyguard" ? "#ff9d4d" : "#fff1a5",
      );
      audio?.playKillSting?.(hit.enemy.isBossEnemy?.() ? "boss" : hit.enemy.type === "bodyguard" ? "bodyguard" : "minion");
    }

    if (hit.heal > 0) {
      effects.addText({
        x: hit.x + 10,
        y: hit.y - 26,
        vy: -1.05,
        text: `+${hit.heal}`,
        fontSize: Math.min(30, 18 + hit.heal * 0.45),
        color: "#9effa1",
        life: 760,
        maxLife: 760,
        strokeColor: "rgba(8, 32, 10, 0.92)",
        fontWeight: 900,
      });

      if (hit.heal >= 8) {
        effects.addWeaponPulse(hit.x, hit.y - 22, "DRAIN", "#a7ff91");
      }
    }

    if (hit.finalBossDefeated) {
      effects.addGoldCoinRain(hit.x, hit.y);
      finalBossDefeated = true;
    }
  }

  return { finalBossDefeated };
}

function handleEnemyHits(hits) {
  if (hits.length > 0) {
    audio?.playEnemyHit();
  }

  for (const hit of hits) {
    effects.addScreenShake(hit.source === "hazard" ? 6 : 4, hit.source === "hazard" ? 180 : 140);
    effects.addText({
      x: hit.x,
      y: hit.y,
      vy: -1,
      text: `-${hit.damage}`,
      fontSize: 26,
      color: "#ff7970",
      life: 700,
      maxLife: 700,
      strokeColor: "rgba(40, 0, 0, 0.9)",
      fontWeight: 900,
    });
  }
}

function handleLevelEvents(events) {
  let finalBossDefeated = false;

  for (const event of events) {
    if (event.type === "bossEntrance") {
      audio?.playBossEntrance();
    }

    if (event.type === "bossPhaseTransition") {
      audio?.playBossPhaseShift?.(event.phase);
    }

    if (event.type === "pickup") {
      const config = WEAPON_TYPES[event.itemType];
      if (config?.pickupRage) {
        combatSystem?.gainRage(config.pickupRage);
      }
      audio?.playPickup();
    }

    if (event.type === "finalBossDefeated") {
      finalBossDefeated = true;
    }
  }

  return { finalBossDefeated };
}

function updateMenu() {
  const pointerTap = input.consumePointerTap();

  if (input.justPressed("KeyH")) {
    menuHelpVisible = !menuHelpVisible;
    audio?.playMenuSelect();
  }

  const menuAction = ui.hitTestMenu(pointerTap, { showHelp: menuHelpVisible });

  if (menuAction === "closeHelp") {
    menuHelpVisible = false;
    audio?.playMenuSelect();
    return;
  }

  if (menuAction === "help") {
    menuHelpVisible = !menuHelpVisible;
    audio?.playMenuSelect();
    return;
  }

  if (menuAction === "start") {
    audio?.playMenuSelect();
    startNewRun();
    return;
  }

  if (input.justPressed("Enter") || input.justPressed("Space") || input.consumeTap()) {
    audio?.playMenuSelect();
    startNewRun();
  }
}

function updatePlaying() {
  if (input.justPressed("Escape")) {
    audio?.playMenuSelect();
    gameState = GAME_STATES.PAUSED;
    return;
  }

  player.update(STEP, input);
  const levelEvents = level.update(STEP, player, combatSystem, effects);
  const enemies = level.getEnemies();
  const playerHits = combatSystem.checkPlayerAttacks(player, enemies, effects);
  const enemyHits = combatSystem.checkEnemyAttacks(player, enemies);

  const hitSummary = handlePlayerHits(playerHits);
  handleEnemyHits(enemyHits);
  const levelSummary = handleLevelEvents(levelEvents);

  const combatEvents = combatSystem.update(STEP, input, player, effects);
  const passiveRagePerSecond = player.weapon?.config?.passiveRagePerSecond ?? 0;

  if (passiveRagePerSecond > 0) {
    combatSystem.gainRage((passiveRagePerSecond * STEP) / 1000);
  }

  if (combatEvents.rageActivated) {
    audio?.playRageActivate();
  }

  effects.update(STEP);
  camera.follow(player.getActiveCharacter());
  camera.clamp(level.data.worldWidth);
  camera.update(STEP);
  worldTime += STEP;
  runStats.totalTimeMs += STEP;
  runStats.maxCombo = Math.max(runStats.maxCombo, combatSystem.maxCombo);

  if (player.hp <= 0) {
    finalizeGameOver();
    return;
  }

  if (
    hitSummary.finalBossDefeated ||
    levelSummary.finalBossDefeated ||
    (level.isCleared() && currentLevelIndex === LEVEL_DATA.length - 1)
  ) {
    finalizeVictory();
    return;
  }

  if (level.isCleared()) {
    finalizeStageClear();
  }
}

function updateLevelClear() {
  levelClearTimer = Math.max(0, levelClearTimer - STEP);
  effects.update(STEP);
  camera.follow(player.getActiveCharacter());
  camera.clamp(level.data.worldWidth);
  camera.update(STEP);

  if (levelClearTimer <= 0) {
    beginNextLevelTransition();
  }
}

function updateTransition() {
  transitionTimer = Math.max(0, transitionTimer - STEP);

  if (transitionTimer <= 0) {
    loadLevel(pendingLevelIndex, { preservePlayer: true });
    carryState = null;
    gameState = GAME_STATES.PLAYING;
  }
}

function updatePaused() {
  const pointerTap = input.consumePointerTap();
  const pauseAction = ui.hitTestPause(pointerTap);

  if (pauseAction === "resume") {
    audio?.playMenuSelect();
    gameState = GAME_STATES.PLAYING;
    return;
  }

  if (pauseAction === "menu") {
    audio?.playMenuSelect();
    returnToMenu();
    return;
  }

  if (input.justPressed("Escape") || input.justPressed("Enter")) {
    audio?.playMenuSelect();
    gameState = GAME_STATES.PLAYING;
    return;
  }

  if (input.justPressed("KeyM")) {
    audio?.playMenuSelect();
    returnToMenu();
  }
}

function updateVictory() {
  effects.update(STEP);
  const pointerTap = input.consumePointerTap();
  const victoryAction = ui.hitTestVictory(pointerTap);

  if (victoryAction === "restart") {
    audio?.playMenuSelect();
    startNewRun();
    return;
  }

  if (input.justPressed("Enter") || input.justPressed("Space") || input.consumeTap()) {
    audio?.playMenuSelect();
    startNewRun();
  }
}

function updateGameOver() {
  const pointerTap = input.consumePointerTap();
  const gameOverAction = ui.hitTestGameOver(pointerTap);

  if (gameOverAction === "restart") {
    gameOverSelection = 0;
    audio?.playMenuSelect();
    startNewRun();
    return;
  }

  if (gameOverAction === "menu") {
    gameOverSelection = 1;
    audio?.playMenuSelect();
    returnToMenu();
    return;
  }

  if (
    input.justPressed("ArrowLeft") ||
    input.justPressed("ArrowUp") ||
    input.justPressed("KeyA")
  ) {
    gameOverSelection = gameOverSelection === 0 ? 1 : 0;
    audio?.playMenuSelect();
  }

  if (
    input.justPressed("ArrowRight") ||
    input.justPressed("ArrowDown") ||
    input.justPressed("KeyS")
  ) {
    gameOverSelection = gameOverSelection === 0 ? 1 : 0;
    audio?.playMenuSelect();
  }

  if (input.justPressed("Enter") || input.justPressed("Space") || input.consumeTap()) {
    audio?.playMenuSelect();

    if (gameOverSelection === 0) {
      startNewRun();
    } else {
      returnToMenu();
    }
  }
}

function drawRageOverlay() {
  if (!combatSystem?.rageActive) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(255, 32, 32, 0.12)";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const gradient = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 50, CANVAS_W / 2, CANVAS_H / 2, 420);
  gradient.addColorStop(0, "rgba(255, 72, 72, 0)");
  gradient.addColorStop(1, "rgba(110, 0, 0, 0.28)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.restore();
}

function drawMenuBackdrop() {
  const menuLevel = LEVEL_DATA[0];
  camera.clamp(menuLevel.worldWidth);
  camera.x = 80 + Math.sin(performance.now() / 2400) * 60;
  ctx.save();
  camera.applyTransform(ctx);
  camera.drawParallaxBg(ctx, "backgrounds", resolveBackgroundSection(menuLevel.bgSection));
  ctx.restore();
  ui.drawMenu(ctx, { highScore, showHelp: menuHelpVisible });
}

function drawGameplayScene() {
  if (!level || !player || !camera) {
    return;
  }

  ctx.save();
  camera.applyTransform(ctx);
  camera.drawParallaxBg(ctx, "backgrounds", resolveBackgroundSection(level.data.bgSection));

  for (const item of level.items) {
    item.draw(ctx);
  }

  const activeChar = player.getActiveCharacter();
  const inactiveChar = player.getInactiveCharacter();
  const drawQueue = [];

  for (const enemy of level.getEnemies()) {
    drawQueue.push({ y: enemy.baseY, x: enemy.x, draw: () => enemy.draw(ctx, null) });
  }

  if (inactiveChar && (player.hp > 0 || inactiveChar.state === "DEAD")) {
    drawQueue.push({ y: inactiveChar.baseY, x: inactiveChar.x, draw: () => player.drawCharacter(ctx, inactiveChar, 0.6, combatSystem.rageActive) });
  }
  
  if (activeChar && (player.hp > 0 || activeChar.state === "DEAD")) {
    drawQueue.push({ y: activeChar.baseY, x: activeChar.x, draw: () => player.drawCharacter(ctx, activeChar, 1.0, combatSystem.rageActive) });
  }

  drawQueue.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const item of drawQueue) {
    item.draw();
  }

  effects.drawWorld(ctx);
  ctx.restore();

  drawRageOverlay();
  effects.drawOverlay(ctx);
  ui.drawHUD(ctx, player, combatSystem);
  ui.drawBossHP(ctx, level.getActiveBoss());
  ui.drawStageTitle(ctx, level);
}

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (gameState === GAME_STATES.MENU) {
    drawMenuBackdrop();
    input?.drawTouchControls(ctx);
    return;
  }

  if (gameState === GAME_STATES.NEXT_LEVEL_TRANSITION) {
    ui.drawLevelTransition(ctx, LEVEL_DATA[pendingLevelIndex], 1 - transitionTimer / TRANSITION_DURATION);
    input?.drawTouchControls(ctx);
    return;
  }

  drawGameplayScene();

  if (gameState === GAME_STATES.LEVEL_CLEAR) {
    ui.drawLevelClear(ctx, levelClearStats, LEVEL_DATA[currentLevelIndex + 1] ?? null);
  } else if (gameState === GAME_STATES.PAUSED) {
    ui.drawPause(ctx);
  } else if (gameState === GAME_STATES.GAME_OVER) {
    ui.drawGameOver(ctx, gameOverSelection);
  } else if (gameState === GAME_STATES.VICTORY) {
    ui.drawVictory(ctx, victorySummary);
  }

  input?.drawTouchControls(ctx);
}

function runGameStep() {
  input?.update();

  if (gameState === GAME_STATES.MENU) {
    updateMenu();
  } else if (gameState === GAME_STATES.PLAYING) {
    updatePlaying();
  } else if (gameState === GAME_STATES.LEVEL_CLEAR) {
    updateLevelClear();
  } else if (gameState === GAME_STATES.NEXT_LEVEL_TRANSITION) {
    updateTransition();
  } else if (gameState === GAME_STATES.PAUSED) {
    updatePaused();
  } else if (gameState === GAME_STATES.GAME_OVER) {
    updateGameOver();
  } else if (gameState === GAME_STATES.VICTORY) {
    updateVictory();
  }
}

function frame(now) {
  if (!lastFrameTime) {
    lastFrameTime = now;
  }

  const delta = Math.min(100, now - lastFrameTime);
  lastFrameTime = now;
  accumulator += delta;

  while (accumulator >= STEP) {
    runGameStep();
    accumulator -= STEP;
  }

  if (gameState === GAME_STATES.LOADING) {
    drawLoading();
  } else {
    render();
  }

  requestAnimationFrame(frame);
}

function exposeDebugApi() {
  window.advanceTime = (ms = STEP) => {
    const steps = Math.max(1, Math.round(ms / STEP));

    for (let index = 0; index < steps; index += 1) {
      runGameStep();
    }

    if (gameState === GAME_STATES.LOADING) {
      drawLoading();
    } else {
      render();
    }
  };

  window.render_game_to_text = () => {
    const active = player?.getActiveCharacter() ?? null;
    const inactive = player?.getInactiveCharacter() ?? null;
    const payload = {
      mode: gameState,
      coordinateSystem: {
        origin: "top-left",
        x: "right",
        y: "down",
      },
      level: level
        ? {
            index: currentLevelIndex,
            name: level.data.name,
            wave: level.currentWave,
          }
        : null,
      camera: camera
        ? {
            x: Math.round(camera.x),
            y: Math.round(camera.y),
          }
        : null,
      player: active
        ? {
            kind: player.activeChar,
            hp: player.hp,
            score: player.score,
            state: active.state,
            x: Math.round(active.x),
            y: Math.round(active.y),
            facing: active.facing,
            weapon: player.weapon?.type ?? null,
          }
        : null,
      partner: inactive
        ? {
            kind: inactive.kind,
            state: inactive.state,
            x: Math.round(inactive.x),
            y: Math.round(inactive.y),
          }
        : null,
      enemies:
        level?.getEnemies().map((enemy) => ({
          id: enemy.id,
          type: enemy.type,
          state: enemy.state,
          hp: enemy.hp,
          x: Math.round(enemy.x),
          y: Math.round(enemy.y),
        })) ?? [],
      items:
        level?.items.map((item) => ({
          type: item.type,
          x: Math.round(item.x),
          y: Math.round(item.y),
        })) ?? [],
    };

    return JSON.stringify(payload);
  };

  window.__TRUMP_N_ME_DEBUG__ = {
    getState: () => ({
      state: gameState,
      worldTime,
      cameraX: camera ? Number(camera.x.toFixed(2)) : 0,
      combo: combatSystem?.comboCount ?? 0,
      rage: combatSystem?.rage ?? 0,
      rageActive: combatSystem?.rageActive ?? false,
      levelIndex: currentLevelIndex,
      currentWave: level?.currentWave ?? -1,
      enemies:
        level?.getEnemies().map((enemy) => ({
          id: enemy.id,
          type: enemy.type,
          x: Number(enemy.x.toFixed(2)),
          y: Number(enemy.y.toFixed(2)),
          hp: enemy.hp,
          alive: enemy.alive,
          state: enemy.state,
          phase: enemy.getBossPhase?.() ?? null,
          hazardCount: enemy.getHazards?.().length ?? 0,
        })) ?? [],
      ...(player ? player.getDebugState() : {}),
    }),
    restart: () => startNewRun(),
    menu: () => returnToMenu(),
    startLevel: (index = 0) => {
      resetRunStats();
      carryState = null;
      loadLevel(Math.max(0, Math.min(index, LEVEL_DATA.length - 1)), { preservePlayer: false });
      gameState = GAME_STATES.PLAYING;
    },
    killEnemies: () => {
      for (const enemy of level?.getEnemies() ?? []) {
        if (enemy.alive) {
          enemy.takeHit(enemy.hp, 0, -6, "heavy");
        }
      }
    },
    fillRage: () => {
      if (combatSystem) {
        combatSystem.rage = 100;
      }
    },
    setScore: (amount = 0) => {
      if (player) {
        player.score = amount;
      }
    },
    damageBoss: (amount = 40) => {
      const boss = level?.getActiveBoss();

      if (boss) {
        boss.takeHit(amount, 0, -2, "heavy");
      }
    },
    damagePlayer: (amount = 40) => {
      if (player) {
        player.takeHit(amount, 0);
      }
    },
  };
}

async function boot() {
  drawLoading();

  try {
    await loadAllSprites();
  } catch (error) {
    console.error(error);
    drawLoading("Failed to load assets");
    return;
  }

  highScore = loadHighScore();
  audio = new AudioManager();
  camera = new Camera();
  effects = new EffectsManager(camera);
  ui = new UI();
  input = new InputManager(window, canvas);

  const unlockAudio = () => {
    audio.init().catch(() => {});
  };

  window.addEventListener("keydown", unlockAudio);
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("touchstart", unlockAudio, { passive: true });

  gameState = GAME_STATES.MENU;
  exposeDebugApi();
  render();
  requestAnimationFrame(frame);
}

boot();
