/* ============================================================
   BOOT — boot.js
   The PLINTH mark assembles, holds — then DOCKS: it flies to the
   top-left of the nav and becomes the site's wordmark while the
   overlay dissolves into the page underneath. The boot is the
   logo's origin story, not a thing that vanishes. It plays on
   every reload and fresh arrival (Hudson's call, 2026-08-31);
   the gate in index.html <head> owns that policy, and any input
   skips it instantly.

   The overlay itself lives in the markup and is shown by
   html.booting, which an inline <head> script sets before the
   body is parsed — otherwise the page would flash before the
   boot covered it.

   Geometry note: every bar is drawn 2 units INTO the columns it
   meets. Two shapes that merely touch antialias independently
   and neither edge reaches full opacity, which leaves a hairline
   seam around each bar. Overlapping shapes cannot do that.

   Timing note: because a bar is wider than the gap it fills, a
   plain 0→1 scale would spend its tail hidden under the columns
   — at the original widths only ~7% of the animation was ever on
   screen. So the visible span (0→k) gets 99.5% of the duration
   with the real easing, and the hidden remainder closes in the
   last 0.5%.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('booting')) return;

  function finish() {                       /* always leave the page usable */
    root.classList.remove('booting');
    /* release the hero's staggered entrance, so it plays into the reveal
       instead of being spent behind the overlay */
    root.classList.remove('fw-boot');
    root.classList.add('fw-booted');
    var el = document.getElementById('boot');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  var stage = document.getElementById('boot');
  if (!stage) { finish(); return; }

  /* Reduced motion plays the boot like everyone else — Hudson's call. The
     skip handlers below are the accommodation: any input ends it at once. */

  /* ---- the mark ---------------------------------------------------- */
  var TOP = 24, COLH = 72, W = 11;
  var COLS = [20, 38, 54.5, 71, 89];
  /* x, w, y, k — k is the scale at which the visible gap is full */
  var BARS = [
    [47,   9.5, 24,   0.5789],   /* T left  */
    [63.5, 9.5, 24,   0.5789],   /* T right */
    [29,   11,  54.5, 0.6364],   /* H left  */
    [80,   11,  54.5, 0.6364]    /* H right */
  ];

  var svg = '<svg viewBox="0 0 120 120" role="img" aria-label="Hudson Tinch">';
  COLS.forEach(function (x) {
    svg += '<rect class="b-col" x="' + x + '" y="' + TOP + '" width="' + W + '" height="' + COLH + '"/>';
  });
  BARS.forEach(function (b) {
    svg += '<rect class="b-bar" x="' + b[0] + '" y="' + b[2] + '" width="' + b[1] + '" height="11"/>';
  });
  stage.innerHTML = svg + '</svg>';

  var cols = stage.querySelectorAll('.b-col');
  var bars = stage.querySelectorAll('.b-bar');

  /* ---- the spec ---------------------------------------------------- */
  var RISE = 560, RISE_EASE = 'cubic-bezier(.16,1,.3,1)';
  var COL_DELAY = [550, 415, 280, 415, 550];       /* centre out */
  var BAR = 560, BAR_EASE = 'cubic-bezier(.2,.7,.2,1)', BAR_DELAY = 1410;
  var BUILD = 1970, HOLD = 600;

  var anims = [], timers = [], done = false;

  function track(a) { anims.push(a); return a; }
  function sx(v) { return 'scaleX(' + v + ')'; }

  function grow(el, k, delay) {
    el.style.transformOrigin = 'center';
    return track(el.animate([
      { transform: sx(0), offset: 0, easing: BAR_EASE },
      { transform: sx(k), offset: 0.995, easing: 'linear' },
      { transform: sx(1), offset: 1 }
    ], { duration: BAR, delay: delay, easing: 'linear', fill: 'both' }));
  }
  /* ---- build ------------------------------------------------------- */
  for (var i = 0; i < cols.length; i++) {
    cols[i].style.transformOrigin = 'bottom';
    track(cols[i].animate(
      [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
      { duration: RISE, delay: COL_DELAY[i], easing: RISE_EASE, fill: 'both' }));
  }
  for (var j = 0; j < bars.length; j++) grow(bars[j], BARS[j][3], BAR_DELAY);

  /* ---- dock, dissolving into the page ---------------------------------
     FLIP the built mark onto the .nav-mark slot in the top-left, while the
     overlay's BACKGROUND (not the overlay — the flying mark must stay solid)
     dissolves to reveal the page. The hero's staggered entrance is released
     at the same moment, so the site assembles under the mark as it lands. */
  var DOCK = 640, DISSOLVE = 520;
  timers.push(setTimeout(function () {
    if (done) return;
    var slot = document.querySelector('.nav-mark');
    var svg = stage.querySelector('svg');
    if (!slot || !svg) { skip(); return; }
    var f = svg.getBoundingClientRect(), s = slot.getBoundingClientRect();
    if (!f.width || !s.width) { skip(); return; }
    svg.style.transformOrigin = 'top left';
    track(svg.animate([
      { transform: 'translate(0px,0px) scale(1)' },
      { transform: 'translate(' + (s.left - f.left) + 'px,' + (s.top - f.top) + 'px)' +
        ' scale(' + (s.width / f.width) + ')' }
    ], { duration: DOCK, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' }));

    stage.style.backgroundColor = '#0b0b0b';
    void stage.offsetWidth;                       /* commit the start colour */
    stage.style.transition = 'background-color ' + DISSOLVE + 'ms ease 120ms';
    stage.style.backgroundColor = 'rgba(11,11,11,0)';
    stage.style.pointerEvents = 'none';

    /* the page assembles underneath while the veil dissolves */
    root.classList.remove('fw-boot');
    root.classList.add('fw-booted');

    /* finish the frame the flight ends — the nav mark is revealed by
       .booting leaving the <html> element, at identical geometry */
    timers.push(setTimeout(finishOnce, DOCK + 30));
  }, BUILD + HOLD));

  function finishOnce() {
    if (done) return;
    done = true;
    anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    timers.forEach(clearTimeout);
    finish();
  }

  /* ---- skip -------------------------------------------------------- */
  /* Nobody should be held here. Any deliberate input clears it at once. */
  function skip() {
    if (done) return;
    done = true;
    anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    timers.forEach(clearTimeout);
    stage.style.transition = 'opacity 180ms linear';
    stage.style.opacity = '0';
    setTimeout(finish, 190);
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, skip, { once: true, passive: true });
  });

  /* Belt and braces: if anything above throws or a frame never lands,
     the page must not stay covered. */
  timers.push(setTimeout(function () { if (!done) { done = true; finish(); } },
    BUILD + HOLD + 640 + 520 + 1500));

})();
