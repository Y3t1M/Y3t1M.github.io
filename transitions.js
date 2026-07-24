/* Page transitions — Lift out on internal nav, Lift in on load — plus the
   nav switch sound (synthesized, dialed in the tuner). */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ── switch sound ──────────────────────────────────────────────
     A low, warm sand-hiss. No transient (slow attack), energy held in the
     low-mids, top rolled off for warmth. Dialed values from the tuner:
     pitch 950 · warmth 1450 · len 0.48 · soft 0.29 · tex 0.06 · level 0.024 */
  var SND = { pitch: 950, warmth: 1450, len: 0.48, soft: 0.29, tex: 0.06, level: 0.024 };
  var actx = null;
  function ctx() {
    if (!actx) { var C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function playSwitch() {
    try { if (localStorage.getItem('navSound') === 'off') return; } catch (e) {}
    var a = ctx(); if (!a) return;
    var p = SND, t = a.currentTime, d = p.len;
    var n = a.createBufferSource();
    var buf = a.createBuffer(1, Math.ceil(a.sampleRate * (d + 0.12)), a.sampleRate), ch = buf.getChannelData(0);
    for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    n.buffer = buf;
    var hp = a.createBiquadFilter(); hp.type = 'highpass';
    hp.frequency.setValueAtTime(p.pitch * 0.45, t);
    hp.frequency.exponentialRampToValueAtTime(p.pitch * 0.32, t + d);
    var bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.45;
    bp.frequency.setValueAtTime(p.pitch, t);
    bp.frequency.exponentialRampToValueAtTime(Math.max(120, p.pitch * 0.5), t + d);
    var tex = a.createGain(); tex.gain.setValueAtTime(1, t);
    for (var j = 1; j * 0.045 < d; j++) tex.gain.linearRampToValueAtTime(1 - p.tex / 2 + Math.random() * p.tex, t + j * 0.045);
    var lp = a.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(p.warmth * 1.7, t);
    lp.frequency.exponentialRampToValueAtTime(p.warmth, t + d);
    var env = a.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(p.level, t + p.soft);
    env.gain.exponentialRampToValueAtTime(0.0001, t + d);
    n.connect(hp); hp.connect(bp); bp.connect(tex); tex.connect(lp); lp.connect(env); env.connect(a.destination);
    n.start(t); n.stop(t + d + 0.06);
  }
  window.__navSwitchSound = playSwitch;   // nav-fx.js can reuse it

  /* ── Lift transition ──────────────────────────────────────────── */
  document.documentElement.classList.add('pt-ready');

  /* The in-animation translates `body`. animation-fill-mode:both would hold
     `transform: translateY(0)` on body forever, and any transform other than
     none makes body a containing block for position:fixed children — which
     would tear the fixed .bg-blob ambients off the viewport so they scroll
     with the page. Drop pt-ready once the lift lands so no transform lingers. */
  document.addEventListener('animationend', function (e) {
    if (e.animationName === 'pageIn') document.documentElement.classList.remove('pt-ready');
  });

  // restore if the page is resurrected from bfcache mid-lift
  window.addEventListener('pageshow', function () {
    document.documentElement.classList.remove('pt-out');
  });

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
    document.documentElement.classList.add('pt-out');
    setTimeout(function () { window.location.href = url.href; }, 250);
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
