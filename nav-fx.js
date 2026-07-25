/* ============================================================
   NAV FX — nav-fx.js
   Settle-on-arrival: when you reach a page via internal navigation,
   grain pours along the datum rule and gathers into the active tick,
   so the new location "locks in". Quiet at rest — nothing runs unless
   you just navigated, and never on a cold load or refresh.
   ============================================================ */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var nav = document.querySelector('.site-nav');
  var cv = nav && nav.querySelector('.nav-sand');
  if (!nav || !cv) return;

  // only settle when we got here by clicking a nav link, not on a cold load
  var viaNav = false;
  try { viaNav = sessionStorage.getItem('pt-arrive') === '1'; sessionStorage.removeItem('pt-arrive'); } catch (e) {}
  if (!viaNav) return;

  var active = nav.querySelector('.nav-link[aria-current="page"], .nav-link.active');
  if (!active) return;

  var g = cv.getContext('2d');
  var dpr = window.devicePixelRatio || 1;

  function pour() {
    var navBox = nav.getBoundingClientRect();
    var w = navBox.width, h = 16;
    if (!w) return;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // target: the active link's tick, which sits CENTERED under the label
    // (styles.css: .nav-link::before { left: 50%; transform: translateX(-50%) }).
    // This used to aim at the link's left edge, which was correct only while the
    // ticks were left-anchored — after they were centered the grain gathered
    // ~25px short of the tick, on empty rule.
    var linkBox = active.getBoundingClientRect();
    var tickX = linkBox.left + linkBox.width / 2 - navBox.left;
    var cy = h / 2;

    var grains = [], N = Math.round(w * 0.5);
    for (var i = 0; i < N; i++) {
      grains.push({
        x: Math.random() * w,
        y: cy + (Math.random() - 0.5) * 9,
        tx: tickX + (Math.random() - 0.5) * 3,
        ty: cy + (Math.random() - 0.5) * 2,
        born: performance.now(),
        life: 380 + Math.random() * 320
      });
    }

    function frame(now) {
      g.clearRect(0, 0, w, h);
      var alive = 0;
      for (var i = 0; i < grains.length; i++) {
        var p = grains[i], age = now - p.born, k = age / p.life;
        if (k >= 1) continue;
        alive++;
        p.x += (p.tx - p.x) * 0.055;
        p.y += (p.ty - p.y) * 0.055;
        // fade in over the first 20%, out over the rest
        var a = k < 0.2 ? (k / 0.2) : (1 - (k - 0.2) / 0.8);
        g.fillStyle = 'rgba(234,234,234,' + (a * 0.5).toFixed(3) + ')';
        g.fillRect(p.x, p.y, 1, 1);
      }
      if (alive) requestAnimationFrame(frame);
      else g.clearRect(0, 0, w, h);
    }
    requestAnimationFrame(frame);
  }

  // wait for layout + fonts so the tick position is final
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { requestAnimationFrame(pour); });
  else requestAnimationFrame(pour);
})();
