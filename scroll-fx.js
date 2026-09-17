/* ============================================================
   SCROLL FX — scroll-fx.js
   Wodniack-style scroll presentation: JS computes one smoothed
   per-element progress and writes it to a CSS variable; CSS owns
   the transforms. LED separators flicker only while visible.
   ============================================================ */
(function () {
  'use strict';

  /* This used to bail out under prefers-reduced-motion — but the slides are
     position:absolute and translated into place BY THIS SCRIPT, so bailing
     left them stacked on top of each other and running off the side of the
     screen. The showcase was not calmer with the setting on, it was broken:
     every card clipped, which is what "the project scroll stinks" was.

     It runs either way now. The traverse is driven by scroll position, so
     nothing moves that the visitor did not move themselves.

     MOBILE (2026-08-31): the pinned horizontal traverse is desktop-only.
     On small/touch screens the detent snap fought native scrolling — bays
     regularly came to rest half off-screen (the "text cut off to the left"
     report) — so phones get the plain vertical .case flow instead: no fx
     class, no pinning, no snap. Rotation/resize re-evaluates on reload. */
  var SMALL = window.matchMedia &&
    (matchMedia('(max-width: 700px)').matches ||
     (matchMedia('(pointer: coarse)').matches && matchMedia('(max-width: 1024px)').matches));
  if (!SMALL) document.documentElement.classList.add('fx');

  /* ---- per-card scroll progress -> --p ---- */
  var cards = Array.prototype.slice.call(document.querySelectorAll('.case, .case-sm, .project-card, .about-card'))
    .filter(function (el) { return !el.closest('#showcase'); });
  if (!cards.length && !document.querySelector('.led-sep') && !document.getElementById('showcase')) return;

  var items = cards.map(function (el) {
    return { el: el, top: 0, h: 0, sp: 0, last: -1 };
  });

  function measure() {
    var scrollY = window.pageYOffset;
    items.forEach(function (it) {
      var r = it.el.getBoundingClientRect();
      it.top = r.top + scrollY;
      it.h = r.height;
    });
  }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  var vh = window.innerHeight;
  window.addEventListener('resize', function () { vh = window.innerHeight; });

  /* ---- auto-hiding header: plain scrolling is immersive; scroll-up,
     real mouse travel, or nearing the top brings the nav back ---- */
  var header = document.querySelector('.site-header');
  if (header) {
    var hLastY = window.pageYOffset, hpx = -1, hpy = -1;
    window.addEventListener('scroll', function () {
      var y = window.pageYOffset;
      if (y > hLastY + 2 && y > 140) header.classList.add('nav-hidden');
      else if (y < hLastY - 2 || y <= 140) header.classList.remove('nav-hidden');
      hLastY = y;
    }, { passive: true });
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var moved = hpx >= 0 && Math.abs(e.clientX - hpx) + Math.abs(e.clientY - hpy) > 2;
      hpx = e.clientX; hpy = e.clientY;
      if (moved) header.classList.remove('nav-hidden');
    });
  }

  /* ---- LED separators: rows of flickering 0/1 ---- */
  var seps = Array.prototype.slice.call(document.querySelectorAll('.led-sep'));
  seps.forEach(function (sep) {
    var n = 110;
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<span class="' + (Math.random() < 0.5 ? 'on' : '') + '">' + (Math.random() < 0.5 ? '0' : '1') + '</span>';
    }
    sep.innerHTML = html;
    sep._chars = sep.querySelectorAll('span');
    sep._live = false;
  });
  if (seps.length) {
    var sepObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target._live = e.isIntersecting; });
    }, { rootMargin: '60px' });
    seps.forEach(function (s) { sepObs.observe(s); });
  }

  function tick() {
    var scrollY = window.pageYOffset;
    var bottom = scrollY + vh;

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var p = (bottom - it.top) / (vh * 0.9 + it.h);
      p = Math.max(0, Math.min(1, p));
      it.sp += (p - it.sp) * 0.14;
      var rounded = Math.round(it.sp * 500) / 500;
      if (rounded !== it.last) {
        it.last = rounded;
        it.el.style.setProperty('--p', rounded);
      }
    }

    for (var s = 0; s < seps.length; s++) {
      var sep = seps[s];
      if (!sep._live) continue;
      var chars = sep._chars;
      for (var c = 0; c < chars.length; c++) {
        if (Math.random() < 0.06) {
          chars[c].classList.toggle('on');
          if (Math.random() < 0.3) chars[c].textContent = Math.random() < 0.5 ? '0' : '1';
        }
      }
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);


  /* ---- the six project names, read off the slides themselves ---- */
  function titleOf(sl) {
    var eb = sl.querySelector('.slide-eyebrow');
    var h3 = sl.querySelector('h3');
    return sl.getAttribute('data-index-title') ||
           (sl.classList.contains('wide') && eb ? eb.textContent : (h3 ? h3.textContent : ''));
  }
  function travelTo(i) {
    var c = window.__corridor;
    if (c) { window.scrollTo({ top: Math.round(c.stationY(i)), behavior: 'smooth' }); return; }
    /* plain flow: scroll the slide itself to just under the fixed header */
    var sl = document.querySelectorAll('#showcase .sc-slide')[i];
    if (!sl) return;
    var hdr = document.querySelector('.site-header, header');
    var off = (hdr ? hdr.getBoundingClientRect().height : 64) + 12;
    window.scrollTo({ top: Math.max(0, Math.round(sl.getBoundingClientRect().top + window.pageYOffset - off)), behavior: 'smooth' });
  }

  /* FIX: built at EVERY width. This used to live inside the desktop-only
     showcase block, so #proj-index was an empty <ol> on phones. */
  function buildIndex(slides, N) {
    var index = document.getElementById('proj-index');
    if (!index || index.children.length) return;
    for (var ii = 0; ii < N; ii++) (function (i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<span class="idx">0' + (i + 1) + '</span><span></span><span class="arr">&rarr;</span>';
      b.children[1].textContent = titleOf(slides[i]);
      b.addEventListener('click', function () { travelTo(i); });
      li.appendChild(b);
      index.appendChild(li);
    })(ii);
  }

  /* One object per frame for the corridor's sand (projects-sand.js): the
     smoothed progress, the traverse velocity, and every visible slide's rect
     RELATIVE TO THE STAGE, read in the same frame the transforms were written,
     so the sand can never lag the plates. Both corridors publish through here. */
  var FR = window.__corridorFrame = { t: 0, dt: 0, sp: 0, u: 0, active: 0, vel: 0, stage: { w: 0, h: 0, top: 0 }, slides: [] };
  var frPrev = {};                 /* slide i -> { cx, t } for the velocity */
  var frParts = null;
  function publishFrame(stg, slides, sp, u, active) {
    if (!frParts) {
      frParts = [];
      for (var p = 0; p < slides.length; p++) {
        frParts.push({ plate: slides[p].querySelector('.case, .case-grid') || slides[p] });
      }
    }
    var now = performance.now() / 1000;
    var sb = stg.getBoundingClientRect();
    FR.dt = FR.t ? now - FR.t : 0; FR.t = now; FR.sp = sp; FR.u = u; FR.active = active;
    FR.stage.w = sb.width; FR.stage.h = sb.height; FR.stage.top = sb.top;
    FR.slides.length = 0;
    FR.vel = 0;
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].style.visibility === 'hidden') { delete frPrev[i]; continue; }
      var pr = frParts[i].plate.getBoundingClientRect();
      if (pr.width === 0) { delete frPrev[i]; continue; }
      var rect = { x: pr.left - sb.left, y: pr.top - sb.top, w: pr.width, h: pr.height };
      if (rect.x + rect.w < -120 || rect.x > sb.width + 120) { delete frPrev[i]; continue; }
      var cx = rect.x + rect.w / 2, vel = 0;
      var pv = frPrev[i];
      if (pv && now > pv.t) vel = (cx - pv.cx) / (now - pv.t);
      frPrev[i] = { cx: cx, t: now };
      FR.slides.push({ i: i, q: u - i, rect: rect, vel: vel });
      if (i === active) FR.vel = vel;
    }
    if (window.__corridorFrameCb) window.__corridorFrameCb(FR);
  }

  /* ---- mobile corridor: HARD SNAP (Hudson's pick, lab round 3, A6) ----
     The desktop corridor's traverse, rebuilt for phones on native physics:
     vertical scroll drives the horizontal track, and the detent comes from
     CSS scroll-snap steps — this JS only READS scrollY, never writes it,
     which is the difference from the old corridor that stranded cards. */
  function mobileCorridor(sec) {
    var stage = sec.querySelector('.sc-stage');
    var slides = Array.prototype.slice.call(sec.querySelectorAll('.sc-slide'));
    var N = slides.length;
    if (!stage || !N) return;
    document.documentElement.classList.add('mcorr');

    var track = document.createElement('div');
    track.className = 'sc-mtrack';
    slides.forEach(function (sl) { track.appendChild(sl); });
    stage.appendChild(track);

    var hud = document.createElement('div');
    hud.className = 'sc-mhud';
    var ticksHTML = '';
    for (var t0 = 0; t0 < N; t0++) ticksHTML += '<i></i>';
    hud.innerHTML = '<div class="sc-mghost" aria-hidden="true">01</div>' +
      '<div class="sc-mind"><span class="sc-mcount">01 / 0' + N + '</span>' +
      '<span class="sc-mticks">' + ticksHTML + '</span></div>';
    stage.insertBefore(hud, track);
    var ghost = hud.querySelector('.sc-mghost');
    var count = hud.querySelector('.sc-mcount');
    var ticks = hud.querySelector('.sc-mticks').children;

    /* invisible snap steps — the browser's own detent */
    var steps = [];
    for (var i0 = 0; i0 < N; i0++) {
      var st = document.createElement('div');
      st.className = 'sc-step';
      sec.appendChild(st);
      steps.push(st);
    }
    /* release point: the section after the corridor gets a snap stop too, so
       the page hands scrolling back cleanly at the end.
       FIX: #showcase is the LAST child of #projects, so nextElementSibling was
       null on this page and no exit stop was ever created. Fall back to what
       actually follows the corridor. */
    var exit = sec.nextElementSibling || document.querySelector('.contact-band');
    if (exit) exit.classList.add('sc-snap-exit');

    var stepH = 0, secTop = 0, stepW = 0;
    function measure() {
      stepH = window.innerHeight;
      /* FIX: was N * stepH + 0.2 * stepH — a fifth of a viewport of runway
         AFTER slide 06 had already seated, which is scroll where nothing
         happens and the corridor has visibly given up. The last station now
         coincides with the stage's release. */
      sec.style.height = (N * stepH) + 'px';
      var r = sec.getBoundingClientRect();
      secTop = r.top + window.pageYOffset;
      for (var i = 0; i < N; i++) steps[i].style.top = (i * stepH) + 'px';
      var first = track.firstElementChild;
      stepW = first ? first.getBoundingClientRect().width + 12 : 0;
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', function () { setTimeout(measure, 150); });
    window.addEventListener('load', measure);

    var lastIdx = -1;
    function label(i) { return (i + 1 < 10 ? '0' : '') + (i + 1); }
    function onScroll() {
      if (!stepW) measure();
      var pos = Math.max(0, Math.min(N - 1, (window.pageYOffset - secTop) / stepH));
      track.style.transform = 'translate3d(' + (-pos * stepW).toFixed(1) + 'px,0,0)';
      var idx = Math.round(pos);
      if (idx !== lastIdx) {
        lastIdx = idx;
        count.textContent = label(idx) + ' / ' + label(N - 1);
        for (var t = 0; t < ticks.length; t++) ticks[t].classList.toggle('on', t === idx);
        var l = window.__projGhostText ? window.__projGhostText(idx) : label(idx);
        if (ghost.textContent !== l) {
          ghost.style.opacity = 0;
          setTimeout(function () { ghost.textContent = l; ghost.style.opacity = ''; }, 140);
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* The phone corridor only moves on scroll events, but the corridor's sand
       needs the rects and a clock every frame, so it publishes on its own rAF. */
    (function mTick() {
      var pos = Math.max(0, Math.min(N - 1, (window.pageYOffset - secTop) / stepH));
      publishFrame(stage, slides, pos / Math.max(1, N - 1), pos, Math.round(pos));
      requestAnimationFrame(mTick);
    })();

    window.__corridor = {
      N: N,
      mode: 'mobile',
      stationY: function (i) { return secTop + i * stepH; },
      active: function () { return Math.max(0, Math.min(N - 1, Math.round((window.pageYOffset - secTop) / stepH))); },
      remeasure: function () { measure(); onScroll(); }
    };
  }

  /* ---- pinned LIFT showcase v2 ---- */
  (function () {
    var sec = document.getElementById('showcase');
    if (!sec) return;
    var stage = sec.querySelector('.sc-stage');
    var slides = sec.querySelectorAll('.sc-slide');
    var N = slides.length;
    if (!N) return;

    buildIndex(slides, N);                 /* FIX: at every width */

    /* Corridor retired on touch (Hudson, 2026-09-01: "back to a simpler
       clicking normal scroll"). Phones and tablets get the plain vertical case
       flow, exactly as live; only the index above is new for them.
       Switching mobileCorridor() back on was tried in the 2026-09-12 port and
       the pre-deploy review reverted it: its html.mcorr CSS only exists at
       700px and under, but SMALL also covers coarse pointers up to 1024px, so
       tablets and landscape phones got the traverse with none of its layout
       and the projects slid off-screen. Bring it back only with the gates
       agreeing and Hudson's say-so. */
    if (SMALL) return;

    /* THE RUNWAY, in pixels.
       Was: height = (N * 100 + 100)vh, timeline = detent(sp * (N-1+LEAD) - LEAD).
       Two things were wrong with that. The stations were only implicitly even
       (a fraction of a runway that itself depends on vh), and the LEAD entrance
       was measured in the same units as five whole stations, so changing one
       moved the others. Now one station = STATION px, the entrance is a fixed
       fraction of ONE station, and the last station lands exactly where the
       stage releases: slide 06 is seated at the moment the corridor lets go,
       and the contact band follows straight after it. */
    var LEAD = 0.35;
    var STATION = 0, LEAD_PX = 0, RUNWAY = 0;
    function layout() {
      var vhNow = window.innerHeight;
      STATION = Math.round(vhNow * 1.12);      /* the dwell every slide gets */
      LEAD_PX = Math.round(STATION * LEAD);    /* slide 01's rise-in */
      RUNWAY = LEAD_PX + (N - 1) * STATION;
      sec.style.height = (RUNWAY + vhNow) + 'px';
    }
    layout();
    window.addEventListener('resize', layout);
    function secTopNow() { return sec.getBoundingClientRect().top + window.pageYOffset; }
    function stationY(i) { return secTopNow() + LEAD_PX + i * STATION; }
    var sp = 0;
    var lastActive = -1;
    var counter = document.createElement('div');
    counter.className = 'sc-counter';
    stage.appendChild(counter);
    var ghost = document.createElement('div');
    ghost.className = 'sc-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    stage.insertBefore(ghost, stage.firstChild);

    /* ---- LED-matrix numeral ----------------------------------------
       Draw the digits once at ONE PIXEL PER CELL, read that back, then
       paint a dot for every cell the glyph actually covers. Quantising to
       the grid is the whole point: a CSS dot-mask over live text just
       punches holes through the glyph, so any stroke thinner than the
       pitch breaks up and the digit looks sheared. Sampling coverage
       instead means a stroke is always a continuous run of lit cells.  */
    var gCanvas = document.createElement('canvas');
    var gctx = gCanvas.getContext('2d');
    var oCanvas = document.createElement('canvas');
    var octx = oCanvas.getContext('2d', { willReadFrequently: true });
    ghost.appendChild(gCanvas);

    var MONO = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-mono').trim() || 'monospace';
    var gLast = '';

    function paintGhost(txt, force) {
      if (!txt || (txt === gLast && !force)) return;
      gLast = txt;
      /* projects-ledger.js decides what the giant figure IS and what it is
         made of; with it installed it draws instead of the block below, in the
         same one-pixel-per-cell way. */
      if (window.__projGhostPaint) { window.__projGhostPaint(txt, gCanvas, gctx, oCanvas, octx, MONO, ghost); return; }

      var dpr = window.devicePixelRatio || 1;
      var size = Math.min(window.innerHeight * 0.56, window.innerWidth * 0.44);
      var CELL = Math.max(10, Math.round(size / 34));   /* ~34 cells tall */
      var rows = Math.round(size / CELL);
      var cols = Math.round(rows * 1.35);

      /* pass 1 — one pixel per cell, so a pixel IS a cell */
      oCanvas.width = cols; oCanvas.height = rows;
      octx.clearRect(0, 0, cols, rows);
      octx.fillStyle = '#fff';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.font = '700 ' + (rows * 0.98) + 'px ' + MONO;
      octx.fillText(txt, cols / 2, rows / 2);
      var data = octx.getImageData(0, 0, cols, rows).data;

      /* pass 2 — one dot per covered cell, at device resolution */
      var w = cols * CELL, h = rows * CELL;
      gCanvas.width = Math.round(w * dpr);
      gCanvas.height = Math.round(h * dpr);
      gCanvas.style.width = w + 'px';
      gCanvas.style.height = h + 'px';
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gctx.clearRect(0, 0, w, h);
      gctx.fillStyle = 'rgba(255,255,255,0.34)';
      var r = CELL * 0.34;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          if (data[(y * cols + x) * 4 + 3] < 110) continue;   /* coverage */
          gctx.beginPath();
          gctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, r, 0, 6.2832);
          gctx.fill();
        }
      }
    }
    window.addEventListener('resize', function () { paintGhost(gLast, true); });
    /* The first paint happens before projects-ledger.js has loaded, so slide
       01 got the old bare numeral; the ledger calls this once it is ready. */
    window.__corridorRepaintGhost = function () { if (gLast) paintGhost(gLast, true); };

    var hideTimer = null;
    /* Chrome fires synthetic pointermove (same coords) when the page
       scrolls under a stationary cursor — only real travel counts */
    var lastPX = -1, lastPY = -1;
    document.addEventListener('pointermove', function (e) {
      var moved = lastPX >= 0 && Math.abs(e.clientX - lastPX) + Math.abs(e.clientY - lastPY) > 2;
      lastPX = e.clientX; lastPY = e.clientY;
      if (!moved) return;
      counter.classList.add('show');
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { counter.classList.remove('show'); }, 1800);
    });


    /* A dot-matrix mask is a repeating tile: translate it by a fraction of
       a device pixel and every dot edge is resampled, which reads as
       travelling moire across the glyph. Whole-pixel offsets reproduce the
       raster exactly. */
    function snapPx(v) {
      var d = window.devicePixelRatio || 1;
      return (Math.round(v * d) / d).toFixed(2);
    }

    /* DETENT_HOLD 0 = constant glide (every project feels the same),
       1 = full smootherstep (hard station-to-station indexing).
       0.78 dwells long enough to read as a lock without feeling stuck. */
    var DETENT_HOLD = 0.78;
    /* Degrees of yaw at full offset. Positive turns a passing panel to face
       the centre of the screen. */
    var YAW = 11;

    /* Travel must come from the slide's OWN width, not a fixed vw figure.
       At the handoff each slide sits at |P| = 0.5^1.72 = 0.303 of full
       travel, so the two in flight are 0.606 x travel apart — that has to
       exceed the slide width or they overlap as they pass. A desktop slide
       is ~54% of the viewport and 90vw was fine; a mobile slide is ~90% of
       it, and the same 90vw put them 213px apart while they were 351px
       wide. Deriving it per slide fixes every width at once. */
    var travels = [], heights = [], stageH = 0, hdrH = 0;
    function measureTravel() {
      for (var i = 0; i < N; i++) {
        var w = slides[i].offsetWidth || window.innerWidth * 0.8;
        travels[i] = (w + 26) / 0.606;
        heights[i] = slides[i].offsetHeight;
      }
      stageH = stage.offsetHeight || window.innerHeight;
      var hd = document.querySelector('.site-header');
      hdrH = hd ? hd.offsetHeight : 0;
    }
    measureTravel();
    window.addEventListener('resize', measureTravel);
    window.addEventListener('load', measureTravel);   /* images settle heights */
    window.addEventListener('load', measureTravel);
    function detent(u) {
      var i = Math.floor(u);
      var t = u - i;
      var s = t * t * t * (t * (t * 6 - 15) + 10);
      return i + t + (s - t) * DETENT_HOLD;
    }

    var KBD = false;
    document.addEventListener('keydown', function (e) { if (e.key === 'Tab') KBD = true; });
    sec.addEventListener('focusin', function (e) {
      var sl = e.target.closest && e.target.closest('.sc-slide');
      if (!sl) return;
      var i = Array.prototype.indexOf.call(slides, sl);
      /* the browser scrolls overflow:hidden boxes to reveal focus; the stage
         must never move sideways, the corridor does the travelling */
      stage.scrollLeft = 0; stage.scrollTop = 0;
      requestAnimationFrame(function () { stage.scrollLeft = 0; stage.scrollTop = 0; });
      if (i >= 0 && i !== lastActive) window.scrollTo({ top: Math.round(stationY(i)), behavior: 'instant' });
    });

    function scTick() {
      var r = sec.getBoundingClientRect();
      /* how far the pinned stage has been carried up past its release, as the
         contact band follows the corridor */
      var over = Math.max(0, (stageH || window.innerHeight) - r.bottom);
      stage.classList.toggle('released', over > 0);
      var p = Math.max(0, Math.min(1, -r.top / RUNWAY));
      sp += (p - sp) * 0.085;

      /* DETENT — this is what makes a project "snap into place".
         Raw scroll advances the timeline at a constant rate, so every
         project reads identically and nothing ever arrives. Smootherstep
         has zero slope at both ends, so remapping the fractional part of
         the timeline makes it crawl while a project is seated and sprint
         through the gap between two. Whole numbers are untouched, so a
         station still lands exactly on its slide. */
      /* FIX: scroll -> station is now a straight division by one station's
         worth of pixels, so every slide dwells for the same distance and
         station i always sits at LEAD_PX + i * STATION. */
      var u = detent((sp * RUNWAY - LEAD_PX) / STATION);
      var active = Math.max(0, Math.min(N - 1, Math.round(u)));
      if (counter && active !== lastActive) {
        lastActive = active;
        /* same name the index row uses (titleOf): the first h3 gave "AVR Drone"
           for the Hardware slide and "This site runs a second site" for Win95.sys */
        counter.innerHTML = '<b>' + ('0' + (active + 1)).slice(-2) + ' / ' + ('0' + N).slice(-2) + '</b> \u00b7 ';
        counter.appendChild(document.createTextNode(titleOf(slides[active]).trim()));
        paintGhost('0' + (active + 1));
      }

      /* ghost numeral: drifts against the slides, fades through handoffs.
         Fully gone by |gq|=0.33 so it never rests visibly off-center
         at the LEAD entrance (gq=-0.35). Drifts on X now that the slides
         traverse horizontally, at a slower rate so it reads as further
         back. Snapped to whole device pixels: the dot-matrix mask
         resamples on a fractional translate and shimmers otherwise. */
      var gq = u - active;
      var gx = gq * 9 * window.innerWidth / 100;
      ghost.style.transform = 'translate3d(' + snapPx(gx) + 'px,0,0)';
      ghost.style.opacity = Math.max(0, 1 - Math.abs(gq) * 3.05).toFixed(3);


      for (var i = 0; i < N; i++) {
        /* LEAD gives slide 0 a rise-in entrance as the section pins,
           instead of starting dead-centered. Read off the DETENTED
           timeline so the slides seat on the same stations the counter
           and ghost numeral do. */
        var q = u - i;
        q = Math.max(-1.5, Math.min(1.5, q));
        var el = slides[i];
        var abs = Math.abs(q);

        /* Hold the slide fully opaque while it is anywhere near centre —
           it only starts fading once it is genuinely on its way out, so
           the copy you are reading is never dimmed. */
        var op = abs < 0.46 ? 1 : Math.max(0, 1 - (abs - 0.46) / 0.52);
        if (op <= 0.001) {
          /* Hidden slides were visibility:hidden, which also took their links
             out of the tab order: Tab went from slide 01 straight to "Email
             me". Once someone is using the keyboard, they stay focusable
             (still fully transparent, still click-through). */
          el.style.visibility = KBD ? 'visible' : 'hidden';
          el.style.pointerEvents = 'none';
          continue;
        }
        el.style.visibility = 'visible';
        /* Reveal a little before the slide seats. The staggered content
           transitions run up to 0.28s, so triggering at the 0.5 handoff
           left an empty panel visible while it arrived; starting at 0.62
           means the project is fully formed by the time it locks in. */
        el.classList.toggle('active', abs < 0.62);
        el.style.pointerEvents = abs < 0.28 ? 'auto' : 'none';
        el.style.zIndex = String(100 - Math.round(abs * 20));

        /* Hang-at-centre. Raising |q| to a power >1 makes the slide cross
           fast at the edges and almost stop in the middle, where it is
           readable — the same "objects passing a camera" beat wodniack
           gets from GSAP slow(0.15,0.6), without the dependency. */
        /* P > 0 parks the slide to the RIGHT of centre. q is positive once a
           slide has been passed, so P negates it: upcoming slides wait on
           the right, cross through centre, and leave to the left. */
        var P = -(q < 0 ? -1 : 1) * Math.pow(abs, 1.72);

        /* One monotonic curve per axis and nothing else. Two things used to
           break the smoothness here and both were holdovers from the old
           vertical lift:
             · a damped SINE settle, which oscillated the panel back and
               forth in X on approach instead of easing into place, and
             · scroll-velocity tilt added to the yaw of every slide — so the
               project you were reading bent while you scrolled and sprang
               back when you stopped. Nothing at centre should move.
           Yaw is signed off P so a panel turns to FACE the centre as it
           passes, which reads as a corridor rather than a fan. */
        var sc = 1 - Math.min(0.06, abs * 0.06);
        /* RELEASE HOLD. When the corridor lets go, the whole stage rises with
           the page to make room for the contact band. On a short window that
           climb is bigger than the air above the seated card, so slide 06 went
           under the header (pre-deploy review F4). Hold the card just under
           the header while the stage rises, until the contact band arrives
           beneath it; from there it leaves with the band. Zero while pinned. */
        var cy = 0;
        if (over > 0) {
          var cTop = ((stageH || window.innerHeight) - (heights[i] || 0)) / 2;
          cy = Math.max(0, Math.min(over - (cTop - hdrH - 12), cTop - 12));
        }
        el.style.transform =
          'translate(-50%, -50%) translate3d(' + (P * (travels[i] || 600)).toFixed(2) + 'px, ' + cy.toFixed(1) + 'px, ' +
          (-(P * P) * 14).toFixed(2) + 'rem) rotateY(' + (P * YAW).toFixed(2) + 'deg) ' +
          'scale(' + sc.toFixed(3) + ')';
        el.style.opacity = op.toFixed(3);

        /* depth: slides soften only well off-centre; media drifts inside */
        var bl = Math.min(3.2, Math.max(0, abs - 0.46) * 6);
        el.style.filter = bl > 0.1 ? 'blur(' + bl.toFixed(2) + 'px)' : '';
        el.style.setProperty('--q', q.toFixed(3));
      }
      publishFrame(stage, slides, sp, u, active);
      requestAnimationFrame(scTick);
    }
    requestAnimationFrame(scTick);

    window.__corridor = {
      N: N,
      mode: 'desktop',
      stationY: stationY,
      station: function () { return STATION; },
      active: function () { return lastActive; },
      runway: function () { return RUNWAY; },
      remeasure: function () { layout(); measureTravel(); }
    };
  })();

})();
