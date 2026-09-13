/* ============================================================
   THE HEAD — projects-marquee.js  (projects page only)
   LED MARQUEE
   "Projects" in the same dot vocabulary as the corridor's ghost
   numerals (scroll-fx.js paintGhost): draw the word once at ONE
   PIXEL PER CELL, read that back, then light a dot for every cell
   the glyph actually covers. Quantising to the grid is the point —
   a CSS dot mask over live type punches holes through the strokes.

   Two things the numerals do not do:
   · a very slow per-dot shimmer, the sand's own breathing, never a blink;
   · the T4 Merge language from the hero seam — over the first 120 px of
     scroll the bottom rows loosen off the grid, shrink and shed 1 px
     grains downward, so the head comes apart into sand as it leaves.
   ============================================================ */
(function () {
  'use strict';

  var host = document.getElementById('proj-title');
  var canvas = document.getElementById('pt-led');
  if (!host || !canvas) return;
  var ctx = canvas.getContext('2d');
  var oCanvas = document.createElement('canvas');
  var octx = oCanvas.getContext('2d', { willReadFrequently: true });

  var cs = getComputedStyle(document.documentElement);
  var SANS = cs.getPropertyValue('--font').trim() || 'sans-serif';

  /* the ghost numerals' vocabulary: dot radius 0.34 of the pitch, #eaeaea at
     0.34 alpha. Their pitch is sized so a glyph is ~34 cells tall; a 143 px
     title box at that ratio would be a 4 px pitch, which stops reading as an
     LED sign, so the marquee uses the fixed 8 px pitch the mobile ghost uses
     (styles.css, .sc-mghost mask-size). */
  var PITCH = 8;
  var SHED_ROOM = 46;          /* canvas room below the grid for falling grains */
  var ALPHA = 0.34;
  var WORD = 'Projects';

  var grid = null;             /* { cell, cols, rows, lit:[i0,i1,...], w, h, dpr } */
  var lastKey = '';

  function hh(a, b) {          /* stable per dot hash: nothing may flicker */
    var s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  /* ── THE CRUMBLE ────────────────────────────────────────────────
     The head's own way of coming apart, lifted out of the draw loop so that
     it is the ONE implementation: lab-numbers.js runs the N3 ledger's rows
     through these same three functions at its own pitch, so the ledger
     shedding into the bed and the title shedding into the bed are the same
     motion and not two effects that look alike.
       cell  where a cell goes as it loosens off the grid, and what is left
             of it: a hashed angle, a quadratic ease, always a little
             downward, shrinking and dimming as it goes.
       n     how many grains that cell throws.
       grain where one of those grains lands, and how it shimmers on the way.
     k scales every distance to the caller's pitch — 1 for the head's 8 px
     dot grid, less for type, which is finer. */
  var CR = window.__crumble = {
    hash: hh,
    cell: function (mt, hA, k) {
      var ang = hA * 6.2832, loose = mt * mt;
      return { dx: Math.cos(ang) * loose * 9 * k,
               dy: Math.sin(ang) * loose * 6 * k + loose * 7 * k,
               r: 1 - 0.6 * mt, a: 1 - 0.72 * mt };
    },
    n: function (mt) { return mt > 0.12 ? 1 + Math.floor(mt * 3.4) : 0; },
    grain: function (mt, hk, hk2, hB, t, k) {
      var gan = hk * 6.2832, grr = (2 + 15 * mt) * (0.35 + 0.65 * hk2) * k;
      return { dx: Math.cos(gan) * grr,
               dy: Math.abs(Math.sin(gan)) * grr * 0.9 + (mt * 14 + hB * 10) * k,
               a: 0.55 + 0.45 * Math.sin(t * 1.7 + hk * 40) };
    }
  };

  function build() {
    var box = host.getBoundingClientRect();
    var fs = parseFloat(getComputedStyle(host).fontSize) || 166;
    /* Capped: the canvas sits inside the box it measures, so without the
       stylesheet (stale edge cache, failed load) each build grew the box it
       then measured. One line of type is never wider than the window or
       taller than ~1.6 of its own font size. */
    var W = Math.max(80, Math.min(Math.round(box.width), window.innerWidth));
    var H = Math.max(40, Math.min(Math.round(box.height), Math.round(fs * 1.6)));
    var dpr = window.devicePixelRatio || 1;
    var key = W + 'x' + H + ':' + fs.toFixed(1) + ':' + dpr;
    if (key === lastKey) return;
    lastKey = key;

    /* Phones: at the desktop's 8 px pitch a phone-sized title is only 6 to 10
       rows, which cannot form "Projects" (Hudson, 2026-09-12: "the projects
       dot text is off"; it read as blobs). Keep the LOOK rather than the dot
       size: every glyph gets ~17 cells of font size, so the phone head is the
       desktop head scaled down, never a coarser one. Desktop (fs >= 128px)
       keeps the fixed 8 px pitch the ledger figures share. */
    var FINE = fs / PITCH < 16;
    /* At phone resolution the desktop's tight -0.045em tracking fused e-c-t
       into one mass, so the fine grid tracks open enough for a clear column
       between letters; the pitch is then chosen so the word, at ~17 cells of
       font, still fits the column with a cell to spare. */
    var TRACK = FINE ? '0.05em' : '-0.045em';
    var cell = PITCH;
    if (FINE) {
      octx.font = '750 100px ' + SANS;
      try { octx.letterSpacing = TRACK; } catch (e) { /* Chrome 99+ */ }
      var perPx = octx.measureText(WORD).width / 100;
      cell = Math.max(3.5, Math.min(fs / 17, W / (perPx * 17 + 1)));
    }
    var fsC = FINE ? 17 : fs / cell;      /* font size in cells */
    var cols = Math.ceil(W / cell);

    /* measure the ink first: the grid is sized to it, not to the line box */
    function setType() {
      octx.fillStyle = '#fff';
      octx.textAlign = 'left';
      octx.textBaseline = 'alphabetic';
      octx.font = '750 ' + fsC + 'px ' + SANS;
      try { octx.letterSpacing = TRACK; } catch (e) { /* Chrome 99+; harmless elsewhere */ }
    }
    setType();
    var m = octx.measureText(WORD);
    var asc = m.actualBoundingBoxAscent || fsC * 0.72;
    var desc = m.actualBoundingBoxDescent || fsC * 0.21;
    /* The grid used to be the title's LINE box (line-height 0.86) with the
       ink centred in it, and the ink is taller than that box, so the top of
       the word and the j's descender were sheared off (Hudson, 2026-09-12:
       "the J is off"). It is now the INK plus one clear row above and below;
       the canvas is absolutely positioned, so the extra rows hang into the
       space under the title and move nothing. The cap line still rides at
       the top of the box, one row down, where the real type sits. */
    var baseline = 1 + Math.ceil(asc);    /* whole cells, so row 0 stays clear */
    var rows = Math.max(Math.ceil(H / cell), baseline + Math.ceil(desc) + 1);

    /* pass 1 — one pixel per cell, so a pixel IS a cell */
    oCanvas.width = cols; oCanvas.height = rows;   /* resets the context */
    octx.clearRect(0, 0, cols, rows);
    setType();
    octx.fillText(WORD, 0, baseline);
    var data = octx.getImageData(0, 0, cols, rows).data;

    var lit = [];
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        if (data[(y * cols + x) * 4 + 3] < 110) continue;   /* coverage, as the numerals */
        lit.push(y * cols + x);
      }
    }

    var cw = W, ch = rows * cell + SHED_ROOM;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    grid = { cell: cell, cols: cols, rows: rows, lit: lit, w: cw, h: ch, dpr: dpr,
             gridH: rows * cell, shed: SHED_ROOM };
    /* The live type underneath is hidden only once the matrix is genuinely
       carrying the word. Hiding it in the stylesheet instead would leave the
       title invisible on a browser that cannot give us a 2D context, or with
       JavaScript off entirely. */
    if (lit.length) document.documentElement.classList.add('pt-led');
  }

  function draw(t) {
    if (!grid) return;
    var g = grid, cell = g.cell;
    ctx.clearRect(0, 0, g.w, g.h);

    /* the head going away: the first 120 px of scroll */
    var mtAll = Math.max(0, Math.min(1, window.pageYOffset / 120));
    var r = cell * 0.34;
    var K = cell / PITCH;              /* crumble distances follow the pitch */

    for (var k = 0; k < g.lit.length; k++) {
      var idx = g.lit[k];
      var cy = (idx / g.cols) | 0, cx = idx % g.cols;
      var x = cx * cell + cell / 2, y = cy * cell + cell / 2;
      var h1 = hh(cx * 1.7 + 0.3, cy * 5.3);
      /* very slow shimmer, like the sand: never a blink */
      var a = ALPHA * (0.80 + 0.20 * Math.sin(t * 0.55 + h1 * 6.2832));
      var rr = r;

      /* MERGE — bottom rows first, exactly the hero's T4 language */
      var rowFrac = g.rows > 1 ? cy / (g.rows - 1) : 1;
      var mt = Math.max(0, Math.min(1, mtAll * 1.75 - (1 - rowFrac) * 0.95));
      if (mt > 0) {
        var hA = hh(cx * 13.7 + 1.3, cy * 7.9), hB = hh(cx * 3.1 + 5.0, cy * 11.3);
        var cl = CR.cell(mt, hA, K);
        x += cl.dx; y += cl.dy; rr *= cl.r;
        var ng = CR.n(mt);
        for (var gk = 0; gk < ng; gk++) {
          var hk = hh(cx * 31.3 + gk * 17.1, cy * 5.7 + gk * 3.3);
          var hk2 = hh(cx * 9.9 + gk * 7.7, cy * 13.1 + gk);
          var gr = CR.grain(mt, hk, hk2, hB, t, K);
          var gA = Math.min(0.9, a * 0.9 * mt * gr.a + 0.05 * mt);
          if (gA > 0.02) {
            ctx.fillStyle = 'rgba(234,234,234,' + gA.toFixed(3) + ')';
            /* 1 px grains, always falling downward */
            ctx.fillRect(Math.round(x + gr.dx), Math.round(y + gr.dy), 1, 1);
          }
        }
        a *= cl.a;
        if (a < 0.015) continue;
      }

      ctx.fillStyle = 'rgba(234,234,234,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, 6.2832);
      ctx.fill();
    }
  }

  /* The loop used to call build() every frame, which reads layout
     (getBoundingClientRect + getComputedStyle) on each one, and it kept
     drawing long after the head had scrolled away: the pre-deploy review
     measured ~4x HEAD's scroll hitches on a slower desktop. Now build() runs
     only when something can have changed its size, and the loop sleeps
     while the head is off screen or the tab is hidden. */
  var rafId = null, last = -1, onScreen = true, dirty = true;
  function frame(ts) {
    rafId = null;
    if (!onScreen || document.hidden) return;
    rafId = requestAnimationFrame(frame);
    if (dirty) { dirty = false; build(); }
    var t = ts / 1000;
    if (t - last < 0.042) return;        /* ~24 fps: a shimmer, not a strobe */
    last = t;
    draw(t);
  }
  function wake() { if (!rafId && onScreen && !document.hidden) rafId = requestAnimationFrame(frame); }
  function remeasure() { lastKey = ''; dirty = true; wake(); }
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  document.addEventListener('visibilitychange', wake);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      onScreen = es[es.length - 1].isIntersecting;
      wake();
    }, { rootMargin: '120px 0px' }).observe(canvas);
  }
  wake();

  /* the corridor re-measures on resize; the head does too */
  window.__marquee = {
    remeasure: function () { lastKey = ''; dirty = false; build(); draw(performance.now() / 1000); wake(); },
    grid: function () { return grid; },
    canvas: canvas
  };
})();
