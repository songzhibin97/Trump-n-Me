import { CUSTOM_ENEMY_ANIMATIONS, SPRITE_SHEETS } from "./sprite-config.js";

const loadedImages = new Map();
const NEUTRAL_CHROMA_THRESHOLD = 40;
const FLOOD_COLOR_DISTANCE = 85;
const DARK_BRIGHTNESS_THRESHOLD = 118;
const DARK_CHROMA_THRESHOLD = 78;
const DARK_FLOOD_DISTANCE = 22;
const CLEANUP_SHEETS = new Set(["heroes", "minion", "bosses", "finalBoss"]);
const CLEANUP_OPTIONS = Object.freeze({
  heroes: {
    allowDarkSeeds: false,
    protectBottomRows: 4,
    preserveExplicitTrim: false,
  },
  minion: {
    allowDarkSeeds: true,
    protectBottomRows: 0,
    darkBrightnessMax: 24,
    darkChromaMax: 10,
    darkFloodDistance: 12,
    preserveExplicitTrim: true,
    strictDarkFlood: true,
    alphaTransparentMax: 28,
    alphaOpaqueMin: 40,
    matteBrightnessMax: 44,
    matteChromaMax: 20,
    matteNeighborMin: 4,
    mattePasses: 3,
    matteProtectRadius: 2,
  },
  bosses: {
    allowDarkSeeds: true,
    protectBottomRows: 0,
    darkBrightnessMax: 56,
    darkChromaMax: 18,
    darkFloodDistance: 10,
    preserveExplicitTrim: true,
    strictDarkFlood: true,
    alphaTransparentMax: 28,
    alphaOpaqueMin: 40,
    matteBrightnessMax: 44,
    matteChromaMax: 20,
    matteNeighborMin: 4,
    mattePasses: 3,
    matteProtectRadius: 2,
  },
  finalBoss: {
    allowDarkSeeds: true,
    protectBottomRows: 0,
    darkBrightnessMax: 56,
    darkChromaMax: 18,
    darkFloodDistance: 10,
    preserveExplicitTrim: true,
    strictDarkFlood: true,
    alphaTransparentMax: 28,
    alphaOpaqueMin: 40,
    matteBrightnessMax: 44,
    matteChromaMax: 20,
    matteNeighborMin: 4,
    mattePasses: 3,
    matteProtectRadius: 2,
  },
});
const SHEET_CUSTOM_ANIMATIONS = Object.freeze({
  minion: {
    bodyguard: CUSTOM_ENEMY_ANIMATIONS.bodyguard,
  },
  bosses: {
    miniBoss: CUSTOM_ENEMY_ANIMATIONS.miniBoss,
    golfBoss: CUSTOM_ENEMY_ANIMATIONS.golfBoss,
    twitterBoss: CUSTOM_ENEMY_ANIMATIONS.twitterBoss,
  },
});
const PRESERVE_BASE_TRIM_SHEETS = new Set(["bosses", "finalBoss"]);
const PRESERVE_BASE_TRIM_FRAMES = Object.freeze({
  minion: [...SPRITE_SHEETS.minion.attack.frames],
});

function isFrameNode(node) {
  return Boolean(node && Array.isArray(node.frames));
}

function collectFrames(node, frames = []) {
  if (!node || typeof node !== "object") {
    return frames;
  }

  if (isFrameNode(node)) {
    frames.push(...node.frames);
    return frames;
  }

  for (const value of Object.values(node)) {
    collectFrames(value, frames);
  }

  return frames;
}

function getPixel(data, index) {
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3],
  };
}

function isNeutral(pixel) {
  const max = Math.max(pixel.r, pixel.g, pixel.b);
  const min = Math.min(pixel.r, pixel.g, pixel.b);
  return max - min <= NEUTRAL_CHROMA_THRESHOLD;
}

function colorDistance(a, b) {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
}

function getBrightness(pixel) {
  return (pixel.r + pixel.g + pixel.b) / 3;
}

function isDark(pixel, options = {}) {
  const brightnessMax = options.darkBrightnessMax ?? DARK_BRIGHTNESS_THRESHOLD;
  const chromaMax = options.darkChromaMax ?? DARK_CHROMA_THRESHOLD;
  return getBrightness(pixel) <= brightnessMax &&
    Math.max(pixel.r, pixel.g, pixel.b) - Math.min(pixel.r, pixel.g, pixel.b) <= chromaMax;
}

function isMattePixel(pixel, options = {}) {
  const brightnessMax = options.matteBrightnessMax ?? options.darkBrightnessMax ?? DARK_BRIGHTNESS_THRESHOLD;
  const chromaMax = options.matteChromaMax ?? options.darkChromaMax ?? DARK_CHROMA_THRESHOLD;
  return pixel.a > 0 &&
    getBrightness(pixel) <= brightnessMax &&
    Math.max(pixel.r, pixel.g, pixel.b) - Math.min(pixel.r, pixel.g, pixel.b) <= chromaMax;
}

function buildFrameKey(frame) {
  return `${frame.x}:${frame.y}:${frame.w}:${frame.h}`;
}

function getFrameDrawData(frame) {
  const trim = frame.trim;

  if (!trim) {
    return {
      sx: frame.x,
      sy: frame.y,
      sw: frame.w,
      sh: frame.h,
      dx: 0,
      dy: 0,
    };
  }

  return {
    sx: frame.x + trim.x,
    sy: frame.y + trim.y,
    sw: trim.w,
    sh: trim.h,
    dx: trim.x,
    dy: trim.y,
  };
}

function cleanupFrame(ctx, frame, options = {}, preserveExplicitTrimOverride = null) {
  const explicitTrim = frame.trim ? { ...frame.trim } : null;
  const imageData = ctx.getImageData(frame.x, frame.y, frame.w, frame.h);
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const queue = [];
  const allowDarkSeeds = options.allowDarkSeeds === true;
  const protectBottomRows = options.protectBottomRows ?? 0;
  const darkFloodDistance = options.darkFloodDistance ?? DARK_FLOOD_DISTANCE;
  const preserveExplicitTrim = preserveExplicitTrimOverride ?? options.preserveExplicitTrim !== false;
  const sideSeedLimit = Math.max(1, height - Math.max(0, protectBottomRows));
  const strictDarkFlood = options.strictDarkFlood === true;
  const alphaTransparentMax = options.alphaTransparentMax ?? -1;
  const alphaOpaqueMin = options.alphaOpaqueMin ?? 256;

  function enqueue(x, y, seed) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    queue.push({ x, y, seed });
  }

  function readPixel(x, y) {
    const offset = (y * width + x) * 4;
    return {
      offset,
      ...getPixel(data, offset),
    };
  }

  function canFlood(pixel, seed, y) {
    if (pixel.a <= 0) {
      return false;
    }

    if (protectBottomRows > 0 && y >= height - protectBottomRows) {
      return false;
    }

    const seedIsDark = isDark(seed, options);
    const pixelIsDark = isDark(pixel, options);
    const neutralMatch = isNeutral(pixel) && colorDistance(pixel, seed) <= FLOOD_COLOR_DISTANCE;
    const darkMatch = pixelIsDark && colorDistance(pixel, seed) <= darkFloodDistance;

    if (allowDarkSeeds && seedIsDark) {
      return strictDarkFlood ? darkMatch : darkMatch || neutralMatch;
    }

    return neutralMatch;
  }

  function seedAt(x, y) {
    const pixel = readPixel(x, y);

    if (pixel.a === 0) {
      return;
    }

    if (!isNeutral(pixel) && !(allowDarkSeeds && isDark(pixel, options))) {
      return;
    }

    enqueue(x, y, pixel);
  }

  for (let x = 0; x < width; x += 1) {
    seedAt(x, 0);
  }

  for (let y = 1; y < sideSeedLimit; y += 1) {
    seedAt(0, y);
    seedAt(width - 1, y);
  }

  if (protectBottomRows === 0 && height > 1) {
    for (let x = 0; x < width; x += 1) {
      seedAt(x, height - 1);
    }
  }

  while (queue.length > 0) {
    const { x, y, seed } = queue.pop();
    const index = y * width + x;

    if (visited[index]) {
      continue;
    }

    visited[index] = 1;
    const pixel = readPixel(x, y);

    if (!canFlood(pixel, seed, y)) {
      continue;
    }

    data[pixel.offset + 3] = 0;

    enqueue(x + 1, y, seed);
    enqueue(x - 1, y, seed);
    enqueue(x, y + 1, seed);
    enqueue(x, y - 1, seed);
    enqueue(x + 1, y + 1, seed);
    enqueue(x + 1, y - 1, seed);
    enqueue(x - 1, y + 1, seed);
    enqueue(x - 1, y - 1, seed);
  }

  if (alphaTransparentMax >= 0 || alphaOpaqueMin <= 255) {
    for (let offset = 0; offset < data.length; offset += 4) {
      const alpha = data[offset + 3];

      if (alpha <= 0) {
        continue;
      }

      if (alphaTransparentMax >= 0 && alpha <= alphaTransparentMax) {
        data[offset + 3] = 0;
        continue;
      }

      if (alphaOpaqueMin <= 255 && alpha >= alphaOpaqueMin) {
        data[offset + 3] = 255;
      }
    }
  }

  const mattePasses = options.mattePasses ?? 0;
  const matteNeighborMin = options.matteNeighborMin ?? 5;
  const matteProtectRadius = options.matteProtectRadius ?? 0;

  for (let pass = 0; pass < mattePasses; pass += 1) {
    const matteMask = new Uint8Array(width * height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;

        if (!isMattePixel(getPixel(data, offset), options)) {
          continue;
        }

        let darkNeighbors = 0;

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) {
              continue;
            }

            const nx = x + dx;
            const ny = y + dy;

            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
              darkNeighbors += 1;
              continue;
            }

            const neighborOffset = (ny * width + nx) * 4;

            if (isMattePixel(getPixel(data, neighborOffset), options)) {
              darkNeighbors += 1;
            }
          }
        }

        if (darkNeighbors >= matteNeighborMin) {
          matteMask[y * width + x] = 1;
        }
      }
    }

    let removedAny = false;

    for (let index = 0; index < matteMask.length; index += 1) {
      if (!matteMask[index]) {
        continue;
      }

      data[index * 4 + 3] = 0;
      removedAny = true;
    }

    if (!removedAny) {
      break;
    }
  }

  if (matteProtectRadius > 0) {
    const preserveMask = new Uint8Array(width * height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const pixel = getPixel(data, offset);

        if (pixel.a <= 0 || isMattePixel(pixel, options)) {
          continue;
        }

        for (let dy = -matteProtectRadius; dy <= matteProtectRadius; dy += 1) {
          for (let dx = -matteProtectRadius; dx <= matteProtectRadius; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
              continue;
            }

            preserveMask[ny * width + nx] = 1;
          }
        }
      }
    }

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const offset = index * 4;
        const pixel = getPixel(data, offset);

        if (!isMattePixel(pixel, options) || preserveMask[index]) {
          continue;
        }

        data[offset + 3] = 0;
      }
    }
  }

  ctx.putImageData(imageData, frame.x, frame.y);

  if (explicitTrim && preserveExplicitTrim) {
    frame.trim = explicitTrim;
    return;
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;

      if (data[offset + 3] <= 8) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0 || maxY < 0) {
    frame.trim = null;
    return;
  }

  frame.trim = {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

function prepareSpriteSheet(sheetKey, image, sheetConfig) {
  if (sheetKey === "backgrounds" || !CLEANUP_SHEETS.has(sheetKey)) {
    return image;
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);

  const seen = new Set();
  const baseFrames = collectFrames(sheetConfig, []);
  const customFrames = collectFrames(SHEET_CUSTOM_ANIMATIONS[sheetKey], []);
  const frames = [...baseFrames, ...customFrames];
  const cleanupOptions = CLEANUP_OPTIONS[sheetKey] ?? { allowDarkSeeds: false, protectBottomRows: 0 };
  const preserveTrimFrames = new Set(customFrames);

  if (PRESERVE_BASE_TRIM_SHEETS.has(sheetKey)) {
    for (const frame of baseFrames) {
      preserveTrimFrames.add(frame);
    }
  }

  for (const frame of PRESERVE_BASE_TRIM_FRAMES[sheetKey] ?? []) {
    preserveTrimFrames.add(frame);
  }

  for (const frame of frames) {
    const key = buildFrameKey(frame);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    cleanupFrame(ctx, frame, cleanupOptions, preserveTrimFrames.has(frame));
  }

  return canvas;
}

function resolveAnimation(sheetKey, animKey) {
  const sheet = SPRITE_SHEETS[sheetKey];

  if (!sheet) {
    throw new Error(`Unknown sprite sheet: ${sheetKey}`);
  }

  const parts = animKey.split(".");
  let node = sheet;

  for (const part of parts) {
    node = node?.[part];
  }

  if (!node || !Array.isArray(node.frames)) {
    throw new Error(`Unknown animation: ${sheetKey}.${animKey}`);
  }

  return node;
}

export function getLoadedImage(sheetKey) {
  return loadedImages.get(sheetKey) ?? null;
}

export function getSpriteAnimation(sheetKey, animKey) {
  return resolveAnimation(sheetKey, animKey);
}

export async function loadAllSprites() {
  const entries = Object.entries(SPRITE_SHEETS);

  await Promise.all(
    entries.map(([sheetKey, sheetConfig]) => {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const prepared = prepareSpriteSheet(sheetKey, image, sheetConfig);
          loadedImages.set(sheetKey, prepared);
          resolve(prepared);
        };
        image.onerror = () => reject(new Error(`Failed to load ${sheetConfig.src}`));
        image.src = sheetConfig.src;
      });
    }),
  );
}

export function getFrameCount(sheetKey, animKey) {
  return resolveAnimation(sheetKey, animKey).frames.length;
}

export function getFrameSource(frame) {
  return getFrameDrawData(frame);
}

export function drawSprite(ctx, sheetKey, animKey, frameIndex, x, y, flipX = false) {
  const image = loadedImages.get(sheetKey);

  if (!image) {
    return;
  }

  const animation = resolveAnimation(sheetKey, animKey);
  const frameTotal = animation.frames.length;
  const safeIndex = Math.max(0, Math.floor(frameIndex)) % frameTotal;
  const source = animation.frames[safeIndex];
  const frame = getFrameDrawData(source);
  const drawX = Math.round(x);
  const drawY = Math.round(y);

  ctx.save();

  if (flipX) {
    ctx.translate(drawX + source.w, drawY);
    ctx.scale(-1, 1);
    ctx.drawImage(
      image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      source.w - frame.dx - frame.sw,
      frame.dy,
      frame.sw,
      frame.sh,
    );
  } else {
    ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, drawX + frame.dx, drawY + frame.dy, frame.sw, frame.sh);
  }

  ctx.restore();
}
