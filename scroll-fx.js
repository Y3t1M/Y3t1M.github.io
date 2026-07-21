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

  /* ---- auto-hiding header: plain scrolling is immersive; scroll-up,
     real mouse travel, or nearing the top brings the nav back ---- */
  var header = document.querySelector('.site-header');
  if (header) {
    var hLastY = window.pageYOffset, hpx = -1, hpy = -1;
    window.addEventListener('scroll', function () {
      var y = window.pageYOffset;
      if (y > hLastY + 2 && y > 140) header.classList.add('nav-hidden');
      else if (y < hLastY - 2 || y <= 140) header.classList.remove('nav-hidden');
      hLastY = y;
    }, { passive: true });
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var moved = hpx >= 0 && Math.abs(e.clientX - hpx) + Math.abs(e.clientY - hpy) > 2;
      hpx = e.clientX; hpy = e.clientY;
      if (moved) header.classList.remove('nav-hidden');
    });
  }

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
    var N = slides.length;
    if (!N) return;
    sec.style.height = (N * 100 + 100) + 'vh';
    var sp = 0;
    var lastActive = -1;
    var counter = document.createElement('div');
    counter.className = 'sc-counter';
    stage.appendChild(counter);
    var hideTimer = null;
    /* Chrome fires synthetic pointermove (same coords) when the page
       scrolls under a stationary cursor — only real travel counts */
    var lastPX = -1, lastPY = -1;
    document.addEventListener('pointermove', function (e) {
      var moved = lastPX >= 0 && Math.abs(e.clientX - lastPX) + Math.abs(e.clientY - lastPY) > 2;
      lastPX = e.clientX; lastPY = e.clientY;
      if (!moved) return;
      counter.classList.add('show');
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { counter.classList.remove('show'); }, 1800);
    });

    var LEAD = 0.35;
    var lastSp = 0, velTilt = 0;
    function scTick() {
      var r = sec.getBoundingClientRect();
      var runway = sec.offsetHeight - window.innerHeight;
      var p = Math.max(0, Math.min(1, -r.top / runway));
      sp += (p - sp) * 0.085;

      /* scroll velocity -> a whisper of extra tilt while moving */
      var dsp = sp - lastSp; lastSp = sp;
      velTilt += (Math.max(-4, Math.min(4, dsp * 2200)) - velTilt) * 0.12;

      var active = Math.max(0, Math.min(N - 1, Math.round(sp * (N - 1 + LEAD) - LEAD)));
      if (counter && active !== lastActive) {
        lastActive = active;
        var h3 = slides[active].querySelector('h3');
        counter.innerHTML = '<b>' + ('0' + (active + 1)).slice(-2) + ' / ' + ('0' + N).slice(-2) + '</b> — ' +
          (h3 ? h3.textContent : '');
      }


      for (var i = 0; i < N; i++) {
        /* LEAD gives slide 0 a rise-in entrance as the section pins,
           instead of starting dead-centered */
        var q = sp * (N - 1 + LEAD) - i - LEAD;
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
        el.classList.toggle('active', abs < 0.5);
        el.style.pointerEvents = abs < 0.28 ? 'auto' : 'none';
        el.style.zIndex = String(100 - Math.round(abs * 20));

        var y, rx;
        if (q < 0) { y = -q * 62; rx = q * 13; }
        else { y = -q * 30; rx = q * 9; }
        var settle = Math.exp(-abs * 6) * Math.sin(abs * 16) * 1.0;
        var sc = 1 - Math.min(0.05, abs * 0.05);
        el.style.transform = 'translate(-50%, -50%) translateY(' + (y + settle) + 'vh) rotateX(' + (-(rx + velTilt)) + 'deg) scale(' + sc.toFixed(3) + ')';
        el.style.opacity = op.toFixed(3);

        /* depth: slides soften as they leave center; media drifts inside */
        var bl = Math.min(4, Math.max(0, abs - 0.3) * 7);
        el.style.filter = bl > 0.1 ? 'blur(' + bl.toFixed(2) + 'px)' : '';
        el.style.setProperty('--q', q.toFixed(3));
      }
      requestAnimationFrame(scTick);
    }
    requestAnimationFrame(scTick);
  })();

})();
