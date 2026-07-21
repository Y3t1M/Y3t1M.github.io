/* ============================================================
   SCROLL FX — scroll-fx.js
   Wodniack-style scroll presentation: JS computes one smoothed
   per-element progress and writes it to a CSS variable; CSS owns
   the transforms. LED separators flicker only while visible.
   ============================================================ */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('fx');

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


  /* ---- pinned LIFT showcase v2 ---- */
  (function () {
    var sec = document.getElementById('showcase');
    if (!sec) return;
    var stage = sec.querySelector('.sc-stage');
    var slides = sec.querySelectorAll('.sc-slide');
    var rail = sec.querySelectorAll('.sc-rail i');
    var fx = document.getElementById('sc-fx');
    var fctx = fx ? fx.getContext('2d') : null;
    var N = slides.length;
    if (!N) return;
    sec.style.height = (N * 85 + 100) + 'vh';
    var sp = 0;

    function resizeFx() {
      if (!fx) return;
      fx.width = stage.clientWidth;
      fx.height = stage.clientHeight;
    }
    resizeFx();
    window.addEventListener('resize', resizeFx);

    function scTick() {
      var r = sec.getBoundingClientRect();
      var runway = sec.offsetHeight - window.innerHeight;
      var p = Math.max(0, Math.min(1, -r.top / runway));
      sp += (p - sp) * 0.12;

      var active = Math.round(sp * (N - 1));
      for (var d = 0; d < rail.length; d++) rail[d].classList.toggle('on', d === active);

      if (fctx) fctx.clearRect(0, 0, fx.width, fx.height);
      var sh = stage.clientHeight, sw = stage.clientWidth;

      for (var i = 0; i < N; i++) {
        var q = sp * (N - 1) - i;
        q = Math.max(-1.5, Math.min(1.5, q));
        var el = slides[i];
        var abs = Math.abs(q);

        var op = Math.max(0, 1 - Math.max(0, (abs - 0.28) / 0.27));
        if (op <= 0.001) {
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
          continue;
        }
        el.style.visibility = 'visible';
        el.style.pointerEvents = abs < 0.28 ? 'auto' : 'none';
        el.style.zIndex = String(100 - Math.round(abs * 20));

        var y, rx;
        if (q < 0) { y = -q * 62; rx = q * 13; }
        else { y = -q * 30; rx = q * 9; }
        var settle = Math.exp(-abs * 6) * Math.sin(abs * 16) * 1.0;
        var sc = 1 - Math.min(0.05, abs * 0.05);
        el.style.transform = 'translate(-50%, -50%) translateY(' + (y + settle) + 'vh) rotateX(' + (-rx) + 'deg) scale(' + sc.toFixed(3) + ')';
        el.style.opacity = op.toFixed(3);

        if (fctx && abs < 0.85) {
          var slideH = el.offsetHeight || 300;
          var bow = Math.exp(-abs * 3) * 20;
          var yline = Math.min(sh - 20, sh / 2 + slideH / 2 + 24);
          fctx.strokeStyle = 'rgba(234,234,234,' + (0.18 * (1 - abs)).toFixed(3) + ')';
          fctx.lineWidth = 1;
          fctx.beginPath();
          fctx.moveTo(sw / 2 - slideH * 1.6, yline);
          fctx.quadraticCurveTo(sw / 2, yline - bow, sw / 2 + slideH * 1.6, yline);
          fctx.stroke();
        }
      }
      requestAnimationFrame(scTick);
    }
    requestAnimationFrame(scTick);
  })();

})();
