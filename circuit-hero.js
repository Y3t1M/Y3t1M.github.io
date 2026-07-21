/* ============================================================
   PCB HERO — circuit-hero.js
   The hero is laid out like an MCU dev board. The intro card is
   the IC (U1); power enters at J2 through VR1; data buses route
   to the three navigation components (U2 Projects, U3 Desktop,
   J1 Resume). Every part sits on a net.
   ============================================================ */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  var canvas = document.getElementById('pcb-canvas');
  var chip = document.querySelector('.hero-panel');
  if (!hero || !canvas || !chip) return;

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0;
  var desktopLayout = window.matchMedia('(min-width: 861px)');

  function rgba(a) { return 'rgba(255,255,255,' + a + ')'; }
  function white(a) { return 'rgba(255,255,255,' + a + ')'; }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var mouse = { x: -9999, y: -9999, inside: false };
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.inside = true;
  });
  hero.addEventListener('pointerleave', function () { mouse.inside = false; mouse.x = -9999; mouse.y = -9999; });

  var comps = [
    { el: document.getElementById('comp-projects'), pinCount: 4, hover: false, flash: 0 },
    { el: document.getElementById('comp-desktop'), pinCount: 3, hover: false, flash: 0 },
    { el: document.getElementById('comp-resume'), pinCount: 3, hover: false, flash: 0 }
  ].filter(function (c) { return c.el; });

  comps.forEach(function (c) {
    c.el.addEventListener('pointerenter', function () { c.hover = true; });
    c.el.addEventListener('pointerleave', function () { c.hover = false; });
  });

  var traces = [], decor = [], xtalPads = [], led = null;
  var ledFlash = 0;
  var bootStart = null;

  function rel(el) {
    var dr = hero.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    return { x: r.left - dr.left, y: r.top - dr.top, w: r.width, h: r.height };
  }

  function mkTrace(pts, opts) {
    var cum = [0];
    for (var p = 1; p < pts.length; p++) {
      var dx = pts[p][0] - pts[p - 1][0], dy = pts[p][1] - pts[p - 1][1];
      cum.push(cum[p - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    var tr = {
      pts: pts, cum: cum, len: cum[cum.length - 1],
      glow: 0, prog: Math.random() * cum[cum.length - 1],
      speed: 55 + Math.random() * 45,
      wait: Math.random() * 3,
      kind: 'static', comp: null, base: 0.08, width: 1.1, period: null, onArrive: null
    };
    for (var k in opts) tr[k] = opts[k];
    return tr;
  }

  function buildBoard() {
    var c = rel(chip);
    traces = []; decor = []; xtalPads = []; led = null;

    /* mounting holes */
    [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]].forEach(function (m) {
      decor.push({ t: 'hole', x: m[0], y: m[1] });
    });

    /* power chain: J2 -> VR1 -> C1 -> U1, plus GND pin */
    var yv = c.y + c.h * 0.22;
    var yg = c.y + c.h * 0.78;
    decor.push({ t: 'body', x: 0, y: yv - 14, w: 24, h: 40 });
    decor.push({ t: 'pad', x: 22, y: yv - 3, w: 6, h: 6 });
    decor.push({ t: 'pad', x: 22, y: yv + 17, w: 6, h: 6 });
    decor.push({ t: 'text', s: 'J2', x: 5, y: yv - 18 });
    decor.push({ t: 'text', s: 'PWR', x: 3, y: yv + 38 });

    var vrL = Math.max(40, c.x - 64), vrR = vrL + 26;
    decor.push({ t: 'body', x: vrL, y: yv - 8, w: 26, h: 16 });
    decor.push({ t: 'pad', x: vrL - 5, y: yv - 3, w: 5, h: 6 });
    decor.push({ t: 'pad', x: vrR, y: yv - 3, w: 5, h: 6 });
    decor.push({ t: 'text', s: 'VR1', x: vrL + 1, y: yv - 12 });

    traces.push(mkTrace([[28, yv], [vrL - 5, yv]], { kind: 'in', base: 0.13, width: 2.2, period: 2.4, speed: 70 }));
    traces.push(mkTrace([[vrR + 5, yv], [c.x, yv]], { kind: 'in', base: 0.13, width: 2.2, period: 2.4, speed: 70 }));

    var cx1 = Math.min(vrR + 14, c.x - 12);
    traces.push(mkTrace([[cx1, yv], [cx1, yv + 12]], {}));
    decor.push({ t: 'pad', x: cx1 - 3, y: yv + 12, w: 6, h: 5 });
    decor.push({ t: 'pad', x: cx1 - 3, y: yv + 22, w: 6, h: 5 });
    decor.push({ t: 'text', s: 'C1', x: cx1 + 6, y: yv + 22 });
    traces.push(mkTrace([[cx1, yv + 27], [cx1, yv + 36]], {}));
    decor.push({ t: 'via', x: cx1, y: yv + 40 });

    traces.push(mkTrace([[28, yv + 20], [40, yv + 20]], {}));
    decor.push({ t: 'via', x: 44, y: yv + 20 });

    traces.push(mkTrace([[c.x, yg], [c.x - 20, yg]], {}));
    decor.push({ t: 'via', x: c.x - 24, y: yg });
    decor.push({ t: 'text', s: 'GND', x: c.x - 46, y: yg + 4 });

    /* crystal Y1 + load caps under the chip */
    var x1b = c.x + c.w * 0.30, x2b = c.x + c.w * 0.42;
    var yb = c.y + c.h, yY = yb + 26;
    if (yY + 30 < H) {
      traces.push(mkTrace([[x1b, yb], [x1b, yY - 4]], {}));
      traces.push(mkTrace([[x2b, yb], [x2b, yY - 4]], {}));
      xtalPads.push({ x: x1b - 4, y: yY - 4, w: 8, h: 7, ph: 0 });
      xtalPads.push({ x: x2b - 4, y: yY - 4, w: 8, h: 7, ph: Math.PI });
      decor.push({ t: 'body', x: x1b + 6, y: yY - 5, w: x2b - x1b - 12, h: 9, round: true });
      decor.push({ t: 'text', s: 'Y1 16MHz', x: x1b - 6, y: yY + 18 });
      [x1b, x2b].forEach(function (xx, i) {
        traces.push(mkTrace([[xx, yY + 3], [xx, yY + 11]], {}));
        decor.push({ t: 'pad', x: xx - 3, y: yY + 11, w: 6, h: 5 });
        decor.push({ t: 'text', s: i ? 'C4' : 'C3', x: xx + 6, y: yY + 17 });
        traces.push(mkTrace([[xx, yY + 16], [xx, yY + 22]], {}));
        decor.push({ t: 'via', x: xx, y: yY + 26 });
      });
    }

    /* status LED: chip top pin -> R1 -> D1 -> GND via */
    var xl = c.x + c.w * 0.78, yt = c.y, yl = yt - 26;
    if (yl > 12) {
      traces.push(mkTrace([[xl, yt], [xl, yt - 14], [xl + 12, yl], [xl + 30, yl]], {
        kind: 'out', base: 0.11, width: 1.2, period: 3.2, speed: 75,
        onArrive: function () { ledFlash = 1; }
      }));
      decor.push({ t: 'pad', x: xl + 30, y: yl - 3, w: 5, h: 6 });
      decor.push({ t: 'body', x: xl + 35, y: yl - 4, w: 14, h: 8 });
      decor.push({ t: 'pad', x: xl + 49, y: yl - 3, w: 5, h: 6 });
      decor.push({ t: 'text', s: 'R1 220', x: xl + 30, y: yl - 8 });
      traces.push(mkTrace([[xl + 54, yl], [xl + 64, yl]], {}));
      led = { x: xl + 70, y: yl };
      decor.push({ t: 'text', s: 'D1 STATUS', x: xl + 60, y: yl + 16 });
      traces.push(mkTrace([[xl + 76, yl], [xl + 86, yl]], {}));
      decor.push({ t: 'via', x: xl + 90, y: yl });
    }

    /* test point TP1 */
    var xt = c.x + c.w * 0.14;
    if (yt - 30 > 0) {
      traces.push(mkTrace([[xt, yt], [xt, yt - 14]], {}));
      decor.push({ t: 'padc', x: xt, y: yt - 19, r: 4.5 });
      decor.push({ t: 'text', s: 'TP1', x: xt - 10, y: yt - 28 });
    }

    /* expansion header J3: spare bottom pins straight down */
    if (yb + 60 < H) {
      var headerX = [0.08, 0.17, 0.58, 0.67].map(function (f) { return c.x + c.w * f; });
      headerX.forEach(function (xx) {
        traces.push(mkTrace([[xx, yb], [xx, H - 30]], { kind: 'out', base: 0.09, width: 1.1, period: 4 + Math.random() * 3, speed: 65 }));
        decor.push({ t: 'pad', x: xx - 3.5, y: H - 30, w: 7, h: 7 });
      });
      decor.push({ t: 'text', s: 'J3 · EXPANSION', x: headerX[0] - 4, y: H - 36 });
    }

    /* data buses: chip right edge -> nav components (desktop layout only) */
    if (desktopLayout.matches) {
      var rightPinCount = comps.reduce(function (s, cc) { return s + cc.pinCount; }, 0);
      var sorted = comps.slice().sort(function (a, b) { return rel(a.el).y - rel(b.el).y; });
      var pinIdx = 0;
      sorted.forEach(function (comp) {
        var cr = rel(comp.el);
        comp.pins = [];
        for (var p = 0; p < comp.pinCount; p++) {
          var y1 = c.y + c.h * (pinIdx + 1) / (rightPinCount + 1);
          var y2 = cr.y + cr.h * (p + 1) / (comp.pinCount + 1);
          comp.pins.push({ x: cr.x, y: y2 });
          var x1 = c.x + c.w, x2 = cr.x;
          var esc = 16 + p * 8;
          var pts = [[x1, y1], [x1 + esc, y1]];
          var xm = x1 + esc + Math.abs(y2 - y1);
          if (xm < x2 - 40) pts.push([xm, y2]);
          else { pts.push([x1 + esc, y2]); xm = x1 + esc; }
          if (p === Math.floor(comp.pinCount / 2) && (x2 - 16) - xm > 110) {
            var xs = xm + 26, a = 8;
            pts.push([xs, y2], [xs, y2 - a], [xs + 8, y2 - a], [xs + 8, y2 + a],
                     [xs + 16, y2 + a], [xs + 16, y2 - a], [xs + 24, y2 - a], [xs + 24, y2]);
          }
          pts.push([x2 - 10, y2], [x2, y2]);
          traces.push(mkTrace(pts, { kind: 'out', comp: comp, base: 0.11, width: 1.4, speed: 70 }));
          pinIdx++;
        }
      });
    } else {
      comps.forEach(function (comp) { comp.pins = null; });
    }

    /* silkscreen */
    decor.push({ t: 'text', s: 'HT-01 · REV E · FAB 2026', x: 30, y: H - 14 });
    decor.push({ t: 'text', s: 'VCC', x: 32, y: yv - 6 });
  }

  function pointAtLen(tr, L) {
    var pts = tr.pts, cum = tr.cum;
    for (var i = 1; i < pts.length; i++) {
      if (L <= cum[i]) {
        var f = (L - cum[i - 1]) / Math.max(cum[i] - cum[i - 1], 0.001);
        return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
      }
    }
    return pts[pts.length - 1];
  }

  function resize() {
    var r = hero.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildBoard();
  }
  resize();
  window.addEventListener('resize', resize);

  hero.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.hero-panel') || e.target.closest('.pcb-comp')) return;
    bootStart = null;
    for (var i = 0; i < traces.length; i++) { traces[i].prog = 0; traces[i].wait = Math.random() * 0.8; }
  });

  var last = null;
  function draw(now) {
    var dt = last === null ? 0.016 : Math.min((now - last) / 1000, 0.05);
    last = now;
    if (bootStart === null) bootStart = now;
    var B = Math.min(1, (now - bootStart) / 1800);
    B = B * B * (3 - 2 * B);
    var t = now / 1000;

    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = white(0.016);
    ctx.lineWidth = 1;
    for (var gx = 0.5; gx < W; gx += 24) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 0.5; gy < H; gy += 24) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    for (var i = 0; i < traces.length; i++) {
      var tr = traces[i];
      var min = 1e9;
      for (var p = 1; p < tr.pts.length; p++) {
        var mx = (tr.pts[p][0] + tr.pts[p - 1][0]) / 2 - mouse.x;
        var my = (tr.pts[p][1] + tr.pts[p - 1][1]) / 2 - mouse.y;
        var d2 = mx * mx + my * my;
        if (d2 < min) min = d2;
      }
      var target = mouse.inside ? Math.max(0, 1 - Math.sqrt(min) / 200) : 0;
      if (tr.comp && tr.comp.hover) target = 1;
      tr.glow += (target - tr.glow) * 0.1;

      ctx.strokeStyle = rgba((tr.base + tr.glow * 0.4) * B);
      ctx.lineWidth = tr.width;
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = tr.glow * 6;
      ctx.beginPath();
      ctx.moveTo(tr.pts[0][0], tr.pts[0][1]);
      for (var p2 = 1; p2 < tr.pts.length; p2++) ctx.lineTo(tr.pts[p2][0], tr.pts[p2][1]);
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (tr.kind === 'in' || tr.kind === 'out') {
        if (tr.wait > 0) { tr.wait -= dt; }
        else {
          tr.prog += tr.speed * dt * (1 + tr.glow * 1.5);
          if (tr.prog >= tr.len) {
            tr.prog = 0;
            tr.wait = tr.period !== null ? tr.period : 1.5 + Math.random() * 3;
            if (tr.comp) tr.comp.flash = 1;
            if (tr.onArrive) tr.onArrive();
          }
        }
        if (tr.wait <= 0 && B > 0.25) {
          var pp = pointAtLen(tr, tr.prog);
          ctx.fillStyle = rgba(0.42 + tr.glow * 0.4);
          ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 7;
          ctx.beginPath(); ctx.arc(pp[0], pp[1], tr.width > 2 ? 2.2 : 1.8, 0, 7); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    for (var dN = 0; dN < decor.length; dN++) {
      var d = decor[dN];
      if (d.t === 'body') {
        ctx.strokeStyle = white(0.11);
        ctx.lineWidth = 1;
        if (d.round && ctx.roundRect) { ctx.beginPath(); ctx.roundRect(d.x, d.y, d.w, d.h, 4); ctx.stroke(); }
        else ctx.strokeRect(d.x + 0.5, d.y + 0.5, d.w, d.h);
      } else if (d.t === 'pad') {
        ctx.fillStyle = rgba(0.22 * B);
        ctx.fillRect(d.x, d.y, d.w, d.h);
      } else if (d.t === 'padc') {
        ctx.strokeStyle = rgba(0.26 * B);
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.stroke();
      } else if (d.t === 'via') {
        ctx.strokeStyle = rgba(0.22 * B);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(d.x, d.y, 3, 0, 7); ctx.stroke();
        ctx.fillStyle = '#0b0b0b';
        ctx.beginPath(); ctx.arc(d.x, d.y, 1.2, 0, 7); ctx.fill();
      } else if (d.t === 'hole') {
        ctx.strokeStyle = white(0.08);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(d.x, d.y, 7, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.arc(d.x, d.y, 3.5, 0, 7); ctx.stroke();
      } else if (d.t === 'text') {
        ctx.font = '9.5px ui-monospace, Menlo, monospace';
        ctx.fillStyle = white(0.09);
        ctx.fillText(d.s, d.x, d.y);
      }
    }

    for (var xp = 0; xp < xtalPads.length; xp++) {
      var X = xtalPads[xp];
      ctx.fillStyle = rgba((0.16 + 0.08 * Math.sin(t * 12 + X.ph)) * B);
      ctx.fillRect(X.x, X.y, X.w, X.h);
    }

    if (led) {
      ledFlash = Math.max(0, ledFlash - dt * 1.2);
      ctx.fillStyle = rgba((0.14 + ledFlash * 0.7) * B);
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 3 + ledFlash * 13;
      ctx.beginPath(); ctx.arc(led.x, led.y, 4, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (var cN = 0; cN < comps.length; cN++) {
      var comp = comps[cN];
      if (comp.pins) {
        for (var cp = 0; cp < comp.pins.length; cp++) {
          var pin = comp.pins[cp];
          ctx.strokeStyle = rgba((0.24 + comp.flash * 0.5) * B);
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(pin.x - 8, pin.y); ctx.lineTo(pin.x, pin.y); ctx.stroke();
        }
      }
      comp.flash = Math.max(0, comp.flash - dt * 2);
      comp.el.classList.toggle('lit', comp.flash > 0.4);
    }
  }

  if (reduced) {
    bootStart = -9999;
    draw(2500);
  } else {
    var rafId = null;
    function frame(ts) { draw(ts); rafId = requestAnimationFrame(frame); }
    rafId = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; last = null; }
      else if (!rafId) rafId = requestAnimationFrame(frame);
    });
  }

  /* chip height can shift once fonts settle */
  setTimeout(buildBoard, 600);
})();
