/* ============================================================
   NAV FX — nav-fx.js
   Grain gathers into a nav tick along the datum rule.

   It fires the moment you press a link, on the page you are leaving, so the
   press has an answer straight away — it used to run only on arrival at the
   destination, which read as unrelated to the click. It still settles on
   arrival too, so landing on a page locks its tick in.

   Grains spawn SYMMETRICALLY around the target. They used to spawn across the
   whole nav width and converge inward, which looked lopsided for any tick that
   is not centred in the bar: the Projects tick sits at ~928 of ~1080, so almost
   everything arrived from the left.
   ============================================================ */
(function () {
  'use strict';

  var nav = document.querySelector('.site-nav');
  var cv = nav && nav.querySelector('.nav-sand');
  if (!nav || !cv) return;

  var g = cv.getContext('2d');
  if (!g) return;

  var running = false;

  /* How far out the grain is drawn from, each side of the tick. Symmetric by
     construction, so the gather reads as centred on the mark. */
  var SPREAD = 150;

  function pour(target) {
    if (!target) return;
    var navBox = nav.getBoundingClientRect();
    var w = navBox.width, h = 16;
    if (!w) return;

    var dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* the tick sits CENTRED under its label — styles.css puts
       .nav-link::before at left:50% with translateX(-50%) */
    var linkBox = target.getBoundingClientRect();
    var tickX = linkBox.left + linkBox.width / 2 - navBox.left;
    var cy = h / 2;

    var grains = [], N = 260;
    for (var i = 0; i < N; i++) {
      /* pow biases the spawn toward the far end of the spread, so the rule
         reads as sand sweeping in rather than a blob sitting on the tick */
      var side = Math.random() < 0.5 ? -1 : 1;
      var dist = Math.pow(Math.random(), 0.65) * SPREAD;
      var x = tickX + side * dist;
      if (x < 0 || x > w) continue;                 /* off the rule, skip it */
      grains.push({
        x: x,
        y: cy + (Math.random() - 0.5) * 9,
        tx: tickX + (Math.random() - 0.5) * 3,
        ty: cy + (Math.random() - 0.5) * 2,
        born: performance.now(),
        life: 380 + Math.random() * 320
      });
    }
    if (!grains.length) return;

    if (running) return;
    running = true;

    function frame(now) {
      g.clearRect(0, 0, w, h);
      var alive = 0;
      for (var i = 0; i < grains.length; i++) {
        var p = grains[i], age = now - p.born, k = age / p.life;
        if (k >= 1) continue;
        alive++;
        p.x += (p.tx - p.x) * 0.055;
        p.y += (p.ty - p.y) * 0.055;
        var a = k < 0.2 ? (k / 0.2) : (1 - (k - 0.2) / 0.8);
        g.fillStyle = 'rgba(234,234,234,' + (a * 0.5).toFixed(3) + ')';
        g.fillRect(p.x, p.y, 1, 1);
      }
      if (alive) requestAnimationFrame(frame);
      else { g.clearRect(0, 0, w, h); running = false; }
    }
    requestAnimationFrame(frame);
  }

  /* ON PRESS — the answer to the click, on the page you are still looking at.
     pointerdown rather than click so it starts on the press, not the release. */
  nav.addEventListener('pointerdown', function (e) {
    var a = e.target.closest && e.target.closest('.nav-link, .nav-logo-text');
    if (!a) return;
    pour(a);
  }, { passive: true });

  /* ON ARRIVAL — settle the destination's own tick. */
  var viaNav = false;
  try {
    viaNav = sessionStorage.getItem('pt-arrive') === '1';
    sessionStorage.removeItem('pt-arrive');
  } catch (e) {}
  if (!viaNav) return;

  var active = nav.querySelector('.nav-link[aria-current="page"], .nav-link.active');
  if (!active) return;

  // wait for layout + fonts so the tick position is final
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { requestAnimationFrame(function () { pour(active); }); });
  } else {
    requestAnimationFrame(function () { pour(active); });
  }
})();
