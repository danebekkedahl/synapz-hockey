/**
 * SYNAPZ HOCKEY v15.5 — Authentic 75/25 Illustrated North America (US + Canada)
 * 32-City Head-to-Head NHL Atlas Map & Friend Scouting Profile Cards (`engine/nhl_atlas_map.js`)
 *
 * Replaces the simplified straight-line polygon map with:
 *   - High-resolution 75%-realistic / 25%-stylized Championship Sports Atlas illustration
 *     of North America (`assets/maps/north_america_75_25.png`, 16:9, zero baked-in text).
 *   - All 32 NHL cities (`SJS..FLA`) precisely calibrated onto their true coastal/inland
 *     locations on the illustrated map with smooth `1.0x–4.0x` zoom & drag-pan.
 *   - Head-to-Head Friend Race Pins + 1-Tap `👀 Preview Sample Teammates` toggle
 *     (keeping brand-new profiles strictly at `0` connected friends by default per Law 8).
 *   - Clickable **Player Scouting Card** modal (`openFriendScoutingCardModal`) shared
 *     between the 32-City Map and Friends & Family Wall, showcasing the teammate's
 *     custom painted 75/25 avatar + equipped Pro Shop gear list + Hockey IQ +
 *     Age Band / Position + City Stop (`City X of 32`) + 5-Zone Tactical Skill Metrics!
 */

import { renderCustomizableSkater, normalizeSkaterState } from './skater_renderer_360.js';
import { renderGearItemArtSvg, STARTER_JERSEY_SWATCHES } from './gear_art_75_25.js';

export const PAINTED_NORTH_AMERICA_MAP_URL = 'assets/maps/north_america_75_25.png';

// Eagerly preload the illustrated North America map in browser environments
let _preloadedMapImg = null;
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _preloadedMapImg = new Image();
  _preloadedMapImg.decoding = 'async';
  _preloadedMapImg.src = PAINTED_NORTH_AMERICA_MAP_URL;
}

function escMap(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Compatibility projection helper kept for external callers
export function projectNorthAmericaLatLon(lat, lon) {
  const DEG2RAD = Math.PI / 180;
  const PHI1 = 29.5 * DEG2RAD;
  const PHI2 = 45.5 * DEG2RAD;
  const PHI0 = 40.5 * DEG2RAD;
  const LAMBDA0 = -96.0 * DEG2RAD;
  const N_CONE = 0.5 * (Math.sin(PHI1) + Math.sin(PHI2));
  const C_CONE = Math.cos(PHI1) * Math.cos(PHI1) + 2 * N_CONE * Math.sin(PHI1);
  const RHO0 = Math.sqrt(C_CONE - 2 * N_CONE * Math.sin(PHI0)) / N_CONE;
  const phi = Number(lat) * DEG2RAD;
  const lam = Number(lon) * DEG2RAD;
  const theta = N_CONE * (lam - LAMBDA0);
  const rho = Math.sqrt(Math.max(0.0001, C_CONE - 2 * N_CONE * Math.sin(phi))) / N_CONE;
  const x = 495 + 1160 * rho * Math.sin(theta);
  const y = 312 - 1160 * (RHO0 - rho * Math.cos(theta));
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

// ============================================================================
// ALL 32 OFFICIAL NHL CITIES CALIBRATED ONTO `assets/maps/north_america_75_25.png` (1000x562)
// ============================================================================
const CALIBRATED_32_NHL_CITIES = [
  { code: 'SJS', id: 'sanjose',      name: 'San Jose',      team: 'Sharks',                region: 'CA', lat: 37.33, lon: -121.90, x: 173, y: 324, focus: 'Puck Support & Basics' },
  { code: 'ANA', id: 'anaheim',      name: 'Anaheim',       team: 'Ducks',                 region: 'CA', lat: 33.81, lon: -117.88, x: 211, y: 394, focus: '2-on-1 Support Lanes' },
  { code: 'LAK', id: 'losangeles',   name: 'Los Angeles',   team: 'Kings',                 region: 'CA', lat: 34.04, lon: -118.27, x: 203, y: 385, focus: 'O-Zone Triangle Spacing' },
  { code: 'SEA', id: 'seattle',      name: 'Seattle',       team: 'Kraken',                region: 'WA', lat: 47.62, lon: -122.35, x: 204, y: 158, focus: 'High-Slot Coverage' },
  { code: 'VAN', id: 'vancouver',    name: 'Vancouver',     team: 'Canucks',               region: 'BC', lat: 49.28, lon: -123.11, x: 206, y: 132, focus: 'Protecting the House' },
  { code: 'CGY', id: 'calgary',      name: 'Calgary',       team: 'Flames',                region: 'AB', lat: 51.04, lon: -114.05, x: 310, y: 128, focus: 'Net-Front Box-Out' },
  { code: 'EDM', id: 'edmonton',     name: 'Edmonton',      team: 'Oilers',                region: 'AB', lat: 53.55, lon: -113.49, x: 318, y: 88,  focus: 'Controlled Breakouts' },
  { code: 'VGK', id: 'vegas',        name: 'Las Vegas',     team: 'Golden Knights',        region: 'NV', lat: 36.10, lon: -115.18, x: 246, y: 362, focus: 'D-to-D Reverse Outlets' },
  { code: 'UTA', id: 'utah',         name: 'Salt Lake',     team: 'Utah HC',               region: 'UT', lat: 40.77, lon: -111.90, x: 298, y: 288, focus: 'Center Low-and-Slow Curl' },
  { code: 'COL', id: 'denver',       name: 'Denver',        team: 'Avalanche',             region: 'CO', lat: 39.75, lon: -105.01, x: 374, y: 322, focus: 'Speed Regroup Entries' },
  { code: 'DAL', id: 'dallas',       name: 'Dallas',        team: 'Stars',                 region: 'TX', lat: 32.79, lon: -96.81,  x: 478, y: 424, focus: 'Odd-Man Rush Width' },
  { code: 'WPG', id: 'winnipeg',     name: 'Winnipeg',      team: 'Jets',                  region: 'MB', lat: 49.89, lon: -97.14,  x: 492, y: 150, focus: 'Middle-Lane Drive' },
  { code: 'MIN', id: 'stpaul',       name: 'St. Paul',      team: 'Wild',                  region: 'MN', lat: 44.94, lon: -93.10,  x: 542, y: 236, focus: 'F3 High-Slot Trailer' },
  { code: 'STL', id: 'stlouis',      name: 'St. Louis',     team: 'Blues',                 region: 'MO', lat: 38.63, lon: -90.20,  x: 568, y: 342, focus: 'Blue-Line Gap Surfing' },
  { code: 'CHI', id: 'chicago',      name: 'Chicago',       team: 'Blackhawks',            region: 'IL', lat: 41.88, lon: -87.67,  x: 598, y: 279, focus: 'Cycle & Cutback Shielding' },
  { code: 'NSH', id: 'nashville',    name: 'Nashville',     team: 'Predators',             region: 'TN', lat: 36.16, lon: -86.78,  x: 626, y: 378, focus: 'Stick-on-Puck Angling' },
  { code: 'DET', id: 'detroit',      name: 'Detroit',       team: 'Red Wings',             region: 'MI', lat: 42.34, lon: -83.05,  x: 656, y: 267, focus: '2-1-2 Forecheck Pinch' },
  { code: 'CBJ', id: 'columbus',     name: 'Columbus',      team: 'Blue Jackets',          region: 'OH', lat: 39.97, lon: -83.01,  x: 668, y: 310, focus: 'Royal-Road Seam Denial' },
  { code: 'TOR', id: 'toronto',      name: 'Toronto',       team: 'Maple Leafs',           region: 'ON', lat: 43.64, lon: -79.38,  x: 704, y: 241, focus: 'High-Tempo Two-Touch' },
  { code: 'OTT', id: 'ottawa',       name: 'Ottawa',        team: 'Senators',              region: 'ON', lat: 45.30, lon: -75.93,  x: 742, y: 207, focus: 'Neutral Zone Hinge' },
  { code: 'MTL', id: 'montreal',     name: 'Montreal',      team: 'Canadiens',             region: 'QC', lat: 45.50, lon: -73.57,  x: 766, y: 198, focus: 'Backcheck Gut Track' },
  { code: 'BOS', id: 'boston',       name: 'Boston',        team: 'Bruins',                region: 'MA', lat: 42.37, lon: -71.06,  x: 804, y: 238, focus: 'Board-Seal Breakouts' },
  { code: 'BUF', id: 'buffalo',      name: 'Buffalo',       team: 'Sabres',                region: 'NY', lat: 42.87, lon: -78.88,  x: 713, y: 261, focus: 'Shoulder-Check Scanning' },
  { code: 'NYR', id: 'nyrangers',    name: 'New York',      team: 'Rangers',               region: 'NY', lat: 40.75, lon: -73.99,  x: 775, y: 269, focus: 'Quick-Up Transition' },
  { code: 'NYI', id: 'nyislanders',  name: 'Long Island',   team: 'Islanders',             region: 'NY', lat: 40.72, lon: -73.52,  x: 787, y: 269, focus: 'Structured Low House' },
  { code: 'NJD', id: 'newjersey',    name: 'New Jersey',    team: 'Devils',                region: 'NJ', lat: 40.73, lon: -74.19,  x: 769, y: 274, focus: 'Speed Entry & Delay' },
  { code: 'PHI', id: 'philadelphia', name: 'Philadelphia',  team: 'Flyers',                region: 'PA', lat: 39.90, lon: -75.17,  x: 758, y: 289, focus: 'Strong-Wall Rim Seal' },
  { code: 'PIT', id: 'pittsburgh',   name: 'Pittsburgh',    team: 'Penguins',              region: 'PA', lat: 40.44, lon: -79.99,  x: 706, y: 295, focus: 'Give-and-Go Scissors' },
  { code: 'WSH', id: 'washington',   name: 'Washington',    team: 'Capitals',              region: 'DC', lat: 38.90, lon: -77.02,  x: 741, y: 314, focus: '5-on-4 Umbrella One-Timer' },
  { code: 'CAR', id: 'carolina',     name: 'Raleigh',       team: 'Hurricanes',            region: 'NC', lat: 35.80, lon: -78.72,  x: 734, y: 364, focus: 'Aggressive Point Pinch' },
  { code: 'TBL', id: 'tampabay',     name: 'Tampa Bay',     team: 'Lightning',             region: 'FL', lat: 27.94, lon: -82.45,  x: 706, y: 502, focus: '4-on-5 Diamond PK' },
  { code: 'FLA', id: 'florida',      name: 'Florida',       team: 'Panthers • Cup Final',  region: 'FL', lat: 26.16, lon: -80.33,  x: 733, y: 526, focus: 'Championship All-Zone IQ' }
];

export const NHL_ATLAS_CITIES = CALIBRATED_32_NHL_CITIES.map((c, stopIdx) => ({
  ...c,
  stopIndex: stopIdx,
  stopNumber: stopIdx + 1
}));

// ============================================================================
// OPTIONAL SAMPLE TEAMMATES (Shown ONLY When `👀 Preview Sample Teammates` Is Toggled ON!)
// Brand-new profiles stay strictly at `0` connected friends by default (Studio Law 8).
// ============================================================================
export const SAMPLE_TEAMMATES_ROSTER = Object.freeze([
  {
    friendCode: 'MAYA19',
    name: 'Maya',
    jerseyNumber: '19',
    divisionLabel: '12U AA',
    positionCode: 'RW',
    stockAvatarId: 'avatar-female-2',
    hairStyle: 'braids',
    hairColor: '#111827',
    jerseyColor: '#ec4899',
    equippedStickId: 'stick-carbon-pulse',
    equippedGlovesId: 'gloves-blackout-pro',
    equippedVisorId: 'visor-gold',
    equippedSkatesId: 'skate-ridgecore-dlc',
    equippedSkates: 'skate-ridgecore-dlc',
    iqScore: 168,
    cityStopIdx: 18, // Stop 19 of 32: Toronto (TOR)
    cityName: 'Toronto',
    isSamplePreview: true,
    zoneMetrics: { dz: 88, nz: 92, om: 95, oz: 89, st: 82 },
    milestones: ['Reached Stop #19 Toronto (TOR)', '95% Odd-Man Rush Mastery']
  },
  {
    friendCode: 'GUGG38',
    name: 'Gugger',
    jerseyNumber: '38',
    divisionLabel: '14U AAA',
    positionCode: 'LD',
    stockAvatarId: 'avatar-male-1',
    hairStyle: 'flow',
    hairColor: '#facc15',
    jerseyColor: '#0284c7',
    equippedStickId: 'stick-cyan',
    equippedGlovesId: 'gloves-gold',
    equippedVisorId: 'visor-tint',
    equippedSkatesId: 'skate-gold',
    equippedSkates: 'skate-gold',
    iqScore: 185,
    cityStopIdx: 12, // Stop 13 of 32: St. Paul (MIN)
    cityName: 'St. Paul',
    isSamplePreview: true,
    zoneMetrics: { dz: 94, nz: 90, om: 87, oz: 91, st: 89 },
    milestones: ['Reached Stop #13 St. Paul (MIN)', 'Unlocked 24K All-Star Mitts']
  },
  {
    friendCode: 'RHET88',
    name: 'Rhett',
    jerseyNumber: '88',
    divisionLabel: '12U A',
    positionCode: 'C',
    stockAvatarId: 'avatar-male-3',
    hairStyle: 'mohawk',
    hairColor: '#06b6d4',
    jerseyColor: '#7c3aed',
    equippedStickId: 'stick-gold',
    equippedGlovesId: 'gloves-cyan',
    equippedVisorId: 'visor-blue',
    equippedSkatesId: 'skate-blue',
    equippedSkates: 'skate-blue',
    iqScore: 142,
    cityStopIdx: 13, // Stop 14 of 32: St. Louis (STL)
    cityName: 'St. Louis',
    isSamplePreview: true,
    zoneMetrics: { dz: 84, nz: 78, om: 91, oz: 86, st: 74 },
    milestones: ['Reached Stop #14 St. Louis (STL)', '5-Play Gold Shift Streak']
  }
]);

export function isSampleTeammatesPreviewEnabled() {
  return Boolean(typeof window !== 'undefined' && window.state && window.state.previewSampleTeammates === true);
}

export function getEffectiveClubhouseFriends(profile = {}) {
  const realAccepted = Array.isArray(profile?.acceptedFriends)
    ? profile.acceptedFriends.filter((f) => f && f.friendCode && !['RHET88', 'MAYA19', 'SK8R24', 'GUGG38'].includes(f.friendCode))
    : [];
  if (isSampleTeammatesPreviewEnabled()) {
    return [...realAccepted, ...SAMPLE_TEAMMATES_ROSTER.map((t) => ({ ...t }))];
  }
  return realAccepted;
}

function resolveFriend5ZoneMetrics(fr = {}) {
  if (fr && fr.zoneMetrics && typeof fr.zoneMetrics === 'object') {
    return {
      dz: Math.max(0, Math.min(100, Math.round(Number(fr.zoneMetrics.dz) || 0))),
      nz: Math.max(0, Math.min(100, Math.round(Number(fr.zoneMetrics.nz) || 0))),
      om: Math.max(0, Math.min(100, Math.round(Number(fr.zoneMetrics.om) || 0))),
      oz: Math.max(0, Math.min(100, Math.round(Number(fr.zoneMetrics.oz) || 0))),
      st: Math.max(0, Math.min(100, Math.round(Number(fr.zoneMetrics.st) || 0)))
    };
  }
  const baseIq = Math.max(0, Number(fr?.iqScore || 0));
  if (baseIq <= 0) {
    return { dz: 0, nz: 0, om: 0, oz: 0, st: 0 };
  }
  const clamp = (v) => Math.max(12, Math.min(99, Math.round(v)));
  return {
    dz: clamp(baseIq * 0.58 + 14),
    nz: clamp(baseIq * 0.54 + 16),
    om: clamp(baseIq * 0.60 + 15),
    oz: clamp(baseIq * 0.56 + 13),
    st: clamp(baseIq * 0.50 + 12)
  };
}

/**
 * Opens the Clickable **Player Scouting Profile Card** modal (`#friendScoutingCardModal`)
 * from EITHER the 32-City NHL Head-to-Head Map OR the Friends & Family Wall!
 * Displays:
 *   - Custom 75/25 painted avatar wearing equipped 75/25 gear (with finger-drag spin!)
 *   - Full list of equipped Pro Shop items with painted 75/25 colorway thumbnails
 *   - Hockey IQ, Age Band / Position, & Head-to-Head City Stop (`City X of 32`)
 *   - 5-Zone Tactical Skill Metrics (`Breakouts & D-Zone %`, `Neutral Zone %`, `Odd-Man Rush %`, `O-Zone %`, `Special Teams %`)
 */
export function openFriendScoutingCardModal(friendData = {}) {
  if (typeof document === 'undefined' || !friendData) return null;

  let modal = document.getElementById('friendScoutingCardModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'friendScoutingCardModal';
    modal.className = 'hidden fixed inset-0 z-[128] bg-slate-950/88 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto';
    document.body.appendChild(modal);

    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) {
        modal.classList.add('hidden');
      }
    });
  }

  const cfg = normalizeSkaterState(friendData);
  const stopIdx = Math.max(0, Math.min(31, Number(friendData.cityStopIdx ?? friendData.currentCityIdx ?? 0)));
  const cityObj = NHL_ATLAS_CITIES[stopIdx] || NHL_ATLAS_CITIES[0];
  const divLabel = String(friendData.divisionLabel || friendData.ageGroup || '12U AA').trim();
  const posLabel = String(friendData.positionCode || friendData.position || 'C').trim().toUpperCase();
  const iqVal = Math.max(0, Math.round(Number(friendData.iqScore ?? friendData.hockeyIQ ?? 0)));
  const jNum = cfg.jerseyNumber ? `#${cfg.jerseyNumber}` : '';
  const metrics = resolveFriend5ZoneMetrics(friendData);

  const jerseySwatch = STARTER_JERSEY_SWATCHES.find((sw) => sw.hex.toLowerCase() === cfg.jerseyColor.toLowerCase()) || {
    id: 'custom-jersey',
    name: 'Custom Team Pro Sweater',
    hex: cfg.jerseyColor,
    accent: cfg.jerseyAccent
  };

  const equippedList = [
    { slotLabel: 'Stick',          item: { ...cfg.stickItem,  category: 'Stick' } },
    { slotLabel: 'Gloves',         item: { ...cfg.glovesItem, category: 'Gloves' } },
    { slotLabel: 'Helmet / Visor', item: { ...cfg.visorItem,  category: cfg.visorItem.category || 'Visor' } },
    { slotLabel: 'Skates',         item: { ...cfg.skatesItem, category: 'Skates' } },
    { slotLabel: 'Sweater',        item: { id: jerseySwatch.id, category: 'Jersey', name: jerseySwatch.name, color: cfg.jerseyColor, accentColor: cfg.jerseyAccent } }
  ];

  const zoneRows = [
    { key: 'dz', label: 'Breakouts & D-Zone', pct: metrics.dz, barCls: 'from-cyan-400 to-sky-500',     txtCls: 'text-cyan-300' },
    { key: 'nz', label: 'Neutral Zone',       pct: metrics.nz, barCls: 'from-emerald-400 to-teal-500', txtCls: 'text-emerald-300' },
    { key: 'om', label: 'Odd-Man Rush',       pct: metrics.om, barCls: 'from-amber-400 to-orange-500', txtCls: 'text-amber-300' },
    { key: 'oz', label: 'O-Zone',             pct: metrics.oz, barCls: 'from-fuchsia-400 to-pink-500', txtCls: 'text-pink-300' },
    { key: 'st', label: 'Special Teams',      pct: metrics.st, barCls: 'from-indigo-400 to-violet-500',txtCls: 'text-indigo-300' }
  ];

  modal.innerHTML = `
    <div id="friendScoutingCardDialog" data-scouting-friend="${escMap(friendData.friendCode || cfg.name)}" class="w-full max-w-4xl rounded-2xl bg-[#0b1324] border-2 border-amber-400 p-4 sm:p-5 shadow-2xl space-y-3.5 my-auto text-left">
      <!-- Top Scouting Header -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
            🏒 Player Scouting Card
          </span>
          <h3 class="text-base sm:text-lg font-black text-white">
            ${escMap(cfg.name)} <span class="text-cyan-300">${escMap(jNum)}</span>
          </h3>
          ${friendData.isSamplePreview ? '<span class="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 text-[10px] font-black">Sample Teammate</span>' : ''}
        </div>
        <button type="button" id="btnCloseFriendScoutingCard" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-black cursor-pointer">
          ✕ Close
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        <!-- LEFT COLUMN: Custom 75/25 Painted Skater Wearing Equipped Gear -->
        <div class="md:col-span-5 min-h-0 overflow-hidden rounded-2xl bg-slate-950/95 border border-cyan-400/50 p-3 flex flex-col items-center gap-2">
          <div class="w-full flex items-center justify-between text-[10px] font-black uppercase shrink-0">
            <span class="text-cyan-300">75/25 Painted Loadout</span>
            <span class="text-amber-300">${escMap(divLabel)} • ${escMap(posLabel)}</span>
          </div>
          <div id="friendScoutingSkaterStage" class="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden" style="height: 340px; max-height: 365px;"></div>
        </div>

        <!-- RIGHT COLUMN: Hockey IQ, City X of 32, 5-Zone Tactical Skill Metrics & Equipped Pro Shop Gear List -->
        <div class="md:col-span-7 flex flex-col justify-between gap-3">
          <!-- Stat KPI Strip -->
          <div class="grid grid-cols-3 gap-2">
            <div class="p-2.5 rounded-xl bg-slate-950 border border-emerald-400/50">
              <div class="text-[9.5px] font-black uppercase text-slate-400">Hockey IQ</div>
              <div data-scouting-iq="${iqVal}" class="text-base sm:text-lg font-black text-emerald-300 mt-0.5">🧠 ${iqVal} IQ</div>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-950 border border-cyan-400/50">
              <div class="text-[9.5px] font-black uppercase text-slate-400">Age Band / Pos</div>
              <div data-scouting-div-pos="${escMap(divLabel)} • ${escMap(posLabel)}" class="text-xs sm:text-sm font-black text-cyan-200 mt-1">${escMap(divLabel)} • ${escMap(posLabel)}</div>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-950 border border-amber-400/55">
              <div class="text-[9.5px] font-black uppercase text-slate-400">Head-to-Head Tour</div>
              <div data-scouting-city-stop="City ${cityObj.stopNumber} of 32" class="text-xs sm:text-sm font-black text-amber-300 mt-0.5">📍 City ${cityObj.stopNumber} of 32</div>
              <div class="text-[10px] font-bold text-slate-300 truncate">${escMap(cityObj.name)} (${escMap(cityObj.code)})</div>
            </div>
          </div>

          <!-- 5-Zone Tactical Skill Metrics -->
          <div class="p-3 rounded-xl bg-slate-950/95 border border-slate-800 space-y-1.5" data-scouting-5zone-metrics="true">
            <div class="text-[10px] font-black uppercase tracking-wider text-cyan-300">📊 5-Zone Tactical Skill Metrics</div>
            <div class="space-y-1.5">
              ${zoneRows.map((zr) => `
                <div data-scouting-zone-row="${zr.key}" class="space-y-0.5">
                  <div class="flex items-center justify-between text-[11px] font-black">
                    <span class="text-slate-200">${escMap(zr.label)}</span>
                    <span class="${zr.txtCls}">${zr.pct}%</span>
                  </div>
                  <div class="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div class="h-full rounded-full bg-gradient-to-r ${zr.barCls}" style="width:${zr.pct}%;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Equipped Pro Shop Items Showcase -->
          <div class="p-3 rounded-xl bg-slate-950/95 border border-slate-800 space-y-1.5" data-scouting-equipped-list="true">
            <div class="text-[10px] font-black uppercase tracking-wider text-amber-300">🎒 Equipped Pro Shop Gear Locker</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              ${equippedList.map((eq) => {
                const thumb = renderGearItemArtSvg(eq.item, { dockTile: true }).replace(/w-12 h-9 sm:w-14 sm:h-10/g, 'w-11 h-8');
                return `
                  <div data-scouting-gear-slot="${escMap(eq.slotLabel)}" class="px-2 py-1.5 rounded-xl bg-[#0b1324] border border-slate-800 flex items-center gap-2">
                    ${thumb}
                    <div class="min-w-0 flex-1">
                      <div class="text-[9px] font-black uppercase text-slate-400 leading-none">${escMap(eq.slotLabel)}</div>
                      <div class="text-[11px] font-black text-white truncate mt-0.5">${escMap(eq.item.name || eq.slotLabel)}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  modal.querySelector('#btnCloseFriendScoutingCard')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    modal.classList.add('hidden');
  });

  const stageEl = modal.querySelector('#friendScoutingSkaterStage');
  if (stageEl) {
    renderCustomizableSkater(stageEl, friendData, {
      angleDeg: 0,
      showLoadoutDock: true,
      showGearOnSkater: true
    });
  }

  return modal;
}

/**
 * Deterministic Screen-Space Label Placement Solver so dense clusters
 * (`NYR, NYI, NJD, PHI, BOS, MTL, TOR, OTT, BUF`) never overlap at any zoom!
 */
function solveNonOverlappingLabels(cities, zoom = 1.0) {
  const z = Math.max(1.0, Number(zoom) || 1.0);
  const placedRects = [];
  for (const c of cities) {
    const sx = c.x * z;
    const sy = c.y * z;
    placedRects.push({ x1: sx - 5.5, y1: sy - 5.5, x2: sx + 5.5, y2: sy + 5.5, isNode: true });
  }

  const candidateOffsets = [
    [0, -13], [0, 14], [22, -4], [-22, -4],
    [22, -14], [-22, -14], [22, 14], [-22, 14],
    [34, 2], [-34, 2], [0, -25], [0, 26],
    [38, -13], [-38, -13], [38, 15], [-38, 15],
    [50, -5], [-50, -5], [48, 22], [-48, 22],
    [16, -34], [-16, -34], [18, 34], [-18, 34]
  ];

  const placements = new Map();
  for (const c of cities) {
    const sx = c.x * z;
    const sy = c.y * z;
    const labelText = z >= 2.2 ? `${c.code} • ${c.name}` : c.code;
    const w = labelText.length * 5.2 + 9;
    const h = 12;

    let best = candidateOffsets[0];
    for (const [dx, dy] of candidateOffsets) {
      const lx = sx + dx;
      const ly = sy + dy;
      const rect = {
        x1: lx - w / 2 - 1.5,
        y1: ly - h / 2 - 1.5,
        x2: lx + w / 2 + 1.5,
        y2: ly + h / 2 + 1.5
      };
      const hit = placedRects.some((r) => !(rect.x2 < r.x1 || rect.x1 > r.x2 || rect.y2 < r.y1 || rect.y1 > r.y2));
      if (!hit) {
        best = [dx, dy];
        placedRects.push(rect);
        break;
      }
    }

    placements.set(c.code, {
      dx: best[0],
      dy: best[1],
      labelText,
      pillW: Math.round(w),
      pillH: h,
      needsLeader: Math.hypot(best[0], best[1]) > 19
    });
  }
  return placements;
}

/**
 * Mounts the Interactive Zoomable/Pannable 32-City Illustrated North America NHL Atlas Map into `container`.
 */
export function renderNhlAtlasMap(container, options = {}) {
  const root = typeof container === 'string'
    ? (typeof document !== 'undefined' ? document.getElementById(container) : null)
    : container;
  if (!root) return null;

  const profile = options.profile || (typeof window !== 'undefined' && typeof window.getActiveProfile === 'function' ? window.getActiveProfile() : {}) || {};
  const currentCityIdx = Math.max(0, Math.min(31, Number(options.currentCityIdx ?? profile.currentCityIdx ?? 0)));
  const conqueredSet = new Set(Array.isArray(profile.unlockedCityPatches) ? profile.unlockedCityPatches : []);
  const maxUnlockedIdx = Math.max(currentCityIdx, Number(profile.unlockedCityIdx || 0));

  const connectedFriends = getEffectiveClubhouseFriends(profile);
  const previewSampleOn = isSampleTeammatesPreviewEnabled();

  const youNum = profile.jerseyNumber !== undefined && profile.jerseyNumber !== null && String(profile.jerseyNumber).trim() !== ''
    ? String(profile.jerseyNumber).trim()
    : '9';
  const youCity = NHL_ATLAS_CITIES[currentCityIdx] || NHL_ATLAS_CITIES[0];

  const rawPins = [
    {
      pinId: 'YOU',
      isYou: true,
      badgeText: `YOU • #${youNum}`,
      cityIdx: currentCityIdx,
      city: youCity,
      skaterData: profile
    },
    ...connectedFriends.map((fr, idx) => {
      const fIdx = Math.max(0, Math.min(31, Number(fr.cityStopIdx ?? fr.currentCityIdx ?? 0)));
      const fCity = NHL_ATLAS_CITIES[fIdx] || NHL_ATLAS_CITIES[0];
      const fNum = fr.jerseyNumber !== undefined && fr.jerseyNumber !== null && String(fr.jerseyNumber).trim() !== ''
        ? ` #${fr.jerseyNumber}`
        : '';
      return {
        pinId: String(fr.friendCode || `FRIEND_${idx}`),
        isYou: false,
        badgeText: `${fr.name || 'Teammate'}${fNum}`,
        cityIdx: fIdx,
        city: fCity,
        skaterData: fr
      };
    })
  ];

  // Count per-city stack index so pins at different cities sit neatly right over their own city!
  const cityPinStackCounts = new Map();
  const skaterPins = rawPins.map((sp) => {
    const stackIdx = cityPinStackCounts.get(sp.city.code) || 0;
    cityPinStackCounts.set(sp.city.code, stackIdx + 1);
    return { ...sp, stackIdx };
  });

  let zoom = 1.0;
  let panX = 0;
  let panY = 0;
  let selectedEntity = null;

  const clampPan = () => {
    const maxPanX = 1000 * (zoom - 1);
    const maxPanY = 562 * (zoom - 1);
    panX = Math.min(36 * zoom, Math.max(-maxPanX - 36 * zoom, panX));
    panY = Math.min(28 * zoom, Math.max(-maxPanY - 28 * zoom, panY));
    if (zoom <= 1.02) {
      panX = 0;
      panY = 0;
    }
  };

  root.innerHTML = `
    <div id="nhlAtlasMapRoot" data-nhl-atlas="v155-painted-75-25" class="space-y-2 select-none">
      <!-- Hidden HTML <img> raster probe verifying naturalWidth > 256 -->
      <img src="${PAINTED_NORTH_AMERICA_MAP_URL}" alt="" aria-hidden="true" data-nhl-map-raster="true" class="hidden" />

      <!-- Top Atlas Controls Bar + 1-Tap Sample Teammates Preview Toggle -->
      <div class="flex flex-wrap items-center justify-between gap-2 px-1">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-400/60 text-cyan-200 font-black">
            🗺️ 32-City NHL Head-to-Head Map Race
          </span>
          <span class="text-[11px] font-bold text-slate-300">
            Active Stop: <strong class="text-amber-300">${escMap(youCity.name)} (${escMap(youCity.code)})</strong> • ${conqueredSet.size} / 32 Patches
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            id="btnToggleSampleTeammatesMap"
            data-toggle-sample-teammates="true"
            aria-pressed="${previewSampleOn ? 'true' : 'false'}"
            class="px-2.5 py-1 rounded-lg border text-[11px] font-black transition cursor-pointer ${
              previewSampleOn
                ? 'bg-emerald-400 text-slate-950 border-emerald-200 shadow'
                : 'bg-slate-900 hover:bg-slate-800 border-emerald-400/60 text-emerald-200'
            }"
          >
            👀 Preview Sample Teammates${previewSampleOn ? ': ON' : ''}
          </button>
          <div class="flex items-center gap-1" role="group" aria-label="Atlas Map Zoom Controls">
            <button type="button" id="btnAtlasZoomOut" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-600 text-white text-xs font-black cursor-pointer" title="Zoom Out">−</button>
            <span id="atlasZoomBadge" data-atlas-zoom="1.0" class="px-2.5 py-1 rounded-lg bg-slate-950 border border-cyan-400/70 text-cyan-300 text-xs font-black min-w-[48px] text-center">1.0x</span>
            <button type="button" id="btnAtlasZoomIn" class="px-2.5 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black shadow cursor-pointer" title="Zoom In">+</button>
            <button type="button" id="btnAtlasZoomReset" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-400/60 text-amber-200 text-xs font-black cursor-pointer">Reset</button>
          </div>
        </div>
      </div>

      <!-- Interactive 16:9 Illustrated North America Sports Atlas Viewport -->
      <div id="nhlAtlasViewport" class="relative mx-auto w-full max-w-[692px] h-[310px] sm:h-[389px] rounded-2xl bg-[#05101f] border-2 border-cyan-400/60 overflow-hidden shadow-2xl" style="touch-action: none;">
        <svg id="nhlAtlasSvg" viewBox="0 0 1000 562" preserveAspectRatio="xMidYMid meet" class="w-full h-full block cursor-grab active:cursor-grabbing">
          <rect width="1000" height="562" fill="#05101f"/>

          <g id="nhlAtlasTransformStage" transform="translate(0, 0) scale(1)">
            <!-- Authentic 75/25 Illustrated North America (United States + Canada) Sports Atlas Image -->
            <image
              id="nhlAtlasIllustratedMapImage"
              href="${PAINTED_NORTH_AMERICA_MAP_URL}"
              x="0"
              y="0"
              width="1000"
              height="562"
              preserveAspectRatio="none"
            />

            <!-- Subtle 32-City Tour Route Lines -->
            <g id="nhlAtlasTourRoutes" fill="none">
              ${NHL_ATLAS_CITIES.slice(0, -1).map((c1, idx) => {
                const c2 = NHL_ATLAS_CITIES[idx + 1];
                const done = idx < maxUnlockedIdx;
                return `<line x1="${c1.x}" y1="${c1.y}" x2="${c2.x}" y2="${c2.y}" stroke="${done ? '#22d3ee' : 'rgba(148,163,184,0.34)'}" stroke-width="${done ? '2.0' : '1.1'}" ${done ? '' : 'stroke-dasharray="3.5 3.5"'}/>`;
              }).join('')}
            </g>

            <!-- Dynamic Counter-Scaled 32 NHL City Pins + Head-to-Head Skater Race Pins -->
            <g id="nhlAtlasDynamicPinsLayer"></g>
          </g>
        </svg>

        <!-- Clean Floating City Detail Popover -->
        <div id="nhlAtlasDetailPopover" class="hidden absolute right-2.5 bottom-2.5 left-2.5 sm:left-auto sm:w-80 rounded-2xl bg-[#0b1324]/97 border-2 border-amber-400 p-3 shadow-2xl backdrop-blur-xl z-30"></div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 px-1 sm:pr-32">
        <span>Drag to pan • Pinch, scroll, or tap <strong>+ / −</strong> to zoom up to <strong>4.0x</strong> • Tap any teammate pin to open their <strong>Player Scouting Card</strong>!</span>
        <span data-atlas-connected-count="${connectedFriends.length}" class="text-cyan-300 font-bold shrink-0">${connectedFriends.length} Teammate${connectedFriends.length === 1 ? '' : 's'} on Map</span>
      </div>
    </div>
  `;

  const viewportEl = root.querySelector('#nhlAtlasViewport');
  const svgEl = root.querySelector('#nhlAtlasSvg');
  const stageEl = root.querySelector('#nhlAtlasTransformStage');
  const pinsLayerEl = root.querySelector('#nhlAtlasDynamicPinsLayer');
  const zoomBadgeEl = root.querySelector('#atlasZoomBadge');
  const popoverEl = root.querySelector('#nhlAtlasDetailPopover');

  root.querySelector('#btnToggleSampleTeammatesMap')?.addEventListener('click', () => {
    if (typeof window !== 'undefined' && window.state) {
      window.state.previewSampleTeammates = !window.state.previewSampleTeammates;
    }
    renderNhlAtlasMap(root, options);
  });

  const renderPopover = () => {
    if (!popoverEl) return;
    if (!selectedEntity) {
      popoverEl.classList.add('hidden');
      popoverEl.innerHTML = '';
      return;
    }

    const city = selectedEntity.city;
    const pinsAtCity = skaterPins.filter((p) => p.city.code === city.code);
    const primaryPin = selectedEntity.skaterPin || pinsAtCity[0] || null;
    const isConquered = conqueredSet.has(city.id) || conqueredSet.has(city.code) || city.stopIndex < currentCityIdx;
    const isCurrent = city.stopIndex === currentCityIdx;
    const statusPill = isConquered
      ? '<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-black">✅ Tour Stop Conquered</span>'
      : (isCurrent
          ? '<span class="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-300 text-cyan-200 text-[10px] font-black">📍 Active Tour Stop</span>'
          : `<span class="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-[10px] font-black">City ${city.stopNumber} of 32</span>`);

    popoverEl.classList.remove('hidden');
    popoverEl.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-start justify-between gap-2 border-b border-slate-800 pb-1.5">
          <div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black">${escMap(city.code)}</span>
              <span class="text-xs sm:text-sm font-black text-white">${escMap(city.name)} ${escMap(city.team)}</span>
            </div>
            <div class="text-[10px] font-bold text-slate-300 mt-0.5">City ${city.stopNumber} of 32 (${escMap(city.region)}) • ${escMap(city.focus)}</div>
          </div>
          <button type="button" id="btnCloseAtlasPopover" class="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black cursor-pointer">✕</button>
        </div>
        <div>${statusPill}</div>
        ${primaryPin ? `
          <div class="p-2 rounded-xl bg-slate-950 border border-cyan-400/50 flex items-center gap-2.5" data-atlas-popover-skater="${escMap(primaryPin.pinId)}">
            <div id="nhlAtlasPopoverSkaterPreview" class="w-16 h-24 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 p-1"></div>
            <div class="min-w-0 flex-1 space-y-1">
              <div class="text-xs font-black text-cyan-200">${escMap(primaryPin.badgeText)}</div>
              <div class="text-[10px] font-bold text-slate-300">Division: ${escMap(primaryPin.skaterData.divisionLabel || primaryPin.skaterData.ageGroup || '12U')}</div>
              <div class="text-[10px] font-black text-emerald-300">Hockey IQ: ${Number(primaryPin.skaterData.iqScore || 0)}</div>
              ${!primaryPin.isYou ? `
                <button type="button" id="btnPopoverOpenScoutingCard" class="mt-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black cursor-pointer">
                  🔍 Scouting Card
                </button>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    popoverEl.querySelector('#btnCloseAtlasPopover')?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      selectedEntity = null;
      renderPopover();
    });

    popoverEl.querySelector('#btnPopoverOpenScoutingCard')?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (primaryPin && !primaryPin.isYou) {
        openFriendScoutingCardModal(primaryPin.skaterData);
      }
    });

    if (primaryPin) {
      const mount = popoverEl.querySelector('#nhlAtlasPopoverSkaterPreview');
      if (mount) {
        renderCustomizableSkater(mount, primaryPin.skaterData, {
          angleDeg: 0,
          showDragHint: false,
          compactRear: true
        });
      }
    }
  };

  const renderPinsAndTransform = () => {
    clampPan();
    const invScale = 1 / zoom;

    if (stageEl) {
      stageEl.setAttribute('transform', `translate(${panX.toFixed(1)}, ${panY.toFixed(1)}) scale(${zoom.toFixed(3)})`);
    }
    if (zoomBadgeEl) {
      zoomBadgeEl.textContent = `${zoom.toFixed(1)}x`;
      zoomBadgeEl.setAttribute('data-atlas-zoom', zoom.toFixed(1));
    }

    const placements = solveNonOverlappingLabels(NHL_ATLAS_CITIES, zoom);

    if (pinsLayerEl) {
      const citiesSvg = NHL_ATLAS_CITIES.map((city) => {
        const pl = placements.get(city.code);
        const isCurrent = city.stopIndex === currentCityIdx;
        const isConquered = conqueredSet.has(city.id) || conqueredSet.has(city.code) || city.stopIndex < currentCityIdx;
        const isSelected = selectedEntity && selectedEntity.city && selectedEntity.city.code === city.code;

        const dotFill = isCurrent ? '#22d3ee' : (isConquered ? '#10b981' : '#0f172a');
        const dotStroke = isSelected ? '#facc15' : (isCurrent ? '#ffffff' : (isConquered ? '#6ee7b7' : '#38bdf8'));
        const dotR = isCurrent ? 5.4 : (isSelected ? 5.0 : 4.0);

        return `
          <g class="nhl-atlas-city-pin cursor-pointer" data-nhl-city-code="${city.code}" data-nhl-city-name="${escMap(city.name)}" transform="translate(${city.x}, ${city.y}) scale(${invScale.toFixed(4)})">
            ${pl.needsLeader ? `<line x1="0" y1="0" x2="${pl.dx}" y2="${pl.dy}" stroke="rgba(125,211,252,0.65)" stroke-width="1.0"/>` : ''}
            ${isCurrent ? `<circle cx="0" cy="0" r="9.8" fill="rgba(34,211,238,0.22)" stroke="#22d3ee" stroke-width="1.2" stroke-dasharray="2.5 2"/>` : ''}
            <circle cx="0" cy="0" r="${dotR}" fill="${dotFill}" stroke="${dotStroke}" stroke-width="1.6"/>
            <g data-city-label-box="${city.code}" transform="translate(${pl.dx}, ${pl.dy})">
              <rect x="${-pl.pillW / 2}" y="${-pl.pillH / 2}" width="${pl.pillW}" height="${pl.pillH}" rx="3.5" fill="${isCurrent ? '#083344' : 'rgba(9,15,28,0.94)'}" stroke="${isCurrent ? '#22d3ee' : (isConquered ? '#10b981' : 'rgba(56,189,248,0.55)')}" stroke-width="0.95"/>
              <text x="0" y="3" fill="${isCurrent ? '#67e8f9' : '#f8fafc'}" font-family="Inter, Segoe UI, sans-serif" font-size="7.8" font-weight="900" text-anchor="middle">${escMap(pl.labelText)}</text>
            </g>
          </g>
        `;
      }).join('');

      const skatersSvg = skaterPins.map((sp) => {
        const offsetY = -24 - (sp.stackIdx || 0) * 18;
        const pillW = Math.max(62, sp.badgeText.length * 5.8 + 16);
        const borderCol = sp.isYou ? '#fbbf24' : '#34d399';
        const bgCol = sp.isYou ? '#451a03' : '#064e3b';
        const txtCol = sp.isYou ? '#fef08a' : '#a7f3d0';
        return `
          <g
            class="nhl-atlas-skater-pin cursor-pointer"
            data-atlas-skater-pin="${escMap(sp.pinId)}"
            data-atlas-is-friend="${sp.isYou ? 'false' : 'true'}"
            transform="translate(${sp.city.x}, ${sp.city.y}) scale(${invScale.toFixed(4)})"
          >
            <line x1="0" y1="-4" x2="0" y2="${offsetY + 7}" stroke="${borderCol}" stroke-width="1.8"/>
            <rect x="${-pillW / 2}" y="${offsetY - 8}" width="${pillW}" height="16" rx="8" fill="${bgCol}" stroke="${borderCol}" stroke-width="1.5"/>
            <text x="0" y="${offsetY + 3.0}" fill="${txtCol}" font-family="Inter, Segoe UI, sans-serif" font-size="8.3" font-weight="900" text-anchor="middle">${escMap(sp.badgeText)}</text>
          </g>
        `;
      }).join('');

      pinsLayerEl.innerHTML = citiesSvg + skatersSvg;

      pinsLayerEl.querySelectorAll('.nhl-atlas-city-pin').forEach((node) => {
        node.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (wasPanned) return;
          const code = node.getAttribute('data-nhl-city-code');
          const foundCity = NHL_ATLAS_CITIES.find((c) => c.code === code);
          if (!foundCity) return;
          const matchingSkater = skaterPins.find((p) => p.city.code === code) || null;
          selectedEntity = { type: 'city', city: foundCity, skaterPin: matchingSkater };
          renderPinsAndTransform();
          renderPopover();
        });
      });

      pinsLayerEl.querySelectorAll('.nhl-atlas-skater-pin').forEach((node) => {
        node.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (wasPanned) return;
          const pid = node.getAttribute('data-atlas-skater-pin');
          const foundSkater = skaterPins.find((p) => p.pinId === pid);
          if (!foundSkater) return;
          if (!foundSkater.isYou) {
            openFriendScoutingCardModal(foundSkater.skaterData);
            return;
          }
          selectedEntity = { type: 'skater', city: foundSkater.city, skaterPin: foundSkater };
          renderPinsAndTransform();
          renderPopover();
        });
      });
    }
  };

  const zoomAroundPoint = (nextZoom, focalSvgX = 500, focalSvgY = 281) => {
    const clamped = Math.max(1.0, Math.min(4.0, Math.round(nextZoom * 100) / 100));
    if (Math.abs(clamped - zoom) < 0.001) return;
    const worldX = (focalSvgX - panX) / zoom;
    const worldY = (focalSvgY - panY) / zoom;
    zoom = clamped;
    panX = focalSvgX - worldX * zoom;
    panY = focalSvgY - worldY * zoom;
    renderPinsAndTransform();
  };

  root.querySelector('#btnAtlasZoomIn')?.addEventListener('click', () => {
    const fx = zoom < 1.2 ? 690 : 500;
    const fy = zoom < 1.2 ? 255 : 281;
    zoomAroundPoint(zoom + 0.75, fx, fy);
  });

  root.querySelector('#btnAtlasZoomOut')?.addEventListener('click', () => {
    zoomAroundPoint(zoom - 0.75, 500, 281);
  });

  root.querySelector('#btnAtlasZoomReset')?.addEventListener('click', () => {
    zoom = 1.0;
    panX = 0;
    panY = 0;
    renderPinsAndTransform();
  });

  const activePointers = new Map();
  let dragPrev = null;
  let pinchStartDist = null;
  let pinchStartZoom = 1.0;
  let wasPanned = false;

  const clientToSvgCoords = (clientX, clientY) => {
    if (!svgEl) return [500, 281];
    const rect = svgEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return [500, 281];
    return [
      ((clientX - rect.left) / rect.width) * 1000,
      ((clientY - rect.top) / rect.height) * 562
    ];
  };

  svgEl?.addEventListener('pointerdown', (ev) => {
    activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    wasPanned = false;
    if (activePointers.size === 1) {
      dragPrev = { x: ev.clientX, y: ev.clientY };
    } else if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStartZoom = zoom;
    }
  });

  svgEl?.addEventListener('pointermove', (ev) => {
    if (!activePointers.has(ev.pointerId)) return;
    activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    if (activePointers.size === 2 && pinchStartDist > 10) {
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const [sx, sy] = clientToSvgCoords(midX, midY);
      wasPanned = true;
      zoomAroundPoint(pinchStartZoom * (dist / pinchStartDist), sx, sy);
      return;
    }

    if (activePointers.size === 1 && dragPrev) {
      const dxPx = ev.clientX - dragPrev.x;
      const dyPx = ev.clientY - dragPrev.y;
      if (Math.hypot(dxPx, dyPx) > 4) {
        wasPanned = true;
        const rect = svgEl.getBoundingClientRect();
        const scaleSvgX = rect.width ? 1000 / rect.width : 1;
        const scaleSvgY = rect.height ? 562 / rect.height : 1;
        panX += dxPx * scaleSvgX;
        panY += dyPx * scaleSvgY;
        dragPrev = { x: ev.clientX, y: ev.clientY };
        renderPinsAndTransform();
      }
    }
  });

  const clearPointer = (ev) => {
    activePointers.delete(ev.pointerId);
    if (activePointers.size < 2) pinchStartDist = null;
    if (activePointers.size === 0) {
      dragPrev = null;
      setTimeout(() => { wasPanned = false; }, 40);
    }
  };
  svgEl?.addEventListener('pointerup', clearPointer);
  svgEl?.addEventListener('pointercancel', clearPointer);
  svgEl?.addEventListener('pointerleave', clearPointer);

  viewportEl?.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const [sx, sy] = clientToSvgCoords(ev.clientX, ev.clientY);
    const delta = ev.deltaY < 0 ? 0.35 : -0.35;
    zoomAroundPoint(zoom + delta, sx, sy);
  }, { passive: false });

  renderPinsAndTransform();
  renderPopover();

  const controller = {
    getZoom: () => zoom,
    setZoom: (z, fx = 690, fy = 255) => zoomAroundPoint(z, fx, fy),
    resetView: () => {
      zoom = 1.0;
      panX = 0;
      panY = 0;
      renderPinsAndTransform();
    },
    getCities: () => NHL_ATLAS_CITIES,
    getSkaterPins: () => skaterPins
  };

  if (typeof window !== 'undefined') {
    window._activeNhlAtlasController = controller;
  }
  return controller;
}

const SynapzNhlAtlasMap = {
  PAINTED_NORTH_AMERICA_MAP_URL,
  NHL_ATLAS_CITIES,
  SAMPLE_TEAMMATES_ROSTER,
  isSampleTeammatesPreviewEnabled,
  getEffectiveClubhouseFriends,
  openFriendScoutingCardModal,
  projectNorthAmericaLatLon,
  renderNhlAtlasMap
};

if (typeof window !== 'undefined') {
  window.SynapzNhlAtlasMap = SynapzNhlAtlasMap;
  window.renderNhlAtlasMap = renderNhlAtlasMap;
  window.openFriendScoutingCardModal = openFriendScoutingCardModal;
  window.getEffectiveClubhouseFriends = getEffectiveClubhouseFriends;
}

export default SynapzNhlAtlasMap;
