/**
 * SYNAPZ HOCKEY v15.5 — Authentic Studio-Painted 75/25 Raster Hockey Gear Art
 * & Luminance-Preserving HSL Colorway Shader (`engine/gear_art_75_25.js`)
 *
 * Replaces all coder SVG shapes with real studio-painted 75%-realistic / 25%-stylized
 * RGBA equipment renders (`assets/gear/*_75_25.png`):
 *   - `assets/gear/stick_75_25.png`
 *   - `assets/gear/gloves_75_25.png`
 *   - `assets/gear/helmet_visor_75_25.png`
 *   - `assets/gear/helmet_cage_75_25.png`
 *   - `assets/gear/skates_75_25.png`
 *   - `assets/gear/jersey_75_25.png`
 *
 * Applies cached luminance-preserving HSL pixel-mask colorway shifts on `<canvas>`
 * so every Locker Equipment Bag card, Walk-In Pro Shop SKU, Loadout Dock badge, and
 * Category Tab thumbnail displays its distinct painted colorway while preserving 100%
 * of painted 3D contour lighting, carbon weave, leather stitching, and specular sheen.
 */

export const PAINTED_GEAR_ASSET_URLS = Object.freeze({
  stick:  'assets/gear/stick_75_25.png',
  gloves: 'assets/gear/gloves_75_25.png',
  visor:  'assets/gear/helmet_visor_75_25.png',
  cage:   'assets/gear/helmet_cage_75_25.png',
  skates: 'assets/gear/skates_75_25.png',
  jersey: 'assets/gear/jersey_75_25.png'
});

const _rawGearImgCache = new Map();
const _rawGearImgPromises = new Map();
const _tintedGearCanvasCache = new Map();
const _tintedGearDataUrlCache = new Map();

function escAttr(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function hexToRgb(hex, fallback = [2, 132, 199]) {
  const clean = String(hex || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16)
    ];
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16)
    ];
  }
  return fallback;
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

function buildTargetColorProfile(hexColor, baseRefLum = 0.42) {
  const [r, g, b] = hexToRgb(hexColor);
  const [th, ts, tl] = rgbToHsl(r, g, b);
  const low = String(hexColor || '').toLowerCase();

  // Crisp White / Platinum (`#f8fafc`, `#e2e8f0`, `#ffffff`)
  if (low === '#f8fafc' || low === '#ffffff' || low === '#e2e8f0' || (ts < 0.22 && tl > 0.80)) {
    return { hue: 210, sat: 0.08, gamma: 0.58, scale: 1.12, lift: 0.14 };
  }
  // Stealth Blackout / Dark Carbon (`#0f172a`, `#111827`, `#1e293b`)
  if (low === '#0f172a' || low === '#111827' || low === '#090d16' || tl < 0.14) {
    return { hue: 218, sat: 0.18, gamma: 1.48, scale: 0.62, lift: 0.01 };
  }
  if (low === '#1e293b' || low === '#334155') {
    return { hue: 216, sat: 0.22, gamma: 1.24, scale: 0.78, lift: 0.02 };
  }
  // 24K Gold / Vegas Gold (`#facc15`, `#eab308`, `#fef08a`)
  if (low === '#facc15' || low === '#eab308' || (th >= 38 && th <= 58 && ts > 0.45)) {
    return { hue: 45, sat: 0.88, gamma: 0.74, scale: 1.08, lift: 0.03 };
  }
  // Vibrant Colorways (`Electric Cyan`, `Neon Green`, `Crimson`, `Pink`, `Purple`, `Royal Blue`)
  const desiredMid = Math.max(0.32, Math.min(0.58, tl));
  const gamma = Math.max(0.62, Math.min(1.28, Math.log(desiredMid) / Math.log(Math.max(0.12, baseRefLum))));
  return {
    hue: th,
    sat: Math.max(0.68, Math.min(0.92, ts * 0.96)),
    gamma,
    scale: 1.03,
    lift: 0.01
  };
}

function resolveAssetKeyForItem(item = {}) {
  const cat = String(item.category || 'Stick');
  const style = String(item.style || '').toLowerCase();
  if (cat === 'Gloves') return 'gloves';
  if (cat === 'Stick') return 'stick';
  if (cat === 'Skates') return 'skates';
  if (cat === 'Jersey') return 'jersey';
  if (style.includes('cage')) return 'cage';
  return 'visor';
}

function buildItemCacheKey(item = {}) {
  const assetKey = resolveAssetKeyForItem(item);
  const cat = String(item.category || 'Stick');
  const style = String(item.style || '');
  const col = String(item.color || item.hex || '#0284c7').toLowerCase();
  const acc = String(item.accentColor || item.accent || '#eab308').toLowerCase();
  const tape = String(item.tapeColor || '').toLowerCase();
  const steel = String(item.steelColor || '').toLowerCase();
  return `${assetKey}|${cat}|${style}|${col}|${acc}|${tape}|${steel}`;
}

function loadRawGearImage(assetKey) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  const src = PAINTED_GEAR_ASSET_URLS[assetKey] || PAINTED_GEAR_ASSET_URLS.stick;
  const hit = _rawGearImgCache.get(assetKey);
  if (hit && hit.complete && hit.naturalWidth > 0) {
    return Promise.resolve(hit);
  }
  if (_rawGearImgPromises.has(assetKey)) {
    return _rawGearImgPromises.get(assetKey);
  }
  const p = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      _rawGearImgCache.set(assetKey, img);
      hydratePendingGearImgNodes();
      resolve(img);
    };
    img.onerror = () => {
      _rawGearImgPromises.delete(assetKey);
      resolve(null);
    };
    img.src = src;
  });
  _rawGearImgPromises.set(assetKey, p);
  return p;
}

export function preloadAllPaintedGearArt() {
  if (typeof Image === 'undefined') return Promise.resolve([]);
  return Promise.all(Object.keys(PAINTED_GEAR_ASSET_URLS).map((k) => loadRawGearImage(k)));
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  preloadAllPaintedGearArt().catch(() => {});
}

/**
 * Generates (and caches) an offscreen `<canvas>` with luminance-preserving HSL colorway tinting
 * applied to the authentic 75/25 painted equipment render.
 */
export function getTintedGearCanvas(item = {}) {
  if (typeof document === 'undefined') return null;
  const cacheKey = buildItemCacheKey(item);
  const existing = _tintedGearCanvasCache.get(cacheKey);
  if (existing) return existing;

  const assetKey = resolveAssetKeyForItem(item);
  const rawImg = _rawGearImgCache.get(assetKey);
  if (!rawImg || !rawImg.complete || !rawImg.naturalWidth) {
    loadRawGearImage(assetKey);
    return null;
  }

  const w = rawImg.naturalWidth;
  const h = rawImg.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(rawImg, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;

  const cat = String(item.category || 'Stick');
  const style = String(item.style || '').toLowerCase();
  const colHex = item.color || item.hex || '#0284c7';
  const accHex = item.accentColor || item.accent || '#eab308';
  const primaryProf = buildTargetColorProfile(colHex, 0.42);
  const accentProf = buildTargetColorProfile(accHex, 0.52);

  // Category-specific sub-profiles
  const isVisorCategory = cat === 'Visor' && assetKey === 'visor';
  const shellHex = isVisorCategory
    ? (style.includes('smoke') ? '#111827' : (item.isStarter ? colHex : '#1e293b'))
    : (assetKey === 'cage' ? '#1e293b' : colHex);
  const shellProf = buildTargetColorProfile(shellHex, 0.40);

  let visorShieldProf = null;
  if (assetKey === 'visor') {
    if (style.includes('gold')) {
      visorShieldProf = { hue: 43, sat: 0.92, gamma: 0.80, scale: 1.06, lift: 0.04 };
    } else if (style.includes('smoke')) {
      visorShieldProf = { hue: 210, sat: 0.18, gamma: 1.65, scale: 0.46, lift: 0.02 };
    } else if (style.includes('clear') || cat === 'Helmet') {
      visorShieldProf = { hue: 198, sat: 0.22, gamma: 0.78, scale: 1.08, lift: 0.08 };
    } else {
      // Sapphire / Ice Blue Iridium
      visorShieldProf = { hue: 194, sat: 0.92, gamma: 0.86, scale: 1.04, lift: 0.02 };
    }
  }

  const darkTape = cat === 'Stick' && (item.tapeColor === '#0f172a' || item.tapeColor === '#111827');
  const steelMode = cat === 'Skates'
    ? (style.includes('black-steel') ? 'black' : (style.includes('gold-steel') ? 'gold' : (style.includes('blue-steel') ? 'blue' : 'chrome')))
    : 'chrome';

  const invH = 1 / h;
  const invW = 1 / w;

  for (let y = 0; y < h; y++) {
    const ny = (y + 0.5) * invH;
    const rowOff = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i = rowOff + x * 4;
      const a = px[i + 3];
      if (a < 10) continue;

      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      const [hue, sat, lum] = rgbToHsl(r, g, b);
      const nx = (x + 0.5) * invW;

      // 1) Stick dark cloth tape option on butt-end knob (upper-left) & curved blade (lower-right)
      if (darkTape && sat < 0.18 && lum > 0.46 && ((nx < 0.30 && ny < 0.30) || (nx > 0.66 && ny > 0.72))) {
        const wTape = (1 - smoothstep(0.12, 0.20, sat)) * smoothstep(0.46, 0.62, lum);
        const darkL = lum * 0.26 + 0.04;
        const [tr, tg, tb] = hslToRgb(216, 0.10, darkL);
        px[i]     = Math.round(r + (tr - r) * wTape);
        px[i + 1] = Math.round(g + (tg - g) * wTape);
        px[i + 2] = Math.round(b + (tb - b) * wTape);
        continue;
      }

      // 2) Skates steel runner tinting (`black-steel`, `blue-steel`, `gold-steel`) along bottom blade edge
      if (cat === 'Skates' && steelMode !== 'chrome' && ny > 0.76 && sat < 0.22 && lum > 0.25 && lum < 0.84) {
        const wSteel = smoothstep(0.76, 0.82, ny) * (1 - smoothstep(0.76, 0.85, lum));
        if (wSteel > 0.01) {
          let sr = r, sg = g, sb = b;
          if (steelMode === 'black') {
            [sr, sg, sb] = hslToRgb(210, 0.18, lum * 0.34 + 0.03);
          } else if (steelMode === 'gold') {
            [sr, sg, sb] = hslToRgb(45, 0.86, Math.min(0.88, lum * 1.02));
          } else if (steelMode === 'blue') {
            [sr, sg, sb] = hslToRgb(197, 0.84, Math.min(0.86, lum * 0.98));
          }
          px[i]     = Math.round(r + (sr - r) * wSteel);
          px[i + 1] = Math.round(g + (sg - g) * wSteel);
          px[i + 2] = Math.round(b + (sb - b) * wSteel);
          continue;
        }
      }

      // 3) Visor polycarbonate shield zone (`helmet_visor_75_25.png`, lower-right curved cyan lens)
      if (visorShieldProf && ny > 0.41 && nx > 0.31 && hue >= 170 && hue <= 203 && sat >= 0.24) {
        const wVis = smoothstep(0.41, 0.46, ny) * (1 - smoothstep(200, 206, hue)) * smoothstep(0.22, 0.34, sat);
        if (wVis > 0.01) {
          const specSheen = 1 - smoothstep(0.76, 0.95, lum) * 0.65;
          const outL = Math.max(0.04, Math.min(0.95, Math.pow(Math.max(0.01, lum), visorShieldProf.gamma) * visorShieldProf.scale + visorShieldProf.lift));
          const outS = Math.max(0.05, Math.min(0.95, visorShieldProf.sat * specSheen));
          const [vr, vg, vb] = hslToRgb(visorShieldProf.hue, outS, outL);
          px[i]     = Math.round(r + (vr - r) * wVis);
          px[i + 1] = Math.round(g + (vg - g) * wVis);
          px[i + 2] = Math.round(b + (vb - b) * wVis);
          continue;
        }
      }

      // 4) Primary Royal-Blue Painted Shell / Graphic Zone (`Hue 184°..248°`, `Sat >= 0.20`)
      const wBlue = smoothstep(182, 194, hue) * (1 - smoothstep(242, 254, hue)) * smoothstep(0.18, 0.28, sat);
      if (wBlue > 0.01) {
        const prof = (assetKey === 'visor' || assetKey === 'cage') ? shellProf : primaryProf;
        const specFade = 1 - smoothstep(0.72, 0.93, lum) * 0.55;
        const outL = Math.max(0.03, Math.min(0.95, Math.pow(Math.max(0.01, lum), prof.gamma) * prof.scale + prof.lift));
        const outS = Math.max(0.04, Math.min(0.94, (prof.sat * 0.84 + sat * 0.16) * specFade));
        const [nr, ng, nb] = hslToRgb(prof.hue, outS, outL);
        px[i]     = Math.round(r + (nr - r) * wBlue);
        px[i + 1] = Math.round(g + (ng - g) * wBlue);
        px[i + 2] = Math.round(b + (nb - b) * wBlue);
        continue;
      }

      // 5) Secondary Warm-Gold Trim / Cuff / Stripe Zone (`Hue 22°..62°`, `Sat >= 0.25`)
      //    (Exclude central silver/gold puck crest interior on jersey so metallic puck stays iconic)
      const inJerseyPuckCenter = assetKey === 'jersey' && nx > 0.39 && nx < 0.61 && ny > 0.34 && ny < 0.58;
      if (!inJerseyPuckCenter) {
        const wGold = smoothstep(20, 28, hue) * (1 - smoothstep(56, 65, hue)) * smoothstep(0.24, 0.36, sat);
        if (wGold > 0.01) {
          const specFade = 1 - smoothstep(0.76, 0.94, lum) * 0.50;
          const outL = Math.max(0.04, Math.min(0.95, Math.pow(Math.max(0.01, lum), accentProf.gamma) * accentProf.scale + accentProf.lift));
          const outS = Math.max(0.04, Math.min(0.94, (accentProf.sat * 0.84 + sat * 0.16) * specFade));
          const [ar, ag, ab] = hslToRgb(accentProf.hue, outS, outL);
          px[i]     = Math.round(r + (ar - r) * wGold);
          px[i + 1] = Math.round(g + (ag - g) * wGold);
          px[i + 2] = Math.round(b + (ab - b) * wGold);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  _tintedGearCanvasCache.set(cacheKey, canvas);
  return canvas;
}

export function getTintedGearDataUrl(item = {}) {
  const cacheKey = buildItemCacheKey(item);
  const hit = _tintedGearDataUrlCache.get(cacheKey);
  if (hit) return hit;

  const canvas = getTintedGearCanvas(item);
  if (canvas) {
    try {
      const url = canvas.toDataURL('image/png');
      _tintedGearDataUrlCache.set(cacheKey, url);
      return url;
    } catch (_) {}
  }
  return null;
}

const _pendingItemsByKey = new Map();
function hydratePendingGearImgNodes() {
  if (typeof document === 'undefined') return;
  const nodes = document.querySelectorAll('img[data-gear-pending-key]');
  nodes.forEach((imgEl) => {
    const key = imgEl.getAttribute('data-gear-pending-key');
    const item = _pendingItemsByKey.get(key);
    if (!item) return;
    const dataUrl = getTintedGearDataUrl(item);
    if (dataUrl) {
      imgEl.src = dataUrl;
      imgEl.removeAttribute('data-gear-pending-key');
      imgEl.setAttribute('data-gear-tinted-ready', 'true');
    }
  });
}

/**
 * Starter Rink Kit — Always owned (`owned: true`) by every skater profile so the
 * Locker Room Equipment Bag strictly displays owned gear with zero Pro Shop ads.
 */
export function buildStarterGearItems(profile = {}) {
  const jerseyHex = profile?.jerseyColor || '#0284c7';
  const helmetHex = jerseyHex === '#eab308' ? '#111827' : jerseyHex;
  return [
    {
      id: 'starter-stick',
      category: 'Stick',
      slot: 'stick',
      style: 'starter-carbon',
      tierLabel: 'Starter Kit',
      name: 'Standard Carbon Composite Twig',
      cost: 0,
      owned: true,
      isStarter: true,
      color: '#0284c7',
      accentColor: '#eab308',
      tapeColor: '#f8fafc'
    },
    {
      id: 'starter-gloves',
      category: 'Gloves',
      slot: 'gloves',
      style: '4-roll-pro',
      tierLabel: 'Starter Kit',
      name: 'Standard Team 4-Roll Hockey Gloves',
      cost: 0,
      owned: true,
      isStarter: true,
      color: jerseyHex,
      accentColor: '#eab308'
    },
    {
      id: 'starter-visor',
      category: 'Visor',
      slot: 'visor',
      style: 'clear-shield',
      tierLabel: 'Starter Kit',
      name: 'Standard Pro Bucket & Clear Shield',
      cost: 0,
      owned: true,
      isStarter: true,
      color: helmetHex,
      accentColor: '#eab308',
      visorTint: 'clear'
    },
    {
      id: 'starter-skates',
      category: 'Skates',
      slot: 'skates',
      style: 'chrome-steel',
      tierLabel: 'Starter Kit',
      name: 'Standard Pro Quarter Hockey Skates',
      cost: 0,
      owned: true,
      isStarter: true,
      color: '#0284c7',
      accentColor: '#eab308',
      steelColor: '#e2e8f0'
    }
  ];
}

export const STARTER_JERSEY_SWATCHES = [
  { id: 'jersey-blue', hex: '#0284c7', accent: '#eab308', name: 'All-Star Ice Blue Sweater', tierLabel: 'Team Kit', owned: true },
  { id: 'jersey-red', hex: '#dc2626', accent: '#f8fafc', name: 'Championship Crimson Red Sweater', tierLabel: 'Team Kit', owned: true },
  { id: 'jersey-pink', hex: '#ec4899', accent: '#f8fafc', name: 'Electric Rink Pink Sweater', tierLabel: 'Team Kit', owned: true },
  { id: 'jersey-purple', hex: '#7c3aed', accent: '#eab308', name: 'Royal Purple Pro Sweater', tierLabel: 'Team Kit', owned: true },
  { id: 'jersey-gold', hex: '#eab308', accent: '#0f172a', name: 'Vegas Championship Gold Sweater', tierLabel: 'Team Kit', owned: true },
  { id: 'jersey-black', hex: '#111827', accent: '#22d3ee', name: 'Stealth Blackout Pro Sweater', tierLabel: 'Team Kit', owned: true }
];

export function resolveItemTierLabel(item = {}) {
  if (item.tierLabel) return item.tierLabel;
  if (item.isStarter) return 'Starter Kit';
  if (item.isPromoShowcase) return 'Pro Drop';
  const cost = Number(item.cost || 0);
  if (cost >= 320) return 'Championship Tier';
  if (cost >= 220) return 'Elite Pro Tier';
  return 'Pro Stock';
}

/**
 * Crisp Painted 75/25 Category Tab Thumbnail (`<img>` backed by `assets/gear/*_75_25.png`, ZERO flat SVG doodles).
 */
export function renderGearCategoryIconSvg(category = 'Stick', sizePx = 20) {
  const norm = String(category || '').toLowerCase();
  const w = Math.max(18, Math.round((Number(sizePx) || 20) * 1.25));
  const h = Math.max(15, Math.round(w * 0.78));

  let src = PAINTED_GEAR_ASSET_URLS.stick;
  if (norm.includes('glove')) src = PAINTED_GEAR_ASSET_URLS.gloves;
  else if (norm.includes('visor') || norm.includes('helmet') || norm.includes('bucket')) src = PAINTED_GEAR_ASSET_URLS.visor;
  else if (norm.includes('skate')) src = PAINTED_GEAR_ASSET_URLS.skates;
  else if (norm.includes('jersey') || norm.includes('sweater')) src = PAINTED_GEAR_ASSET_URLS.jersey;
  else if (norm.includes('bag')) src = PAINTED_GEAR_ASSET_URLS.gloves;

  return `<img src="${escAttr(src)}" width="${w}" height="${h}" alt="" aria-hidden="true" data-painted-gear-tab-icon="${escAttr(category)}" class="inline-block align-middle shrink-0 object-contain select-none pointer-events-none" style="width:${w}px;height:${h}px;" />`;
}

/**
 * Renders an authentic Studio-Painted 75/25 Gear Card Thumbnail (`assets/gear/*_75_25.png`)
 * with cached luminance-preserving HSL colorway tinting (ZERO flat coder SVG doodles!).
 */
export function renderGearItemArtSvg(item = {}, opts = {}) {
  const cat = String(item.category || 'Stick');
  const assetKey = resolveAssetKeyForItem(item);
  const baseUrl = PAINTED_GEAR_ASSET_URLS[assetKey] || PAINTED_GEAR_ASSET_URLS.stick;
  const cacheKey = buildItemCacheKey(item);
  const tintedDataUrl = getTintedGearDataUrl(item);

  let pendingAttr = '';
  if (!tintedDataUrl) {
    _pendingItemsByKey.set(cacheKey, { ...item });
    pendingAttr = `data-gear-pending-key="${escAttr(cacheKey)}"`;
  } else {
    pendingAttr = 'data-gear-tinted-ready="true"';
  }

  const sizeCls = opts.dockTile
    ? (opts.horizontalDock ? 'w-full h-9' : 'w-11 h-7 sm:w-12 sm:h-8')
    : (opts.compact ? 'w-20 h-14' : 'w-24 h-16');

  const frameCls = opts.dockTile
    ? `${sizeCls} flex items-center justify-center shrink-0 overflow-hidden`
    : `${sizeCls} shrink-0 rounded-xl bg-[#0b1324] border border-slate-700/80 p-1 shadow-inner flex items-center justify-center overflow-hidden`;

  const srcToUse = tintedDataUrl || baseUrl;

  return `
    <div data-painted-gear-card="${escAttr(cat)}" data-gear-item-id="${escAttr(item.id || cat)}" class="${frameCls}">
      <img
        src="${escAttr(srcToUse)}"
        alt="${escAttr(item.name || cat)}"
        data-painted-gear-img="true"
        data-gear-base-src="${escAttr(baseUrl)}"
        data-gear-cat="${escAttr(cat)}"
        ${pendingAttr}
        class="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_3px_6px_rgba(2,6,23,0.75)]"
      />
    </div>
  `;
}

/**
 * Returns strictly `owned === true` items for a player's Locker Room Equipment Bag
 * (Starter Rink Kit + purchased/unlocked Pro Shop items ONLY — zero unowned ads!).
 */
export function getOwnedLockerBagItems(profile = {}, shopCatalog = [], categoryFilter = 'Bag') {
  const ownedSet = new Set(Array.isArray(profile?.ownedGear) ? profile.ownedGear : []);
  const starters = buildStarterGearItems(profile);
  const purchasedShopItems = (Array.isArray(shopCatalog) ? shopCatalog : [])
    .filter((it) => it && it.category !== 'Celly' && ownedSet.has(it.id))
    .map((it) => ({
      ...it,
      owned: true,
      isStarter: false,
      tierLabel: resolveItemTierLabel(it)
    }));

  const combined = [...starters, ...purchasedShopItems];
  const cat = String(categoryFilter || 'Bag');
  if (cat === 'Bag' || cat === 'all') {
    return combined;
  }
  if (cat === 'Visor' || cat === 'Helmets') {
    return combined.filter((it) => it.category === 'Visor' || it.category === 'Helmet');
  }
  if (cat === 'Sticks' || cat === 'Stick') {
    return combined.filter((it) => it.category === 'Stick');
  }
  return combined.filter((it) => it.category === cat);
}

const SynapzGearArt7525 = {
  PAINTED_GEAR_ASSET_URLS,
  preloadAllPaintedGearArt,
  getTintedGearCanvas,
  getTintedGearDataUrl,
  buildStarterGearItems,
  STARTER_JERSEY_SWATCHES,
  resolveItemTierLabel,
  renderGearCategoryIconSvg,
  renderGearItemArtSvg,
  getOwnedLockerBagItems
};

if (typeof window !== 'undefined') {
  window.SynapzGearArt7525 = SynapzGearArt7525;
  window.renderProShopWallProductSvg = (item) => renderGearItemArtSvg(item);
}

export default SynapzGearArt7525;
