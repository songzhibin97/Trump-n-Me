import { GROUND_Y } from "./constants.js";
import { drawSprite, getSpriteAnimation } from "./sprite-loader.js";

const ITEM_ICON_INDEX = Object.freeze({
  golfClub: 0,
  magaHat: 1,
  twitterPhone: 2,
  goldenWig: 3,
});

const ICON_SCALE = 0.28;
const PICKUP_SIZE = 58;

export const WEAPON_TYPES = Object.freeze({
  golfClub: {
    name: "Golf Club",
    description: "Heavy swings cleave nearby foes",
    accent: "#ffd76a",
    duration: 16000,
    uses: 12,
    dmgMult: 1.45,
    rangeMult: 1.35,
    splashDamageMult: 0.8,
    splashRadius: 138,
    splashOn: ["light", "heavy", "uppercut"],
  },
  magaHat: {
    name: "MAGA Hat",
    description: "Massive rage gain and low-HP finisher",
    accent: "#ff6f61",
    duration: 16000,
    uses: 10,
    dmgMult: 1.2,
    rangeMult: 1.0,
    rageGainMult: 3.2,
    bonusRageOnHit: 18,
    executeThreshold: 42,
    finisherMult: 2.2,
    passiveRagePerSecond: 10,
    pickupRage: 35,
  },
  twitterPhone: {
    name: "Twitter Phone",
    description: "Heavy hits chain phones through crowds",
    accent: "#8fd7ff",
    duration: 12000,
    uses: 8,
    dmgMult: 1.15,
    rangeMult: 1.1,
    chainDamage: 22,
    chainCount: 3,
    chainRadius: 420,
    chainOn: ["light", "heavy", "uppercut"],
  },
  goldenWig: {
    name: "Golden Wig",
    description: "Heal on hit and crown shockwaves",
    accent: "#ffe27a",
    duration: 20000,
    uses: 16,
    dmgMult: 1.55,
    rangeMult: 1.2,
    healOnHit: 10,
    shockwaveDamage: 18,
    shockwaveRadius: 132,
    shockwaveOn: ["light", "heavy", "uppercut"],
    bonusRageOnHit: 10,
  },
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export class Item {
  constructor(type, x, y) {
    const config = WEAPON_TYPES[type];

    if (!config) {
      throw new Error(`Unknown item type: ${type}`);
    }

    this.type = type;
    this.config = config;
    this.x = x;
    this.baseY = y ?? GROUND_Y - 68;
    this.y = this.baseY;
    this.bobTimer = Math.random() * Math.PI * 2;
    this.collected = false;
  }

  update(dt) {
    if (this.collected) {
      return;
    }

    this.bobTimer += dt * 0.0052;
    this.y = this.baseY + Math.sin(this.bobTimer) * 8;
  }

  draw(ctx) {
    if (this.collected) {
      return;
    }

    const pulse = 0.55 + Math.sin(this.bobTimer * 1.8) * 0.18;
    const radius = 30 + Math.sin(this.bobTimer * 1.2) * 4;
    const iconIndex = ITEM_ICON_INDEX[this.type];
    const pickupFrame = getSpriteAnimation("itemsUI", "showcase").frames[iconIndex];
    const pickupScale = iconIndex === 0 ? 0.12 : 0.19 + Math.sin(this.bobTimer * 1.4) * 0.006;

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = `${this.config.accent ?? "#ffd76a"}55`;
    ctx.beginPath();
    ctx.ellipse(0, 22, radius + 6, radius * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 247, 211, ${clamp(pulse * 0.72, 0.3, 0.7)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 18, radius, radius * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(-pickupFrame.w * pickupScale * 0.5, -pickupFrame.h * pickupScale * 0.62);
    ctx.rotate(Math.sin(this.bobTimer * 0.7) * 0.03);
    ctx.scale(pickupScale, pickupScale);
    drawSprite(ctx, "itemsUI", "showcase", iconIndex, 0, 0, false);
    ctx.restore();

    ctx.save();
    ctx.translate(-24, 8);
    ctx.scale(ICON_SCALE, ICON_SCALE);
    drawSprite(ctx, "itemsUI", "icons", iconIndex, 0, 0, false);
    ctx.restore();
    ctx.restore();
  }

  getPickupBox() {
    return {
      x: this.x - PICKUP_SIZE / 2,
      y: this.y - PICKUP_SIZE / 2,
      w: PICKUP_SIZE,
      h: PICKUP_SIZE,
    };
  }
}
