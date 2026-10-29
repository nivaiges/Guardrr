/**
 * Generates the Guardrr app icon, Android adaptive-icon layers, splash image
 * and favicon in assets/ as PNGs. No dependencies (zlib only) and fully
 * deterministic, so re-running produces identical files.
 *
 *   node scripts/generate-icons.js
 *
 * The artwork: a flag on a tilted pole (gold silk, white pole) with a dotted
 * arc behind it for the toss, on the app's blue. Shapes are defined in a unit
 * square (0..1) and rendered with 4×4 supersampling for smooth edges.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets');

const BLUE_TOP = [0x2f, 0x7c, 0xf6];
const BLUE_BOTTOM = [0x0b, 0x3d, 0x91];
const GOLD = [0xf5, 0xc2, 0x42];
const GOLD_SHADE = [0xd9, 0x9a, 0x1e];
const WHITE = [0xff, 0xff, 0xff];

// ---- geometry (unit square) -------------------------------------------------

const POLE = { a: [0.3, 0.84], b: [0.62, 0.2], r: 0.032 };
// Silk hangs off the top of the pole; the fold line splits it into two tones.
const SILK_TOP = [
  [0.615, 0.21],
  [0.86, 0.27],
  [0.8, 0.44],
  [0.55, 0.36],
];
const SILK_BOTTOM = [
  [0.55, 0.36],
  [0.8, 0.44],
  [0.74, 0.58],
  [0.49, 0.48],
];
// Toss arc: dots on a circle, growing along the direction of travel.
const ARC = { cx: 0.5, cy: 0.52, radius: 0.36, from: 190, to: 272, dots: 5, r0: 0.014, r1: 0.03 };

function arcDots() {
  const dots = [];
  for (let i = 0; i < ARC.dots; i++) {
    const t = i / (ARC.dots - 1);
    const deg = ARC.from + (ARC.to - ARC.from) * t;
    const rad = (deg * Math.PI) / 180;
    dots.push({
      c: [ARC.cx + ARC.radius * Math.cos(rad), ARC.cy + ARC.radius * Math.sin(rad)],
      r: ARC.r0 + (ARC.r1 - ARC.r0) * t,
    });
  }
  return dots;
}

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inCapsule(x, y, { a, b, r }) {
  const [ax, ay] = a;
  const dx = b[0] - ax;
  const dy = b[1] - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  const px = ax + t * dx - x;
  const py = ay + t * dy - y;
  return px * px + py * py <= r * r;
}

function inCircle(x, y, { c, r }) {
  const dx = x - c[0];
  const dy = y - c[1];
  return dx * dx + dy * dy <= r * r;
}

/** Layers, back to front: [test(x, y), rgb, alpha]. */
function artwork({ mono = false } = {}) {
  const color = (rgb) => (mono ? WHITE : rgb);
  return [
    ...arcDots().map((d) => [(x, y) => inCircle(x, y, d), WHITE, mono ? 1 : 0.75]),
    [(x, y) => inCapsule(x, y, POLE), WHITE, 1],
    [(x, y) => inPolygon(x, y, SILK_TOP), color(GOLD), 1],
    [(x, y) => inPolygon(x, y, SILK_BOTTOM), color(GOLD_SHADE), 1],
  ];
}

// ---- rasterizer ---------------------------------------------------------------

const SS = 4;

/**
 * Render size×size RGBA. `background(v)` gives the rgb for row position v
 * (0..1) or null for transparent; the artwork is scaled by `scale` about the
 * center (adaptive icons and the splash need padding).
 */
function render(size, { background = null, scale = 1, layers }) {
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          let col = background ? background(v) : [0, 0, 0];
          let alpha = background ? 1 : 0;
          const ux = (u - 0.5) / scale + 0.5;
          const uy = (v - 0.5) / scale + 0.5;
          for (const [test, rgb, la] of layers) {
            if (!test(ux, uy)) continue;
            const outA = la + alpha * (1 - la);
            col = col.map((c, i) => (rgb[i] * la + c * alpha * (1 - la)) / outA);
            alpha = outA;
          }
          // Accumulate premultiplied so transparent samples don't darken edges.
          r += col[0] * alpha;
          g += col[1] * alpha;
          b += col[2] * alpha;
          a += alpha;
        }
      }
      const i = (y * size + x) * 4;
      const n = SS * SS;
      px[i] = a ? Math.round(r / a) : 0;
      px[i + 1] = a ? Math.round(g / a) : 0;
      px[i + 2] = a ? Math.round(b / a) : 0;
      px[i + 3] = Math.round((a / n) * 255);
    }
  }
  return px;
}

const gradient = (v) => BLUE_TOP.map((c, i) => Math.round(c + (BLUE_BOTTOM[i] - c) * v));

// ---- PNG encoder --------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- outputs --------------------------------------------------------------------

// Android adaptive icons are masked to the center ~66%; keep the art inside it.
const ADAPTIVE_SCALE = 0.62;

const OUTPUTS = {
  'icon.png': { size: 1024, background: gradient, layers: artwork() },
  'favicon.png': { size: 48, background: gradient, layers: artwork() },
  'android-icon-background.png': { size: 1024, background: gradient, layers: [] },
  'android-icon-foreground.png': { size: 1024, scale: ADAPTIVE_SCALE, layers: artwork() },
  'android-icon-monochrome.png': {
    size: 1024,
    scale: ADAPTIVE_SCALE,
    layers: artwork({ mono: true }),
  },
  // Shown centered on the splash background color (see app.json).
  'splash-icon.png': { size: 512, layers: artwork() },
};

for (const [name, { size, ...opts }] of Object.entries(OUTPUTS)) {
  fs.writeFileSync(path.join(OUT, name), png(size, render(size, opts)));
  console.log(`wrote assets/${name} (${size}×${size})`);
}
