import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const iconsDirs = [join(root, "icons"), join(root, "public/icons")];
for (const dir of iconsDirs) mkdirSync(dir, { recursive: true });

const outputs = [
  ["app-icon.png", 1024],
  ["apple-touch-icon.png", 180],
  ["favicon.png", 32],
  ["pwa-192x192.png", 192],
  ["pwa-512x512.png", 512],
  ["maskable-icon.png", 512],
];

const colors = {
  background: hex("#6fa184"),
  book: hex("#7fb08d"),
  spine: hex("#4f8469"),
  cream: hex("#f3eee4"),
  foldBlue: hex("#3e6e97"),
  foldYellow: hex("#f0cb4c"),
  foldShadow: hex("#274a62"),
  pageLine: hex("#d8e2db"),
};
const BOOK_SCALE = 0.9;
const BOOK_OFFSET_Y = 4;
const BOOK_CENTER = 512;

for (const [fileName, size] of outputs) {
  const png = encodePng(renderIcon(size));
  for (const iconsDir of iconsDirs) writeFileSync(join(iconsDir, fileName), png);
}

function renderIcon(size) {
  const scale = size / 1024;
  const width = size;
  const height = size;
  const pixels = new Uint8Array(width * height * 4);

  fillRect(pixels, width, height, 0, 0, 1024, 1024, colors.background, scale);
  fillRoundedRect(pixels, width, height, 32, 32, 960, 960, 118, colors.book, scale);
  fillRect(pixels, width, height, bx(0), by(0), bw(198), bh(1024), colors.spine, scale);
  fillRect(pixels, width, height, bx(198), by(0), bw(26), bh(1024), colors.pageLine, scale);
  fillTriangle(pixels, width, height, bx(828), by(0), bx(1024), by(0), bx(1024), by(196), colors.foldBlue, scale);
  fillTriangle(pixels, width, height, bx(900), by(0), bx(1024), by(0), bx(1024), by(112), colors.foldYellow, scale);
  fillTriangle(pixels, width, height, bx(916), by(0), bx(1024), by(0), bx(1024), by(40), colors.foldShadow, scale);

  strokeLine(pixels, width, height, bx(342), by(768), bx(512), by(308), bw(96), colors.cream, scale);
  strokeLine(pixels, width, height, bx(512), by(308), bx(682), by(768), bw(96), colors.cream, scale);
  strokeLine(pixels, width, height, bx(426), by(606), bx(598), by(606), bw(78), colors.cream, scale);
  strokeCircle(pixels, width, height, bx(512), by(230), bw(82), bw(56), colors.cream, scale);

  return { width, height, pixels };
}

function bx(value) {
  return BOOK_CENTER + (value - BOOK_CENTER) * BOOK_SCALE;
}

function by(value) {
  return BOOK_CENTER + (value - BOOK_CENTER) * BOOK_SCALE + BOOK_OFFSET_Y;
}

function bw(value) {
  return value * BOOK_SCALE;
}

function bh(value) {
  return value * BOOK_SCALE;
}

function hex(value) {
  const normalized = value.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
    a: 255,
  };
}

function setPixel(pixels, width, x, y, color) {
  const index = (y * width + x) * 4;
  pixels[index] = color.r;
  pixels[index + 1] = color.g;
  pixels[index + 2] = color.b;
  pixels[index + 3] = color.a;
}

function fillRect(pixels, width, height, x, y, w, h, color, scale) {
  const left = Math.max(0, Math.floor(x * scale));
  const top = Math.max(0, Math.floor(y * scale));
  const right = Math.min(width, Math.ceil((x + w) * scale));
  const bottom = Math.min(height, Math.ceil((y + h) * scale));
  for (let py = top; py < bottom; py += 1) {
    for (let px = left; px < right; px += 1) setPixel(pixels, width, px, py, color);
  }
}

function fillRoundedRect(pixels, width, height, x, y, w, h, r, color, scale) {
  const left = Math.max(0, Math.floor(x * scale));
  const top = Math.max(0, Math.floor(y * scale));
  const right = Math.min(width, Math.ceil((x + w) * scale));
  const bottom = Math.min(height, Math.ceil((y + h) * scale));
  const radius = r * scale;
  for (let py = top; py < bottom; py += 1) {
    for (let px = left; px < right; px += 1) {
      const ux = px / scale;
      const uy = py / scale;
      if (insideRoundedRect(ux, uy, x, y, w, h, r, radius / scale)) setPixel(pixels, width, px, py, color);
    }
  }
}

function fillLeftRoundedRect(pixels, width, height, x, y, w, h, r, color, scale) {
  const left = Math.max(0, Math.floor(x * scale));
  const top = Math.max(0, Math.floor(y * scale));
  const right = Math.min(width, Math.ceil((x + w) * scale));
  const bottom = Math.min(height, Math.ceil((y + h) * scale));
  for (let py = top; py < bottom; py += 1) {
    for (let px = left; px < right; px += 1) {
      const ux = px / scale;
      const uy = py / scale;
      if (ux >= x + r || insideRoundedRect(ux, uy, x, y, w, h, r)) setPixel(pixels, width, px, py, color);
    }
  }
}

function insideRoundedRect(px, py, x, y, w, h, r) {
  const cx = px < x + r ? x + r : px > x + w - r ? x + w - r : px;
  const cy = py < y + r ? y + r : py > y + h - r ? y + h - r : py;
  return (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2;
}

function fillTriangle(pixels, width, height, x1, y1, x2, y2, x3, y3, color, scale) {
  const minX = Math.max(0, Math.floor(Math.min(x1, x2, x3) * scale));
  const maxX = Math.min(width, Math.ceil(Math.max(x1, x2, x3) * scale));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2, y3) * scale));
  const maxY = Math.min(height, Math.ceil(Math.max(y1, y2, y3) * scale));
  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      const ux = px / scale;
      const uy = py / scale;
      const d1 = sign(ux, uy, x1, y1, x2, y2);
      const d2 = sign(ux, uy, x2, y2, x3, y3);
      const d3 = sign(ux, uy, x3, y3, x1, y1);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) setPixel(pixels, width, px, py, color);
    }
  }
}

function sign(px, py, x1, y1, x2, y2) {
  return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
}

function strokeLine(pixels, width, height, x1, y1, x2, y2, strokeWidth, color, scale) {
  const radius = strokeWidth / 2;
  const minX = Math.max(0, Math.floor((Math.min(x1, x2) - radius) * scale));
  const maxX = Math.min(width, Math.ceil((Math.max(x1, x2) + radius) * scale));
  const minY = Math.max(0, Math.floor((Math.min(y1, y2) - radius) * scale));
  const maxY = Math.min(height, Math.ceil((Math.max(y1, y2) + radius) * scale));
  const lengthSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      const ux = px / scale;
      const uy = py / scale;
      const t = Math.max(0, Math.min(1, ((ux - x1) * (x2 - x1) + (uy - y1) * (y2 - y1)) / lengthSq));
      const cx = x1 + t * (x2 - x1);
      const cy = y1 + t * (y2 - y1);
      if ((ux - cx) ** 2 + (uy - cy) ** 2 <= radius ** 2) setPixel(pixels, width, px, py, color);
    }
  }
}

function strokeCircle(pixels, width, height, cx, cy, radius, strokeWidth, color, scale) {
  const outer = radius + strokeWidth / 2;
  const inner = radius - strokeWidth / 2;
  const minX = Math.max(0, Math.floor((cx - outer) * scale));
  const maxX = Math.min(width, Math.ceil((cx + outer) * scale));
  const minY = Math.max(0, Math.floor((cy - outer) * scale));
  const maxY = Math.min(height, Math.ceil((cy + outer) * scale));
  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      const ux = px / scale;
      const uy = py / scale;
      const d = Math.sqrt((ux - cx) ** 2 + (uy - cy) ** 2);
      if (d >= inner && d <= outer) setPixel(pixels, width, px, py, color);
    }
  }
}

function encodePng({ width, height, pixels }) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
