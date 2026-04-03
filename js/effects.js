const TRUMP_QUOTES = [
  "Fake News!",
  "SAD!",
  "HUGE!",
  "You're fired!",
  "Wrong!",
  "Believe me!",
  "Tremendous!",
  "Bigly!",
];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export class EffectsManager {
  constructor(camera = null) {
    this.camera = camera;
    this.particles = [];
    this.texts = [];
    this.overlayTexts = [];
    this.screenFlashes = [];
    this.beams = [];
    this.phaseBanners = [];
  }

  setCamera(camera) {
    this.camera = camera;
  }

  addParticle(particle) {
    this.particles.push({
      rotation: 0,
      rotSpeed: 0,
      alpha: 1,
      kind: "square",
      gravity: 0.06,
      screenSpace: false,
      ...particle,
    });
  }

  addText(text) {
    const target = text.screenSpace ? this.overlayTexts : this.texts;
    target.push({
      rotation: 0,
      rotSpeed: 0,
      alpha: 1,
      ...text,
    });
  }

  addHitEffect(x, y, attackType) {
    const isBigHit = attackType === "heavy" || attackType === "uppercut";
    const total = isBigHit ? 6 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 3);
    const palette = isBigHit ? ["#fff8be", "#ffd54d", "#ffffff"] : ["#ffffff", "#fff3a1"];

    for (let i = 0; i < total; i += 1) {
      const speed = isBigHit ? randomBetween(2.5, 5.4) : randomBetween(1.8, 3.6);
      const angle = randomBetween(-Math.PI * 0.8, Math.PI * 0.2);
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: isBigHit ? randomBetween(5, 9) : randomBetween(3, 6),
        color: randomItem(palette),
        life: isBigHit ? 320 : 220,
        maxLife: isBigHit ? 320 : 220,
        rotation: randomBetween(-0.5, 0.5),
        rotSpeed: randomBetween(-0.22, 0.22),
      });
    }

    if (isBigHit) {
      this.addParticle({
        kind: "ring",
        x,
        y,
        radius: 10,
        radiusSpeed: 10,
        lineWidth: 5,
        color: "#fff6c2",
        life: 240,
        maxLife: 240,
      });
    }
  }

  addDamageNumber(x, y, damage) {
    this.addText({
      x,
      y,
      vy: -1.3,
      text: String(damage),
      fontSize: 20 + Math.min(18, damage * 0.15),
      color: "#ffd74a",
      life: 720,
      maxLife: 720,
      rotation: randomBetween(-0.08, 0.08),
      rotSpeed: randomBetween(-0.01, 0.01),
      strokeColor: "rgba(40, 0, 0, 0.9)",
      fontWeight: 900,
    });
  }

  addTrumpQuote(x, y, text = null) {
    this.addText({
      x: x + randomBetween(-28, 28),
      y: y + randomBetween(-18, 18),
      vy: randomBetween(-1.5, -0.8),
      text: text ?? randomItem(TRUMP_QUOTES),
      fontSize: randomBetween(18, 30),
      color: "#ffffff",
      life: 900,
      maxLife: 900,
      rotation: randomBetween(-0.18, 0.18),
      rotSpeed: randomBetween(-0.03, 0.03),
      strokeColor: "rgba(0, 0, 0, 0.75)",
      fontWeight: 800,
    });
  }

  addComboText(comboCount, x, y) {
    if (comboCount < 4) {
      return;
    }

    this.addText({
      x,
      y,
      vy: -0.85,
      text: `${comboCount} HIT COMBO!`,
      fontSize: Math.min(52, 18 + comboCount * 2.6),
      color: comboCount >= 8 ? "#ff5c45" : "#ffe45a",
      life: 760,
      maxLife: 760,
      rotation: randomBetween(-0.04, 0.04),
      rotSpeed: randomBetween(-0.008, 0.008),
      strokeColor: "rgba(0, 0, 0, 0.85)",
      fontWeight: 900,
    });

    if (comboCount >= 8) {
      this.addText({
        x,
        y: y - 34,
        vy: -0.65,
        text: Math.random() > 0.5 ? "TREMENDOUS!" : "BELIEVE ME!",
        fontSize: 34 + Math.min(18, comboCount),
        color: "#ffffff",
        life: 900,
        maxLife: 900,
        rotation: randomBetween(-0.1, 0.1),
        rotSpeed: randomBetween(-0.012, 0.012),
        strokeColor: "rgba(139, 0, 0, 0.92)",
        fontWeight: 900,
      });
    }
  }

  addDeathEffect(x, y) {
    for (let i = 0; i < 14; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(1.5, 5.5);
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: randomBetween(4, 9),
        color: i % 2 === 0 ? "#ffe45a" : "#ffffff",
        life: 520,
        maxLife: 520,
        rotation: randomBetween(-0.4, 0.4),
        rotSpeed: randomBetween(-0.3, 0.3),
      });
    }

    for (let i = 0; i < 8; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(2.4, 4.4);
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.6,
        size: randomBetween(5, 8),
        color: "#8fd7ff",
        life: 680,
        maxLife: 680,
        rotation: randomBetween(-0.4, 0.4),
        rotSpeed: randomBetween(-0.24, 0.24),
      });
    }

    for (let i = 0; i < 3; i += 1) {
      this.addTrumpQuote(x + randomBetween(-36, 36), y - randomBetween(0, 42));
    }
  }

  addBossEntrance(x, y, text) {
    this.screenFlashes.push({
      color: "255, 255, 255",
      life: 260,
      maxLife: 260,
      maxAlpha: 0.9,
    });

    this.addText({
      screenSpace: true,
      x: 480,
      y: 136,
      vy: -0.12,
      text,
      fontSize: 44,
      color: "#fff4cb",
      life: 1500,
      maxLife: 1500,
      strokeColor: "rgba(30, 0, 0, 0.95)",
      fontWeight: 900,
      rotation: randomBetween(-0.03, 0.03),
      rotSpeed: 0,
    });

    for (let i = 0; i < 10; i += 1) {
      this.addParticle({
        x: x + randomBetween(-60, 60),
        y: y + randomBetween(-40, 20),
        vx: randomBetween(-2.5, 2.5),
        vy: randomBetween(-3.8, -1.4),
        size: randomBetween(6, 12),
        color: i % 2 === 0 ? "#fff5cb" : "#ff7e52",
        life: 520,
        maxLife: 520,
      });
    }
  }

  addBossPhaseTransition(x, y, text) {
    this.screenFlashes.push({
      color: "255, 255, 255",
      life: 220,
      maxLife: 220,
      maxAlpha: 0.9,
    });

    this.addText({
      screenSpace: true,
      x: 480,
      y: 210,
      vy: -0.05,
      text,
      fontSize: 34,
      color: "#fff6cf",
      life: 1450,
      maxLife: 1450,
      strokeColor: "rgba(20, 0, 0, 0.94)",
      fontWeight: 900,
    });

    this.addParticle({
      kind: "ring",
      x,
      y,
      radius: 18,
      radiusSpeed: 7.5,
      lineWidth: 7,
      color: "#ffffff",
      life: 380,
      maxLife: 380,
    });

    for (let i = 0; i < 12; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(1.5, 4.4);
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        size: randomBetween(5, 10),
        color: i % 2 === 0 ? "#ffffff" : "#ffd56a",
        life: 440,
        maxLife: 440,
      });
    }

    this.phaseBanners.push({
      text,
      phaseText: text.includes("GREAT AGAIN") ? "PHASE 3" : "PHASE 2",
      life: 1650,
      maxLife: 1650,
      bossX: x,
      bossY: y,
    });
  }

  addKillBanner(x, y, kind = "KO!", color = "#ffe06a") {
    this.addText({
      x,
      y: y - 18,
      vy: -0.32,
      text: kind,
      fontSize: 34,
      color,
      life: 700,
      maxLife: 700,
      strokeColor: "rgba(45, 10, 0, 0.95)",
      fontWeight: 900,
      rotation: randomBetween(-0.08, 0.08),
      rotSpeed: randomBetween(-0.01, 0.01),
    });

    this.addParticle({
      kind: "ring",
      x,
      y,
      radius: 20,
      radiusSpeed: 9,
      lineWidth: 6,
      color,
      life: 380,
      maxLife: 380,
    });
  }

  addGoldCoinRain(x = 480, y = 140) {
    for (let i = 0; i < 72; i += 1) {
      this.addParticle({
        kind: "coin",
        x: randomBetween(0, 960),
        y: randomBetween(-240, -20),
        vx: randomBetween(-0.4, 0.4),
        vy: randomBetween(2.8, 5.8),
        size: randomBetween(7, 13),
        color: i % 3 === 0 ? "#fff0a3" : i % 2 === 0 ? "#ffd24a" : "#ffb52f",
        life: randomBetween(1300, 2200),
        maxLife: randomBetween(1300, 2200),
        gravity: 0.05,
        rotSpeed: randomBetween(-0.12, 0.12),
        screenSpace: true,
      });
    }

    for (let i = 0; i < 20; i += 1) {
      const angle = randomBetween(-Math.PI, 0);
      const speed = randomBetween(2.2, 5.8);
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: randomBetween(6, 12),
        color: i % 2 === 0 ? "#ffd85a" : "#fff2a5",
        life: 720,
        maxLife: 720,
      });
    }

    this.addText({
      screenSpace: true,
      x: 480,
      y: 160,
      vy: -0.04,
      text: "COIN RAIN!",
      fontSize: 42,
      color: "#ffe378",
      life: 1400,
      maxLife: 1400,
      strokeColor: "rgba(80, 32, 0, 0.92)",
      fontWeight: 900,
    });
  }

  addProjectileTrail(x, y) {
    this.addParticle({
      kind: "circle",
      x: x + randomBetween(-3, 3),
      y: y + randomBetween(-3, 3),
      vx: randomBetween(-0.7, 0.7),
      vy: randomBetween(-0.8, 0.2),
      size: randomBetween(2, 5),
      color: Math.random() > 0.5 ? "#8fd7ff" : "#ffffff",
      life: 180,
      maxLife: 180,
      gravity: 0.01,
    });
  }

  addBeamEffect(x1, y1, x2, y2, options = {}) {
    this.beams.push({
      x1,
      y1,
      x2,
      y2,
      life: 90,
      maxLife: 90,
      color: options.color ?? "rgba(64, 196, 255, 0.94)",
      coreColor: options.coreColor ?? "rgba(255, 255, 255, 0.92)",
      width: options.width ?? 16,
      coreWidth: options.coreWidth ?? 6,
    });
  }

  addWeaponPulse(x, y, text, color = "#ffe06a") {
    this.addParticle({
      kind: "ring",
      x,
      y,
      radius: 18,
      radiusSpeed: 8.5,
      lineWidth: 6,
      color,
      life: 460,
      maxLife: 460,
    });

    this.addText({
      x,
      y: y - 28,
      vy: -0.35,
      text,
      fontSize: 28,
      color,
      life: 760,
      maxLife: 760,
      strokeColor: "rgba(18, 8, 0, 0.92)",
      fontWeight: 900,
    });
  }

  addWeaponPickup(x, y, name) {
    this.addText({
      x,
      y,
      vy: -1.05,
      text: `${name} GET!`,
      fontSize: 22,
      color: "#fff4cb",
      life: 1100,
      maxLife: 1100,
      strokeColor: "rgba(0, 0, 0, 0.9)",
      fontWeight: 900,
    });

    for (let i = 0; i < 8; i += 1) {
      const angle = randomBetween(-Math.PI, 0);
      const speed = randomBetween(1.3, 3.5);
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: randomBetween(4, 7),
        color: i % 2 === 0 ? "#ffe06a" : "#ffffff",
        life: 420,
        maxLife: 420,
      });
    }
  }

  addScreenShake(intensity, duration) {
    this.camera?.shake(intensity, duration);
  }

  addRageActivation(x, y) {
    this.addScreenShake(10, 300);
    this.screenFlashes.push({
      color: "255, 40, 40",
      life: 220,
      maxLife: 220,
      maxAlpha: 0.28,
    });

    this.addParticle({
      kind: "ring",
      x,
      y,
      radius: 18,
      radiusSpeed: 8.5,
      lineWidth: 6,
      color: "#ff3a2c",
      life: 380,
      maxLife: 380,
    });

    this.addText({
      screenSpace: true,
      x: 480,
      y: 212,
      vy: -0.08,
      text: "RAGE MODE!",
      fontSize: 54,
      color: "#fff2cf",
      life: 1000,
      maxLife: 1000,
      strokeColor: "rgba(80, 0, 0, 0.95)",
      fontWeight: 900,
    });
  }

  update(dt) {
    const frameScale = dt / 16.6667;

    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;

      if (particle.life <= 0) {
        return false;
      }

      particle.alpha = Math.max(0, particle.life / particle.maxLife);

      if (particle.kind === "ring") {
        particle.radius += particle.radiusSpeed * frameScale;
        return true;
      }

      particle.x += particle.vx * frameScale;
      particle.y += particle.vy * frameScale;
      particle.vy += (particle.gravity ?? 0.06) * frameScale;
      particle.rotation += particle.rotSpeed * frameScale;
      return true;
    });

    this.texts = this.texts.filter((text) => this.updateText(text, dt, frameScale));
    this.overlayTexts = this.overlayTexts.filter((text) => this.updateText(text, dt, frameScale));

    this.screenFlashes = this.screenFlashes.filter((flash) => {
      flash.life -= dt;
      return flash.life > 0;
    });

    this.phaseBanners = this.phaseBanners.filter((banner) => {
      banner.life -= dt;
      return banner.life > 0;
    });

    this.beams = this.beams.filter((beam) => {
      beam.life -= dt;
      return beam.life > 0;
    });
  }

  updateText(text, dt, frameScale) {
    text.life -= dt;

    if (text.life <= 0) {
      return false;
    }

    text.x += (text.vx ?? 0) * frameScale;
    text.y += (text.vy ?? 0) * frameScale;
    text.rotation += text.rotSpeed * frameScale;
    text.alpha = Math.max(0, text.life / text.maxLife);
    return true;
  }

  draw(ctx) {
    this.drawWorld(ctx);
  }

  drawWorld(ctx) {
    for (const beam of this.beams) {
      this.drawBeam(ctx, beam);
    }

    for (const particle of this.particles) {
      if (particle.screenSpace) {
        continue;
      }
      this.drawParticle(ctx, particle);
    }

    for (const text of this.texts) {
      this.drawText(ctx, text);
    }
  }

  drawOverlay(ctx) {
    for (const flash of this.screenFlashes) {
      const alpha = (flash.life / flash.maxLife) * flash.maxAlpha;
      ctx.save();
      ctx.fillStyle = `rgba(${flash.color}, ${alpha})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }

    for (const particle of this.particles) {
      if (!particle.screenSpace) {
        continue;
      }
      this.drawParticle(ctx, particle);
    }

    for (const text of this.overlayTexts) {
      this.drawText(ctx, text);
    }

    for (const banner of this.phaseBanners) {
      this.drawPhaseBanner(ctx, banner);
    }
  }

  drawBeam(ctx, beam) {
    const alpha = beam.life / beam.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.strokeStyle = beam.color;
    ctx.lineWidth = beam.width;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();

    ctx.strokeStyle = beam.coreColor;
    ctx.lineWidth = beam.coreWidth;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.restore();
  }

  drawParticle(ctx, particle) {
    ctx.save();
    ctx.globalAlpha = particle.alpha;
    ctx.translate(particle.x, particle.y);

    if (particle.kind === "ring") {
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = particle.lineWidth;
      ctx.beginPath();
      ctx.arc(0, 0, particle.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.rotate(particle.rotation);
    ctx.fillStyle = particle.color;

    if (particle.kind === "coin") {
      ctx.beginPath();
      ctx.ellipse(0, 0, particle.size, particle.size * 0.76, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 248, 204, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 248, 204, 0.44)";
      ctx.fillRect(-particle.size * 0.14, -particle.size * 0.48, particle.size * 0.28, particle.size * 0.96);
      ctx.restore();
      return;
    }

    if (particle.kind === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    ctx.restore();
  }

  drawText(ctx, text) {
    ctx.save();
    ctx.globalAlpha = text.alpha;
    ctx.translate(text.x, text.y);
    ctx.rotate(text.rotation);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = text.strokeColor ?? "rgba(0, 0, 0, 0.85)";
    ctx.fillStyle = text.color;
    ctx.font = `${text.fontWeight ?? 800} ${Math.round(text.fontSize)}px "Impact", "Arial Black", sans-serif`;
    ctx.strokeText(text.text, 0, 0);
    ctx.fillText(text.text, 0, 0);
    ctx.restore();
  }

  drawPhaseBanner(ctx, banner) {
    const alpha = Math.min(1, banner.life / 280, (banner.maxLife - banner.life) / 240);
    const panelWidth = 470;
    const panelHeight = 104;
    const x = 480 - panelWidth / 2;
    const y = 126;

    ctx.save();
    ctx.globalAlpha = alpha;
    const grad = ctx.createLinearGradient(x, y, x + panelWidth, y + panelHeight);
    grad.addColorStop(0, "rgba(76, 7, 7, 0.88)");
    grad.addColorStop(1, "rgba(24, 4, 4, 0.82)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, panelWidth, panelHeight);
    ctx.strokeStyle = "rgba(255, 220, 145, 0.56)";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, panelWidth, panelHeight);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffd56a";
    ctx.font = '900 22px "Arial Black", sans-serif';
    ctx.fillText(banner.phaseText, 480, y + 24);
    ctx.fillStyle = "#fff5d1";
    ctx.font = '900 32px "Impact", "Arial Black", sans-serif';
    ctx.fillText(banner.text, 480, y + 62);

    ctx.strokeStyle = "rgba(255, 240, 200, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 82);
    ctx.lineTo(x + panelWidth - 22, y + 82);
    ctx.stroke();
    ctx.restore();
  }
}
