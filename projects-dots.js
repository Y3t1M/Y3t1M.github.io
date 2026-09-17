/* ============================================================
   LED DOTS — projects-dots.js  (projects page)
   Hudson's Dot Lab pick, 2026-09-16: D3 LED + F1 Whole + M1 Reveal,
   pitch 3.7 px, contrast 1.5, silhouette 0.

   One renderer, two users:
   · window.__led — draws any source (a photo, a figure, a logo) as a grid
     of same-size round dots, one per 3.7 CSS px cell, at the device's real
     pixels; brightness carries the tone, with a faint glow, and a reveal
     lights the dots in a diagonal wave. projects-ledger.js draws the big
     figures behind the slides with it (Hudson: "the numbers behind need to
     be in the same style as the image").
   · the Hardware photos below. They used to be ASCII art baked into 1430 px
     PNGs and shown at about a quarter of their size, so the characters
     aliased into streaks (worst on phones), and the wide, short box cropped
     the helmet's face. Now each is drawn whole, from a small greyscale+alpha
     copy in assets/img/dots/ (the originals are the NeatFreak demo's pixel
     inputs and stay untouched), and lights up when its card arrives.

   The <img> is a blank placeholder carrying data-dots (the source) and
   data-fallback (the baked render), so with JavaScript on the baked PNG is
   never fetched; <noscript> keeps it for everyone else, and a browser
   without WebGL gets it back through data-fallback.
   ============================================================ */
(function () {
  'use strict';

  var PITCH = 3.7;          /* CSS px per dot */
  var CONTRAST = 1.5;
  var FLOOR = 0;            /* silhouette lift */
  var FIT = 0.9;            /* photos: whole object, a little air around it */
  var REVEAL_MS = 1400;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FS = [
    'precision highp float;',
    'uniform sampler2D uTex; uniform vec2 uRes; uniform float uPitch, uRev, uAA; uniform vec3 uInk;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'void main(){',
    '  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
    /* most of a figure or a photo is empty: one sample of the dilated
       coverage decides whether this pixel can be near a dot or its glow */
    '  if (texture2D(uTex, px / uRes).b < 0.004) { gl_FragColor = vec4(0.0); return; }',
    '  vec2 base = floor(px / uPitch);',
    '  float cov = 0.0, glow = 0.0;',
    '  float span = uRes.x / uPitch * 0.62 + uRes.y / uPitch * 0.38;',
    '  for (int j = -1; j <= 1; j++) {',
    '    for (int i = -1; i <= 1; i++) {',
    '      vec2 cell = base + vec2(float(i), float(j));',
    '      vec2 cp = (cell + 0.5) * uPitch;',
    '      vec2 uv = cp / uRes;',
    '      if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) continue;',
    '      vec4 s = texture2D(uTex, uv);',
    '      float t = s.r, a = s.g;',
    '      if (a < 0.02) continue;',
    /* the reveal: a diagonal wave, each dot a touch early or late */
    '      float delay = ((cell.x + 0.5) * 0.62 + (cell.y + 0.5) * 0.38) / span * 0.7 + hash(cell + 3.1) * 0.12;',
    '      float k = smoothstep(delay, delay + 0.18, uRev);',
    '      float d = length(px - cp);',
    '      float r = uPitch * 0.36 * k;',
    '      glow = max(glow, t * 0.20 * exp(-d / (uPitch * 0.85)) * k * a);',
    '      float c = (1.0 - smoothstep(r - uAA, r + uAA, d)) * (0.18 + 0.82 * t) * a;',
    '      if (r < uAA) c *= r / uAA;',
    '      cov = max(cov, c);',
    '    }',
    '  }',
    '  float v = clamp(cov + glow, 0.0, 1.0);',
    '  gl_FragColor = vec4(uInk * v, v);',
    '}'
  ].join('\n');

  function dpr() { return Math.min(3, window.devicePixelRatio || 1); }

  /* ---- tone: any drawable, as brightness + coverage, one texel per half cell ---- */
  var prep = document.createElement('canvas');
  var prepX = prep.getContext('2d', { willReadFrequently: true });
  var mid = document.createElement('canvas');
  var midX = mid.getContext('2d');

  /* src is either an image, framed whole in the box with a little air (the
     photos), or a painter function(ctx, w, h) that draws a vector figure
     straight into the box (the ledger's numbers and logo): no full-size
     canvas is ever built for a figure, which kept the main thread busy on
     every slide change. */
  function tone(src, W, H) {
    var pd = PITCH * dpr();
    var tw = Math.max(8, Math.ceil(W / pd * 2)), th = Math.max(8, Math.ceil(H / pd * 2));
    var paint = typeof src === 'function';
    var ss = paint ? 2 : 4;                       /* two steps: an area average, not a point sample */
    var mw = tw * ss, mh = th * ss;
    mid.width = mw; mid.height = mh;
    midX.setTransform(1, 0, 0, 1, 0, 0);
    midX.clearRect(0, 0, mw, mh);
    if (paint) {
      src(midX, mw, mh);
      midX.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      var iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height;
      var sc = Math.min(W / iw, H / ih) * FIT;
      var dw = iw * sc, dh = ih * sc, dx = (W - dw) / 2, dy = (H - dh) / 2;
      midX.imageSmoothingEnabled = true; midX.imageSmoothingQuality = 'high';
      midX.drawImage(src, dx * mw / W, dy * mh / H, dw * mw / W, dh * mh / H);
    }
    prep.width = tw; prep.height = th;
    prepX.clearRect(0, 0, tw, th);
    prepX.imageSmoothingEnabled = true; prepX.imageSmoothingQuality = 'high';
    prepX.drawImage(mid, 0, 0, tw, th);
    var px = prepX.getImageData(0, 0, tw, th).data;
    var n = tw * th, L = new Float32Array(n), A = new Float32Array(n);
    for (var i = 0; i < n; i++) { L[i] = px[i * 4] / 255; A[i] = px[i * 4 + 3] / 255; }
    /* coverage dilated by 3 texels (1.5 cells) each way, a separable max:
       everything a dot or its glow can reach, for the shader's early out */
    var tmp = new Float32Array(n), dil = new Float32Array(n), R3 = 3;
    for (var ry = 0; ry < th; ry++) {
      for (var rx = 0; rx < tw; rx++) {
        var m = 0;
        for (var q = -R3; q <= R3; q++) { var qx = rx + q; if (qx >= 0 && qx < tw && A[ry * tw + qx] > m) m = A[ry * tw + qx]; }
        tmp[ry * tw + rx] = m;
      }
    }
    for (var cx = 0; cx < tw; cx++) {
      for (var cy = 0; cy < th; cy++) {
        var mm = 0;
        for (var q2 = -R3; q2 <= R3; q2++) { var qy = cy + q2; if (qy >= 0 && qy < th && tmp[qy * tw + cx] > mm) mm = tmp[qy * tw + cx]; }
        dil[cy * tw + cx] = mm;
      }
    }
    var out = new Uint8Array(n * 4);
    for (var y = 0; y < th; y++) {
      for (var x = 0; x < tw; x++) {
        var k = y * tw + x, s = 0, w = 0;
        for (var yy = -1; yy <= 1; yy++) for (var xx = -1; xx <= 1; xx++) {
          var X = x + xx, Y = y + yy;
          if (X < 0 || Y < 0 || X >= tw || Y >= th) continue;
          var kk = Y * tw + X; s += L[kk] * A[kk]; w += A[kk];
        }
        var t = L[k] + 0.7 * (L[k] - (w > 0 ? s / w : L[k]));     /* a little unsharp mask */
        t = Math.max(FLOOR, Math.min(1, (t - 0.5) * CONTRAST + 0.54));
        out[k * 4] = Math.round(t * 255);
        out[k * 4 + 1] = Math.round(A[k] * 255);
        out[k * 4 + 2] = Math.round(dil[k] * 255);
        out[k * 4 + 3] = 255;
      }
    }
    return { w: tw, h: th, data: out };
  }

  function sh(gl, type, s) {
    var o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
    return o;
  }

  /* ---- a renderer bound to one canvas ----
     r.draw(src, fit, rev, srcId): sizes the canvas to its layout box (never a
     bounding rect: the corridor scales and turns its slides), rebuilds the
     tone texture when the size or the source changed, and draws at reveal
     progress rev. make() throws only if WebGL itself is unusable; draw()
     throws only if the source's pixels cannot be read. */
  function make(canvas) {
    var r = { canvas: canvas, gl: null, key: '', lost: false, onrestore: null };
    var cache = {}, order = [];                   /* tone textures by size and source id */
    function init() {
      var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
      if (!gl) throw new Error('no webgl');
      var pr = gl.createProgram();
      gl.attachShader(pr, sh(gl, gl.VERTEX_SHADER, VS));
      gl.attachShader(pr, sh(gl, gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(function (p) { gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR); });
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var U = {};
      ['uTex', 'uRes', 'uPitch', 'uRev', 'uAA', 'uInk'].forEach(function (u) { U[u] = gl.getUniformLocation(pr, u); });
      gl.uniform1i(U.uTex, 0);
      gl.uniform3f(U.uInk, 0.918, 0.918, 0.918);
      gl.uniform1f(U.uAA, 0.75);
      r.gl = gl; r.U = U; r.key = ''; r.lost = false;
    }
    init();
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); r.lost = true; });
    canvas.addEventListener('webglcontextrestored', function () {
      try { init(); if (r.onrestore) r.onrestore(); } catch (e) { /* stays blank; the page is intact */ }
    });
    /* r.draw(src, rev, srcId): srcId names the source, so a figure met again
       at the same size is a texture upload, not a recompute */
    r.draw = function (src, rev, srcId) {
      if (r.lost || !r.gl || !src) return;
      var W = Math.max(1, Math.round(canvas.clientWidth * dpr()));
      var H = Math.max(1, Math.round(canvas.clientHeight * dpr()));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      var gl = r.gl, U = r.U;
      var key = W + 'x' + H + '#' + (srcId || 0);
      if (key !== r.key) {
        var t = cache[key];
        if (!t) {
          t = cache[key] = tone(src, W, H);
          order.push(key);
          if (order.length > 12) delete cache[order.shift()];
        }
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t.w, t.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, t.data);
        r.key = key;
      }
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uRes, W, H);
      gl.uniform1f(U.uPitch, PITCH * dpr());
      gl.uniform1f(U.uRev, rev);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    return r;
  }

  /* a reveal clock any user can drive: calls step(rev) every frame until 1;
     returns a function that stops it */
  function reveal(step) {
    if (REDUCED) { step(1); return function () {}; }
    var t0 = 0, stopped = false;
    function tick(now) {
      if (stopped) return;
      if (!t0) t0 = now;
      var rev = Math.min(1, (now - t0) / REVEAL_MS);
      step(rev);
      if (rev < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return function () { stopped = true; };
  }

  if (window.WebGLRenderingContext) {
    window.__led = { make: make, reveal: reveal, pitch: PITCH, dpr: dpr, reduced: REDUCED };
  }

  /* ================= the Hardware photos ================= */
  var imgs = Array.prototype.slice.call(document.querySelectorAll('#showcase .case-sm img[data-dots]'));
  var views = [];

  function fallback(v) {
    /* no dots after all: give the card its baked render back */
    if (v.canvas.parentNode) v.canvas.parentNode.removeChild(v.canvas);
    v.img.src = v.fallbackSrc;
    v.dead = true;
  }

  imgs.forEach(function (img) {
    var wrap = document.createElement('div');
    wrap.className = 'case-dots-wrap';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    var canvas = document.createElement('canvas');
    canvas.className = 'case-dots';
    canvas.setAttribute('aria-hidden', 'true');
    wrap.appendChild(canvas);
    var v = { img: img, fallbackSrc: img.getAttribute('data-fallback'), wrap: wrap, canvas: canvas,
              src: new Image(), rev: REDUCED ? 1 : 0, armed: !REDUCED, playing: false, ready: false, dead: false, stop: null };
    if (!window.__led) { fallback(v); return; }
    try { v.r = make(canvas); } catch (e) { fallback(v); return; }
    v.r.onrestore = function () { draw(v); };
    v.src.onload = function () { v.ready = true; draw(v); };
    v.src.onerror = function () { fallback(v); };
    v.src.src = img.getAttribute('data-dots');
    views.push(v);
  });

  function draw(v) {
    if (v.dead || !v.ready) return;
    /* reading the photo's pixels throws if the browser treats it as
       cross-origin (file://, a misbehaving cache): fall back, never break */
    try { v.r.draw(v.src, v.rev, 1); } catch (e) { fallback(v); }
  }

  function play(v) {
    if (v.stop) v.stop();
    v.playing = true;
    v.stop = reveal(function (rev) { v.rev = rev; if (rev >= 1) v.playing = false; draw(v); });
  }
  function onStage(v) { if (v.armed && !v.dead) { v.armed = false; play(v); } }
  function offStage(v) { if (!v.playing && !v.dead) { v.armed = true; v.rev = 0; draw(v); } }

  if (views.length) {
    if (REDUCED) {
      views.forEach(function (v) { v.rev = 1; v.armed = false; });
    } else if (document.documentElement.classList.contains('fx')) {
      /* DESKTOP CORRIDOR. An IntersectionObserver cannot be used here: a slide
         that has never been on stage sits hidden at the centre of the stage, so
         the observer called every card visible the moment the corridor pinned
         and the reveal played unseen. The corridor's own state is the truth:
         scroll-fx marks a slide .active as it seats, and hides it once it has
         fully left, which is when the reveal re-arms. */
      views.forEach(function (v) {
        var slide = v.wrap.closest('.sc-slide');
        if (!slide) { v.rev = 1; v.armed = false; return; }
        function check() {
          if (slide.classList.contains('active')) onStage(v);
          else if (slide.style.visibility === 'hidden') offStage(v);
        }
        new MutationObserver(check).observe(slide, { attributes: true, attributeFilter: ['class', 'style'] });
        check();
      });
    } else if ('IntersectionObserver' in window) {
      /* touch devices: the plain flow, where the observer is exact */
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var v = views.filter(function (x) { return x.wrap === e.target; })[0];
          if (!v) return;
          if (e.intersectionRatio >= 0.35) onStage(v);
          else if (!e.isIntersecting) offStage(v);
        });
      }, { threshold: [0, 0.35] });
      views.forEach(function (v) { io.observe(v.wrap); });
    } else {
      views.forEach(function (v) { v.rev = 1; v.armed = false; });
    }

    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { views.forEach(draw); }, 120);
    });
    window.addEventListener('load', function () { views.forEach(draw); });
  }

  /* read-only hook for the tests */
  window.__projDots = {
    views: function () {
      return views.map(function (v) {
        return { rev: v.rev, ready: v.ready, dead: v.dead, playing: v.playing, w: v.canvas.width, h: v.canvas.height,
                 cssW: v.canvas.clientWidth, cssH: v.canvas.clientHeight };
      });
    }
  };
})();
