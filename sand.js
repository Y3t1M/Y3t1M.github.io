/* ============================================================
   SAND — sand.js
   Drifting sand background (p5aholic-style): WebGL value-noise
   field, smoothly evolving, with a slow sinusoidal sway.
   Falls back to a static speckle tile without WebGL.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.id = 'sand-canvas';
  document.body.prepend(canvas);

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });

  /* ---------- fallback: static speckle ---------- */
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
    'precision mediump float;',
    'uniform vec2 uRes;',
    'uniform float uT;',
    'float hash(vec2 p){',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',
    'float vnoise(vec2 p){',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i);',
    '  float b = hash(i + vec2(1.0, 0.0));',
    '  float c = hash(i + vec2(0.0, 1.0));',
    '  float d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes.y;',
    // slow sway: gentle domain warp so the whole field breathes
    '  uv += 0.06 * vec2(sin(uT * 0.13 + uv.y * 3.1), cos(uT * 0.10 + uv.x * 2.7));',
    // fine sand grain, advected slowly and evolving in time
    '  float g1 = vnoise(uv * 260.0 + vec2(uT * 1.9, uT * 0.7));',
    '  float g2 = vnoise(uv * 260.0 + vec2(37.7, 19.3) - vec2(uT * 0.6, uT * 1.3));',
    '  float g = max(g1, g2 * 0.9);',
    // dune-scale density modulation, swaying slower
    '  float m = vnoise(uv * 9.0 + vec2(uT * 0.05, -uT * 0.035));',
    '  float dune = 0.45 + 0.55 * m;',
    // sparse bright speckle out of the noise field
    '  float s = pow(max(0.0, g - 0.52) / 0.48, 2.1) * dune;',
    '  gl_FragColor = vec4(vec3(s), 1.0);',
    '}'
  ].join('\n');

  function shader(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      return null;
    }
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

  function resize() {
    // half-resolution keeps the grain soft and the GPU cost low
    var w = Math.max(2, Math.floor(window.innerWidth / 2));
    var h = Math.max(2, Math.floor(window.innerHeight / 2));
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(t) {
    gl.uniform1f(uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (reduced) { draw(7.3); return; }

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
