/* ============================================================
   THE LEDGER — projects-ledger.js  (projects page only)

   The corridor shipped with three unrelated numbering systems: the
   giant .sc-ghost numeral behind the slide, the .sc-counter "01 / 06",
   and the .proj-index rail's .idx. No shared scale, weight, colour
   logic or alignment, which is exactly what reads as incoherent.

   This makes them one system, and says what the number MEANS rather
   than only restyling it. The figure behind each slide is that
   project's own headline RESULT with its unit under it, drawn as an
   LED dot matrix at the same 8 px pitch as the head's marquee, so the
   background figure is made of the same grain as everything else on
   the page; every index row carries the same figure; and the bare
   01 / 06 survives only in the counter, where it is navigation.

   THE ROWS SHED. The index rows are part of the head, so they leave
   with it: scroll the head away and each row comes apart into grain
   and falls into the bed, through window.__crumble — the very
   functions the head's own dots come apart through, so the head and
   the ledger are one idea and not two effects that look alike.
   Nothing sheds until its row has risen into the top fifth of the
   screen: a row is never crumbling while it is still the thing you
   are meant to be reading.
   ============================================================ */
(function () {
  'use strict';

  var PITCH = 8;                 /* the head marquee's pitch, shared exactly */
  var ALPHA = 0.34;              /* and its dot alpha */
  var CAP_ALPHA = 0.42;          /* the unit is quieter than the figure, never faint */

  var LEDGER = [
    { fig: '700+', unit: 'locations run · 2025 – 2026', row: '700+ locations', src: '700+ locations' },
    { fig: '13%',  unit: 'ahead of the S&P · agentic strategy', row: '13% over the S&P', src: null },
    { fig: 'DEMO', unit: 'Sam’s Club challenge · spring 2026', row: 'Demo Day', src: 'Demo Day, Spring 2026' },
    { fig: '2026', unit: 'desktop app · Python · OpenCV', row: '2026',           src: '2026' },
    { fig: '2nd',  unit: 'in the country · technical presentation', row: '2nd in the country', src: '2nd in the country for technical presentation' },
    { fig: '95',   unit: 'Windows 95, inside this site · ongoing', row: 'Windows 95',     src: 'Windows 95' }
  ];

  /* ---- the giant figure behind the slide ---- */
  window.__projGhostPaint = function (txt, gC, gx, oC, ox, MONO) {
    var idx = Math.max(0, Math.min(LEDGER.length - 1, (parseInt(txt, 10) || 1) - 1));
    var body = LEDGER[idx].fig;
    var cap = LEDGER[idx].unit;
    var dpr = window.devicePixelRatio || 1;
    var size = Math.min(window.innerHeight * 0.56, window.innerWidth * 0.44);
    var CELL = PITCH;
    var rows = Math.max(10, Math.round(size / CELL));
    /* A four-glyph figure at the same pitch would run off the stage, so the
       matrix gets shorter — never coarser. The pitch is the whole point.
       ROUND 5: a figure may now be two WORDS ("DEMO DAY"), and eight glyphs on
       one line is a strip so short it disappears behind the card — the fit
       rule shrinks the glyph until the whole line clears the stage. So a space
       stacks instead: each word is laid out on its own band of the same
       matrix, the width is set by the LONGEST word, and the height is shared
       between them. Two words therefore read at very nearly the size one
       four-glyph figure does, which is the size the ghost was designed at. */
    var lines = body.split(' ');
    var longest = lines.reduce(function (a, b) { return a.length >= b.length ? a : b; });
    var fit = Math.floor(((window.innerWidth * 0.86) / CELL - 4) / (0.62 * longest.length));
    rows = Math.max(10, Math.min(rows, fit));
    if (lines.length > 1) rows = Math.max(10, Math.min(rows, Math.round(size / (CELL * lines.length))));
    var R = rows * lines.length;            /* the whole matrix, all bands */

    var FONT = '700 ' + (rows * 0.98) + 'px ' + MONO;
    oC.width = 1024; oC.height = R;
    ox.font = FONT;
    var cols = 0;
    for (var q = 0; q < lines.length; q++) cols = Math.max(cols, Math.ceil(ox.measureText(lines[q]).width) + 4);
    cols = Math.min(1024, cols);
    oC.width = cols; oC.height = R;
    ox.clearRect(0, 0, cols, R);
    ox.fillStyle = '#fff';
    ox.textAlign = 'left';
    ox.textBaseline = 'middle';
    ox.font = FONT;                         /* resizing the canvas resets it */
    for (var L = 0; L < lines.length; L++) ox.fillText(lines[L], 2, rows * L + rows / 2);
    var data = ox.getImageData(0, 0, cols, R).data;

    var capH = cap ? 36 : 0;
    var w = cols * CELL, h = R * CELL + capH;
    gC.width = Math.round(w * dpr); gC.height = Math.round(h * dpr);
    gC.style.width = w + 'px'; gC.style.height = h + 'px';
    gx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gx.clearRect(0, 0, w, h);
    gx.fillStyle = 'rgba(234,234,234,' + ALPHA.toFixed(3) + ')';
    var r = CELL * 0.34;
    for (var y = 0; y < R; y++) {
      for (var x = 0; x < cols; x++) {
        if (data[(y * cols + x) * 4 + 3] < 110) continue;   /* coverage, as the head */
        gx.beginPath();
        gx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, r, 0, 6.2832);
        gx.fill();
      }
    }
    if (cap) {
      gx.fillStyle = 'rgba(234,234,234,' + CAP_ALPHA.toFixed(2) + ')';
      gx.textAlign = 'center';
      gx.textBaseline = 'alphabetic';
      try { gx.letterSpacing = '0.18em'; } catch (e) { /* Chrome 99+ */ }
      gx.font = '11px ' + MONO;
      gx.fillText(cap.toUpperCase(), w / 2, R * CELL + 24);
    }
  };

  var shedCv = null, shedCtx = null, offC = null, offX = null;
  var shedRows = null, shedKey = '', shedRaf = null;
  var CELL = 2;                        /* the ledger's pitch: type is finer than the head's 8 px */
  var KL = 0.55;                       /* and its crumble is scaled to it */
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* The rows shed INTO the desktop corridor's sand bed. Touch devices keep the
     plain flow and have no bed, and there the shed read as the index text
     tearing and doubling (Hudson, 2026-09-12: "make sure mobile looks cool"),
     so without the corridor the rows simply scroll. */
  var FX = document.documentElement.classList.contains('fx');

  function lumOf(css) {
    var m = /rgba?\(([^)]+)\)/.exec(css || '');
    if (!m) return 1;
    var p = m[1].split(',').map(parseFloat);
    return Math.min(1, ((p[0] + p[1] + p[2]) / 3 / 234) * (p.length > 3 ? p[3] : 1));
  }

  function buildShed() {
    var index = document.getElementById('proj-index');
    var host = document.getElementById('projects');
    if (!FX || !index || !host || !window.__crumble) { shedRows = null; return; }
    var lis = index.querySelectorAll('li');
    if (!lis.length || !index.offsetParent) { shedRows = null; return; }
    var hb = host.getBoundingClientRect(), ib = index.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var key = [Math.round(ib.width), Math.round(ib.height), Math.round(ib.left - hb.left),
               Math.round(ib.top - hb.top), lis.length, dpr].join('|');
    if (key === shedKey && shedRows) return;
    shedKey = key;
    if (!shedCv) {
      shedCv = document.createElement('canvas');
      shedCv.id = 'ledger-shed';
      shedCv.setAttribute('aria-hidden', 'true');
      shedCv.style.cssText = 'position:absolute;left:0;top:0;z-index:2;pointer-events:none;';
      host.appendChild(shedCv);
      shedCtx = shedCv.getContext('2d');
      offC = document.createElement('canvas');
      offX = offC.getContext('2d', { willReadFrequently: true });
    }
    var PAD = 56;                                  /* room under the last row for the fall */
    var W = Math.max(8, Math.ceil(ib.width)), H = Math.max(8, Math.ceil(ib.height) + PAD);
    shedCv.style.left = Math.round(ib.left - hb.left) + 'px';
    shedCv.style.top = Math.round(ib.top - hb.top) + 'px';
    shedCv.style.width = W + 'px';
    shedCv.style.height = H + 'px';
    shedCv.width = Math.round(W * dpr);
    shedCv.height = Math.round(H * dpr);
    shedCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    shedRows = [];
    for (var i = 0; i < lis.length; i++) {
      var btn = lis[i].querySelector('button') || lis[i];
      var rb = btn.getBoundingClientRect();
      if (rb.width < 8 || rb.height < 6) continue;
      var rw = Math.ceil(rb.width), rh = Math.ceil(rb.height);
      offC.width = rw; offC.height = rh;
      offX.clearRect(0, 0, rw, rh);
      offX.textBaseline = 'middle';
      offX.textAlign = 'left';
      var spans = btn.querySelectorAll('span');
      for (var k = 0; k < spans.length; k++) {
        var sp = spans[k], txt = (sp.textContent || '').trim();
        if (!txt) continue;
        var cs = getComputedStyle(sp), sb = sp.getBoundingClientRect();
        if (sb.width < 1) continue;
        if (cs.textTransform === 'uppercase') txt = txt.toUpperCase();
        offX.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        /* AFTER the font: setting font resets letterSpacing, and the index's
           figures are tracked out 0.1em — without this the canvas copy drifts
           against the DOM row it is taking over from, and the handover shows
           as doubled type. */
        try { offX.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing; } catch (e) { /* Chrome 99+ */ }
        offX.fillStyle = 'rgba(234,234,234,' + lumOf(cs.color).toFixed(3) + ')';
        offX.fillText(txt, sb.left - rb.left, sb.top - rb.top + sb.height / 2);
      }
      var d = offX.getImageData(0, 0, rw, rh).data;
      var cells = [];
      for (var y = 0; y < rh; y += CELL) {
        for (var x = 0; x < rw; x += CELL) {
          var best = 0;
          for (var yy = y; yy < Math.min(rh, y + CELL); yy++)
            for (var xx = x; xx < Math.min(rw, x + CELL); xx++) {
              var a = d[(yy * rw + xx) * 4 + 3];
              if (a > best) best = a;
            }
          if (best > 60) cells.push([x, y, best / 255]);
        }
      }
      shedRows.push({ li: lis[i], cells: cells,
                      x: rb.left - ib.left, y: rb.top - ib.top, w: rw, h: rh });
    }
  }

  /* a row's own progress: 0 until its top has risen into the top fifth of the
     screen, 1 a hundred and fifty pixels of scroll later. */
  function rowK(row) {
    if (REDUCED || !FX) return 0;
    var r = row.li.getBoundingClientRect();
    return Math.max(0, Math.min(1, (window.innerHeight * 0.18 - r.top) / 150));
  }

  function drawShed(t) {
    if (!shedRows || !shedCtx) return;
    var CRb = window.__crumble;
    shedCtx.clearRect(0, 0, shedCv.width, shedCv.height);
    var first = 0;
    for (var i = 0; i < shedRows.length; i++) {
      var row = shedRows[i], k = rowK(row);
      if (i === 0) first = k;
      row.li.style.setProperty('--shed', k.toFixed(3));
      if (k <= 0.001 || k >= 0.999) continue;
      var fade = 1 - Math.max(0, Math.min(1, (k - 0.82) / 0.18));
      /* the handover is quick: the DOM row fades out and the canvas fades in
         over the first eighth of the shed, which is twelve pixels of scroll,
         so the two are never both legible at once. */
      var into = Math.min(1, k * 8);
      for (var c = 0; c < row.cells.length; c++) {
        var cell = row.cells[c], cx = cell[0], cy = cell[1];
        /* bottom of the row first, exactly as the head sheds its bottom rows first */
        var yF = row.h > 1 ? cy / (row.h - 1) : 1;
        var mt = Math.max(0, Math.min(1, k * 1.75 - (1 - yF) * 0.95));
        var hA = CRb.hash(cx * 13.7 + 1.3 + i * 31.0, cy * 7.9);
        var cl = CRb.cell(mt, hA, KL);
        var X = row.x + cx + cl.dx;
        /* and the whole row sinks as it goes: it is falling into the bed, not
           dissolving where it stands */
        var Y = row.y + cy + cl.dy + mt * mt * 30;
        var a = cell[2] * into * fade * (mt > 0 ? cl.a : 1);
        if (a > 0.012) {
          var sz = Math.max(1, CELL * (mt > 0 ? cl.r : 1));
          shedCtx.fillStyle = 'rgba(234,234,234,' + a.toFixed(3) + ')';
          shedCtx.fillRect(X, Y, sz, sz);
        }
        if (mt <= 0.12) continue;
        /* a quarter of the cells throw grains: at a 2 px pitch every cell
           throwing four would be thousands of rects a frame for a sweep that
           lasts under a second, and the eye cannot tell the difference. */
        if (CRb.hash(cx * 2.3, cy * 7.1 + i) > 0.25) continue;
        var ng = CRb.n(mt);
        for (var g = 0; g < ng; g++) {
          var hk = CRb.hash(cx * 31.3 + g * 17.1, cy * 5.7 + g * 3.3 + i);
          var hk2 = CRb.hash(cx * 9.9 + g * 7.7, cy * 13.1 + g);
          var hB = CRb.hash(cx * 3.1 + 5.0, cy * 11.3 + i);
          var gr = CRb.grain(mt, hk, hk2, hB, t, KL);
          var gA = Math.min(0.9, cell[2] * 0.9 * mt * gr.a + 0.05 * mt) * fade;
          if (gA <= 0.02) continue;
          shedCtx.fillStyle = 'rgba(234,234,234,' + gA.toFixed(3) + ')';
          shedCtx.fillRect(Math.round(X + gr.dx), Math.round(Y + gr.dy + mt * 16), 1, 1);
        }
      }
    }
    var idx = document.getElementById('proj-index');
    if (idx) idx.style.setProperty('--shedTop', first.toFixed(3));
  }

  function shedTick(ts) {
    shedRaf = requestAnimationFrame(shedTick);
    buildShed();
    if (!shedRows) return;
    drawShed(ts / 1000);
  }
  shedRaf = requestAnimationFrame(shedTick);
  window.addEventListener('resize', function () { shedKey = ''; });

  /* the phone corridor's own small ghost carries the same decision */
  window.__projGhostText = function (i) {
    return LEDGER[Math.max(0, Math.min(LEDGER.length - 1, i))].fig;
  };

  /* ---- the index rows carry the same figure the slide does ---- */
  function decorateIndex() {
    var btns = document.querySelectorAll('#proj-index li button');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].querySelector('.nfig') || !LEDGER[i]) continue;
      var sp = document.createElement('span');
      sp.className = 'nfig';
      sp.textContent = LEDGER[i].row;
      btns[i].insertBefore(sp, btns[i].querySelector('.arr') || null);
    }
  }
  decorateIndex();
  /* the phone HUD's ghost is built by scroll-fx before this module exists */
  var mg = document.querySelector('.sc-mghost');
  if (mg) mg.textContent = window.__projGhostText(0);
  /* ...and so is the desktop ghost's first paint: redraw it as a ledger figure */
  if (window.__corridorRepaintGhost) window.__corridorRepaintGhost();
})();
