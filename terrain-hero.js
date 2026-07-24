/* ============================================================
   TERRAIN HERO — terrain-hero.js
   Refined wireframe topography: long smooth swells. The nav
   chips are moored to the field — each rides the swell at its
   anchor point, tied down by a leader line to a glowing node.
   Cursor raises the ground; clicks drop slow seismic ripples.
   ============================================================ */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  var canvas = document.getElementById('pcb-canvas');
  if (!hero || !canvas) return;
  var ctx = canvas.getContext('2d');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktopLayout = window.matchMedia('(min-width: 861px)');

  var W = 0, H = 0;

  var comps = ['comp-projects', 'comp-desktop', 'comp-resume']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean)
    .map(function (el) { return { el: el, xc: 0, z: 0.5, zz: 0, y0: 0, amp: 0, bottom: 0 }; });

  function measureComps() {
    if (!desktopLayout.matches) return;
    var hr = hero.getBoundingClientRect();
    comps.forEach(function (c) {
      c.el.style.transform = '';
      var r = c.el.getBoundingClientRect();
      c.xc = r.left - hr.left + r.width / 2;
      c.bottom = r.bottom - hr.top;
      // anchor the chip to the terrain row ~56px below it
      var horizon = H * 0.47;
      var yTarget = Math.min(H - 30, c.bottom + 56);
      var zz = Math.max(0.05, Math.min(1, (yTarget - horizon) / ((H - horizon) * 1.05)));
      c.zz = zz;
      c.z = Math.pow(zz, 1 / 1.7);
      c.y0 = horizon + zz * (H - horizon) * 1.05;
      c.amp = (14 + zz * 74) * 0.40;
    });
  }

  function resize() {
    var r = hero.getBoundingClientRect();
    var w = Math.round(r.width), h = Math.round(r.height);
    /* Never let the canvas go degenerate. Mobile fires resize mid-layout and
       a zero here would blank the field with no later event to undo it. */
    if (w < 2 || h < 2) return;
    /* Assigning width/height CLEARS the canvas, and mobile URL-bar collapse
       fires resize constantly — bailing when nothing changed is what stops
       the terrain flickering out while you scroll. */
    if (w === W && h === H) return;
    W = canvas.width = w;
    H = canvas.height = h;
    measureComps();
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  /* back/forward cache restores can hand back a stale surface */
  window.addEventListener('pageshow', function () { W = H = 0; resize(); });
  window.addEventListener('load', function () { setTimeout(measureComps, 100); });

  // after the boot stagger settles, drop the CSS transform transition so
  // the chips can ride the swells without rubber-banding
  setTimeout(function () {
    document.documentElement.classList.add('settled');
    measureComps();
  }, 1500);

  var mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999 };
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', function () { mouse.x = -9999; mouse.y = -9999; });

  var waves = [];
  function ripple(cx, cy) {
    var r = hero.getBoundingClientRect();
    waves.push({ x: cx - r.left, y: cy - r.top, t0: performance.now() / 1000 });
    if (waves.length > 6) waves.shift();
  }
  hero.addEventListener('pointerdown', function (e) {
    /* Only real controls are off-limits. The old guard skipped the whole
       .hero-panel, which on a phone is most of the screen — so tapping the
       hero did nothing and the field read as decoration. */
    if (e.target.closest('a, button')) return;
    ripple(e.clientX, e.clientY);
  });

  /* Touch: pointermove is unreliable once a drag turns into a scroll, so read
     the touch point directly. Passive — the page must still scroll normally. */
  hero.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0];
    if (!t) return;
    var r = hero.getBoundingClientRect();
    mouse.x = t.clientX - r.left;
    mouse.y = t.clientY - r.top;
  }, { passive: true });
  hero.addEventListener('touchend', function () {
    /* let the swell relax instead of snapping flat the instant you lift */
    setTimeout(function () { mouse.x = -9999; mouse.y = -9999; }, 420);
  }, { passive: true });

  function hash(x, y) {
    var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  /* refined field: two long-wavelength octaves — rolling swells, no jitter */
  /* Hudson's tuned waves: wl 0.80 · speed 1.45 · detail 0.90 */
  function fieldN(nx, z, t) {
    return vnoise(nx * 2.125 + 7.3, (1 - z) * 3.2 - t * 0.0725)
         + 0.9 * vnoise(nx * 4.5 + 2.1, (1 - z) * 6.5 - t * 0.116);
  }

  /* displacement extras (cursor bump + click ripples) at a base point */
  function extras(x, y0, zz, t) {
    var d = 0;
    if (mouse.sx > -999) {
      var dxm = x - mouse.sx, dym = y0 - mouse.sy;
      d += Math.exp(-(dxm * dxm + dym * dym) / 30000) * 56 * (0.3 + zz);
    }
    for (var w = 0; w < waves.length; w++) {
      var wv = waves[w];
      var age = t - wv.t0;
      if (age > 4.5) continue;
      var dxw = x - wv.x, dyw = y0 - wv.y;
      var dist = Math.sqrt(dxw * dxw + dyw * dyw);
      var band = Math.exp(-Math.pow(dist - age * 170, 2) / 3000);
      d += band * 42 * Math.exp(-age * 0.9) * (0.3 + zz) * Math.sin(age * 5.5);
    }
    return d;
  }

  function draw(t) {
    /* Self-heal: if anything ever left the surface at zero, rebuild it here
       rather than waiting for a resize event that may never come. */
    if (!W || !H) { resize(); if (!W || !H) return; }
    ctx.clearRect(0, 0, W, H);

    if (mouse.x > -999) {
      if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
      mouse.sx += (mouse.x - mouse.sx) * 0.08;
      mouse.sy += (mouse.y - mouse.sy) * 0.08;
    } else { mouse.sx = -9999; mouse.sy = -9999; }

    var horizon = H * 0.47;
    var rows = 18;
    for (var r = 0; r < rows; r++) {
      var z = r / rows;
      var zz = Math.pow(z, 1.7);
      var y0 = horizon + zz * (H - horizon) * 1.05;
      var amp = (14 + zz * 74) * 0.40;
      var alpha = Math.min(0.5, (0.05 + zz * 0.18) * 1.65);
      ctx.strokeStyle = 'rgba(234,234,234,' + alpha + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      var steps = 110;
      for (var i = 0; i <= steps; i++) {
        var x = (i / steps) * W;
        var nx = (i / steps - 0.5) / (0.25 + z * 1.5);
        var y = y0 - fieldN(nx, z, t) * amp - extras(x, y0, zz, t);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    waves = waves.filter(function (wv) { return t - wv.t0 < 4.5; });

    /* moor the chips: node on their terrain line, leader up to the card, bob */
    if (desktopLayout.matches && document.documentElement.classList.contains('settled')) {
      for (var c = 0; c < comps.length; c++) {
        var cp = comps[c];
        if (!cp.xc) continue;
        var nx2 = (cp.xc / W - 0.5) / (0.25 + cp.z * 1.5);
        var lineY = cp.y0 - fieldN(nx2, cp.z, t) * cp.amp - extras(cp.xc, cp.y0, cp.zz, t);
        var rest = cp.y0 - 0.675 * cp.amp;   // field mean ≈ 0.675
        var dy = Math.max(-16, Math.min(16, (lineY - rest) * 0.45));
        cp.el.style.transform = 'translateY(' + dy.toFixed(2) + 'px)';

        // leader line + glowing node
        ctx.strokeStyle = 'rgba(234,234,234,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cp.xc, cp.bottom + dy + 6);
        ctx.lineTo(cp.xc, lineY);
        ctx.stroke();
        ctx.fillStyle = 'rgba(234,234,234,0.55)';
        ctx.beginPath();
        ctx.arc(cp.xc, lineY, 2.4, 0, 7);
        ctx.fill();
      }
    }
  }

  if (reduced) { draw(4.2); return; }

  var rafId = null;
  var lastFrame = performance.now();
  function frame(ts) {
    lastFrame = performance.now();
    draw(ts / 1000);
    rafId = requestAnimationFrame(frame);
  }
  function start() { if (!rafId) { lastFrame = performance.now(); rafId = requestAnimationFrame(frame); } }
  start();
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
    else start();
  });

  /* Watchdog. Mobile Safari suspends rAF for offscreen content under memory
     pressure and does not always resume it, which left the hero blank after
     scrolling away and back with no event to hang a fix on. If frames have
     stopped while the page is visible, restart the loop. */
  setInterval(function () {
    if (document.hidden) return;
    if (performance.now() - lastFrame > 1200) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      start();
    }
  }, 1500);
  window.addEventListener('pageshow', start);
})();
