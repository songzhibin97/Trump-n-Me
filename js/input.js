import { CANVAS_H, CANVAS_W, DOUBLE_TAP_THRESHOLD } from "./constants.js";

const BLOCKED_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Tab",
  "Space",
  "Escape",
]);

const TOUCH_BUTTONS = [
  { id: "left", x: 84, y: CANVAS_H - 88, radius: 34, keys: ["ArrowLeft"], label: "◀" },
  { id: "right", x: 168, y: CANVAS_H - 88, radius: 34, keys: ["ArrowRight"], label: "▶" },
  { id: "up", x: 126, y: CANVAS_H - 130, radius: 34, keys: ["ArrowUp"], label: "▲" },
  { id: "down", x: 126, y: CANVAS_H - 46, radius: 34, keys: ["ArrowDown"], label: "▼" },
  { id: "light", x: CANVAS_W - 190, y: CANVAS_H - 92, radius: 42, keys: ["KeyA"], label: "A" },
  { id: "heavy", x: CANVAS_W - 104, y: CANVAS_H - 132, radius: 46, keys: ["KeyS"], label: "S" },
  { id: "uppercut", x: CANVAS_W - 76, y: CANVAS_H - 46, radius: 42, keys: ["KeyA", "KeyS"], label: "AS" },
  { id: "switch", x: CANVAS_W / 2, y: 82, radius: 34, keys: ["Tab"], label: "TAB" },
];

function distanceSquared(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

export class InputManager {
  constructor(target = window, canvas = null) {
    this.target = target;
    this.canvas = canvas;
    this.keys = new Map();
    this.pendingPressed = new Set();
    this.framePressed = new Set();
    this.pendingDashes = [];
    this.frameDashes = [];
    this.pendingSwitch = false;
    this.frameSwitch = false;
    this.lastTap = new Map();
    this.pendingTap = false;
    this.frameTap = false;
    this.pendingPointerTap = null;
    this.framePointerTap = null;
    this.pendingInteraction = false;
    this.frameInteraction = false;
    this.touchAssignments = new Map();
    this.activeTouchButtons = new Set();
    this.isTouchDevice = (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) || "ontouchstart" in window;
    this.touchControlsVisible = this.isTouchDevice;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    target.addEventListener("keydown", this.handleKeyDown);
    target.addEventListener("keyup", this.handleKeyUp);
    target.addEventListener("blur", this.handleBlur);

    if (this.canvas) {
      this.canvas.addEventListener("pointerdown", this.handlePointerDown);
      this.canvas.addEventListener("click", this.handleClick);
      this.canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
      this.canvas.addEventListener("touchmove", this.handleTouchMove, { passive: false });
      this.canvas.addEventListener("touchend", this.handleTouchEnd, { passive: false });
      this.canvas.addEventListener("touchcancel", this.handleTouchEnd, { passive: false });
    }
  }

  handleKeyDown(event) {
    const { code } = event;

    if (BLOCKED_CODES.has(code)) {
      event.preventDefault();
    }

    this.pendingInteraction = true;

    if (this.keys.get(code)) {
      return;
    }

    this.keys.set(code, true);
    this.pendingPressed.add(code);
    this.detectDash(code);

    if (code === "Tab") {
      this.pendingSwitch = true;
    }
  }

  handleKeyUp(event) {
    const { code } = event;

    if (BLOCKED_CODES.has(code)) {
      event.preventDefault();
    }

    this.keys.set(code, false);
  }

  handleTouchStart(event) {
    event.preventDefault();
    this.pendingInteraction = true;
    this.touchControlsVisible = true;

    for (const touch of event.changedTouches) {
      const hit = this.resolveTouchButton(touch.clientX, touch.clientY);

      if (!hit) {
        this.pendingTap = true;
        this.pendingPointerTap = this.resolveCanvasPoint(touch.clientX, touch.clientY);
        continue;
      }

      this.touchAssignments.set(touch.identifier, hit.id);
      this.activateTouchButton(hit.id, true);
    }
  }

  handleTouchMove(event) {
    event.preventDefault();

    for (const touch of event.changedTouches) {
      const previous = this.touchAssignments.get(touch.identifier) ?? null;
      const hit = this.resolveTouchButton(touch.clientX, touch.clientY);
      const nextId = hit?.id ?? null;

      if (previous === nextId) {
        continue;
      }

      if (previous) {
        this.activateTouchButton(previous, false);
      }

      if (nextId) {
        this.touchAssignments.set(touch.identifier, nextId);
        this.activateTouchButton(nextId, true);
      } else {
        this.touchAssignments.delete(touch.identifier);
      }
    }
  }

  handleTouchEnd(event) {
    event.preventDefault();

    for (const touch of event.changedTouches) {
      const buttonId = this.touchAssignments.get(touch.identifier);

      if (buttonId) {
        this.activateTouchButton(buttonId, false);
        this.touchAssignments.delete(touch.identifier);
      }
    }
  }

  handlePointerDown() {
    this.pendingInteraction = true;

    if (this.canvas?.focus) {
      this.canvas.focus({ preventScroll: true });
    }
  }

  handleClick(event) {
    this.pendingInteraction = true;
    this.pendingTap = true;
    this.pendingPointerTap = this.resolveCanvasPoint(event.clientX, event.clientY);
  }

  activateTouchButton(buttonId, isDown) {
    const button = TOUCH_BUTTONS.find((entry) => entry.id === buttonId);

    if (!button) {
      return;
    }

    if (isDown) {
      this.activeTouchButtons.add(buttonId);
    } else {
      this.activeTouchButtons.delete(buttonId);
    }

    for (const code of button.keys) {
      this.setVirtualKey(code, isDown);
    }
  }

  setVirtualKey(code, isDown) {
    const current = this.keys.get(code) === true;

    if (current === isDown) {
      return;
    }

    this.keys.set(code, isDown);

    if (!isDown) {
      return;
    }

    this.pendingPressed.add(code);
    this.detectDash(code);

    if (code === "Tab") {
      this.pendingSwitch = true;
    }
  }

  resolveTouchButton(clientX, clientY) {
    const point = this.resolveCanvasPoint(clientX, clientY);

    if (!point) {
      return null;
    }

    const { x, y } = point;

    for (const button of TOUCH_BUTTONS) {
      if (distanceSquared(x, y, button.x, button.y) <= button.radius * button.radius) {
        return button;
      }
    }

    return null;
  }

  resolveCanvasPoint(clientX, clientY) {
    if (!this.canvas) {
      return null;
    }

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  handleBlur() {
    this.keys.clear();
    this.pendingPressed.clear();
    this.framePressed.clear();
    this.pendingDashes.length = 0;
    this.frameDashes.length = 0;
    this.pendingSwitch = false;
    this.frameSwitch = false;
    this.pendingTap = false;
    this.frameTap = false;
    this.pendingPointerTap = null;
    this.framePointerTap = null;
    this.pendingInteraction = false;
    this.frameInteraction = false;
    this.touchAssignments.clear();
    this.activeTouchButtons.clear();
  }

  detectDash(code) {
    if (code !== "ArrowLeft" && code !== "ArrowRight") {
      return;
    }

    const now = performance.now();
    const previous = this.lastTap.get(code) ?? 0;

    if (now - previous <= DOUBLE_TAP_THRESHOLD) {
      this.pendingDashes.push(code === "ArrowRight" ? 1 : -1);
    }

    this.lastTap.set(code, now);
  }

  isDown(key) {
    return this.keys.get(key) === true;
  }

  justPressed(key) {
    return this.framePressed.has(key);
  }

  consumeDashDirection() {
    return this.frameDashes.shift() ?? 0;
  }

  consumeSwitch() {
    const didSwitch = this.frameSwitch;
    this.frameSwitch = false;
    return didSwitch;
  }

  consumeTap() {
    const didTap = this.frameTap;
    this.frameTap = false;
    return didTap;
  }

  consumePointerTap() {
    const tap = this.framePointerTap;
    this.framePointerTap = null;
    return tap;
  }

  consumeInteraction() {
    const didInteract = this.frameInteraction;
    this.frameInteraction = false;
    return didInteract;
  }

  update() {
    this.framePressed = new Set(this.pendingPressed);
    this.pendingPressed.clear();
    this.frameDashes = [...this.pendingDashes];
    this.pendingDashes.length = 0;
    this.frameSwitch = this.pendingSwitch;
    this.pendingSwitch = false;
    this.frameTap = this.pendingTap;
    this.pendingTap = false;
    this.framePointerTap = this.pendingPointerTap;
    this.pendingPointerTap = null;
    this.frameInteraction = this.pendingInteraction;
    this.pendingInteraction = false;
  }

  drawTouchControls(ctx) {
    if (!this.touchControlsVisible) {
      return;
    }

    ctx.save();

    for (const button of TOUCH_BUTTONS) {
      const active = this.activeTouchButtons.has(button.id);
      ctx.fillStyle = active ? "rgba(255, 214, 92, 0.42)" : "rgba(0, 0, 0, 0.28)";
      ctx.strokeStyle = active ? "rgba(255, 247, 214, 0.92)" : "rgba(255, 255, 255, 0.26)";
      ctx.lineWidth = active ? 3 : 2;
      ctx.beginPath();
      ctx.arc(button.x, button.y, button.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = active ? "#fff9df" : "rgba(255, 255, 255, 0.86)";
      ctx.font = button.id === "switch" ? '900 16px "Arial Black", sans-serif' : '900 20px "Arial Black", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(button.label, button.x, button.y);
    }

    ctx.restore();
  }

  destroy() {
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.handleBlur);

    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
      this.canvas.removeEventListener("click", this.handleClick);
      this.canvas.removeEventListener("touchstart", this.handleTouchStart);
      this.canvas.removeEventListener("touchmove", this.handleTouchMove);
      this.canvas.removeEventListener("touchend", this.handleTouchEnd);
      this.canvas.removeEventListener("touchcancel", this.handleTouchEnd);
    }
  }
}
