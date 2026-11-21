/**
 * SYNAPZ HOCKEY v15.5 — Real Painted 75/25 Skater Renderer, Direct Finger-Drag Spin,
 * Live Painted Gear Equip Overlays & 0ms Try-On (`engine/skater_renderer_360.js`)
 *
 * STUDIO CONSTITUTION LAW 3 & v15.5 POLISH ARCHITECTURE:
 *   - Preserves all 8 studio-painted 75%-realistic / 25%-stylized character PNGs
 *     (`assets/avatars/avatar-male-1..4.png`, `avatar-female-1..4.png`) with ZERO vector robots.
 *   - Luminance-Preserving HSL Pixel-Mask Color Tinting on `<canvas>`:
 *     1) Painted Hair Region (`Blonde`, `Brown`, `Black`, `Red`, `Blue`, `Platinum`)
 *     2) Optional Explicit Skin-Tone Complexion Shift (`Fair`, `Warm Peach`, `Tan`, `Deep`)
 *        when chosen on Step 2, while preserving 0-drift natural painted skin by default
 *     3) Painted Jersey / Sweater Cloth Region (`Blue`, `Red`, `Pink`, `Teal`, `Emerald`, `Gold`, `Purple`, `Black`)
 *     4) Painted 4-Roll Gloves on Skater's Hands + Skate Trim/Steel Runners dynamically tinted
 *        to match equipped or tried-on Pro Shop gear in `0ms`!
 *     5) Symmetrical Front-Fitted Pro Bucket + Translucent Iridium Visor Shield (`Ice Blue`,
 *        `Sunset Gold`, `Smoke-Blackout`) or Mirrored Chrome Cage + Painted 75/25 Composite Stick
 *        composited cleanly on `<canvas>` whenever equipped or tried on!
 *   - Pure Finger-Drag Spin (`rotateY` 3D perspective scrub, ZERO `Spin 360°` button,
 *     ZERO `(333°)` / `(Front 0°)` degree readouts, ZERO diagonal lean/skew) between Front
 *     Painted Skater and Rear Painted Pro Sweater (`GUGGER` + `#38` stitched tackle-twill back).
 */

import {
  renderGearItemArtSvg,
  buildStarterGearItems,
  preloadAllPaintedGearArt,
  getTintedGearCanvas,
  getTintedGearDataUrl
} from './gear_art_75_25.js';

let _skaterUidSeq = 0;
function nextSkaterUid() {
  _skaterUidSeq = (_skaterUidSeq + 1) % 999999;
  return `skp_${_skaterUidSeq}`;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const PAINTED_SKATER_CATALOG = Object.freeze([
  { id: 'avatar-male-1',   label: 'Skater 1', styleTag: 'Classic Flow',  gender: 'boy',  src: 'assets/avatars/avatar-male-1.png',   hairBaseLum: 0.34, skinBaseLum: 0.64, defaultHairStyle: 'flow' },
  { id: 'avatar-male-2',   label: 'Skater 2', styleTag: 'Pro Fade',      gender: 'boy',  src: 'assets/avatars/avatar-male-2.png',   hairBaseLum: 0.09, skinBaseLum: 0.34, defaultHairStyle: 'buzz' },
  { id: 'avatar-male-3',   label: 'Skater 3', styleTag: 'Mohawk Edge',   gender: 'boy',  src: 'assets/avatars/avatar-male-3.png',   hairBaseLum: 0.08, skinBaseLum: 0.48, defaultHairStyle: 'mohawk' },
  { id: 'avatar-male-4',   label: 'Skater 4', styleTag: 'Side Part',     gender: 'boy',  src: 'assets/avatars/avatar-male-4.png',   hairBaseLum: 0.15, skinBaseLum: 0.54, defaultHairStyle: 'short' },
  { id: 'avatar-female-1', label: 'Skater 5', styleTag: 'High Pony',     gender: 'girl', src: 'assets/avatars/avatar-female-1.png', hairBaseLum: 0.58, skinBaseLum: 0.68, defaultHairStyle: 'ponytail' },
  { id: 'avatar-female-2', label: 'Skater 6', styleTag: 'Pro Braids',    gender: 'girl', src: 'assets/avatars/avatar-female-2.png', hairBaseLum: 0.17, skinBaseLum: 0.39, defaultHairStyle: 'braids' },
  { id: 'avatar-female-3', label: 'Skater 7', styleTag: 'Wavy Flow',     gender: 'girl', src: 'assets/avatars/avatar-female-3.png', hairBaseLum: 0.16, skinBaseLum: 0.52, defaultHairStyle: 'curly' },
  { id: 'avatar-female-4', label: 'Skater 8', styleTag: 'Twin Braids',   gender: 'girl', src: 'assets/avatars/avatar-female-4.png', hairBaseLum: 0.36, skinBaseLum: 0.67, defaultHairStyle: 'braids' }
]);

const NAMED_HAIR_COLORS = {
  blonde: '#facc15',
  brown: '#78350f',
  black: '#111827',
  red: '#dc2626',
  blue: '#2563eb',
  cyan: '#06b6d4',
  platinum: '#e2e8f0'
};

const NAMED_JERSEY_COLORS = {
  blue: '#0284c7',
  'royal blue': '#2563eb',
  'championship blue': '#0284c7',
  red: '#dc2626',
  crimson: '#dc2626',
  pink: '#ec4899',
  teal: '#0d9488',
  emerald: '#059669',
  green: '#059669',
  gold: '#eab308',
  purple: '#7c3aed',
  black: '#111827'
};

const _rawImageCache = new Map();
const _rawImagePromises = new Map();
const _tintedBitmapCache = new Map();
const _tintedDataUrlCache = new Map();

function parseHexRgb(hex, fallback = [2, 132, 199]) {
  const raw = String(hex || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return [
      parseInt(raw[0] + raw[0], 16),
      parseInt(raw[1] + raw[1], 16),
      parseInt(raw[2] + raw[2], 16)
    ];
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16)
    ];
  }
  return fallback;
}

function adjustHex(hex, delta = 0, fallback = '#0284c7') {
  const [r, g, b] = parseHexRgb(hex, parseHexRgb(fallback));
  const c = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${c(r + delta).toString(16).padStart(2, '0')}${c(g + delta).toString(16).padStart(2, '0')}${c(b + delta).toString(16).padStart(2, '0')}`;
}

function luminance(hex) {
  const [r, g, b] = parseHexRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) * 0.5;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) {
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    } else if (max === gn) {
      h = ((bn - rn) / d + 2) * 60;
    } else {
      h = ((rn - gn) / d + 4) * 60;
    }
  }
  return [h, s, l];
}

function hue2rgb(p, q, t) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = Math.max(0, Math.min(1, s));
  const ln = Math.max(0, Math.min(1, l));
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return [v, v, v];
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255)
  ];
}

function smoothstep(edge0, edge1, x) {
  if (edge1 === edge0) return x < edge0 ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function ellipseInsideWeight(nx, ny, cx, cy, rx, ry, feather = 0.08) {
  const dx = (nx - cx) / rx;
  const dy = (ny - cy) / ry;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return 1 - smoothstep(1 - feather, 1 + feather, dist);
}

function boxInsideWeight(nx, ny, x0, x1, y0, y1, fx = 0.012, fy = 0.008) {
  const wx = smoothstep(x0 - fx, x0 + fx, nx) * (1 - smoothstep(x1 - fx, x1 + fx, nx));
  const wy = smoothstep(y0 - fy, y0 + fy, ny) * (1 - smoothstep(y1 - fy, y1 + fy, ny));
  return wx * wy;
}

function computeSkinZoneEnvelope(avatarId, nx, ny, hue, sat) {
  switch (avatarId) {
    case 'avatar-male-2':
      return Math.max(
        ellipseInsideWeight(nx, ny, 0.500, 0.126, 0.124, 0.070, 0.06),
        ellipseInsideWeight(nx, ny, 0.500, 0.126, 0.170, 0.030, 0.08),
        boxInsideWeight(nx, ny, 0.380, 0.620, 0.168, 0.236, 0.012, 0.008)
      );
    case 'avatar-male-3':
      return Math.max(
        ellipseInsideWeight(nx, ny, 0.500, 0.139, 0.119, 0.060, 0.06),
        ellipseInsideWeight(nx, ny, 0.500, 0.142, 0.170, 0.028, 0.08),
        boxInsideWeight(nx, ny, 0.380, 0.620, 0.178, 0.238, 0.012, 0.008)
      );
    case 'avatar-male-4':
      return Math.max(
        ellipseInsideWeight(nx, ny, 0.500, 0.134, 0.115, 0.060, 0.06),
        ellipseInsideWeight(nx, ny, 0.500, 0.136, 0.172, 0.024, 0.08),
        boxInsideWeight(nx, ny, 0.380, 0.620, 0.174, 0.236, 0.012, 0.008)
      );
    case 'avatar-female-1': {
      const isYellowBlondeBang = (ny < 0.126) ? smoothstep(29, 36, hue) * smoothstep(0.28, 0.42, sat) : 0;
      const base = Math.max(
        ellipseInsideWeight(nx, ny, 0.512, 0.149, 0.110, 0.058, 0.06),
        ellipseInsideWeight(nx, ny, 0.375, 0.149, 0.028, 0.022, 0.09),
        ellipseInsideWeight(nx, ny, 0.632, 0.149, 0.028, 0.022, 0.09),
        boxInsideWeight(nx, ny, 0.408, 0.602, 0.190, 0.256, 0.012, 0.008)
      );
      return base * (1 - isYellowBlondeBang);
    }
    case 'avatar-female-2':
      return Math.max(
        ellipseInsideWeight(nx, ny, 0.504, 0.140, 0.111, 0.061, 0.06),
        ellipseInsideWeight(nx, ny, 0.370, 0.137, 0.024, 0.022, 0.09),
        ellipseInsideWeight(nx, ny, 0.638, 0.137, 0.028, 0.024, 0.09),
        boxInsideWeight(nx, ny, 0.422, 0.600, 0.182, 0.242, 0.009, 0.008)
      );
    case 'avatar-female-3':
      return Math.max(
        ellipseInsideWeight(nx, ny, 0.500, 0.129, 0.113, 0.064, 0.06),
        ellipseInsideWeight(nx, ny, 0.500, 0.135, 0.124, 0.020, 0.08),
        boxInsideWeight(nx, ny, 0.414, 0.586, 0.178, 0.234, 0.010, 0.008)
      );
    case 'avatar-female-4':
      return Math.max(
        ellipseInsideWeight(nx, ny, 0.500, 0.123, 0.113, 0.064, 0.06),
        ellipseInsideWeight(nx, ny, 0.360, 0.123, 0.021, 0.019, 0.09),
        ellipseInsideWeight(nx, ny, 0.640, 0.123, 0.021, 0.019, 0.09),
        boxInsideWeight(nx, ny, 0.416, 0.584, 0.174, 0.230, 0.010, 0.008)
      );
    case 'avatar-male-1':
    default:
      return Math.max(
        ellipseInsideWeight(nx, ny, 0.500, 0.129, 0.106, 0.061, 0.06),
        ellipseInsideWeight(nx, ny, 0.500, 0.136, 0.148, 0.025, 0.08),
        boxInsideWeight(nx, ny, 0.415, 0.585, 0.175, 0.232, 0.012, 0.008)
      );
  }
}

function computeHairMaskWeight(avatarId, nx, ny, hue, sat, lum) {
  if (hue >= 184 && hue <= 254 && sat >= 0.13) {
    return 0;
  }

  let inHairZone = 0;
  switch (avatarId) {
    case 'avatar-male-2': {
      const crown = boxInsideWeight(nx, ny, 0.34, 0.66, 0.008, 0.056, 0.012, 0.004);
      const temples = (boxInsideWeight(nx, ny, 0.335, 0.388, 0.052, 0.098, 0.008, 0.005) +
                       boxInsideWeight(nx, ny, 0.612, 0.665, 0.052, 0.098, 0.008, 0.005)) *
                      (1 - smoothstep(0.14, 0.22, lum));
      inHairZone = Math.min(1, crown + temples);
      break;
    }
    case 'avatar-male-3': {
      const crest = boxInsideWeight(nx, ny, 0.345, 0.655, 0.006, 0.079, 0.012, 0.004);
      const temples = (boxInsideWeight(nx, ny, 0.345, 0.392, 0.075, 0.116, 0.008, 0.005) +
                       boxInsideWeight(nx, ny, 0.608, 0.655, 0.075, 0.116, 0.008, 0.005)) *
                      (1 - smoothstep(0.16, 0.25, lum));
      inHairZone = Math.min(1, crest + temples);
      break;
    }
    case 'avatar-male-4':
      inHairZone = boxInsideWeight(nx, ny, 0.260, 0.740, 0.004, 0.128, 0.012, 0.005);
      break;
    case 'avatar-female-1': {
      const upper = boxInsideWeight(nx, ny, 0.060, 0.740, 0.004, 0.160, 0.010, 0.005);
      const ponyTailLower = boxInsideWeight(nx, ny, 0.060, 0.402, 0.145, 0.224, 0.010, 0.005);
      inHairZone = Math.max(upper, ponyTailLower);
      break;
    }
    case 'avatar-female-2': {
      const crown = boxInsideWeight(nx, ny, 0.180, 0.680, 0.004, 0.145, 0.010, 0.005);
      const cascade = boxInsideWeight(nx, ny, 0.180, 0.425, 0.132, 0.362, 0.010, 0.006);
      inHairZone = Math.max(crown, cascade);
      break;
    }
    case 'avatar-female-3':
      inHairZone = boxInsideWeight(nx, ny, 0.160, 0.840, 0.004, 0.220, 0.010, 0.005);
      break;
    case 'avatar-female-4': {
      const crown = boxInsideWeight(nx, ny, 0.250, 0.750, 0.004, 0.112, 0.010, 0.005);
      const leftBraid = boxInsideWeight(nx, ny, 0.295, 0.418, 0.100, 0.338, 0.010, 0.006);
      const rightBraid = boxInsideWeight(nx, ny, 0.582, 0.705, 0.100, 0.338, 0.010, 0.006);
      inHairZone = Math.max(crown, leftBraid, rightBraid);
      break;
    }
    case 'avatar-male-1':
    default:
      inHairZone = boxInsideWeight(nx, ny, 0.180, 0.820, 0.004, 0.204, 0.010, 0.005);
      break;
  }

  let skinKeepOut = computeSkinZoneEnvelope(avatarId, nx, ny, hue, sat);
  if (avatarId === 'avatar-female-1') {
    skinKeepOut = Math.max(skinKeepOut, boxInsideWeight(nx, ny, 0.580, 0.750, 0.152, 0.240, 0.010, 0.008));
  }
  return Math.max(0, Math.min(1, inHairZone * (1 - skinKeepOut)));
}

function computeJerseyMaskWeight(nx, ny, hue, sat) {
  if (ny < 0.188 || ny > 0.530) return 0;
  const hueIn = smoothstep(182, 194, hue) * (1 - smoothstep(244, 256, hue));
  if (hueIn <= 0.001) return 0;
  const satIn = smoothstep(0.115, 0.205, sat);
  if (satIn <= 0.001) return 0;

  const torsoSpatial = boxInsideWeight(nx, ny, 0.244, 0.756, 0.192, 0.522, 0.010, 0.006);
  const sleeveSpatial = boxInsideWeight(nx, ny, 0.050, 0.950, 0.195, 0.435, 0.010, 0.007);
  const spatial = Math.max(torsoSpatial, sleeveSpatial);
  return Math.max(0, Math.min(1, spatial * hueIn * satIn));
}

/**
 * Painted 4-Roll Gloves Classifier on Skater's Hands (`ny = 0.436 .. 0.610`, left/right outer hands)
 */
function computeGlovesMaskWeight(nx, ny, hue, sat) {
  if (ny < 0.436 || ny > 0.612) return 0;
  const inLeftHand = boxInsideWeight(nx, ny, 0.015, 0.240, 0.438, 0.608, 0.010, 0.006);
  const inRightHand = boxInsideWeight(nx, ny, 0.760, 0.985, 0.438, 0.608, 0.010, 0.006);
  const handSpatial = Math.max(inLeftHand, inRightHand);
  if (handSpatial <= 0.001) return 0;

  const hueIn = smoothstep(180, 194, hue) * (1 - smoothstep(246, 258, hue));
  const satIn = smoothstep(0.10, 0.19, sat);
  return Math.max(0, Math.min(1, handSpatial * hueIn * satIn));
}

function resolveHairTintProfile(hairHex, hairBaseLum = 0.30) {
  const [tr, tg, tb] = parseHexRgb(hairHex, [120, 53, 15]);
  const [th, ts, tl] = rgbToHsl(tr, tg, tb);
  const hexLow = String(hairHex || '').toLowerCase();

  if (hexLow === '#e2e8f0' || (ts < 0.22 && tl > 0.75)) {
    const desiredMid = 0.66;
    const gamma = Math.max(0.38, Math.min(1.15, Math.log(desiredMid) / Math.log(Math.max(0.08, hairBaseLum))));
    return { hue: 214, sat: 0.14, gamma, scale: 0.96, lift: 0.06 };
  }
  if (hexLow === '#111827' || hexLow === '#0f172a' || tl < 0.12) {
    const desiredMid = 0.11;
    const gamma = Math.max(1.05, Math.min(2.35, Math.log(desiredMid) / Math.log(Math.max(0.08, Math.min(0.85, hairBaseLum)))));
    return { hue: 218, sat: 0.18, gamma, scale: 0.82, lift: 0.01 };
  }
  if (hexLow === '#facc15' || (th >= 38 && th <= 58 && tl > 0.45)) {
    const desiredMid = 0.56;
    const gamma = Math.max(0.42, Math.min(1.15, Math.log(desiredMid) / Math.log(Math.max(0.08, hairBaseLum))));
    return { hue: 43, sat: 0.74, gamma, scale: 0.98, lift: 0.02 };
  }
  if (hexLow === '#78350f' || (th >= 18 && th <= 36 && tl < 0.35)) {
    const desiredMid = 0.25;
    const gamma = Math.max(0.68, Math.min(1.55, Math.log(desiredMid) / Math.log(Math.max(0.08, hairBaseLum))));
    return { hue: 25, sat: 0.62, gamma, scale: 0.96, lift: 0.0 };
  }

  const desiredMid = Math.max(0.34, Math.min(0.50, tl));
  const gamma = Math.max(0.48, Math.min(1.38, Math.log(desiredMid) / Math.log(Math.max(0.08, hairBaseLum))));
  return {
    hue: th,
    sat: Math.max(0.68, Math.min(0.86, ts * 0.95)),
    gamma,
    scale: 0.98,
    lift: 0.01
  };
}

function resolveJerseyTintProfile(jerseyHex) {
  const [tr, tg, tb] = parseHexRgb(jerseyHex, [2, 132, 199]);
  const [th, ts, tl] = rgbToHsl(tr, tg, tb);
  const hexLow = String(jerseyHex || '').toLowerCase();

  if (hexLow === '#111827' || hexLow === '#0f172a' || tl < 0.12) {
    return { hue: 216, sat: 0.14, gamma: 1.32, scale: 0.88 };
  }
  if (hexLow === '#eab308' || hexLow === '#facc15' || (th >= 38 && th <= 56 && ts > 0.5)) {
    return { hue: 45, sat: 0.84, gamma: 0.72, scale: 1.04 };
  }
  if (hexLow === '#ec4899') {
    return { hue: 330, sat: 0.80, gamma: 0.76, scale: 1.03 };
  }
  return {
    hue: th,
    sat: Math.max(0.66, Math.min(0.84, ts * 0.94)),
    gamma: 0.82,
    scale: 1.02
  };
}

function resolveSkinToneProfile(skinToneOverride, skinBaseLum = 0.56) {
  if (!skinToneOverride) return null;
  const low = String(skinToneOverride).trim().toLowerCase();
  let desiredMid = 0.62;
  let targetHue = 22;
  let targetSat = 0.42;
  if (low === '#fde68a' || low === 'fair') {
    desiredMid = 0.72; targetHue = 24; targetSat = 0.36;
  } else if (low === '#fdba74' || low === 'peach') {
    desiredMid = 0.62; targetHue = 20; targetSat = 0.44;
  } else if (low === '#d97706' || low === 'tan') {
    desiredMid = 0.47; targetHue = 23; targetSat = 0.52;
  } else if (low === '#78350f' || low === 'deep') {
    desiredMid = 0.25; targetHue = 21; targetSat = 0.52;
  } else {
    return null;
  }
  const gamma = Math.max(0.55, Math.min(1.65, Math.log(desiredMid) / Math.log(Math.max(0.16, skinBaseLum))));
  return { hue: targetHue, sat: targetSat, gamma };
}

function loadRawAvatarImage(avatarMeta) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  const key = avatarMeta.id;
  const cached = _rawImageCache.get(key);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  if (_rawImagePromises.has(key)) {
    return _rawImagePromises.get(key);
  }
  const p = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      _rawImageCache.set(key, img);
      resolve(img);
    };
    img.onerror = () => {
      _rawImagePromises.delete(key);
      resolve(null);
    };
    img.src = avatarMeta.src;
  });
  _rawImagePromises.set(key, p);
  return p;
}

export function preloadAllPaintedAvatars() {
  if (typeof Image === 'undefined') return Promise.resolve([]);
  return Promise.all([
    ...PAINTED_SKATER_CATALOG.map((meta) => loadRawAvatarImage(meta)),
    preloadAllPaintedGearArt().catch(() => [])
  ]);
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  preloadAllPaintedAvatars().catch(() => {});
}

function buildTintedBitmapFromImage(img, cfg) {
  const hit = _tintedBitmapCache.get(cfg.cacheKey);
  if (hit) return hit;

  const avatarMeta = cfg.avatarMeta;
  const w = img.naturalWidth || 374;
  const h = img.naturalHeight || 900;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;

  const hairProf = resolveHairTintProfile(cfg.hairColor, avatarMeta.hairBaseLum || 0.30);
  const jerseyProf = resolveJerseyTintProfile(cfg.jerseyColor);
  const glovesProf = resolveJerseyTintProfile(cfg.glovesColor || cfg.jerseyColor);
  const glovesAccProf = resolveJerseyTintProfile(cfg.glovesAccent || cfg.glovesColor || cfg.jerseyColor);
  const skinProf = resolveSkinToneProfile(cfg.skinToneOverride, avatarMeta.skinBaseLum || 0.56);

  const skateStyle = String(cfg.skatesItem?.style || '').toLowerCase();
  const hasCustomSkates = cfg.skatesId && cfg.skatesId !== 'starter-skates';
  const skateSteelMode = !hasCustomSkates
    ? 'chrome'
    : (skateStyle.includes('black-steel') ? 'black' : (skateStyle.includes('gold-steel') ? 'gold' : (skateStyle.includes('blue-steel') ? 'blue' : 'chrome')));
  const skateTrimProf = hasCustomSkates ? resolveJerseyTintProfile(cfg.skatesItem?.color || '#38bdf8') : null;

  const invW = 1 / w;
  const invH = 1 / h;

  for (let y = 0; y < h; y++) {
    const ny = (y + 0.5) * invH;
    // Breezers & socks (`0.615 < ny < 0.820`) stay untouched
    if (ny > 0.614 && (!hasCustomSkates || ny < 0.820)) continue;

    const rowOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i = rowOffset + x * 4;
      const a = px[i + 3];
      if (a < 12) continue;

      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      const nx = (x + 0.5) * invW;
      const [hue, sat, lum] = rgbToHsl(r, g, b);

      // 1. Hair Region (`ny <= 0.370`)
      if (ny <= 0.370) {
        const wHair = computeHairMaskWeight(avatarMeta.id, nx, ny, hue, sat, lum);
        if (wHair > 0.005) {
          const specFade = 1 - smoothstep(0.68, 0.90, lum) * 0.55;
          const curvedL = Math.max(0.025, Math.min(0.94, Math.pow(Math.max(0.005, lum), hairProf.gamma) * hairProf.scale + hairProf.lift));
          const outSat = Math.max(0.04, Math.min(0.92, (hairProf.sat * 0.78 + sat * 0.22) * specFade));
          const [nr, ng, nb] = hslToRgb(hairProf.hue, outSat, curvedL);
          px[i]     = Math.round(r + (nr - r) * wHair);
          px[i + 1] = Math.round(g + (ng - g) * wHair);
          px[i + 2] = Math.round(b + (nb - b) * wHair);
          continue;
        }

        // 1b. Optional Explicit Skin Tone Shift (excludes eye whites, irises, dark brows/lashes, and teeth)
        if (skinProf && ny >= 0.075 && ny <= 0.260) {
          const env = computeSkinZoneEnvelope(avatarMeta.id, nx, ny, hue, sat);
          const isWarmSkinPixel = (hue <= 42 || hue >= 342) && sat >= 0.16 && lum >= 0.16 && lum <= 0.84;
          // Exclude eye band (`ny ~ 0.118..0.142` around eye sockets) where sclera/irises sit
          const eyeBandKeepOut = Math.max(
            ellipseInsideWeight(nx, ny, 0.452, 0.132, 0.032, 0.014, 0.15),
            ellipseInsideWeight(nx, ny, 0.548, 0.132, 0.032, 0.014, 0.15),
            ellipseInsideWeight(nx, ny, 0.500, 0.163, 0.038, 0.010, 0.15)
          );
          const wSkin = isWarmSkinPixel ? env * (1 - eyeBandKeepOut) * 0.85 : 0;
          if (wSkin > 0.01) {
            const curvedL = Math.max(0.06, Math.min(0.90, Math.pow(Math.max(0.02, lum), skinProf.gamma)));
            const outS = Math.max(0.14, Math.min(0.72, skinProf.sat * 0.65 + sat * 0.35));
            const [sr, sg, sb] = hslToRgb(skinProf.hue, outS, curvedL);
            px[i]     = Math.round(r + (sr - r) * wSkin);
            px[i + 1] = Math.round(g + (sg - g) * wSkin);
            px[i + 2] = Math.round(b + (sb - b) * wSkin);
            continue;
          }
        }
      }

      // 2. Sweater / Jersey Region (`0.188 <= ny <= 0.530`)
      if (ny >= 0.188 && ny <= 0.530) {
        const wJersey = computeJerseyMaskWeight(nx, ny, hue, sat);
        if (wJersey > 0.005) {
          const foldHighlightFade = 1 - smoothstep(0.62, 0.88, lum) * 0.45;
          const curvedL = Math.max(0.03, Math.min(0.92, Math.pow(Math.max(0.008, lum), jerseyProf.gamma) * jerseyProf.scale));
          const outSat = Math.max(0.06, Math.min(0.90, (jerseyProf.sat * 0.82 + sat * 0.18) * foldHighlightFade));
          const [nr, ng, nb] = hslToRgb(jerseyProf.hue, outSat, curvedL);
          px[i]     = Math.round(r + (nr - r) * wJersey);
          px[i + 1] = Math.round(g + (ng - g) * wJersey);
          px[i + 2] = Math.round(b + (nb - b) * wJersey);
          continue;
        }
      }

      // 3. Painted 4-Roll Hockey Gloves on Skater's Hands (`0.436 <= ny <= 0.612`)
      if (ny >= 0.436 && ny <= 0.612) {
        const wGlove = computeGlovesMaskWeight(nx, ny, hue, sat);
        if (wGlove > 0.005) {
          const isUpperCuffRim = ny < 0.466 && cfg.glovesId !== 'starter-gloves';
          const prof = isUpperCuffRim ? glovesAccProf : glovesProf;
          const foldFade = 1 - smoothstep(0.64, 0.88, lum) * 0.42;
          const curvedL = Math.max(0.03, Math.min(0.92, Math.pow(Math.max(0.008, lum), prof.gamma) * prof.scale));
          const outSat = Math.max(0.06, Math.min(0.90, (prof.sat * 0.84 + sat * 0.16) * foldFade));
          const [gr, gg, gb] = hslToRgb(prof.hue, outSat, curvedL);
          px[i]     = Math.round(r + (gr - r) * wGlove);
          px[i + 1] = Math.round(g + (gg - g) * wGlove);
          px[i + 2] = Math.round(b + (gb - b) * wGlove);
          continue;
        }
      }

      // 4. Painted Skates Trim & Steel Runner (`ny >= 0.820` when Pro Shop skates equipped/tried on)
      if (hasCustomSkates && ny >= 0.820) {
        if (ny >= 0.932 && skateSteelMode !== 'chrome' && lum > 0.28 && sat < 0.24) {
          let sr = r, sg = g, sb = b;
          if (skateSteelMode === 'black') [sr, sg, sb] = hslToRgb(212, 0.22, lum * 0.34 + 0.04);
          else if (skateSteelMode === 'gold') [sr, sg, sb] = hslToRgb(45, 0.88, Math.min(0.88, lum * 1.02));
          else if (skateSteelMode === 'blue') [sr, sg, sb] = hslToRgb(197, 0.86, Math.min(0.86, lum * 0.98));
          px[i]     = Math.round(r + (sr - r) * 0.88);
          px[i + 1] = Math.round(g + (sg - g) * 0.88);
          px[i + 2] = Math.round(b + (sb - b) * 0.88);
        } else if (skateTrimProf && ny >= 0.822 && ny < 0.865 && lum > 0.45 && sat < 0.22) {
          // Ankle collar trim highlight
          const [tr, tg, tb] = hslToRgb(skateTrimProf.hue, skateTrimProf.sat, Math.min(0.82, lum * 0.88));
          px[i]     = Math.round(r + (tr - r) * 0.72);
          px[i + 1] = Math.round(g + (tg - g) * 0.72);
          px[i + 2] = Math.round(b + (tb - b) * 0.72);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  _tintedBitmapCache.set(cfg.cacheKey, off);
  return off;
}

function resolveCatalogItem(idOrVal, category) {
  if (!idOrVal) return null;
  const valStr = String(idOrVal).trim();
  // Never confuse a raw starter #hex color string (e.g. slotProfile.equippedHelmet = '#0284c7') with a Pro Shop SKU!
  if (!valStr || valStr.startsWith('#') || valStr.startsWith('starter-')) return null;
  const shop = (typeof window !== 'undefined' && Array.isArray(window.PRO_SHOP_ITEMS)) ? window.PRO_SHOP_ITEMS : [];
  return shop.find((it) => it.id === valStr || (category && it.category === category && it.style === valStr)) || null;
}

function resolveAvatarMetaFromState(s = {}) {
  const explicitId = String(s.stockAvatarId || s.avatarBaseId || '').trim();
  const byId = PAINTED_SKATER_CATALOG.find((a) => a.id === explicitId);
  if (byId) return byId;

  const style = String(s.hairStyle || '').toLowerCase();
  const isGirl = String(s.avatarType || s.charType || '').toLowerCase() === 'girl';
  if (style === 'ponytail') return PAINTED_SKATER_CATALOG[4];
  if (style === 'braids') return PAINTED_SKATER_CATALOG[5];
  if (style === 'mohawk') return PAINTED_SKATER_CATALOG[2];
  if (style === 'buzz') return PAINTED_SKATER_CATALOG[1];
  if (style === 'short' || style === 'fade') return PAINTED_SKATER_CATALOG[3];
  if (style === 'curly') return PAINTED_SKATER_CATALOG[6];
  return isGirl ? PAINTED_SKATER_CATALOG[4] : PAINTED_SKATER_CATALOG[0];
}

export function normalizeSkaterState(rawState = {}, previewItem = null) {
  const s = { ...(rawState || {}) };
  let previewSlot = null;

  if (previewItem && typeof previewItem === 'object') {
    const cat = previewItem.category || '';
    if (cat === 'Gloves' || previewItem.slot === 'gloves') {
      s.equippedGloves = previewItem.color;
      s.equippedGlovesId = previewItem.id;
      s.glovesStyle = previewItem.style;
      previewSlot = 'gloves';
    } else if (cat === 'Stick' || previewItem.slot === 'stick') {
      s.equippedStick = previewItem.color;
      s.equippedStickId = previewItem.id;
      s.stickStyle = previewItem.style;
      s.bladeTapeColor = previewItem.tapeColor;
      previewSlot = 'stick';
    } else if (cat === 'Helmet' || previewItem.slot === 'helmet') {
      s.equippedHelmet = previewItem.color;
      s.equippedHelmetId = previewItem.id;
      s.equippedVisorId = previewItem.id;
      previewSlot = 'visor';
    } else if (cat === 'Visor' || previewItem.slot === 'visor') {
      s.equippedVisor = previewItem.color;
      s.equippedVisorId = previewItem.id;
      s.visorStyle = previewItem.style;
      previewSlot = 'visor';
    } else if (cat === 'Skates' || previewItem.slot === 'skates') {
      s.equippedSkate = previewItem.color;
      s.equippedSkates = previewItem.id;
      s.equippedSkatesId = previewItem.id;
      s.skateStyle = previewItem.style;
      s.steelColor = previewItem.steelColor;
      previewSlot = 'skates';
    } else if (cat === 'Jersey' || previewItem.hex) {
      s.jerseyColor = previewItem.hex || previewItem.color;
      previewSlot = 'jersey';
    }
  }

  const avatarMeta = resolveAvatarMetaFromState(s);
  const rawName = String(s.name || s.firstName || 'Skater').trim() || 'Skater';
  const backNameplate = String(s.jerseyBackName || rawName || s.lastName || 'SKATER')
    .trim()
    .toUpperCase()
    .slice(0, 14) || 'SKATER';

  const rawNum = s.jerseyNumber !== undefined && s.jerseyNumber !== null ? String(s.jerseyNumber).trim() : '9';
  const jerseyNumber = rawNum.replace(/[^0-9]/g, '').slice(0, 2);

  const rawHairCol = String(s.hairColor || '#78350f').trim();
  const hairColor = rawHairCol.startsWith('#')
    ? rawHairCol
    : (NAMED_HAIR_COLORS[rawHairCol.toLowerCase()] || '#78350f');

  const rawJerseyCol = String(s.jerseyColor || '#0284c7').trim();
  const jerseyColor = rawJerseyCol.startsWith('#')
    ? rawJerseyCol
    : (NAMED_JERSEY_COLORS[rawJerseyCol.toLowerCase()] || '#0284c7');

  const jerseyAccent = s.jerseyAccent || (
    jerseyColor.toLowerCase() === '#111827' || jerseyColor.toLowerCase() === '#0f172a'
      ? '#22d3ee'
      : (jerseyColor.toLowerCase() === '#eab308' || jerseyColor.toLowerCase() === '#facc15'
          ? '#0f172a'
          : (jerseyColor.toLowerCase() === '#dc2626' || jerseyColor.toLowerCase() === '#ec4899'
              ? '#fde047'
              : '#38bdf8'))
  );

  const starters = buildStarterGearItems({ jerseyColor });
  const starterVisor = starters.find((x) => x.slot === 'visor') || starters[2];
  const starterStick = starters.find((x) => x.slot === 'stick') || starters[0];
  const starterGloves = starters.find((x) => x.slot === 'gloves') || starters[1];
  const starterSkates = starters.find((x) => x.slot === 'skates') || starters[3];

  const glovesMeta = (previewSlot === 'gloves' && previewItem) ? previewItem : resolveCatalogItem(s.equippedGlovesId || s.equippedGloves, 'Gloves');
  const stickMeta = (previewSlot === 'stick' && previewItem) ? previewItem : resolveCatalogItem(s.equippedStickId || s.equippedStick, 'Stick');
  const helmetMeta = (previewSlot === 'visor' && previewItem?.category === 'Helmet') ? previewItem : resolveCatalogItem(s.equippedHelmetId || s.equippedHelmet, 'Helmet');
  const visorMeta = (previewSlot === 'visor' && previewItem?.category !== 'Helmet' && previewItem) ? previewItem : resolveCatalogItem(s.equippedVisorId || s.equippedVisor, 'Visor');
  const skateMeta = (previewSlot === 'skates' && previewItem) ? previewItem : resolveCatalogItem(s.equippedSkatesId || s.equippedSkates || s.equippedSkate, 'Skates');

  const visorItem = (previewSlot === 'visor' && previewItem) ? previewItem : (visorMeta || helmetMeta || starterVisor);
  const stickItem = stickMeta || starterStick;
  const glovesItem = glovesMeta || starterGloves;
  const skatesItem = skateMeta || starterSkates;

  const visorId = (previewSlot === 'visor' && previewItem?.id) || s.equippedVisorId || (visorMeta && visorMeta.id) || (helmetMeta && helmetMeta.id) || 'starter-visor';
  const stickId = (previewSlot === 'stick' && previewItem?.id) || s.equippedStickId || (stickMeta && stickMeta.id) || 'starter-stick';
  const glovesId = (previewSlot === 'gloves' && previewItem?.id) || s.equippedGlovesId || (glovesMeta && glovesMeta.id) || 'starter-gloves';
  const skatesId = (previewSlot === 'skates' && previewItem?.id) || s.equippedSkatesId || s.equippedSkates || (skateMeta && skateMeta.id) || 'starter-skates';

  const glovesColor = glovesMeta?.color || jerseyColor;
  const glovesAccent = glovesMeta?.accentColor || '#eab308';
  const skinToneOverride = s.skinToneExplicit ? String(s.skinTone || '') : '';

  return {
    profileId: s.id || 'skater',
    avatarBaseId: avatarMeta.id,
    avatarLabel: avatarMeta.label,
    avatarStyleTag: avatarMeta.styleTag,
    avatarSrc: avatarMeta.src,
    avatarMeta,
    name: rawName,
    backNameplate,
    jerseyNumber,
    hairStyle: s.hairStyle || avatarMeta.defaultHairStyle || 'flow',
    hairColor,
    skinTone: s.skinTone || '#fdba74',
    skinToneOverride,
    jerseyColor,
    jerseyAccent,
    glovesColor,
    glovesAccent,
    visorId,
    stickId,
    glovesId,
    skatesId,
    visorItem,
    stickItem,
    glovesItem,
    skatesItem,
    previewSlot,
    cacheKey: `${avatarMeta.id}|${hairColor.toLowerCase()}|${jerseyColor.toLowerCase()}|${glovesColor.toLowerCase()}|${glovesId}|${skatesId}|${skinToneOverride}`
  };
}

function classifySpinView(angleDeg = 0) {
  const norm = ((Number(angleDeg) || 0) % 360 + 360) % 360;
  if (norm >= 90 && norm <= 270) {
    return { normAngle: norm, face: 'back' };
  }
  return { normAngle: norm, face: 'front' };
}

/**
 * Draws calibrated Snug Studio-Lit 3D Pro Hockey Bucket + Wave-Cut Translucent Iridium Shield / Chrome Cage
 * directly over the painted skater's head/brow zone whenever a non-starter Helmet/Visor/Cage is equipped or tried on!
 */
function paintEquippedHeadgearOverlay(ctx, outW, outH, cfg) {
  const hasHeadgear = (cfg.visorId && cfg.visorId !== 'starter-visor') || cfg.previewSlot === 'visor';
  if (!hasHeadgear) return;

  const item = cfg.visorItem || {};
  const style = String(item.style || '').toLowerCase();
  const isCage = style.includes('cage');
  const isBucketSku = item.category === 'Helmet';

  // Calibrated snug head/temple anchor across all 8 painted avatars (`374x900` proportions: temple halfW ~ 0.113)
  const cx = outW * 0.502;
  const crownTopY = outH * 0.024;
  const browY = outH * 0.103;
  const visorSideBotY = outH * 0.148;
  const visorNoseArchY = outH * 0.137;
  const halfW = outW * 0.132;

  const shellBaseHex = isBucketSku
    ? (item.color || '#1e3a8a')
    : (style.includes('smoke') ? '#0f172a' : '#182234');
  const shellSpecHex = adjustHex(shellBaseHex, 64, '#64748b');
  const shellMidHex = adjustHex(shellBaseHex, 14, '#334155');
  const shellDarkHex = adjustHex(shellBaseHex, -46, '#070b14');

  ctx.save();

  // 0) Soft ambient-occlusion shadow cast by the helmet brow onto the forehead skin
  const browShadowGrad = ctx.createLinearGradient(0, browY - outH * 0.002, 0, browY + outH * 0.017);
  browShadowGrad.addColorStop(0, 'rgba(2, 6, 23, 0.52)');
  browShadowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = browShadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, browY + outH * 0.006, halfW * 0.90, outH * 0.012, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1) Sculpted 3D Spherical Studio-Lit Pro Hockey Bucket Crown + Molded Temple Flanges (ZERO neon cartoon border!)
  const shellGrad = ctx.createRadialGradient(
    cx - halfW * 0.30, crownTopY + outH * 0.024, outW * 0.012,
    cx, crownTopY + outH * 0.052, halfW * 1.35
  );
  shellGrad.addColorStop(0, shellSpecHex);
  shellGrad.addColorStop(0.35, shellMidHex);
  shellGrad.addColorStop(0.72, shellBaseHex);
  shellGrad.addColorStop(1, shellDarkHex);

  ctx.beginPath();
  ctx.moveTo(cx - halfW * 0.98, browY + outH * 0.010);
  ctx.bezierCurveTo(
    cx - halfW * 1.04, crownTopY + outH * 0.012,
    cx - halfW * 0.54, crownTopY,
    cx, crownTopY
  );
  ctx.bezierCurveTo(
    cx + halfW * 0.54, crownTopY,
    cx + halfW * 1.04, crownTopY + outH * 0.012,
    cx + halfW * 0.98, browY + outH * 0.010
  );
  // Snug temple ear-guard tabs
  ctx.lineTo(cx + halfW * 1.01, browY + outH * 0.036);
  ctx.lineTo(cx + halfW * 0.89, browY + outH * 0.038);
  ctx.lineTo(cx + halfW * 0.85, browY + outH * 0.003);
  ctx.quadraticCurveTo(cx, browY - outH * 0.006, cx - halfW * 0.85, browY + outH * 0.003);
  ctx.lineTo(cx - halfW * 0.89, browY + outH * 0.038);
  ctx.lineTo(cx - halfW * 1.01, browY + outH * 0.036);
  ctx.closePath();

  ctx.fillStyle = shellGrad;
  ctx.fill();
  ctx.lineWidth = Math.max(1.1, outW * 0.0032);
  ctx.strokeStyle = 'rgba(6, 10, 18, 0.88)';
  ctx.stroke();

  // Subtle painted 3D aero ridge contour & recessed crown vents
  ctx.beginPath();
  ctx.moveTo(cx - halfW * 0.48, crownTopY + outH * 0.018);
  ctx.quadraticCurveTo(cx, crownTopY + outH * 0.009, cx + halfW * 0.48, crownTopY + outH * 0.018);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.30)';
  ctx.lineWidth = Math.max(1.2, outW * 0.0036);
  ctx.stroke();

  ctx.fillStyle = 'rgba(4, 8, 16, 0.72)';
  const ventW = halfW * 0.28;
  const ventH = outH * 0.0065;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(cx - halfW * 0.48, crownTopY + outH * 0.031, ventW, ventH, 2) : ctx.rect(cx - halfW * 0.48, crownTopY + outH * 0.031, ventW, ventH);
  ctx.roundRect ? ctx.roundRect(cx + halfW * 0.20, crownTopY + outH * 0.031, ventW, ventH, 2) : ctx.rect(cx + halfW * 0.20, crownTopY + outH * 0.031, ventW, ventH);
  ctx.fill();

  // 2) Authentic Wave-Cut Polycarbonate Iridium Visor Shield OR Metallic Chrome Pro Cage
  if (isCage) {
    const cageBotY = outH * 0.176;
    const barGrad = ctx.createLinearGradient(cx - halfW, browY, cx + halfW, cageBotY);
    barGrad.addColorStop(0, '#f8fafc');
    barGrad.addColorStop(0.5, '#cbd5e1');
    barGrad.addColorStop(1, '#64748b');

    ctx.strokeStyle = barGrad;
    ctx.lineWidth = Math.max(1.35, outW * 0.0038);

    ctx.beginPath();
    ctx.moveTo(cx - halfW * 0.92, browY + outH * 0.005);
    ctx.quadraticCurveTo(cx - halfW * 0.86, cageBotY, cx, cageBotY + outH * 0.005);
    ctx.quadraticCurveTo(cx + halfW * 0.86, cageBotY, cx + halfW * 0.92, browY + outH * 0.005);
    ctx.stroke();

    for (const frac of [0.25, 0.50, 0.75]) {
      const by = browY + (cageBotY - browY) * frac;
      const bw = halfW * (0.91 - frac * 0.16);
      ctx.beginPath();
      ctx.moveTo(cx - bw, by);
      ctx.quadraticCurveTo(cx, by + outH * 0.005, cx + bw, by);
      ctx.stroke();
    }
    for (const xFrac of [-0.52, -0.17, 0.17, 0.52]) {
      ctx.beginPath();
      ctx.moveTo(cx + halfW * xFrac, browY + outH * 0.004);
      ctx.lineTo(cx + halfW * xFrac * 0.78, cageBotY);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - halfW * 0.30, cageBotY - outH * 0.009, halfW * 0.60, outH * 0.012);
  } else {
    // Oakley/Bauer Pro Wave-Cut Polycarbonate Shield (curved nose-bridge arch + translucent iridium reflection!)
    const visGrad = ctx.createLinearGradient(cx - halfW, browY, cx + halfW, visorSideBotY);
    if (style.includes('gold')) {
      visGrad.addColorStop(0, 'rgba(254, 240, 138, 0.62)');
      visGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.54)');
      visGrad.addColorStop(1, 'rgba(180, 83, 9, 0.60)');
    } else if (style.includes('smoke')) {
      visGrad.addColorStop(0, 'rgba(71, 85, 105, 0.72)');
      visGrad.addColorStop(0.52, 'rgba(15, 23, 42, 0.76)');
      visGrad.addColorStop(1, 'rgba(2, 6, 23, 0.80)');
    } else if (isBucketSku) {
      visGrad.addColorStop(0, 'rgba(224, 242, 254, 0.32)');
      visGrad.addColorStop(1, 'rgba(125, 211, 252, 0.24)');
    } else {
      // Ice Blue Iridium Shield
      visGrad.addColorStop(0, 'rgba(165, 243, 252, 0.60)');
      visGrad.addColorStop(0.50, 'rgba(14, 165, 233, 0.52)');
      visGrad.addColorStop(1, 'rgba(3, 105, 161, 0.60)');
    }

    ctx.beginPath();
    ctx.moveTo(cx - halfW * 0.96, browY + outH * 0.003);
    ctx.quadraticCurveTo(cx, browY - outH * 0.006, cx + halfW * 0.96, browY + outH * 0.003);
    ctx.lineTo(cx + halfW * 0.93, visorSideBotY - outH * 0.005);
    // Right cheek lobe -> center nose-bridge arch -> left cheek lobe
    ctx.bezierCurveTo(
      cx + halfW * 0.62, visorSideBotY + outH * 0.005,
      cx + halfW * 0.24, visorNoseArchY,
      cx, visorNoseArchY
    );
    ctx.bezierCurveTo(
      cx - halfW * 0.24, visorNoseArchY,
      cx - halfW * 0.62, visorSideBotY + outH * 0.005,
      cx - halfW * 0.93, visorSideBotY - outH * 0.005
    );
    ctx.closePath();

    ctx.fillStyle = visGrad;
    ctx.fill();

    // Crisp polycarbonate lower glass rim highlight + subtle dark top seam
    ctx.lineWidth = Math.max(1.0, outW * 0.0028);
    ctx.strokeStyle = style.includes('gold')
      ? 'rgba(254, 249, 195, 0.78)'
      : (style.includes('smoke') ? 'rgba(148, 163, 184, 0.62)' : 'rgba(224, 242, 254, 0.80)');
    ctx.stroke();

    // Matte black temple mounting hardware / J-clips
    ctx.fillStyle = '#090d16';
    const clipW = halfW * 0.13;
    const clipH = outH * 0.016;
    ctx.fillRect(cx - halfW * 0.99, browY + outH * 0.008, clipW, clipH);
    ctx.fillRect(cx + halfW * 0.86, browY + outH * 0.008, clipW, clipH);

    // Studio diagonal specular reflection sheen across curved visor glass
    ctx.save();
    ctx.clip();
    const sheenGrad = ctx.createLinearGradient(cx - halfW * 0.65, browY, cx - halfW * 0.05, visorSideBotY);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    sheenGrad.addColorStop(0.42, 'rgba(255, 255, 255, 0.52)');
    sheenGrad.addColorStop(0.62, 'rgba(255, 255, 255, 0.18)');
    sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.beginPath();
    ctx.moveTo(cx - halfW * 0.68, browY - outH * 0.01);
    ctx.lineTo(cx - halfW * 0.22, browY - outH * 0.01);
    ctx.lineTo(cx - halfW * 0.44, visorSideBotY + outH * 0.01);
    ctx.lineTo(cx - halfW * 0.88, visorSideBotY + outH * 0.01);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Composites the real studio-painted 75/25 composite hockey stick (`assets/gear/stick_75_25.png`,
 * HSL-tinted to the exact SKU colorway) held naturally behind the skater's painted 4-roll glove down to the ice!
 */
function paintEquippedStickOverlay(ctx, outW, outH, cfg, showFullGearOnSkater = false, tintedBitmap = null) {
  const shouldShowStick = showFullGearOnSkater || cfg.stickId !== 'starter-stick' || cfg.previewSlot === 'stick';
  if (!shouldShowStick) return;

  const stickCanvas = getTintedGearCanvas({ ...cfg.stickItem, category: 'Stick' });
  if (!stickCanvas) return;

  // Ground contact shadow under stick blade toe/heel on the ice
  ctx.save();
  ctx.translate(outW * 0.25, outH * 0.955);
  ctx.scale(1, 0.16);
  const bladeShadow = ctx.createRadialGradient(0, 0, outW * 0.01, 0, 0, outW * 0.13);
  bladeShadow.addColorStop(0, 'rgba(2, 6, 23, 0.62)');
  bladeShadow.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = bladeShadow;
  ctx.beginPath();
  ctx.arc(0, 0, outW * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Position stick angled upright through the viewer-left glove with taped blade resting on the ice beside skates
  ctx.save();
  ctx.translate(outW * 0.155, outH * 0.655);
  ctx.rotate(0.57);
  const drawW = outW * 1.08;
  const drawH = drawW * (stickCanvas.height / stickCanvas.width);
  ctx.drawImage(stickCanvas, -drawW * 0.49, -drawH * 0.46, drawW, drawH);
  ctx.restore();

  // Re-composite the viewer-left RGBA painted 4-roll glove in front of the shaft so the skater grips it naturally!
  if (tintedBitmap) {
    const bw = tintedBitmap.width || 374;
    const bh = tintedBitmap.height || 900;
    const sx = 0;
    const sy = Math.round(bh * 0.445);
    const sw = Math.round(bw * 0.245);
    const sh = Math.round(bh * 0.165);
    ctx.drawImage(
      tintedBitmap,
      sx, sy, sw, sh,
      0, outH * 0.445, outW * 0.245, outH * 0.165
    );
  }
}

function paintSkaterOntoCanvas(canvasEl, tintedBitmap, cfg, showFullGearOnSkater = false) {
  if (!canvasEl || !tintedBitmap) return;
  const srcW = tintedBitmap.width || 374;
  const srcH = tintedBitmap.height || 900;
  const dpr = Math.min(2.5, Math.max(1.5, (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 2));
  const outW = Math.round(srcW * (dpr > 1.8 ? 1.15 : 1.0));
  const outH = Math.round(srcH * (dpr > 1.8 ? 1.15 : 1.0));

  if (canvasEl.width !== outW || canvasEl.height !== outH) {
    canvasEl.width = outW;
    canvasEl.height = outH;
  }

  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, outW, outH);
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';

  // Grounded arena shadow beneath painted skate blades
  ctx.save();
  ctx.translate(outW * 0.5, outH * 0.968);
  ctx.scale(1, 0.14);
  const grad = ctx.createRadialGradient(0, 0, outW * 0.04, 0, 0, outW * 0.38);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.68)');
  grad.addColorStop(0.65, 'rgba(15, 23, 42, 0.30)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, outW * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Draw painted character (with HSL-tinted Hair, Jersey, Gloves & Skates)
  ctx.drawImage(tintedBitmap, 0, 0, outW, outH);

  // Draw equipped / tried-on Helmet / Iridium Visor / Chrome Cage on Skater's Head
  paintEquippedHeadgearOverlay(ctx, outW, outH, cfg);

  // Draw equipped / tried-on Painted 75/25 Stick held cleanly in Skater's Painted 4-Roll Glove
  paintEquippedStickOverlay(ctx, outW, outH, cfg, showFullGearOnSkater, tintedBitmap);

  canvasEl.setAttribute('data-natural-width', String(srcW));
  canvasEl.setAttribute('data-natural-height', String(srcH));
  canvasEl.setAttribute('data-cache-key', cfg.cacheKey);
  canvasEl.setAttribute('data-avatar-base-id', cfg.avatarBaseId);
  canvasEl.setAttribute('data-equipped-visor', cfg.visorId);
  canvasEl.setAttribute('data-equipped-gloves', cfg.glovesId);
  canvasEl.setAttribute('data-equipped-stick', cfg.stickId);
  canvasEl.setAttribute('data-equipped-skates', cfg.skatesId);
}

/**
 * Renders the sleek, non-overlapping 4-slot Painted 75/25 Gear Loadout Dock
 * (`Helmet/Visor`, `Stick`, `Gloves`, `Skates`) alongside the painted skater!
 */
function buildLoadoutDockHtml(cfg, layout = 'vertical') {
  const slots = [
    { key: 'visor',  label: 'VISOR',  id: cfg.visorId,  item: { ...cfg.visorItem,  category: cfg.visorItem.category || 'Visor' } },
    { key: 'stick',  label: 'STICK',  id: cfg.stickId,  item: { ...cfg.stickItem,  category: 'Stick' } },
    { key: 'gloves', label: 'GLOVES', id: cfg.glovesId, item: { ...cfg.glovesItem, category: 'Gloves' } },
    { key: 'skates', label: 'SKATES', id: cfg.skatesId, item: { ...cfg.skatesItem, category: 'Skates' } }
  ];

  const isHorizontal = layout === 'horizontal';
  const wrapCls = isHorizontal
    ? 'grid grid-cols-4 gap-1 w-full pt-0.5'
    : 'flex flex-col justify-center gap-1 shrink-0 z-20';

  const cardsHtml = slots.map((sl) => {
    const isTrying = cfg.previewSlot === sl.key;
    const isProUpgrade = !String(sl.id || '').startsWith('starter-');
    const borderCls = isTrying
      ? 'border-cyan-300 bg-cyan-950/90 ring-2 ring-cyan-300/80 shadow-[0_0_12px_rgba(34,211,238,0.45)]'
      : (isProUpgrade
          ? 'border-emerald-400/75 bg-[#0b1324]/95 shadow-md'
          : 'border-slate-700/85 bg-[#0b1324]/90');
    const tagCol = isTrying ? 'text-cyan-200' : (isProUpgrade ? 'text-emerald-300' : 'text-slate-400');

    const paintedThumb = renderGearItemArtSvg(sl.item, {
      dockTile: true,
      horizontalDock: isHorizontal
    });

    return `
      <div
        data-dock-slot="${sl.key}"
        data-dock-item-id="${escHtml(sl.id)}"
        data-dock-trying="${isTrying ? 'true' : 'false'}"
        title="${escHtml(sl.item.name || sl.label)}"
        class="rounded-xl border ${borderCls} px-1 py-0.5 flex flex-col items-center justify-center transition-all"
      >
        ${paintedThumb}
        <span class="text-[8px] font-black tracking-wider leading-tight mt-0.5 ${tagCol}">${isTrying ? 'TRYING' : sl.label}</span>
      </div>
    `;
  }).join('');

  return `
    <div data-skater-loadout-dock="true" data-dock-layout="${layout}" class="${wrapCls}">
      ${cardsHtml}
    </div>
  `;
}

/**
 * 180° Back View — Authentic Painted 75/25 Pro Sweater Back (`GUGGER` + `#38` stitched tackle-twill
 * nameplate & single bold center-back number, ZERO `#38` spammed 4x!) + 4-Slot Painted Gear Strip.
 */
export function buildRearSweaterShowcaseHtml(rawState = {}, options = {}) {
  const uid = nextSkaterUid();
  const cfg = normalizeSkaterState(rawState, options.previewItem || null);
  const jerseyLight = adjustHex(cfg.jerseyColor, 38, '#38bdf8');
  const jerseyDark = adjustHex(cfg.jerseyColor, -48, '#090d16');
  const jNumStr = cfg.jerseyNumber !== '' ? cfg.jerseyNumber : '9';
  const numLum = luminance(cfg.jerseyColor);
  const numTextFill = numLum > 0.68 ? '#0f172a' : '#ffffff';
  const numOutline = numLum > 0.68 ? '#ffffff' : cfg.jerseyAccent;
  const nameLen = cfg.backNameplate.length;
  const nameFontSize = nameLen >= 12 ? 11.4 : (nameLen >= 9 ? 13.2 : 15.0);
  const compact = Boolean(options.compactRear);

  // Pull real painted 75/25 jersey image (HSL-tinted to player's exact jersey color!) for sleeves & cloth folds
  const paintedJerseyUrl = getTintedGearDataUrl({
    id: `rear-jersey-${cfg.jerseyColor}`,
    category: 'Jersey',
    color: cfg.jerseyColor,
    accentColor: cfg.jerseyAccent
  }) || 'assets/gear/jersey_75_25.png';

  return `
    <div class="w-full h-full flex flex-col items-center justify-between gap-1 select-none" data-rear-sweater-showcase="true">
      <div class="flex-1 min-h-0 w-full flex items-center justify-center relative">
        <svg
          viewBox="0 0 260 210"
          role="img"
          aria-label="${escHtml(cfg.backNameplate)} #${escHtml(jNumStr)} Pro Stitched Rear Hockey Sweater"
          class="w-full h-full max-h-full object-contain drop-shadow-[0_12px_20px_rgba(2,6,23,0.82)]"
          data-rear-sweater-svg="true"
        >
          <defs>
            <linearGradient id="${uid}_backpanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${jerseyLight}"/>
              <stop offset="48%" stop-color="${cfg.jerseyColor}"/>
              <stop offset="100%" stop-color="${jerseyDark}"/>
            </linearGradient>
          </defs>

          <!-- Real Studio-Painted 75/25 Pro Hockey Sweater Base (Sleeves, Shoulders, Cloth Folds & Hem Stripes) -->
          <image href="${escHtml(paintedJerseyUrl)}" x="8" y="2" width="244" height="204" preserveAspectRatio="xMidYMid meet" />

          <!-- Seamless Rear Torso Panel Covering Front Laces & Crest -> Clean Pro Back Cloth + Yoke -->
          <g data-skater-layer="jersey-back">
            <path
              d="M 96 18 Q 130 27 164 18 L 176 48 L 175 150 L 85 150 L 84 48 Z"
              fill="url(#${uid}_backpanel)"
            />
            <!-- Stitched Rear Collar Ribbing & Shoulder Yoke Seam -->
            <path d="M 99 16 Q 130 27 161 16 L 156 27 Q 130 35 104 27 Z" fill="#090d16" stroke="#f8fafc" stroke-width="1.2"/>
            <path d="M 78 46 Q 130 41 182 46" fill="none" stroke="${cfg.jerseyAccent}" stroke-width="1.8"/>
            <path d="M 80 49 Q 130 44 180 49" fill="none" stroke="rgba(255,255,255,0.38)" stroke-width="0.9" stroke-dasharray="3 2"/>

            <!-- Authentic Stitched Rear Fight-Strap Loop -->
            <rect x="122" y="170" width="16" height="21" rx="3" fill="#f8fafc" stroke="#64748b" stroke-width="1.1"/>
            <circle cx="130" cy="185" r="2.4" fill="#94a3b8" stroke="#0f172a" stroke-width="0.8"/>

            <!-- STITCHED TACKLE-TWILL UPPER-BACK NAMEBAR -->
            <rect x="76" y="53" width="108" height="23" rx="4" fill="rgba(9,13,22,0.88)" stroke="${cfg.jerseyAccent}" stroke-width="1.4"/>
            <rect x="79" y="56" width="102" height="17" rx="2.5" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="0.8" stroke-dasharray="3 2"/>
            <text
              x="130"
              y="69.5"
              data-skater-layer="back-nameplate"
              fill="#ffffff"
              font-family="Inter, Impact, Segoe UI, sans-serif"
              font-size="${nameFontSize}"
              font-weight="900"
              letter-spacing="1.1"
              text-anchor="middle"
            >${escHtml(cfg.backNameplate)}</text>

            <!-- SINGLE GIANT DOUBLE-LAYER STITCHED TACKLE-TWILL BACK JERSEY NUMBER -->
            <text
              x="130"
              y="141"
              data-skater-layer="back-number"
              fill="${numTextFill}"
              stroke="${numOutline}"
              stroke-width="4.2"
              paint-order="stroke fill"
              font-family="Impact, Inter, Arial Black, sans-serif"
              font-size="64"
              font-weight="900"
              letter-spacing="1.5"
              text-anchor="middle"
            >${escHtml(jNumStr)}</text>
          </g>
        </svg>
      </div>
      ${compact ? '' : `
        <div class="w-full shrink-0" data-rear-loadout-strip="true">
          ${buildLoadoutDockHtml(cfg, 'horizontal')}
        </div>
      `}
    </div>
  `;
}

export function getCachedTintedBitmap(cfg) {
  const hit = _tintedBitmapCache.get(cfg.cacheKey);
  if (hit) return hit;
  const rawImg = _rawImageCache.get(cfg.avatarBaseId);
  if (rawImg && rawImg.complete && rawImg.naturalWidth > 0) {
    return buildTintedBitmapFromImage(rawImg, cfg);
  }
  return null;
}

export function buildCustomizableSkaterSvg(rawState = {}, options = {}) {
  const cfg = normalizeSkaterState(rawState, options.previewItem || null);
  const angle = options.angleDeg !== undefined ? Number(options.angleDeg) : 0;
  const view = classifySpinView(angle);

  if (view.face === 'back') {
    return `
      <div
        data-skater-renderer="v155-painted-75-25"
        data-view-face="back"
        data-avatar-base-id="${escHtml(cfg.avatarBaseId)}"
        data-hair-color="${escHtml(cfg.hairColor)}"
        data-jersey-color="${escHtml(cfg.jerseyColor)}"
        data-jersey-number="${escHtml(cfg.jerseyNumber)}"
        data-back-nameplate="${escHtml(cfg.backNameplate)}"
        data-stick-id="${escHtml(cfg.stickId)}"
        data-gloves-id="${escHtml(cfg.glovesId)}"
        data-visor-id="${escHtml(cfg.visorId)}"
        data-skates-id="${escHtml(cfg.skatesId)}"
        class="w-full h-full flex items-center justify-center select-none"
      >
        ${buildRearSweaterShowcaseHtml(rawState, options)}
      </div>
    `;
  }

  let imgSrc = cfg.avatarSrc;
  const bitmap = getCachedTintedBitmap(cfg);
  if (bitmap) {
    let dataUrl = _tintedDataUrlCache.get(cfg.cacheKey);
    if (!dataUrl) {
      try {
        dataUrl = bitmap.toDataURL('image/png');
        _tintedDataUrlCache.set(cfg.cacheKey, dataUrl);
      } catch (_) {}
    }
    if (dataUrl) imgSrc = dataUrl;
  }

  return `
    <div
      data-skater-renderer="v155-painted-75-25"
      data-view-face="front"
      data-avatar-base-id="${escHtml(cfg.avatarBaseId)}"
      data-hair-color="${escHtml(cfg.hairColor)}"
      data-jersey-color="${escHtml(cfg.jerseyColor)}"
      data-jersey-number="${escHtml(cfg.jerseyNumber)}"
      data-back-nameplate="${escHtml(cfg.backNameplate)}"
      data-stick-id="${escHtml(cfg.stickId)}"
      data-gloves-id="${escHtml(cfg.glovesId)}"
      data-visor-id="${escHtml(cfg.visorId)}"
      data-skates-id="${escHtml(cfg.skatesId)}"
      class="w-full h-full flex items-center justify-center select-none"
    >
      <img src="${escHtml(imgSrc)}" alt="${escHtml(cfg.name)}" class="h-full w-auto max-w-full max-h-full object-contain select-none pointer-events-none" />
    </div>
  `;
}

export function buildMiniSkaterHeadSvg(rawState = {}, sizePx = 36) {
  const cfg = normalizeSkaterState(rawState);
  const s = Math.max(24, Number(sizePx) || 36);
  let headSrc = cfg.avatarSrc;
  const bitmap = getCachedTintedBitmap(cfg);
  if (bitmap) {
    let dataUrl = _tintedDataUrlCache.get(cfg.cacheKey);
    if (!dataUrl) {
      try {
        dataUrl = bitmap.toDataURL('image/png');
        _tintedDataUrlCache.set(cfg.cacheKey, dataUrl);
      } catch (_) {}
    }
    if (dataUrl) headSrc = dataUrl;
  }
  return `
    <span
      class="inline-flex items-center justify-center rounded-full overflow-hidden bg-slate-950 shrink-0 shadow-md"
      style="width:${s}px;height:${s}px;border:2px solid ${escHtml(cfg.jerseyColor)};"
      data-mini-skater-360="${escHtml(cfg.profileId)}"
    >
      <img
        src="${escHtml(headSrc)}"
        alt="${escHtml(cfg.name)}"
        style="width:100%;height:260%;object-fit:cover;object-position:50% 4%;transform:translateY(28%);"
        class="pointer-events-none select-none"
      />
    </span>
  `;
}

/**
 * Mounts the Real Painted 75/25 High-DPI `<canvas>` Skater (`0° Front`) + Continuous
 * Horizontal Finger-Drag 3D `rotateY` Spin to Rear Pro Sweater (`180° Back`) into `container`.
 * ZERO `Spin 360°` buttons and ZERO raw degree labels (`Front (333°)` / `Front 0°`)!
 */
export function renderCustomizableSkater(container, skaterState = {}, options = {}) {
  const el = typeof container === 'string'
    ? (typeof document !== 'undefined' ? document.getElementById(container) : null)
    : container;

  const rawAngle = Number.isFinite(Number(options.angleDeg)) ? Number(options.angleDeg) : 0;
  // Snap resting angle cleanly to 0° or 180° so a skater is NEVER stuck at a crooked 333° tilt!
  const initialFace = classifySpinView(rawAngle).face;
  const initialAngle = initialFace === 'back' ? 180 : 0;

  if (!el) {
    return buildCustomizableSkaterSvg(skaterState, { ...options, angleDeg: initialAngle });
  }

  const cfg = normalizeSkaterState(skaterState, options.previewItem || null);
  const showLoadoutDock = Boolean(options.showLoadoutDock);
  const showDragHint = options.showDragHint !== false && !options.hideDragHint && el.clientWidth !== 0 ? true : (options.showDragHint !== false && !options.compactRear);
  const showFullGearOnSkater = Boolean(showLoadoutDock || options.showGearOnSkater);
  const initialView = classifySpinView(initialAngle);
  const renderToken = nextSkaterUid();
  el._synapzSkaterRenderToken = renderToken;

  const syncGlobalTelemetry = (viewObj) => {
    if (typeof window !== 'undefined') {
      window._lastRenderedYoungPlayerAvatar = {
        style: 'v155-painted-75-25-hsl-canvas',
        profileId: cfg.profileId,
        avatarBaseId: cfg.avatarBaseId,
        avatarLabel: cfg.avatarLabel,
        name: cfg.name,
        backNameplate: cfg.backNameplate,
        hairStyle: cfg.hairStyle,
        hairColor: cfg.hairColor,
        jerseyNumber: cfg.jerseyNumber,
        jerseyColor: cfg.jerseyColor,
        jerseyAccent: cfg.jerseyAccent,
        stickId: cfg.stickId,
        glovesId: cfg.glovesId,
        visorId: cfg.visorId,
        skatesId: cfg.skatesId,
        cacheKey: cfg.cacheKey,
        angleDeg: viewObj.normAngle,
        viewFace: viewObj.face
      };
    }
  };

  el.innerHTML = `
    <div
      class="synapz-skater-360-stage relative w-full h-full flex flex-col items-center justify-between select-none"
      data-skater-stage="true"
      data-skater-renderer="v154-painted-75-25"
      data-skater-version="v15.5"
      data-avatar-base-id="${escHtml(cfg.avatarBaseId)}"
      data-view-face="${initialView.face}"
      data-hair-style="${escHtml(cfg.hairStyle)}"
      data-hair-color="${escHtml(cfg.hairColor)}"
      data-jersey-color="${escHtml(cfg.jerseyColor)}"
      data-jersey-number="${escHtml(cfg.jerseyNumber)}"
      data-back-nameplate="${escHtml(cfg.backNameplate)}"
      data-stick-id="${escHtml(cfg.stickId)}"
      data-gloves-id="${escHtml(cfg.glovesId)}"
      data-visor-id="${escHtml(cfg.visorId)}"
      data-skates-id="${escHtml(cfg.skatesId)}"
      style="touch-action: pan-y; width: 100%; height: 100%; min-height: 0; max-height: 100%; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: space-between; -webkit-perspective: 960px; perspective: 960px;"
    >
      <div
        class="synapz-skater-360-figure flex-1 min-h-0 w-full flex items-center justify-center gap-2 cursor-grab active:cursor-grabbing"
        data-skater-figure-wrap="true"
        style="flex: 1 1 0%; min-height: 0; max-height: 100%; overflow: hidden; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; -webkit-transform-style: preserve-3d; transform-style: preserve-3d; will-change: transform;"
      ></div>
      ${showDragHint ? `
        <div data-skater-drag-caption="true" class="shrink-0 pt-0.5 text-[10px] font-bold text-slate-400/90 tracking-wide text-center select-none pointer-events-none">
          ↔ Drag skater to spin
        </div>
      ` : ''}
    </div>
  `;

  const stageRoot = el.querySelector('[data-skater-stage]');
  const figureWrap = el.querySelector('[data-skater-figure-wrap]');

  let currentAngle = initialAngle;
  let renderedFace = null;

  const mountViewFace = (viewObj) => {
    if (!figureWrap || !stageRoot) return;
    stageRoot.setAttribute('data-view-face', viewObj.face);
    syncGlobalTelemetry(viewObj);
    if (renderedFace === viewObj.face) return;
    renderedFace = viewObj.face;

    if (viewObj.face === 'back') {
      figureWrap.innerHTML = buildRearSweaterShowcaseHtml(skaterState, {
        ...options,
        compactRear: Boolean(options.compactRear)
      });
      return;
    }

    figureWrap.innerHTML = `
      <div style="height: 100%; max-height: 100%; min-height: 0; overflow: hidden; width: 100%; flex: 1 1 0%; min-width: 0; display: flex; align-items: center; justify-content: center;">
        <canvas
          class="synapz-painted-skater-canvas block select-none pointer-events-none"
          data-painted-avatar-canvas="true"
          data-avatar-src="${escHtml(cfg.avatarSrc)}"
          style="height: 100%; width: auto; max-width: 100%; max-height: 100%; object-fit: contain; margin: 0 auto;"
        ></canvas>
      </div>
      ${showLoadoutDock ? buildLoadoutDockHtml(cfg, 'vertical') : ''}
    `;

    const canvasEl = figureWrap.querySelector('canvas[data-painted-avatar-canvas]');
    const syncCachedBitmap = getCachedTintedBitmap(cfg);
    if (syncCachedBitmap) {
      paintSkaterOntoCanvas(canvasEl, syncCachedBitmap, cfg, showFullGearOnSkater);
    } else {
      loadRawAvatarImage(cfg.avatarMeta).then((loadedImg) => {
        if (!loadedImg || el._synapzSkaterRenderToken !== renderToken) return;
        const liveCanvas = figureWrap.querySelector('canvas[data-painted-avatar-canvas]');
        if (!liveCanvas) return;
        const tinted = buildTintedBitmapFromImage(loadedImg, cfg);
        paintSkaterOntoCanvas(liveCanvas, tinted, cfg, showFullGearOnSkater);
      });
    }

    // Re-attach optional dock-slot click handler in Locker Room
    if (typeof options.onDockSlotClick === 'function') {
      figureWrap.querySelectorAll('[data-skater-loadout-dock] [data-dock-slot]').forEach((slotEl) => {
        slotEl.classList.add('cursor-pointer', 'hover:border-cyan-300');
        slotEl.addEventListener('click', (ev) => {
          ev.stopPropagation();
          options.onDockSlotClick(slotEl.getAttribute('data-dock-slot') || 'visor');
        });
      });
    }
  };

  mountViewFace(initialView);

  const applyVisualScrubRotation = (deg, withTransition = false) => {
    if (!figureWrap) return;
    const norm = ((deg % 360) + 360) % 360;
    const view = classifySpinView(norm);
    mountViewFace(view);

    // Pure Y-axis perspective rotation (ZERO Z-tilt or diagonal lean!)
    let relDeg = view.face === 'back' ? (norm - 180) : (norm > 180 ? norm - 360 : norm);
    relDeg = Math.max(-82, Math.min(82, relDeg));
    const shade = (1 - Math.abs(Math.sin((relDeg * Math.PI) / 180)) * 0.28).toFixed(3);

    figureWrap.style.webkitTransition = withTransition ? '-webkit-transform 210ms cubic-bezier(0.22, 1, 0.36, 1), filter 210ms ease' : 'none';
    figureWrap.style.transition = withTransition ? 'transform 210ms cubic-bezier(0.22, 1, 0.36, 1), filter 210ms ease' : 'none';
    const tf = Math.abs(relDeg) < 0.4 ? 'rotateY(0deg)' : `rotateY(${relDeg.toFixed(1)}deg)`;
    figureWrap.style.webkitTransform = tf;
    figureWrap.style.transform = tf;
    figureWrap.style.filter = Math.abs(relDeg) < 1 ? 'none' : `brightness(${shade})`;
  };

  const settleToCanonicalAngle = (targetAngle, animate = true) => {
    const cleanTarget = classifySpinView(targetAngle).face === 'back' ? 180 : 0;
    currentAngle = cleanTarget;
    applyVisualScrubRotation(cleanTarget, animate);
    if (typeof options.onAngleChange === 'function') {
      options.onAngleChange(cleanTarget);
    }
  };

  el._setSkaterSpinAngle = (deg) => settleToCanonicalAngle(deg, true);

  if (figureWrap) {
    let activePointerId = null;
    let dragStartX = null;
    let dragStartAngle = initialAngle;
    let maxAbsDx = 0;

    figureWrap.addEventListener('pointerdown', (ev) => {
      if (ev.target && ev.target.closest && ev.target.closest('[data-skater-loadout-dock]')) return;
      activePointerId = ev.pointerId;
      dragStartX = ev.clientX;
      dragStartAngle = currentAngle;
      maxAbsDx = 0;
      try {
        if (typeof figureWrap.setPointerCapture === 'function') {
          figureWrap.setPointerCapture(ev.pointerId);
        }
      } catch (_) {}
    });

    figureWrap.addEventListener('pointermove', (ev) => {
      if (dragStartX === null || (activePointerId !== null && ev.pointerId !== activePointerId)) return;
      const dx = ev.clientX - dragStartX;
      maxAbsDx = Math.max(maxAbsDx, Math.abs(dx));
      if (maxAbsDx > 5) {
        el._skaterWasDragged = true;
        const rect = stageRoot.getBoundingClientRect();
        const spanPx = Math.max(110, (rect.width || 220) * 0.62);
        const liveDeg = dragStartAngle + (dx / spanPx) * 180;
        applyVisualScrubRotation(liveDeg, false);
      }
    });

    const finishPointerDrag = (ev) => {
      if (dragStartX === null) return;
      const dx = ev.clientX - dragStartX;
      const rect = stageRoot.getBoundingClientRect();
      const spanPx = Math.max(110, (rect.width || 220) * 0.62);
      const releaseDeg = dragStartAngle + (dx / spanPx) * 180;

      if (maxAbsDx > 24) {
        // Responsive swipe OR continuous drag across 90°/270° settles smoothly to Front (0°) or Back (180°)
        const crossed = classifySpinView(releaseDeg).face;
        const startFace = classifySpinView(dragStartAngle).face;
        const target = crossed !== startFace ? (crossed === 'back' ? 180 : 0) : (Math.abs(dx) > 32 ? (startFace === 'back' ? 0 : 180) : dragStartAngle);
        settleToCanonicalAngle(target, true);
        ev.stopPropagation();
      } else if (maxAbsDx > 5) {
        settleToCanonicalAngle(dragStartAngle, true);
        ev.stopPropagation();
      }

      try {
        if (activePointerId !== null && typeof figureWrap.releasePointerCapture === 'function') {
          figureWrap.releasePointerCapture(activePointerId);
        }
      } catch (_) {}
      dragStartX = null;
      activePointerId = null;
      setTimeout(() => { el._skaterWasDragged = false; }, 110);
    };

    figureWrap.addEventListener('pointerup', finishPointerDrag);
    figureWrap.addEventListener('pointercancel', finishPointerDrag);
    figureWrap.addEventListener('click', (ev) => {
      if (el._skaterWasDragged) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    }, true);
  }

  return stageRoot ? stageRoot.outerHTML : '';
}

const SynapzSkaterRenderer360 = {
  PAINTED_SKATER_CATALOG,
  preloadAllPaintedAvatars,
  normalizeSkaterState,
  getCachedTintedBitmap,
  buildRearSweaterShowcaseHtml,
  buildCustomizableSkaterSvg,
  buildMiniSkaterHeadSvg,
  renderCustomizableSkater
};

if (typeof window !== 'undefined') {
  window.SynapzSkaterRenderer360 = SynapzSkaterRenderer360;
  window.renderCustomizableSkater = renderCustomizableSkater;
}

export default SynapzSkaterRenderer360;
