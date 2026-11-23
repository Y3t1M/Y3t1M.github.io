/* ============================================================
   LIQUID HERO: liquid-hero.js

   The home hero's centerpiece, Hudson's pick from the ASCII
   labs (2026-11-22: "the liquid is very cool"). It replaces the
   sandglow field (terrain-hero.js, retired; git has it).

   A pool of liquid sits along the bottom of the hero, drawn
   entirely in text: five stacked layers of real characters, one
   per brightness. There is no canvas anywhere in this file, so
   there is nothing for a privacy extension to block or blur.

   The rules of the pool:
   - underneath it is a particle fluid (double-density
     relaxation), sampled into a 2x4 grid per character so the
     surface gets crisp line characters and the body a shaded
     ramp
   - a CLICK or TAP is a strike: a comet comes down to where you
     pressed, the surface is thrown up as a crown of separate
     drops, a ring races out through the liquid, a jet rebounds
     a beat later, the liquid layer shakes and the headline
     letters jump in a wave away from the hit. Holding first
     charges it (1x to 2.2x)
   - a DRAG or a moving mouse pushes the liquid; scrolling the
     page kicks it
   - on a phone, TILT pours it: gravity follows the way the
     phone is held, in every direction. An iPhone only hands
     over motion after a touch and Apple's own prompt; there is
     no button for it, the first tap on the hero asks, once
   - it has NO FLOOR: low in the pool the body thins out into
     single characters that sink on past the hero's edge into
     the next section and fade there, so the first screen runs
     into the second (his ask, 2026-11-22)
   - behind the whole hero, the words included, is a faint GRID
     of dots and crosses on the pool's own character grid. It
     fades out with the pool through the transition and stops
     there: below it the sand is the centerpiece (his calls,
     2026-11-22). The hero draws it as one repeating image; the
     pool only draws the marks that light up, under the mouse
     and where a strike's ring passes
   - LEFT ALONE it is calm (his ask, same day: "it needs to be
     more calm at idle"): a few seconds after the last touch the
     particles are held to a slide instead of a simmer and the
     surface is drawn as one smooth line with a slow swell. It
     wakes the moment it is touched. Everything that decides the
     idle behaviour is in CALM below
   - it runs only while the hero is on screen, and thins itself
     (fewer particles, then no glow) on a device that cannot
     keep up

   Reduced motion: the ambient pool still moves (Hudson's
   standing call for ambient texture), but the shake, the flash,
   the slow motion and the letter jump are skipped.

   The fluid section is the engine from the Liquid Hero Lab
   (~/Mac Projects/hudsontinch-labs/liquid-hero), carried over
   as tested; its lines are dense on purpose. Tune it there,
   measure with the rigs beside it, then port.
   ============================================================ */
(function () {
  'use strict';

  const hero = document.querySelector('.hero'), host = document.getElementById('liquid');
  /* ?diag=1 reads this (index.html) */
  const DIAG = window.__liquidDiag = { mode: hero && host ? 'init' : 'no hero', frames: 0, grid: '', particles: 0, work: 0, tilt: 'off', err: '' };
  if (!hero || !host) return;
  const panel = hero.querySelector('.hero-panel');

  /* the five layers, dimmest first, and a hidden ruler for the character width */
  host.innerHTML = '<div class="lq-shake"><div class="lq lq-t0"></div><div class="lq lq-t1"></div><div class="lq lq-t2"></div><div class="lq lq-t3"></div><div class="lq lq-t4"></div><span class="lq lq-probe">' + 'M'.repeat(80) + '</span></div>';
  const shk = host.firstChild, LAY = [null, shk.children[1], shk.children[2], shk.children[3], shk.children[4], shk.children[0]], probe = shk.children[5];

  const SUBX = 2, SUBY = 4, RAMP = ' .:-=+*#%@', HEADS = '$#{<@%>';
  const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let W = 0, H = 0, cols = 0, rows = 0, cw = 5, lh = 9, BW = 0, BH = 0, subW = 2.5, subH = 2.25, narrow = false, aTop = 0, rTop = 0, pBot = 0, now = 0, EXT = 0, FR = 0, FB = 0;
  let lb, mb, cN, cL, cQ, ch, tier, rowBuf;
  const prev = ['', '', '', '', '', ''];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* the grid: sized from the hero, the type scaled so a phone gets about 84 columns and a desktop about 210 */
  function measure() {
    const r = hero.getBoundingClientRect(); if (!r.width || !r.height) return;
    W = r.width; H = r.height; narrow = W <= 860;                     /* the same line styles.css draws for the stacked hero */
    let fs = W / (narrow ? 84 : 210) / 0.6; if (!narrow && fs > 12) fs = Math.max(12, W / 320 / 0.6); if (narrow) fs = Math.min(fs, 10); fs = Math.max(7.5, Math.round(fs * 2) / 2);
    lh = Math.round(fs * 1.14);
    host.style.setProperty('--lq-fs', fs + 'px'); host.style.setProperty('--lq-lh', lh + 'px');
    cw = probe.getBoundingClientRect().width / 80 || fs * 0.6;
    /* the grid runs EXT px past the hero's bottom edge: that is where what sinks out of the pool fades into the next section (styles.css gives the layer the same room) */
    EXT = narrow ? 150 : 200; host.style.setProperty('--lq-ext', EXT + 'px');
    cols = Math.max(24, Math.floor(W / cw)); rows = Math.max(12, Math.floor((H + EXT) / lh));
    BW = cols * SUBX; BH = rows * SUBY; subW = cw / SUBX; subH = lh / SUBY; FR = Math.min(rows, Math.ceil(H / lh)); FB = Math.min(BH, Math.round(H / subH));   /* the floor's row and sub-row */
    const nb = BW * BH, nc = cols * rows;
    lb = new Float32Array(nb); mb = new Uint8Array(nb); cN = new Uint8Array(nc); cL = new Float32Array(nc); cQ = new Uint16Array(nc); ch = new Uint16Array(nc); tier = new Uint8Array(nc); rowBuf = new Uint16Array(cols);
    /* where the words end: the pool never rises into them, and on a phone the spray stays below them */
    pBot = panel ? Math.max(0, panel.getBoundingClientRect().bottom - r.top) : 0;
    aTop = narrow ? pBot + 6 : 0; rTop = Math.ceil(aTop / lh);
    F.build(); F.hole = null;
    heroGrid(fs);
    DIAG.grid = cols + 'x' + rows;
  }
  /* The backdrop grid. One image, as wide as the hero and one grid period tall (so it never drifts sideways), repeated down
     the pool's own layer, which covers the hero and runs on through the transition, where its fade takes the grid out with
     the pool. The marks sit where the pool's own '·' and '+' characters would: centred in their cell, 0.539 / 0.526 of the
     way down the line (measured), so a mark the pool lights lands exactly on one of these. */
  function heroGrid(fs) {
    const st = host.style;
    if (!CALM.grid) { st.backgroundImage = ''; return; }
    const gx = CALM.gridX, gy = CALM.gridY, g0 = gx >> 1, Hh = 4 * gy * lh, arm = fs * 0.235, f = v => v.toFixed(2); let dots = '', plus = '';
    for (let j = 0; j < 4; j++) for (let x = g0, k = 0; x < cols; x += gx, k++) { const X = (x + 0.5) * cw;
      if (j === 0 && k % 4 === 0) { const Y = 0.526 * lh; plus += 'M' + f(X - arm) + ' ' + f(Y) + 'h' + f(arm * 2) + 'M' + f(X) + ' ' + f(Y - arm) + 'v' + f(arm * 2); }
      else dots += 'M' + f(X) + ' ' + f((j * gy + 0.539) * lh) + 'h.01'; }
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + f(W) + '" height="' + Hh + '" viewBox="0 0 ' + f(W) + ' ' + Hh + '" fill="none" stroke="#eaeaea" stroke-opacity=".15"><path d="' + dots + '" stroke-width="' + f(Math.max(1, fs * 0.15)) + '" stroke-linecap="round"/><path d="' + plus + '" stroke-width="' + f(Math.max(0.8, fs * 0.085)) + '"/></svg>';
    st.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    st.backgroundRepeat = 'repeat-y'; st.backgroundSize = f(W) + 'px ' + Hh + 'px'; st.backgroundPosition = '0 0';
  }
  function set(x, y, code, tr) { if (x < 0 || y < 0 || x >= cols || y >= rows) return; const c = y * cols + x; ch[c] = code; tier[c] = tr; }
  function put(x, y, s, tr, solid) { x = Math.round(x); y = Math.round(y); if (y < 0 || y >= rows) return; for (let i = 0; i < s.length; i++) { const X = x + i; if (X < 0 || X >= cols) continue; const code = s.charCodeAt(i); if (code === 32 && !solid) continue; const c = y * cols + X; ch[c] = code; tier[c] = tr; } }
  const mid = (cx, y, s, tr) => put(Math.round(cx - s.length / 2) - 1, y, ' ' + s + ' ', tr, true);
  /* each layer is one string; a layer whose string did not change is not touched */
  function flush() {
    for (let k = 1; k <= 5; k++) { let out = '';
      for (let y = 0; y < rows; y++) { const base = y * cols; let any = false;
        for (let x = 0; x < cols; x++) { if (tier[base + x] === k) { rowBuf[x] = ch[base + x]; any = true; } else rowBuf[x] = 32; }
        out += (any ? String.fromCharCode.apply(null, rowBuf) : '') + '\n'; }
      if (out !== prev[k]) { LAY[k].textContent = out; prev[k] = out; } }
  }

  /* the headline, letter by letter, so it can flinch. At rest the headline is exactly the markup in index.html: wrapping
     the letters costs the type its kerning in Safari (the second line grows a pixel), so they are wrapped only for the
     second they jump and the original nodes go straight back. Each word is kept whole so a jumping letter cannot rewrap it. */
  const title = hero.querySelector('.hero-title'); let LETTERS = null, plainNodes = null, joltT = 0;
  const swap = nodes => { while (title.firstChild) title.removeChild(title.firstChild); for (const n of nodes) title.appendChild(n); };
  function unwrapTitle() { if (LETTERS) { swap(plainNodes); LETTERS = null; plainNodes = null; } }
  function wrapTitle() {
    plainNodes = Array.from(title.childNodes); LETTERS = []; const out = [];
    for (const n of plainNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) { out.push(n.cloneNode(true)); continue; }
      n.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { out.push(document.createTextNode(part)); return; }
        const wd = document.createElement('span'); wd.className = 'lq-w';
        for (const c of part) { const sp = document.createElement('span'); sp.className = 'lq-c'; sp.textContent = c; wd.appendChild(sp); LETTERS.push(sp); }
        out.push(wd);
      });
    }
    swap(out);
  }
  function jolt(x) {
    if (REDUCED || !title) return;
    if (!LETTERS) wrapTitle();
    const sr = hero.getBoundingClientRect(), at = LETTERS.map(sp => { const r = sp.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - sr.left - x); });
    LETTERS.forEach(sp => { sp.style.animation = 'none'; });
    void title.offsetWidth;
    let longest = 0;
    LETTERS.forEach((sp, i) => { const d = Math.round(40 + at[i] * 0.55); if (d > longest) longest = d; sp.style.animation = 'lq-jolt 0.5s ' + d + 'ms both'; });
    clearTimeout(joltT); joltT = setTimeout(unwrapTitle, longest + 560);
  }
  let shakeT = 0, shakeA = 0;
  function shake(a) { if (REDUCED) return; shakeT = 0.32; shakeA = Math.max(shakeA, a); }

  const ptr = { x: -1, y: -1, inside: false, down: false, moved: 0, lx: 0, ly: 0, mouse: false, vx: 0, vy: 0, lt: 0, t0: 0 };

  /* ================= the fluid ================= */
  const QL = [1, 0.8, 0.64, 0.5];
  /* a stable random number for a cell, the same every frame */
  const hsh = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  /* idle: how the liquid behaves when nobody is touching it. rock = how far gravity leans side to side (share of gravity) and how fast; damp = extra drag once it has been left alone (t0 to t1 seconds after the last disturbance);
     drips = seconds between them and how many particles; jit = random nudge at the walls (1 keeps it simmering); shim = speed of the shading bands; level = start with a flat top row; sleep = px a settled particle may creep before it is held still */
  const CALM = { depth: 0.8, glow: 0.12, rock: 0.02, rockW: 0.32, damp: 0.962, t0: 2.2, t1: 5.5, dripMin: 16, dripVar: 12, dripN: 2, jit: 0, shim: 0.55, level: 1, sleep: 0, relax: 0.2,
    blur: 5, swell: 1.4, wave: 64, swellW: 0.42, rip: 1.7,
    thin0: 0.38, thinK: 0.14, sink: 0.5,      /* no floor: below thin0 of its depth the body thins out to thinK of its characters, which sink (rows a second) on through the floor and fade */
    grid: 2, gridX: 4, gridY: 2 };            /* grid 1: drawn here in characters; 2: the page draws it and only lit marks are drawn here. The backdrop: a faint grid of dots in the air above the pool, one every gridX columns and gridY rows, a + at every fourth */   /* the still surface: blur = characters it is eased over, swell = height of the slow wave (quarter rows), wave = its length in characters, swellW = its speed, rip = height of the ring a drip leaves */
  const F = {
    n: 0, qi: 0, px: null, py: null, vx: null, vy: null, qx: null, qy: null, rho: null, head: null, next: null, h: 16, sp: 8, gxn: 0, gyn: 0, rho0: 0, acc: 0, surf: 0,
    boost: 0, flash: 0, slow: 0, rings: [], mets: [], jets: [], sparks: [], flares: [], dripT: 3, calm: 0, qt: 0, pq: 0, rq: 0, tq: 0, hT: null, hA: null, hB: null, hOn: false, rips: [], rgx: 0, rgy: 1, gx: 0, gy: 1, glyph: 0, born: 0, strikes: 0, hintRow: 3, hole: null, colOff: null, keepRow: null,
    build() {
      const want = H * (narrow ? 0.47 : 0.34) * CALM.depth, depth = clamp(Math.min(want, H - pBot - (narrow ? 78 : 36)), H * 0.16, want), base = clamp(Math.round(W * depth / (narrow ? 50 : 118)), 500, 2600), N0 = Math.round(base * QL[this.qi]), sp = Math.sqrt(W * depth / N0), h = sp * 2.15, per = Math.max(4, Math.floor((W - 8) / sp)), N = CALM.level ? Math.max(per, Math.round(N0 / per) * per) : N0;
      this.n = N; this.sp = sp; this.h = h; this.surf = H - depth;
      this.px = new Float32Array(N); this.py = new Float32Array(N); this.vx = new Float32Array(N); this.vy = new Float32Array(N); this.qx = new Float32Array(N); this.qy = new Float32Array(N); this.rho = new Float32Array(N).fill(9);
      this.gxn = Math.ceil(W / h) + 2; this.gyn = Math.ceil(H / h) + 2; this.head = new Int32Array(this.gxn * this.gyn); this.next = new Int32Array(N);
      for (let i = 0; i < N; i++) { const r = Math.floor(i / per), c = i % per; this.px[i] = 5 + c * sp + (r & 1 ? sp * 0.5 : 0) + ((i * 7919 % 100) / 100 - 0.5); this.py[i] = H - 5 - r * sp * 0.87; }
      this.rho0 = 0; this.acc = 0; this.colOff = new Int32Array(cols); this.keepRow = new Float32Array(rows); this.nb = new Int32Array(96); this.nq = new Float32Array(96); this.nux = new Float32Array(96); this.nuy = new Float32Array(96);
      this.rings.length = 0; this.mets.length = 0; this.jets.length = 0; this.sparks.length = 0; this.flares.length = 0; this.born = now; work.n = 0; work.sum = 0; this.calm = CALM.t1; this.qt = 1; this.pq = 1; this.hOn = false; this.rips.length = 0; this.rgx = this.gx; this.rgy = this.gy; this.dripT = CALM.dripMin * 0.5 + Math.random() * CALM.dripVar * 0.5;
      this.hintRow = narrow ? Math.max(rTop + 1, Math.floor(this.surf / lh) - 4) : Math.max(2, Math.floor(this.surf / lh) - 7); DIAG.particles = N;
    },
    step(dt) {
      const N = this.n, h = this.h, h2 = h * h, px = this.px, py = this.py, vx = this.vx, vy = this.vy, qx = this.qx, qy = this.qy, gxn = this.gxn, gyn = this.gyn, head = this.head, next = this.next, G = 1500;
      const gxa = G * this.gx, gya = G * this.gy, act = ptr.inside && (ptr.down || ptr.mouse) && ptr.moved > (ptr.mouse ? 2 : 16), Rp = Math.max(50, h * 3.4), R2 = Rp * Rp, stir = ptr.vx * ptr.vx + ptr.vy * ptr.vy > 900; let hit = 0;
      for (let i = 0; i < N; i++) { vy[i] += gya * dt; vx[i] += gxa * dt;
        if (act) { const dx = px[i] - ptr.x, dy = py[i] - ptr.y, d2 = dx * dx + dy * dy; if (d2 < R2) { if (stir) hit = 1; const f = (1 - Math.sqrt(d2) / Rp) * 0.5; vx[i] += (ptr.vx - vx[i]) * f; vy[i] += (ptr.vy - vy[i]) * f; } }
        qx[i] = px[i]; qy[i] = py[i]; px[i] += vx[i] * dt; py[i] += vy[i] * dt; }
      if (hit) this.calm = 0;
      for (const rg of this.rings) { const r0 = rg.r - 20, r1 = rg.r + 20, k = 2200 * rg.pw * dt * rg.life; for (let i = 0; i < N; i++) { const dx = px[i] - rg.x, dy = py[i] - rg.y, d2 = dx * dx + dy * dy; if (d2 < r0 * r0 || d2 > r1 * r1) continue; const d = Math.sqrt(d2) + 1; px[i] += dx / d * k * dt; py[i] += dy / d * k * dt; } }
      head.fill(-1); for (let i = 0; i < N; i++) { const c = clamp(Math.floor(py[i] / h) + 1, 0, gyn - 1) * gxn + clamp(Math.floor(px[i] / h) + 1, 0, gxn - 1); next[i] = head[c]; head[c] = i; }
      const nb = this.nb, nq = this.nq, nux = this.nux, nuy = this.nuy, kP = 0.9, kN = 1.6, mx = this.sp * 0.4, rho = this.rho; let rs = 0;
      for (let i = 0; i < N; i++) { const xi = px[i], yi = py[i], cxg = clamp(Math.floor(xi / h) + 1, 0, gxn - 1), cyg = clamp(Math.floor(yi / h) + 1, 0, gyn - 1); let cnt = 0, ro = 0, roN = 0;
        for (let gy = cyg - 1; gy <= cyg + 1; gy++) { if (gy < 0 || gy >= gyn) continue; for (let gxx = cxg - 1; gxx <= cxg + 1; gxx++) { if (gxx < 0 || gxx >= gxn) continue;
          for (let j = head[gy * gxn + gxx]; j >= 0; j = next[j]) { if (j === i) continue; const dx = px[j] - xi, dy = py[j] - yi, r2 = dx * dx + dy * dy; if (r2 >= h2 || r2 < 1e-6 || cnt >= 96) continue; const r = Math.sqrt(r2), q = 1 - r / h; ro += q * q; roN += q * q * q; nb[cnt] = j; nq[cnt] = q; nux[cnt] = dx / r; nuy[cnt] = dy / r; cnt++; } } }
        rho[i] = ro; rs += ro; const P = kP * (ro - this.rho0), PN = kN * roN; let ax = 0, ay = 0;
        for (let k = 0; k < cnt; k++) { const q = nq[k]; let D = (P * q + PN * q * q) * this.sp * 0.5; D = clamp(D, -mx, mx); const j = nb[k], ddx = nux[k] * D * 0.5, ddy = nuy[k] * D * 0.5; px[j] += ddx; py[j] += ddy; ax -= ddx; ay -= ddy; }
        px[i] += ax; py[i] += ay; }
      if (!this.rho0) this.rho0 = rs / N * 1.02;
      const vm = h / dt * (this.boost > 0 ? 0.82 : 0.62), vm2 = vm * vm, top0 = narrow ? Math.max(3, aTop + 6) : 3, qt = this.pq, jf = CALM.jit ? 1 : 1 - qt, dmp = 0.9925 - (0.9925 - CALM.damp) * qt, lim = this.rho0 * 0.42, slp = CALM.sleep * qt, slp2 = slp * slp, ur = 1 - (1 - CALM.relax) * qt;
      for (let i = 0; i < N; i++) {
        if (!(px[i] === px[i]) || !(py[i] === py[i])) { px[i] = 6 + (i * 37 % 100) / 100 * (W - 12); py[i] = this.surf - 4; qx[i] = px[i]; qy[i] = py[i]; }
        if (px[i] < 3 || px[i] > W - 3 || py[i] > H - 3 || py[i] < top0) { const o = (i * 37 % 100) * 0.002 * (1 - jf) + Math.random() * 0.2 * jf; if (px[i] < 3) px[i] = 3 + o; else if (px[i] > W - 3) px[i] = W - 3 - o; if (py[i] > H - 3) py[i] = H - 3 - o; else if (py[i] < top0) py[i] = top0 + o * 10; }
        if (ur < 1 && rho[i] >= lim) { px[i] = qx[i] + (px[i] - qx[i]) * ur; py[i] = qy[i] + (py[i] - qy[i]) * ur; }
        if (slp2 && rho[i] >= lim) { const ex = px[i] - qx[i], ey = py[i] - qy[i]; if (ex * ex + ey * ey < slp2) { px[i] = qx[i]; py[i] = qy[i]; } }
        let ux = (px[i] - qx[i]) / dt, uy = (py[i] - qy[i]) / dt; const s2 = ux * ux + uy * uy; if (s2 > vm2) { const k = vm / Math.sqrt(s2); ux *= k; uy *= k; } const dd = rho[i] < lim ? 0.9925 : dmp; vx[i] = ux * dd; vy[i] = uy * dd; }
    },
    surfAt(x) { const px = this.px, py = this.py, rho = this.rho, lim = this.rho0 * 0.5, w = this.h * 1.3; let top = H; for (let i = 0; i < this.n; i++) if (rho[i] > lim && py[i] < top && Math.abs(px[i] - x) < w) top = py[i]; return top >= H ? this.surf : top; },
    strike(x, y, pw) {                                           /* the comet: it arrives a moment later */
      if (this.mets.length > 5) return; this.calm = 0; const sy = this.surfAt(x), ty = y > sy + 24 ? Math.min(y, H - 14) : sy, side = Math.random() < 0.5 ? -1 : 1;
      this.mets.push({ x0: clamp(x + side * W * (0.12 + Math.random() * 0.2), -30, W + 30), y0: -24, x1: x, y1: ty, t: 0, dur: 0.27 + 0.07 * Math.random(), pw: pw, g: HEADS.charCodeAt(this.glyph++ % HEADS.length), deep: ty > sy + 24 });
    },
    impact(x, y, pw, deep) {
      const px = this.px, py = this.py, vx = this.vx, vy = this.vy, R = (narrow ? 112 : 178) * Math.sqrt(pw), lip = y + this.sp * 3.2;
      for (let i = 0; i < this.n; i++) { const dx = px[i] - x, dy = py[i] - y, d = Math.hypot(dx, dy); if (d >= R) continue; const f = 1 - d / R, j = 0.5 + Math.random();
        if (!deep && py[i] < lip) { vx[i] += dx / (Math.abs(dx) + 10) * 640 * pw * f * j + (Math.random() - 0.5) * 300 * pw; vy[i] -= 1300 * pw * f * j; }
        else { vx[i] += dx / (d + 1) * 440 * pw * f; vy[i] += -(deep ? 1150 : 800) * pw * f * (0.6 + 0.4 * Math.random()) + (!deep && Math.abs(dx) < R * 0.2 ? 560 * pw * f : 0); } }
      this.calm = 0; this.boost = 1.3; this.flash = REDUCED ? 0 : 0.11; this.slow = REDUCED ? 0 : 0.5; this.strikes++; if (this.rings.length < 6) this.rings.push({ x: x, y: y, r: 8, life: 1, pw: pw });
      this.jets.push({ x: x, at: now + 0.2, R: R * 0.3, pw: pw }); this.flares.push({ x: x, y: y, t: 0, pw: pw });
      const ns = Math.round((narrow ? 16 : 26) * pw); for (let k = 0; k < ns; k++) { const a = -Math.PI * (0.12 + 0.76 * Math.random()), v = (320 + 760 * Math.random()) * Math.sqrt(pw); this.sparks.push({ x: x, y: y - 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.6 }); }
      shake((narrow ? 5 : 7) * pw); jolt(x);
    },
    jet(j) { const px = this.px, py = this.py, vx = this.vx, vy = this.vy, top = this.surf + 70; for (let i = 0; i < this.n; i++) { const dx = Math.abs(px[i] - j.x); if (dx >= j.R || py[i] > top) continue; const f = 1 - dx / j.R; vy[i] -= 1500 * j.pw * f * (0.55 + 0.75 * Math.random()); vx[i] = vx[i] * (1 - 0.6 * f) + (Math.random() - 0.5) * 150 * f; } this.boost = Math.max(this.boost, 1.0); this.calm = 0; },
    kick(d) { const k = clamp(Math.abs(d) * 4, 0, 260); if (k > 20) this.calm = 0; const vy = this.vy, vx = this.vx, s = d > 0 ? 1 : -1; for (let i = 0; i < this.n; i++) { const r = (i * 2654435761 % 1000) / 1000; vy[i] -= k * (0.4 + 0.6 * r); vx[i] += s * k * 0.25 * (r - 0.5); } },
    drip() { const px = this.px, py = this.py, vx = this.vx, vy = this.vy, x = narrow ? W * (0.12 + Math.random() * 0.76) : W * (0.1 + Math.random() * 0.8), y = aTop + 6; let k = 0; for (let i = (Math.random() * this.n) | 0, tries = 0; k < CALM.dripN && tries < this.n; i = (i + 97) % this.n, tries++) { if (py[i] < this.surf + 40) continue; px[i] = x + (k % 3 - 1) * this.sp * 0.5; py[i] = y + (k / 3 | 0) * this.sp * 0.6; vx[i] = 0; vy[i] = 60; this.qx[i] = px[i]; this.qy[i] = py[i]; this.rho[i] = 0; k++; } if (k) this.rips.push({ x: x, at: now + (-60 + Math.sqrt(3600 + 3000 * Math.max(0, this.surfAt(x) - y))) / 1500 }); },
    /* left alone, the surface is drawn as one line: how much liquid each column holds, eased over time and along the line, with a slow swell on top. The particles underneath are untouched. */
    still(dt) {
      const rq = this.rq, n = BW; if (!this.hT || this.hT.length !== n) { this.hT = new Float32Array(n); this.hA = new Float32Array(n); this.hB = new Float32Array(n + 1); this.hOn = false; }
      const hT = this.hT, hA = this.hA, hB = this.hB; hA.fill(0);
      for (let y = 0; y < BH; y++) { const row = y * n; for (let x = 0; x < n; x++) hA[x] += mb[row + x]; }
      const a = this.hOn ? 1 - Math.exp(-dt / (0.02 + 0.3 * rq)) : 1; this.hOn = true; for (let x = 0; x < n; x++) hT[x] += (hA[x] - hT[x]) * a;
      const R = Math.round(CALM.blur * SUBX * rq); let src = hT;
      if (R > 0) for (let pass = 0; pass < 2; pass++) { hB[0] = 0; for (let x = 0; x < n; x++) hB[x + 1] = hB[x] + src[x]; for (let x = 0; x < n; x++) { const x0 = x - R < 0 ? 0 : x - R, x1 = x + R > n - 1 ? n - 1 : x + R; hA[x] = (hB[x1 + 1] - hB[x0]) / (x1 - x0 + 1); } src = hA; }
      const sw = CALM.swell * rq, k1 = 2 * Math.PI / (CALM.wave * SUBX), w1 = this.tq * CALM.swellW, snap = rq > 0.6, rips = this.rips;
      for (let i = rips.length - 1; i >= 0; i--) if (now - rips[i].at > 1.8) rips.splice(i, 1);
      let lo = FB;
      for (let x = 0; x < n; x++) {
        let h = src[x]; if (h >= 0.5) { h += sw * (Math.sin(x * k1 - w1) + 0.45 * Math.sin(x * k1 * 0.56 + w1 * 0.7 + 1.7));
          for (const rp of rips) { const age = now - rp.at; if (age < 0) continue; const d = Math.abs((x + 0.5) * subW - rp.x) - 110 * age, e = 1 - age / 1.8; h += CALM.rip * rq * e * Math.sqrt(e) * Math.exp(-d * d / 144); } }
        hB[x] = h; }
      for (let x = 0; x < n; x += SUBX) { let m = 0; if (snap) { for (let j = 0; j < SUBX; j++) m += hB[x + j]; m /= SUBX; }
        for (let j = 0; j < SUBX; j++) { let sN = Math.round(snap ? m : hB[x + j]); if (snap && sN > 0) { const r = sN & 3; if (r === 0) sN += 1; else if (r === 3) sN -= 1; } sN = sN < 0 ? 0 : sN > FB ? FB : sN;   /* keep the level where a line character can show it */
          hB[x + j] = FB - sN; if (FB - sN < lo) lo = FB - sN; } }
      for (let y = 0; y < BH; y++) { const row = y * n; if (y < lo || y >= FB) { mb.fill(0, row, row + n); continue; } for (let x = 0; x < n; x++) { const q = row + x; if (y >= hB[x]) { mb[q] = 1; if (lb[q] < 0.2) lb[q] = 0.2; } else mb[q] = 0; } }
    },
    frame(dt) {
      { const q0 = clamp((this.calm - CALM.t0) / (CALM.t1 - CALM.t0), 0, 1); this.qt = q0 * q0 * (3 - 2 * q0); this.pq = this.qt >= this.pq ? this.qt : Math.max(this.qt, this.pq - dt / 0.35); }   /* the settle lets go over a third of a second, so waking is a stir and not a jolt */
      if (TILT.live) { const k = Math.min(1, dt * 7); this.gx += (TILT.x * TILT.mag - this.gx) * k; this.gy += (TILT.y * TILT.mag - this.gy) * k; { const f = Math.min(1, dt / 1.5); this.rgx += (this.gx - this.rgx) * f; this.rgy += (this.gy - this.rgy) * f; } if (Math.hypot(this.gx - this.rgx, this.gy - this.rgy) > 0.12) { this.rgx = this.gx; this.rgy = this.gy; this.calm = 0; } }   /* a real tilt wakes it; a hand's wander does not, the settled liquid just follows slowly */
      else { this.gx = CALM.rock * Math.sin(now * CALM.rockW); this.gy = 1; }
      const ts = this.slow > 0 ? 0.36 + 0.64 * (1 - Math.min(1, this.slow / 0.28)) : 1; this.slow -= dt;
      this.acc += dt * ts; let k = 0; const sub = this.boost > 0 ? 2 : 1;
      while (this.acc > 1 / 60 && k < 2) { for (let s = 0; s < sub; s++) this.step(1 / 60 / sub); this.acc -= 1 / 60; k++; } if (k === 2) this.acc = 0;
      this.boost -= dt * ts; this.flash -= dt; this.calm += dt; this.dripT -= dt; const de = dt * ts;
      if (this.dripT <= 0) { this.dripT = CALM.dripMin + Math.random() * CALM.dripVar; if (CALM.dripN > 0 && !ptr.down && this.calm > 2.5 && this.gy > 0.7) this.drip(); }
      for (let i = this.jets.length - 1; i >= 0; i--) { this.jets[i].at -= dt * (1 - ts); if (now >= this.jets[i].at + (1 - ts) * 0.0) { if (now >= this.jets[i].at) { this.jet(this.jets[i]); this.jets.splice(i, 1); } } }
      for (let i = this.rings.length - 1; i >= 0; i--) { const rg = this.rings[i]; rg.r += (narrow ? 820 : 1150) * de; rg.life -= de / 0.62; if (rg.life <= 0) this.rings.splice(i, 1); }
      for (let i = this.sparks.length - 1; i >= 0; i--) { const q = this.sparks[i]; q.life -= de; if (q.life <= 0) { this.sparks.splice(i, 1); continue; } q.vy += 1500 * de; q.x += q.vx * de; q.y += q.vy * de; }
      for (let i = this.flares.length - 1; i >= 0; i--) { const q = this.flares[i]; q.t += dt; if (q.t > 0.16) this.flares.splice(i, 1); }
      for (let i = this.mets.length - 1; i >= 0; i--) { const m = this.mets[i]; m.t += dt / m.dur; if (m.t >= 1) { this.impact(m.x1, m.y1, m.pw, m.deep); this.mets.splice(i, 1); } }
      /* paint: the body through the subsample grid, loose drops as their own glyphs */
      mb.fill(0); lb.fill(0);
      const N = this.n, px = this.px, py = this.py, vx = this.vx, vy = this.vy, rho = this.rho, lim = this.rho0 * 0.42, rsx = this.sp * 0.78 / subW, asp = subH / subW, rs2 = rsx * rsx;
      for (let i = 0; i < N; i++) { if (rho[i] < lim) continue; const sx = px[i] / subW, sy = py[i] / subH, sp = Math.hypot(vx[i], vy[i]), lum = Math.min(1, 0.2 + (sp > 250 ? (sp - 250) / 700 : 0)), x0 = Math.max(0, Math.floor(sx - rsx)), x1 = Math.min(BW - 1, Math.ceil(sx + rsx)), y0 = Math.max(0, Math.floor(sy - rsx / asp)), y1 = Math.min(BH - 1, Math.ceil(sy + rsx / asp));
        for (let yy = y0; yy <= y1; yy++) { const dy = (yy + 0.5 - sy) * asp; for (let xx = x0; xx <= x1; xx++) { const dx = xx + 0.5 - sx; if (dx * dx + dy * dy < rs2) { const q = yy * BW + xx; mb[q] = 1; if (lum > lb[q]) lb[q] = lum; } } } }
      { const want = this.qt * clamp((this.gy - 0.8) / 0.13, 0, 1) * (Math.abs(this.gx) < 0.6 ? 1 : 0); this.rq = want >= this.rq ? want : Math.max(want, this.rq - dt / 0.25); this.tq = this.rq > 0.9 ? Math.floor(now * 8) / 8 : now; if (this.rq > 0.001) this.still(dt); else this.hOn = false; }   /* tq: when it is calm the slow patterns step 8 times a second; between steps the text is identical and nothing is redrawn */
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const c = y * cols + x, bx = x * SUBX, by = y * SUBY; let n = 0, s = 0, t = 0, b = 0, l = 0, r = 0;
        for (let j = 0; j < SUBY; j++) { const row = (by + j) * BW + bx; for (let i = 0; i < SUBX; i++) { const q = row + i; if (mb[q]) { n++; s += lb[q]; if (j < 2) t++; else b++; if (i === 0) l++; else r++; } } }
        cN[c] = n; cL[c] = n ? s / n : 0; cQ[c] = t | (b << 3) | (l << 6) | (r << 9); }
      const off = this.colOff, kr = this.keepRow, tq = this.tq, sinkT = tq * CALM.sink, surfR = this.surf / lh, spanR = Math.max(1, FR - surfR); let thinRow = rows;
      for (let x = 0; x < cols; x++) off[x] = Math.floor(sinkT * (0.4 + 0.6 * hsh(x, 7)) + hsh(x, 3) * 97);   /* each column sinks at its own pace */
      for (let y = 0; y < rows; y++) { let k = 1; if (y < FR) { const dz = (y + 0.5 - surfR) / spanR; if (dz > CALM.thin0) { const u = Math.min(1, (dz - CALM.thin0) / (1 - CALM.thin0)); k = 1 - (1 - CALM.thinK) * u * u * (3 - 2 * u); } } else k = CALM.thinK * Math.pow(1 - (y - FR + 0.5) / Math.max(1, rows - FR), 1.4); kr[y] = k; if (k < 1 && y < thinRow) thinRow = y; }
      const RL = RAMP.length - 1, fl = this.flash > 0, rings = this.rings, nr = rings.length, band = narrow ? 9 : 13, mend = this.qt > 0.5;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const c = y * cols + x, n = cN[c]; if (!n) continue; let L = cL[c], g, tr, full = n >= 6 || y >= FR - 2;   /* at the floor a half-covered cell is body like the rest and thins with it: no outline along the bottom */
        if (!full && mend && n >= 2 && (y === 0 ? 0 : cN[c - cols]) >= 4 && (y === rows - 1 ? 8 : cN[c + cols]) >= 4 && (x === 0 ? 8 : cN[c - 1]) >= 4 && (x === cols - 1 ? 8 : cN[c + 1]) >= 4) full = true;
        if (full) { if (y >= thinRow && hsh(x, y - off[x]) > kr[y]) continue;
          { const cs = Math.sin(x * 0.075 + 1.4 * Math.sin(y * 0.16 + tq * 0.13) - tq * 0.2); if (cs > 0) L += CALM.glow * cs * cs; } L += 0.06 * Math.sin(x * 0.33 + y * 0.7 - tq * CALM.shim) + (fl ? 0.35 : 0); let q = Math.round(Math.pow(clamp(L, 0, 1), 1.05) * RL); if (q < 1) q = 1; if (q > RL) q = RL; g = RAMP.charCodeAt(q); tr = L < 0.3 ? 1 : L < 0.55 ? 2 : 3; }
        else { const q = cQ[c], t = q & 7, b = (q >> 3) & 7, l = (q >> 6) & 7, r = (q >> 9) & 7, gx = r - l, gy = b - t, ax = gx < 0 ? -gx : gx, ay = gy < 0 ? -gy : gy;
          if (ay >= 2 * ax) g = gy > 0 ? (n <= 2 ? 95 : 45) : (n <= 2 ? 39 : 45); else if (ax >= 2 * ay) g = 124; else g = gx * gy > 0 ? 47 : 92; tr = L > 0.5 || fl ? 4 : 3; }
        for (let k2 = 0; k2 < nr; k2++) { const rg = rings[k2], dx = (x + 0.5) * cw - rg.x, dy = (y + 0.5) * lh - rg.y, d = Math.sqrt(dx * dx + dy * dy) - rg.r; if (d > -band && d < band) { const core = d > -band * 0.4 && d < band * 0.4; tr = core ? 4 : 3; if (n >= 6) g = core ? 64 : 35; } }
        ch[c] = g; tier[c] = tr; }
      for (let y = FR; y < rows; y++) { const k = kr[y], deep = (y - FR) / Math.max(1, rows - FR) > 0.4; for (let x = 0; x < cols; x++) { const c = y * cols + x; if (tier[c]) continue; const r = hsh(x, y - off[x]); if (r < k) { ch[c] = r < k * 0.62 ? 46 : r < k * 0.92 ? 58 : 39; tier[c] = deep ? 5 : 1; } } }
      for (let i = 0; i < N; i++) { if (rho[i] >= lim) continue; const x = px[i] / cw | 0, y = py[i] / lh | 0; if (x < 0 || y < 0 || x >= cols || y >= rows) continue; const c = y * cols + x; if (cN[c]) continue; const sp = Math.hypot(vx[i], vy[i]);
        ch[c] = sp > 520 ? 42 : sp > 240 ? 111 : 46; tier[c] = sp > 520 ? 4 : sp > 240 ? 3 : 2;
        const tx = (px[i] - vx[i] * 0.016) / cw | 0, ty = (py[i] - vy[i] * 0.016) / lh | 0; if (tx >= 0 && ty >= 0 && tx < cols && ty < rows && (tx !== x || ty !== y)) { const c2 = ty * cols + tx; if (!tier[c2]) { ch[c2] = sp > 520 ? 39 : 46; tier[c2] = 1; } } }
      for (const m of this.mets) { for (let k2 = 0; k2 < 24; k2++) { const tt = m.t - k2 * 0.034; if (tt < 0) break; const x = (m.x0 + (m.x1 - m.x0) * tt) / cw | 0, y = (m.y0 + (m.y1 - m.y0) * tt) / lh | 0; set(x, y, k2 === 0 ? m.g : k2 < 4 ? 42 : k2 < 9 ? 43 : k2 < 15 ? 58 : 46, k2 < 4 ? 4 : k2 < 9 ? 3 : k2 < 15 ? 2 : 1); if (k2 === 0) { set(x - 1, y, 40, 4); set(x + 1, y, 41, 4); } } }
      for (const rg of this.rings) { const steps = Math.max(24, Math.round(rg.r / 6)), tr = rg.life > 0.6 ? 2 : rg.life > 0.3 ? 1 : 5; for (let k2 = 0; k2 <= steps; k2++) { const a = Math.PI * k2 / steps, x = (rg.x + Math.cos(a) * rg.r) / cw | 0, y = (rg.y - Math.sin(a) * rg.r) / lh | 0; if (x >= 0 && y >= 0 && x < cols && y < rows && !tier[y * cols + x]) set(x, y, 46, tr); } }
      for (const q of this.sparks) { const x = q.x / cw | 0, y = q.y / lh | 0; if (x < 0 || y < (narrow ? rTop : 0) || x >= cols || y >= rows || cN[y * cols + x]) continue; set(x, y, q.life > 0.55 ? 42 : q.life > 0.28 ? 43 : 46, q.life > 0.55 ? 4 : q.life > 0.28 ? 3 : 2); }
      for (const q of this.flares) { const cxf = q.x / cw | 0, cyf = q.y / lh | 0, r = 1 + q.t * 34 * Math.sqrt(q.pw), D8 = [[1, 0, 45], [-1, 0, 45], [0, -1, 124], [0.7, -0.7, 47], [-0.7, -0.7, 92], [0.92, -0.38, 45], [-0.92, -0.38, 45]];
        for (const d of D8) for (let k2 = 0; k2 < 3; k2++) set(Math.round(cxf + d[0] * (r + k2) * 2), Math.round(cyf + d[1] * (r + k2)), d[2], 4); set(cxf, cyf, 64, 4); }
      if (ptr.down && ptr.moved < (ptr.mouse ? 8 : 16)) { const held = (performance.now() - ptr.t0) / 1000; if (held > 0.18) { const pw = power(held), x = ptr.x / cw | 0, y = ptr.y / lh | 0, pul = (now * 9 | 0) % 2;
          for (let yy = y - 1; yy >= rTop && yy > y - 40; yy--) if ((yy + (now * 20 | 0)) % 3 === 0) set(x, yy, 58, 1);
          mid(x, y, pw > 1.7 ? '((( @ )))' : pw > 1.3 ? '(( @ ))' : '( @ )', pul ? 4 : 3); } }
      if (TILT.live && performance.now() - TILT.since < 4500) mid(narrow ? cols / 2 : cols * 0.675, this.hintRow + 2, 'TILT YOUR PHONE', (now % 1.2) < 0.8 ? 3 : 2);
      if (CALM.grid) { const gx = CALM.gridX, gy = CALM.gridY, g0 = gx >> 1, hole = this.hole, y0 = narrow ? Math.ceil(rTop / gy) * gy : gy, mx = ptr.inside && ptr.mouse ? ptr.x : -9999, my = ptr.y;
        for (let y = y0; y < FR; y += gy) { const yp = (y + 0.5) * lh; for (let x = g0; x < cols; x += gx) { const c = y * cols + x; if (tier[c] || cN[c]) continue; if (hole && x >= hole[0] && x <= hole[2] && y >= hole[1] && y <= hole[3]) continue;
          const xp = (x + 0.5) * cw, dm = (xp - mx) * (xp - mx) + (yp - my) * (yp - my); let tr = dm < 2500 ? 2 : dm < 14400 ? 1 : 5; let lit = tr !== 5;
          for (let k2 = 0; k2 < nr; k2++) { const rg = rings[k2], d = Math.abs(Math.hypot(xp - rg.x, yp - rg.y) - rg.r); if (d < 30) { tr = d < 12 ? 3 : 2; lit = true; } }
          if (!lit && CALM.grid === 2) continue;   /* the page draws the resting grid; here only the marks that are lit */
          ch[c] = ((x - g0) / gx) % 4 === 0 && (y / gy) % 4 === 0 ? 43 : 183; tier[c] = tr; } } }
      const idle = this.strikes === 0 && now - this.born > 1.2; if (idle) mid(narrow ? cols / 2 : cols * 0.675, this.hintRow, touchy ? 'TAP IT' : 'CLICK IT', (now % 1.6) < 1 ? 2 : 1);
    }
  };
  const power = held => 1 + clamp((held - 0.18) * 1.25, 0, 1.2);

  /* ================= input ================= */
  /* the hero's links and buttons keep their own taps; everywhere else in the hero belongs to the pool */
  const skip = t => !!(t && t.closest && t.closest('a, button, input, select, textarea, label, summary, [role="button"], [contenteditable]'));
  function local(e) { const r = hero.getBoundingClientRect(), nx = e.clientX - r.left, ny = e.clientY - r.top, tn = performance.now(), el = Math.max(8, tn - ptr.lt) / 1000; if (ptr.x >= 0 && tn - ptr.lt < 120) { ptr.vx += ((nx - ptr.x) / el - ptr.vx) * 0.5; ptr.vy += ((ny - ptr.y) / el - ptr.vy) * 0.5; } else { ptr.vx = 0; ptr.vy = 0; } ptr.x = nx; ptr.y = ny; ptr.lt = tn; ptr.mouse = e.pointerType === 'mouse'; }
  hero.addEventListener('pointerdown', e => {
    if (skip(e.target) || (e.pointerType === 'mouse' && e.button !== 0) || document.body.classList.contains('blueprint')) return;
    ptr.x = -1; local(e); ptr.inside = true; ptr.down = true; ptr.moved = 0; ptr.lx = e.clientX; ptr.ly = e.clientY; ptr.t0 = performance.now();
    try { hero.setPointerCapture(e.pointerId); } catch (x) {}
  });
  hero.addEventListener('pointermove', e => { local(e); ptr.inside = true; if (ptr.down) { ptr.moved += Math.abs(e.clientX - ptr.lx) + Math.abs(e.clientY - ptr.ly); ptr.lx = e.clientX; ptr.ly = e.clientY; F.calm = 0; } else if (ptr.mouse) ptr.moved = 9; });
  /* a press that barely moved is a strike; a swipe is the page scrolling (the browser cancels it) or a push through the liquid */
  hero.addEventListener('pointerup', () => { if (!ptr.down) return; ptr.down = false; if (ptr.moved < (ptr.mouse ? 8 : 16)) { F.strike(ptr.x, ptr.y, power((performance.now() - ptr.t0) / 1000)); F.calm = 0; } if (!ptr.mouse) ptr.inside = false; });
  hero.addEventListener('pointercancel', () => { ptr.down = false; ptr.inside = false; });
  hero.addEventListener('pointerleave', () => { if (!ptr.down) ptr.inside = false; });
  /* holding a finger down to charge a strike is not a request for the long-press menu; links keep theirs */
  hero.addEventListener('contextmenu', e => { if (ptr.down && !ptr.mouse && !skip(e.target)) e.preventDefault(); });
  let lastY = window.scrollY, kickT = 0;
  window.addEventListener('scroll', () => { const y = window.scrollY, d = y - lastY; lastY = y; const t = performance.now(); if (Math.abs(d) > 2 && t - kickT > 70 && onScreen && rafId) { kickT = t; F.kick(d); } }, { passive: true });

  /* ================= tilt ================= */
  /* Gravity follows the phone, in every direction, wherever the browser hands motion over without asking (Android).
     An iPhone hands it over only after Apple's own permission prompt, and a prompt on a first tap broke the moment
     (Hudson, 2026-11-23: "it asked for permission to use it and i feel like that ruins the immersion"), so the site
     never asks: on an iPhone there is no tilt, and taps and drags still move the pool. */
  const D2R = Math.PI / 180;
  const TILT = { x: 0, y: 1, mag: 1, live: false, since: 0, state: 'off', listening: false };
  const touchy = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches), hasDO = 'DeviceOrientationEvent' in window;
  const setTilt = st => { TILT.state = st; DIAG.tilt = st; };
  function onTilt(e) {
    if (e.beta == null || e.gamma == null) return;
    /* where "down" points in the plane of the screen: x to the right, y toward the bottom, for a phone held upright */
    const b = e.beta * D2R, g = e.gamma * D2R, x0 = Math.sin(g) * Math.cos(b), y0 = Math.sin(b);
    const a = (typeof window.orientation === 'number' ? window.orientation : (window.screen && screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : 0) * D2R;
    const x = x0 * Math.cos(a) + y0 * Math.sin(a), y = -x0 * Math.sin(a) + y0 * Math.cos(a), m = Math.hypot(x, y);   /* undo the screen's own rotation */
    if (m < 0.12) TILT.mag = 0.35; else { TILT.x = x / m; TILT.y = y / m; TILT.mag = clamp(m * 1.5, 0.35, 1); }   /* lying flat: keep the last direction, go light */
    if (!TILT.live) { TILT.live = true; TILT.since = performance.now(); setTilt('on'); }
  }
  /* Asked once, at load, before any touch. A permission prompt can only open from a touch, so this can never put one on
     screen: Chrome answers yes without asking, an iPhone answers no without showing anything (or yes, silently, if the
     visitor already allowed it), and a browser with no permission step at all just starts sending readings. */
  function listen() { if (!TILT.listening) { TILT.listening = true; window.addEventListener('deviceorientation', onTilt); } }
  if (touchy && hasDO) { const DO = window.DeviceOrientationEvent; if (typeof DO.requestPermission !== 'function') listen(); else { try { DO.requestPermission().then(r => { if (r === 'granted') listen(); }, () => {}); } catch (x) {} } }

  /* ================= loop, with a governor ================= */
  let onScreen = true, rafId = 0, last = 0, lastFrameAt = 0, err = '', slowT = 0; const cad = { arr: [], base: 0 };
  const work = { n: 0, sum: 0, ema: 0 }, fpsA = { n: 0, t: 0, v: 0 };
  function frame(ms) {
    rafId = requestAnimationFrame(frame); lastFrameAt = performance.now(); if (!cols) return;
    const t = ms / 1000, raw = last ? t - last : 0.016, dt = Math.min(0.05, raw); last = t; now = t; if (performance.now() - ptr.lt > 90) { ptr.vx *= 0.8; ptr.vy *= 0.8; }
    const w0 = performance.now(); ch.fill(32); tier.fill(0);
    try { F.frame(dt); } catch (e) { if (!err) { err = String(e && e.stack || e); DIAG.err = err.slice(0, 200); console.error(err); } }
    flush(); const wk = performance.now() - w0;
    if (shakeT > 0) { shakeT -= dt; const a = shakeA * Math.max(0, shakeT / 0.32); shk.style.transform = shakeT > 0 ? 'translate(' + ((Math.random() - 0.5) * 2 * a).toFixed(1) + 'px,' + ((Math.random() - 0.5) * 2 * a).toFixed(1) + 'px)' : ''; if (shakeT <= 0) shakeA = 0; }
    work.ema = work.ema ? work.ema * 0.94 + wk * 0.06 : wk; work.n++; work.sum += wk;
    /* too much work per frame: thin the liquid rather than drop frames */
    if (work.n === 100 && work.sum / 100 > 10.5 && F.qi < QL.length - 1) { F.qi++; F.build(); DIAG.mode = 'liquid, thinned x' + F.qi; }
    /* learn this display's own rhythm first: a steady 30 (iPhone Low Power Mode) is not a struggle, dropped frames are */
    if (!cad.base && raw < 0.2 && last) { cad.arr.push(raw); if (cad.arr.length >= 45) { cad.arr.sort((a, b) => a - b); cad.base = cad.arr[22]; } }
    const slowAt = !cad.base ? 9 : cad.base > 0.036 ? 0.024 : Math.max(0.024, cad.base * 1.6);
    /* frames arriving late for a while: the glow goes first (it is the paint cost), then particles */
    if (raw < 0.25) { slowT = raw > slowAt ? slowT + raw : Math.max(0, slowT - raw * 0.5); if (slowT > 1.6 && now - F.born > 2) { slowT = 0; if (!host.classList.contains('lite')) { host.classList.add('lite'); DIAG.mode = 'liquid, glow off'; } else if (F.qi < QL.length - 1) { F.qi++; F.build(); DIAG.mode = 'liquid, glow off, thinned x' + F.qi; } } }
    fpsA.n++; fpsA.t += raw; if (fpsA.t >= 0.5) { fpsA.v = fpsA.n / fpsA.t; fpsA.n = 0; fpsA.t = 0; }
    DIAG.frames++; DIAG.work = +work.ema.toFixed(1);
  }
  /* run only while the hero can be seen (the same guards the sandglow hero had) */
  function start() { if (!rafId && onScreen && !document.hidden && cols) { last = 0; lastFrameAt = performance.now(); rafId = requestAnimationFrame(frame); } }
  function stop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (onScreen) start(); else stop(); }, { rootMargin: '80px' }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  /* Watchdog: mobile Safari suspends rAF under memory pressure and does not always resume it. If frames stop while visible, restart the loop. */
  setInterval(() => { if (document.hidden || !onScreen) return; if (performance.now() - lastFrameAt > 1200) { stop(); start(); } }, 1500);
  window.addEventListener('pageshow', start);

  /* the pool is rebuilt only when the hero really changes size (a rotation, a window resize), never on a scroll */
  let rsz = 0, lw = 0, lhh = 0;
  const remeasure = () => { cancelAnimationFrame(rsz); rsz = requestAnimationFrame(() => { const r = hero.getBoundingClientRect(); if (Math.abs(r.width - lw) < 1 && Math.abs(r.height - lhh) < 1) return; lw = r.width; lhh = r.height; measure(); start(); }); };
  window.addEventListener('resize', remeasure);
  window.addEventListener('orientationchange', () => setTimeout(remeasure, 120));
  if (window.ResizeObserver) new ResizeObserver(remeasure).observe(hero);

  /* the grid is measured in the site's own mono face, so wait for it (it is preloaded; give up after a second and a half) and build once */
  let booted = false;
  function boot() {
    if (booted) return; booted = true;
    if (window.__liquidOpts) Object.assign(CALM, window.__liquidOpts);   /* a page may tune the pool (the design preview does) */
    measure(); { const r = hero.getBoundingClientRect(); lw = r.width; lhh = r.height; }
    DIAG.mode = 'liquid'; start();
    /* if the face lands after the fallback was measured, the character width changes: build again, once */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { const w = probe.getBoundingClientRect().width / 80; if (w && Math.abs(w - cw) > 0.05) { measure(); start(); } });
  }
  if (document.fonts && document.fonts.load) { document.fonts.load('500 12px "Site Mono"').then(boot, boot); setTimeout(boot, 1500); } else boot();

  window.addEventListener('liquid-opts', e => { if (!booted) return; Object.assign(CALM, e.detail || {}); measure(); start(); });

  /* the test rigs ask for this; nothing on the page uses it */
  if (/[?&]lqtest=1/.test(location.search)) window.__liquid = { F: F, TILT: TILT, CALM: CALM,
    grid: () => { let o = ''; for (let y = 0; y < rows; y++) o += String.fromCharCode.apply(null, ch.subarray(y * cols, (y + 1) * cols)) + '\n'; return o; },
    prof: () => { const o = []; for (let x = 0; x < cols; x++) { let y = FR - 1; while (y >= 0 && cN[y * cols + x] >= 6) y--; o.push(((FR - 1 - y) + (y >= 0 ? cN[y * cols + x] / 8 : 0)) * lh); } return o; },
    motion: () => { let sp = 0, loose = 0; const lim = F.rho0 * 0.42; for (let i = 0; i < F.n; i++) { sp += Math.hypot(F.vx[i], F.vy[i]); if (F.rho[i] < lim) loose++; } return { speed: sp / F.n, loose: loose }; },
    strike: (x, y, pw) => F.strike(x == null ? W / 2 : x, y == null ? 0 : y, pw || 1),
    stats: () => ({ cols: cols, rows: rows, cw: +cw.toFixed(2), lh: lh, W: Math.round(W), H: Math.round(H), n: F.n, qi: F.qi, work: +work.ema.toFixed(2), fps: Math.round(fpsA.v), cadence: Math.round(cad.base * 1000), lite: host.classList.contains('lite'), running: !!rafId, frames: DIAG.frames, tilt: TILT.state, g: [+F.gx.toFixed(2), +F.gy.toFixed(2)], qt: +F.qt.toFixed(2), rq: +F.rq.toFixed(2), surf: Math.round(F.surf), aTop: Math.round(aTop), pBot: Math.round(pBot), ext: EXT, floorRow: FR, narrow: narrow, strikes: F.strikes, rings: F.rings.length, mets: F.mets.length, err: err.slice(0, 300) }) };
})();
