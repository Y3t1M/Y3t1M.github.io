/* ============================================================
   CORRIDOR SAND — projects-sand.js  (projects page only)

   A bed of sand that lives INSIDE the corridor's sticky stage
   (.sc-stage), absolute, inset 0, under the slides, and reaches up
   THROUGH THE HEAD on a second canvas so the page is already in the
   sand when you arrive. The plates part it as they traverse.

   This is NOT sand.js. The home page's field is a fixed backdrop
   behind the whole document; this one is a material the corridor
   moves through, and it carries a persistent displacement field the
   home page has no need of. sand.js is untouched and keeps the home
   page exactly as it is.

   What it shares with sand.js is the VOICE, to the digit: the same
   Ashima/stegu simplex, the same domain-warped pattern(), the same
   static per-pixel jitter, the same pow threshold, monochrome #eaeaea
   carried on alpha, and the same drift clock
     noise2d(st) = snoise01(st.x + t*0.025, st.y - t*0.035 + seed)
   running at TIME_SCALE 1. That is why the corridor's bed reads as the
   same sand as the home page's and not as a second effect.

   Three pieces:
     · the BED — the still grain, evaluated per pixel per frame (one
       pattern() a pixel, exactly the home page's cost) in four
       thresholded copies of ONE field: bed / packed / rarefied /
       packed hard, blended AFTER the threshold so the entry adds and
       removes whole grains and nothing can speckle.
     · the FIELD — a persistent displacement map (two 16-bit numbers in
       four bytes, ping-pong framebuffers, one texel per 2 CSS px): how
       far the sand at each point has been pushed. The bed is drawn from
       where each grain came from, so the sand you see moving is the sand
       that was there.
     · the PUSH — a soft box round each moving plate whose gradient
       points out of every edge and turns smoothly round the corners.

   THE PLOUGH. A moving plate shoves the bed out of its way: hardest
   ahead of the bow, parting it to either side along the flanks, barely at
   the stern. The field takes that push almost at once and lets it go over
   about a second, so the sand is carried aside as a plate arrives and
   flows back in behind it when it stops. Nothing is added or taken away
   (Hudson, 2026-09-19: the old ridge-and-lane plough was "pushing random
   sand that doesn't exist"); the push never folds the bed over itself, so
   the grain stays intact while it moves.

   THE ENTRY. The bed is there from the first pixel of the page but
   shallow, and scrolling deepens it: more grain, more of it lit, all
   the way down. It is a function of the DESCENT and of nothing
   spatial, so it can never read as a band fixed in the page. The seam
   canvas above the stage evaluates the very same functions against the
   very same bed coordinates, which is what makes the two canvases meet
   with no step. It has its own GL context and draws itself.

   REDUCED MOTION. The ambient drift deliberately does not honour it —
   this is background texture, not parallax, and it is the same
   documented decision sand.js carries. What reduced motion does do is
   hold the descent at full depth, so the bed is still and correct with
   no onset to animate.

   scroll-fx.js publishes window.__corridorFrame once per frame (the
   smoothed progress, each visible slide's stage-relative rect and its
   velocity) and calls window.__corridorFrameCb; everything here draws
   inside that, so a rect read this frame is exactly where the plate is
   drawn this frame and the sand cannot separate from the cards.
   ============================================================ */
(function () {
  'use strict';

  var sec = document.getElementById('showcase');
  var stage = sec && sec.querySelector('.sc-stage');
  if (!stage) return;
  /* Desktop corridor only. scroll-fx.js (loaded first) sets html.fx when it
     pins the corridor; touch devices keep the plain flow and the dot grid. */
  if (!document.documentElement.classList.contains('fx')) return;
  /* cards over this bed are the same smoke glass as the home page's */
  document.documentElement.classList.add('sand-glass');

  var COARSE = window.matchMedia('(pointer: coarse)').matches;
  /* 0.29 -> 0.25 (Hudson, 2026-09-16: "dimmed a little") -> 0.20 (2026-09-19:
     "too pronounced on the projects page, a little dimmer") */
  var OPACITY = COARSE ? 0.14 : 0.20;
  var NR = 12;                           /* live rects the sand pass sees */
  var NRF = 6;                           /* the field pass only ever sees the moving plates */
  var VREF = 900;                        /* px/s that counts as full speed */
  /* CSS px per field texel. 3 was tried: 2.25x fewer texels a step, and it
     measurably costs the smoothness round the corners. */
  var FSCALE = 2;
  /* CSS px of bed kept ABOVE the stage, for the entry. The tallest head this
     page has is 607 px (390 px wide); the bed has to reach the very top of the
     projects content, because an empty strip up there followed by sand lower
     down is exactly the band this design exists to avoid. */
  var SEAM_MAX = 680;
  /* The corridor is at rest: stop stepping the FIELD. A settled displacement
     buffer recomputes the same numbers forever. The BED itself never stops —
     it drifts in the background the way the home page's does. */
  var FIELD_REST = 5.0;               /* the push relaxes over ~1.1 s: 1% is left by then */
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.createElement('canvas');
  canvas.id = 'proj-sand';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:0;' +
    'pointer-events:none;opacity:' + OPACITY.toFixed(3);
  stage.insertBefore(canvas, stage.firstChild);

  var D = { mode: 'init', frames: 0, log: '', rects: 0, steps: 0, seamRenders: 0 };

  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false,
                                        depth: false, stencil: false, preserveDrawingBuffer: true });

  var latest = null;                     /* the last corridor frame we drew from */
  var divY = -1e5;                       /* the head's bottom edge, in stage px, y down */
  var restT = 0;                         /* seconds the corridor has stood still */
  /* the descent: 0 at the top of the projects content, 1 by the time the
     corridor has taken the page over. Reduced motion holds it at full depth. */
  var entP = REDUCED ? 1 : 0;
  var headRoom = 0;

  /* ---------------- 2D fallback: a still bed of grain, nothing else ---------------- */
  var ctx2d = null;
  function fallbackPaint() {
    if (!ctx2d) return;
    var r = stage.getBoundingClientRect();
    var W = canvas.width = Math.max(2, Math.floor(r.width));
    var H = canvas.height = Math.max(2, Math.floor(r.height));
    var id = ctx2d.createImageData(W, H);
    for (var i = 0; i < id.data.length; i += 4) {
      var q = Math.random();
      var v = q < 0.72 ? 0 : Math.floor(((q - 0.72) / 0.28) * 190);
      id.data[i] = id.data[i + 1] = id.data[i + 2] = 234;
      id.data[i + 3] = v;
    }
    ctx2d.putImageData(id, 0, 0);
  }
  function fallback(why) {
    D.mode = why;
    ctx2d = canvas.getContext('2d');
    if (!ctx2d) { D.mode = why + '+no-2d'; return; }
    fallbackPaint();
    window.addEventListener('resize', fallbackPaint);
  }
  if (!gl) fallback('no-webgl');

  /* ---------------- shared GLSL ---------------- */
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var NOISE = [
    '#define PI 3.141592653589793',
    /* Ashima / stegu 2D simplex noise, exactly as sand.js */
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
    /* static per-pixel random: time never enters here, so the grain cannot boil */
    'float hash(vec2 p){',
    '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    'float snoise01(vec2 v){ return 0.5 + 0.5 * snoise(v); }',
    /* THE DRIFT. sand.js's own motion lives on this line and nowhere else:
       0.025 along x, -0.035 along y, per second, at TIME_SCALE 1. uTf is the
       corridor's own running second hand, so the corridor's grain is in the
       same weather as the home page's. */
    'float noise2d(vec2 st){ return snoise01(vec2(st.x + uTf*0.025, st.y - uTf*0.035 + uSeed)); }',
    /* THE WEAVE. A fine diagonal at 30 degrees, weak anisotropy, a deep domain
       warp and a hard threshold: sparse, curdled, punchy grain. The gain is
       not taste — it was bisected until this bed carries the same amount of
       sand over the stage as the home page's field does, so the corridor
       differs from the home page in WEAVE and never in how much sand there is. */
    'const vec2 FREQ = vec2(0.001600, 0.000840);',
    'const vec2 ROT = vec2(0.86602540, 0.50000000);',   /* cos 30, sin 30 */
    'const float WARP = 6.5;',
    'const float POW_E = 7.4;',
    'const float AMP = 1.0928;',
    /* how much lower the bed's fourth (packed) threshold sits than its own:
       the ridge's material. A ridge that carried grain the bed has none of
       would no longer match the bed it was banked out of. */
    'const float PACKED = 1.60;',
    'vec2 comb(vec2 v){ return vec2(v.x * ROT.x - v.y * ROT.y, v.x * ROT.y + v.y * ROT.x); }',
    'float pattern(vec2 p){',
    '  vec2 q = vec2(noise2d(p), noise2d(p + vec2(5.2, 1.3)));',
    '  vec2 r = vec2(noise2d(p + WARP*q + vec2(1.7, 9.2)), noise2d(p + WARP*q + vec2(8.3, 2.8)));',
    '  return noise2d(p + r);',
    '}',
    'float thresh(float n){ return smoothstep(0.0, 1.0, pow(n * AMP, POW_E)); }'
  ].join('\n');

  /* ---- THE BED ----------------------------------------------------------
     Evaluated per pixel per frame rather than sampled out of a texture: a bed
     that flows cannot be a picture taken once, and re-rendering that picture
     (stage + margins + 680 px of seam) every frame would cost more than twice
     what evaluating it live costs. Both the stage and the seam call this ONE
     function against the same bed coordinate, which is what keeps the join
     seamless now that the join has to agree in TIME as well as in space. */
  var BEDGRAIN = [
    'vec4 bedGrain(vec2 bs, float px1){',
    '  vec2 st = bs - vec2(uM, 0.0);',
    '  vec2 uv = st / uStage;',
    '  vec2 px = floor(bs / px1);',
    '  vec2 asp = vec2(uStage.x / uStage.y, 1.0);',
    '  float mask = 1.0 - smoothstep(0.3, 1.1, distance(uv * asp, vec2(0.5, 0.5) * asp));',
    '  mask = 0.55 + 0.45 * mask;',
    '  float gr = pow(hash(px), 1.5) + 0.5 * (1.0 - mask);',
    '  float ga = hash(px + 917.0) * 2.0 * PI;',
    '  vec2 jitter = 0.05 * gr * vec2(cos(ga), sin(ga));',
    '  vec2 freq = FREQ * (1.0 + 0.5 * (1.0 - mask));',
    '  float n = pattern(comb(st) * freq + jitter);',
    /* four thresholded copies of ONE field: bed / packed / rarefied / packed hard */
    '  return vec4(thresh(n), thresh(n * 1.14), thresh(n * 0.86), thresh(n * PACKED));',
    '}'
  ].join('\n');

  /* ---- THE ENTRY, and the alpha both canvases share -------------------- */
  var ENT = [
    'uniform float uEntP; uniform float uEntY; uniform float uShed;',
    'float dhash(vec2 p){',
    '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    /* How deep we are. Nothing spatial enters, so this cannot be a band.
       The bed's response to depth is convex — the last third of the descent is
       where the thresholds hand over to the packed copy and the grain really
       arrives — so the scroll is eased into it, which spreads the change the
       eye sees evenly down the page instead of piling it into the last screen. */
    'float entDepth(){ return pow(uEntP, 0.80); }',
    'float entDens(){ return mix(-0.45, 0.42, entDepth()); }',
    'float entA(){ return mix(0.78, 1.0, entDepth()); }',
    /* THE BED'S ALPHA, shared by the stage and the seam.
       densE is the entry's density, densD the plates' disturbance. The
       thresholded copies are blended AFTER the pow threshold, always, so a
       density change adds and removes whole grains and never speckles; dp runs
       to 2, where the grain is the packed copy and the cap crosses the bed's
       own peak, because a banked ridge is denser than flat sand. The plough's
       alpha gain is applied ONLY to the part of the density the plates put
       there: the entry's own share always weighs 0.8, so the seam (which has
       no plates in it) and the stage agree exactly at the join. */
    'const float AG = 0.80;',
    'float bedA(vec4 g4, float densE, float densD, float mk, float bank){',
    '  float dens = densE + densD;',
    '  float dp = clamp(dens, 0.0, 2.0), dm = clamp(-dens, 0.0, 2.0);',
    '  float dp1 = min(dp, 1.0), dp2 = dp - dp1;',
    '  float dm1 = min(dm, 1.0), dm2 = dm - dm1;',
    '  float eP = clamp(densE, 0.0, 2.0);',
    '  float e1 = min(eP, 1.0), e2 = eP - e1;',
    '  float grain = dens >= 0.0 ? mix(mix(g4.r, g4.g, dp1), g4.a, dp2)',
    '                            : mix(g4.r, g4.b, dm1) * (1.0 - 0.92 * dm2);',
    '  float lift = 0.8 * (e1 + 0.75 * e2) + AG * ((dp1 - e1) + 0.75 * (dp2 - e2));',
    '  float cap = 0.55 + 0.12 * dp2;',
    '  return clamp(cap * grain * mk * (1.0 + lift + 0.45 * bank - 0.55 * dm1 - 0.40 * dm2), 0.0, 1.0);',
    '}',
    /* THE HEAD'S CRUMBLE. The head's last rule does not end in a line: it comes
       apart into single grains that fall away over 54 px. uShed is that rule's
       place in sy (px below the head's bottom edge), and the grains are hashed
       on BED px, so the fall carries on across the join into the corridor's own
       canvas exactly as the hero's dots fall into the home page's sand. */
    'float entShed(float sy, vec2 bq){',
    '  float dg = sy - uShed;',
    '  if (dg < -20.0 || dg > 54.0) return 0.0;',
    '  float up = smoothstep(-20.0, -2.0, dg);',
    '  float k = clamp(dg / 54.0, 0.0, 1.0);',
    '  float keep = step(dhash(floor(bq)), 0.075 * (1.0 - k) * (1.0 - k) * up);',
    '  return keep * ((0.34 * (1.0 - k) + 0.05) * up);',
    '}'
  ].join('\n');

  /* THE PUSH: how far a moving plate shoves the sand at p, as a fraction of
     its full push. A soft box (the plate's rect with logistic edges PW px wide)
     has a gradient that points straight out of every edge and turns smoothly
     round the corners; it is largest on the edge itself and fades both ways,
     out into the bed and in under the glass. Its slope stays under 1 at full
     push, so the bed is never folded over itself: grains are carried, not
     smeared. The bow (the edge facing the motion) pushes hardest, the long
     flanks part the sand to either side at 0.6 of that, and the stern barely
     pushes (0.2), which is what lets the sand close in behind. */
  var PUSH = [
    'const float PW = 32.0;',
    'vec2 pushAt(vec2 p, vec4 r, float dir){',
    '  vec2 hs = r.zw * 0.5; vec2 d = p - (r.xy + hs);',
    '  vec2 a = clamp((hs - abs(d)) / PW, -30.0, 30.0);',
    '  vec2 s = 1.0 / (1.0 + exp(-a));',
    '  vec2 g = 4.0 * vec2(s.y * s.x * (1.0 - s.x) * sign(d.x), s.x * s.y * (1.0 - s.y) * sign(d.y));',
    '  float gm = length(g);',
    '  if (gm < 1e-4) return vec2(0.0);',
    '  float bow = dot(g / gm, vec2(dir, 0.0));',
    '  return g * (0.6 + 0.4 * bow);',
    '}'
  ].join('\n');

  /* the push field: a displacement in CSS px (y down), x in RG and y in BA as
     16-bit fixed point, each in [-UMAX, UMAX] */
  var PACK = [
    'const float UMAX = 128.0;',
    'float dec16(vec2 v){ return (v.x * 65280.0 + v.y * 255.0) / 65535.0; }',
    'vec2 enc16(float x){ x = floor(clamp(x, 0.0, 1.0) * 65535.0 + 0.5); float hi = floor(x / 256.0); return vec2(hi, x - hi * 256.0) / 255.0; }',
    'vec2 decU(vec4 c){ return (vec2(dec16(c.rg), dec16(c.ba)) * 2.0 - 1.0) * UMAX; }',
    'vec4 encU(vec2 u){ u = u / (2.0 * UMAX) + 0.5; return vec4(enc16(u.x), enc16(u.y)); }'
  ].join('\n');

  /* ---------------- the FIELD: where the sand has been pushed
     One texel = FSCALE CSS px, in bed space, holding how far the sand there has
     been moved. Every frame each moving plate sets a TARGET push around itself
     (PUSHA px at full speed); the field takes it almost at once where the push
     is growing (0.03 s: a plate crossing at speed is past any one spot within
     a few frames) and goes back toward rest slowly everywhere else (1.1 s), so
     sand is shoved aside as a plate arrives and flows back in behind it.
     Nothing is ever added or taken away: the bed is only moved (Hudson,
     2026-09-19: the plough was "pushing random sand that doesn't exist"). */
  var FS_FIELD = [
    'precision highp float;',
    'uniform sampler2D uPrev; uniform vec2 uFRes; uniform float uM; uniform float uDt; uniform float uFS;',
    'uniform vec4 uR[' + NRF + ']; uniform vec4 uRV[' + NRF + ']; uniform float uNR;',
    'const float PUSHA = 56.0; const float UCAP = 80.0; const float TIN = 0.03; const float TOUT = 1.1;',
    PUSH, PACK,
    'void main(){',
    '  vec2 t = floor(gl_FragCoord.xy);',
    '  vec2 pc = vec2((t.x + 0.5) * uFS - uM, (uFRes.y - t.y - 0.5) * uFS);',   /* bed-space CSS px, y down */
    '  vec2 u = decU(texture2D(uPrev, (t + 0.5) / uFRes));',
    '  vec2 tgt = vec2(0.0);',
    '  for (int i = 0; i < ' + NRF + '; i++) {',
    '    if (float(i) >= uNR) break;',
    '    vec4 v = uRV[i];',
    '    if (v.y < 0.002) continue;',
    '    tgt += pushAt(pc, uR[i], v.z) * (PUSHA * v.y);',
    '  }',
    '  float L = length(tgt);',
    '  if (L > UCAP) tgt *= UCAP / L;',
    '  float k = dot(tgt, tgt) > dot(u, u) ? TIN : TOUT;',
    '  u += (tgt - u) * (1.0 - exp(-uDt / k));',
    '  gl_FragColor = encU(u);',
    '}'
  ].join('\n');

  /* ---------------- the SAND on the stage: the bed, where it was pushed to ---- */
  var FS_WAKE = [
    'precision highp float;',
    'uniform sampler2D uField;',
    'uniform vec2 uRes; uniform float uPx; uniform vec2 uFRes; uniform float uM;',
    'uniform vec2 uStage; uniform float uQuiet; uniform float uFS;',
    'uniform float uTf; uniform float uSeed;',
    NOISE, BEDGRAIN, ENT, PACK,
    'vec2 uAt(vec2 t){ return decU(texture2D(uField, (t + 0.5) / uFRes)); }',
    /* the field, bilinear by hand: its bytes cannot be filtered by the sampler */
    'vec2 fieldU(vec2 b){',
    '  vec2 f = vec2((b.x + uM) / uFS, (uStage.y - b.y) / uFS) - 0.5;',
    '  vec2 i = floor(f); vec2 fr = f - i;',
    '  return mix(mix(uAt(i), uAt(i + vec2(1.0, 0.0)), fr.x), mix(uAt(i + vec2(0.0, 1.0)), uAt(i + vec2(1.0, 1.0)), fr.x), fr.y);',
    '}',
    'void main(){',
    '  vec2 st = gl_FragCoord.xy * uPx;',              /* stage CSS px, y up */
    '  vec2 uv = st / uStage;',
    '  vec2 pc = vec2(st.x, uStage.y - st.y);',         /* y down: the field lives here */
    '  vec2 asp = vec2(uStage.x / uStage.y, 1.0);',
    '  float mask = 1.0 - smoothstep(0.3, 1.1, distance(uv * asp, vec2(0.5, 0.5) * asp));',
    '  float mk = 0.78 + 0.22 * (0.55 + 0.45 * mask);', /* the bed is laid evenly, whatever the flow does */
    /* the sand seen here is the sand that was pushed here: read the bed where
       it came from (the push is y down, the bed y up) */
    '  vec2 u = uQuiet > 0.5 ? vec2(0.0) : fieldU(pc);',
    '  vec2 bs = vec2(st.x + uM - u.x, st.y + u.y);',
    '  vec4 g4 = bedGrain(bs, uPx);',
    '  float sy = pc.y - uEntY;',
    '  float a = bedA(g4, entDens(), 0.0, mk, 0.0) * entA();',
    '  a = max(a, entShed(sy, bs));',
    '  gl_FragColor = vec4(vec3(a), a);',
    '}'
  ].join('\n');

  /* ---------------- the SEAM: the same bed, ABOVE the stage ----------------
     The stage is sticky and overflow:hidden, so nothing drawn inside it can
     reach the head. This canvas sits in the page directly above the stage's own
     box, its BOTTOM edge exactly on the head's bottom edge, and evaluates the
     SAME bed at the continuing coordinates and the SAME entry against the same
     descent, so the two carry one field of grain with no step and no line where
     they meet. It has its own GL context and draws itself: it used to be drawn
     through the stage's buffer and copied across with drawImage, which is a
     GPU blit in Chromium but reads the whole stage canvas back every frame in
     Firefox and Safari (Hudson, 2026-09-19: "unusable" on Firefox). */
  var FS_SEAM = [
    'precision highp float;',
    'uniform float uPx; uniform float uM; uniform vec2 uStage; uniform float uSeamH;',
    'uniform float uTf; uniform float uSeed;',
    NOISE, BEDGRAIN, ENT,
    'void main(){',
    '  vec2 st = gl_FragCoord.xy * uPx;',                 /* CSS px up from the seam canvas's bottom */
    '  vec2 pc = vec2(st.x, uSeamH - st.y);',             /* y down from the seam canvas top */
    '  float sy = -st.y;',                                /* px below the head bottom: negative here */
    '  vec2 bs = vec2(st.x + uM, uStage.y + st.y);',      /* the bed, continuing upward */
    '  vec4 g4 = bedGrain(bs, uPx);',
    '  vec2 uv = vec2(st.x / uStage.x, (uStage.y + st.y) / uStage.y);',
    '  vec2 asp = vec2(uStage.x / uStage.y, 1.0);',
    '  float mask = 1.0 - smoothstep(0.3, 1.1, distance(uv * asp, vec2(0.5, 0.5) * asp));',
    '  mask = 0.55 + 0.45 * mask;',
    '  float mk = 0.78 + 0.22 * mask;',
    /* the same bed alpha the stage draws, with no plates in it — and a surface:
       the topmost 90 px fade out, so the bed has a top rather than a cut edge
       wherever the head is taller than the canvas. */
    '  float a = bedA(g4, entDens(), 0.0, mk, 0.0) * entA() * smoothstep(0.0, 90.0, pc.y);',
    '  a = max(a, entShed(sy, bs));',
    '  gl_FragColor = vec4(vec3(a), a);',
    '}'
  ].join('\n');

  var fieldProg = null, UF = {};
  var wakeProg = null, UW = {};
  var seed = Math.random() * 100.0;
  var clockSeed = null;
  /* tests pin the weather so two builds can be compared frame for frame */
  if (window.__sandFix) { seed = window.__sandFix.seed; clockSeed = window.__sandFix.clock0; }

  function shader(g, type, src, tag) {
    var sh = g.createShader(type);
    g.shaderSource(sh, src);
    g.compileShader(sh);
    if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) {
      D.log += tag + ': ' + g.getShaderInfoLog(sh) + ' ';
      return null;
    }
    return sh;
  }
  function program(g, fsSrc, tag, names, arrays) {
    var vs = shader(g, g.VERTEX_SHADER, VS, tag + ' VS');
    var fs = shader(g, g.FRAGMENT_SHADER, fsSrc, tag + ' FS');
    if (!vs || !fs) return null;
    var p = g.createProgram();
    g.attachShader(p, vs);
    g.attachShader(p, fs);
    g.bindAttribLocation(p, 0, 'p');
    g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) { D.log += tag + ' LINK: ' + g.getProgramInfoLog(p); return null; }
    var u = {};
    names.forEach(function (n) { u[n] = g.getUniformLocation(p, n); });
    (arrays || []).forEach(function (n) { u[n] = g.getUniformLocation(p, n + '[0]'); });
    return { p: p, u: u };
  }
  /* the one full-viewport triangle every pass draws, on attribute 0 */
  function geometry(g) {
    var b = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, b);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
    g.enableVertexAttribArray(0);
    g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
  }
  if (gl) {
    var P2 = program(gl, FS_FIELD, 'field', ['uPrev', 'uFRes', 'uM', 'uDt', 'uNR', 'uFS'], ['uR', 'uRV']);
    var P3 = program(gl, FS_WAKE, 'wake', ['uField', 'uRes', 'uPx', 'uFRes', 'uM', 'uStage', 'uQuiet',
                                           'uFS', 'uShed', 'uTf', 'uSeed', 'uEntP', 'uEntY']);
    if (!P2 || !P3) { gl = null; fallback('shader-failed'); }
    else {
      fieldProg = P2.p; UF = P2.u; wakeProg = P3.p; UW = P3.u;
      geometry(gl);
      gl.useProgram(wakeProg); gl.uniform1i(UW.uField, 1);
      gl.uniform1f(UW.uFS, FSCALE); gl.uniform1f(UW.uSeed, seed);
      gl.useProgram(fieldProg); gl.uniform1i(UF.uPrev, 1); gl.uniform1f(UF.uFS, FSCALE);
      D.mode = 'webgl';
    }
  }

  /* ---------------- the two field buffers, and the stage's pattern ---------------- */
  var fieldTex = [null, null], fieldFbo = [null, null], fieldCur = 0, fw = 0, fh = 0;
  var MARGIN = 0;                         /* CSS px of bed either side of the stage */
  var bedW = 0, bedH = 0;                 /* the bed's nominal extent */
  var stageW = 0, stageH = 0;
  function makeTex(w, h, filter) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  }
  function makeFbo(tex) {
    var f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) D.log += 'fbo incomplete ';
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return f;
  }
  function clearField() {
    if (!fieldFbo[0]) return;
    gl.clearColor(128 / 255, 0, 128 / 255, 0);      /* h = 1 (the bed level), exactly */
    for (var k = 0; k < 2; k++) { gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFbo[k]); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
  }
  function ensureTextures() {
    if (!gl) return;
    var W = stageW, H = stageH;
    /* room either side of the stage so a ridge banked at the edge of the
       screen is still inside the buffer that remembers it */
    var m = Math.max(110, Math.min(240, Math.round(W * 0.18))) + 24;
    m = Math.ceil(m * dpr) / dpr;                    /* a whole number of device px: the bed stays texel-aligned */
    var bw = Math.round((W + 2 * m) * dpr), bh = canvas.height + Math.round(SEAM_MAX * dpr);
    var nfw = Math.ceil((W + 2 * m) / FSCALE), nfh = Math.ceil(H / FSCALE);
    if (fieldTex[0] && bw === bedW && bh === bedH && nfw === fw && nfh === fh && m === MARGIN) return;
    MARGIN = m;
    bedW = bw; bedH = bh;
    for (var k = 0; k < 2; k++) {
      if (fieldTex[k]) { gl.deleteTexture(fieldTex[k]); gl.deleteFramebuffer(fieldFbo[k]); }
      fieldTex[k] = makeTex(nfw, nfh, gl.NEAREST);
      fieldFbo[k] = makeFbo(fieldTex[k]);
    }
    fw = nfw; fh = nfh;
    clearField();
    pushStatic();
    seamKey = '';
  }

  /* every uniform that only moves when the box or the textures do */
  function pushStatic() {
    if (!gl || !fieldTex[0]) return;
    gl.useProgram(wakeProg);
    gl.uniform2f(UW.uRes, canvas.width, canvas.height);
    gl.uniform1f(UW.uPx, 1 / dpr);
    gl.uniform2f(UW.uFRes, fw, fh);
    gl.uniform1f(UW.uM, MARGIN);
    gl.uniform2f(UW.uStage, stageW, stageH);
    gl.useProgram(fieldProg);
    gl.uniform2f(UF.uFRes, fw, fh);
    gl.uniform1f(UF.uM, MARGIN);
    if (sgl) {
      sgl.useProgram(seamProg);
      sgl.uniform1f(US.uPx, 1 / dpr);
      sgl.uniform1f(US.uM, MARGIN);
      sgl.uniform2f(US.uStage, stageW, stageH);
    }
  }

  /* ---------------- sizing: the stage's own box ---------------- */
  var dpr = 1;
  function resize() {
    if (!gl) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var r = stage.getBoundingClientRect();
    var w = Math.max(2, Math.floor(r.width * dpr));
    var h = Math.max(2, Math.floor(r.height * dpr));
    stageW = w / dpr; stageH = h / dpr;
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    if (fieldTex[0]) ensureTextures();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
  if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(stage);

  /* ---------------- the seam canvas ---------------- */
  var projSec = document.getElementById('projects') || sec.parentNode;
  var seamCv = document.createElement('canvas');
  seamCv.id = 'proj-seam';
  seamCv.setAttribute('aria-hidden', 'true');
  seamCv.style.cssText = 'position:absolute;left:0;top:0;z-index:0;pointer-events:none;display:none;opacity:' + OPACITY.toFixed(3);
  if (projSec) projSec.insertBefore(seamCv, projSec.firstChild);
  var seamKey = '', seamWpx = 0, seamHpx = 0, seamH = 0, ruleY = 0;
  /* the seam's own context: it draws its bed itself, nothing is copied across */
  var sgl = null, seamProg = null, US = {};
  if (gl) {
    sgl = seamCv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false,
                                       depth: false, stencil: false, preserveDrawingBuffer: false });
    var S2 = sgl && program(sgl, FS_SEAM, 'seam', ['uPx', 'uM', 'uStage', 'uSeamH', 'uShed', 'uTf', 'uSeed',
                                                   'uEntP', 'uEntY']);
    if (!S2) { sgl = null; D.log += 'seam: no context '; }
    else {
      seamProg = S2.p; US = S2.u;
      geometry(sgl);
      sgl.useProgram(seamProg); sgl.uniform1f(US.uSeed, seed);
      seamCv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); });
      seamCv.addEventListener('webglcontextrestored', function () { location.reload(); });
    }
  }

  /* the head's LAST rule, wherever it lands: that is where the crumble starts */
  function collectHead(sr) {
    var els = [];
    var band = document.querySelector('.proj-band');
    var title = document.getElementById('proj-title');
    if (band && band.offsetParent) els.push(band);
    if (title && title.offsetParent) els.push(title);
    var lis = document.querySelectorAll('#proj-index li');
    for (var i = 0; i < lis.length; i++) els.push(lis[i]);
    var lowest = -1e9;
    for (var k = 0; k < els.length; k++) {
      var r = els[k].getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      lowest = Math.max(lowest, (r.bottom - sr.top) + seamH);
    }
    ruleY = lowest > -1e8 ? lowest : seamH;
  }

  /* is the seam canvas anywhere on the screen this frame? Its bottom edge is
     the head's bottom edge, which is the showcase's own top. */
  function seamVisible(secTop) { return secTop > -2 && secTop - seamH < window.innerHeight; }

  function layoutSeam(force) {
    if (!gl || !sgl || !fieldTex[0]) return false;
    var sr = sec.getBoundingClientRect();
    var pr = projSec.getBoundingClientRect();
    var str = stage.getBoundingClientRect();
    var room = Math.floor(sr.top - pr.top);
    headRoom = room;
    /* the WHOLE head, capped: the bed has to reach the top of the projects
       content, or the descent starts at an edge partway down the page */
    var want = Math.min(SEAM_MAX, room);
    if (want < 48 || str.width < 8) {
      if (seamCv.style.display !== 'none') { seamCv.style.display = 'none'; seamKey = ''; }
      return false;
    }
    var key = [Math.round(str.width), Math.round(str.height), Math.round(sr.top - pr.top),
               Math.round(str.left - pr.left), want].join('|');
    if (key === seamKey && !force) {
      /* the box is where it was; the DESCENT and the bed's own clock still
         move, so keep the surface in step with the stage's shader */
      if (seamVisible(sr.top)) renderSeam();
      return false;
    }
    seamKey = key;
    seamH = want;
    seamCv.style.display = 'block';
    seamCv.style.left = Math.round(str.left - pr.left) + 'px';
    seamCv.style.top = Math.round(sr.top - pr.top - seamH) + 'px';
    seamCv.style.width = Math.round(str.width) + 'px';
    seamCv.style.height = seamH + 'px';
    var nw = Math.max(2, Math.round(str.width * dpr)), nh = Math.max(2, Math.round(seamH * dpr));
    if (nw !== seamWpx || nh !== seamHpx) {
      seamWpx = nw; seamHpx = nh;
      seamCv.width = nw; seamCv.height = nh;
    }
    collectHead(sr);
    renderSeam();
    return true;
  }

  /* the seam's bed, straight into its own buffer */
  function renderSeam() {
    if (!sgl || !seamWpx) return;
    sgl.viewport(0, 0, seamWpx, seamHpx);
    sgl.useProgram(seamProg);
    sgl.uniform1f(US.uTf, grainClock());
    sgl.uniform1f(US.uSeamH, seamH);
    sgl.uniform1f(US.uShed, ruleY - seamH);      /* the rule, in the shared sy */
    sgl.uniform1f(US.uEntP, entP);
    sgl.uniform1f(US.uEntY, 0);
    sgl.drawArrays(sgl.TRIANGLES, 0, 3);
    D.seamRenders++;
  }

  /* ---------------- per-slide state (CPU side) ---------------- */
  var rectData = new Float32Array(NR * 4);
  var rvData = new Float32Array(NR * 4);
  var fRect = new Float32Array(NRF * 4);        /* the field's rects: only the ones actually moving */
  var fRV = new Float32Array(NRF * 4);
  var nF = 0;
  /* one subarray view per length, made once: uniform4fv on a 12-slot array
     uploaded 48 floats a frame to say three things. These upload exactly what
     there is and allocate nothing while the corridor runs. */
  var VIEW = {};
  function view(arr, n) {
    var key = n * 4;
    var m = VIEW[key] || (VIEW[key] = {});
    return m[arr.__id] || (m[arr.__id] = arr.subarray(0, n * 4));
  }
  rectData.__id = 'r'; rvData.__id = 'v'; fRect.__id = 'f'; fRV.__id = 'g';
  var slideState = {};                     /* i -> { vX } */
  var lastT = -1, lastDt = 1 / 60;
  var nRects = 0;
  /* the bed clock's ORIGIN: the corridor's own second hand is added to it every
     frame, so the page picks one weather to start from and then runs. */
  var clock0 = clockSeed !== null ? clockSeed : Math.random() * 1000;
  var edgeCut = -1;                        /* how far the cards' CSS edge is currently pulled back */
  /* the card's own edge, while its sand is being moved. The 1 px CSS edge is a
     23 level step against a bed the whole plough moves by 2 levels: it was the
     strongest thing anywhere near a moving plate, which is why the edge read
     and the bed did not. It steps back in proportion to the plate's speed and
     comes straight back the moment the plate stops. */
  var EDGE = 0.78;

  function stateFor(i) { return slideState[i] || (slideState[i] = { vX: 0 }); }

  /* one corridor frame -> the CPU arrays and the uniforms */
  function ingest(fr) {
    var t = fr.t;
    var dt = lastT < 0 ? 1 / 60 : Math.max(0.001, Math.min(0.1, t - lastT));
    lastT = t; lastDt = dt;
    var W = fr.stage.w, H = fr.stage.h;
    var n = 0;
    var seen = {};
    var sMax = 0, rMax = 0;
    for (var s = 0; s < fr.slides.length; s++) {
      var sl = fr.slides[s];
      var st = stateFor(sl.i);
      seen[sl.i] = true;
      /* velocity, signed, low-passed: fast attack (0.10 s), slow release
         (0.5 s), so the wake lingers a little after the scroll stops and a
         reversal passes through zero instead of flipping */
      var v = sl.vel;
      var tau = Math.abs(v) > Math.abs(st.vX) ? 0.10 : 0.5;
      st.vX += (v - st.vX) * (1 - Math.exp(-dt / tau));
      var speed01 = Math.min(1, Math.abs(st.vX) / VREF);
      var dir = st.vX < 0 ? -1 : 1;
      if (speed01 > sMax) sMax = speed01;
      var raw01 = Math.min(1, Math.abs(v) / VREF);
      if (raw01 > rMax) rMax = raw01;
      var r = sl.rect;
      if (r.w < 4 || r.h < 4) continue;
      if (r.x + r.w < -80 || r.x > W + 80 || r.y + r.h < -80 || r.y > H + 80) continue;
      if (n >= NR) continue;
      rectData[n * 4] = r.x; rectData[n * 4 + 1] = r.y; rectData[n * 4 + 2] = r.w; rectData[n * 4 + 3] = r.h;
      rvData[n * 4] = st.vX; rvData[n * 4 + 1] = speed01; rvData[n * 4 + 2] = dir; rvData[n * 4 + 3] = 0;
      n++;
    }
    for (var key in slideState) if (!seen[key]) slideState[key].vX = 0;
    nRects = n;

    /* THE FIELD'S OWN LIST. A plate that is not moving writes nothing into the
       field, so handing the field pass twelve slots to iterate when two plates
       are actually ploughing is work for nothing. */
    nF = 0;
    for (var a = 0; a < n && nF < NRF; a++) {
      if (rvData[a * 4 + 1] < 0.002) continue;
      fRect[nF * 4] = rectData[a * 4]; fRect[nF * 4 + 1] = rectData[a * 4 + 1];
      fRect[nF * 4 + 2] = rectData[a * 4 + 2]; fRect[nF * 4 + 3] = rectData[a * 4 + 3];
      fRV[nF * 4] = rvData[a * 4]; fRV[nF * 4 + 1] = rvData[a * 4 + 1];
      fRV[nF * 4 + 2] = rvData[a * 4 + 2]; fRV[nF * 4 + 3] = rvData[a * 4 + 3];
      nF++;
    }
    /* the rest clock, on the RAW velocity: the smoothed one has a 0.5 s release
       and would push the freeze past six seconds. What matters is that the
       scroll has stopped. */
    if (rMax > 0.004 || Math.abs(fr.vel) > 4) restT = 0; else restT += dt;

    var wantE = Math.round(sMax * EDGE * 100) / 100;
    if (wantE !== edgeCut) { edgeCut = wantE; stage.style.setProperty('--plough', String(wantE)); }

    D.rects = n;
    /* the head's bottom edge, in stage px: 0 while the stage still sits under
       the head, negative once it is stuck and the head has gone. One rect off a
       layout the corridor has already forced this frame. */
    if (gl) {
      var secTop = sec.getBoundingClientRect().top;
      divY = secTop - fr.stage.top;
      /* THE DESCENT: 0 at the top of the projects content, 1 the moment the
         corridor takes the page over — the head's own height, measured. */
      var span = Math.max(240, secTop + window.pageYOffset);
      entP = REDUCED ? 1 : Math.max(0, Math.min(1, window.pageYOffset / span));
      if (secTop > -window.innerHeight) layoutSeam(false);
    }
  }

  /* one field step: prev -> next, then swap */
  function stepField(dt) {
    var nxt = 1 - fieldCur;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFbo[nxt]);
    gl.viewport(0, 0, fw, fh);
    gl.useProgram(fieldProg);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fieldTex[fieldCur]);
    gl.uniform1f(UF.uDt, dt);
    if (nF) { gl.uniform4fv(UF.uR, view(fRect, nF)); gl.uniform4fv(UF.uRV, view(fRV, nF)); }
    gl.uniform1f(UF.uNR, nF);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    fieldCur = nxt;
    D.steps++;
  }

  /* THE BED'S CLOCK: the corridor's own second hand, in seconds, at TIME_SCALE
     1 — the home page's rate exactly, and like the home page it is not gated on
     prefers-reduced-motion (ambient background texture, not parallax). */
  function grainClock() { return (latest ? latest.t : performance.now() / 1000) + clock0; }

  function drawWake(quiet) {
    gl.useProgram(wakeProg);
    gl.uniform1f(UW.uTf, grainClock());
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fieldTex[fieldCur]);
    gl.uniform1f(UW.uQuiet, quiet ? 1 : 0);
    gl.uniform1f(UW.uEntP, entP);
    gl.uniform1f(UW.uEntY, divY);
    gl.uniform1f(UW.uShed, ruleY - seamH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function draw(step) {
    if (!gl || !latest) return;
    ensureTextures();
    /* THE REST FREEZE. Standing still, every field step computes the same
       settled field again, forever. Once the corridor has been still for
       FIELD_REST the field has relaxed and the step stops; the next frame with
       any velocity in it starts it again, because restT is zeroed in ingest. */
    if (step !== false && restT < FIELD_REST) stepField(lastDt);
    drawWake(false);
    D.frames++;
  }

  /* the corridor calls this once per frame, after it has placed the slides */
  window.__corridorFrameCb = function (fr) {
    latest = fr;
    /* the corridor has already measured the stage this frame: use its numbers
       rather than a getBoundingClientRect for a box that only changes on resize */
    if (Math.abs(fr.stage.w - stageW) > 0.6 || Math.abs(fr.stage.h - stageH) > 0.6) resize();
    ingest(fr);
    if (!gl) return;
    /* nothing to see while the stage is off screen (above the head, below the exit) */
    if (fr.stage.top > window.innerHeight || fr.stage.top + fr.stage.h < 0) return;
    draw(true);
  };

  if (gl) { resize(); ensureTextures(); }
  else fallbackPaint();

  /* ---------------- diagnostics (read-only; the tests read pixels through these) ---- */
  function readRegion(x, y, w, h, g, cv) {
    /* region in the canvas's CSS px, y down -> device px, GL y up */
    g = g || gl; cv = cv || canvas;
    var X = Math.max(0, Math.round(x * dpr)), Yt = Math.max(0, Math.round(y * dpr));
    var Wd = Math.min(cv.width - X, Math.round(w * dpr)), Hd = Math.min(cv.height - Yt, Math.round(h * dpr));
    if (Wd <= 0 || Hd <= 0) return null;
    var buf = new Uint8Array(Wd * Hd * 4);
    g.readPixels(X, cv.height - (Yt + Hd), Wd, Hd, g.RGBA, g.UNSIGNED_BYTE, buf);
    var out = new Uint8Array(Wd * Hd);
    for (var row = 0; row < Hd; row++) {
      var src = (Hd - 1 - row) * Wd;
      for (var col = 0; col < Wd; col++) out[row * Wd + col] = buf[(src + col) * 4 + 3];
    }
    return { w: Wd, h: Hd, dpr: dpr, a: out };
  }
  window.__projSand = {
    canvas: canvas,
    seamCanvas: seamCv,
    diag: D,
    frames: function () { return D.frames; },
    clock: function () { return +grainClock().toFixed(4); },
    state: function () {
      return { entP: +entP.toFixed(4), headRoom: headRoom, seamH: seamH, seam: sgl ? 'own-gl' : 'none',
               rest: +restT.toFixed(2), steps: D.steps, rects: nRects, reduced: REDUCED,
               field: [fw, fh], bed: [bedW, bedH], opacity: OPACITY };
    },
    /* GPU cost of one stage frame (and of the seam), timed over n back-to-back
       draws closed by a 1 px read: for measuring, never called by the page */
    bench: function (n) {
      if (!gl || !latest) return null;
      var px = new Uint8Array(4), out = {};
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      var t0 = performance.now();
      for (var i = 0; i < n; i++) drawWake(false);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      out.stage = +((performance.now() - t0) / n).toFixed(3);
      if (sgl && seamWpx) {
        sgl.readPixels(0, 0, 1, 1, sgl.RGBA, sgl.UNSIGNED_BYTE, px);
        t0 = performance.now();
        for (i = 0; i < n; i++) renderSeam();
        sgl.readPixels(0, 0, 1, 1, sgl.RGBA, sgl.UNSIGNED_BYTE, px);
        out.seam = +((performance.now() - t0) / n).toFixed(3);
      }
      return out;
    },
    /* how far the sand at one stage point (CSS px, y down) has been pushed */
    push: function (x, y) {
      if (!gl || !fieldFbo[fieldCur]) return null;
      var tx = Math.max(0, Math.min(fw - 1, Math.floor((x + MARGIN) / FSCALE)));
      var ty = Math.max(0, Math.min(fh - 1, Math.floor(fh - y / FSCALE)));
      var px = new Uint8Array(4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFbo[fieldCur]);
      gl.readPixels(tx, ty, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      function dec(hi, lo) { return ((hi * 256 + lo) / 65535 * 2 - 1) * 128; }
      return [+dec(px[0], px[1]).toFixed(2), +dec(px[2], px[3]).toFixed(2)];
    },
    /* the push field, decoded: every step-th texel as [x, y, ux, uy] in stage
       CSS px (y down), for measuring how far and where the sand was moved */
    field: function (step) {
      if (!gl || !fieldFbo[fieldCur]) return null;
      step = step || 4;
      var buf = new Uint8Array(fw * fh * 4), out = [];
      gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFbo[fieldCur]);
      gl.readPixels(0, 0, fw, fh, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      function dec(hi, lo) { return ((hi * 256 + lo) / 65535 * 2 - 1) * 128; }
      for (var ty = 0; ty < fh; ty += step) for (var tx = 0; tx < fw; tx += step) {
        var o = (ty * fw + tx) * 4;
        out.push([(tx + 0.5) * FSCALE - MARGIN, (fh - ty - 0.5) * FSCALE,
                  +dec(buf[o], buf[o + 1]).toFixed(2), +dec(buf[o + 2], buf[o + 3]).toFixed(2)]);
      }
      return out;
    },
    /* the alpha plane of a region of the stage canvas, row 0 = top */
    pixels: function (x, y, w, h) { return gl ? readRegion(x, y, w, h) : null; },
    /* the same for the seam canvas (CSS px from its top), drawn fresh: its
       buffer is not kept between frames */
    seamPixels: function (x, y, w, h) {
      if (!sgl || !seamWpx) return null;
      renderSeam();
      return readRegion(x, y, w, h, sgl, seamCv);
    },
    /* and the same pixels with no plates and no field in them: the untouched
       bed at exactly this moment, which is what a disturbance is measured
       against now that the bed itself moves */
    bed: function (x, y, w, h) {
      if (!gl || !latest) return null;
      drawWake(true);
      var p = readRegion(x, y, w, h);
      drawWake(false);
      return p;
    }
  };

  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); D.mode = 'context-lost'; });
  /* Without this the bed stayed blank for the rest of the visit (pre-deploy
     review CF-4). Same answer as sand.js: the simplest correct rebuild of
     every GL object is a reload, and a restore is rare (GPU reset, sleep). */
  canvas.addEventListener('webglcontextrestored', function () { D.mode = 'context-restored'; location.reload(); });
})();
