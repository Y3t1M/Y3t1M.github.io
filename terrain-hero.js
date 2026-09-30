/* ============================================================
   SANDGLOW HERO — terrain-hero.js
   (filename kept so index.html and the deploy pipeline are
   untouched; the wireframe terrain this file used to draw is
   retired — git has it.)

   The field Hudson picked in the wave lab, 2026-09-01, shipped
   exactly as dialed: intensity 22 · touch 70 · drift 100.

   The rules of the field:
   - a raster of LED dots in perspective; the WAVE lives in
     their brightness and size — dots never jump, so the motion
     cannot jag
   - the whole field drifts slowly, sand creeping in wind
   - the touch is a hand through sand: grains push aside in a
     hand-sized radius, glow at the rim while displaced, and
     heal home slowly with no bounce
   - hovering blooms light under the hand (wider than the push)
   - a CLICK CASCADES: the pop, then echo rings rolling through
     in succession — applied after intensity scaling so it
     punches the same however quiet the wave is dialed
   - the click SPLITS the light (his click colour lab pick,
     2026-09-30: "A1 split · amount 81 · linger 44"): each ring
     pulls the dots it crosses into red, green and blue along its
     direction, and they come back to white behind it
   - a DRAG leaves a trace: a furrow the field heals over ~6s
     (his "+ trace" pick)
   - every 7-16s a SEAM sweeps through: a thin soft line of
     light at a random angle, brighter across the wave's crests
     (both shipped on his "ship both", 2026-09-01)

   Reduced motion runs full speed — Hudson's standing call for
   ambient texture (see the old file's note; the boot overlay
   still honours the setting, this layer is not held).
   ============================================================ */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  var canvas = document.getElementById('pcb-canvas');
  if (!hero || !canvas) return;
  var ctx = canvas.getContext('2d');
  /* mirrors __sandDiag — see the ?diag=1 panel in index.html */
  var TD = window.__terrainDiag = { mode: ctx ? 'sandglow-init' : 'no-2d', frames: 0, w: 0, h: 0 };
  if (!ctx) return;

  /* Hudson's dialed string. The tuner hook lets a lab page or the console
     retune live values without a deploy: __sandglow.P.int = ... */
  var P = { int: 0.22, touch: 0.70, drift: 1.00 };
  /* THE SEAM, Hudson's pick from the seam lab (2026-09-11): T4 Merge, heavy.
     In the last SEAM_BAND px of the hero every dot comes apart into sand; see
     the render loop. sand.js raises the real sand through the same band. */
  var SEAM_BAND = 300, SEAM_GRAINS = 5.6, SEAM_SCATTER = 1.35;
  window.__sandglow = { P: P };

  /* ---- noise (same voice as the retired terrain) ------------------- */
  function hh(x, y) { var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
  function vn(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hh(xi, yi), b = hh(xi + 1, yi), c = hh(xi, yi + 1), d = hh(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  /* ---- the raster --------------------------------------------------- */
  var W = 0, H = 0, ROWS = 26, rows = [];
  var qR = null, qG = null, qB = null;   /* the split dots' channel copies (see the render) */
  function build() {
    rows = [];
    var horizon = H * 0.24, total = 0;
    for (var ri = 0; ri < ROWS; ri++) {
      var z = ri / ROWS, zz = Math.pow(z, 1.6);
      var pitch = 9 + zz * 13;
      var n = Math.floor(W / pitch) + 2;
      var row = {
        z: z, zz: zz,
        y0: horizon + zz * (H - horizon) * 1.04,
        pitch: pitch, n: n,
        size: 0.9 + zz * 2.3,
        gain: 0.10 + zz * 0.62,
        u: new Float32Array(n),
        ox: new Float32Array(n),
        oy: new Float32Array(n)
      };
      for (var i = 0; i < n; i++) row.u[i] = (i + hh(ri, i) * 0.6) / n;
      rows.push(row);
      total += n;
    }
    /* one copy per channel per dot at most: x, y, size, alpha */
    qR = new Float32Array(total * 4); qG = new Float32Array(total * 4); qB = new Float32Array(total * 4);
  }
  function resize() {
    var r = hero.getBoundingClientRect();
    var w = Math.round(r.width), h = Math.round(r.height);
    /* Never let the canvas go degenerate — mobile fires resize mid-layout. */
    if (w < 2 || h < 2) return;
    /* Assigning width/height CLEARS the canvas and mobile URL-bar collapse
       fires resize constantly — bail when nothing changed. */
    if (w === W && h === H) return;
    TD.w = w; TD.h = h;
    W = canvas.width = w;
    H = canvas.height = h;
    build();
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  window.addEventListener('pageshow', function () { W = H = 0; resize(); });

  /* ---- the hand ----------------------------------------------------- */
  var mx = -9e3, my = -9e3, sx = -9e3, sy = -9e3, str = 0;
  var pvx = 0, pvy = 0, spd = 0, lastP = null, lastT = 0;
  var presses = [];   /* clicks: pop + cascading rings of light     */
  var dents = [];     /* the trace: drag furrows healing over ~6s   */
  var CASCADE = [[0, 0.8], [0.22, 0.45], [0.44, 0.26]];   /* echo delay s, amp */
  var streak = null, nextStreak = performance.now() / 1000 + 8;

  function heroXY(cx, cy) {
    var r = hero.getBoundingClientRect();
    return [cx - r.left, cy - r.top];
  }
  function track(x, y, dragging) {
    var now = performance.now() / 1000;
    if (lastP) {
      var dt = Math.max(0.008, now - lastT);
      pvx += ((x - lastP[0]) / dt - pvx) * 0.25;
      pvy += ((y - lastP[1]) / dt - pvy) * 0.25;
      spd = Math.hypot(pvx, pvy);
    }
    lastP = [x, y]; lastT = now;
    if (dragging) {
      var ld = dents[dents.length - 1];
      if (!ld || Math.hypot(x - ld.x, y - ld.y) > 26) {
        dents.push({ x: x, y: y, t: now });
        if (dents.length > 48) dents.shift();
      }
    }
  }
  hero.addEventListener('pointermove', function (e) {
    var p = heroXY(e.clientX, e.clientY);
    mx = p[0]; my = p[1];
    track(mx, my, e.pointerType === 'mouse' ? e.buttons > 0 : true);
  });
  hero.addEventListener('pointerleave', function () { mx = -9e3; my = -9e3; });
  /* Touch: pointermove is unreliable once a drag turns into a scroll, so
     read the touch point directly. Passive — the page must still scroll. */
  hero.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0];
    if (!t) return;
    var p = heroXY(t.clientX, t.clientY);
    mx = p[0]; my = p[1];
    track(mx, my, true);
  }, { passive: true });
  hero.addEventListener('touchend', function () {
    /* let the bloom relax instead of snapping off the instant you lift */
    setTimeout(function () { mx = -9e3; my = -9e3; }, 380);
  }, { passive: true });
  hero.addEventListener('pointerdown', function (e) {
    /* real controls are off-limits — a click on Resume is a click on Resume */
    if (e.target.closest('a, button')) return;
    var p = heroXY(e.clientX, e.clientY), now = performance.now() / 1000;
    presses.push({ x: p[0], y: p[1], t: now, cut: 0, lit: true, split: false, popT: 0,
                   R: [0, 0, 0], dec: [0, 0, 0], cw: [0, 0, 0], cpop: 0, cin: 0 });
    /* four clicks carry light, as before. A fifth pushes the oldest out: its
       white light stops at once, as it always has, and its split eases out
       over SPLIT.cut instead of vanishing mid-colour. */
    var lit = 0;
    for (var k = presses.length - 1; k >= 0; k--) {
      if (presses[k].cut) continue;
      if (++lit > 4) presses[k].cut = now;
    }
    if (presses.length > 8) presses.splice(0, presses.length - 8);
  });

  /* ---- the click's colour: A1 SPLIT ----------------------------------
     Hudson's pick from the click colour lab, round 2 (2026-09-30):
     "A1 split · amount 81 · linger 44". The ink stays white. Each echo
     ring pulls the dots it crosses apart into red, green and blue along
     the ring's direction (red outward, blue inward) and they snap back
     behind it; the pop splits a little too, and the field just inside the
     first ring stays slightly split for the linger. A dot's three channel
     copies are drawn additively, so where they overlap they add back to
     the ink: at zero split a dot is drawn exactly as before. Ported from
     the lab with its tuning. */
  var SPLIT = {
    amount: 0.81, linger: 0.44,   /* his string                                      */
    s: 1.25,      /* split at amount 100 on a ring's crest, in dot widths          */
    pop: 0.6,     /* the pop's share                                               */
    dec: 1.3,     /* how fast a ring's split relaxes, per second                   */
    inner: 0.3,   /* the linger's share, just inside the first ring                */
    att: 0.07,    /* s: every split eases in over this                             */
    tail: 0.3,    /* the last fraction of a click's life: the split eases out      */
    cut: 0.3,     /* s: a click pushed out by a fifth click eases out over this    */
    eps: 0.05     /* px: a split smaller than this is drawn as the plain dot       */
  };
  var LIGHT_LIFE = 2.1;                                   /* a click's white light, as before */
  var SETTLE = 0.12 + 1.3 * SPLIT.linger;                 /* s: how long the linger holds      */
  var SPLIT_LIFE = Math.max(LIGHT_LIFE, 0.6 + 3 * SETTLE);   /* 2.68 s at linger 44           */
  var ECHO_W = [1, 0.5625, 0.325];                        /* each echo's share of the split    */
  /* additive copies stack alpha as well as light: each is lifted so the
     three read as the plain dot over the hero's near-black */
  var LIFT = 225 / 228;
  window.__sandglow.split = SPLIT;
  function ease(v) { return v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v); }
  /* once per click per frame: the light's timing, as before, then the split's */
  function prep(pp, nowS) {
    var ca = nowS - pp.t, ei, cae;
    pp.lit = !pp.cut && ca < LIGHT_LIFE;
    pp.popT = Math.exp(-ca * 7);
    for (ei = 0; ei < 3; ei++) {
      cae = ca - CASCADE[ei][0];
      pp.R[ei] = cae * 240;
      pp.dec[ei] = Math.exp(-cae * 1.9);
      pp.cw[ei] = 0;
    }
    var master = ease((SPLIT_LIFE - ca) / (SPLIT.tail * SPLIT_LIFE));
    if (pp.cut) master *= 1 - ease((nowS - pp.cut) / SPLIT.cut);
    pp.split = master > 0;
    pp.cpop = 0; pp.cin = 0;
    if (!pp.split) return;
    var am = SPLIT.amount * master, a0 = ease(ca / SPLIT.att);
    for (ei = 0; ei < 3; ei++) {
      cae = ca - CASCADE[ei][0];
      if (cae > 0) pp.cw[ei] = ECHO_W[ei] * Math.exp(-cae * SPLIT.dec) * ease(cae / SPLIT.att) * am;
    }
    pp.cpop = SPLIT.pop * am * a0;
    pp.cin = SPLIT.inner * Math.exp(-ca / SETTLE) * am * a0;
  }
  function drawQ(q, n, style) {
    ctx.fillStyle = style;
    for (var j = 0; j < n; j += 4) { ctx.globalAlpha = q[j + 3]; ctx.fillRect(q[j], q[j + 1], q[j + 2], q[j + 2]); }
  }

  /* ---- render -------------------------------------------------------- */
  /* One ink for every dot and grain; each one's strength rides on globalAlpha.
     It used to build a new 'rgba(234,234,234,0.xyz)' string per dot, about
     5000 a frame, which the canvas then had to parse, and the garbage kept
     the collector busy. alpha8 lands on exactly the alpha that string gave:
     three decimals, then the 8 bits a colour's alpha is stored in. */
  var INK = 'rgb(234,234,234)';
  function alpha8(a) { return Math.round(Math.round(a * 1000) * 255 / 1000) / 255; }
  var last = performance.now();
  function render(nowMs) {
    var t = nowMs / 1000, dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs;
    if (!W || !H) { resize(); if (!W || !H) return; }
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = INK;

    var tgt = (mx > -999) ? 1 : 0;
    str += (tgt - str) * 0.08;
    if (mx > -999) {
      if (sx < -999) { sx = mx; sy = my; }
      sx += (mx - sx) * 0.16; sy += (my - sy) * 0.16;
    }
    spd *= 0.94;
    var nowS = nowMs / 1000;
    presses = presses.filter(function (p) {
      if (nowS - p.t >= SPLIT_LIFE) return false;
      return !(p.cut && nowS - p.cut >= SPLIT.cut);
    });
    var np = presses.length, nQ = 0;
    for (var pi = 0; pi < np; pi++) prep(presses[pi], nowS);
    dents = dents.filter(function (dn) { return nowS - dn.t < 6.5; });

    /* the seam: every 7-16s a thin line of light sweeps through at a
       random angle over ~3s — subtle, brighter where it crosses crests */
    if (!streak && nowS > nextStreak) {
      var th = Math.random() * Math.PI;
      var snx = -Math.sin(th), sny = Math.cos(th);
      var cs = [snx * 0 + sny * 0, snx * W + sny * 0, snx * 0 + sny * H, snx * W + sny * H];
      var cmin = Math.min.apply(null, cs) - 60, cmax = Math.max.apply(null, cs) + 60;
      var fwd = Math.random() < 0.5;
      streak = { nx: snx, ny: sny, c0: fwd ? cmin : cmax, c1: fwd ? cmax : cmin, t0: nowS, dur: 2.6 + Math.random() * 1.6, c: 0, env: 0 };
    }
    if (streak) {
      var sprog = (nowS - streak.t0) / streak.dur;
      if (sprog >= 1) { streak = null; nextStreak = nowS + 7 + Math.random() * 9; }
      else { streak.c = streak.c0 + (streak.c1 - streak.c0) * sprog; streak.env = Math.sin(Math.PI * sprog); }
    }

    var sig = 4200 + P.touch * 7000;
    var pushMax = 12 + P.touch * 30 + Math.min(10, spd * 0.010);
    var cyc = (t * 0.07) % 1.8, setZ = cyc < 1 ? cyc : -9;

    for (var ri = 0; ri < ROWS; ri++) {
      var row = rows[ri], zz = row.zz, y0 = row.y0;
      var flow = (0.0018 + zz * 0.0062) * (0.25 + P.drift * 1.5);
      var span = W + row.pitch * 2;
      var kS = SPLIT.s * row.size;          /* this row's split per unit of ring, px */
      for (var i = 0; i < row.n; i++) {
        row.u[i] = (row.u[i] + flow * dt) % 1;
        var xb = row.u[i] * span - row.pitch;
        var x = xb + row.ox[i];
        var y = y0 + row.oy[i];

        /* hand-through-sand: fast to disturb near the hand, slow to heal */
        var tox = 0, toy = 0, g = 0;
        if (str > 0.02 && sx > -999) {
          var dxm = x - sx, dym = y - sy;
          var d2 = dxm * dxm + dym * dym;
          g = Math.exp(-d2 / sig) * str;
          if (g > 0.01) {
            var m = Math.sqrt(d2) || 1;
            tox = (dxm / m) * pushMax * g;
            toy = (dym / m) * pushMax * g * 0.8;
          }
        }
        /* the trace: drag furrows keep grains displaced until they heal */
        var dentGlow = 0;
        for (var di = 0; di < dents.length; di++) {
          var dn = dents[di], ageD = nowS - dn.t;
          var dxd = x - dn.x, dyd = y - dn.y;
          var d2d = dxd * dxd + dyd * dyd;
          if (d2d > 26000) continue;
          var infl = Math.exp(-d2d / 4200) * Math.exp(-ageD / 3.2);
          if (infl > 0.012) {
            var md = Math.sqrt(d2d) || 1;
            tox += (dxd / md) * 24 * infl;
            toy += (dyd / md) * 18 * infl;
            dentGlow += infl;
          }
        }
        var approach = 1 - Math.exp(-dt * (0.85 + 30 * g));
        row.ox[i] += (tox - row.ox[i]) * approach;
        row.oy[i] += (toy - row.oy[i]) * approach;

        if (x < -6 || x > W + 6) continue;

        /* hover bloom — wider than the push, light leads */
        var bloom = 0;
        if (str > 0.02 && sx > -999) {
          var dxb = x - sx, dyb = y - sy;
          bloom = Math.exp(-(dxb * dxb + dyb * dyb) / (sig * 2.4)) * str;
        }

        /* the wave, as light */
        var nx = (xb / W - 0.5) / (0.25 + row.z * 1.5);
        var fv = vn(nx * 2.125 + 7.3, (1 - row.z) * 3.2 - t * 0.05) + 0.9 * vn(nx * 4.5 + 2.1, (1 - row.z) * 6.5 - t * 0.08);
        var lvl = Math.max(0, (fv - 0.28) / 1.5);
        var lvlBase = lvl;
        if (setZ > -1) lvl += 0.45 * P.int * Math.exp(-Math.pow((row.z - setZ) / 0.13, 2)) * lvl;
        var dist2 = Math.abs(row.ox[i]) + Math.abs(row.oy[i]);
        lvl += Math.min(0.7, dist2 / 26) * 0.45;
        lvl += bloom * (0.44 + P.touch * 0.35);
        lvl += dentGlow * 0.30;
        lvl *= (0.35 + P.int * 0.9);
        /* the click CASCADE: the pop, then echo rings rolling through in
           succession, each later, each softer. AFTER intensity scaling.
           The split rides the same rings: (ex, ey) is red's offset from
           green, and blue takes the opposite. */
        var ex = 0, ey = 0;
        for (var ci = 0; ci < np; ci++) {
          var cp = presses[ci];
          if (!cp.lit && !cp.split) continue;
          var cdx = x - cp.x, cdy = y - cp.y;
          var cd2 = cdx * cdx + cdy * cdy;
          var wp = 0;
          if (cp.lit) { wp = Math.exp(-cd2 / 3200) * cp.popT; lvl += wp * 1.15; }
          var cd = Math.sqrt(cd2), eR = 0;
          for (var ei = 0; ei < 3; ei++) {
            if (!(cp.R[ei] > 0)) continue;
            var dr = cd - cp.R[ei];
            var shape = Math.exp(-dr * dr / 2600);
            if (cp.lit) lvl += shape * cp.dec[ei] * CASCADE[ei][1];
            eR += shape * shape * cp.cw[ei];
          }
          if (!cp.split || cd <= 0.5) continue;
          var ins = 0;
          if (cp.cin > 0.0005) {
            var sIn = (cp.R[0] + 30 - cd) / 60;
            if (sIn > 0) ins = ease(sIn) * cp.cin;
          }
          var es = (eR + wp * cp.cpop + ins) * kS / cd;
          ex += cdx * es; ey += cdy * es;
        }
        /* the seam, catching the wave as it crosses */
        if (streak) {
          var sdd = (streak.nx * x + streak.ny * y) - streak.c;
          if (sdd * sdd < 9000) {
            lvl += Math.exp(-sdd * sdd / 1400) * 0.22 * streak.env * (0.5 + Math.min(1, lvlBase));
          }
        }

        var a = Math.min(0.9, row.gain * (0.22 + lvl * 1.15));
        if (a < 0.015) continue;
        var s2 = row.size * (0.5 + Math.min(1.25, lvl) * 0.8);
        /* the seam: near the bottom of the hero the dot loosens off the grid,
           settles, shrinks, and sheds grains of sand, while the real sand rises
           up through the same band. The grid crumbles into the field and there
           is no line. Everything is hashed per dot, so nothing flickers. */
        var mt = (y - (H - SEAM_BAND)) / SEAM_BAND;
        if (mt > 0) {
          if (mt > 1) mt = 1;
          var ang = hh(ri * 13.7 + 1.3, i * 7.9) * 6.2832, loose = mt * mt;
          x += Math.cos(ang) * loose * 9 * SEAM_SCATTER;
          y += (Math.sin(ang) * loose * 6 + loose * 7) * SEAM_SCATTER;
          s2 *= 1 - 0.6 * mt;
          var ng = mt > 0.12 ? 1 + Math.floor(mt * SEAM_GRAINS) : 0;
          for (var gk = 0; gk < ng; gk++) {
            var hk = hh(ri * 31.3 + gk * 17.1, i * 5.7 + gk * 3.3), hk2 = hh(ri * 9.9 + gk * 7.7, i * 13.1 + gk);
            var gan = hk * 6.2832, grr = (2 + 15 * mt * SEAM_SCATTER) * (0.35 + 0.65 * hk2);
            var shim = 0.55 + 0.45 * Math.sin(t * 1.7 + hk * 40);   /* shimmer like the sand, never blink */
            var gA = Math.min(0.9, a * 0.9 * mt * shim + 0.05 * mt);
            if (gA > 0.02) {
              ctx.globalAlpha = alpha8(gA);
              ctx.fillRect(x + Math.cos(gan) * grr, y + Math.sin(gan) * grr * 0.8 + mt * 4, 1, 1);
            }
          }
          a *= 1 - 0.72 * mt;                                    /* what is left of the dot fades */
          if (a < 0.015) continue;
        }
        if (Math.abs(ex) + Math.abs(ey) >= SPLIT.eps) {
          /* split: a copy per channel, queued for the one additive pass */
          var al = a, sat = (225 * al + 9) / 255, hs = s2 / 2;
          al *= LIFT; if (al > sat) al = sat;
          qR[nQ] = x + ex - hs; qR[nQ + 1] = y + ey - hs; qR[nQ + 2] = s2; qR[nQ + 3] = al;
          qG[nQ] = x - hs;      qG[nQ + 1] = y - hs;      qG[nQ + 2] = s2; qG[nQ + 3] = al;
          qB[nQ] = x - ex - hs; qB[nQ + 1] = y - ey - hs; qB[nQ + 2] = s2; qB[nQ + 3] = al;
          nQ += 4;
          continue;
        }
        ctx.globalAlpha = alpha8(a);
        ctx.fillRect(x - s2 / 2, y - s2 / 2, s2, s2);
      }
    }
    /* the split dots, in one additive pass: the composite mode switches once a frame */
    if (nQ) {
      ctx.globalCompositeOperation = 'lighter';
      drawQ(qR, nQ, '#ff0000');
      drawQ(qG, nQ, '#00ff00');
      drawQ(qB, nQ, '#0000ff');
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    TD.split = nQ / 4;                     /* ?diag=1 and the tests read how many dots are split */
  }

  /* ---- run only while the hero can be seen (kept from the terrain) --- */
  TD.mode = 'sandglow';
  var heroOnScreen = true;
  var rafId = null;
  var lastFrame = performance.now();
  function frame(ts) {
    lastFrame = performance.now();
    TD.frames++;
    render(ts);
    rafId = requestAnimationFrame(frame);
  }
  function start() { if (!rafId && heroOnScreen) { lastFrame = performance.now(); rafId = requestAnimationFrame(frame); } }
  start();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroOnScreen = entries[0].isIntersecting;
      if (!heroOnScreen) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
      else start();
    }, { rootMargin: '80px' }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
    else start();
  });
  /* Watchdog: mobile Safari suspends rAF under memory pressure and does not
     always resume it. If frames stop while visible, restart the loop. */
  setInterval(function () {
    if (document.hidden || !heroOnScreen) return;
    if (performance.now() - lastFrame > 1200) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      start();
    }
  }, 1500);
  window.addEventListener('pageshow', start);
})();
