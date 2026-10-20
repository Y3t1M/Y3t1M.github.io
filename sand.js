/* ============================================================
   SAND — sand.js
   Boiling-grain background: static per-pixel jitter over a
   slowly drifting domain-warped simplex field. Movement comes
   from pixels crossing the contrast threshold at different
   moments — never from sliding or re-randomizing a texture.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.id = 'sand-canvas';
  document.body.prepend(canvas);

  /* Diagnostics. Shader failures used to be silent — the code just fell back
     and there was no way to tell, from a phone, whether WebGL was refused,
     the shader failed to compile, or the loop had simply stopped. ?diag=1
     surfaces this. */
  var D = window.__sandDiag = { mode:'init', frames:0, log:'', rects:0, err:'' };

  // the splash stays clean: sand only fades in once you scroll past the hero
  var heroEl = document.querySelector('.hero');
  if (heroEl) {
    var syncOp = function () {
      var hb = heroEl.offsetHeight || 600;
      var f = Math.max(0, Math.min(1, (window.pageYOffset - hb * 0.3) / (hb * 0.55)));
      canvas.style.opacity = (0.34 * f).toFixed(3);
    };
    syncOp();
    window.addEventListener('scroll', syncOp, { passive: true });
    window.addEventListener('resize', syncOp);
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* alpha:true so the grain carries its own transparency.
     This used to be an opaque black canvas relying on CSS mix-blend-mode:screen
     to drop the black — but a blend mode on a fixed element composites against
     whatever stacking context the browser decides it belongs to, and engines
     disagree. Where it failed, the sand rendered behind the cards instead of
     piling on them. Premultiplied alpha needs no blend mode and behaves the
     same in every browser, desktop and mobile. */
  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true,
                                        antialias: false, depth: false, stencil: false });

  function fallback() {
    var ctx = canvas.getContext('2d');
    if (!ctx) { D.mode = 'no-2d'; return; }
    D.mode = D.mode === 'init' ? '2d-fallback' : D.mode + '+2d';
    function paint() {
      var W = canvas.width = window.innerWidth;
      var H = canvas.height = window.innerHeight;
      var id = ctx.createImageData(W, H);
      for (var i = 0; i < id.data.length; i += 4) {
        var r = Math.random();
        var v = r < 0.72 ? 0 : Math.floor(((r - 0.72) / 0.28) * 190);
        /* white grain carried on alpha, to match the WebGL path — an opaque
           canvas here would paint a black sheet over the whole page now that
           there is no blend mode to drop it */
        id.data[i] = id.data[i + 1] = id.data[i + 2] = 255;
        id.data[i + 3] = v;
      }
      ctx.putImageData(id, 0, 0);
    }
    paint();
    window.addEventListener('resize', paint);
  }

  if (!gl) { D.mode = 'no-webgl'; fallback(); return; }

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uT;',
    'uniform float uSeed;',
    'uniform float uPx;',   /* CSS px per device px — resolution independence */
    'uniform vec4 uR[8];',   /* card rects (css px) — sand calms inside, piles at edges */
    'uniform float uNR;',
    '#define PI 3.141592653589793',
    /* Ashima / stegu 2D simplex noise */
    'vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}',
    'vec2 mod289(vec2 x){return x - floor(x * (1.0/289.0)) * 289.0;}',
    'vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}',
    'float snoise(vec2 v){',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
    '  vec2 i = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod289(i);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);',
    '  m = m*m; m = m*m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
    '  vec3 g;',
    '  g.x = a0.x * x0.x + h.x * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    /* static per-pixel random — time must NEVER enter here */
    'float hash(vec2 p){',
    '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    'float snoise01(vec2 v){ return 0.5 + 0.5 * snoise(v); }',
    'float noise2d(vec2 st){ return snoise01(vec2(st.x + uT*0.025, st.y - uT*0.035 + uSeed)); }',
    'float pattern(vec2 p){',
    '  vec2 q = vec2(noise2d(p), noise2d(p + vec2(5.2, 1.3)));',
    '  vec2 r = vec2(noise2d(p + 4.0*q + vec2(1.7, 9.2)), noise2d(p + 4.0*q + vec2(8.3, 2.8)));',
    '  return noise2d(p + r);',
    '}',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  vec2 st = gl_FragCoord.xy * uPx;',   /* CSS-pixel coords */
    '  vec2 px = floor(gl_FragCoord.xy);',
    /* soft off-center mask with a floor so faint grain reaches everywhere */
    '  vec2 asp = vec2(uRes.x / uRes.y, 1.0);',
    '  float mask = 1.0 - smoothstep(0.3, 1.1, distance(uv * asp, vec2(0.5, 0.72) * asp));',
    '  mask = 0.55 + 0.45 * mask;',
    /* static jitter vector per pixel */
    '  float gr = pow(hash(px), 1.5) + 0.5 * (1.0 - mask);',
    '  float ga = hash(px + 917.0) * 2.0 * PI;',
    '  vec2 jitter = 0.05 * gr * vec2(cos(ga), sin(ga));',
    '  vec2 freq = vec2(0.000323, 0.001333) * (1.0 + 0.5 * (1.0 - mask));',
    '  float n = pattern(st * freq + jitter);',
    '  n = smoothstep(0.0, 1.0, pow(n * 1.05, 6.0));',
    /* card awareness: calm under any container, grain piles along its border */
    /* THE CARDS ARE OBJECTS SET INTO THE SAND.
       Not a mound gathered on top of them — that was the earlier model, and it
       read as haze over the text. A card is a solid black thing pressed into
       the field: its face stays clear, and the grain banks up in the gaps
       between and around the cards, the way sand collects against anything you
       press into it.

       inside — this pixel is on a card face, so the grain is held back.
       near   — how close it sits to the nearest card edge, 1 right against it
                and falling away across SEEP_REACH px. That is the banking. */
    '  vec2 pcss = vec2(st.x, uRes.y * uPx - st.y);',
    '  float inside = 0.0;',
    '  float near = 0.0;',
    '  for (int i = 0; i < 8; i++) {',
    '    if (float(i) >= uNR) break;',
    '    vec4 rct = uR[i];',
    /* rounded-rect SDF, so the banking follows the card's 14px corners */
    '    vec2 hf = rct.zw * 0.5;',
    '    vec2 q = abs(pcss - rct.xy - hf) - hf + vec2(14.0);',
    '    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 14.0;',
    '    if (sd < 0.0) { inside = 1.0; }',
    '    else { near = max(near, exp(-sd / 26.0)); }',   /* seep reach 26px */
    '  }',
    '  float s2 = n * (1.0 + near * 0.75);',             /* seep strength 0.75 */
    '  float a = clamp(0.55 * s2 * mask, 0.0, 1.0);',    /* grain weight 0.55 */
    '  a *= (1.0 - inside * 0.20);',                     /* face clearance 0.20 */
    '  gl_FragColor = vec4(vec3(a), a);',
    '}'
  ].join('\n');

  function shader(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      D.log += (type === gl.VERTEX_SHADER ? 'VS: ' : 'FS: ') + gl.getShaderInfoLog(sh) + ' ';
      return null;
    }
    return sh;
  }
  var vs = shader(gl.VERTEX_SHADER, VS);
  var fs = shader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { D.mode = 'shader-failed'; fallback(); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    D.mode = 'link-failed'; D.log += 'LINK: ' + gl.getProgramInfoLog(prog);
    fallback(); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'uRes');
  var uT = gl.getUniformLocation(prog, 'uT');
  var uSeed = gl.getUniformLocation(prog, 'uSeed');
  var uPx = gl.getUniformLocation(prog, 'uPx');
  var uRLoc = gl.getUniformLocation(prog, 'uR[0]');
  var uNR = gl.getUniformLocation(prog, 'uNR');
  gl.uniform1f(uSeed, Math.random() * 100.0);

  /* containers the sand should respect */
  var cardEls = [];
  function collectCards() {
    cardEls = Array.prototype.slice.call(document.querySelectorAll(
      '.case, .case-sm, .project-card, .about-card, .awards-list, .contact-inner, .nf-panel, .nf-controls'
    ));
  }
  collectCards();
  window.addEventListener('load', collectCards);
  var rectData = new Float32Array(32);
  function pushRects() {
    var vh = window.innerHeight;
    /* Rect coords must be in CANVAS space, not viewport space. On iOS the
       fixed canvas's box shifts against the layout viewport while the toolbar
       collapses, so raw client coords land the banking a card-height off —
       phantom card-shaped "skeletons" floating above the real cards. */
    var cb = canvas.getBoundingClientRect();
    var n = 0;
    for (var i = 0; i < cardEls.length && n < 8; i++) {
      var r = cardEls[i].getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40 || r.width === 0) continue;
      rectData[n * 4] = r.left - cb.left;
      rectData[n * 4 + 1] = r.top - cb.top;
      rectData[n * 4 + 2] = r.width;
      rectData[n * 4 + 3] = r.height;
      n++;
    }
    gl.uniform4fv(uRLoc, rectData);
    gl.uniform1f(uNR, n);
    D.rects = n;
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5); // chunky 1px grain
    /* size from the canvas's own CSS box, not innerWidth/innerHeight —
       on iOS the fixed-position box and innerHeight disagree depending
       on the toolbar state, which stretched the texture and shoved the
       card-carve rects off their cards (black boxes) */
    var r = canvas.getBoundingClientRect();
    var w = Math.max(2, Math.floor(r.width * dpr));
    var h = Math.max(2, Math.floor(r.height * dpr));
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uPx, 1.0 / dpr);
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

  function draw(t) {
    D.frames++;
    pushRects();
    gl.uniform1f(uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* Reduced motion. Freezing this outright was wrong for what it is: a
     fine-grained background shimmer, not parallax or large-object movement,
     so it does not carry the vestibular risk the setting exists to prevent.
     Frozen it also lost the card piles entirely, because the single draw ran
     while the cards were still below the fold.

     It now drifts, slowly — a quarter speed — which keeps the sand alive and
     the piles tracking without anything that reads as motion. TIME_SCALE is
     the one knob if that judgement ever needs revisiting. */
  /* Full speed regardless of prefers-reduced-motion — Hudson's call, asked for
     twice, and defensible: this is ambient background texture, not parallax or
     large-object movement, which is what the setting exists to prevent. At
     quarter speed it read as lifeless rather than calm. The blocking boot
     animation still honours the setting; that one is a real event you can be
     held behind. */
  var TIME_SCALE = 1;
  D.mode = 'webgl';

  var rafId = null;
  var lastFrame = performance.now();
  function frame(ts) {
    lastFrame = performance.now();
    draw(ts / 1000 * TIME_SCALE);
    rafId = requestAnimationFrame(frame);
  }
  function start() { if (!rafId) { lastFrame = performance.now(); rafId = requestAnimationFrame(frame); } }
  start();
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
    else start();
  });

  /* Watchdog — same guard terrain-hero.js needed. Mobile Safari suspends rAF
     under memory pressure and while the address bar animates, and does not
     always resume it, which leaves the grain frozen with no event to hang a
     fix on. If frames have stopped while the page is visible, restart. */
  setInterval(function () {
    if (document.hidden) return;
    if (performance.now() - lastFrame > 1200) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      start();
    }
  }, 1500);
  window.addEventListener('pageshow', start);

  /* Mobile GPUs reclaim WebGL contexts under memory pressure. Without this the
     canvas silently freezes on its last frame and never comes back — the loop
     keeps running, so the watchdog above cannot see it. */
  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    D.mode = 'context-lost';
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  });
  canvas.addEventListener('webglcontextrestored', function () {
    D.mode = 'context-restored';
    location.reload();          /* simplest correct rebuild of every GL object */
  });
})();
