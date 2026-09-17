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

  /* The Sam's Club wordmark, 2020 (Hudson, 2026-09-16: "the old sams club logo",
     picked over the 2026 symbol and the older diamonds): the one even-odd path
     of its public-domain SVG on Wikimedia Commons, "Sam's Club Logo 2020.svg",
     in its own 105.83 x 17.86 box. */
  var SAMS = {
    w: 105.83333, h: 17.862111, rule: 'evenodd',
    paths: [
      'm 94.702704,1.36421 c 0.413509,0.4153 0.413509,1.08959 0,1.50489 l -6.030249,6.06285 6.031143,6.05972 a 1.0699408,1.0699408 0 0 1 0,1.50801 L 93.34831,17.86211 85.179963,9.65492 a 1.0252855,1.0252855 0 0 1 0,-1.4446 L 93.345629,8.9e-4 Z M 105.5526,8.24872 a 0.96634049,0.96634049 0 0 1 0,1.36199 l -8.206301,8.25096 -1.41736,-1.42406 a 0.98241638,0.98241638 0 0 1 0,-1.38432 L 102.01948,8.93016 95.980739,2.8624 a 1.0587769,1.0587769 0 0 1 0,-1.49193 L 97.343618,0 Z m -23.621754,5.77393 v 0.0898 h -0.25409 v 0.6667 H 81.57405 v -0.6667 h -0.25409 v -0.0902 h 0.610886 z m 0.0911,0 h 0.146023 l 0.216577,0.63946 0.215239,-0.63991 h 0.145129 v 0.75691 h -0.09735 v -0.44655 c 0,-0.0156 0,-0.0411 7.94e-4,-0.0768 7.94e-4,-0.0357 0.0013,-0.0741 0.0013,-0.11521 l -0.215239,0.63857 h -0.101367 l -0.217024,-0.63857 v 0.0232 c 0,0.0188 5.29e-4,0.0469 0.0019,0.0848 l 0.0013,0.0839 V 14.779 h -0.09728 v -0.75691 z m -5.365332,-0.91052 c 1.719228,0 2.898126,-1.37851 2.898126,-3.20402 0,-1.80586 -1.178898,-3.18437 -2.898126,-3.18437 -1.700028,0 -2.878482,1.41736 -2.878482,3.22322 0,1.78621 1.178454,3.16517 2.878482,3.16517 z m 0.483168,1.82551 c -1.487913,0 -2.74362,-0.73815 -3.400499,-2.15551 v 2.00055 H 71.80749 V 1.55847 l 1.931789,-0.38851 v 5.88379 c 0.656879,-1.41781 1.912586,-2.15552 3.400499,-2.15552 2.491767,0 4.482053,1.92241 4.482053,5.02953 0,3.08747 -1.989842,5.00988 -4.482053,5.00988 z M 61.788183,10.76237 V 5.05363 h 1.931789 v 5.86414 c 0,1.2816 0.811387,2.15551 2.163995,2.15551 1.352161,0 2.163995,-0.87346 2.163995,-2.15551 V 5.05363 h 1.931787 v 5.70874 c 0,2.66056 -1.64242,4.15562 -4.095782,4.15562 -2.453809,0 -4.095784,-1.49506 -4.095784,-4.15562 z m -1.354395,4.15562 c -1.989841,0.0777 -3.091039,-0.97081 -3.091039,-3.32012 V 1.55847 l 1.931789,-0.38851 v 10.42791 c 0,0.93195 0.502372,1.35886 1.197655,1.35886 h 0.502372 v 1.90321 a 2.5587482,2.5587482 0 0 1 -0.540329,0.058 z M 47.77714,9.90811 c 0,-3.08747 2.12559,-5.00988 5.08132,-5.00988 1.39102,0 2.62752,0.44656 3.57421,1.39816 l -1.1789,1.45621 c -0.73368,-0.7377 -1.60312,-1.02886 -2.3761,-1.02886 -1.77728,0 -3.03344,1.06771 -3.03344,3.16517 0,2.09746 1.25616,3.20402 3.03344,3.20402 0.77253,0 1.64242,-0.3108 2.39575,-1.08736 l 1.17845,1.43701 c -0.94669,0.95116 -2.16399,1.47541 -3.59341,1.47541 -2.93698,0 -5.08132,-1.92241 -5.08132,-5.00988 z m -11.47507,3.98102 0.86944,-1.76701 c 0.63768,0.46576 1.77728,0.99001 2.64672,0.99001 1.08199,0 1.50711,-0.52425 1.50711,-1.08736 0.0192,-0.66 -0.52157,-0.91275 -1.66162,-1.2816 -1.91259,-0.58231 -2.99458,-1.26196 -2.99458,-3.04862 0,-1.63126 1.23695,-2.79632 3.47775,-2.79632 1.15925,0 2.2216,0.36886 3.07184,0.97081 L 42.34929,7.4811 c -0.50237,-0.3108 -1.35261,-0.77701 -2.2993,-0.77701 -0.83059,0 -1.33296,0.33045 -1.33296,0.97081 0,0.52425 0.36706,0.8739 1.58437,1.24276 2.06754,0.6216 3.09104,1.39815 3.09104,3.02941 0,1.84471 -1.48747,2.97092 -3.55456,2.97092 -1.41111,0 -2.76283,-0.46576 -3.53581,-1.02886 z M 34.90927,2.25732 h 2.08629 L 35.77871,6.08294 H 34.17514 Z M 27.64296,14.76303 H 25.71073 V 8.85961 c 0,-1.22356 -0.63768,-2.15552 -1.93179,-2.15552 -1.41066,0 -2.39576,1.24276 -2.39576,2.83517 v 5.22377 h -1.93223 v -9.7094 h 1.93223 v 1.72816 c 0.57963,-1.22355 1.64198,-1.90276 2.87848,-1.90276 1.29501,0 2.35736,0.67966 2.93653,1.84427 0.81184,-1.28161 1.89339,-1.84427 3.18839,-1.84427 2.02825,0 3.51571,1.53391 3.51571,3.99978 v 5.88422 H 31.97051 V 8.85961 c 0,-1.22356 -0.63768,-2.15552 -1.93224,-2.15552 -1.41021,0 -2.39531,1.24276 -2.39531,2.83517 z M 12.78972,6.72374 c -1.71923,0 -2.89813,1.37851 -2.89813,3.20402 0,1.80586 1.1789,3.18437 2.89813,3.18437 1.70047,0 2.87892,-1.41736 2.87892,-3.22322 0,-1.78621 -1.17889,-3.16517 -2.87892,-3.16517 z m 2.91733,6.05839 c -0.65643,1.4178 -1.91259,2.15551 -3.40006,2.15551 -2.49221,0 -4.48249,-1.92241 -4.48249,-5.02953 0,-3.08747 1.99028,-5.00988 4.48249,-5.00988 1.48747,0 2.74318,0.73771 3.40006,2.15552 V 5.05363 h 1.93223 v 9.70896 h -1.93223 z m -15.70661,1.107 0.86944,-1.76701 c 0.63768,0.46576 1.77728,0.99001 2.64672,0.99001 1.082,0 1.50712,-0.52425 1.50712,-1.08736 0.0192,-0.66 -0.52158,-0.91275 -1.66118,-1.2816 C 1.44906,10.16086 0.36706,9.48121 0.36706,7.69455 c 0,-1.63126 1.23695,-2.79632 3.47776,-2.79632 1.15925,0 2.2216,0.36886 3.07183,0.97081 L 6.04722,7.4811 C 5.54484,7.1703 4.69461,6.70409 3.74791,6.70409 c -0.83058,0 -1.33296,0.33045 -1.33296,0.97081 0,0.52425 0.36707,0.8739 1.58437,1.24276 2.06754,0.6216 3.09104,1.39815 3.09104,3.02941 0,1.84471 -1.48746,2.97092 -3.55456,2.97092 -1.41066,0 -2.76282,-0.46576 -3.5358,-1.02886 z'
    ]
  };

  var LEDGER = [
    { fig: '700+', unit: 'locations run · 2025 – 2026', row: '700+ locations', src: '700+ locations' },
    { fig: '13%',  unit: 'ahead of the S&P · agentic strategy', row: '13% over the S&P', src: null },
    /* Hudson, 2026-09-16: the Sam's Club mark instead of DEMO; the row keeps Demo Day */
    { fig: 'SAMS', logo: SAMS, label: 'Sam’s Club', unit: 'Sam’s Club challenge · spring 2026', row: 'Demo Day', src: 'Demo Day, Spring 2026' },
    /* Hudson, 2026-09-16: 0 instead of 2026. The whole photo-to-tray pipeline runs in the
       browser and photos never leave the device (the demo's own note), so like the 13% it
       is not in this slide's copy: src null. */
    { fig: '0',    unit: 'uploads · runs in your browser', row: '0 uploads',    src: null },
    { fig: '2nd',  unit: 'in the country · technical presentation', row: '2nd in the country', src: '2nd in the country for technical presentation' },
    { fig: '95',   unit: 'Windows 95, inside this site · ongoing', row: 'Windows 95',     src: 'Windows 95' }
  ];

  /* ---- the giant figure behind the slide ----
     Drawn by the same LED renderer as the Hardware photos (projects-dots.js,
     window.__led): 3.7 px dots, brightness with a faint glow, and the same
     diagonal reveal each time a new figure arrives (Hudson, 2026-09-16: "the
     numbers behind need to be in the same style as the image"). The figure
     keeps the size and place it had as an 8 px matrix: the layout is still
     measured in those cells, only the dots are finer. A logo entry is drawn
     from its vector shapes the same way. Without WebGL it falls back to the
     8 px matrix it replaced. */
  var LED_ALPHA = 0.34;          /* about the ink the 8 px matrix put down, glow included */
  var led = null, ledC = null, figPaint = null, ghostEl = null;
  var figId = 0, figRev = 1, figStop = null, figTxt = '', pending = false;

  /* scroll-fx picks the new figure halfway between two slides, where it has
     faded the ghost to nothing: the wave waits until the figure is actually
     fading in, so it is seen whole, and no frame is drawn while it cannot be */
  function ghostOpacity() {
    var o = ghostEl ? parseFloat(ghostEl.style.opacity) : 1;
    return isNaN(o) ? 1 : o;
  }
  function waitVisible() {
    if (!pending) return;
    if (ghostOpacity() > 0.05) {
      pending = false;
      figStop = window.__led.reveal(function (rev) {
        figRev = rev;
        if (rev >= 1 || ghostOpacity() > 0.01) drawFig();
      });
    } else {
      requestAnimationFrame(waitVisible);
    }
  }

  function drawFig() {
    if (!led || !figPaint) return;
    try { led.draw(figPaint, figRev, figId); } catch (e) { /* a figure is never tainted; nothing to do */ }
  }

  function layout(e, ox, MONO) {
    var size = Math.min(window.innerHeight * 0.56, window.innerWidth * 0.44);
    var CELL = PITCH;
    if (e.logo) {
      /* a tall mark is fitted by height, a wide wordmark by width, so either
         sits in the space a figure does */
      var asp = e.logo.w / e.logo.h;
      var lw = Math.min(window.innerWidth * 0.74, size * 0.92 * asp);
      return { logo: true, w: Math.round(lw), h: Math.round(lw / asp) };
    }
    var rows = Math.max(10, Math.round(size / CELL));
    /* A long figure at the same size would run off the stage, so the matrix
       gets shorter; a space stacks words on bands of one shared height. */
    var lines = e.fig.split(' ');
    var longest = lines.reduce(function (a, b) { return a.length >= b.length ? a : b; });
    var fit = Math.floor(((window.innerWidth * 0.86) / CELL - 4) / (0.62 * longest.length));
    rows = Math.max(10, Math.min(rows, fit));
    if (lines.length > 1) rows = Math.max(10, Math.min(rows, Math.round(size / (CELL * lines.length))));
    var font = '700 ' + (rows * 0.98) + 'px ' + MONO;
    ox.font = font;
    var cols = 0;
    for (var q = 0; q < lines.length; q++) cols = Math.max(cols, Math.ceil(ox.measureText(lines[q]).width) + 4);
    cols = Math.min(1024, cols);
    return { logo: false, lines: lines, rows: rows, cols: cols, w: cols * CELL, h: rows * lines.length * CELL };
  }

  function paintMatrix(e, L, gx, oC, ox, MONO) {
    /* the fallback: the 8 px matrix, one pixel per cell, lit where covered */
    var CELL = PITCH, R = L.logo ? Math.round(L.h / CELL) : L.rows * L.lines.length;
    var cols = Math.round(L.w / CELL);
    oC.width = cols; oC.height = R;
    ox.clearRect(0, 0, cols, R);
    ox.fillStyle = '#fff';
    if (L.logo) {
      ox.setTransform(cols / e.logo.w, 0, 0, R / e.logo.h, 0, 0);
      e.logo.paths.forEach(function (d) { ox.fill(new Path2D(d), e.logo.rule || 'nonzero'); });
      ox.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      ox.textAlign = 'left'; ox.textBaseline = 'middle';
      ox.font = '700 ' + (L.rows * 0.98) + 'px ' + MONO;
      for (var k = 0; k < L.lines.length; k++) ox.fillText(L.lines[k], 2, L.rows * k + L.rows / 2);
    }
    var data = ox.getImageData(0, 0, cols, R).data;
    gx.fillStyle = 'rgba(234,234,234,' + ALPHA.toFixed(3) + ')';
    var r = CELL * 0.34;
    for (var y = 0; y < R; y++) {
      for (var x = 0; x < cols; x++) {
        if (data[(y * cols + x) * 4 + 3] < 110) continue;
        gx.beginPath();
        gx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, r, 0, 6.2832);
        gx.fill();
      }
    }
  }

  window.__projGhostPaint = function (txt, gC, gx, oC, ox, MONO) {
    var idx = Math.max(0, Math.min(LEDGER.length - 1, (parseInt(txt, 10) || 1) - 1));
    var e = LEDGER[idx];
    var cap = e.unit;
    var dpr = window.devicePixelRatio || 1;
    var L = layout(e, ox, MONO);

    /* the 2D canvas carries the figure's box and the caption under it */
    var capH = cap ? 36 : 0;
    var w = L.w, h = L.h + capH;
    gC.width = Math.round(w * dpr); gC.height = Math.round(h * dpr);
    gC.style.width = w + 'px'; gC.style.height = h + 'px';
    gx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gx.clearRect(0, 0, w, h);

    if (!ledC && window.__led && gC.parentNode) {
      var wrap = document.createElement('div');
      wrap.className = 'ghost-fig';
      gC.parentNode.insertBefore(wrap, gC);
      wrap.appendChild(gC);
      ledC = document.createElement('canvas');
      ledC.className = 'ghost-led';
      wrap.appendChild(ledC);
      ghostEl = wrap.parentNode;
      try { led = window.__led.make(ledC); led.onrestore = drawFig; }
      catch (err) { led = null; ledC.parentNode.removeChild(ledC); ledC = null; }
    }

    if (led) {
      ledC.style.width = L.w + 'px';
      ledC.style.height = L.h + 'px';
      ledC.style.opacity = String(LED_ALPHA);
      /* the figure as a painter: the renderer draws it straight at the
         resolution it samples, whatever size the box is */
      figPaint = function (fx, pw, ph) {
        fx.fillStyle = '#fff';
        if (L.logo) {
          fx.setTransform(pw / e.logo.w, 0, 0, ph / e.logo.h, 0, 0);
          e.logo.paths.forEach(function (p) { fx.fill(new Path2D(p), e.logo.rule || 'nonzero'); });
        } else {
          var c = pw / L.cols;                  /* one layout cell at this resolution */
          fx.textAlign = 'left'; fx.textBaseline = 'middle';
          fx.font = '700 ' + (L.rows * 0.98 * c) + 'px ' + MONO;
          for (var k = 0; k < L.lines.length; k++) fx.fillText(L.lines[k], 2 * c, (L.rows * k + L.rows / 2) * c);
        }
      };
      figId = idx + 1;
      if (txt !== figTxt) {
        figTxt = txt;
        if (figStop) { figStop(); figStop = null; }
        if (window.__led.reduced) { figRev = 1; drawFig(); }
        else { figRev = 0; drawFig(); if (!pending) { pending = true; requestAnimationFrame(waitVisible); } }
      } else {
        drawFig();
      }
    } else {
      paintMatrix(e, L, gx, oC, ox, MONO);
    }

    if (cap) {
      gx.fillStyle = 'rgba(234,234,234,' + CAP_ALPHA.toFixed(2) + ')';
      gx.textAlign = 'center';
      gx.textBaseline = 'alphabetic';
      try { gx.letterSpacing = '0.18em'; } catch (err) { /* Chrome 99+ */ }
      gx.font = '11px ' + MONO;
      gx.fillText(cap.toUpperCase(), w / 2, L.h + 24);
    }
  };

  /* read-only hook for the tests */
  window.__projLedgerFig = {
    canvas: function () { return ledC; },
    rev: function () { return figRev; },
    txt: function () { return figTxt; }
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
    var e = LEDGER[Math.max(0, Math.min(LEDGER.length - 1, i))];
    return e.label || e.fig;
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
