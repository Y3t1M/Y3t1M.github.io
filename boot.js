/* ============================================================
   BOOT — boot.js
   The PLINTH mark assembles, holds, then retracts to reveal the
   site. First visit only; the flag is set the moment it starts,
   so a reload mid-boot does not replay it.

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

  var KEY = 'ht-boot-seen';
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

  /* Reduced motion: no held animation, no forced wait. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }

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
  var RET_BAR = { d: 180, delay: 350, ease: 'cubic-bezier(.5,0,1,.5)' };
  var RET_COL = { d: 340, delay: [500, 600, 700, 600, 500], ease: 'cubic-bezier(.6,0,.9,.4)' };
  var RETRACT = 1040, FADE = 380;

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
  function shrink(el, k, delay) {
    el.style.transformOrigin = 'center';
    return track(el.animate([
      { transform: sx(1), offset: 0, easing: 'linear' },
      { transform: sx(k), offset: 0.005, easing: RET_BAR.ease },
      { transform: sx(0), offset: 1 }
    ], { duration: RET_BAR.d, delay: delay, easing: 'linear', fill: 'both' }));
  }

  /* ---- build ------------------------------------------------------- */
  for (var i = 0; i < cols.length; i++) {
    cols[i].style.transformOrigin = 'bottom';
    track(cols[i].animate(
      [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
      { duration: RISE, delay: COL_DELAY[i], easing: RISE_EASE, fill: 'both' }));
  }
  for (var j = 0; j < bars.length; j++) grow(bars[j], BARS[j][3], BAR_DELAY);

  /* ---- retract, then reveal ---------------------------------------- */
  timers.push(setTimeout(function () {
    if (done) return;
    for (var j = 0; j < bars.length; j++) shrink(bars[j], BARS[j][3], RET_BAR.delay);
    for (var i = 0; i < cols.length; i++) {
      cols[i].style.transformOrigin = 'bottom';
      track(cols[i].animate(
        [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }],
        { duration: RET_COL.d, delay: RET_COL.delay[i], easing: RET_COL.ease, fill: 'both' }));
    }
    /* The overlay only starts clearing once the last column is gone —
       otherwise the home page fades in over a mark that is still moving. */
    stage.style.transition = 'opacity ' + FADE + 'ms cubic-bezier(.4,0,.2,1) ' + RETRACT + 'ms';
    stage.style.opacity = '0';
    timers.push(setTimeout(finishOnce, RETRACT + FADE));
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
    BUILD + HOLD + RETRACT + FADE + 1500));

  try { localStorage.setItem(KEY, '1'); } catch (e) {}
})();
