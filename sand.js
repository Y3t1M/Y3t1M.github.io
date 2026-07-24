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

  // the splash stays clean: sand only fades in once you scroll past the hero
  var heroEl = document.querySelector('.hero');
  if (heroEl) {
    var syncOp = function () {
      var hb = heroEl.offsetHeight || 600;
      var f = Math.max(0, Math.min(1, (window.pageYOffset - hb * 0.3) / (hb * 0.55)));
      canvas.style.opacity = (0.26 * f).toFixed(3);
    };
    syncOp();
    window.addEventListener('scroll', syncOp, { passive: true });
    window.addEventListener('resize', syncOp);
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });

  function fallback() {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    function paint() {
      var W = canvas.width = window.innerWidth;
      var H = canvas.height = window.innerHeight;
      var id = ctx.createImageData(W, H);
      for (var i = 0; i < id.data.length; i += 4) {
        var r = Math.random();
        var v = r < 0.72 ? 0 : Math.floor(((r - 0.72) / 0.28) * 190);
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
        id.data[i + 3] = 255;
      }
      ctx.putImageData(id, 0, 0);
    }
    paint();
    window.addEventListener('resize', paint);
  }

  if (!gl) { fallback(); return; }

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
    '  vec2 pcss = vec2(st.x, uRes.y * uPx - st.y);',
    '  float pile = 0.0; float f = 1.0;',
    '  for (int i = 0; i < 8; i++) {',
    '    if (float(i) >= uNR) break;',
    '    vec4 rct = uR[i];',
    /* rounded-rect SDF so the carve follows the cards 14px corners */
    '    vec2 hf = rct.zw * 0.5;',
    '    vec2 q = abs(pcss - rct.xy - hf) - hf + vec2(14.0);',
    '    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 14.0;',
    '    if (sd < 0.0) {',
    /* INSIDE a card the sand accumulates toward the middle — a soft pile that
       is densest at the centre and tapers out to the edges, so the grain
       visibly gathers on the card rather than going dead. */
    '      pile += smoothstep(-6.0, -58.0, sd) * 1.35;',
    '    } else {',
    /* OUTSIDE, a low drift banked against the border — tight falloff so it
       hugs the edge and never stacks into the old bright "skeleton" bars. */
    '      pile += exp(-sd * sd / 70.0) * 0.35;',
    '    }',
    '  }',
    '  pile = min(pile, 1.6);',
    '  float s2 = n * f * (1.0 + pile * 0.5);',
    '  gl_FragColor = vec4(vec3(0.55) * s2 * mask, 1.0);',
    '}'
  ].join('\n');

  function shader(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
    return sh;
  }
  var vs = shader(gl.VERTEX_SHADER, VS);
  var fs = shader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { fallback(); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fallback(); return; }
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
    var n = 0;
    for (var i = 0; i < cardEls.length && n < 8; i++) {
      var r = cardEls[i].getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40 || r.width === 0) continue;
      rectData[n * 4] = r.left;
      rectData[n * 4 + 1] = r.top;
      rectData[n * 4 + 2] = r.width;
      rectData[n * 4 + 3] = r.height;
      n++;
    }
    gl.uniform4fv(uRLoc, rectData);
    gl.uniform1f(uNR, n);
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
    pushRects();
    gl.uniform1f(uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (reduced) { draw(11.0); return; }

  var rafId = null;
  function frame(ts) {
    draw(ts / 1000);
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
    else if (!rafId) rafId = requestAnimationFrame(frame);
  });
})();
