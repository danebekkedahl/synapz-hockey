/**
 * SYNAPZ HOCKEY v15.6 — Standalone Red-Flag Bug-Sniping System (`engine/red_flag_system.js`)
 * ==========================================================================================
 * 8-Law Studio Constitution & iPadOS 15.8.8 (Safari 15.6 / iPad Air 2) Safe:
 *  - Unified Bottom-Right `🚩 Flag` Pill (`z-index: 2147483640`) w/ Smooth 4-Corner Snap Drag
 *  - Auto-Pause / Resume of Active Drills & 12s Chalk-Talk Video Reels (`window.__synapzRedFlagPaused`)
 *  - Zero-Dependency Composite `640x440` JPEG Snapshot (`<= 42 KB`) + Optional `📷 Attach Photo`
 *  - `🎯 Tap Exact Spot on Screen` Live Element Picker (`elementFromPoint` + `(xPct, yPct)` Bullseye Pin)
 *  - Sticky Author (`Coach Dane | Coach Evan | Whelan | Rhett | Tester`) & Intent Guardrail Pills
 *  - `🎙️ Dictate` Web Speech Transcription + Safari 15 Keyboard Mic Tip Fallback (`0` console errors)
 *  - Verified Live Supabase `public.pucksense_agent_inbox` Round-Trip + Offline Outbox (`synapz_redflag_outbox`)
 */
(function initSynapzRedFlagSystemV156() {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.SynapzRedFlagSystem && window.SynapzRedFlagSystem.__version === 'v15.6') return;

  var APP_VERSION = 'v15.6';
  var SUPABASE_REST_URL = 'https://jrusjgpfcnptozfehcrv.supabase.co/rest/v1/pucksense_agent_inbox';
  var SUPABASE_ANON_KEY = 'sb_publishable_73207-0o-_PJEGLgeiZSog__PwUgTxX';

  var STORAGE_CORNER_KEY = 'synapz_redflag_corner';
  var STORAGE_AUTHOR_KEY = 'synapz_redflag_author';
  var STORAGE_INTENT_KEY = 'synapz_redflag_intent';
  var STORAGE_OUTBOX_KEY = 'synapz_redflag_outbox';
  var LEGACY_OUTBOX_KEY = 'synapz_offline_redflag_outbox_v142';
  var TEST_SESSION_SINK_KEY = 'synapz_test_redflag_sink';

  var SNAPSHOT_WIDTH = 640;
  var SNAPSHOT_HEIGHT = 440;
  var MAX_SNAPSHOT_BYTES = 41500; // Strictly <= 42 KB (43,008 B)

  var AUTHORS = ['Coach Dane', 'Coach Evan', 'Whelan', 'Rhett', 'Tester'];
  var INTENTS = [
    { id: 'bug', label: '🐛 Little Bug / Glitch', shortBadge: '🐛 Bug / Glitch' },
    { id: 'keep_style_tweak', label: '🎨 Keep Look — Only Tweak Detail', shortBadge: '🎨 KEEP LOOK — TWEAK ONLY' },
    { id: 'copy_audio', label: '📝 Wording / Audio', shortBadge: '📝 Wording / Audio' },
    { id: 'idea', label: '💡 Feature Idea', shortBadge: '💡 Feature Idea' }
  ];
  var VALID_CORNERS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];

  var internalState = {
    isOpen: false,
    isPointMode: false,
    corner: readSafeStorage(STORAGE_CORNER_KEY, 'bottom-right'),
    author: readSafeStorage(STORAGE_AUTHOR_KEY, 'Coach Dane'),
    intentTag: readSafeStorage(STORAGE_INTENT_KEY, 'bug'),
    pin: { xPct: 50.0, yPct: 50.0 },
    domTarget: null,
    snapshotDataUrl: '',
    snapshotBytes: 0,
    capturedContext: null,
    pausedV14: false,
    pausedLegacy: false,
    lastDragEndAt: 0,
    speechRec: null,
    isListening: false,
    lastSubmittedRow: null
  };

  if (VALID_CORNERS.indexOf(internalState.corner) === -1) internalState.corner = 'bottom-right';
  if (AUTHORS.indexOf(internalState.author) === -1) internalState.author = 'Coach Dane';
  if (!getIntentMeta(internalState.intentTag)) internalState.intentTag = 'bug';

  if (!Array.isArray(window.__synapzTestRedFlagSink)) {
    window.__synapzTestRedFlagSink = loadTestSessionSink();
  }
  window.__synapzRedFlagPaused = false;
  window._selectedRedFlagQuickTag = '';

  function readSafeStorage(key, fallback) {
    try {
      var val = window.localStorage ? window.localStorage.getItem(key) : null;
      return val ? String(val) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeSafeStorage(key, value) {
    try {
      if (window.localStorage) window.localStorage.setItem(key, String(value));
    } catch (_) {}
  }

  function loadTestSessionSink() {
    try {
      var raw = window.sessionStorage ? window.sessionStorage.getItem(TEST_SESSION_SINK_KEY) : null;
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveTestSessionSink(rows) {
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(TEST_SESSION_SINK_KEY, JSON.stringify(Array.isArray(rows) ? rows.slice(0, 40) : []));
      }
    } catch (_) {}
  }

  function generateUuidV4() {
    if (typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function') {
      try { return window.crypto.randomUUID(); } catch (_) {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });
  }

  function getIntentMeta(intentId) {
    for (var i = 0; i < INTENTS.length; i++) {
      if (INTENTS[i].id === intentId) return INTENTS[i];
    }
    return null;
  }

  function estimateDataUrlBytes(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return 0;
    var commaIdx = dataUrl.indexOf(',');
    var b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    return Math.ceil((b64.length * 3) / 4);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // =========================================================================
  // 1. DEVICE & LIVE APP CONTEXT DETECTION (100% OF SCREENS, ROOMS & MODALS)
  // =========================================================================
  function collectDeviceInfo() {
    var w = Math.round(window.innerWidth || 0);
    var h = Math.round(window.innerHeight || 0);
    var viewport = w + 'x' + h;
    var ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
    var maxTouch = (typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints)) ? Number(navigator.maxTouchPoints) : 0;

    var dev = 'Desktop';
    var osVersion = 'Desktop OS';

    var iosVerMatch = ua.match(/OS (\d+[._]\d+(?:[._]\d+)?)/i);
    var verNum = iosVerMatch ? iosVerMatch[1].replace(/_/g, '.') : '';

    if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouch > 1)) {
      dev = 'iPad';
      osVersion = verNum ? ('iPadOS ' + verNum) : (window.__SAFARI15_PRE_DELETE_RAN__ ? 'iPadOS 15.8.8' : 'iPadOS');
    } else if (/iPhone/i.test(ua)) {
      dev = 'iPhone';
      osVersion = verNum ? ('iOS ' + verNum) : 'iOS';
    } else if (/Android/i.test(ua)) {
      dev = /Pixel/i.test(ua) ? 'Pixel' : 'Android';
      var andMatch = ua.match(/Android\s+([0-9.]+)/i);
      osVersion = andMatch ? ('Android ' + andMatch[1]) : 'Android';
    } else if (/Windows NT/i.test(ua)) {
      osVersion = 'Windows';
      if (w > 0 && w <= 480) dev = 'Phone';
      else if (w >= 700 && w <= 1220 && window.__SAFARI15_PRE_DELETE_RAN__) {
        dev = 'iPad';
        osVersion = 'iPadOS 15.8.8';
      }
    } else if (/Mac OS X/i.test(ua)) {
      osVersion = 'macOS';
    }

    var browser = 'Browser';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/CriOS|Chrome\//i.test(ua) && !window.__SAFARI15_PRE_DELETE_RAN__) browser = 'Chrome';
    else if (/FxiOS|Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/Safari\//i.test(ua) || window.__SAFARI15_PRE_DELETE_RAN__) {
      var safMatch = ua.match(/Version\/([0-9.]+)/i);
      browser = safMatch ? ('Safari ' + safMatch[1]) : (window.__SAFARI15_PRE_DELETE_RAN__ ? 'Safari 15.6' : 'Safari');
    }

    return {
      osVersion: osVersion,
      browser: browser,
      viewport: viewport,
      deviceLabel: dev + ' ' + w + '×' + h,
      userAgentShort: osVersion + ' • ' + browser + ' (' + viewport + ')',
      appVersion: APP_VERSION
    };
  }

  function isElementVisible(el) {
    if (!el || el.classList.contains('hidden')) return false;
    var st = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (st && (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity || '1') <= 0.01)) return false;
    var r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }

  function getCleanText(el, maxLen) {
    if (!el) return '';
    var txt = String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    return maxLen ? txt.slice(0, maxLen) : txt;
  }

  function detectOpenModalTitle() {
    var subModals = [
      { id: 'v14CoachPreviewAll5Drawer', titleId: 'v14CoachPreviewAll5Title', fallback: 'Preview All 5 Plays' },
      { id: 'synapzPrintSheetOverlay', titleId: '', fallback: 'Printable Station Deck' },
      { id: 'coachOfficeOverlaySheet', titleId: 'coachOfficeDrawerHeaderTitle', fallback: "Coach's Office Station" },
      { id: 'proShopRackOverlaySheet', titleId: '', fallback: 'Pro Shop Gear Rack' },
      { id: 'lockerEquipmentBagSheet', titleId: 'lockerEquipmentBagCountLabel', fallback: 'Personal Equipment Bag' },
      { id: 'lockerEditProfileSheet', titleId: '', fallback: 'Edit Player Profile' },
      { id: 'clubhouseOverlaySheet', titleId: 'clubhouseDrawerHeaderTitle', fallback: 'Clubhouse Feature' },
      { id: 'playerAgentPickerModal', titleId: '', fallback: 'Choose Player Agent' },
      { id: 'playerTeamRosterHubModal', titleId: '', fallback: 'Player Team Roster Hub' },
      { id: 'associationMasterHqModal', titleId: 'assocHqClubTitle', fallback: 'Association Master HQ' },
      { id: 'pilotSandboxCheckoutModal', titleId: 'pilotCheckoutTitleText', fallback: 'Pilot Sandbox Checkout' },
      { id: 'synapzNet30PoModal', titleId: '', fallback: 'Net-30 Club PO / Invoice' },
      { id: 'synapzInstallPwaModal', titleId: '', fallback: 'Install Offline App' },
      { id: 'pricingAndPlansModal', titleId: '', fallback: 'Membership & Plans' },
      { id: 'successStoriesModal', titleId: '', fallback: 'Partner Clubs & Reviews' },
      { id: 'founderDigestModal', titleId: '', fallback: 'Co-Founder Advisory Digest' },
      { id: 'synapzGuestSpeedModal', titleId: '', fallback: 'Try 3 Plays Free — Speed' },
      { id: 'safeSportNotificationModal', titleId: '', fallback: 'SafeSport Notifications' },
      { id: 'videoExampleModal', titleId: 'videoModalTitle', fallback: 'Film Breakdown' },
      { id: 'reportModal', titleId: 'reportPlayerHeader', fallback: 'Player IQ Scouting Card' },
      { id: 'tutorialModal', titleId: 'tutorialSlideTitle', fallback: 'Quick Tutorial' },
      { id: 'cityIntroModal', titleId: 'cityIntroHeadline', fallback: 'NHL City Intro' }
    ];

    for (var i = 0; i < subModals.length; i++) {
      var m = subModals[i];
      var el = document.getElementById(m.id);
      if (isElementVisible(el)) {
        if (m.id === 'proShopRackOverlaySheet') {
          var activeShopCat = el.querySelector('.shop-cat-btn.bg-cyan-500, .shop-cat-btn.bg-amber-400');
          var catName = activeShopCat ? getCleanText(activeShopCat, 40) : '';
          return catName ? ('Pro Shop — ' + catName) : m.fallback;
        }
        if (m.titleId) {
          var tEl = document.getElementById(m.titleId);
          var tStr = getCleanText(tEl, 64);
          if (tStr) return tStr;
        }
        return m.fallback;
      }
    }

    // Check Friend Scouting Card modal if dynamically mounted
    var friendCard = document.getElementById('synapzFriendScoutingModal') || document.querySelector('[data-friend-scouting-modal]:not(.hidden)');
    if (friendCard && isElementVisible(friendCard)) {
      return 'Friend Scouting Card';
    }

    return null;
  }

  function detectScreenAndRoom() {
    // 1) Check 5 full-screen rooms first
    var roomChecks = [
      { id: 'synapzLockerRoomModal', screen: 'Locker Room', room: 'locker_room' },
      { id: 'proShopModal', screen: 'Pro Shop', room: 'pro_shop' },
      { id: 'synapzCoachOfficeModal', screen: "Coach's Office", room: 'coaches_office' },
      { id: 'coachPortalModal', screen: "Head Coach's Office", room: 'head_coach_office' },
      { id: 'synapzFriendsWallModal', screen: 'Clubhouse', room: 'clubhouse' }
    ];
    for (var i = 0; i < roomChecks.length; i++) {
      var rc = roomChecks[i];
      var rEl = document.getElementById(rc.id);
      if (isElementVisible(rEl)) {
        return { screen: rc.screen, activeRoom: rc.room };
      }
    }

    // 2) Check V14 engine live context (Chalk-Talk Reel, Active Drill, Showdown, Catalog)
    var v14Ctx = (window.SynapzV14Engine && typeof window.SynapzV14Engine.getLiveRedFlagContext === 'function')
      ? window.SynapzV14Engine.getLiveRedFlagContext()
      : null;
    if (v14Ctx && v14Ctx.activeScreen) {
      return { screen: v14Ctx.activeScreen, activeRoom: 'ice_rink', v14Ctx: v14Ctx };
    }

    // 3) Check Entry Portal Gate & Setup screens (Screen 1, Info, Coach/Player Login/Signup, Setup Step 1 & Step 2)
    var sandboxModal = document.getElementById('sandboxLoginModal');
    if (document.body.classList.contains('synapz-entry-gate-active') || isElementVisible(sandboxModal)) {
      var entryMap = [
        { id: 'entryScreen1CInfo', label: 'Info Modal' },
        { id: 'entryScreen1A1PlayerGate', label: 'Players Portal' },
        { id: 'entryScreen1A2PlayerCreate', label: 'Player Signup' },
        { id: 'entryScreen1A3PlayerLogin', label: 'Player Login' },
        { id: 'entryScreen1B1CoachGate', label: 'Coaches Portal' },
        { id: 'entryScreen1B2CoachCreate', label: 'Coach Signup' },
        { id: 'entryScreen1B3CoachLogin', label: 'Coach Login' }
      ];
      for (var j = 0; j < entryMap.length; j++) {
        if (isElementVisible(document.getElementById(entryMap[j].id))) {
          return { screen: entryMap[j].label, activeRoom: null };
        }
      }
      var setupRoot = document.getElementById('entryScreen1A4SlotSetup');
      if (isElementVisible(setupRoot)) {
        var step2 = document.getElementById('slotSetupStep2StockAvatar');
        if (isElementVisible(step2)) {
          return { screen: 'Player Setup — Step 2 (Build Your Skater)', activeRoom: null };
        }
        return { screen: 'Player Setup — Step 1 (Choose Your Agent)', activeRoom: null };
      }
      if (isElementVisible(document.getElementById('synapzGuestSpeedModal'))) {
        return { screen: 'Try 3 Plays Free — Speed Picker', activeRoom: null };
      }
      return { screen: 'Screen 1 — Welcome Portal', activeRoom: null };
    }

    // 4) Tour Map or Legacy Rink or Main Rink Lobby
    if (isElementVisible(document.getElementById('nhlTourMapSection'))) {
      return { screen: '32-City NHL Tour Map', activeRoom: 'tour_map' };
    }
    if (window.state && window.state.view === 'game') {
      return { screen: 'Ice Rink', activeRoom: 'ice_rink' };
    }
    return { screen: 'Main Rink Lobby', activeRoom: 'rink_lobby' };
  }

  function captureLiveRedFlagMetadata() {
    var prof = (typeof window.getActiveProfile === 'function' ? window.getActiveProfile() : null) || {};
    var sr = detectScreenAndRoom();
    var openModalTitle = detectOpenModalTitle();
    var v14Ctx = sr.v14Ctx || ((window.SynapzV14Engine && typeof window.SynapzV14Engine.getLiveRedFlagContext === 'function')
      ? window.SynapzV14Engine.getLiveRedFlagContext()
      : null);

    var isRoomActive = Boolean(sr.activeRoom && sr.activeRoom !== 'ice_rink');
    var scen = (!v14Ctx && !isRoomActive && window.state && window.state.view === 'game' && typeof window.getCurrentScenario === 'function')
      ? window.getCurrentScenario()
      : null;

    var activeDrillId = (!isRoomActive && v14Ctx && v14Ctx.drillId) || (scen && scen.id) || null;
    var catalogDrillId = (!isRoomActive && v14Ctx && v14Ctx.catalogDrillId) || null;
    var drillTitle = (!isRoomActive && v14Ctx && v14Ctx.drillTitle) || (scen && scen.title) || null;
    var activeMode = (!isRoomActive && v14Ctx && v14Ctx.gameMode) || (scen ? 'legacy_rink' : null);
    var stage = (!isRoomActive && v14Ctx && v14Ctx.stage) || null;

    var youAreBadge = document.getElementById('v14TunnelYouAreBadge');
    var hudRole = '';
    if (youAreBadge && isElementVisible(youAreBadge)) {
      var mRole = getCleanText(youAreBadge, 32).match(/YOU\s*ARE:\s*([A-Z0-9]+)/i);
      if (mRole) hudRole = mRole[1].toUpperCase();
    }
    var youAreRole = (!isRoomActive && (hudRole || (v14Ctx && v14Ctx.positionRole))) || prof.positionCode || null;

    var guestTier = (window.__synapzGuestDemoSession && window.__synapzGuestDemoSession.active)
      ? window.__synapzGuestDemoSession.tier
      : null;
    var ageTier = prof.ageGroup || prof.divisionLabel || (guestTier === 'youth' ? '10U' : (guestTier ? '14U' : '12U'));
    var devInfo = collectDeviceInfo();

    var appContext = {
      screen: sr.screen,
      activeRoom: sr.activeRoom || null,
      openModalTitle: openModalTitle || null,
      activeDrillId: activeDrillId || null,
      activeMode: activeMode || null,
      youAreRole: youAreRole || null,
      stage: stage || null,
      ageDivision: ageTier
    };

    return {
      drillId: activeDrillId,
      catalogDrillId: catalogDrillId,
      drillTitle: drillTitle,
      gameMode: activeMode,
      stage: stage,
      activeScreen: openModalTitle ? (sr.screen + ' / ' + openModalTitle) : sr.screen,
      positionRole: youAreRole || 'C',
      ageTier: ageTier,
      viewport: devInfo.viewport,
      deviceLabel: devInfo.deviceLabel,
      userAgentShort: devInfo.userAgentShort,
      deviceInfo: devInfo,
      appContext: appContext
    };
  }

  // =========================================================================
  // 2. ZERO-DEPENDENCY COMPOSITE VIEWPORT SNAPSHOT (`<= 42 KB` JPEG, SAFARI 15 SAFE)
  // =========================================================================
  function isRedFlagInternalElement(el) {
    if (!el) return false;
    if (
      el.id === 'btnPersistentFounderRedFlag' ||
      el.id === 'founderRedFlagModal' ||
      el.id === 'synapzRedFlagPointBanner' ||
      el.id === 'founderRedFlagGlobalToast'
    ) {
      return true;
    }
    if (typeof el.closest === 'function') {
      return Boolean(el.closest('#founderRedFlagModal, #synapzRedFlagPointBanner, #btnPersistentFounderRedFlag, #founderRedFlagGlobalToast'));
    }
    return false;
  }

  function drawRoundedRectSafe(ctx, x, y, w, h, r) {
    var radius = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function isNonTransparentBg(bg) {
    if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return false;
    var m = bg.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/i);
    if (m && parseFloat(m[1]) < 0.06) return false;
    return true;
  }

  function captureViewportSnapshot(highlightDomTarget) {
    var vw = Math.max(320, window.innerWidth || 1024);
    var vh = Math.max(240, window.innerHeight || 768);
    var sx = SNAPSHOT_WIDTH / vw;
    var sy = SNAPSHOT_HEIGHT / vh;

    var offCanvas = document.createElement('canvas');
    offCanvas.width = SNAPSHOT_WIDTH;
    offCanvas.height = SNAPSHOT_HEIGHT;
    var ctx = offCanvas.getContext('2d');
    if (!ctx) return '';

    // Base dark arena background
    var grad = ctx.createLinearGradient(0, 0, 0, SNAPSHOT_HEIGHT);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT);

    // Collect visible visual elements in DOM order, grouped lightly by modal overlay elevation
    var candidates = document.querySelectorAll(
      'img, canvas, svg, [id$="Card"], [id$="Modal"] > div, [id$="Sheet"], [id$="Drawer"] > div, #v12EntryGateCard, #v14TunnelVisionHudBar, #v14ModeControlsDock, button, input, select, textarea, h1, h2, h3, [data-locker-cat], .shop-cat-btn'
    );

    var normalItems = [];
    var elevatedItems = [];

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (isRedFlagInternalElement(el)) continue;
      if (!isElementVisible(el)) continue;
      var rect = el.getBoundingClientRect();
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= vw || rect.top >= vh) continue;
      if (rect.width < 4 || rect.height < 4) continue;

      var inOverlay = Boolean(
        el.closest && el.closest(
          '#lockerEquipmentBagSheet, #lockerEditProfileSheet, #proShopRackOverlaySheet, #coachOfficeOverlaySheet, #v14CoachPreviewAll5Drawer, #clubhouseOverlaySheet, #pilotSandboxCheckoutModal, #pricingAndPlansModal, #playerAgentPickerModal, #v14CatalogDrawerMount, #v14GlobalShowdownMount'
        )
      );
      var item = { el: el, rect: rect, tag: el.tagName.toLowerCase() };
      if (inOverlay) elevatedItems.push(item);
      else normalItems.push(item);
    }

    function renderItemBatch(batch, dimBackdropFirst) {
      if (dimBackdropFirst && batch.length > 0) {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.52)';
        ctx.fillRect(0, 0, SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT);
      }
      for (var k = 0; k < batch.length; k++) {
        var it = batch[k];
        var el = it.el;
        var r = it.rect;
        var dx = r.left * sx;
        var dy = r.top * sy;
        var dw = r.width * sx;
        var dh = r.height * sy;

        if (it.tag === 'img') {
          if (el.complete && el.naturalWidth > 0) {
            try {
              var stImg = window.getComputedStyle(el);
              if (stImg && stImg.objectFit === 'contain') {
                var imgRatio = el.naturalWidth / el.naturalHeight;
                var boxRatio = dw / dh;
                var drawW = dw;
                var drawH = dh;
                if (imgRatio > boxRatio) {
                  drawH = dw / imgRatio;
                } else {
                  drawW = dh * imgRatio;
                }
                ctx.drawImage(el, dx + (dw - drawW) / 2, dy + (dh - drawH) / 2, drawW, drawH);
              } else {
                ctx.drawImage(el, dx, dy, dw, dh);
              }
            } catch (_) {}
          }
          continue;
        }

        if (it.tag === 'canvas') {
          if (el.width > 0 && el.height > 0) {
            try {
              ctx.drawImage(el, dx, dy, dw, dh);
            } catch (_) {}
          }
          continue;
        }

        if (it.tag === 'svg') {
          ctx.save();
          drawRoundedRectSafe(ctx, dx, dy, dw, dh, 6);
          ctx.fillStyle = '#f8fafc';
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          // Draw center & blue lines hint if it's a hockey diagram SVG
          if (dw > 40 && dh > 22) {
            ctx.strokeStyle = 'rgba(220, 38, 38, 0.65)';
            ctx.beginPath();
            ctx.moveTo(dx + dw * 0.5, dy + 2);
            ctx.lineTo(dx + dw * 0.5, dy + dh - 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(37, 99, 235, 0.65)';
            ctx.beginPath();
            ctx.moveTo(dx + dw * 0.32, dy + 2);
            ctx.lineTo(dx + dw * 0.32, dy + dh - 2);
            ctx.moveTo(dx + dw * 0.68, dy + 2);
            ctx.lineTo(dx + dw * 0.68, dy + dh - 2);
            ctx.stroke();
          }
          ctx.restore();
          continue;
        }

        var st = window.getComputedStyle ? window.getComputedStyle(el) : null;
        if (!st) continue;

        var bg = st.backgroundColor;
        var bCol = st.borderTopColor;
        var bWidth = parseFloat(st.borderTopWidth || '0');
        var hasBg = isNonTransparentBg(bg) || (st.backgroundImage && st.backgroundImage.indexOf('gradient') !== -1);

        if (hasBg || bWidth >= 1) {
          ctx.save();
          drawRoundedRectSafe(ctx, dx, dy, dw, dh, Math.min(10, parseFloat(st.borderTopLeftRadius || '6') * sx));
          if (st.backgroundImage && st.backgroundImage.indexOf('gradient') !== -1 && !isNonTransparentBg(bg)) {
            ctx.fillStyle = it.tag === 'button' ? '#0ea5e9' : 'rgba(15, 23, 42, 0.94)';
            ctx.fill();
          } else if (isNonTransparentBg(bg)) {
            ctx.fillStyle = bg;
            ctx.fill();
          }
          if (bWidth >= 1 && isNonTransparentBg(bCol)) {
            ctx.strokeStyle = bCol;
            ctx.lineWidth = Math.max(1, Math.min(2, bWidth * sx));
            ctx.stroke();
          }
          ctx.restore();
        }

        // Draw crisp single-line label for interactive controls & headings
        if (it.tag === 'button' || it.tag === 'input' || it.tag === 'select' || it.tag === 'textarea' || /^h[123]$/.test(it.tag)) {
          var label = '';
          if (it.tag === 'input' || it.tag === 'textarea') {
            label = el.type === 'password' && el.value ? '••••••' : (el.value || el.placeholder || '');
          } else if (it.tag === 'select') {
            var opt = el.options && el.options[el.selectedIndex];
            label = opt ? opt.text : '';
          } else {
            // Skip huge multi-child buttons if they contain nested canvas/img already drawn, unless short label
            label = getCleanText(el, 44);
          }
          if (label && dh >= 10 && dw >= 18) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(dx + 2, dy + 1, Math.max(0, dw - 4), Math.max(0, dh - 2));
            ctx.clip();
            var fontPx = Math.max(8, Math.min(13, Math.round(parseFloat(st.fontSize || '12') * sy)));
            ctx.font = '700 ' + fontPx + 'px Inter, -apple-system, sans-serif';
            ctx.fillStyle = st.color || '#f8fafc';
            ctx.textBaseline = 'middle';
            var align = st.textAlign === 'center' || it.tag === 'button' ? 'center' : 'left';
            ctx.textAlign = align;
            var tx = align === 'center' ? (dx + dw / 2) : (dx + 6);
            ctx.fillText(label.slice(0, 38), tx, dy + dh / 2);
            ctx.restore();
          }
        }
      }
    }

    renderItemBatch(normalItems, false);
    renderItemBatch(elevatedItems, true);

    // Subtle target outline if an exact DOM element was picked via Point-on-Screen
    if (highlightDomTarget && highlightDomTarget.rect && highlightDomTarget.rect.width > 0) {
      var tr = highlightDomTarget.rect;
      ctx.save();
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 2.2;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([5, 3]);
      ctx.strokeRect(tr.x * sx, tr.y * sy, tr.width * sx, tr.height * sy);
      ctx.restore();
    }

    // Subtle footer watermark bar with screen & viewport for instant visual context on report.html
    var liveMeta = internalState.capturedContext || captureLiveRedFlagMetadata();
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.fillRect(0, SNAPSHOT_HEIGHT - 20, SNAPSHOT_WIDTH, 20);
    ctx.font = '700 10px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#fda4af';
    ctx.textBaseline = 'middle';
    var footerLabel = '🚩 ' + (liveMeta.activeScreen || 'SYNAPZ') +
      (liveMeta.drillId ? (' • ' + liveMeta.drillId) : '') +
      ' • ' + (liveMeta.viewport || '') + ' • ' + APP_VERSION;
    ctx.fillText(footerLabel.slice(0, 88), 8, SNAPSHOT_HEIGHT - 10);
    ctx.restore();

    return encodeCanvasUnder42Kb(offCanvas);
  }

  function encodeCanvasUnder42Kb(canvasEl) {
    var qualities = [0.62, 0.50, 0.40, 0.30];
    var dataUrl = '';
    for (var i = 0; i < qualities.length; i++) {
      try {
        dataUrl = canvasEl.toDataURL('image/jpeg', qualities[i]);
      } catch (_) {
        dataUrl = '';
        break;
      }
      if (dataUrl.length <= MAX_SNAPSHOT_BYTES && estimateDataUrlBytes(dataUrl) <= MAX_SNAPSHOT_BYTES) {
        return dataUrl;
      }
    }
    // Downscale fallback if high-frequency scene still exceeded 41.5 KB
    var small = document.createElement('canvas');
    small.width = 480;
    small.height = 330;
    var sCtx = small.getContext('2d');
    if (sCtx) {
      sCtx.drawImage(canvasEl, 0, 0, 480, 330);
      try {
        dataUrl = small.toDataURL('image/jpeg', 0.45);
      } catch (_) {}
    }
    return dataUrl;
  }

  function downscaleUploadedImageFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error('No image selected'));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read photo')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('Invalid image format')); };
        img.onload = function () {
          var c = document.createElement('canvas');
          c.width = SNAPSHOT_WIDTH;
          c.height = SNAPSHOT_HEIGHT;
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT);
          var ir = img.naturalWidth / Math.max(1, img.naturalHeight);
          var br = SNAPSHOT_WIDTH / SNAPSHOT_HEIGHT;
          var dw = SNAPSHOT_WIDTH;
          var dh = SNAPSHOT_HEIGHT;
          if (ir > br) dh = SNAPSHOT_WIDTH / ir;
          else dw = SNAPSHOT_HEIGHT * ir;
          ctx.drawImage(img, (SNAPSHOT_WIDTH - dw) / 2, (SNAPSHOT_HEIGHT - dh) / 2, dw, dh);
          resolve(encodeCanvasUnder42Kb(c));
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  // =========================================================================
  // 3. DOM ELEMENT INSPECTOR FOR `🎯 TAP EXACT SPOT ON SCREEN`
  // =========================================================================
  function describeDomElement(rawEl) {
    if (!rawEl || rawEl === document.body || rawEl === document.documentElement) {
      return {
        tag: 'body',
        id: '',
        className: '',
        selector: 'body',
        textSnippet: 'Screen Background',
        rect: { x: 0, y: 0, width: Math.round(window.innerWidth || 0), height: Math.round(window.innerHeight || 0) }
      };
    }

    // Prefer semantic interactive ancestor (e.g. <button class="try-on"> wrapping a <span>)
    var semantic = (typeof rawEl.closest === 'function')
      ? rawEl.closest('button, a, input, select, textarea, canvas, [role="button"], [data-locker-hotspot], [data-shop-fixture], [data-office-hotspot], [data-clubhouse-hotspot]')
      : null;
    var el = semantic || rawEl;

    var tag = (el.tagName || 'div').toLowerCase();
    var id = el.id ? String(el.id) : '';
    var rawCls = typeof el.className === 'string' ? el.className.trim() : '';
    var meaningfulClasses = rawCls
      ? rawCls.split(/\s+/).filter(function (c) {
          return c &&
            c.length <= 36 &&
            c.indexOf('[') === -1 &&
            c.indexOf(':') === -1 &&
            c.indexOf('/') === -1 &&
            !/^(flex|grid|hidden|block|inline|relative|absolute|fixed|static|w-|h-|min-|max-|p-|px-|py-|pt-|pb-|pl-|pr-|m-|mx-|my-|mt-|mb-|ml-|mr-|text-|font-|leading-|tracking-|bg-|from-|via-|to-|border|rounded|shadow|transition|cursor-|items-|justify-|gap-|space-|shrink|grow|z-|top-|bottom-|left-|right-|inset-|overflow-|select-|opacity-)/.test(c);
        })
      : [];
    var chosenClasses = meaningfulClasses.slice(0, 3);
    var classStr = chosenClasses.join('.');

    var selector = '<' + tag +
      (id ? ('#' + id) : '') +
      (classStr ? ('.' + classStr) : '') +
      '>';

    var textSnippet = getCleanText(el, 56) ||
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      el.getAttribute('placeholder') ||
      el.getAttribute('alt') ||
      '';
    textSnippet = String(textSnippet).trim().slice(0, 56);

    var r = el.getBoundingClientRect();
    return {
      tag: tag,
      id: id,
      className: rawCls.slice(0, 120),
      selector: selector,
      textSnippet: textSnippet,
      rect: {
        x: Math.round(r.left),
        y: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height)
      }
    };
  }

  // =========================================================================
  // 4. CLOUD SYNC + OFFLINE OUTBOX (`localStorage.synapz_redflag_outbox`)
  // =========================================================================
  function getOfflineOutbox() {
    var combined = [];
    try {
      var raw = window.localStorage ? window.localStorage.getItem(STORAGE_OUTBOX_KEY) : null;
      var parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) combined = combined.concat(parsed);
    } catch (_) {}
    // Also migrate any legacy v14.2 outbox items cleanly
    try {
      var legRaw = window.localStorage ? window.localStorage.getItem(LEGACY_OUTBOX_KEY) : null;
      var legParsed = legRaw ? JSON.parse(legRaw) : [];
      if (Array.isArray(legParsed) && legParsed.length) {
        combined = combined.concat(legParsed);
        window.localStorage.removeItem(LEGACY_OUTBOX_KEY);
      }
    } catch (_) {}
    var seen = {};
    var deduped = [];
    for (var i = 0; i < combined.length; i++) {
      var row = combined[i];
      if (row && row.id && !seen[row.id]) {
        seen[row.id] = true;
        deduped.push(row);
      }
    }
    return deduped;
  }

  function saveOfflineOutbox(list) {
    var safeList = Array.isArray(list) ? list.slice(0, 30) : [];
    try {
      if (window.localStorage) {
        window.localStorage.setItem(STORAGE_OUTBOX_KEY, JSON.stringify(safeList));
      }
    } catch (_) {
      // If quota tight, drop snapshot bytes on oldest queued items rather than losing the flag!
      try {
        var trimmed = safeList.map(function (it, idx) {
          if (idx < 5 || !it || !it.details) return it;
          var copyDetails = Object.assign({}, it.details, { snapshotDataUrl: '' });
          return Object.assign({}, it, { details: copyDetails });
        });
        window.localStorage.setItem(STORAGE_OUTBOX_KEY, JSON.stringify(trimmed));
      } catch (_2) {}
    }
    updatePillOutboxBadge();
  }

  async function flushOfflineRedFlagOutbox() {
    if (window.__SYNAPZ_TEST_MODE__ === true && window.__SYNAPZ_ALLOW_LIVE_SUPABASE_IN_TEST__ !== true) {
      return { flushed: 0, remaining: getOfflineOutbox().length, testMode: true };
    }
    var queue = getOfflineOutbox();
    if (!queue.length) return { flushed: 0, remaining: 0 };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { flushed: 0, remaining: queue.length };
    }

    var remaining = [];
    var flushed = 0;
    for (var i = 0; i < queue.length; i++) {
      var item = queue[i];
      try {
        var res = await fetch(SUPABASE_REST_URL + '?on_conflict=id', {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(item)
        });
        if (res && res.status >= 200 && res.status < 300) {
          flushed += 1;
        } else {
          remaining.push(item);
        }
      } catch (_) {
        remaining.push(item);
      }
    }
    saveOfflineOutbox(remaining);
    if (flushed > 0) {
      showGlobalRedFlagToast('✅ Synced ' + flushed + ' offline Red Flag' + (flushed === 1 ? '' : 's') + ' to Board!', false);
    }
    return { flushed: flushed, remaining: remaining.length };
  }

  async function postFlagToSupabaseOrOutbox(payload) {
    // Strict Law 8 Test-Mode Isolation: never touch live Supabase during automated QA
    if (window.__SYNAPZ_TEST_MODE__ === true && window.__SYNAPZ_ALLOW_LIVE_SUPABASE_IN_TEST__ !== true) {
      var sinkRow = Object.assign({}, payload, {
        created_at: new Date().toISOString(),
        _syncedLive: true,
        _testModeSink: true,
        _httpStatus: 201
      });
      window.__synapzTestRedFlagSink.unshift(sinkRow);
      saveTestSessionSink(window.__synapzTestRedFlagSink);
      return sinkRow;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      var offQueue = getOfflineOutbox().filter(function (x) { return x.id !== payload.id; });
      offQueue.unshift(payload);
      saveOfflineOutbox(offQueue);
      return Object.assign({}, payload, {
        created_at: new Date().toISOString(),
        _syncedLive: false,
        _queuedOffline: true
      });
    }

    try {
      var res = await fetch(SUPABASE_REST_URL + '?on_conflict=id', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (!res || res.status < 200 || res.status >= 300) {
        throw new Error('HTTP ' + (res ? res.status : '0'));
      }
      var rows = await res.json().catch(function () { return []; });
      var saved = (Array.isArray(rows) && rows[0]) ? rows[0] : payload;
      // Flush any earlier offline items quietly in background
      flushOfflineRedFlagOutbox().catch(function () {});
      return Object.assign({}, saved, {
        _syncedLive: true,
        _httpStatus: res.status
      });
    } catch (_) {
      var q = getOfflineOutbox().filter(function (x) { return x.id !== payload.id; });
      q.unshift(payload);
      saveOfflineOutbox(q);
      return Object.assign({}, payload, {
        created_at: new Date().toISOString(),
        _syncedLive: false,
        _queuedOffline: true
      });
    }
  }

  // =========================================================================
  // 5. STYLES & UNIFIED SINGLE-PILL + MODAL UI MOUNTING
  // =========================================================================
  function injectStyles() {
    if (document.getElementById('synapzRedFlagSystemStyles')) return;
    var style = document.createElement('style');
    style.id = 'synapzRedFlagSystemStyles';
    style.textContent = [
      '/* SYNAPZ v15.6 Unified Standalone Red-Flag System (Safari-15 Safe) */',
      '#btnHeaderFlagDrill, #btnRibbonFlagDrill, #btnOpenFlagDrillFromCoach, #flagDrillModal {',
      '  display: none !important; visibility: hidden !important; pointer-events: none !important;',
      '}',
      'html body #btnPersistentFounderRedFlag {',
      '  position: fixed !important;',
      '  z-index: 2147483640 !important;',
      '  display: inline-flex !important;',
      '  visibility: visible !important;',
      '  opacity: 1 !important;',
      '  pointer-events: auto !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  gap: 6px !important;',
      '  min-height: 38px !important;',
      '  padding: 7px 13px !important;',
      '  border-radius: 9999px !important;',
      '  background: linear-gradient(135deg, #e11d48 0%, #be123c 100%) !important;',
      '  border: 2px solid #fda4af !important;',
      '  color: #ffffff !important;',
      '  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif !important;',
      '  font-size: 12.5px !important;',
      '  font-weight: 900 !important;',
      '  line-height: 1 !important;',
      '  letter-spacing: 0.01em !important;',
      '  box-shadow: 0 8px 24px rgba(225, 29, 72, 0.52), 0 0 0 1px rgba(15, 23, 42, 0.5) !important;',
      '  cursor: grab !important;',
      '  touch-action: none !important;',
      '  user-select: none !important;',
      '  -webkit-user-select: none !important;',
      '  -webkit-tap-highlight-color: transparent !important;',
      '}',
      'html body #btnPersistentFounderRedFlag:active { cursor: grabbing !important; }',
      'html body.synapz-redflag-point-mode #btnPersistentFounderRedFlag {',
      '  display: none !important; pointer-events: none !important;',
      '}',
      'html body.synapz-redflag-point-mode, html body.synapz-redflag-point-mode * {',
      '  cursor: crosshair !important;',
      '}',
      '#founderRedFlagModal {',
      '  position: fixed !important;',
      '  top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important;',
      '  z-index: 2147483642 !important;',
      '  background: rgba(2, 6, 23, 0.86) !important;',
      '  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 10px;',
      '  overflow-y: auto;',
      '  -webkit-overflow-scrolling: touch;',
      '}',
      '#founderRedFlagModal.hidden { display: none !important; }',
      '#synapzRedFlagModalCard {',
      '  width: 100%; max-width: 560px;',
      '  max-height: 94vh; max-height: 94dvh;',
      '  overflow-y: auto;',
      '  background: linear-gradient(165deg, #0f172a 0%, #09101f 100%);',
      '  border: 2px solid #fb7185;',
      '  border-radius: 20px;',
      '  padding: 14px 16px;',
      '  color: #f8fafc;',
      '  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.85), 0 0 32px rgba(244, 63, 94, 0.25);',
      '}',
      '@keyframes synapzBullseyePulse {',
      '  0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 2px #fff, 0 0 14px rgba(244,63,94,0.95); }',
      '  50% { transform: translate(-50%, -50%) scale(1.16); box-shadow: 0 0 0 3px #fde047, 0 0 22px rgba(244,63,94,1); }',
      '}',
      '#redFlagPreviewBullseyePin {',
      '  position: absolute;',
      '  width: 26px; height: 26px;',
      '  border-radius: 9999px;',
      '  border: 3.5px solid #f43f5e;',
      '  background: rgba(244, 63, 94, 0.24);',
      '  pointer-events: none;',
      '  animation: synapzBullseyePulse 1.5s infinite ease-in-out;',
      '}',
      '#redFlagPreviewBullseyePin::after {',
      '  content: ""; position: absolute; top: 50%; left: 50%; width: 6px; height: 6px;',
      '  border-radius: 9999px; background: #fde047; transform: translate(-50%, -50%);',
      '}',
      '#synapzRedFlagPointBanner {',
      '  position: fixed !important;',
      '  top: 10px !important; left: 50% !important; transform: translateX(-50%) !important;',
      '  z-index: 2147483645 !important;',
      '  width: min(94vw, 620px);',
      '  padding: 10px 14px;',
      '  border-radius: 16px;',
      '  background: rgba(15, 23, 42, 0.97);',
      '  border: 2px solid #fde047;',
      '  color: #fef08a;',
      '  font-size: 13px; font-weight: 900;',
      '  display: flex; align-items: center; justify-content: space-between; gap: 10px;',
      '  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8);',
      '}',
      '#synapzRedFlagPointBanner.hidden { display: none !important; }',
      '#founderRedFlagGlobalToast {',
      '  position: fixed !important;',
      '  top: 14px !important; right: 14px !important;',
      '  z-index: 2147483646 !important;',
      '}',
      '#founderRedFlagGlobalToast.hidden { display: none !important; }',
      '@media print {',
      '  #btnPersistentFounderRedFlag, #founderRedFlagModal, #synapzRedFlagPointBanner, #founderRedFlagGlobalToast {',
      '    display: none !important; visibility: hidden !important;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function applyPillCornerPosition(pillEl, corner, animate) {
    if (!pillEl) return;
    var c = VALID_CORNERS.indexOf(corner) !== -1 ? corner : 'bottom-right';
    internalState.corner = c;
    pillEl.setAttribute('data-corner', c);
    writeSafeStorage(STORAGE_CORNER_KEY, c);

    pillEl.style.transition = animate ? 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    pillEl.style.left = 'auto';
    pillEl.style.right = 'auto';
    pillEl.style.top = 'auto';
    pillEl.style.bottom = 'auto';

    if (c === 'bottom-right') {
      pillEl.style.bottom = 'max(14px, env(safe-area-inset-bottom, 0px))';
      pillEl.style.right = 'max(14px, env(safe-area-inset-right, 0px))';
    } else if (c === 'bottom-left') {
      pillEl.style.bottom = 'max(14px, env(safe-area-inset-bottom, 0px))';
      pillEl.style.left = 'max(14px, env(safe-area-inset-left, 0px))';
    } else if (c === 'top-right') {
      pillEl.style.top = 'max(14px, env(safe-area-inset-top, 0px))';
      pillEl.style.right = 'max(14px, env(safe-area-inset-right, 0px))';
    } else if (c === 'top-left') {
      pillEl.style.top = 'max(14px, env(safe-area-inset-top, 0px))';
      pillEl.style.left = 'max(14px, env(safe-area-inset-left, 0px))';
    }
  }

  function updatePillOutboxBadge() {
    var pill = document.getElementById('btnPersistentFounderRedFlag');
    if (!pill) return;
    var qCount = getOfflineOutbox().length;
    var badge = pill.querySelector('[data-redflag-outbox-count]');
    if (badge) {
      if (qCount > 0) {
        badge.textContent = String(qCount);
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  function removeDuplicateLegacyFlagButtons() {
    var legacyIds = ['btnHeaderFlagDrill', 'btnRibbonFlagDrill', 'btnOpenFlagDrillFromCoach', 'flagDrillModal'];
    for (var i = 0; i < legacyIds.length; i++) {
      var el = document.getElementById(legacyIds[i]);
      if (el) {
        el.classList.add('hidden');
        el.setAttribute('aria-hidden', 'true');
      }
    }
    // Deduplicate if multiple #btnPersistentFounderRedFlag ever existed
    var allPills = document.querySelectorAll('#btnPersistentFounderRedFlag');
    for (var j = 1; j < allPills.length; j++) {
      if (allPills[j] && allPills[j].parentNode) {
        allPills[j].parentNode.removeChild(allPills[j]);
      }
    }
  }

  function mountUnifiedRedFlagDom() {
    injectStyles();
    removeDuplicateLegacyFlagButtons();

    // 1. Unified Pill on document.body
    var pill = document.getElementById('btnPersistentFounderRedFlag');
    if (!pill) {
      pill = document.createElement('button');
      pill.id = 'btnPersistentFounderRedFlag';
      pill.type = 'button';
      document.body.appendChild(pill);
    } else if (pill.parentElement !== document.body) {
      document.body.appendChild(pill);
    }
    pill.setAttribute('aria-label', 'Drop a Red Flag');
    pill.setAttribute('title', 'Tap to Flag a Bug or Tweak • Drag to Any Screen Corner');
    if (!pill.querySelector('[data-redflag-outbox-count]')) {
      pill.innerHTML =
        '<span style="font-size:14px;line-height:1;">🚩</span>' +
        '<span>Flag</span>' +
        '<span data-redflag-outbox-count="1" style="display:none;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 4px;border-radius:9999px;background:#fde047;color:#020617;font-size:10px;font-weight:900;">0</span>';
      applyPillCornerPosition(pill, internalState.corner, false);
    }
    bindPillDragAndTap(pill);
    updatePillOutboxBadge();

    // 2. Global Toast
    var gToast = document.getElementById('founderRedFlagGlobalToast');
    if (!gToast) {
      gToast = document.createElement('div');
      gToast.id = 'founderRedFlagGlobalToast';
      gToast.className = 'hidden';
      document.body.appendChild(gToast);
    } else if (gToast.parentElement !== document.body) {
      document.body.appendChild(gToast);
    }

    // 3. Point-on-Screen Top Crosshair Banner
    var banner = document.getElementById('synapzRedFlagPointBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'synapzRedFlagPointBanner';
      banner.className = 'hidden';
      banner.innerHTML =
        '<span>🎯 Tap the exact button, text, or graphic you want to flag (or Esc to cancel)</span>' +
        '<button id="btnCancelRedFlagPointMode" type="button" style="padding:5px 11px;border-radius:10px;background:#334155;border:1px solid #94a3b8;color:#f8fafc;font-size:11px;font-weight:900;cursor:pointer !important;flex-shrink:0;">Cancel</button>';
      document.body.appendChild(banner);
    }
    var cancelPointBtn = document.getElementById('btnCancelRedFlagPointMode');
    if (cancelPointBtn && !cancelPointBtn._v156Bound) {
      cancelPointBtn._v156Bound = true;
      cancelPointBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        exitPointOnScreenMode(true);
      });
    }

    // 4. Upgraded v15.6 Modal (`#founderRedFlagModal`)
    var modal = document.getElementById('founderRedFlagModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'founderRedFlagModal';
      modal.className = 'hidden';
      document.body.appendChild(modal);
    } else if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }

    if (!modal.querySelector('#synapzRedFlagModalCard')) {
      modal._v156ControlsBound = false;
      modal.innerHTML = [
      '<div id="synapzRedFlagModalCard" role="dialog" aria-modal="true" aria-labelledby="synapzRedFlagModalTitle">',
      '  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #1e293b;padding-bottom:8px;margin-bottom:10px;">',
      '    <div>',
      '      <div style="font-size:10px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;color:#fda4af;">🚩 SYNAPZ v15.6 • INSTANT VISUAL BUG SNIPER</div>',
      '      <h3 id="synapzRedFlagModalTitle" style="margin:2px 0 0 0;font-size:16px;font-weight:900;color:#ffffff;">Drop a Red Flag on Live Board</h3>',
      '    </div>',
      '    <button id="btnCloseFounderRedFlagModal" type="button" aria-label="Close Red Flag Modal" style="padding:6px 11px;border-radius:10px;background:#1e293b;border:1px solid #475569;color:#e2e8f0;font-size:12px;font-weight:900;cursor:pointer;">✕</button>',
      '  </div>',

      '  <div id="founderRedFlagContextBadge" style="padding:6px 10px;border-radius:10px;background:#020617;border:1px solid rgba(251,113,133,0.45);font-size:11px;font-weight:800;color:#fecdd3;margin-bottom:9px;line-height:1.35;">',
      '    📍 Screen: Main Rink Lobby',
      '  </div>',

      '  <!-- Point-on-Screen + Attach Photo Action Row -->',
      '  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;margin-bottom:7px;">',
      '    <button id="btnRedFlagPointOnScreen" type="button" style="flex:1 1 210px;padding:8px 12px;border-radius:12px;background:linear-gradient(90deg,#fbbf24,#f59e0b);border:2px solid #fef08a;color:#020617;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 4px 14px rgba(251,191,36,0.32);">',
      '      🎯 Tap Exact Spot on Screen',
      '    </button>',
      '    <label for="inputRedFlagAttachPhoto" style="padding:8px 11px;border-radius:12px;background:#1e293b;border:1px solid #38bdf8;color:#bae6fd;font-size:11.5px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">',
      '      <span>📷 Attach Photo</span>',
      '      <input id="inputRedFlagAttachPhoto" type="file" accept="image/*" style="display:none;" />',
      '    </label>',
      '  </div>',

      '  <!-- Interactive Snapshot Preview + Tap-to-Move Red Bullseye Pin -->',
      '  <div id="redFlagSnapshotPreviewStage" title="Tap anywhere on preview to move the red bullseye pin" style="position:relative;width:100%;height:158px;border-radius:12px;overflow:hidden;background:#020617;border:1.5px solid #334155;cursor:crosshair;margin-bottom:6px;user-select:none;-webkit-user-select:none;">',
      '    <img id="redFlagSnapshotPreviewImg" alt="Captured Screen Snapshot" style="width:100%;height:100%;object-fit:fill;display:block;pointer-events:none;" />',
      '    <div id="redFlagPreviewBullseyePin" style="left:50%;top:50%;"></div>',
      '    <span id="redFlagSnapshotSizeBadge" style="position:absolute;bottom:5px;right:6px;padding:2px 6px;border-radius:6px;background:rgba(2,6,23,0.82);color:#94a3b8;font-size:9.5px;font-weight:800;">JPEG</span>',
      '  </div>',

      '  <div id="redFlagPinnedElementBadge" style="padding:5px 9px;border-radius:9px;background:rgba(15,23,42,0.9);border:1px solid #334155;font-size:11px;font-weight:800;color:#fde68a;margin-bottom:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">',
      '    🎯 Pin at (50%, 50%) — Tap preview or use "Tap Exact Spot on Screen"',
      '  </div>',

      '  <!-- Sticky Who is Flagging Pills -->',
      '  <div style="margin-bottom:8px;">',
      '    <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:4px;">Who\'s Flagging (Remembered on This Tablet)</div>',
      '    <div id="redFlagAuthorPillsBar" style="display:flex;flex-wrap:wrap;gap:5px;"></div>',
      '  </div>',

      '  <!-- Guardrail Intent Pills -->',
      '  <div style="margin-bottom:9px;">',
      '    <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:4px;">Intent / Progress-Protection Guardrail</div>',
      '    <div id="redFlagIntentPillsBar" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;"></div>',
      '    <div id="founderRedFlagQuickTagsBar" class="hidden" aria-hidden="true">',
      '      <button type="button" data-redflag-quicktag="Unclear Question"></button>',
      '      <button type="button" data-redflag-quicktag="Spacing / Target"></button>',
      '      <button type="button" data-redflag-quicktag="Clipped / Overlap"></button>',
      '      <button type="button" data-redflag-quicktag="Voice / Caption"></button>',
      '      <button type="button" data-redflag-quicktag="Bug / Freeze"></button>',
      '    </div>',
      '  </div>',

      '  <!-- Note Textarea + Voice Dictate -->',
      '  <div style="margin-bottom:8px;">',
      '    <textarea id="founderRedFlagNoteInput" rows="2" placeholder="Describe or dictate what needs fixing or tweaking on this exact spot..." style="width:100%;padding:8px 10px;border-radius:12px;background:#020617;border:1.5px solid #475569;color:#ffffff;font-size:13px;font-weight:700;outline:none;resize:vertical;"></textarea>',
      '    <div id="redFlagDictateInlineTip" class="hidden" style="margin-top:5px;padding:6px 9px;border-radius:9px;background:rgba(14,116,144,0.22);border:1px solid #22d3ee;color:#a5f3fc;font-size:11px;font-weight:800;">',
      '      🎙️ Tap the 🎙️ microphone key on your iPad keyboard to dictate!',
      '    </div>',
      '  </div>',

      '  <!-- Action Row -->',
      '  <div id="redFlagFormSubmitRow" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;">',
      '    <button id="btnDictateFounderRedFlag" type="button" style="padding:9px 13px;border-radius:12px;background:#1e293b;border:1.5px solid #22d3ee;color:#a5f3fc;font-size:12px;font-weight:900;cursor:pointer;">',
      '      🎙️ Dictate',
      '    </button>',
      '    <button id="btnSubmitFounderRedFlag" type="button" style="flex:1 1 200px;padding:10px 16px;border-radius:12px;background:linear-gradient(90deg,#f43f5e,#e11d48);border:2px solid #fda4af;color:#ffffff;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 6px 20px rgba(244,63,94,0.4);">',
      '      🚩 Send Red Flag to Live Board',
      '    </button>',
      '  </div>',

      '  <!-- Honest Cloud Receipt Panel (With 1-Tap Drop Another / Done) -->',
      '  <div id="founderRedFlagToast" class="hidden" style="margin-top:9px;padding:10px 12px;border-radius:12px;background:rgba(6,78,59,0.88);border:1.5px solid #34d399;color:#d1fae5;font-size:12.5px;font-weight:900;"></div>',
      '</div>'
      ].join('\n');

      bindModalControls(modal);
      renderAuthorPills();
      renderIntentPills();
    }
  }

  function bindPillDragAndTap(pill) {
    if (!pill || pill._v156DragBound) return;
    pill._v156DragBound = true;

    var dragActive = false;
    var pointerId = null;
    var startX = 0;
    var startY = 0;
    var origLeft = 0;
    var origTop = 0;
    var movedBeyondThreshold = false;

    function onStart(clientX, clientY, pId) {
      var rect = pill.getBoundingClientRect();
      dragActive = true;
      pointerId = pId;
      startX = clientX;
      startY = clientY;
      origLeft = rect.left;
      origTop = rect.top;
      movedBeyondThreshold = false;
    }

    function onMove(clientX, clientY) {
      if (!dragActive) return;
      var dx = clientX - startX;
      var dy = clientY - startY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 8) {
        movedBeyondThreshold = true;
        var vw = window.innerWidth || 1024;
        var vh = window.innerHeight || 768;
        var pw = pill.offsetWidth || 84;
        var ph = pill.offsetHeight || 38;
        var nextLeft = Math.max(6, Math.min(vw - pw - 6, origLeft + dx));
        var nextTop = Math.max(6, Math.min(vh - ph - 6, origTop + dy));
        pill.style.transition = 'none';
        pill.style.right = 'auto';
        pill.style.bottom = 'auto';
        pill.style.left = nextLeft + 'px';
        pill.style.top = nextTop + 'px';
      }
    }

    function onEnd() {
      if (!dragActive) return;
      dragActive = false;
      pointerId = null;
      if (movedBeyondThreshold) {
        internalState.lastDragEndAt = Date.now();
        var rect = pill.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var vw = window.innerWidth || 1024;
        var vh = window.innerHeight || 768;
        var horiz = cx < vw / 2 ? 'left' : 'right';
        var vert = cy < vh / 2 ? 'top' : 'bottom';
        applyPillCornerPosition(pill, vert + '-' + horiz, true);
      }
    }

    if (window.PointerEvent) {
      pill.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0) return;
        onStart(e.clientX, e.clientY, e.pointerId);
        if (pill.setPointerCapture && e.pointerId !== undefined) {
          try { pill.setPointerCapture(e.pointerId); } catch (_) {}
        }
      });
      pill.addEventListener('pointermove', function (e) {
        if (!dragActive || (pointerId !== null && e.pointerId !== pointerId)) return;
        onMove(e.clientX, e.clientY);
      });
      pill.addEventListener('pointerup', function (e) {
        if (pointerId !== null && e.pointerId !== pointerId) return;
        onEnd();
      });
      pill.addEventListener('pointercancel', function () {
        onEnd();
      });
    } else {
      pill.addEventListener('touchstart', function (e) {
        var t = e.touches && e.touches[0];
        if (t) onStart(t.clientX, t.clientY, null);
      }, { passive: true });
      pill.addEventListener('touchmove', function (e) {
        var t = e.touches && e.touches[0];
        if (t) onMove(t.clientX, t.clientY);
      }, { passive: true });
      pill.addEventListener('touchend', onEnd);
    }

    pill.addEventListener('click', function (e) {
      if (Date.now() - internalState.lastDragEndAt < 320) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      openFounderRedFlagModal();
    });
  }

  function renderAuthorPills() {
    var bar = document.getElementById('redFlagAuthorPillsBar');
    if (!bar) return;
    bar.innerHTML = AUTHORS.map(function (name) {
      var active = internalState.author === name;
      var style = active
        ? 'padding:5px 10px;border-radius:9999px;background:#22d3ee;border:1.5px solid #cffafe;color:#020617;font-size:11.5px;font-weight:900;cursor:pointer;'
        : 'padding:5px 10px;border-radius:9999px;background:#0f172a;border:1px solid #334155;color:#cbd5e1;font-size:11.5px;font-weight:700;cursor:pointer;';
      return '<button type="button" data-redflag-author="' + escapeHtml(name) + '" aria-pressed="' + (active ? 'true' : 'false') + '" style="' + style + '">' + escapeHtml(name) + '</button>';
    }).join('');

    var btns = bar.querySelectorAll('[data-redflag-author]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function (ev) {
        var chosen = ev.currentTarget.getAttribute('data-redflag-author');
        if (chosen && AUTHORS.indexOf(chosen) !== -1) {
          internalState.author = chosen;
          writeSafeStorage(STORAGE_AUTHOR_KEY, chosen);
          renderAuthorPills();
        }
      });
    }
  }

  function renderIntentPills() {
    var bar = document.getElementById('redFlagIntentPillsBar');
    if (!bar) return;
    bar.innerHTML = INTENTS.map(function (it) {
      var active = internalState.intentTag === it.id;
      var isGold = it.id === 'keep_style_tweak';
      var style = '';
      if (active) {
        style = isGold
          ? 'padding:7px 9px;border-radius:11px;background:#fbbf24;border:2px solid #fef08a;color:#020617;font-size:11px;font-weight:900;text-align:left;cursor:pointer;'
          : 'padding:7px 9px;border-radius:11px;background:#f43f5e;border:2px solid #fecdd3;color:#ffffff;font-size:11px;font-weight:900;text-align:left;cursor:pointer;';
      } else {
        style = 'padding:7px 9px;border-radius:11px;background:#0f172a;border:1px solid #334155;color:#cbd5e1;font-size:11px;font-weight:700;text-align:left;cursor:pointer;';
      }
      return '<button type="button" data-redflag-intent="' + escapeHtml(it.id) + '" aria-pressed="' + (active ? 'true' : 'false') + '" style="' + style + '">' + escapeHtml(it.label) + '</button>';
    }).join('');

    var btns = bar.querySelectorAll('[data-redflag-intent]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function (ev) {
        var chosen = ev.currentTarget.getAttribute('data-redflag-intent');
        if (getIntentMeta(chosen)) {
          internalState.intentTag = chosen;
          writeSafeStorage(STORAGE_INTENT_KEY, chosen);
          renderIntentPills();
        }
      });
    }
  }

  function updatePreviewAndPinUi() {
    var imgEl = document.getElementById('redFlagSnapshotPreviewImg');
    var pinEl = document.getElementById('redFlagPreviewBullseyePin');
    var sizeEl = document.getElementById('redFlagSnapshotSizeBadge');
    var domBadgeEl = document.getElementById('redFlagPinnedElementBadge');

    if (imgEl && internalState.snapshotDataUrl) {
      imgEl.src = internalState.snapshotDataUrl;
    }
    if (pinEl) {
      pinEl.style.left = internalState.pin.xPct + '%';
      pinEl.style.top = internalState.pin.yPct + '%';
    }
    if (sizeEl) {
      var kb = Math.max(1, Math.round((internalState.snapshotBytes || estimateDataUrlBytes(internalState.snapshotDataUrl)) / 1024));
      sizeEl.textContent = 'JPEG • ' + kb + ' KB';
    }
    if (domBadgeEl) {
      if (internalState.domTarget && internalState.domTarget.selector) {
        var snip = internalState.domTarget.textSnippet ? (' "' + internalState.domTarget.textSnippet + '"') : '';
        domBadgeEl.textContent = '🎯 Pinned: ' + internalState.domTarget.selector + snip +
          ' (' + internalState.pin.xPct + '%, ' + internalState.pin.yPct + '%)';
      } else {
        domBadgeEl.textContent = '🎯 Pin at (' + internalState.pin.xPct + '%, ' + internalState.pin.yPct + '%) — Tap preview or "Tap Exact Spot on Screen"';
      }
    }
  }

  function bindModalControls(modal) {
    if (!modal || modal._v156ControlsBound) return;
    modal._v156ControlsBound = true;

    modal.addEventListener('click', function (ev) {
      if (ev.target === modal) {
        closeFounderRedFlagModal();
      }
    });

    var closeBtn = document.getElementById('btnCloseFounderRedFlagModal');
    if (closeBtn) closeBtn.addEventListener('click', closeFounderRedFlagModal);

    var previewStage = document.getElementById('redFlagSnapshotPreviewStage');
    if (previewStage) {
      previewStage.addEventListener('click', function (ev) {
        var r = previewStage.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;
        var xPct = Math.max(2, Math.min(98, Number((((ev.clientX - r.left) / r.width) * 100).toFixed(1))));
        var yPct = Math.max(2, Math.min(98, Number((((ev.clientY - r.top) / r.height) * 100).toFixed(1))));
        internalState.pin = { xPct: xPct, yPct: yPct };
        updatePreviewAndPinUi();
      });
    }

    var pointBtn = document.getElementById('btnRedFlagPointOnScreen');
    if (pointBtn) {
      pointBtn.addEventListener('click', function () {
        enterPointOnScreenMode();
      });
    }

    var attachInput = document.getElementById('inputRedFlagAttachPhoto');
    if (attachInput) {
      attachInput.addEventListener('change', function (ev) {
        var file = ev.target && ev.target.files && ev.target.files[0];
        if (!file) return;
        downscaleUploadedImageFile(file).then(function (jpegUrl) {
          if (jpegUrl) {
            internalState.snapshotDataUrl = jpegUrl;
            internalState.snapshotBytes = estimateDataUrlBytes(jpegUrl);
            updatePreviewAndPinUi();
          }
        }).catch(function () {});
        ev.target.value = '';
      });
    }

    var dictateBtn = document.getElementById('btnDictateFounderRedFlag');
    if (dictateBtn) {
      dictateBtn.addEventListener('click', toggleVoiceDictation);
    }

    var submitBtn = document.getElementById('btnSubmitFounderRedFlag');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        submitFounderRedFlagPriority();
      });
    }
  }

  // =========================================================================
  // 6. `🎯 TAP EXACT SPOT ON SCREEN` CROSSHAIR PICKER
  // =========================================================================
  function onPointModeKeyDown(ev) {
    if (!internalState.isPointMode) return;
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      exitPointOnScreenMode(true);
    }
  }

  function onPointModeScreenTap(ev) {
    if (!internalState.isPointMode) return;
    var banner = document.getElementById('synapzRedFlagPointBanner');
    if (banner && banner.contains(ev.target)) {
      return; // Allow Cancel button inside banner to work
    }

    ev.preventDefault();
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();

    var clientX = ev.clientX;
    var clientY = ev.clientY;
    if ((clientX === undefined || clientY === undefined) && ev.changedTouches && ev.changedTouches[0]) {
      clientX = ev.changedTouches[0].clientX;
      clientY = ev.changedTouches[0].clientY;
    }
    var vw = Math.max(1, window.innerWidth || 1024);
    var vh = Math.max(1, window.innerHeight || 768);
    var xPct = Math.max(1, Math.min(99, Number(((clientX / vw) * 100).toFixed(1))));
    var yPct = Math.max(1, Math.min(99, Number(((clientY / vh) * 100).toFixed(1))));

    // Hide banner momentarily so elementFromPoint & fresh snapshot capture pure app UI
    if (banner) banner.classList.add('hidden');
    document.body.classList.remove('synapz-redflag-point-mode');

    var hitEl = document.elementFromPoint(clientX, clientY);
    var domTarget = describeDomElement(hitEl);
    internalState.pin = { xPct: xPct, yPct: yPct };
    internalState.domTarget = domTarget;
    internalState.snapshotDataUrl = captureViewportSnapshot(domTarget);
    internalState.snapshotBytes = estimateDataUrlBytes(internalState.snapshotDataUrl);

    exitPointOnScreenMode(true);
  }

  function enterPointOnScreenMode() {
    var modal = document.getElementById('founderRedFlagModal');
    var banner = document.getElementById('synapzRedFlagPointBanner');
    internalState.isPointMode = true;
    if (modal) modal.classList.add('hidden');
    if (banner) banner.classList.remove('hidden');
    document.body.classList.add('synapz-redflag-point-mode');

    window.addEventListener('keydown', onPointModeKeyDown, true);
    // Defer binding by 30ms so the triggering click on #btnRedFlagPointOnScreen never self-triggers
    setTimeout(function () {
      if (!internalState.isPointMode) return;
      document.addEventListener('click', onPointModeScreenTap, true);
    }, 30);
  }

  function exitPointOnScreenMode(reopenModal) {
    internalState.isPointMode = false;
    document.removeEventListener('click', onPointModeScreenTap, true);
    window.removeEventListener('keydown', onPointModeKeyDown, true);
    document.body.classList.remove('synapz-redflag-point-mode');

    var banner = document.getElementById('synapzRedFlagPointBanner');
    if (banner) banner.classList.add('hidden');

    if (reopenModal) {
      var modal = document.getElementById('founderRedFlagModal');
      if (modal) modal.classList.remove('hidden');
      internalState.isOpen = true;
      updatePreviewAndPinUi();
    }
  }

  // =========================================================================
  // 7. VOICE DICTATION (`SpeechRecognition` + SAFARI 15 KEYBOARD MIC TIP)
  // =========================================================================
  function stopVoiceDictation() {
    internalState.isListening = false;
    if (internalState.speechRec) {
      try { internalState.speechRec.stop(); } catch (_) {}
      internalState.speechRec = null;
    }
    var btn = document.getElementById('btnDictateFounderRedFlag');
    if (btn) {
      btn.textContent = '🎙️ Dictate';
      btn.style.background = '#1e293b';
      btn.style.borderColor = '#22d3ee';
      btn.style.color = '#a5f3fc';
    }
  }

  function showSafariKeyboardDictateTip() {
    var tip = document.getElementById('redFlagDictateInlineTip');
    var inp = document.getElementById('founderRedFlagNoteInput');
    if (tip) tip.classList.remove('hidden');
    if (inp) {
      try { inp.focus(); } catch (_) {}
    }
  }

  function toggleVoiceDictation() {
    var inp = document.getElementById('founderRedFlagNoteInput');
    var btn = document.getElementById('btnDictateFounderRedFlag');
    var tip = document.getElementById('redFlagDictateInlineTip');
    if (tip) tip.classList.add('hidden');

    if (internalState.isListening) {
      stopVoiceDictation();
      return;
    }

    var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      showSafariKeyboardDictateTip();
      return;
    }

    try {
      var rec = new SpeechRec();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      internalState.speechRec = rec;
      internalState.isListening = true;

      if (btn) {
        btn.textContent = '🔴 Listening...';
        btn.style.background = '#881337';
        btn.style.borderColor = '#fda4af';
        btn.style.color = '#ffffff';
      }

      rec.onresult = function (ev) {
        var chunk = '';
        if (ev && ev.results) {
          for (var i = ev.resultIndex || 0; i < ev.results.length; i++) {
            if (ev.results[i] && ev.results[i][0] && ev.results[i][0].transcript) {
              chunk += ev.results[i][0].transcript + ' ';
            }
          }
        }
        chunk = chunk.trim();
        if (inp && chunk) {
          var prev = inp.value ? inp.value.trim() : '';
          inp.value = prev ? (prev + ' ' + chunk) : chunk;
        }
      };

      rec.onerror = function () {
        stopVoiceDictation();
        showSafariKeyboardDictateTip();
      };

      rec.onend = function () {
        stopVoiceDictation();
      };

      rec.start();
    } catch (_) {
      stopVoiceDictation();
      showSafariKeyboardDictateTip();
    }
  }

  // =========================================================================
  // 8. MODAL OPEN / PAUSE / CLOSE / RESUME / SUBMIT CONTROLLERS
  // =========================================================================
  function showGlobalRedFlagToast(msg, isOffline) {
    var gToast = document.getElementById('founderRedFlagGlobalToast');
    if (!gToast) return;
    gToast.textContent = msg;
    gToast.style.padding = '10px 15px';
    gToast.style.borderRadius = '14px';
    gToast.style.fontSize = '12.5px';
    gToast.style.fontWeight = '900';
    gToast.style.boxShadow = '0 14px 36px rgba(0,0,0,0.65)';
    if (isOffline) {
      gToast.style.background = 'rgba(69, 26, 3, 0.96)';
      gToast.style.border = '2px solid #fbbf24';
      gToast.style.color = '#fef3c7';
    } else {
      gToast.style.background = 'rgba(6, 78, 59, 0.96)';
      gToast.style.border = '2px solid #34d399';
      gToast.style.color = '#d1fae5';
    }
    gToast.classList.remove('hidden');
    clearTimeout(window._redFlagGlobalToastTimer);
    window._redFlagGlobalToastTimer = setTimeout(function () {
      gToast.classList.add('hidden');
    }, 4200);
  }

  function renderContextBadgeText(ctx, wasPaused) {
    var badge = document.getElementById('founderRedFlagContextBadge');
    if (!badge) return;
    var ac = ctx.appContext || {};
    var parts = [];
    if (ac.activeDrillId) {
      parts.push('Drill: ' + ac.activeDrillId);
      if (ac.activeMode) parts.push('Mode: ' + ac.activeMode);
      if (ac.youAreRole) parts.push('YOU ARE: ' + ac.youAreRole);
    } else {
      parts.push('Screen: ' + (ac.screen || ctx.activeScreen || 'Main Rink Lobby'));
      if (ac.openModalTitle) parts.push('Modal: ' + ac.openModalTitle);
    }
    parts.push(ctx.deviceLabel || ctx.viewport);
    if (wasPaused) parts.push('⏸ Clock Paused');
    badge.textContent = '📍 ' + parts.join(' • ');
  }

  function openFounderRedFlagModal() {
    mountUnifiedRedFlagDom();
    if (window.SoundFX && typeof window.SoundFX.playTap === 'function') {
      try { window.SoundFX.playTap(); } catch (_) {}
    }

    // 1. Capture live screen context & composite JPEG snapshot FIRST before modal appears!
    var ctx = captureLiveRedFlagMetadata();
    internalState.capturedContext = ctx;
    internalState.pin = { xPct: 50.0, yPct: 50.0 };
    internalState.domTarget = null;
    internalState.snapshotDataUrl = captureViewportSnapshot(null);
    internalState.snapshotBytes = estimateDataUrlBytes(internalState.snapshotDataUrl);

    // 2. Pause active Chalk-Talk Reel, 9-Mode Drill Engine & legacy timers cleanly
    var pausedV14 = Boolean(window.SynapzV14Engine && typeof window.SynapzV14Engine.pauseActiveTimers === 'function' && window.SynapzV14Engine.pauseActiveTimers());
    var pausedLegacy = false;
    if (window.state && window.state.view === 'game' && window.state.decisionInterval) {
      clearInterval(window.state.decisionInterval);
      window.state.decisionInterval = null;
      window.state._pausedByRedFlagModal = true;
      pausedLegacy = true;
    }
    internalState.pausedV14 = pausedV14;
    internalState.pausedLegacy = pausedLegacy;
    window.__synapzRedFlagPaused = true;

    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }

    // Populate compatibility context object
    window._lastFounderRedFlagAutoContext = Object.assign({}, ctx, {
      scenarioId: ctx.drillId || ctx.activeScreen,
      ageDivision: ctx.ageTier,
      activeScreenOrModal: ctx.activeScreen,
      timersPaused: pausedV14 || pausedLegacy
    });

    // Re-sync sticky Author & Intent from localStorage
    internalState.author = readSafeStorage(STORAGE_AUTHOR_KEY, internalState.author);
    if (AUTHORS.indexOf(internalState.author) === -1) internalState.author = 'Coach Dane';
    internalState.intentTag = readSafeStorage(STORAGE_INTENT_KEY, internalState.intentTag);
    if (!getIntentMeta(internalState.intentTag)) internalState.intentTag = 'bug';

    renderAuthorPills();
    renderIntentPills();
    renderContextBadgeText(ctx, pausedV14 || pausedLegacy);
    updatePreviewAndPinUi();

    var toast = document.getElementById('founderRedFlagToast');
    if (toast) {
      toast.classList.add('hidden');
      toast.innerHTML = '';
    }
    var tip = document.getElementById('redFlagDictateInlineTip');
    if (tip) tip.classList.add('hidden');
    var submitBtn = document.getElementById('btnSubmitFounderRedFlag');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '🚩 Send Red Flag to Live Board';
    }

    var modal = document.getElementById('founderRedFlagModal');
    if (modal) modal.classList.remove('hidden');
    internalState.isOpen = true;
  }

  function closeFounderRedFlagModal() {
    stopVoiceDictation();
    if (internalState.isPointMode) {
      exitPointOnScreenMode(false);
    }
    var modal = document.getElementById('founderRedFlagModal');
    if (modal) modal.classList.add('hidden');
    internalState.isOpen = false;

    // Cleanly resume any paused Chalk-Talk Reel or Active Drill clock!
    window.__synapzRedFlagPaused = false;
    if (window.SynapzV14Engine && typeof window.SynapzV14Engine.resumeActiveTimers === 'function') {
      window.SynapzV14Engine.resumeActiveTimers();
    }
    if (window.state) {
      window.state._pausedByRedFlagModal = false;
    }
  }

  function resetForDropAnotherFlag() {
    var noteEl = document.getElementById('founderRedFlagNoteInput');
    if (noteEl) noteEl.value = '';
    internalState.pin = { xPct: 50.0, yPct: 50.0 };
    internalState.domTarget = null;
    var toast = document.getElementById('founderRedFlagToast');
    if (toast) {
      toast.classList.add('hidden');
      toast.innerHTML = '';
    }
    var submitBtn = document.getElementById('btnSubmitFounderRedFlag');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '🚩 Send Red Flag to Live Board';
    }
    updatePreviewAndPinUi();
    if (noteEl) {
      try { noteEl.focus(); } catch (_) {}
    }
  }

  async function submitFounderRedFlagPriority() {
    stopVoiceDictation();
    var submitBtn = document.getElementById('btnSubmitFounderRedFlag');
    var toast = document.getElementById('founderRedFlagToast');
    var noteEl = document.getElementById('founderRedFlagNoteInput');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Sending to Cloud...';
    }
    if (toast) {
      toast.style.background = 'rgba(15, 23, 42, 0.95)';
      toast.style.borderColor = '#38bdf8';
      toast.style.color = '#bae6fd';
      toast.textContent = '⏳ Sending to Cloud...';
      toast.classList.remove('hidden');
    }

    var ctx = internalState.capturedContext || captureLiveRedFlagMetadata();
    var intentMeta = getIntentMeta(internalState.intentTag) || INTENTS[0];
    var quickTag = window._selectedRedFlagQuickTag || '';
    var rawNote = noteEl ? noteEl.value.trim() : '';
    var finalNote = rawNote ||
      (internalState.domTarget && internalState.domTarget.selector
        ? ('Flagged ' + internalState.domTarget.selector + ' (' + intentMeta.shortBadge + ')')
        : ('Flagged [' + intentMeta.shortBadge + '] for review.'));

    var rowId = generateUuidV4();
    var shortCode = '#' + rowId.replace(/-/g, '').slice(0, 4).toUpperCase();
    var createdAt = new Date().toISOString();
    var prof = (typeof window.getActiveProfile === 'function' ? window.getActiveProfile() : null) || {};

    var ac = ctx.appContext || {};
    var contextSummaryPart = ac.activeDrillId
      ? (ac.activeDrillId + (ac.activeMode ? ' • ' + ac.activeMode : '') + (ac.youAreRole ? ' • ' + ac.youAreRole : ''))
      : ((ac.screen || ctx.activeScreen || 'Lobby') + (ac.openModalTitle ? ' / ' + ac.openModalTitle : ''));

    var snapshotUrl = internalState.snapshotDataUrl || captureViewportSnapshot(internalState.domTarget);
    var snapshotBytes = estimateDataUrlBytes(snapshotUrl);

    var payload = {
      id: rowId,
      created_by: internalState.author,
      source_role: 'SEAT_0_RED_FLAG',
      scenario_id: ac.activeDrillId || ('SCREEN:' + (ac.screen || 'Lobby')),
      age_division: ctx.ageTier || '12U',
      category: 'SEAT_0_RED_FLAG',
      status: 'open_red_flag',
      summary: '🚩 [' + internalState.author + ' • ' + intentMeta.shortBadge + ' • ' + contextSummaryPart + '] ' + (quickTag ? ('[' + quickTag + '] ') : '') + finalNote,
      details: {
        seat: 'SEAT_0_RED_FLAG',
        schemaVersion: APP_VERSION,
        flagCode: shortCode,
        author: internalState.author,
        intentTag: intentMeta.id,
        intentLabel: intentMeta.label,
        note: finalNote,
        founderNote: finalNote,
        quickTag: quickTag || intentMeta.shortBadge,
        pin: {
          xPct: internalState.pin.xPct,
          yPct: internalState.pin.yPct
        },
        domTarget: internalState.domTarget || null,
        snapshotDataUrl: snapshotUrl,
        snapshotBytes: snapshotBytes,
        deviceInfo: ctx.deviceInfo || collectDeviceInfo(),
        appContext: ac,
        founderComments: [],
        resolvedInBuild: null,
        // Backward-compatible v14.2 mirror keys
        drillId: ctx.drillId || null,
        catalogDrillId: ctx.catalogDrillId || null,
        drillTitle: ctx.drillTitle || null,
        gameMode: ctx.gameMode || null,
        stage: ctx.stage || null,
        activeScreen: ctx.activeScreen || ac.screen || 'Main Rink Lobby',
        positionRole: ctx.positionRole || ac.youAreRole || 'C',
        ageTier: ctx.ageTier || '12U',
        viewport: ctx.viewport,
        deviceLabel: ctx.deviceLabel,
        userAgentShort: ctx.userAgentShort,
        activeProfile: prof.name || internalState.author,
        createdAt: createdAt
      }
    };

    var saved = await postFlagToSupabaseOrOutbox(payload);
    internalState.lastSubmittedRow = saved;
    var syncedLive = Boolean(saved && saved._syncedLive);

    var receiptHeadline = syncedLive
      ? ('✅ Flag ' + shortCode + ' Live on Board! (🚩 Synced Live to Founder Board!)')
      : '📥 Saved Offline — Auto-Syncs on Wi-Fi';

    if (toast) {
      if (syncedLive) {
        toast.style.background = 'rgba(6, 78, 59, 0.92)';
        toast.style.borderColor = '#34d399';
        toast.style.color = '#d1fae5';
      } else {
        toast.style.background = 'rgba(69, 26, 3, 0.92)';
        toast.style.borderColor = '#fbbf24';
        toast.style.color = '#fef3c7';
      }
      toast.innerHTML =
        '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;">' +
        '  <span>' + escapeHtml(syncedLive ? ('✅ Flag ' + shortCode + ' Live on Board!') : '📥 Saved Offline — Auto-Syncs on Wi-Fi') + '</span>' +
        '  <span style="display:inline-flex;gap:6px;">' +
        '    <button id="btnRedFlagReceiptDropAnother" type="button" style="padding:5px 10px;border-radius:8px;background:#0f172a;border:1px solid #94a3b8;color:#f8fafc;font-size:11px;font-weight:900;cursor:pointer;">Drop Another</button>' +
        '    <button id="btnRedFlagReceiptDone" type="button" style="padding:5px 12px;border-radius:8px;background:#10b981;border:1px solid #a7f3d0;color:#020617;font-size:11px;font-weight:900;cursor:pointer;">Done</button>' +
        '  </span>' +
        '</div>' +
        '<span class="hidden" aria-hidden="true">' + escapeHtml(receiptHeadline) + '</span>';
      toast.classList.remove('hidden');

      var btnAnother = document.getElementById('btnRedFlagReceiptDropAnother');
      if (btnAnother) btnAnother.addEventListener('click', resetForDropAnotherFlag);
      var btnDone = document.getElementById('btnRedFlagReceiptDone');
      if (btnDone) btnDone.addEventListener('click', closeFounderRedFlagModal);
    }

    showGlobalRedFlagToast(
      syncedLive ? ('✅ Flag ' + shortCode + ' Live on Board!') : '📥 Saved Offline — Auto-Syncs on Wi-Fi',
      !syncedLive
    );

    if (noteEl) noteEl.value = '';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '🚩 Send Red Flag to Live Board';
    }

    return saved;
  }

  function selectFounderRedFlagQuickTag(tagLabel) {
    window._selectedRedFlagQuickTag = window._selectedRedFlagQuickTag === tagLabel ? '' : String(tagLabel || '');
  }

  // =========================================================================
  // 9. BOOTSTRAP & PUBLIC GLOBAL EXPORTS
  // =========================================================================
  function bootRedFlagSystem() {
    mountUnifiedRedFlagDom();
    flushOfflineRedFlagOutbox().catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootRedFlagSystem, { once: true });
  } else {
    bootRedFlagSystem();
  }

  window.addEventListener('online', function () {
    flushOfflineRedFlagOutbox().catch(function () {});
  });

  // Public API & Backward-Compatible Global Hooks
  window.SynapzRedFlagSystem = {
    __version: APP_VERSION,
    openModal: openFounderRedFlagModal,
    closeModal: closeFounderRedFlagModal,
    submitFlag: submitFounderRedFlagPriority,
    captureMetadata: captureLiveRedFlagMetadata,
    captureViewportSnapshot: captureViewportSnapshot,
    enterPointMode: enterPointOnScreenMode,
    exitPointMode: exitPointOnScreenMode,
    setCorner: function (corner) {
      var pill = document.getElementById('btnPersistentFounderRedFlag');
      applyPillCornerPosition(pill, corner, true);
    },
    getState: function () {
      return Object.assign({}, internalState);
    },
    getOutbox: getOfflineOutbox,
    flushOutbox: flushOfflineRedFlagOutbox
  };

  window.openFounderRedFlagModal = openFounderRedFlagModal;
  window.closeFounderRedFlagModal = closeFounderRedFlagModal;
  window.submitFounderRedFlagPriority = submitFounderRedFlagPriority;
  window.captureLiveRedFlagMetadata = captureLiveRedFlagMetadata;
  window.selectFounderRedFlagQuickTag = selectFounderRedFlagQuickTag;
  window.openFlagDrillModal = openFounderRedFlagModal;
})();
