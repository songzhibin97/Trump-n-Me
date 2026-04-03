import { CANVAS_H, CANVAS_W, RAGE_MAX } from "./constants.js";
import { drawSprite, getSpriteAnimation } from "./sprite-loader.js";

const ITEM_ICON_INDEX = Object.freeze({
  golfClub: 0,
  magaHat: 1,
  twitterPhone: 2,
  goldenWig: 3,
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function pointInRect(point, rect) {
  if (!point || !rect) {
    return false;
  }

  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function formatSeconds(ms) {
  return `${Math.ceil(ms / 1000)}s`;
}

function formatStageTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function drawPanel(ctx, x, y, w, h, options = {}) {
  const radius = options.radius ?? 0;
  const fill = ctx.createLinearGradient(x, y, x, y + h);
  fill.addColorStop(0, options.top ?? "rgba(17, 36, 54, 0.74)");
  fill.addColorStop(1, options.bottom ?? "rgba(5, 12, 20, 0.58)");

  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = options.stroke ?? "rgba(255, 222, 158, 0.24)";
  ctx.lineWidth = options.lineWidth ?? 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.stroke();

  if (options.highlight !== false) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 1.5, y + 1.5, w - 3, Math.max(8, h * 0.38), Math.max(0, radius - 2));
    ctx.stroke();
  }

  ctx.restore();
}

export class UI {
  getMenuButtonRects() {
    return {
      start: { x: 80, y: 318, w: 260, h: 58 },
      help: { x: 80, y: 390, w: 260, h: 50 },
      helpModal: { x: 340, y: 74, w: 560, h: 390 },
    };
  }

  getPauseButtonRects() {
    return {
      resume: { x: CANVAS_W / 2 - 120, y: CANVAS_H / 2 + 70, w: 240, h: 50 },
      menu: { x: CANVAS_W / 2 - 120, y: CANVAS_H / 2 + 132, w: 240, h: 50 },
    };
  }

  getVictoryButtonRects() {
    return {
      restart: { x: CANVAS_W / 2 - 120, y: 448, w: 240, h: 54 },
    };
  }

  getGameOverButtonRects() {
    return {
      restart: { x: CANVAS_W / 2 - 150, y: 280, w: 130, h: 52 },
      menu: { x: CANVAS_W / 2 + 20, y: 280, w: 130, h: 52 },
    };
  }

  hitTestMenu(point, { showHelp = false } = {}) {
    if (!point) {
      return null;
    }

    const rects = this.getMenuButtonRects();

    if (showHelp) {
      return "closeHelp";
    }

    if (pointInRect(point, rects.start)) {
      return "start";
    }

    if (pointInRect(point, rects.help)) {
      return "help";
    }

    return null;
  }

  hitTestPause(point) {
    if (!point) {
      return null;
    }

    const rects = this.getPauseButtonRects();

    if (pointInRect(point, rects.resume)) {
      return "resume";
    }

    if (pointInRect(point, rects.menu)) {
      return "menu";
    }

    return null;
  }

  hitTestVictory(point) {
    if (!point) {
      return null;
    }

    const rects = this.getVictoryButtonRects();
    return pointInRect(point, rects.restart) ? "restart" : null;
  }

  hitTestGameOver(point) {
    if (!point) {
      return null;
    }

    const rects = this.getGameOverButtonRects();

    if (pointInRect(point, rects.restart)) {
      return "restart";
    }

    if (pointInRect(point, rects.menu)) {
      return "menu";
    }

    return null;
  }

  drawHUD(ctx, player, combatSystem) {
    const hpRatio = clamp(player.hp / player.maxHp, 0, 1);
    const rageRatio = clamp(combatSystem.rage / RAGE_MAX, 0, 1);
    const now = performance.now();
    const comboScale = combatSystem.comboCount >= 8 ? 1.08 + Math.sin(now / 45) * 0.08 : 1;
    const comboShake = combatSystem.comboCount >= 8 ? Math.sin(now / 22) * 5 : 0;
    const rageFlash = combatSystem.rage >= RAGE_MAX && !combatSystem.rageActive && Math.floor(now / 120) % 2 === 0;
    const currentLabel = player.active.kind.toUpperCase();

    ctx.save();
    drawPanel(ctx, 18, 18, 276, 90, {
      radius: 12,
      top: "rgba(17, 52, 82, 0.72)",
      bottom: "rgba(9, 20, 34, 0.54)",
      stroke: "rgba(151, 211, 255, 0.24)",
    });

    ctx.fillStyle = "#f5f5f5";
    ctx.font = '700 12px "Arial Black", sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("HP", 82, 24);

    ctx.fillStyle = currentLabel === "DAD" ? "#1e315f" : "#5f2d1e";
    ctx.fillRect(26, 28, 44, 44);
    ctx.strokeStyle = "#f0d27a";
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 28, 44, 44);
    ctx.fillStyle = "#fff7d0";
    ctx.font = '900 12px "Arial Black", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(currentLabel, 48, 50);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#1b0a0a";
    ctx.fillRect(82, 40, 200, 16);
    ctx.fillStyle = "#4b1010";
    ctx.fillRect(84, 42, 196, 12);
    ctx.fillStyle = combatSystem.rageActive ? "#ff9d4d" : "#ff4040";
    ctx.fillRect(84, 42, 196 * hpRatio, 12);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(82, 40, 200, 16);

    ctx.fillStyle = "#f5f5f5";
    ctx.font = '700 11px "Arial Black", sans-serif';
    ctx.fillText("RAGE", 82, 63);
    ctx.fillStyle = "#1b0a24";
    ctx.fillRect(82, 78, 150, 10);
    ctx.fillStyle = rageFlash ? "#ffd64d" : combatSystem.rageActive ? "#ff8a8a" : "#973dff";
    ctx.fillRect(83, 79, 148 * rageRatio, 8);
    ctx.strokeStyle = rageFlash ? "#ffe9a5" : "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(82, 78, 150, 10);

    ctx.fillStyle = "#ffffff";
    ctx.font = '900 28px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`SCORE: ${player.score}`, CANVAS_W - 24, 24);

    if (combatSystem.rageActive) {
      ctx.fillStyle = "#ffd7d1";
      ctx.font = '900 14px "Arial Black", sans-serif';
      ctx.fillText(`RAGE ${formatSeconds(combatSystem.rageTimer)}`, 240, 73);
    }

    if (combatSystem.comboCount > 0) {
      ctx.save();
      ctx.translate(CANVAS_W / 2 + comboShake, 54);
      ctx.scale(comboScale, comboScale);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 5;
      ctx.strokeStyle = combatSystem.comboCount >= 8 ? "#5e0000" : "#3a2400";
      ctx.fillStyle = combatSystem.comboCount >= 8 ? "#ff4a4a" : "#ffe15a";
      ctx.font = '900 34px "Impact", "Arial Black", sans-serif';
      ctx.strokeText(`${combatSystem.comboCount} HITS!`, 0, 0);
      ctx.fillText(`${combatSystem.comboCount} HITS!`, 0, 0);
      ctx.restore();
    }

    this.drawWeaponIndicator(ctx, player.weapon);
    ctx.restore();
  }

  drawWeaponIndicator(ctx, weapon) {
    const panelX = 20;
    const panelY = CANVAS_H - 114;

    ctx.save();
    drawPanel(ctx, panelX, panelY, 244, 86, {
      radius: 12,
      top: "rgba(18, 34, 24, 0.52)",
      bottom: "rgba(8, 14, 10, 0.34)",
      stroke: "rgba(255, 233, 154, 0.18)",
    });

    ctx.fillStyle = "#fff1be";
    ctx.font = '900 14px "Arial Black", sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("WEAPON", panelX + 16, panelY + 10);

    if (!weapon) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.font = '700 18px "Arial Black", sans-serif';
      ctx.fillText("Bare Hands", panelX + 16, panelY + 40);
      ctx.fillStyle = "rgba(255, 241, 190, 0.6)";
      ctx.font = '700 11px "Arial Black", sans-serif';
      ctx.fillText("Stage pickups change your move set", panelX + 16, panelY + 64);
      ctx.restore();
      return;
    }

    const iconIndex = ITEM_ICON_INDEX[weapon.type];
    const accent = weapon.config.accent ?? "#ffcb58";
    const pickupFrame = getSpriteAnimation("itemsUI", "showcase").frames[iconIndex];
    const pickupScale = iconIndex === 0 ? 0.08 : 0.105;

    ctx.save();
    ctx.fillStyle = `${accent}22`;
    ctx.fillRect(panelX + 12, panelY + 20, 56, 56);
    ctx.strokeStyle = `${accent}66`;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX + 12, panelY + 20, 56, 56);
    ctx.translate(panelX + 40, panelY + 48);
    ctx.scale(pickupScale, pickupScale);
    ctx.translate(-pickupFrame.w / 2, -pickupFrame.h / 2);
    drawSprite(ctx, "itemsUI", "showcase", iconIndex, 0, 0, false);
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = '900 18px "Impact", "Arial Black", sans-serif';
    ctx.fillText(weapon.config.name, panelX + 76, panelY + 28);
    ctx.fillStyle = accent;
    ctx.fillRect(panelX + 76, panelY + 45, 136, 2);
    ctx.fillStyle = "#cfe9ff";
    ctx.font = '700 11px "Arial Black", sans-serif';
    ctx.fillText(weapon.config.description ?? "", panelX + 76, panelY + 46);
    ctx.fillStyle = "#f2cf6f";
    ctx.font = '700 13px "Arial Black", sans-serif';
    ctx.fillText(`Time ${formatSeconds(weapon.timer)}`, panelX + 76, panelY + 60);
    ctx.fillText(`Uses ${weapon.usesLeft}/${weapon.maxUses}`, panelX + 154, panelY + 60);

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.strokeRect(panelX + 76, panelY + 72, 140, 8);
    ctx.fillStyle = "#3a1f08";
    ctx.fillRect(panelX + 77, panelY + 73, 138, 6);
    ctx.fillStyle = "#ffcb58";
    ctx.fillRect(panelX + 77, panelY + 73, 138 * clamp(weapon.timer / weapon.maxTimer, 0, 1), 6);
    ctx.restore();
    ctx.restore();
  }

  drawBossHP(ctx, boss) {
    if (!boss) {
      return;
    }

    const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
    const barWidth = 420;
    const x = (CANVAS_W - barWidth) / 2;
    const y = CANVAS_H - 28;
    const phase = boss.getBossPhase?.();

    ctx.save();
    drawPanel(ctx, x - 12, y - 36, barWidth + 24, 52, {
      radius: 14,
      top: "rgba(43, 14, 12, 0.84)",
      bottom: "rgba(15, 6, 6, 0.68)",
      stroke: "rgba(255, 217, 162, 0.3)",
    });
    ctx.fillStyle = "#651111";
    ctx.fillRect(x, y - 14, barWidth, 20);
    ctx.fillStyle = phase === 3 ? "#ff9d4d" : "#ff4b3d";
    ctx.fillRect(x, y - 14, barWidth * ratio, 20);
    ctx.strokeStyle = "#ffd9a2";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y - 14, barWidth, 20);
    ctx.fillStyle = "#fff2cf";
    ctx.font = '900 20px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(boss.displayName.toUpperCase(), CANVAS_W / 2, y - 18);

    if (phase) {
      ctx.fillStyle = "#ffe585";
      ctx.font = '900 14px "Arial Black", sans-serif';
      ctx.fillText(`PHASE ${phase}`, CANVAS_W / 2 + 170, y - 18);
    }

    if (boss.phaseTransitionTimer > 0) {
      const pulse = 0.75 + Math.sin(performance.now() / 60) * 0.25;
      ctx.strokeStyle = `rgba(255, 244, 177, ${0.45 + pulse * 0.35})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 6, y - 20, barWidth + 12, 32);
    }

    ctx.restore();
  }

  drawStageTitle(ctx, level) {
    if (!level || level.titleTimer <= 0) {
      return;
    }

    const fadeIn = Math.min(1, (level.titleDuration - level.titleTimer) / 500);
    const fadeOut = Math.min(1, level.titleTimer / 700);
    const alpha = Math.min(fadeIn, fadeOut);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f4e7be";
    ctx.strokeStyle = "rgba(20, 0, 0, 0.92)";
    ctx.lineWidth = 6;
    ctx.font = '900 28px "Impact", "Arial Black", sans-serif';
    ctx.strokeText(`STAGE ${level.data.id}`, CANVAS_W / 2, 88);
    ctx.fillText(`STAGE ${level.data.id}`, CANVAS_W / 2, 88);
    ctx.font = '900 50px "Impact", "Arial Black", sans-serif';
    ctx.strokeText(level.data.name.toUpperCase(), CANVAS_W / 2, 140);
    ctx.fillText(level.data.name.toUpperCase(), CANVAS_W / 2, 140);
    ctx.restore();
  }

  drawMenu(ctx, { highScore = 0, showHelp = false } = {}) {
    const rects = this.getMenuButtonRects();
    const pulse = 0.94 + Math.sin(performance.now() / 420) * 0.06;

    ctx.save();
    const overlay = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    overlay.addColorStop(0, "rgba(6, 7, 10, 0.5)");
    overlay.addColorStop(0.55, "rgba(10, 6, 4, 0.72)");
    overlay.addColorStop(1, "rgba(0, 0, 0, 0.9)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#fff5cd";
    ctx.font = '900 78px "Impact", "Arial Black", sans-serif';
    ctx.fillText("狂扁川建国", 74, 78);

    ctx.save();
    ctx.translate(78, 180);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#ffcb58";
    ctx.font = '900 46px "Impact", "Arial Black", sans-serif';
    ctx.fillText("BEAT UP TRUMP", 0, 0);
    ctx.restore();

    ctx.fillStyle = "rgba(255, 243, 210, 0.92)";
    ctx.font = '700 18px "Arial Black", sans-serif';
    ctx.fillText("Father and son vs. four stages of bad taste.", 80, 230);
    ctx.fillText(`HIGH SCORE  ${highScore}`, 80, 258);

    this.drawChoiceButton(ctx, rects.start.x, rects.start.y, rects.start.w, rects.start.h, "开始游戏 (Enter)", true);
    this.drawChoiceButton(ctx, rects.help.x, rects.help.y, rects.help.w, rects.help.h, "操作说明 (H)", false);

    ctx.fillStyle = "rgba(255, 225, 164, 0.88)";
    ctx.font = '900 14px "Arial Black", sans-serif';
    ctx.fillText("ESC pauses during play", 84, 456);

    if (showHelp) {
      this.drawHelpModal(ctx);
    }

    ctx.restore();
  }

  drawHelpModal(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(340, 74, 560, 390);
    ctx.strokeStyle = "rgba(255, 222, 158, 0.44)";
    ctx.lineWidth = 2;
    ctx.strokeRect(340, 74, 560, 390);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#fff2ca";
    ctx.font = '900 28px "Impact", "Arial Black", sans-serif';
    ctx.fillText("操作说明", 370, 102);

    const lines = [
      "方向键 / W: Move / Jump",
      "A or J: Light Punch",
      "S or K: Heavy Hit",
      "A+S / J+K: Uppercut",
      "Tab: Switch Character",
      "Double Tap Left / Right: Dash",
      "Space or full rage: Rage Activate",
      "ESC: Pause",
    ];

    ctx.fillStyle = "#ffffff";
    ctx.font = '700 18px "Arial Black", sans-serif';
    lines.forEach((line, index) => {
      ctx.fillText(line, 374, 156 + index * 34);
    });

    ctx.fillStyle = "#ffd76c";
    ctx.font = '900 15px "Arial Black", sans-serif';
    ctx.fillText("Touch devices show virtual controls automatically.", 374, 414);
    ctx.restore();
  }

  drawLevelClear(ctx, stats, nextLevel) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(30, 0, 0, 0.9)";
    ctx.fillStyle = "#fff1c4";
    ctx.lineWidth = 6;
    ctx.font = '900 56px "Impact", "Arial Black", sans-serif';
    ctx.strokeText("LEVEL CLEAR", CANVAS_W / 2, 132);
    ctx.fillText("LEVEL CLEAR", CANVAS_W / 2, 132);

    ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
    ctx.fillRect(258, 186, 444, 174);
    ctx.strokeStyle = "rgba(255, 226, 164, 0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(258, 186, 444, 174);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = '900 24px "Arial Black", sans-serif';
    ctx.fillText(`Time: ${formatStageTime(stats.timeMs)}`, 292, 222);
    ctx.fillText(`Max Combo: ${stats.maxCombo}`, 292, 266);
    ctx.fillText(`Score: ${stats.score}`, 292, 310);

    if (nextLevel) {
      ctx.fillStyle = "#ffd76c";
      ctx.font = '900 18px "Arial Black", sans-serif';
      ctx.fillText(`Next: STAGE ${nextLevel.id} - ${nextLevel.name.toUpperCase()}`, 292, 336);
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe17f";
    ctx.font = '900 18px "Arial Black", sans-serif';
    ctx.fillText("Preparing next stage...", CANVAS_W / 2, 404);
    ctx.restore();
  }

  drawLevelTransition(ctx, levelData, progress) {
    const fadeIn = clamp(progress / 0.35, 0, 1);
    const fadeOut = clamp((1 - progress) / 0.28, 0, 1);
    const alpha = Math.min(fadeIn, fadeOut);

    ctx.save();
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff0c2";
    ctx.strokeStyle = "rgba(60, 0, 0, 0.92)";
    ctx.lineWidth = 6;
    ctx.font = '900 34px "Impact", "Arial Black", sans-serif';
    ctx.strokeText(`STAGE ${levelData.id}`, CANVAS_W / 2, 210);
    ctx.fillText(`STAGE ${levelData.id}`, CANVAS_W / 2, 210);
    ctx.font = '900 62px "Impact", "Arial Black", sans-serif';
    ctx.strokeText(levelData.name.toUpperCase(), CANVAS_W / 2, 282);
    ctx.fillText(levelData.name.toUpperCase(), CANVAS_W / 2, 282);
    ctx.restore();
  }

  drawVictory(ctx, summary) {
    const rects = this.getVictoryButtonRects();
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.76)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(64, 22, 0, 0.95)";
    ctx.fillStyle = "#ffd24a";
    ctx.lineWidth = 8;
    ctx.font = '900 84px "Impact", "Arial Black", sans-serif';
    ctx.strokeText("VICTORY!", CANVAS_W / 2, 118);
    ctx.fillText("VICTORY!", CANVAS_W / 2, 118);

    ctx.fillStyle = "rgba(0, 0, 0, 0.54)";
    ctx.fillRect(254, 182, 452, 176);
    ctx.strokeStyle = "rgba(255, 219, 120, 0.34)";
    ctx.lineWidth = 2;
    ctx.strokeRect(254, 182, 452, 176);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = '900 24px "Arial Black", sans-serif';
    ctx.fillText(`Total Score: ${summary.score}`, 288, 220);
    ctx.fillText(`Total Time: ${formatStageTime(summary.totalTimeMs)}`, 288, 262);
    ctx.fillText(`Highest Combo: ${summary.maxCombo}`, 288, 304);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe7a4";
    ctx.font = '900 26px "Impact", "Arial Black", sans-serif';
    ctx.fillText("You've saved America... for now.", CANVAS_W / 2, 406);
    this.drawChoiceButton(ctx, rects.restart.x, rects.restart.y, rects.restart.w, rects.restart.h, "再来一次 (Enter)", true);
    ctx.restore();
  }

  drawGameOver(ctx, selection) {
    const rects = this.getGameOverButtonRects();
    ctx.save();
    ctx.fillStyle = "rgba(10, 0, 0, 0.74)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(40, 0, 0, 0.95)";
    ctx.fillStyle = "#ff7365";
    ctx.lineWidth = 6;
    ctx.font = '900 64px "Impact", "Arial Black", sans-serif';
    ctx.strokeText("GAME OVER", CANVAS_W / 2, 170);
    ctx.fillText("GAME OVER", CANVAS_W / 2, 170);

    this.drawChoiceButton(ctx, rects.restart.x, rects.restart.y, rects.restart.w, rects.restart.h, "再来一次", selection === 0);
    this.drawChoiceButton(ctx, rects.menu.x, rects.menu.y, rects.menu.w, rects.menu.h, "回到菜单", selection === 1);

    ctx.fillStyle = "#ffd9cf";
    ctx.font = '900 18px "Arial Black", sans-serif';
    ctx.fillText("Arrow Keys / A,S to switch   Enter to confirm", CANVAS_W / 2, 380);
    ctx.restore();
  }

  drawPause(ctx) {
    const rects = this.getPauseButtonRects();
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff4cb";
    ctx.strokeStyle = "rgba(20, 0, 0, 0.92)";
    ctx.lineWidth = 6;
    ctx.font = '900 72px "Impact", "Arial Black", sans-serif';
    ctx.strokeText("PAUSED", CANVAS_W / 2, CANVAS_H / 2 - 12);
    ctx.fillText("PAUSED", CANVAS_W / 2, CANVAS_H / 2 - 12);
    ctx.font = '900 18px "Arial Black", sans-serif';
    ctx.fillText("Press ESC to resume", CANVAS_W / 2, CANVAS_H / 2 + 38);
    this.drawChoiceButton(ctx, rects.resume.x, rects.resume.y, rects.resume.w, rects.resume.h, "继续游戏", true);
    this.drawChoiceButton(ctx, rects.menu.x, rects.menu.y, rects.menu.w, rects.menu.h, "回到菜单", false);
    ctx.restore();
  }

  drawChoiceButton(ctx, x, y, width, height, label, selected) {
    ctx.save();
    ctx.fillStyle = selected ? "#ffcb58" : "rgba(0, 0, 0, 0.42)";
    ctx.strokeStyle = selected ? "#fff6d7" : "rgba(255, 255, 255, 0.24)";
    ctx.lineWidth = 3;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = selected ? "#2a0000" : "#fff3ce";
    ctx.font = '900 22px "Arial Black", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + width / 2, y + height / 2);
    ctx.restore();
  }
}
