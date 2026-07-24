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
    var ghost = document.createElement('div');
    ghost.className = 'sc-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    stage.insertBefore(ghost, stage.firstChild);

    /* ---- LED-matrix numeral ----------------------------------------
       Draw the digits once at ONE PIXEL PER CELL, read that back, then
       paint a dot for every cell the glyph actually covers. Quantising to
       the grid is the whole point: a CSS dot-mask over live text just
       punches holes through the glyph, so any stroke thinner than the
       pitch breaks up and the digit looks sheared. Sampling coverage
       instead means a stroke is always a continuous run of lit cells.  */
    var gCanvas = document.createElement('canvas');
    var gctx = gCanvas.getContext('2d');
    var oCanvas = document.createElement('canvas');
    var octx = oCanvas.getContext('2d', { willReadFrequently: true });
    ghost.appendChild(gCanvas);

    var MONO = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-mono').trim() || 'monospace';
    var gLast = '';

    function paintGhost(txt, force) {
      if (!txt || (txt === gLast && !force)) return;
      gLast = txt;

      var dpr = window.devicePixelRatio || 1;
      var size = Math.min(window.innerHeight * 0.56, window.innerWidth * 0.44);
      var CELL = Math.max(10, Math.round(size / 34));   /* ~34 cells tall */
      var rows = Math.round(size / CELL);
      var cols = Math.round(rows * 1.35);

      /* pass 1 — one pixel per cell, so a pixel IS a cell */
      oCanvas.width = cols; oCanvas.height = rows;
      octx.clearRect(0, 0, cols, rows);
      octx.fillStyle = '#fff';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.font = '700 ' + (rows * 0.98) + 'px ' + MONO;
      octx.fillText(txt, cols / 2, rows / 2);
      var data = octx.getImageData(0, 0, cols, rows).data;

      /* pass 2 — one dot per covered cell, at device resolution */
      var w = cols * CELL, h = rows * CELL;
      gCanvas.width = Math.round(w * dpr);
      gCanvas.height = Math.round(h * dpr);
      gCanvas.style.width = w + 'px';
      gCanvas.style.height = h + 'px';
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gctx.clearRect(0, 0, w, h);
      gctx.fillStyle = 'rgba(255,255,255,0.34)';
      var r = CELL * 0.34;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          if (data[(y * cols + x) * 4 + 3] < 110) continue;   /* coverage */
          gctx.beginPath();
          gctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, r, 0, 6.2832);
          gctx.fill();
        }
      }
    }
    window.addEventListener('resize', function () { paintGhost(gLast, true); });

    /* splash index: 01–06 jump straight to a slide */
    var index = document.getElementById('proj-index');
    if (index) {
      for (var ii = 0; ii < N; ii++) (function (i) {
        var s = slides[i];
        var eb = s.querySelector('.slide-eyebrow');
        var h3 = s.querySelector('h3');
        var t = s.getAttribute('data-index-title') ||
                (s.classList.contains('wide') && eb ? eb.textContent : (h3 ? h3.textContent : ''));
        var li = document.createElement('li');
        var b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = '<span class="idx">0' + (i + 1) + '</span><span>' + t + '</span><span class="arr">&rarr;</span>';
        b.addEventListener('click', function () {
          var target = sec.offsetTop + ((i + LEAD) / (N - 1 + LEAD)) * (sec.offsetHeight - window.innerHeight);
          window.scrollTo({ top: target, behavior: 'smooth' });
        });
        li.appendChild(b);
        index.appendChild(li);
      })(ii);
    }
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

    /* A dot-matrix mask is a repeating tile: translate it by a fraction of
       a device pixel and every dot edge is resampled, which reads as
       travelling moire across the glyph. Whole-pixel offsets reproduce the
       raster exactly. */
    function snapPx(v) {
      var d = window.devicePixelRatio || 1;
      return (Math.round(v * d) / d).toFixed(2);
    }

    /* DETENT_HOLD 0 = constant glide (every project feels the same),
       1 = full smootherstep (hard station-to-station indexing).
       0.78 dwells long enough to read as a lock without feeling stuck. */
    var DETENT_HOLD = 0.78;
    /* Degrees of yaw at full offset. Positive turns a passing panel to face
       the centre of the screen. */
    var YAW = 11;

    /* Travel must come from the slide's OWN width, not a fixed vw figure.
       At the handoff each slide sits at |P| = 0.5^1.72 = 0.303 of full
       travel, so the two in flight are 0.606 x travel apart — that has to
       exceed the slide width or they overlap as they pass. A desktop slide
       is ~54% of the viewport and 90vw was fine; a mobile slide is ~90% of
       it, and the same 90vw put them 213px apart while they were 351px
       wide. Deriving it per slide fixes every width at once. */
    var travels = [];
    function measureTravel() {
      for (var i = 0; i < N; i++) {
        var w = slides[i].offsetWidth || window.innerWidth * 0.8;
        travels[i] = (w + 26) / 0.606;
      }
    }
    measureTravel();
    window.addEventListener('resize', measureTravel);
    window.addEventListener('load', measureTravel);
    function detent(u) {
      var i = Math.floor(u);
      var t = u - i;
      var s = t * t * t * (t * (t * 6 - 15) + 10);
      return i + t + (s - t) * DETENT_HOLD;
    }

    function scTick() {
      var r = sec.getBoundingClientRect();
      var runway = sec.offsetHeight - window.innerHeight;
      var p = Math.max(0, Math.min(1, -r.top / runway));
      sp += (p - sp) * 0.085;

      /* DETENT — this is what makes a project "snap into place".
         Raw scroll advances the timeline at a constant rate, so every
         project reads identically and nothing ever arrives. Smootherstep
         has zero slope at both ends, so remapping the fractional part of
         the timeline makes it crawl while a project is seated and sprint
         through the gap between two. Whole numbers are untouched, so a
         station still lands exactly on its slide. */
      var u = detent(sp * (N - 1 + LEAD) - LEAD);
      var active = Math.max(0, Math.min(N - 1, Math.round(u)));
      if (counter && active !== lastActive) {
        lastActive = active;
        var h3 = slides[active].querySelector('h3');
        counter.innerHTML = '<b>' + ('0' + (active + 1)).slice(-2) + ' / ' + ('0' + N).slice(-2) + '</b> — ' +
          (h3 ? h3.textContent : '');
        paintGhost('0' + (active + 1));
      }

      /* ghost numeral: drifts against the slides, fades through handoffs.
         Fully gone by |gq|=0.33 so it never rests visibly off-center
         at the LEAD entrance (gq=-0.35). Drifts on X now that the slides
         traverse horizontally, at a slower rate so it reads as further
         back. Snapped to whole device pixels: the dot-matrix mask
         resamples on a fractional translate and shimmers otherwise. */
      var gq = u - active;
      var gx = gq * 9 * window.innerWidth / 100;
      ghost.style.transform = 'translate3d(' + snapPx(gx) + 'px,0,0)';
      ghost.style.opacity = Math.max(0, 1 - Math.abs(gq) * 3.05).toFixed(3);


      for (var i = 0; i < N; i++) {
        /* LEAD gives slide 0 a rise-in entrance as the section pins,
           instead of starting dead-centered. Read off the DETENTED
           timeline so the slides seat on the same stations the counter
           and ghost numeral do. */
        var q = u - i;
        q = Math.max(-1.5, Math.min(1.5, q));
        var el = slides[i];
        var abs = Math.abs(q);

        /* Hold the slide fully opaque while it is anywhere near centre —
           it only starts fading once it is genuinely on its way out, so
           the copy you are reading is never dimmed. */
        var op = abs < 0.46 ? 1 : Math.max(0, 1 - (abs - 0.46) / 0.52);
        if (op <= 0.001) {
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
          continue;
        }
        el.style.visibility = 'visible';
        /* Reveal a little before the slide seats. The staggered content
           transitions run up to 0.28s, so triggering at the 0.5 handoff
           left an empty panel visible while it arrived; starting at 0.62
           means the project is fully formed by the time it locks in. */
        el.classList.toggle('active', abs < 0.62);
        el.style.pointerEvents = abs < 0.28 ? 'auto' : 'none';
        el.style.zIndex = String(100 - Math.round(abs * 20));

        /* Hang-at-centre. Raising |q| to a power >1 makes the slide cross
           fast at the edges and almost stop in the middle, where it is
           readable — the same "objects passing a camera" beat wodniack
           gets from GSAP slow(0.15,0.6), without the dependency. */
        /* P > 0 parks the slide to the RIGHT of centre. q is positive once a
           slide has been passed, so P negates it: upcoming slides wait on
           the right, cross through centre, and leave to the left. */
        var P = -(q < 0 ? -1 : 1) * Math.pow(abs, 1.72);

        /* One monotonic curve per axis and nothing else. Two things used to
           break the smoothness here and both were holdovers from the old
           vertical lift:
             · a damped SINE settle, which oscillated the panel back and
               forth in X on approach instead of easing into place, and
             · scroll-velocity tilt added to the yaw of every slide — so the
               project you were reading bent while you scrolled and sprang
               back when you stopped. Nothing at centre should move.
           Yaw is signed off P so a panel turns to FACE the centre as it
           passes, which reads as a corridor rather than a fan. */
        var sc = 1 - Math.min(0.06, abs * 0.06);
        el.style.transform =
          'translate(-50%, -50%) translate3d(' + (P * (travels[i] || 600)).toFixed(2) + 'px, 0, ' +
          (-(P * P) * 14).toFixed(2) + 'rem) rotateY(' + (P * YAW).toFixed(2) + 'deg) ' +
          'scale(' + sc.toFixed(3) + ')';
        el.style.opacity = op.toFixed(3);

        /* depth: slides soften only well off-centre; media drifts inside */
        var bl = Math.min(3.2, Math.max(0, abs - 0.46) * 6);
        el.style.filter = bl > 0.1 ? 'blur(' + bl.toFixed(2) + 'px)' : '';
        el.style.setProperty('--q', q.toFixed(3));
      }
      requestAnimationFrame(scTick);
    }
    requestAnimationFrame(scTick);
  })();

})();
