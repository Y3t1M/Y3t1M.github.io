/* Page navigation — the Lift itself is done by the View Transitions API in
   CSS (@view-transition), which crosses the old and new page with no black
   gap. This file only plays the switch sound and flags the arrival so the
   next page settles its nav tick. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ── switch sound: a short, satisfying cymbal crash ──────────────
     Fast attack (no waiting for it to bloom — the old slow-attack hiss was
     being cut off by navigation before it was even audible), bright shimmer
     from filtered noise plus a couple of inharmonic partials, short decay,
     and a lowpass so it's crisp without the ice-pick top that gets annoying. */
  var actx = null;
  function ctx() {
    if (!actx) { var C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function noise(a, secs) {
    var b = a.createBuffer(1, Math.ceil(a.sampleRate * secs), a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function playSwitch() {
    try { if (localStorage.getItem('navSound') === 'off') return; } catch (e) {}
    var a = ctx(); if (!a) return;
    var t = a.currentTime;
    var out = a.createGain(); out.gain.value = 1; out.connect(a.destination);

    // the wash — filtered noise, fast in, short out
    var src = a.createBufferSource(); src.buffer = noise(a, 0.7);
    var hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    var bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(6200, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + 0.42);   // shimmer settles down
    var lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 8800; // tame harsh top
    var env = a.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.075, t + 0.006);     // ~6ms crash attack
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);     // short, satisfying decay
    src.connect(hp); hp.connect(bp); bp.connect(lp); lp.connect(env); env.connect(out);
    src.start(t); src.stop(t + 0.5);

    // a touch of metallic ting on top, gone quickly
    [5200, 7600].forEach(function (f, i) {
      var o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      var g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(i ? 0.014 : 0.02, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.22);
    });
  }
  window.__navSwitchSound = playSwitch;

  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest('a[href]');
    if (!a) return;
    if (a.classList.contains('nav-link')) playSwitch();   // feedback on any nav click, incl. Resume
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var url;
    try { url = new URL(a.getAttribute('href'), window.location.href); } catch (err) { return; }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.hash) return; // same-page anchor
    e.preventDefault();
    // tell the next page it arrived via internal nav, so it settles its tick
    try { sessionStorage.setItem('pt-arrive', '1'); } catch (err2) {}
    // brief hold so the crash is heard before the document unloads; the
    // View Transition animates the visual when the navigation fires.
    setTimeout(function () { window.location.href = url.href; }, 150);
  });
})();

/* nav-logo easter egg: click the name, it decodes into the face */
(function () {
  'use strict';
  var logo = document.querySelector('.nav-logo-text');
  if (!logo) return;
  var orig = logo.textContent;
  var FACE = '( ._.)';
  var CS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789#$%&';
  var busy = false;
  function scrambleTo(target, done) {
    var steps = 12, n = 0;
    var iv = setInterval(function () {
      n++;
      var reveal = Math.floor((n / steps) * target.length);
      var out = '';
      for (var i = 0; i < target.length; i++) {
        out += (i < reveal || target[i] === ' ') ? target[i]
             : CS[Math.floor(Math.random() * CS.length)];
      }
      logo.textContent = out;
      if (n >= steps) { clearInterval(iv); logo.textContent = target; if (done) done(); }
    }, 34);
  }
  logo.style.cursor = 'pointer';
  logo.addEventListener('click', function () {
    if (busy) return;
    busy = true;
    scrambleTo(FACE, function () {
      setTimeout(function () {
        scrambleTo(orig, function () { busy = false; });
      }, 1100);
    });
  });
})();
