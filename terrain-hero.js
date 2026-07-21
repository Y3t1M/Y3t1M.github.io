/* ============================================================
   TERRAIN HERO — terrain-hero.js
   Interactive monochrome wireframe topography. The ground rises
   to meet the cursor; clicking drops a slow seismic pulse that
   ripples through the rows.
   ============================================================ */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  var canvas = document.getElementById('pcb-canvas');
  if (!hero || !canvas) return;
  var ctx = canvas.getContext('2d');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0;
  function resize() {
    var r = hero.getBoundingClientRect();
    W = canvas.width = Math.round(r.width);
    H = canvas.height = Math.round(r.height);
  }
  resize();
  window.addEventListener('resize', resize);

  var mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999 };
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', function () { mouse.x = -9999; mouse.y = -9999; });

  var waves = [];
  hero.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.hero-panel') || e.target.closest('.pcb-comp')) return;
    var r = hero.getBoundingClientRect();
    waves.push({ x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now() / 1000 });
    if (waves.length > 6) waves.shift();
  });

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

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    if (mouse.x > -999) {
      if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
      mouse.sx += (mouse.x - mouse.sx) * 0.08;
      mouse.sy += (mouse.y - mouse.sy) * 0.08;
    } else { mouse.sx = -9999; mouse.sy = -9999; }

    var horizon = H * 0.42;
    var rows = 34;
    for (var r = 0; r < rows; r++) {
      var z = r / rows;
      var zz = Math.pow(z, 1.7);
      var y0 = horizon + zz * (H - horizon) * 1.05;
      var amp = 14 + zz * 90;
      var alpha = 0.05 + zz * 0.2;
      ctx.strokeStyle = 'rgba(234,234,234,' + alpha + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      var steps = 90;
      for (var i = 0; i <= steps; i++) {
        var x = (i / steps) * W;
        var nx = (i / steps - 0.5) / (0.25 + z * 0.75);
        var n = vnoise(nx * 3 + 7.3, (1 - z) * 5 - t * 0.06)
              + 0.5 * vnoise(nx * 6 + 2.1, (1 - z) * 10 - t * 0.1);
        var y = y0 - n * amp;

        // the ground rises toward the cursor
        if (mouse.sx > -999) {
          var dxm = x - mouse.sx, dym = y0 - mouse.sy;
          var d2 = dxm * dxm + dym * dym;
          y -= Math.exp(-d2 / 26000) * 60 * (0.3 + zz);
        }

        // slow seismic ripples from clicks
        for (var w = 0; w < waves.length; w++) {
          var wv = waves[w];
          var age = t - wv.t0;
          if (age > 4.5) continue;
          var dxw = x - wv.x, dyw = y0 - wv.y;
          var dist = Math.sqrt(dxw * dxw + dyw * dyw);
          var ring = age * 170;
          var band = Math.exp(-Math.pow(dist - ring, 2) / 2400);
          y -= band * 46 * Math.exp(-age * 0.9) * (0.3 + zz) * Math.sin(age * 5.5);
        }

        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    waves = waves.filter(function (wv) { return t - wv.t0 < 4.5; });
  }

  if (reduced) { draw(4.2); return; }

  var rafId = null;
  function frame(ts) {
    draw(ts / 1000);
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
    else if (!rafId) rafId = requestAnimationFrame(frame);
  });
})();
