/* ============================================================
   FROST — projects-frost.js  (projects page, desktop corridor)

   The project cards are smoke glass: rgba(18,18,18,.40) over a soft blur of
   whatever is behind them. Chromium does that blur itself. Firefox and Safari
   do not blur behind the corridor's 3D slides, so there the big figure's dots
   showed through the cards crisp (Hudson, 2026-09-16, on Firefox: "it still
   doesn't have the blurred softer").

   Everything behind a corridor card is known: the page's own gradient and
   glows, the mouse glow, the sand bed (#proj-sand) and the big figure
   (.ghost-led). So in those browsers the frost is drawn here instead. Each
   card gets a small canvas under its content, painted every corridor frame
   with that stack as it lies under the card, then the tint.

   The blur is cheap because it is mostly size. The sand and the figure are
   WebGL, and copying a whole WebGL canvas into a 2D one reads every pixel
   back. So each source shrinks ITS OWN last frame to 1/16 on its own GPU
   (two 4x4 box passes) and only that tiny image is read back: every 120 ms for
   the sand, and for the figure only while it is changing. A small blur on
   the CPU and the browser's smooth upscale do the rest. Without the corridor
   (phones), in Chromium, or if any of this fails, nothing here runs and the
   CSS glass stays as it was.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('fx')) return;
  /* Chromium blurs the corridor natively; window.__frostForce is for tests */
  if (/(Chrome|Chromium)\//.test(navigator.userAgent) && !window.__frostForce) return;

  var CELL = 4;                          /* CSS px per frost texel on the card */
  var SAND_MS = 120;                     /* how stale the sand's copy may get */
  var FIG_MS = 80;
  var TINT = 'rgba(18, 18, 18, 0.40)';   /* the smoke glass, as styles.css has it */
  var TINT_HOVER = 'rgba(26, 26, 26, 0.48)';

  /* ---------------- the shrink: 1/16 of a WebGL canvas, on its own GPU ---- */
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  /* one destination texel averages a 4x4 source block: four bilinear taps,
     each landing where four texels meet */
  var FS = [
    'precision highp float;',
    'uniform sampler2D uT; uniform vec2 uSrc;',
    'void main(){',
    '  vec2 c = floor(gl_FragCoord.xy) * 4.0;',
    '  gl_FragColor = 0.25 * (texture2D(uT, (c + vec2(1.0, 1.0)) / uSrc) + texture2D(uT, (c + vec2(3.0, 1.0)) / uSrc)',
    '                       + texture2D(uT, (c + vec2(1.0, 3.0)) / uSrc) + texture2D(uT, (c + vec2(3.0, 3.0)) / uSrc));',
    '}'
  ].join('\n');

  function kit(gl) {
    var k = gl.__frostKit;
    if (k && gl.isProgram(k.p)) return k;
    if (k === false) return null;
    try {
      var vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, VS); gl.compileShader(vs);
      var fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, FS); gl.compileShader(fs);
      var p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, fs);
      gl.bindAttribLocation(p, 0, 'p');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('frost link');
      k = { p: p, uT: gl.getUniformLocation(p, 'uT'), uSrc: gl.getUniformLocation(p, 'uSrc'),
            t: [gl.createTexture(), gl.createTexture(), gl.createTexture()],
            f: [null, gl.createFramebuffer(), gl.createFramebuffer()],
            w: [0, 0, 0], h: [0, 0, 0], px: null };
    } catch (e) {
      gl.__frostKit = false;
      return null;
    }
    gl.__frostKit = k;
    return k;
  }

  /* src: { gl, prog, unit, mode, count }, the source's own program, active
     texture unit and full-viewport geometry (on attribute 0), all put back */
  function shrink(src) {
    var gl = src && src.gl;
    if (!gl || gl.isContextLost()) return null;
    var k = kit(gl);
    if (!k) return null;
    var W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    var ws = [W, Math.ceil(W / 4), Math.ceil(W / 16)];
    var hs = [H, Math.ceil(H / 4), Math.ceil(H / 16)];
    gl.activeTexture(gl.TEXTURE7);
    for (var i = 0; i < 3; i++) {
      if (k.w[i] === ws[i] && k.h[i] === hs[i]) continue;
      gl.bindTexture(gl.TEXTURE_2D, k.t[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ws[i], hs[i], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      if (k.f[i]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, k.f[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, k.t[i], 0);
      }
      k.w[i] = ws[i]; k.h[i] = hs[i];
    }
    /* the drawing buffer is preserved, so this is the source's last frame */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, k.t[0]);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, W, H);
    gl.useProgram(k.p);
    gl.uniform1i(k.uT, 7);
    for (i = 1; i < 3; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, k.f[i]);
      gl.viewport(0, 0, ws[i], hs[i]);
      gl.bindTexture(gl.TEXTURE_2D, k.t[i - 1]);
      gl.uniform2f(k.uSrc, ws[i - 1], hs[i - 1]);
      gl.drawArrays(src.mode, 0, src.count);
    }
    var n = ws[2] * hs[2] * 4;
    if (!k.px || k.px.length !== n) k.px = new Uint8Array(n);
    gl.readPixels(0, 0, ws[2], hs[2], gl.RGBA, gl.UNSIGNED_BYTE, k.px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(src.unit);
    gl.useProgram(src.prog);
    /* the last row and column of texels run past the buffer's right and top
       edges: ex, ey say by how much, so the copy is laid back exactly */
    return { w: ws[2], h: hs[2], px: k.px, ex: ws[2] * 16 / W, ey: hs[2] * 16 / H };
  }

  /* a shrunk source as a 2D canvas: flipped upright, blurred (premultiplied,
     where a blur belongs), then straight alpha for drawImage. fade(y) scales
     alpha by CSS px y down the source (the released stage). */
  function Layer() {
    this.cv = document.createElement('canvas');
    this.cx = this.cv.getContext('2d');
    this.img = null; this.a = null; this.b = null;
    this.t = -1e9; this.key = ''; this.ok = false; this.ex = 1; this.ey = 1;
  }
  /* where the layer lands for a source shown at screen rect R */
  Layer.prototype.draw = function (x, R) {
    x.drawImage(this.cv, R.left, R.top + R.height * (1 - this.ey), R.width * this.ex, R.height * this.ey);
  };
  /* How many [1 2 1] passes (0.5 texel^2 of variance each) bring the whole
     chain to the glass's blur(9px): texel is the copy's texel in CSS px. The
     16 px box, the bilinear lay-back and the card canvas's own upscale
     already spread it by texel^2/12 + texel^2/6 + CELL^2/6. */
  function passesFor(texel) {
    var need = 81 - texel * texel / 4 - CELL * CELL / 6;
    return Math.max(0, Math.min(8, Math.round(need / (0.5 * texel * texel))));
  }
  Layer.prototype.fill = function (s, passes, fade, cssH) {
    var w = s.w, h = s.h, px = s.px, n = w * h * 4;
    this.ex = s.ex || 1; this.ey = s.ey || 1;
    if (this.cv.width !== w || this.cv.height !== h || !this.img) {
      this.cv.width = w; this.cv.height = h;
      this.img = this.cx.createImageData(w, h);
      this.a = new Float32Array(n); this.b = new Float32Array(n);
    }
    var A = this.a, B = this.b, d = this.img.data, x, y, c, o, p, r0, l, m, r;
    for (y = 0; y < h; y++) A.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    for (p = 0; p < passes; p++) {
      for (y = 0; y < h; y++) {
        r0 = y * w;
        for (x = 0; x < w; x++) {
          l = (r0 + (x > 0 ? x - 1 : 0)) * 4; m = (r0 + x) * 4; r = (r0 + (x < w - 1 ? x + 1 : x)) * 4;
          for (c = 0; c < 4; c++) B[m + c] = (A[l + c] + 2 * A[m + c] + A[r + c]) * 0.25;
        }
      }
      for (y = 0; y < h; y++) {
        var up = (y > 0 ? y - 1 : 0) * w, mid = y * w, dn = (y < h - 1 ? y + 1 : y) * w;
        for (x = 0; x < w; x++) {
          l = (up + x) * 4; m = (mid + x) * 4; r = (dn + x) * 4;
          for (c = 0; c < 4; c++) A[m + c] = (B[l + c] + 2 * B[m + c] + B[r + c]) * 0.25;
        }
      }
    }
    for (y = 0; y < h; y++) {
      var f = fade ? fade(((y + 0.5) / h * this.ey - this.ey + 1) * cssH) : 1;
      for (x = 0; x < w; x++) {
        o = (y * w + x) * 4;
        var al = A[o + 3];
        if (al < 0.5) { d[o] = d[o + 1] = d[o + 2] = d[o + 3] = 0; continue; }
        for (c = 0; c < 3; c++) d[o + c] = Math.min(255, A[o + c] * 255 / al);
        d[o + 3] = al * f;
      }
    }
    this.cx.putImageData(this.img, 0, 0);
    this.ok = true;
  };

  /* ---------------- the cards ---------------- */
  var items = Array.prototype.slice.call(
    document.querySelectorAll('#showcase .sc-slide .case, #showcase .sc-slide .case-sm')
  ).map(function (card) {
    var cv = document.createElement('canvas');
    cv.className = 'card-frost';
    cv.setAttribute('aria-hidden', 'true');
    /* a small card is not a scroll box and lifts on hover: the frost rides
       inside it. A big card scrolls when the window is short, which would
       carry an inside frost away with its text: that frost sits beside it. */
    var inside = card.classList.contains('case-sm');
    if (inside) card.insertBefore(cv, card.firstChild);
    else card.parentNode.insertBefore(cv, card);
    return { card: card, cv: cv, cx: cv.getContext('2d'), inside: inside, hover: !inside,
             slide: card.closest('.sc-slide'), L: -1, T: -1, W: -1, H: -1, R: '' };
  });
  if (!items.length) return;

  var stage = document.querySelector('#showcase .sc-stage');
  var sandL = new Layer(), figL = new Layer(), bg = new Layer();
  var mouse = null, bgKey = '';
  var S = { on: false, frames: 0, sandCopies: 0, figCopies: 0, ms: 0, copyMs: 0, failed: '' };
  window.__frostState = S;

  document.addEventListener('mousemove', function (e) { mouse = { x: e.clientX, y: e.clientY }; }, { passive: true });

  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }

  /* what the page itself paints behind the stage, viewport-sized at 1/8:
     body's fixed radial gradient, the two blurred corner blobs, the mouse glow */
  function paintBg(vw, vh) {
    var key = vw + 'x' + vh + (mouse ? '@' + mouse.x + ',' + mouse.y : '');
    if (key === bgKey) return;
    bgKey = key;
    var w = Math.max(2, Math.ceil(vw / 8)), h = Math.max(2, Math.ceil(vh / 8));
    var cv = bg.cv, x = bg.cx;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    x.setTransform(w / vw, 0, 0, h / vh, 0, 0);
    x.globalAlpha = 1;
    x.fillStyle = '#050505';
    x.fillRect(0, 0, vw, vh);
    /* radial-gradient(120% 80% at 50% 0%, #141414 0%, #0b0b0b 48%, #050505 100%) */
    x.save();
    x.translate(vw / 2, 0);
    x.scale(vw * 1.2, vh * 0.8);
    var g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, '#141414'); g.addColorStop(0.48, '#0b0b0b'); g.addColorStop(1, '#050505');
    x.fillStyle = g;
    x.fillRect(-vw / 2 / (vw * 1.2), 0, 1 / 1.2, 1 / 0.8);
    x.restore();
    Array.prototype.forEach.call(document.querySelectorAll('.bg-blob'), function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width) return;
      var a = el.classList.contains('bg-blob-1') ? 0.028 : 0.02;
      var R = r.width / 2, cx = r.left + R, cy = r.top + r.height / 2;
      /* a disc under blur(120px): about 0.86 of its alpha at the centre,
         half at its edge, gone two blur radii out */
      var bg2 = x.createRadialGradient(cx, cy, 0, cx, cy, R + 240);
      bg2.addColorStop(0, 'rgba(255,255,255,' + (a * 0.86) + ')');
      bg2.addColorStop(R / (R + 240), 'rgba(255,255,255,' + (a * 0.5) + ')');
      bg2.addColorStop((R + 120) / (R + 240), 'rgba(255,255,255,' + (a * 0.12) + ')');
      bg2.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = bg2;
      x.fillRect(cx - R - 240, cy - R - 240, 2 * R + 480, 2 * R + 480);
    });
    if (mouse && document.getElementById('mouse-spotlight')) {
      /* radial-gradient(700px circle, .035 0%, .015 35%, transparent 65%) */
      var sg = x.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 700);
      sg.addColorStop(0, 'rgba(255,255,255,0.035)');
      sg.addColorStop(0.35, 'rgba(255,255,255,0.015)');
      sg.addColorStop(0.65, 'rgba(255,255,255,0)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = sg;
      x.fillRect(mouse.x - 700, mouse.y - 700, 1400, 1400);
    }
    bg.ok = true;
  }

  function place(it) {
    var card = it.card;
    if (!it.inside) {
      var L = card.offsetLeft, T = card.offsetTop, W = card.offsetWidth, H = card.offsetHeight;
      if (L !== it.L || T !== it.T || W !== it.W || H !== it.H) {
        var st = it.cv.style;
        st.left = L + 'px'; st.top = T + 'px'; st.width = W + 'px'; st.height = H + 'px';
        it.L = L; it.T = T; it.W = W; it.H = H;
      }
      if (!it.R) it.cv.style.borderRadius = it.R = getComputedStyle(card).borderRadius;
    }
  }

  function paint(it, sand, fig, sandA, figA) {
    var card = it.card, r = card.getBoundingClientRect();
    var ow = card.offsetWidth, oh = card.offsetHeight;
    if (r.width < 4 || r.height < 4 || !ow || !oh) return;
    place(it);
    /* the box the canvas covers, on screen: a big card's border box, a small
       card's padding box (it sits inside the border) */
    var kx = r.width / ow, ky = r.height / oh;
    var bx = r.left, by = r.top, bw = r.width, bh = r.height;
    if (it.inside) {
      bx += card.clientLeft * kx; by += card.clientTop * ky;
      bw = card.clientWidth * kx; bh = card.clientHeight * ky;
    }
    var w = Math.max(2, Math.ceil((it.inside ? card.clientWidth : ow) / CELL));
    var h = Math.max(2, Math.ceil((it.inside ? card.clientHeight : oh) / CELL));
    var cv = it.cv, x = it.cx;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    /* draw in screen px from here on */
    x.setTransform(w / bw, 0, 0, h / bh, -bx * w / bw, -by * h / bh);
    x.imageSmoothingEnabled = true;
    x.globalAlpha = 1;
    x.drawImage(bg.cv, 0, 0, window.innerWidth, window.innerHeight);
    if (sand) {
      x.globalAlpha = sandA;
      sandL.draw(x, sand);
    }
    if (fig && figA > 0.004) {
      x.globalAlpha = figA;
      figL.draw(x, fig);
    }
    x.globalAlpha = 1;
    x.fillStyle = it.hover && card.matches(':hover') ? TINT_HOVER : TINT;
    x.fillRect(bx, by, bw, bh);
  }

  function sandSrc() {
    var ps = window.__projSand;
    return ps && ps.frostSrc ? ps.frostSrc() : null;
  }
  function figSrc() {
    var f = window.__projLedgerFig, led = f && f.led && f.led();
    if (!led || !led.gl || !led.prog) return null;
    return { gl: led.gl, prog: led.prog, unit: led.gl.TEXTURE0, mode: led.gl.TRIANGLE_STRIP, count: 4,
             canvas: f.canvas(), key: f.txt() + '|' + f.rev() };
  }

  function fail(why) {
    S.failed = why;
    window.__frost = null;
    root.classList.remove('frost');
  }

  /* projects-sand.js calls this every corridor frame, before it draws, while
     the stage is on screen: the sand's buffer still holds its last frame */
  window.__frost = function (fr) {
    if (document.body.classList.contains('blueprint')) return;
    var live = [];
    for (var i = 0; i < items.length; i++) {
      var sl = items[i].slide;
      if (sl && sl.style.visibility !== 'hidden' && num(sl.style.opacity, 1) > 0.01) live.push(items[i]);
    }
    if (!live.length) return;
    var t0 = performance.now();
    var vw = window.innerWidth, vh = window.innerHeight;
    paintBg(vw, vh);

    /* the sand */
    var sandCv = document.getElementById('proj-sand');
    var released = stage && stage.classList.contains('released');
    if (t0 - sandL.t >= SAND_MS || sandL.key !== String(released)) {
      var ss = sandSrc(), sh = ss && shrink(ss);
      if (!sh) { if (!S.on) fail('sand'); return; }
      var stH = stage ? stage.clientHeight : vh;
      var sandW = sandCv ? sandCv.clientWidth : 0;
      /* the released stage's mask (styles.css): the bed's last 96 px fade out */
      sandL.fill(sh, passesFor(sandW ? 16 * sandW / ss.gl.drawingBufferWidth : 16),
                 released ? function (y) { return Math.max(0, Math.min(1, (stH - y) / 96)); } : null, stH);
      sandL.t = t0; sandL.key = String(released);
      S.sandCopies++;
    }

    /* the figure: copied only when it has changed */
    var fs = figSrc(), figR = null, figA = 0;
    if (fs && fs.canvas) {
      var key = fs.key + '|' + fs.gl.drawingBufferWidth + 'x' + fs.gl.drawingBufferHeight;
      if (key !== figL.key && t0 - figL.t >= FIG_MS) {
        var fh = shrink(fs);
        var figW = fs.canvas.clientWidth;
        if (fh) {
          figL.fill(fh, passesFor(figW ? 16 * figW / fs.gl.drawingBufferWidth : 16), null, 0);
          figL.key = key; figL.t = t0; S.figCopies++;
        }
      }
      if (figL.ok) {
        figR = fs.canvas.getBoundingClientRect();
        var ghost = fs.canvas.closest('.sc-ghost');
        var go = ghost ? (ghost.style.opacity !== '' ? ghost.style.opacity : getComputedStyle(ghost).opacity) : 1;
        figA = num(fs.canvas.style.opacity, 0.34) * num(go, 1);
      }
    }
    var t1 = performance.now();

    var sandR = sandCv ? sandCv.getBoundingClientRect() : null;
    var sandA = sandCv ? num(sandCv.style.opacity, 0.25) : 0;
    for (i = 0; i < live.length; i++) paint(live[i], sandR, figR, sandA, figA);

    if (!S.on) { S.on = true; root.classList.add('frost'); }
    S.frames++;
    S.copyMs += t1 - t0;
    S.ms += performance.now() - t0;
  };
})();
