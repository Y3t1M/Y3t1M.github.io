/* ============================================================
   THE HARDWARE PHOTOS AS LED DOTS — projects-dots.js  (projects page)
   Hudson's Dot Lab pick, 2026-09-16: D3 LED + F1 Whole + M1 Reveal,
   pitch 3.7 px, contrast 1.5, silhouette 0.

   The photos used to be ASCII art baked into 1430 px PNGs and shown at
   about a quarter of their size, so the characters aliased into streaks
   (worst on phones), and the wide, short box cropped the helmet's face.
   Here every picture is drawn live at the device's real pixels from the
   photo's cutout: one dot per 3.7 CSS px cell, every dot the same size,
   brightness carrying the tone with a faint glow — the same vocabulary
   as the LED "Projects" title — and the whole object kept in the box.
   Dots light up in a wave when a card comes into view, and again each
   time it comes back.

   Sources are small greyscale+alpha copies in assets/img/dots/ (the
   originals are the NeatFreak demo's pixel inputs and stay untouched).
   The baked renders remain the fallback: without JavaScript or WebGL the
   <img> keeps them; reduced motion gets the finished picture at once.
   ============================================================ */
(function () {
  'use strict';

  var PITCH = 3.7;          /* CSS px per dot */
  var CONTRAST = 1.5;
  var FLOOR = 0;            /* silhouette lift */
  var FIT = 0.9;            /* whole object, a little air around it */
  var REVEAL_MS = 1400;
  var SRC = {
    'avr_drone_ascii.png': 'assets/img/dots/avr_drone.png',
    'arduino_r4_ascii.png': 'assets/img/dots/arduino_r4.png',
    'ironman_helmet_ascii.png': 'assets/img/dots/ironman_helmet.png'
  };
  var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var imgs = Array.prototype.slice.call(document.querySelectorAll('#showcase .case-sm img'));
  if (!imgs.length || !window.WebGLRenderingContext) return;

  var VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FS = [
    'precision highp float;',
    'uniform sampler2D uTex; uniform vec2 uRes; uniform float uPitch, uRev, uAA; uniform vec3 uInk;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'void main(){',
    '  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
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

  /* ---- tone: the cutout, framed whole in the box, as brightness + coverage ---- */
  var prep = document.createElement('canvas');
  var prepX = prep.getContext('2d', { willReadFrequently: true });
  var mid = document.createElement('canvas');
  var midX = mid.getContext('2d');

  function tone(src, W, H) {
    var pd = PITCH * dpr();
    var tw = Math.max(8, Math.ceil(W / pd * 2)), th = Math.max(8, Math.ceil(H / pd * 2));
    var iw = src.naturalWidth, ih = src.naturalHeight;
    var sc = Math.min(W / iw, H / ih) * FIT;
    var dw = iw * sc, dh = ih * sc, dx = (W - dw) / 2, dy = (H - dh) / 2;
    var mw = tw * 4, mh = th * 4;                 /* two steps: an area average, not a point sample */
    mid.width = mw; mid.height = mh;
    midX.clearRect(0, 0, mw, mh);
    midX.imageSmoothingEnabled = true; midX.imageSmoothingQuality = 'high';
    midX.drawImage(src, dx * mw / W, dy * mh / H, dw * mw / W, dh * mh / H);
    prep.width = tw; prep.height = th;
    prepX.clearRect(0, 0, tw, th);
    prepX.imageSmoothingEnabled = true; prepX.imageSmoothingQuality = 'high';
    prepX.drawImage(mid, 0, 0, tw, th);
    var px = prepX.getImageData(0, 0, tw, th).data;
    var n = tw * th, L = new Float32Array(n), A = new Float32Array(n);
    for (var i = 0; i < n; i++) { L[i] = px[i * 4] / 255; A[i] = px[i * 4 + 3] / 255; }
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
        out[k * 4 + 3] = 255;
      }
    }
    return { w: tw, h: th, data: out };
  }

  /* ---- one view per photo ---- */
  var views = [];

  function sh(gl, type, s) {
    var o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
    return o;
  }
  function initGL(v) {
    var gl = v.canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
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
    v.gl = gl; v.U = U; v.key = '';
  }

  function fallback(v) {
    /* no dots after all: give the card its baked render back */
    if (v.canvas.parentNode) v.canvas.parentNode.removeChild(v.canvas);
    v.img.src = v.orig;
    v.dead = true;
  }

  imgs.forEach(function (img) {
    var orig = img.getAttribute('src') || '';
    var src = SRC[orig.split('/').pop()];
    if (!src) return;
    var wrap = document.createElement('div');
    wrap.className = 'case-dots-wrap';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    var canvas = document.createElement('canvas');
    canvas.className = 'case-dots';
    canvas.setAttribute('aria-hidden', 'true');
    wrap.appendChild(canvas);
    /* the <img> keeps its box, border and alt text; the dots draw over it */
    img.src = BLANK;
    var v = { img: img, orig: orig, wrap: wrap, canvas: canvas, src: new Image(), rev: REDUCED ? 1 : 0,
              t0: 0, armed: !REDUCED, playing: false, ready: false, dead: false, key: '' };
    try { initGL(v); } catch (e) { fallback(v); return; }
    v.src.onload = function () { v.ready = true; draw(v); };
    v.src.onerror = function () { fallback(v); };
    v.src.src = src;
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); v.gl = null; });
    canvas.addEventListener('webglcontextrestored', function () {
      try { initGL(v); draw(v); } catch (e) { fallback(v); }
    });
    views.push(v);
  });
  if (!views.length) return;

  function draw(v) {
    if (v.dead || !v.ready || !v.gl) return;
    /* layout size: the corridor scales and turns its slides, a bounding rect would lie */
    var W = Math.max(1, Math.round(v.canvas.clientWidth * dpr()));
    var H = Math.max(1, Math.round(v.canvas.clientHeight * dpr()));
    if (v.canvas.width !== W || v.canvas.height !== H) { v.canvas.width = W; v.canvas.height = H; }
    var gl = v.gl, U = v.U;
    var key = W + 'x' + H;
    if (key !== v.key) {
      /* reading the photo's pixels throws if the browser treats it as
         cross-origin (file://, a misbehaving cache): fall back, never break */
      try {
        var t = tone(v.src, W, H);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t.w, t.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, t.data);
      } catch (e) { fallback(v); return; }
      v.key = key;
    }
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uPitch, PITCH * dpr());
    gl.uniform1f(U.uRev, v.rev);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* ---- the reveal: plays when a card comes into view, again after it has left ---- */
  function tick(now) {
    var more = false;
    views.forEach(function (v) {
      if (!v.playing) return;
      if (!v.t0) v.t0 = now;
      v.rev = Math.min(1, (now - v.t0) / REVEAL_MS);
      if (v.rev >= 1) v.playing = false; else more = true;
      draw(v);
    });
    if (more) requestAnimationFrame(tick);
  }
  function play(v) {
    v.playing = true; v.t0 = 0; v.rev = 0;
    requestAnimationFrame(tick);
  }
  function onStage(v) { if (v.armed && !v.dead) { v.armed = false; play(v); } }
  function offStage(v) { if (!v.playing && !v.dead) { v.armed = true; v.rev = 0; draw(v); } }

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
      if (!slide) { v.rev = 1; return; }
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
    rt = setTimeout(function () { views.forEach(function (v) { v.key = ''; draw(v); }); }, 120);
  });
  window.addEventListener('load', function () { views.forEach(function (v) { v.key = ''; draw(v); }); });

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
