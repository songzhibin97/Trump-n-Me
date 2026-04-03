import { CANVAS_H, CANVAS_W } from "./constants.js";
import { SPRITE_SHEETS } from "./sprite-config.js";
import { getLoadedImage } from "./sprite-loader.js";

function resolveSection(sheet, sectionRef) {
  if (!sheet) {
    return null;
  }

  if (typeof sectionRef === "string") {
    return sheet[sectionRef] ?? sheet.sections?.find((section) => section.key === sectionRef) ?? sheet.sections?.[0] ?? null;
  }

  return sheet.sections?.[sectionRef ?? 0] ?? sheet.sections?.[0] ?? null;
}

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.worldWidth = CANVAS_W;
    this.leftDeadZone = CANVAS_W / 3;
    this.rightDeadZone = CANVAS_W - this.leftDeadZone;
    this.topDeadZone = 380;
    this.bottomDeadZone = 490;
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  follow(target) {
    if (!target) {
      return;
    }

    const centerX = target.x + target.width / 2;
    const screenX = centerX - this.x;

    if (screenX > this.rightDeadZone) {
      this.x = centerX - this.rightDeadZone;
    } else if (screenX < this.leftDeadZone) {
      this.x = centerX - this.leftDeadZone;
    }

    const centerY = target.baseY ?? target.y;
    const screenY = centerY - this.y;

    if (screenY > this.bottomDeadZone) {
      this.y = centerY - this.bottomDeadZone;
    } else if (screenY < this.topDeadZone) {
      this.y = centerY - this.topDeadZone;
    }
  }

  clamp(worldWidth) {
    this.worldWidth = worldWidth;
    const maxX = Math.max(0, worldWidth - CANVAS_W);
    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, this.y);
  }

  shake(intensity, duration) {
    if (duration <= 0 || intensity <= 0) {
      return;
    }

    if (duration > this.shakeTimer || intensity > this.shakeIntensity) {
      this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
      this.shakeDuration = duration;
      this.shakeTimer = duration;
    }
  }

  update(dt) {
    if (this.shakeTimer <= 0) {
      this.shakeTimer = 0;
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      return;
    }

    this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    const decay = this.shakeDuration > 0 ? this.shakeTimer / this.shakeDuration : 0;
    const amplitude = this.shakeIntensity * decay;
    this.shakeOffsetX = (Math.random() * 2 - 1) * amplitude;
    this.shakeOffsetY = (Math.random() * 2 - 1) * amplitude * 0.65;
  }

  applyTransform(ctx) {
    ctx.translate(-Math.round(this.x) + this.shakeOffsetX, -Math.round(this.y) + this.shakeOffsetY);
  }

  drawParallaxBg(ctx, sheetKey, sectionRef) {
    const image = getLoadedImage(sheetKey);
    const sheet = SPRITE_SHEETS[sheetKey];
    const section = resolveSection(sheet, sectionRef);

    if (!image || !section) {
      return;
    }

    const source = section.frames[0];
    const worldWidth = this.worldWidth;

    ctx.drawImage(image, source.x, source.y, source.w, source.h, 0, this.y, worldWidth, CANVAS_H);

    ctx.save();
    const haze = ctx.createLinearGradient(0, this.y, 0, this.y + CANVAS_H);
    haze.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    haze.addColorStop(0.32, "rgba(255, 255, 255, 0.04)");
    haze.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, this.y, worldWidth, CANVAS_H);
    ctx.restore();
  }
}
