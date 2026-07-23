/* ============================================================
   PROJECTS AISLE — scroll-driven horizontal traverse
   Vertical scroll dollies a fixed camera down a rack of project bays.

   Design notes that are load-bearing:
   · Every transform is snapped to whole device pixels. A masked dot grid
     translated by a fractional pixel resamples every frame, which reads as
     travelling moiré across the numeral. Snapping removes it entirely.
   · Scroll is read once per animation frame, never in a scroll handler —
     interactive.js already does expensive per-frame canvas work on this page.
   · Motion is smoothed by two cascaded first-order lags rather than one.
     A single lag starts at full rate the instant you scroll; two have zero
     initial velocity and ease into motion, which is what makes it feel heavy.
   · The detent curve parks the traverse on bays instead of leaving you
     stranded mid-gap, so a reader can stop and actually read one.
   ============================================================ */

(function () {
  'use strict';

  var section = document.getElementById('hs-aisle');
  if (!section) return;

  var pin   = section.querySelector('.hs-pin');
  var track = section.querySelector('.hs-track');
  var field = section.querySelector('.hs-field');
  var rules = section.querySelector('.hs-rules');
  var rail  = section.querySelector('.hs-rail');
  var label = section.querySelector('.hs-hud__label');
  var segBox = section.querySelector('.hs-hud__segs');
  var bays  = Array.prototype.slice.call(section.querySelectorAll('.hs-bay'));
  if (!pin || !track || !bays.length) return;

  /* Same query string the stylesheet uses, so CSS and JS can never disagree
     about which mode we are in. */
  var STACK = window.matchMedia('(max-width: 860px), (prefers-reduced-motion: reduce)');

  var PIN_TOP = 56;    /* .site-header height — keeps bays out from under it */
  var PACE    = 1.15;  /* px of vertical scroll per px of horizontal travel */
  var DETENT  = 0.55;  /* 0 = linear glide, 1 = hard station-to-station */
  var YAW_N   = 820;   /* cap so the depth curve doesn't go limp on ultrawides */

  var pinW = 0, pinH = 0, D = 0, range = 0, centers = [], pitch = 220;
  var s1 = 0, s2 = 0, lastX = -1, lastT = 0, raf = 0, active = -1, live = false, snapNext = false;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function snap(v) { var d = window.devicePixelRatio || 1; return Math.round(v * d) / d; }

  /* Smootherstep between bay stations. Its derivative is zero at each end,
     so the traverse decelerates into a bay and accelerates out of it. */
  function detent(f) {
    var N = bays.length - 1;
    if (N <= 0) return f;
    var u = f * N, i = Math.floor(u);
    if (i >= N) return 1;
    var t = u - i;
    var s = t * t * t * (t * (t * 6 - 15) + 10);
    return (i + t + (s - t) * DETENT) / N;
  }

  /* Build the HUD segment strip once — one segment per bay. */
  if (segBox && !segBox.childNodes.length) {
    for (var i = 0; i < bays.length; i++) {
      var seg = document.createElement('span');
      seg.className = 'hs-hud__seg';
      segBox.appendChild(seg);
    }
  }
  var segs = segBox ? Array.prototype.slice.call(segBox.children) : [];

  function wipe() {
    section.style.height = '';
    track.style.transform = '';
    [field, rules, rail].forEach(function (el) { if (el) el.style.transform = ''; });
    bays.forEach(function (b) {
      b.removeAttribute('style');
      var n = b.querySelector('.hs-num');
      if (n) n.removeAttribute('style');
    });
    lastX = -1;
    active = -1;
  }

  function measure() {
    if (STACK.matches) { wipe(); return false; }

    section.style.height = '';
    track.style.transform = '';

    pinW = pin.clientWidth;
    pinH = pin.getBoundingClientRect().height;
    D = Math.max(0, track.offsetWidth - pinW);

    /* An ultrawide monitor may already fit every bay. Pinning for a handful
       of pixels would be a worse experience than not pinning at all. */
    if (D < 40) { wipe(); return false; }

    range = Math.round(D * PACE);
    section.style.height = (Math.round(pinH) + range) + 'px';

    centers = bays.map(function (b) { return b.offsetLeft + b.offsetWidth / 2; });
    pitch = bays.length > 1 ? (centers[1] - centers[0]) : 220;
    return true;
  }

  function rawProgress() {
    /* A sticky child pins for exactly (sectionHeight - pinH) px, and we set
       the section height to pinH + range — so this hits 0 the frame the pin
       engages and 1 the frame it releases, with no fudge factor. */
    return clamp01((PIN_TOP - section.getBoundingClientRect().top) / range);
  }

  function put(el, x, y) {
    var t = 'translate3d(' + snap(x) + 'px,' + snap(y || 0) + 'px,0)';
    if (el._t !== t) { el._t = t; el.style.transform = t; }
  }

  function render(p) {
    var x = p * D;
    if (lastX >= 0 && Math.abs(x - lastX) < 0.01) return false;
    lastX = x;

    put(track, -x, 0);

    /* Background planes wrap by their own tile size, so they can drift
       forever without ever accumulating a large transform. */
    if (field) put(field, -(x * 0.14) % 26, 0);
    if (rules) put(rules, -(x * 0.55) % 220, 0);
    if (rail)  put(rail, -(x * 1.32) % 44, 0);

    var half = pinW / 2;
    var norm = Math.min(half, YAW_N);
    var best = 0, bestD = Infinity;

    for (var i = 0; i < bays.length; i++) {
      var bay = bays[i];
      /* q = how far this bay sits from screen centre, in half-screens. */
      var q = (centers[i] - half - x) / norm;
      var qc = q < -1.6 ? -1.6 : q > 1.6 ? 1.6 : q;
      var lit = 1 - qc * qc;
      if (lit < 0) lit = 0;

      var qs = qc.toFixed(4);
      if (bay._q !== qs) { bay._q = qs; bay.style.setProperty('--q', qs); }
      var ls = lit.toFixed(4);
      if (bay._l !== ls) { bay._l = ls; bay.style.setProperty('--lit', ls); }

      /* The numeral drifts against its own bay rather than at a global rate.
         A global rate would leave the last numeral hundreds of px adrift by
         the end of the run; local drift is self-correcting — at dead centre
         q is 0 and every layer is exactly home. */
      var num = bay._num || (bay._num = bay.querySelector('.hs-num'));
      if (num) put(num, -qc * 118, -qc * 12);

      var ad = Math.abs(q);
      if (ad < bestD) { bestD = ad; best = i; }
    }

    if (best !== active) {
      active = best;
      if (label) {
        var name = bays[best].querySelector('.proj-name');
        var n = best < bays.length - 1 ? ('0' + (best + 1)).slice(-2) : '--';
        label.textContent = 'BAY ' + n + '/05 · ' + (name ? name.textContent.toUpperCase() : '');
      }
      for (var s = 0; s < segs.length; s++) segs[s].classList.toggle('is-on', s <= best);
    }
    return true;
  }

  function frame(now) {
    var dt = Math.min(64, now - lastT) / 1000;
    lastT = now;

    var raw = rawProgress();

    /* main.js scrollIntoView({behavior:'smooth'}) on the clicker easter egg
       can fling the page across the whole aisle. Without this the track
       would spend a second grinding through every bay to catch up. */
    if (snapNext || Math.abs(raw - s2) > 0.25) {
      s1 = s2 = raw;
      snapNext = false;
    } else {
      s1 += (raw - s1) * (1 - Math.exp(-dt / 0.160));
      s2 += (s1 - s2) * (1 - Math.exp(-dt / 0.145));
    }

    var moved = render(detent(clamp01(s2)));

    /* Stop the loop once it has settled rather than idling at 60fps forever. */
    if (!moved && Math.abs(raw - s2) < 0.0004) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!live) return;
    if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
  }

  function apply() {
    live = measure();
    if (live) {
      s1 = s2 = rawProgress();
      lastX = -1;
      lastT = performance.now();
      render(detent(clamp01(s2)));
      kick();
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  window.addEventListener('scroll', kick, { passive: true });

  var lastW = window.innerWidth;
  var lastStack = STACK.matches;
  window.addEventListener('resize', function () {
    var nowStack = STACK.matches;
    /* On phones a collapsing URL bar fires resize with an unchanged width.
       Re-measuring there would desync the pin mid-scroll for no reason.
       Only skip when the mode is also unchanged, or entering stacked mode
       would leave the section stuck with its inline pinned height. */
    if (nowStack && nowStack === lastStack && window.innerWidth === lastW) return;
    lastStack = nowStack;
    lastW = window.innerWidth;
    apply();
  });

  /* Restoring via the back button must re-measure, or the section keeps a
     stale inline height from the previous viewport. */
  window.addEventListener('pageshow', apply);
  if (STACK.addEventListener) STACK.addEventListener('change', apply);

  /* Scroll position that parks bay i dead centre. The detent curve returns
     i/N unchanged at every station, and bays are evenly spaced, so the raw
     progress that centres bay i is exactly i/N. */
  function scrollToBay(i) {
    var N = bays.length - 1;
    if (N <= 0) return;
    var f = clamp01(i / N);
    /* Move the page and let the next frame snap the track to wherever the
       scroll actually landed. Pre-setting the smoother here instead would
       race the scroll: the following frame would still read the OLD scroll
       position, disagree, and yank the track back off the focused bay. */
    snapNext = true;

    /* styles.css sets html{scroll-behavior:smooth}, so the browser's own
       scroll-focus-into-view is an ANIMATED scroll that is still running
       when we get here. Passing behavior:'auto' only makes our jump instant —
       the in-flight animation would continue afterwards and land on its own
       target instead of ours. Flipping the property to auto cancels it. */
    var root = document.documentElement;
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top: section.offsetTop - PIN_TOP + f * range, behavior: 'auto' });
    requestAnimationFrame(function () { root.style.scrollBehavior = prev; });
    kick();
  }

  /* overflow:clip means the browser physically cannot scroll a focused link
     into view, so tabbing into an off-screen bay would leave the focus ring
     invisible. Drive the page to that bay ourselves. behavior:'auto' matters:
     html{scroll-behavior:smooth} would otherwise animate for ~500ms with the
     focused control still off-screen, and we snap the smoother to match so
     the traverse doesn't ease in behind the focus ring. */
  section.addEventListener('focusin', function (e) {
    if (!live) return;
    for (var i = 0; i < bays.length; i++) {
      if (bays[i].contains(e.target)) {
        /* Deferred by a frame on purpose. The browser runs its own
           scroll-focused-element-into-view synchronously while the focus
           event dispatches; doing ours inline just loses that race and
           leaves the control off-screen. */
        var idx = i;
        requestAnimationFrame(function () { scrollToBay(idx); });
        return;
      }
    }
  });

  pin.addEventListener('scroll', function () {
    if (!live || !pin.scrollLeft) return;
    var stolen = pin.scrollLeft;
    pin.scrollLeft = 0;
    var top = section.offsetTop - PIN_TOP + (stolen / D) * range;
    window.scrollTo({ top: top, behavior: 'auto' });
  });

  apply();
  /* Web fonts change the width of every bay, which moves every centre. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);
})();
