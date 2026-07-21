/* ============================================================
   SAND — sand.js
   Drifting grain background (p5aholic-style): a noise tile
   drawn in two slowly moving layers over the black gradient.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.id = 'sand-canvas';
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* noise tile: sparse sandy speckle, not uniform static */
  var TILE = 384;
  var tile = document.createElement('canvas');
  tile.width = TILE; tile.height = TILE;
  var ttx = tile.getContext('2d');
  var id = ttx.createImageData(TILE, TILE);
  for (var i = 0; i < id.data.length; i += 4) {
    var r = Math.random();
    var v = r < 0.62 ? 0 : Math.floor(Math.pow((r - 0.62) / 0.38, 1.6) * 255);
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  ttx.putImageData(id, 0, 0);

  var W = 0, H = 0;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
  }
  resize();
  window.addEventListener('resize', resize);

  function drawLayer(t, speedX, speedY, scale, alpha) {
    var size = TILE * scale;
    var ox = ((t * speedX) % size + size) % size;
    var oy = ((t * speedY) % size + size) % size;
    ctx.globalAlpha = alpha;
    for (var y = -oy; y < H; y += size) {
      for (var x = -ox; x < W; x += size) {
        ctx.drawImage(tile, x, y, size, size);
      }
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    drawLayer(t, 3.2, 1.4, 1, 0.8);     // fine layer, slow diagonal drift
    drawLayer(t, -1.6, 2.2, 1.7, 0.35); // coarser layer, opposite drift
    ctx.globalAlpha = 1;
  }

  if (reduced) {
    draw(0);
    return;
  }

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
