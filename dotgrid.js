/* ============================================================
   DOT GRID — dotgrid.js
   Quiet LED matrix background: 24px dot grid, slow horizontal
   drift, parts gently around the cursor. Structurally calm so
   it never fights the content sitting on it.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.id = 'dotgrid-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  var mouse = { x: -9999, y: -9999 };
  document.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var g = 24;
    var driftX = (t * 2.2) % g;
    /* quarter-speed scroll parallax: the field streams as the page glides */
    var driftY = (window.pageYOffset * 0.24) % g;
    for (var y = g / 2 - driftY; y < H + g; y += g) {
      for (var x = g / 2 - driftX; x < W + g; x += g) {
        var dx = x - mouse.x, dy = y - mouse.y;
        var d2 = dx * dx + dy * dy;
        var push = Math.exp(-d2 / 9000);
        var len = Math.sqrt(d2) || 1;
        ctx.fillStyle = 'rgba(234,234,234,' + (0.04 + push * 0.18) + ')';
        ctx.fillRect(x + (dx / len) * push * 12, y + (dy / len) * push * 12, 1.2, 1.2);
      }
    }
  }

  if (reduced) { draw(0); return; }

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
