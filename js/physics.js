import { FRICTION, GRAVITY, GROUND_Y } from "./constants.js";

export function applyGravity(entity) {
  entity.vy += GRAVITY;
}

export function applyFriction(entity) {
  entity.vx *= FRICTION;
}

export function moveEntity(entity) {
  entity.x += entity.vx;
  entity.y += entity.vy;

  const floorY = (entity.baseY ?? GROUND_Y) - entity.height;

  if (entity.y >= floorY || (entity.onGround && entity.vy === 0)) {
    entity.y = floorY;
    entity.vy = 0;
    entity.onGround = true;
  } else {
    entity.onGround = false;
  }
}

export function checkAABB(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
