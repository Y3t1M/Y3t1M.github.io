#!/usr/bin/env node
/* Cross-browser test pass for hudsontinch.com.

   One file: the instrumentation it injects into the TEST browser, the checks,
   and the result data. It reads the site and never edits it.

   env:
     BASE_URL   site to test            (default https://hudsontinch.com)
     BROWSERS   chrome,chromium,firefox,webkit
     OUT        output directory        (default ./results)
     OS_LABEL   mac | windows           (default from the platform)
     ONLY       subset of groups: pages,fonts,visuals,interactions,flicker,pacing
     LOCAL_PATHS=1  the server has no clean URLs (python http.server): use .html paths
*/
'use strict';
const { chromium, firefox, webkit, devices } = require('playwright');
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const BASE = (process.env.BASE_URL || 'https://hudsontinch.com').replace(/\/$/, '');
const BROWSERS = (process.env.BROWSERS || 'chrome,firefox').split(',').map((s) => s.trim()).filter(Boolean);
const OS_LABEL = process.env.OS_LABEL || ({ darwin: 'mac', win32: 'windows', linux: 'linux' }[process.platform] || process.platform);
const OUT = path.resolve(process.env.OUT || 'results');
const ONLY = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const LOCAL = process.env.LOCAL_PATHS === '1' || !/^https:/.test(BASE);
const HEADED = process.env.HEADED === '1';

const PAGES = [
  { id: 'home', clean: '/', file: '/index.html' },
  { id: 'projects', clean: '/projects', file: '/projects.html' },
  { id: 'resume', clean: '/resume', file: '/resume.html' },
  { id: '404', clean: '/404', file: '/404.html' },
  { id: 'desktop', clean: '/desktop', file: '/desktop.html' },
  { id: 'mac', clean: '/mac', file: '/mac.html' },
  { id: 'neatfreak', clean: '/demos/neatfreak', file: '/demos/neatfreak.html' },
  { id: 'rh-agentic', clean: '/demos/rh-agentic', file: '/demos/rh-agentic.html' },
];
let ACTIVE_BASE = BASE, ACTIVE_LOCAL = LOCAL;
const urlOf = (id) => { const p = PAGES.find((x) => x.id === id); return ACTIVE_BASE + (ACTIVE_LOCAL ? p.file : p.clean); };

const VIEWPORTS = [
  { id: '1440x900', width: 1440, height: 900, mobile: false },
  { id: '1280x720', width: 1280, height: 720, mobile: false },
  { id: '390x844', width: 390, height: 844, mobile: true },
];

/* Requests the site does not own. On this Mac the DNS resolver blocks the
   Cloudflare analytics beacon, which shows up as console noise; it is listed
   separately and is never counted as a site defect. */
const THIRD_PARTY = /cloudflareinsights|\/cdn-cgi\/rum/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* image helpers                                                       */
/* ------------------------------------------------------------------ */
function diffPng(a, b, thr) {
  thr = thr == null ? 8 : thr;
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { sameSize: false, a: A.width + 'x' + A.height, b: B.width + 'x' + B.height };
  const n = A.width * A.height;
  let changed = 0, sum = 0, max = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const d = Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2]));
    if (d > thr) changed++;
    sum += d;
    if (d > max) max = d;
  }
  return { sameSize: true, changedPct: +(100 * changed / n).toFixed(3), mean: +(sum / n).toFixed(3), max: max };
}
function gridDiff(a, b) {
  if (!a || !b) return null;
  if (a.cols !== b.cols || a.rows !== b.rows) return { sameGeometry: false, a: a.cols + 'x' + a.rows, b: b.cols + 'x' + b.rows, litA: a.lit.length, litB: b.lit.length };
  const sa = new Set(a.lit), sb = new Set(b.lit);
  let onlyA = 0, onlyB = 0;
  for (const v of sa) if (!sb.has(v)) onlyA++;
  for (const v of sb) if (!sa.has(v)) onlyB++;
  return { sameGeometry: true, litA: a.lit.length, litB: b.lit.length, onlyA: onlyA, onlyB: onlyB, changed: onlyA + onlyB };
}

/* ------------------------------------------------------------------ */
/* the candidate fix: file(s) served in place of the live ones, in the   */
/* test browser only. Either local files (CANDIDATE_LOCAL=a.js,b.js) or   */
/* line edits against a known live file (EMBEDDED_CANDIDATE, written by   */
/* make-candidate.js), checked by sha-256 before and after.               */
/* ------------------------------------------------------------------ */
const crypto = require('crypto');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const EMBEDDED_CANDIDATE = {"label":"flicker-fix 5c97dc2","commit":"5c97dc2271776555fb2e0d257ab574fefc413891","base":"67986333906e17ba22ecf236e28cba46ebee07b0","files":[{"name":"projects-marquee.js","base":"a2b73b01104c177ac55872a6e15c9fba7959ebfc004de44436d06283f46d3b9f","result":"16df685e72a3561696029724cdf470ff03d32c124242e4fac0cc205c23e8f292","edits":[{"at":44,"del":0,"add":["  /* THE FACE. The word is rasterised from the site's own face, so it waits","     for it. Built before Site Sans had loaded, it came out in the fallback","     (Segoe UI on Windows) and was built again a moment later in the real","     face: the word changed shape as you arrived. The plain word is hidden","     from first paint (html.js), so waiting simply leaves the title empty a","     moment longer, then it arrives once, whole. A face that is slow to come","     is waited for WAIT_MS at most: the fallback is drawn then, and replaced","     when the face lands (it is part of the build key). */","  var WAIT_MS = 1500;","  function faceIn(weight) {","    try { return !document.fonts || document.fonts.check(weight + ' 100px ' + SANS, WORD); } catch (e) { return true; }","  }","  var cut0 = window.matchMedia('(max-width: 700px)').matches ? '900' : '750';","  var waiting = !faceIn(cut0) && !!document.fonts.load;","  function faceReady() { waiting = false; remeasure(); }","  if (waiting) {","    document.fonts.load(cut0 + ' 100px ' + SANS, WORD).then(faceReady, faceReady);","    setTimeout(faceReady, WAIT_MS);","  }",""]},{"at":105,"del":4,"add":[]},{"at":129,"del":0,"add":["    /* Rebuilt only when what the word is drawn from has changed: the box, the","       size, the screen's pixels, the cut, or the site face arriving. A rebuild","       resets the canvas, and rebuilding for nothing (on the window's load, and","       on fonts.ready long after the face was in) was an empty title for a","       frame or two on every arrival (Hudson, 2026-09-30: \"the projects text","       does this weird flicker jitter\"). */","    var dpr = window.devicePixelRatio || 1;","    var key = W + 'x' + H + ':' + fs.toFixed(1) + ':' + dpr + ':' + WEIGHT + ':' + faceIn(WEIGHT);","    if (key === lastKey) return false;"]},{"at":190,"del":0,"add":["    lastKey = key;                        /* only once built: a build that threw is tried again */","    return true;"]},{"at":246,"del":0,"add":["  /* The shimmer's own clock. It runs only while frames are drawn, so a tab","     that was hidden, or a head scrolled away and back, carries on from the","     frame it left instead of every dot jumping to a new brightness at once. */","  var clock = 0, prevTs = -1;"]},{"at":248,"del":1,"add":["    if (!onScreen || document.hidden) { prevTs = -1; return; }"]},{"at":250,"del":1,"add":["    /* a rebuild clears the canvas, so it is always drawn in the same frame:","       the ~24 fps throttle below used to skip that frame and show it empty */","    if (dirty && !waiting) { dirty = false; if (build()) last = -1; }","    if (prevTs >= 0) clock += Math.min(0.1, (ts - prevTs) / 1000);","    prevTs = ts;"]},{"at":254,"del":1,"add":["    draw(clock);"]},{"at":257,"del":1,"add":["  function remeasure() { dirty = true; wake(); }"]},{"at":272,"del":1,"add":["    remeasure: function () { lastKey = ''; dirty = false; build(); draw(clock); wake(); },"]}]},{"name":"transitions.js","base":"26a9ee6591aa503b4d070da1ecef8688ecc3c3e302ebb0787c181c07664b5340","result":"d285616bba8618aea852ba1264257818e00e84c321d86926b7676d7d953ca4d1","edits":[{"at":57,"del":0,"add":["  /* The sweep runs as compositor animations of transform, not as a frame","     loop. The arriving page is at its busiest while it plays (every script,","     the WebGL contexts, the title's first build), and a loop on the main","     thread stalled with it: the rule jumped down the screen in steps, and","     where a stall outlasted the 800 ms it finished unseen (Hudson,","     2026-09-30: \"the scan line on the page transition is choppy on mac and","     also just straight up not there on windows versions of firefox\"). Only","     the readout beside the rule is text, so only it waits for the main","     thread: a stall pauses the numbers, never the rule. */","  var EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';         /* 1 - (1 - p)^3, the curve the loop drew */","  function ride(el, to, ms) {","    return el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + to + ')' }],","                      { duration: ms, easing: EASE, fill: 'forwards' });","  }","  function readout(tag, anim, H, ms) {","    (function tick() {","      var p = Math.min(1, Math.max(0, (anim.currentTime || 0) / ms));","      tag.textContent = 'Y ' + String(Math.round((1 - Math.pow(1 - p, 3)) * H)).padStart(4, '0');","      if (p < 1 && tag.isConnected) requestAnimationFrame(tick);","    })();","  }"]},{"at":64,"del":12,"add":["    function done() { if (line.parentNode) line.remove(); }","    if (!line.animate) { done(); return; }","    var a = ride(line, H + 'px', ms);","    readout(tag, a, H, ms);","    a.finished.then(done, done);","    a.ready.then(function () { setTimeout(done, ms + 600); });","    setTimeout(done, ms + 4000);"]},{"at":110,"del":1,"add":[]},{"at":115,"del":12,"add":["    if (!cover.animate) { cleanup(); return; }","    /* The cover is one flat colour, so sliding it down uncovers the page","       exactly as clipping its top did, and a transform stays on the","       compositor where clip-path needs the main thread every frame. It","       starts on the page's first frame, as the loop did: started any","       earlier, its clock ran while the page was still being built and the","       first frame shown already had the rule a quarter of the way down. */","    requestAnimationFrame(function () {","      var a = ride(cover, '100%', IN_MS);","      ride(line, H + 'px', IN_MS);","      readout(tag, a, H, IN_MS);","      a.finished.then(cleanup, cleanup);","      /* dead-man: never a stuck cover, timed from when the sweep really began */","      a.ready.then(function () { setTimeout(cleanup, IN_MS + 800); });","    });","    setTimeout(cleanup, IN_MS + 4000);"]}]}]}; /* the flicker-fix commit, as line edits against the live files */
function loadCandidate() {
  if (process.env.CANDIDATE_OFF === '1') return null;
  if (process.env.CANDIDATE_LOCAL) {
    return { label: process.env.CANDIDATE_LABEL || 'local files', commit: process.env.CANDIDATE_COMMIT || null,
             files: process.env.CANDIDATE_LOCAL.split(',').map((f) => ({ name: path.basename(f), local: path.resolve(f), result: sha256(fs.readFileSync(f, 'utf8')) })) };
  }
  return EMBEDDED_CANDIDATE;
}
const CANDIDATE = loadCandidate();
function applyEdits(text, f) {
  const have = sha256(text);
  if (have !== f.base) throw new Error('the live ' + f.name + ' is not the file the fix was made against (sha ' + have.slice(0, 12) + ', expected ' + f.base.slice(0, 12) + ')');
  const lines = text.split('\n');
  const edits = f.edits.slice().sort((a, b) => b.at - a.at);          /* bottom up, so line numbers hold */
  for (const e of edits) lines.splice.apply(lines, [e.at, e.del].concat(e.add));
  const out = lines.join('\n');
  if (sha256(out) !== f.result) throw new Error('the patched ' + f.name + ' is not the committed fix (sha ' + sha256(out).slice(0, 12) + ')');
  return out;
}
/* A local proxy in front of the site. The A/B runs the flicker checks twice through
   it, once passing the live files through untouched (control) and once with the fix
   put in their place, so both halves are served the same way and differ only in the
   file(s) under test. Redirects are kept on the proxy, caching headers pass through. */
const http = require('http');
async function startProxy(upstream, substitute) {
  const info = { upstream: upstream, substituting: !!substitute, label: substitute ? substitute.label : 'control: live files passed through',
                 commit: substitute ? (substitute.commit || null) : null, expected: {}, served: {}, errors: [], requests: 0 };
  if (substitute) substitute.files.forEach((f) => { info.expected[f.name] = f.result; });
  let origin = '';
  const server = http.createServer(async (req, res) => {
    info.requests++;
    try {
      const target = upstream + req.url;
      const r = await fetch(target, { redirect: 'manual', headers: {
        'user-agent': req.headers['user-agent'] || 'qa', accept: req.headers.accept || '*/*',
        'accept-language': req.headers['accept-language'] || 'en-US' } });
      const headers = {};
      r.headers.forEach((v, k) => { if (!/^(content-encoding|content-length|transfer-encoding|connection|keep-alive|alt-svc|strict-transport-security|report-to|nel|set-cookie)$/i.test(k)) headers[k] = v; });
      if (headers.location) headers.location = headers.location.split(upstream).join(origin);
      let body = Buffer.from(await r.arrayBuffer());
      const name = path.basename(new URL(target).pathname);
      const f = substitute && r.status === 200 ? substitute.files.find((x) => x.name === name) : null;
      if (f) {
        try {
          const text = f.local ? fs.readFileSync(f.local, 'utf8') : applyEdits(body.toString('utf8'), f);
          body = Buffer.from(text, 'utf8');
          info.served[f.name] = sha256(text);
        } catch (e) { if (info.errors.length < 10) info.errors.push(String((e && e.message) || e).slice(0, 300)); }
      } else if (!substitute && /\.js$/.test(name) && r.status === 200) {
        info.served[name] = sha256(body.toString('utf8'));
      }
      res.writeHead(r.status, headers);
      res.end(body);
    } catch (e) {
      if (info.errors.length < 10) info.errors.push('proxy: ' + String((e && e.message) || e).slice(0, 200));
      res.writeHead(502); res.end('proxy error');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  origin = 'http://127.0.0.1:' + server.address().port;
  return { origin: origin, info: info, close: () => new Promise((r) => server.close(() => r())) };
}

/* ------------------------------------------------------------------ */
/* instrumentation: runs inside the test browser before any page script */
/* ------------------------------------------------------------------ */
function instrumentation() {
  if (window.__qa || window.top !== window) return;
  const perfNow = performance.now.bind(performance);
  const t = () => Math.round(perfNow() * 10) / 10;
  const LOG = [];
  const MAXLOG = 8000;
  let frameNo = 0;
  function push(k, d) {
    if (LOG.length < MAXLOG) LOG.push(Object.assign({ t: t(), f: frameNo, k: k }, d || {}));
  }
  /* window.name survives a same-tab navigation: the test sets it on the page
     it leaves to ask for a frame-by-frame capture of the title on arrival */
  let CAPTURE = false;
  try { CAPTURE = /qa-capture/.test(window.name || ''); } catch (e) { /* no access */ }
  const FRAMES = [];

  /* ---------------- canvases ---------------- */
  const recs = [];
  const REC = Symbol('qaRec');
  function srcOf() {
    try {
      const st = String(new Error().stack || '').split('\n');
      for (let i = 0; i < st.length; i++) {
        const m = /https?:\/\/[^\s)]*\/([\w.-]+\.js)(?:\?[^:\s)]*)?:(\d+)/.exec(st[i]);
        if (m) return m[1] + ':' + m[2];
      }
    } catch (e) { /* no stack */ }
    return '';
  }
  function recOf(canvas) {
    let r = canvas[REC];
    if (!r) {
      r = { n: recs.length + 1, el: canvas, type: '', src: '', blank: true, everDrawn: false, touched: false,
            ops: 0, clears: 0, resets: 0, reads: 0, texts: 0,
            blankFrames: 0, blankSpans: 0, inBlank: false, blankStart: 0 };
      try { canvas[REC] = r; } catch (e) { /* frozen */ }
      recs.push(r);
    }
    return r;
  }
  function nameOf(r) {
    const c = r.el;
    let base = '';
    try { base = c.id ? '#' + c.id : (c.className ? '.' + String(c.className).split(' ')[0] : 'offscreen' + r.n); }
    catch (e) { base = 'canvas' + r.n; }
    return base + (r.src ? '@' + r.src : '');
  }

  const CP = HTMLCanvasElement.prototype;
  const origGet = CP.getContext;
  CP.getContext = function (type) {
    const ctx = origGet.apply(this, arguments);
    if (ctx) {
      const r = recOf(this);
      if (!r.type) { r.type = String(type); r.src = srcOf(); push('ctx', { c: nameOf(r), type: r.type }); }
    }
    return ctx;
  };
  ['width', 'height'].forEach((prop) => {
    const d = Object.getOwnPropertyDescriptor(CP, prop);
    if (!d || !d.set) return;
    Object.defineProperty(CP, prop, {
      configurable: true, enumerable: d.enumerable,
      get() { return d.get.call(this); },
      set(v) {
        const r = recOf(this);
        const before = d.get.call(this);
        d.set.call(this, v);
        const after = d.get.call(this);
        r.blank = true; r.touched = true; r.resets++;
        if (this.isConnected) push('size', { c: nameOf(r), p: prop, from: before, to: after });
      }
    });
  });

  const P2 = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (P2) {
    ['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage', 'putImageData'].forEach((name) => {
      const o = P2[name]; if (!o) return;
      P2[name] = function () {
        const c = this.canvas;
        if (c) { const r = c[REC] || recOf(c); r.blank = false; r.everDrawn = true; r.touched = true; r.ops++; }
        return o.apply(this, arguments);
      };
    });
    ['fillText', 'strokeText'].forEach((name) => {
      const o = P2[name]; if (!o) return;
      P2[name] = function (text) {
        const c = this.canvas;
        if (c) {
          const r = c[REC] || recOf(c);
          r.blank = false; r.everDrawn = true; r.touched = true; r.ops++; r.texts++;
          let loaded = null;
          try { loaded = document.fonts.check(this.font, String(text)); } catch (e) { /* bad font */ }
          push('text', { c: nameOf(r), font: String(this.font).slice(0, 70), text: String(text).slice(0, 32), loaded: loaded });
        }
        return o.apply(this, arguments);
      };
    });
    const oGID = P2.getImageData;
    P2.getImageData = function (x, y, w, h) {
      const c = this.canvas;
      if (c) { const r = c[REC] || recOf(c); r.reads++; push('read', { c: nameOf(r), w: w, h: h }); }
      return oGID.apply(this, arguments);
    };
    const oClear = P2.clearRect;
    P2.clearRect = function (x, y, w, h) {
      const c = this.canvas;
      if (c) {
        const r = c[REC] || recOf(c);
        r.clears++; r.touched = true;
        let full = false;
        try {
          const m = this.getTransform();
          full = (x * m.a + m.e) <= 0.5 && (y * m.d + m.f) <= 0.5 &&
                 ((x + w) * m.a + m.e) >= c.width - 0.5 && ((y + h) * m.d + m.f) >= c.height - 0.5;
        } catch (e) { full = x <= 0 && y <= 0 && w >= c.width && h >= c.height; }
        if (full) r.blank = true;
      }
      return oClear.apply(this, arguments);
    };
  }
  [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach((C) => {
    if (!C) return;
    const P = C.prototype;
    ['drawArrays', 'drawElements'].forEach((name) => {
      const o = P[name]; if (!o) return;
      P[name] = function () {
        const c = this.canvas;
        if (c) { const r = c[REC] || recOf(c); r.blank = false; r.everDrawn = true; r.touched = true; r.ops++; }
        return o.apply(this, arguments);
      };
    });
    const oRP = P.readPixels;
    if (oRP) P.readPixels = function (x, y, w, h) {
      const c = this.canvas;
      if (c) { const r = c[REC] || recOf(c); r.reads++; push('glread', { c: nameOf(r), w: w, h: h }); }
      return oRP.apply(this, arguments);
    };
  });

  /* ---------------- lifecycle events ---------------- */
  ['resize', 'load', 'pageshow', 'pagehide', 'pagereveal', 'orientationchange'].forEach((ev) => {
    window.addEventListener(ev, (e) => {
      if (e.target !== window && e.target !== document) return;
      push('ev', { ev: ev, persisted: e.persisted, w: window.innerWidth, h: window.innerHeight,
                   vt: e.viewTransition ? true : undefined, synthetic: e.isTrusted ? undefined : true });
    }, true);
  });
  ['DOMContentLoaded', 'visibilitychange'].forEach((ev) => {
    document.addEventListener(ev, (e) => push('ev', { ev: ev, vis: document.visibilityState, synthetic: e.isTrusted ? undefined : true }), true);
  });
  let paints = 0;
  window.addEventListener('MozAfterPaint', () => {
    if (paints++ > 40) return;
    const line = document.querySelector('.pt-scan-line');
    let y = null;
    try { if (line) { const ls = getComputedStyle(line); y = ls.transform && ls.transform !== 'none' ? Math.round(new DOMMatrixReadOnly(ls.transform).m42) : 0; } } catch (e) { /* none */ }
    push('paint', { n: paints, lineY: y, covered: document.documentElement.classList.contains('pt-covered'), cover: !!document.querySelector('.pt-scan-cover') });
  });
  ['webglcontextlost', 'webglcontextrestored'].forEach((ev) => {
    document.addEventListener(ev, (e) => { const r = e.target && e.target[REC]; push('ev', { ev: ev, c: r ? nameOf(r) : '' }); }, true);
  });

  /* ---------------- fonts ---------------- */
  const FONT_PROBES = { sans750: "750 100px 'Site Sans'", sans400: "400 16px 'Site Sans'", mono700: "700 100px 'Site Mono'", mono400: "400 11px 'Site Mono'" };
  let fontState = '';
  function fontSnap() {
    const o = {};
    try {
      o.status = document.fonts.status;
      for (const k in FONT_PROBES) o[k] = document.fonts.check(FONT_PROBES[k]);
      const faces = [];
      document.fonts.forEach((f) => faces.push(String(f.family).replace(/["']/g, '') + ':' + f.status));
      o.faces = faces.join(',');
    } catch (e) { o.err = String(e); }
    return o;
  }
  function fontPoll() {
    const s = fontSnap(); const j = JSON.stringify(s);
    if (j !== fontState) { fontState = j; push('fonts', s); }
  }
  try {
    document.fonts.addEventListener('loading', () => push('fontev', { ev: 'loading' }));
    document.fonts.addEventListener('loadingdone', (e) => push('fontev', { ev: 'loadingdone', n: e.fontfaces ? e.fontfaces.length : undefined }));
    document.fonts.addEventListener('loadingerror', () => push('fontev', { ev: 'loadingerror' }));
  } catch (e) { /* no FontFaceSet events */ }

  /* ---------------- <html> class changes (arrival gates) ---------------- */
  let lastCls = null;
  function clsPoll() {
    const de = document.documentElement; if (!de) return;
    const c = de.className;
    if (c !== lastCls) { lastCls = c; push('class', { html: c }); }
  }
  try { new MutationObserver(clsPoll).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); }
  catch (e) { /* no root yet */ }

  /* ---------------- emulated hidden tab ---------------- */
  let hiddenEmu = false;
  const deferred = [];
  try {
    const dH = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    const dV = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, enumerable: true, get() { return hiddenEmu ? true : dH.get.call(this); } });
    Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, enumerable: true, get() { return hiddenEmu ? 'hidden' : dV.get.call(this); } });
  } catch (e) { push('warn', { msg: 'cannot override visibility: ' + e }); }
  const nRAF = window.requestAnimationFrame.bind(window);
  const nCAF = window.cancelAnimationFrame.bind(window);
  let rid = 0;
  const live = new Map();
  function arm(id, entry) {
    entry.native = nRAF(function (ts) {
      if (!live.has(id)) return;
      if (hiddenEmu) { deferred.push(id); return; }     /* a hidden tab gets no frames */
      live.delete(id);
      entry.cb(ts);
    });
  }
  window.requestAnimationFrame = function (cb) {
    const id = ++rid;
    const entry = { cb: cb, native: 0 };
    live.set(id, entry);
    arm(id, entry);
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    const e = live.get(id);
    if (e) { nCAF(e.native); live.delete(id); }
  };
  function hide() {
    if (hiddenEmu) return;
    push('mark', { name: 'emulated-hide' });
    hiddenEmu = true;
    window.dispatchEvent(new Event('blur'));
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  }
  function show() {
    if (!hiddenEmu) return;
    push('mark', { name: 'emulated-show' });
    hiddenEmu = false;
    const ids = deferred.splice(0);
    ids.forEach((id) => { const e = live.get(id); if (e) arm(id, e); });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
    window.dispatchEvent(new Event('focus'));
  }

  /* ---------------- per-frame sampling ---------------- */
  const GRIDS = [];
  let lastGrid = null;
  const RECTS = {};
  function hashArr(a) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16);
  }
  function rectPoll(sel) {
    const el = document.querySelector(sel); if (!el) return;
    const b = el.getBoundingClientRect();
    const s = [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 100) / 100).join(',');
    if (RECTS[sel] !== s) { RECTS[sel] = s; push('rect', { el: sel, r: s }); }
  }
  function coverState() {
    const de = document.documentElement;
    if (de.classList.contains('pt-covered')) return 'covered';
    const c = document.querySelector('.pt-scan-cover');
    if (c) return 'sweep ' + (c.style.clipPath || '');
    return '';
  }
  /* the page transition, frame by frame: where the cover and the scan line are */
  const TX = [];
  function txPoll() {
    const de = document.documentElement;
    const covered = de.classList.contains('pt-covered');
    const cov = document.querySelector('.pt-scan-cover');
    const line = document.querySelector('.pt-scan-line');
    if (!covered && !cov && !line) {
      if (TX.length && TX[TX.length - 1].on) TX.push({ t: t(), f: frameNo, on: false });
      return;
    }
    const o = { t: t(), f: frameNo, on: true, covered: covered, cover: !!cov };
    try {
      if (cov) {
        const cs = getComputedStyle(cov);
        if (cs.clipPath && cs.clipPath !== 'none') o.clip = cs.clipPath;
        if (cs.transform && cs.transform !== 'none') o.coverY = Math.round(new DOMMatrixReadOnly(cs.transform).m42);
        o.coverOpacity = +cs.opacity;
      }
      if (line) {
        const ls = getComputedStyle(line);
        o.lineY = ls.transform && ls.transform !== 'none' ? Math.round(new DOMMatrixReadOnly(ls.transform).m42 * 10) / 10 : 0;
        o.tag = line.textContent;
      }
    } catch (e) { o.err = String(e).slice(0, 80); }
    if (TX.length < 400) TX.push(o);
  }
  function afterPaint() {
    fontPoll();
    clsPoll();
    txPoll();
    for (let i = 0; i < recs.length; i++) {
      const r = recs[i];
      let shown = false;
      try { shown = r.el.isConnected && r.el.offsetParent !== null; } catch (e) { /* detached */ }
      /* a canvas that has carried a drawing and is now presented empty */
      const blankNow = shown && r.everDrawn && r.blank;
      if (blankNow) {
        r.blankFrames++;
        if (!r.inBlank) { r.inBlank = true; r.blankSpans++; r.blankStart = t(); push('blank', { c: nameOf(r), state: 'start' }); }
      } else if (r.inBlank) {
        r.inBlank = false;
        push('blank', { c: nameOf(r), state: 'end', ms: Math.round((t() - r.blankStart) * 10) / 10 });
      }
    }
    const mq = window.__marquee;
    if (mq && mq.grid) {
      let g = null;
      try { g = mq.grid(); } catch (e) { /* not built */ }
      if (g && g !== lastGrid) {
        lastGrid = g;
        const h = hashArr(g.lit);
        push('grid', { cols: g.cols, rows: g.rows, cell: Math.round(g.cell * 1000) / 1000, lit: g.lit.length, hash: h, w: g.w, h: g.h });
        if (GRIDS.length < 10) GRIDS.push({ t: t(), cols: g.cols, rows: g.rows, cell: g.cell, w: g.w, h: g.h, hash: h, lit: g.lit.slice() });
      }
    }
    rectPoll('#proj-title'); rectPoll('#pt-led'); rectPoll('#proj-index');

    /* frame by frame: what the title canvas holds at each presented frame */
    if (CAPTURE && FRAMES.length < 140 && perfNow() < 2600) {
      const led = document.getElementById('pt-led');
      const r = led && led[REC];
      if (led && r) {
        const f = { t: t(), f: frameNo, cover: coverState(), blank: r.blank, drawn: r.everDrawn, w: led.width, h: led.height };
        if (r.touched) {
          r.touched = false;
          try { f.png = led.toDataURL('image/png'); } catch (e) { f.err = String(e); }
        } else f.same = true;
        FRAMES.push(f);
      } else FRAMES.push({ t: t(), f: frameNo, cover: coverState(), none: true });
    }
  }
  const mc = new MessageChannel();
  mc.port1.onmessage = afterPaint;
  function qaFrame() {
    nRAF(qaFrame);
    frameNo++;
    mc.port2.postMessage(0);
  }
  nRAF(qaFrame);

  window.__qa = {
    log: LOG,
    recs: function () {
      return recs.map((r) => {
        let connected = false, shown = false;
        try { connected = r.el.isConnected; shown = connected && r.el.offsetParent !== null; } catch (e) { /* gone */ }
        return { name: nameOf(r), type: r.type, connected: connected, shown: shown, w: r.el.width, h: r.el.height,
                 ops: r.ops, clears: r.clears, resets: r.resets, reads: r.reads, texts: r.texts,
                 blankFrames: r.blankFrames, blankSpans: r.blankSpans };
      });
    },
    grids: GRIDS, frames: FRAMES, capture: CAPTURE, tx: TX,
    hide: hide, show: show, fontSnap: fontSnap,
    frameNo: function () { return frameNo; },
    since: function (n) { return LOG.slice(n); }
  };
}

/* frame pacing only: a bare rAF clock, no wrappers, so it costs nothing */
function pacer() {
  if (window.__pace || window.top !== window) return;
  const P = window.__pace = { on: false, dts: [], last: 0 };
  const raf = window.requestAnimationFrame.bind(window);
  function tick(ts) {
    raf(tick);
    if (P.on && P.last) P.dts.push(Math.round((ts - P.last) * 100) / 100);
    P.last = ts;
  }
  raf(tick);
}

/* ------------------------------------------------------------------ */
/* plumbing                                                            */
/* ------------------------------------------------------------------ */
function launch(name) {
  const o = { headless: !HEADED };
  if (name === 'chrome' || name === 'chromium') {
    if (name === 'chrome') o.channel = 'chrome';
    /* headless Chromium draws WebGL in software unless told otherwise */
    o.args = process.platform === 'darwin'
      ? ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist']
      : ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'];
    return chromium.launch(o);
  }
  if (name === 'firefox') {
    /* Tab reaches links, as it does by default on Windows (macOS hides that behind a system setting) */
    o.firefoxUserPrefs = { 'accessibility.tabfocus': 7 };
    if (process.env.QA_AFTERPAINT === '1') o.firefoxUserPrefs['dom.send_after_paint_to_content'] = true;
    return firefox.launch(o);
  }
  if (name === 'webkit') return webkit.launch(o);
  throw new Error('unknown browser ' + name);
}
function contextOptions(name, vp, extra) {
  const o = Object.assign({ viewport: { width: vp.width, height: vp.height } }, extra || {});
  if (vp.mobile) {
    o.hasTouch = true;
    o.deviceScaleFactor = 3;
    if (name !== 'firefox') o.isMobile = true;
    if (name === 'webkit') o.userAgent = devices['iPhone 14'].userAgent;
  }
  return o;
}
function newSink() { return { console: [], pageerrors: [], failed: [], bad: [] }; }
function watch(page, sink) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    let u = '';
    try { u = (m.location() || {}).url || ''; } catch (e) { /* none */ }
    sink.console.push({ text: String(m.text()).slice(0, 300), url: u });
  });
  page.on('pageerror', (e) => sink.pageerrors.push(String((e && e.message) || e).slice(0, 300)));
  page.on('requestfailed', (r) => sink.failed.push({ url: r.url(), err: ((r.failure() || {}).errorText || '') }));
  page.on('response', (r) => { if (r.status() >= 400) sink.bad.push({ url: r.url(), status: r.status() }); });
}
/* site problems vs. things the site does not own */
function classify(sink, opts) {
  opts = opts || {};
  const real = [], env = [];
  const put = (kind, text, u) => {
    const s = kind + ': ' + text + (u ? ' [' + u + ']' : '');
    if (THIRD_PARTY.test(text) || THIRD_PARTY.test(u || '')) env.push(s);
    else real.push(s);
  };
  sink.pageerrors.forEach((e) => put('uncaught', e, ''));
  sink.bad.forEach((b) => {
    if (opts.expect404 && b.status === 404 && b.url === opts.expect404) return;
    put('http ' + b.status, b.url, b.url);
  });
  sink.failed.forEach((f) => {
    /* a request cut short by leaving the page is not a failure of the site */
    if (/ABORTED|NS_BINDING_ABORTED|cancelled|Load request cancelled/i.test(f.err)) return;
    put('request failed (' + f.err + ')', f.url, f.url);
  });
  sink.console.forEach((c) => {
    /* the browser's own line for a failed request duplicates the entry above */
    if (/Failed to load resource/i.test(c.text)) {
      const dup = sink.bad.some((b) => b.url === c.url) || sink.failed.some((f) => f.url === c.url);
      if (dup || (opts.expect404 && c.url === opts.expect404)) return;
      if (!c.url) { env.push('console: ' + c.text + ' (no url given by the browser)'); return; }
    }
    put('console', c.text, c.url);
  });
  return { real: real, env: env };
}
function add(R, group, name, status, details) {
  R.checks.push({ group: group, name: name, status: status, details: details || null });
  const mark = { pass: 'PASS', fail: 'FAIL', warn: 'WARN', info: 'INFO', error: 'ERR ' }[status] || status;
  console.log(`  [${mark}] ${group}: ${name}` + (status === 'fail' || status === 'error' ? '  ' + JSON.stringify(details).slice(0, 400) : ''));
}
async function settle(page, ms) {
  /* the home page plays a boot animation on a fresh arrival: wait it out */
  try { await page.waitForFunction(() => !document.documentElement.classList.contains('booting'), null, { timeout: 12000 }); }
  catch (e) { /* the page's own 7 s safety net will have fired */ }
  await page.waitForTimeout(ms == null ? 900 : ms);
}
async function shotClip(page, clip, file) {
  const o = { clip: clip };
  if (file) o.path = file;
  return page.screenshot(o);
}

/* ------------------------------------------------------------------ */
/* probes that run in the page                                         */
/* ------------------------------------------------------------------ */
function overflowProbe() {
  const de = document.documentElement, b = document.body;
  const vw = de.clientWidth;
  const out = { vw: vw, innerWidth: window.innerWidth, docScrollWidth: de.scrollWidth, bodyScrollWidth: b ? b.scrollWidth : 0, offscreen: [], clipped: [] };
  const y0 = window.scrollY;
  window.scrollTo(99999, y0); out.canScrollSideways = window.scrollX > 0; out.maxScrollX = window.scrollX; window.scrollTo(0, y0);
  const skip = (el) => el.closest('.sr-only, [aria-hidden="true"], #showcase, .bg-blob, .pt-scan-cover, noscript, script, style, svg, #boot, #boot-overlay');
  const els = b ? b.querySelectorAll('*') : [];
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (skip(el)) continue;
    let ownText = false;
    for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.textContent.trim().length > 1) { ownText = true; break; }
    const media = /^(IMG|CANVAS|BUTTON|INPUT|VIDEO|TABLE|TEXTAREA|SELECT)$/.test(el.tagName);
    if (!ownText && !media) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const desc = { el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''),
                   left: Math.round(r.left), right: Math.round(r.right), text: (el.textContent || '').trim().slice(0, 36) };
    if (cs.position !== 'fixed' && (r.right > vw + 1.5 || r.left < -1.5) && out.offscreen.length < 10) out.offscreen.push(desc);
    if (ownText && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && el.scrollWidth - el.clientWidth > 2 &&
        !el.closest('.word-wrap') && cs.textOverflow !== 'ellipsis' && out.clipped.length < 10) {
      desc.scrollWidth = el.scrollWidth; desc.clientWidth = el.clientWidth;
      out.clipped.push(desc);
    }
  }
  return out;
}

async function fontProbe(page) {
  return page.evaluate(async () => {
    try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* none */ }
    const o = { checks: {}, faces: [], dom: {}, canvas: {} };
    const probes = { sans400: "400 16px 'Site Sans'", sans750: "750 100px 'Site Sans'", mono400: "400 11px 'Site Mono'", mono700: "700 100px 'Site Mono'" };
    for (const k in probes) { try { o.checks[k] = document.fonts.check(probes[k]); } catch (e) { o.checks[k] = 'error ' + e; } }
    try { document.fonts.forEach((f) => o.faces.push(String(f.family).replace(/["']/g, '') + ':' + f.status)); } catch (e) { /* none */ }
    const w = (sel, idx) => {
      const el = document.querySelectorAll(sel)[idx || 0]; if (!el) return null;
      const r = document.createRange(); r.selectNodeContents(el);
      const b = r.getBoundingClientRect(), cs = getComputedStyle(el);
      return { w: Math.round(b.width * 1000) / 1000, h: Math.round(b.height * 1000) / 1000, size: cs.fontSize, weight: cs.fontWeight,
               family: cs.fontFamily.split(',')[0].replace(/["']/g, ''), text: el.textContent.trim().slice(0, 40) };
    };
    o.dom.heroTitle = w('.hero-title');
    o.dom.heroSubtitle = w('.hero-subtitle');
    o.dom.navLogo = w('.nav-logo-text');
    o.dom.navHome = w('.nav-links .nav-link', 0);
    o.dom.navProjects = w('.nav-links .nav-link', 1);
    o.dom.monoLabel = w('.section-label');
    o.dom.projMeta = w('.proj-meta');
    o.dom.caseTitle = w('#showcase h3');
    const c = document.createElement('canvas').getContext('2d');
    const m = (font, text) => { c.font = font; return Math.round(c.measureText(text).width * 1000) / 1000; };
    o.canvas.sans750 = m("750 100px 'Site Sans'", 'Projects Hudson Tinch 0123456789');
    o.canvas.sans400 = m("400 100px 'Site Sans'", 'Studying business. Shipping software.');
    o.canvas.mono400 = m("400 100px 'Site Mono'", 'SELECTED WORK 2019 2026');
    o.canvas.mono700 = m("700 100px 'Site Mono'", '700+ 13% 2nd 95');
    o.canvas.fallbackSans = m('750 100px sans-serif', 'Projects Hudson Tinch 0123456789');
    o.canvas.fallbackMono = m('400 100px monospace', 'SELECTED WORK 2019 2026');
    o.dpr = window.devicePixelRatio;
    return o;
  });
}

/* how much a layer contributes to what is on screen: shot with it, shot without it.
   `freeze` names other moving layers to take out for the duration, so the only thing
   that differs between the two shots is the layer under test. */
async function layerContribution(page, selector, clip, freeze) {
  const hideSel = (sel, tag) => page.evaluate(([q, t]) => {
    const els = document.querySelectorAll(q);
    els.forEach((el) => { el.setAttribute(t, el.style.visibility || ''); el.style.visibility = 'hidden'; });
    return els.length;
  }, [sel, tag]);
  const showSel = (sel, tag) => page.evaluate(([q, t]) => {
    document.querySelectorAll(q).forEach((el) => { el.style.visibility = el.getAttribute(t) || ''; el.removeAttribute(t); });
  }, [sel, tag]);
  if (freeze) { await hideSel(freeze, 'data-qa-frz'); await page.waitForTimeout(120); }
  const a1 = await shotClip(page, clip);
  await page.waitForTimeout(90);
  const a2 = await shotClip(page, clip);
  const found = await hideSel(selector, 'data-qa-vis');
  await page.waitForTimeout(140);
  const b = await shotClip(page, clip);
  await showSel(selector, 'data-qa-vis');
  if (freeze) await showSel(freeze, 'data-qa-frz');
  await page.waitForTimeout(90);
  const hid = diffPng(a2, b, 10), amb = diffPng(a1, a2, 10);
  const paints = found > 0 && hid.sameSize && hid.changedPct >= 0.15 && hid.max >= 18 &&
                 (hid.changedPct > amb.changedPct * 1.5 || hid.mean > amb.mean * 1.5);
  return { found: found, withoutLayer: hid, ambient: amb, paints: paints };
}

/* a 2D canvas read directly in the test browser: how much of it carries ink */
async function canvasInk(page, selector) {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel);
    if (!c) return { found: false };
    const x = c.getContext('2d');
    if (!x) return { found: true, readable: false };
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let lit = 0, maxA = 0;
    for (let i = 3; i < d.length; i += 4) { if (d[i] > 16) lit++; if (d[i] > maxA) maxA = d[i]; }
    const r = c.getBoundingClientRect();
    return { found: true, readable: true, w: c.width, h: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height),
             litPixels: lit, litPct: Math.round(100000 * lit / (c.width * c.height)) / 1000, maxAlpha: maxA,
             shown: getComputedStyle(c).display !== 'none' && getComputedStyle(c).visibility !== 'hidden' };
  }, selector);
}

/* ------------------------------------------------------------------ */
/* 1 + 2: every page loads clean, nothing overflows                     */
/* ------------------------------------------------------------------ */
async function checkPages({ name, dir, R }) {
  const browser = await launch(name);
  try {
    fs.mkdirSync(path.join(dir, 'pages'), { recursive: true });
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext(contextOptions(name, vp));
      for (const pg of PAGES) {
        const page = await context.newPage();
        const sink = newSink(); watch(page, sink);
        let status = null, err = null;
        try {
          const resp = await page.goto(urlOf(pg.id), { waitUntil: 'load', timeout: 45000 });
          status = resp ? resp.status() : null;
          await settle(page, 1500);
        } catch (e) { err = String(e.message || e).slice(0, 300); }
        let ov = null;
        try { ov = await page.evaluate(overflowProbe); } catch (e) { ov = { error: String(e).slice(0, 200) }; }
        try { await page.screenshot({ path: path.join(dir, 'pages', `${pg.id}-${vp.id}.jpg`), type: 'jpeg', quality: 55 }); } catch (e) { /* no shot */ }
        const issues = classify(sink);
        add(R, 'pages', `${pg.id} @ ${vp.id}: loads with no errors`, (err || status !== 200 || issues.real.length) ? 'fail' : 'pass',
            { status: status, err: err, errors: issues.real, notOwnedBySite: issues.env });
        const informational = pg.id === 'desktop' || pg.id === 'mac';   /* fixed-layout OS simulations */
        const bad = ov && !ov.error && (ov.canScrollSideways || ov.offscreen.length || ov.clipped.length);
        add(R, 'overflow', `${pg.id} @ ${vp.id}: no horizontal overflow, nothing clipped`,
            ov && ov.error ? 'error' : (bad ? (informational && !ov.canScrollSideways ? 'info' : 'fail') : 'pass'), ov);
        await page.close();
      }
      await context.close();
    }
    /* an address that does not exist serves the site's own 404 page */
    const context = await browser.newContext(contextOptions(name, VIEWPORTS[0]));
    const page = await context.newPage();
    const sink = newSink(); watch(page, sink);
    const missing = BASE + '/no-such-page-qa-check';
    let status = null, has404 = false;
    try {
      const resp = await page.goto(missing, { waitUntil: 'load', timeout: 45000 });
      status = resp ? resp.status() : null;
      await page.waitForTimeout(1200);
      has404 = await page.evaluate(() => !!document.querySelector('.nav-links') && /404|not found|lost/i.test(document.body.innerText));
    } catch (e) { /* recorded below */ }
    const issues = classify(sink, { expect404: missing });
    add(R, 'pages', 'unknown address: HTTP 404 with the site\'s own 404 page', (status === 404 && has404 && !issues.real.length) ? 'pass' : (LOCAL ? 'info' : 'fail'),
        { status: status, siteNav: has404, errors: issues.real, notOwnedBySite: issues.env });
    await context.close();
  } finally { await browser.close().catch(() => {}); }
}

/* ------------------------------------------------------------------ */
/* 3: fonts                                                            */
/* ------------------------------------------------------------------ */
async function checkFonts({ name, R }) {
  const browser = await launch(name);
  try {
    const context = await browser.newContext(contextOptions(name, VIEWPORTS[0]));
    R.data.fonts = {};
    for (const id of ['home', 'projects', '404']) {
      const page = await context.newPage();
      try {
        await page.goto(urlOf(id), { waitUntil: 'load', timeout: 45000 });
        await settle(page, 1200);
        const f = await fontProbe(page);
        R.data.fonts[id] = f;
        const ok = f.checks.sans400 === true && f.checks.sans750 === true && f.checks.mono400 === true && f.checks.mono700 === true;
        const loaded = f.faces.filter((x) => /:loaded$/.test(x)).length;
        /* the webfont is really in use when its widths differ from the generic fallback's */
        const real = Math.abs(f.canvas.sans750 - f.canvas.fallbackSans) > 1 || Math.abs(f.canvas.mono400 - f.canvas.fallbackMono) > 1;
        add(R, 'fonts', `${id}: Site Sans and Site Mono are loaded`, ok && loaded >= 2 ? 'pass' : 'fail',
            { checks: f.checks, faces: f.faces, canvasWidths: f.canvas, distinctFromFallback: real });
      } catch (e) { add(R, 'fonts', `${id}: Site Sans and Site Mono are loaded`, 'error', { error: String(e).slice(0, 300) }); }
      await page.close();
    }
    await context.close();
  } finally { await browser.close().catch(() => {}); }
}

/* ------------------------------------------------------------------ */
/* 4: the key visuals actually paint                                   */
/* ------------------------------------------------------------------ */
async function seat(page, i, maxMs) {
  /* scroll the corridor to station i and wait for the slide to come to rest */
  await page.evaluate((k) => window.scrollTo({ top: Math.round(window.__corridor.stationY(k)), behavior: 'instant' }), i);
  const t0 = Date.now();
  let last = null, stable = 0, m = null;
  while (Date.now() - t0 < (maxMs || 9000)) {
    await page.waitForTimeout(150);
    m = await page.evaluate((k) => {
      const c = window.__corridor, sl = document.querySelectorAll('#showcase .sc-slide')[k];
      const stage = document.querySelector('#showcase .sc-stage');
      if (!c || !sl || !stage) return null;
      const plate = sl.querySelector('.case, .case-grid') || sl;
      const pr = plate.getBoundingClientRect(), sb = stage.getBoundingClientRect();
      const hd = document.querySelector('.site-header');
      const hb = hd ? hd.getBoundingClientRect() : null;
      return { active: c.active(), isActive: sl.classList.contains('active'), vis: sl.style.visibility, op: +sl.style.opacity,
               cx: pr.left + pr.width / 2, cy: pr.top + pr.height / 2, stageCx: sb.left + sb.width / 2, stageCy: sb.top + sb.height / 2,
               top: pr.top, bottom: pr.bottom, left: pr.left, right: pr.right, w: pr.width, h: pr.height,
               vw: window.innerWidth, vh: window.innerHeight,
               headerBottom: hb && !hd.classList.contains('nav-hidden') ? hb.bottom : 0, scrollY: window.pageYOffset };
    }, i);
    if (!m) continue;
    if (last && m.active === i && Math.abs(m.cx - last.cx) < 0.3 && Math.abs(m.cy - last.cy) < 0.3) { if (++stable >= 2) break; } else stable = 0;
    last = m;
  }
  return m;
}
async function checkVisuals({ name, dir, R }) {
  const browser = await launch(name);
  try {
    fs.mkdirSync(path.join(dir, 'visuals'), { recursive: true });
    const vp = VIEWPORTS[0];
    const context = await browser.newContext(contextOptions(name, vp));
    /* ---- home ---- */
    let page = await context.newPage();
    try {
      await page.goto(urlOf('home'), { waitUntil: 'load', timeout: 45000 });
      await settle(page, 1500);
      const diag = await page.evaluate(() => ({ sand: window.__sandDiag ? { mode: window.__sandDiag.mode, frames: window.__sandDiag.frames, err: window.__sandDiag.err } : null,
                                                hero: window.__terrainDiag ? { mode: window.__terrainDiag.mode, frames: window.__terrainDiag.frames } : null }));
      const hero = await page.evaluate(() => { const b = document.querySelector('.hero').getBoundingClientRect(); return { x: 0, y: Math.max(0, Math.round(b.top)), width: Math.round(Math.min(b.width, window.innerWidth)), height: Math.round(Math.min(b.height, window.innerHeight)) }; });
      /* the field is quiet at rest and blooms under the pointer: measure it with the pointer on it */
      await page.mouse.move(vp.width * 0.62, hero.y + hero.height * 0.55);
      await page.mouse.move(vp.width * 0.70, hero.y + hero.height * 0.64, { steps: 10 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(dir, 'visuals', 'home-hero.png') });
      /* a quiet, always-moving layer: read its canvas directly, and confirm it keeps drawing */
      const ink = await canvasInk(page, '#pcb-canvas');
      const f0 = await page.evaluate(() => (window.__terrainDiag ? window.__terrainDiag.frames : -1));
      await page.waitForTimeout(500);
      const f1 = await page.evaluate(() => (window.__terrainDiag ? window.__terrainDiag.frames : -1));
      const dots = await layerContribution(page, '#pcb-canvas', hero, '#sand-canvas');
      await page.mouse.move(4, 4);
      add(R, 'visuals', 'home: hero dot field paints', ink.found && ink.shown && ink.litPixels > 1500 && f1 > f0 ? 'pass' : 'fail',
          { diag: diag.hero, canvas: ink, framesIn500ms: f1 - f0, onScreen: dots.withoutLayer });
      /* the sand is the backdrop of the whole page: look at it behind the About section */
      await page.evaluate(() => { const a = document.getElementById('about'); window.scrollTo({ top: a ? a.getBoundingClientRect().top + window.pageYOffset - 40 : 900, behavior: 'instant' }); });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(dir, 'visuals', 'home-about-sand.png') });
      const sand = await layerContribution(page, '#sand-canvas', { x: 0, y: 0, width: vp.width, height: vp.height });
      add(R, 'visuals', 'home: sand paints', sand.paints ? 'pass' : 'fail', Object.assign({ diag: diag.sand }, sand));
    } catch (e) { add(R, 'visuals', 'home visuals', 'error', { error: String(e).slice(0, 300) }); }
    await page.close();

    /* ---- projects ---- */
    page = await context.newPage();
    try {
      await page.goto(urlOf('projects'), { waitUntil: 'load', timeout: 45000 });
      await settle(page, 2000);
      const title = await page.evaluate(() => { const b = document.getElementById('proj-title').getBoundingClientRect(); return { x: Math.floor(b.left), y: Math.floor(b.top) - 6, width: Math.ceil(b.width), height: Math.ceil(b.height) + 60 }; });
      await page.screenshot({ path: path.join(dir, 'visuals', 'projects-head.png') });
      const led = await layerContribution(page, '#pt-led', title);
      const st = await page.evaluate(() => ({ cls: document.documentElement.className, lit: window.__marquee && window.__marquee.grid() ? window.__marquee.grid().lit.length : 0,
                                              wordVisible: getComputedStyle(document.querySelector('.pt-word')).visibility }));
      add(R, 'visuals', 'projects: LED title paints', led.paints && st.lit > 300 ? 'pass' : 'fail', Object.assign({ state: st }, led));

      const hasCorridor = await page.evaluate(() => !!(window.__corridor && window.__corridor.mode === 'desktop'));
      if (!hasCorridor) add(R, 'visuals', 'projects: corridor present at 1440x900', 'fail', { corridor: false });
      else {
        const full = { x: 0, y: 0, width: vp.width, height: vp.height };
        /* station 1: card, ledger figure, sand bed */
        const m0 = await seat(page, 0);
        await page.waitForTimeout(1900);                        /* the figure's reveal wave */
        await page.screenshot({ path: path.join(dir, 'visuals', 'projects-station1.png') });
        const card = await page.evaluate(() => { const c = document.querySelector('#showcase .sc-slide.active .case'); if (!c) return null; const r = c.getBoundingClientRect(); return { w: r.width, h: r.height, text: c.innerText.trim().length, h3: (c.querySelector('h3') || {}).textContent }; });
        add(R, 'visuals', 'projects: corridor card is on screen with its text', card && card.w > 300 && card.text > 100 && m0 && m0.isActive ? 'pass' : 'fail', { card: card, seat: m0 });
        const fig = await layerContribution(page, '.ghost-led, .sc-ghost canvas', full);
        const figState = await page.evaluate(() => ({ fig: window.__projLedgerFig ? { rev: window.__projLedgerFig.rev(), txt: window.__projLedgerFig.txt(), hasCanvas: !!window.__projLedgerFig.canvas() } : null,
                                                      ghostOpacity: (document.querySelector('.sc-ghost') || { style: {} }).style.opacity }));
        add(R, 'visuals', 'projects: ledger figure paints behind the slide', fig.paints ? 'pass' : 'fail', Object.assign({ state: figState }, fig));
        const bed = await layerContribution(page, '#proj-sand', full);
        const sandState = await page.evaluate(() => (window.__projSand ? { diag: { mode: window.__projSand.diag.mode, frames: window.__projSand.diag.frames, log: window.__projSand.diag.log }, state: window.__projSand.state() } : null));
        add(R, 'visuals', 'projects: corridor sand bed paints', bed.paints ? 'pass' : 'fail', Object.assign({ state: sandState }, bed));
        /* station 5: the Hardware photos as LED dots */
        await seat(page, 4);
        await page.waitForTimeout(2200);
        await page.screenshot({ path: path.join(dir, 'visuals', 'projects-station5-hardware.png') });
        const pics = await layerContribution(page, '.case-dots', full);
        const views = await page.evaluate(() => (window.__projDots ? window.__projDots.views() : null));
        const allLit = views && views.length === 3 && views.every((v) => v.ready && !v.dead && v.rev >= 0.99 && v.w > 10);
        add(R, 'visuals', 'projects: LED pictures paint (3 hardware photos)', pics.paints && allLit ? 'pass' : 'fail', Object.assign({ views: views }, pics));
      }
    } catch (e) { add(R, 'visuals', 'projects visuals', 'error', { error: String(e && e.stack || e).slice(0, 500) }); }
    await page.close();
    await context.close();
  } finally { await browser.close().catch(() => {}); }
}

/* ------------------------------------------------------------------ */
/* 5: interactions                                                     */
/* ------------------------------------------------------------------ */
async function tabWalk(page, max) {
  const seen = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(40);
    const d = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      return { tag: el.tagName.toLowerCase(), text: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
               href: el.getAttribute('href') || '', cls: (typeof el.className === 'string' ? el.className : '').split(' ')[0] };
    });
    if (d) seen.push(d);
  }
  return seen;
}
async function checkInteractions({ name, dir, R }) {
  const browser = await launch(name);
  try {
    fs.mkdirSync(path.join(dir, 'interactions'), { recursive: true });
    /* ---------- desktop sizes ---------- */
    for (const vp of [VIEWPORTS[0], VIEWPORTS[1]]) {
      const context = await browser.newContext(contextOptions(name, vp));
      const page = await context.newPage();
      const sink = newSink(); watch(page, sink);
      try {
        /* nav Home -> Projects -> Home */
        await page.goto(urlOf('home'), { waitUntil: 'load', timeout: 45000 });
        await settle(page, 900);
        await Promise.all([page.waitForURL(/projects/, { waitUntil: 'load', timeout: 20000 }), page.locator('.nav-links a.nav-link', { hasText: 'Projects' }).first().click()]);
        await page.waitForTimeout(1600);
        const onProjects = await page.evaluate(() => ({ url: location.pathname, title: document.title, led: document.documentElement.classList.contains('pt-led'), cover: !!document.querySelector('.pt-scan-cover') || document.documentElement.classList.contains('pt-covered') }));
        await Promise.all([page.waitForURL((u) => !/projects/.test(u.pathname), { waitUntil: 'load', timeout: 20000 }), page.locator('.nav-links a.nav-link', { hasText: 'Home' }).first().click()]);
        await page.waitForTimeout(1600);
        const onHome = await page.evaluate(() => ({ url: location.pathname, title: document.title, hero: !!document.querySelector('.hero-title'), booting: document.documentElement.classList.contains('booting'), cover: !!document.querySelector('.pt-scan-cover') || document.documentElement.classList.contains('pt-covered') }));
        const navIssues = classify(sink);
        add(R, 'interactions', `nav Home -> Projects -> Home @ ${vp.id}`,
            /projects/.test(onProjects.url) && onProjects.led && !onProjects.cover && onHome.hero && !onHome.cover && !onHome.booting && !navIssues.real.length ? 'pass' : 'fail',
            { projects: onProjects, home: onHome, errors: navIssues.real, notOwnedBySite: navIssues.env });

        /* a click on the home hero throws nothing */
        const before = sink.pageerrors.length;
        const hb = await page.evaluate(() => { const b = document.querySelector('.hero').getBoundingClientRect(); return { x: b.left + b.width * 0.82, y: b.top + b.height * 0.30 }; });
        await page.mouse.move(hb.x - 60, hb.y - 20); await page.mouse.move(hb.x, hb.y, { steps: 6 });
        await page.mouse.click(hb.x, hb.y);
        await page.mouse.move(hb.x - 200, hb.y + 120, { steps: 8 });
        await page.mouse.click(hb.x - 200, hb.y + 120);
        await page.waitForTimeout(700);
        add(R, 'interactions', `home hero click throws nothing @ ${vp.id}`, sink.pageerrors.length === before ? 'pass' : 'fail', { errors: sink.pageerrors.slice(before) });

        if (vp === VIEWPORTS[0]) {
          /* links on the home page */
          const links = await page.evaluate(() => {
            const get = (sel) => Array.from(document.querySelectorAll(sel)).map((a) => ({ label: (a.getAttribute('aria-label') || a.textContent || '').trim(), href: a.href, raw: a.getAttribute('href'), target: a.target, rel: a.rel,
                                                                                         visible: !!(a.offsetWidth || a.offsetHeight) }));
            return { hero: get('.hero-social a'), contact: get('.contact-actions a'), footer: get('.footer-links a'), resume: get('a[href*="Resume"]') };
          });
          const want = { GitHub: 'https://github.com/Y3t1M', LinkedIn: 'https://linkedin.com/in/hudsontinch', Email: 'mailto:hudson.tinch@gmail.com' };
          const heroOk = Object.keys(want).every((k) => links.hero.some((a) => a.label === k && a.href.replace(/\/$/, '') === want[k] && a.visible));
          const otherOk = ['contact', 'footer'].every((grp) => links[grp].some((a) => /github\.com\/Y3t1M/.test(a.href)) && links[grp].some((a) => /linkedin\.com\/in\/hudsontinch/.test(a.href)) && links[grp].some((a) => a.href === want.Email));
          add(R, 'interactions', 'home: GitHub, LinkedIn and Email links exist and are correct', heroOk && otherOk ? 'pass' : 'fail', links);
          /* Resume returns the PDF */
          const hrefs = Array.from(new Set(links.resume.map((a) => a.href)));
          const pdf = [];
          for (const h of hrefs) {
            try { const r = await context.request.get(h, { timeout: 30000 }); const body = await r.body(); pdf.push({ href: h, status: r.status(), type: r.headers()['content-type'], bytes: body.length, pdfMagic: body.slice(0, 5).toString('latin1') }); }
            catch (e) { pdf.push({ href: h, error: String(e).slice(0, 200) }); }
          }
          add(R, 'interactions', 'Resume link returns the PDF (200)', pdf.length && pdf.every((p) => p.status === 200 && /pdf/.test(p.type || '') && p.pdfMagic === '%PDF-') ? 'pass' : 'fail', pdf);
          /* keyboard: Tab reaches the main controls on the home page */
          await page.goto(urlOf('home'), { waitUntil: 'load', timeout: 45000 });
          await settle(page, 600);
          await page.mouse.click(5, 5);                          /* put keyboard focus in the page, on nothing */
          const walk = await tabWalk(page, 16);
          const reached = (re) => walk.some((d) => re.test(d.text) || re.test(d.href));
          const need = { 'logo': /Hudson Tinch/, 'nav Home': /^Home$/, 'nav Projects': /^Projects$/, 'nav Resume': /^Resume/, 'hero Resume button': /Resume\.pdf/i, 'View projects': /View projects/, 'GitHub': /GitHub/, 'LinkedIn': /LinkedIn/, 'Email': /Email/ };
          const missing = Object.keys(need).filter((k) => !reached(need[k]));
          add(R, 'interactions', 'home: keyboard Tab reaches the main controls', missing.length ? 'fail' : 'pass', { missing: missing, order: walk.map((d) => d.text || d.href) });
        }
      } catch (e) { add(R, 'interactions', `home interactions @ ${vp.id}`, 'error', { error: String(e && e.stack || e).slice(0, 500) }); }

      /* ---------- the corridor ---------- */
      try {
        await page.goto(urlOf('projects'), { waitUntil: 'load', timeout: 45000 });
        await settle(page, 1500);
        const info = await page.evaluate(() => (window.__corridor ? { N: window.__corridor.N, mode: window.__corridor.mode } : null));
        if (!info || info.mode !== 'desktop') add(R, 'interactions', `corridor @ ${vp.id}`, 'fail', { corridor: info });
        else {
          const seats = [];
          for (let i = 0; i < info.N; i++) {
            const m = await seat(page, i);
            const centred = m && Math.abs(m.cx - m.stageCx) <= 2.5;
            const fits = m && m.top >= m.headerBottom - 1 && m.bottom <= m.vh + 1 && m.left >= -1 && m.right <= m.vw + 1;
            seats.push({ station: i + 1, active: m && m.active === i && m.isActive, centred: !!centred, dx: m ? +(m.cx - m.stageCx).toFixed(2) : null, dy: m ? +(m.cy - m.stageCy).toFixed(2) : null,
                         fits: !!fits, top: m ? Math.round(m.top) : null, bottom: m ? Math.round(m.bottom) : null, headerBottom: m ? Math.round(m.headerBottom) : null, h: m ? Math.round(m.h) : null, vh: m ? m.vh : null, opacity: m ? m.op : null });
            if (vp === VIEWPORTS[1] || i === 0 || i === 5) { try { await page.screenshot({ path: path.join(dir, 'interactions', `corridor-${vp.id}-station${i + 1}.jpg`), type: 'jpeg', quality: 60 }); } catch (e) { /* no shot */ } }
          }
          add(R, 'interactions', `corridor: all six stations become active and centred @ ${vp.id}`, seats.length === 6 && seats.every((s) => s.active && s.centred && s.opacity === 1) ? 'pass' : 'fail', seats);
          add(R, 'interactions', `corridor: every seated card fits on screen @ ${vp.id}`, seats.every((s) => s.fits) ? 'pass' : 'fail', seats.filter((s) => !s.fits).length ? seats.filter((s) => !s.fits) : { allFit: true });
          /* the index jumps to a station */
          const jumps = [];
          for (const k of (vp === VIEWPORTS[0] ? [0, 1, 2, 3, 4, 5] : [2, 5])) {
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await page.waitForTimeout(700);
            await page.locator('#proj-index li button').nth(k).click();
            let ok = false;
            const t0 = Date.now();
            while (Date.now() - t0 < 9000) {
              await page.waitForTimeout(200);
              const a = await page.evaluate((kk) => { const c = window.__corridor; const sl = document.querySelectorAll('#showcase .sc-slide')[kk]; return { active: c.active(), isActive: sl.classList.contains('active'), target: Math.round(c.stationY(kk)), y: Math.round(window.pageYOffset) }; }, k);
              if (a.active === k && a.isActive && Math.abs(a.y - a.target) <= 2) { ok = true; break; }
            }
            jumps.push({ row: k + 1, landed: ok, ms: Date.now() - t0 });
          }
          add(R, 'interactions', `index rows jump to their station @ ${vp.id}`, jumps.every((j) => j.landed) ? 'pass' : 'fail', jumps);
          if (vp === VIEWPORTS[0]) {
            /* keyboard on the projects page */
            await page.goto(urlOf('projects'), { waitUntil: 'load', timeout: 45000 });
            await settle(page, 1200);
            await page.mouse.click(5, 5);
            const walk = await tabWalk(page, 26);
            const idx = walk.filter((d) => d.tag === 'button' && /^0[1-6]/.test(d.text)).length;
            const caseLinks = walk.filter((d) => /hollisbloom\.com|rh-agentic|samsclub-demo|neatfreak|Arduino-R4|desktop\.html|\/desktop/.test(d.href)).length;
            const contact = walk.some((d) => /Email me/.test(d.text));
            const navN = walk.filter((d) => d.cls === 'nav-link').length;
            add(R, 'interactions', 'projects: keyboard Tab reaches nav, index rows, project links and contact',
                navN >= 3 && idx === 6 && caseLinks >= 5 && contact ? 'pass' : 'fail', { navLinks: navN, indexRows: idx, projectLinks: caseLinks, contact: contact, order: walk.map((d) => d.text || d.href) });
          }
        }
        const late = classify(sink);
        add(R, 'interactions', `no errors during the interaction pass @ ${vp.id}`, late.real.length ? 'fail' : 'pass', { errors: late.real, notOwnedBySite: late.env });
      } catch (e) { add(R, 'interactions', `corridor @ ${vp.id}`, 'error', { error: String(e && e.stack || e).slice(0, 500) }); }
      await context.close();
    }

    /* ---------- phone size: the plain flow ---------- */
    {
      const vp = VIEWPORTS[2];
      const context = await browser.newContext(contextOptions(name, vp));
      const page = await context.newPage();
      const sink = newSink(); watch(page, sink);
      try {
        await page.goto(urlOf('projects'), { waitUntil: 'load', timeout: 45000 });
        await settle(page, 1500);
        const flow = await page.evaluate(() => {
          const slides = Array.from(document.querySelectorAll('#showcase .sc-slide'));
          return { fx: document.documentElement.classList.contains('fx'), corridor: window.__corridor ? window.__corridor.mode : null, rows: document.querySelectorAll('#proj-index li button').length,
                   slides: slides.map((s) => { const r = s.getBoundingClientRect(); return { w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), vis: getComputedStyle(s).visibility }; }), vw: window.innerWidth,
                   led: document.documentElement.classList.contains('pt-led') };
        });
        const inside = flow.slides.length === 6 && flow.slides.every((s) => s.left >= -1 && s.right <= flow.vw + 1 && s.vis === 'visible' && s.w > 200);
        add(R, 'interactions', 'phone: projects is a plain vertical flow with all six projects inside the screen', !flow.fx && inside && flow.rows === 6 && flow.led ? 'pass' : 'fail', flow);
        const tapRow = async (k) => {
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
          await page.waitForTimeout(500);
          const b = page.locator('#proj-index li button').nth(k);
          if (vp.mobile && name !== 'firefox') await b.tap(); else await b.click();
          await page.waitForTimeout(2200);
          return page.evaluate((kk) => { const s = document.querySelectorAll('#showcase .sc-slide')[kk].getBoundingClientRect(); return { row: kk + 1, top: Math.round(s.top), vh: window.innerHeight }; }, k);
        };
        const j = [await tapRow(2), await tapRow(5)];
        add(R, 'interactions', 'phone: index rows scroll to their project', j.every((x) => x.top > -5 && x.top < x.vh * 0.5) ? 'pass' : 'fail', j);
        await page.goto(urlOf('home'), { waitUntil: 'load', timeout: 45000 });
        await settle(page, 900);
        const hp = await page.evaluate(() => { const b = document.querySelector('.hero').getBoundingClientRect(); return { x: b.left + b.width * 0.5, y: b.top + b.height * 0.12 }; });
        const n0 = sink.pageerrors.length;
        if (name !== 'firefox') await page.touchscreen.tap(hp.x, hp.y); else await page.mouse.click(hp.x, hp.y);
        await page.waitForTimeout(600);
        add(R, 'interactions', 'phone: a tap on the home hero throws nothing', sink.pageerrors.length === n0 ? 'pass' : 'fail', { errors: sink.pageerrors.slice(n0) });
        const late = classify(sink);
        add(R, 'interactions', 'no errors during the interaction pass @ 390x844', late.real.length ? 'fail' : 'pass', { errors: late.real, notOwnedBySite: late.env });
      } catch (e) { add(R, 'interactions', 'phone interactions', 'error', { error: String(e && e.stack || e).slice(0, 500) }); }
      await context.close();
    }

    /* ---------- RH Agentic: the request link ---------- */
    {
      const context = await browser.newContext(contextOptions(name, VIEWPORTS[0]));
      const page = await context.newPage();
      try {
        const resp = await page.goto(urlOf('rh-agentic'), { waitUntil: 'load', timeout: 45000 });
        const raw = resp ? await resp.text() : '';
        await page.waitForTimeout(1500);
        const link = await page.evaluate(() => {
          const a = Array.from(document.querySelectorAll('a')).find((x) => /request a demo/i.test(x.textContent));
          if (!a) return null;
          const r = a.getBoundingClientRect();
          return { text: a.textContent.trim(), href: a.href.slice(0, 120), visible: r.width > 0 && r.height > 0 };
        });
        const obfuscated = /cdn-cgi\/l\/email-protection/.test(raw);
        add(R, 'interactions', 'RH Agentic: offers a "Request a demo" mail link', link && link.visible && /^mailto:/.test(link.href) ? 'pass' : 'fail',
            { link: link, servedHtmlHasCloudflareEmailObfuscation: obfuscated });
      } catch (e) { add(R, 'interactions', 'RH Agentic request link', 'error', { error: String(e).slice(0, 300) }); }
      await context.close();
    }
  } finally { await browser.close().catch(() => {}); }
}

/* ------------------------------------------------------------------ */
/* 6: the flicker checks                                               */
/* ------------------------------------------------------------------ */
async function exportQa(page) {
  return page.evaluate(() => ({
    log: window.__qa.log.slice(), recs: window.__qa.recs(),
    grids: window.__qa.grids.map((g) => ({ t: g.t, cols: g.cols, rows: g.rows, cell: g.cell, w: g.w, h: g.h, hash: g.hash, lit: g.lit })),
    frames: window.__qa.frames.slice(), tx: window.__qa.tx.slice(),
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, vh: window.innerHeight,
    anims: (document.getAnimations ? document.getAnimations().length : null),
    html: document.documentElement.className, url: location.pathname, dpr: window.devicePixelRatio, now: Math.round(performance.now())
  }));
}
/* what the page transition did on one arrival, as the main thread saw it each frame */
function transitionMetrics(d) {
  const tx = d.tx || [];
  const on = tx.filter((s) => s.on);
  if (!on.length) return { cover: false, reducedMotion: d.reduced };
  const lines = on.filter((s) => s.lineY != null);
  const offAt = (function () { for (let i = 1; i < tx.length; i++) if (!tx[i].on && tx[i - 1].on) return tx[i].t; return null; })();
  let maxGap = 0, maxJump = 0;
  for (let i = 1; i < lines.length; i++) {
    maxGap = Math.max(maxGap, lines[i].t - lines[i - 1].t);
    maxJump = Math.max(maxJump, Math.abs(lines[i].lineY - lines[i - 1].lineY));
  }
  const vh = d.vh || 900;
  return {
    cover: true, reducedMotion: d.reduced,
    coveredAt: on[0].t, firstLineFrame: lines.length ? lines[0].t : null, gone: offAt,
    lineFrames: lines.length, firstLineY: lines.length ? lines[0].lineY : null,
    lineFramesTopHalf: lines.filter((s) => s.lineY < vh / 2).length,
    maxGapMs: Math.round(maxGap), maxJumpPx: Math.round(maxJump),
    driver: on.some((s) => s.clip) ? 'clip-path loop' : (on.some((s) => s.coverY != null) ? 'transform' : 'unknown'),
    series: lines.slice(0, 80).map((s) => [Math.round(s.t), Math.round(s.lineY)])
  };
}
/* what one arrival did to the title */
function arrivalMetrics(d) {
  const log = d.log;
  const isLed = (e) => /#pt-led/.test(e.c || '');
  const isMq = (e) => /projects-marquee/.test(e.c || '');
  const at = (pred) => { const e = log.find(pred); return e ? e.t : null; };
  const grids = log.filter((e) => e.k === 'grid');
  const widthSets = log.filter((e) => e.k === 'size' && isLed(e) && e.p === 'width');
  const blanks = log.filter((e) => e.k === 'blank' && isLed(e));
  const blankMs = blanks.filter((e) => e.state === 'end').reduce((s, e) => s + e.ms, 0);
  const texts = log.filter((e) => e.k === 'text' && isMq(e));
  const rects = log.filter((e) => e.k === 'rect' && e.el === '#proj-title');
  const diffs = [];
  for (let i = 1; i < d.grids.length; i++) diffs.push(gridDiff(d.grids[i - 1], d.grids[i]));
  const led = d.recs.find((r) => /#pt-led/.test(r.name)) || {};
  const m = {
    titleBuilds: widthSets.length,                          /* times the title canvas was reset and rebuilt */
    titleDrawsInFallbackFace: texts.filter((e) => e.loaded === false).length,
    blankSpans: blanks.filter((e) => e.state === 'start').length,
    blankFrames: led.blankFrames || 0,
    blankMs: Math.round(blankMs * 10) / 10,
    shapeChanges: diffs.filter((x) => x && (!x.sameGeometry || x.changed > 0)).length,
    dotsChanged: diffs.reduce((s, x) => s + (x ? (x.sameGeometry ? x.changed : Math.max(x.litA, x.litB)) : 0), 0),
    litDots: d.grids.length ? d.grids[d.grids.length - 1].lit.length : 0,
    titleBoxMoves: Math.max(0, rects.length - 1),
    ms: {
      firstBuild: at((e) => e.k === 'size' && isLed(e)),
      fontsLoaded: at((e) => e.k === 'fonts' && e.sans750 === true),
      load: at((e) => e.k === 'ev' && e.ev === 'load'),
      coverOff: (function () { const c = log.filter((e) => e.k === 'class'); const was = c.some((e) => /pt-covered/.test(e.html)); const off = c.find((e, i) => i > 0 && !/pt-covered/.test(e.html) && /pt-covered/.test(c[i - 1].html)); return was ? (off ? off.t : null) : undefined; })(),
      builds: widthSets.map((e) => e.t)
    },
    arrivedCovered: log.some((e) => e.k === 'class' && /pt-covered/.test(e.html)),
    viewTransition: log.some((e) => e.k === 'ev' && e.ev === 'pagereveal' && e.vt),
    dpr: d.dpr
  };
  m.clean = m.titleBuilds === 1 && m.titleDrawsInFallbackFace === 0 && m.blankSpans === 0 && m.shapeChanges === 0 && m.titleBoxMoves === 0 && m.litDots > 300;
  m.transition = transitionMetrics(d);
  return m;
}
async function clickNav(page, label, re) {
  await Promise.all([
    page.waitForURL(re, { waitUntil: 'load', timeout: 25000 }),
    page.locator('.nav-links a.nav-link', { hasText: label }).first().click(),
  ]);
}
const isProjects = /projects/;
const isHome = (u) => !/projects/.test(u.pathname);

async function checkFlicker({ name, dir, R }, MODE) {
  /* MODE.candidate: the same checks with the fixed file(s) served in place of the live ones */
  MODE = MODE || { group: 'flicker', sub: 'flicker', key: 'flicker', candidate: false };
  const G = MODE.group;
  const fdir = path.join(dir, MODE.sub);
  fs.mkdirSync(fdir, { recursive: true });
  const FD = R.data[MODE.key] = { arrivals: [], direct: [], dpr: [], frames: {}, tabReturn: null, control: null, served: null };
  const cand = async () => {};
  const saved = [ACTIVE_BASE, ACTIVE_LOCAL];
  if (MODE.base) { ACTIVE_BASE = MODE.base; ACTIVE_LOCAL = !!MODE.local; FD.base = MODE.base; }
  try {
  const vp = VIEWPORTS[0];

  /* ---- A. nav click Home -> Projects, five times in one session (first is cold), with a video ---- */
  {
    const browser = await launch(name);
    try {
      const context = await browser.newContext(contextOptions(name, vp, { recordVideo: { dir: path.join(fdir, 'video-arrivals'), size: { width: 1440, height: 900 } } }));
      await cand(context);
      await context.addInitScript(instrumentation);
      const page = await context.newPage();
      const sinkA = newSink(); watch(page, sinkA);
      const videoT0 = Date.now();
      await page.goto(urlOf('home'), { waitUntil: 'load', timeout: 45000 });
      await settle(page, 1000);
      FD.videoClicks = [];
      for (let n = 1; n <= 5; n++) {
        FD.videoClicks.push(Date.now() - videoT0);
        await clickNav(page, 'Projects', isProjects);
        await page.waitForTimeout(2600);
        const d = await exportQa(page);
        const m = arrivalMetrics(d);
        m.arrival = n; m.cache = n === 1 ? 'cold' : 'warm';
        FD.arrivals.push(m);
        if (n === 1 || n === 3) fs.writeFileSync(path.join(fdir, `arrival-${n}-log.json`), JSON.stringify({ metrics: m, log: d.log.filter((e) => e.k !== 'read' || /marquee/.test(e.c)), grids: d.grids }));
        if (n === 5) {
          /* B. one quick tab-return check: hide for 5 s, come back.
             The title canvas itself is compared (read in the test browser), so
             the sand drifting behind it does not count against the title; the
             whole region is recorded too. */
          try {
            const clip = await page.evaluate(() => { const b = document.getElementById('proj-title').getBoundingClientRect(); return { x: Math.floor(b.left), y: Math.floor(b.top) - 6, width: Math.ceil(b.width), height: Math.ceil(b.height) + 90 }; });
            const snap = () => page.evaluate(() => { const c = document.getElementById('pt-led'); window.__qaLed = c.getContext('2d').getImageData(0, 0, c.width, c.height); });
            const cmp = () => page.evaluate(() => {
              const c = document.getElementById('pt-led'), a = window.__qaLed;
              const b = c.getContext('2d').getImageData(0, 0, c.width, c.height);
              if (!a || a.width !== b.width || a.height !== b.height) return { sameSize: false };
              let max = 0, sum = 0, n = 0;
              for (let i = 3; i < a.data.length; i += 4) { const d = Math.abs(a.data[i] - b.data[i]); if (d > max) max = d; sum += d; if (d > 4) n++; }
              return { sameSize: true, maxAlphaChange: max, meanAlphaChange: +(sum / (a.data.length / 4)).toFixed(4), pixelsOver4: n };
            });
            await snap(); await page.waitForTimeout(120);
            const ambientLed = await cmp();
            const a1 = await shotClip(page, clip);
            await page.waitForTimeout(100);
            const a2 = await shotClip(page, clip, path.join(fdir, 'tab-return-before.png'));
            await snap();
            const n0 = await page.evaluate(() => ({ n: window.__qa.log.length, recs: window.__qa.recs() }));
            await page.evaluate(() => window.__qa.hide());
            await page.waitForTimeout(5000);
            await page.evaluate(() => window.__qa.show());
            await page.waitForTimeout(110);
            const returnLed = await cmp();
            const b1 = await shotClip(page, clip, path.join(fdir, 'tab-return-after.png'));
            await page.waitForTimeout(600);
            const after = await page.evaluate((k) => ({ log: window.__qa.since(k), recs: window.__qa.recs() }), n0.n);
            const ledB = n0.recs.find((r) => /#pt-led/.test(r.name)) || {}, ledA = after.recs.find((r) => /#pt-led/.test(r.name)) || {};
            const tr = { hiddenMs: 5000, emulated: true, titleRebuilds: (ledA.resets || 0) - (ledB.resets || 0), blankFrames: (ledA.blankFrames || 0) - (ledB.blankFrames || 0),
                         resizeEvents: after.log.filter((e) => e.k === 'ev' && e.ev === 'resize').length, gridChanges: after.log.filter((e) => e.k === 'grid').length,
                         titleCanvasOver120ms: ambientLed, titleCanvasOnReturn: returnLed,
                         regionAmbient: diffPng(a1, a2), regionOnReturn: diffPng(a2, b1) };
            /* clean: no rebuild, no empty frame, and the title's own pixels no more changed than by 120 ms of its shimmer */
            tr.clean = tr.titleRebuilds === 0 && tr.blankFrames === 0 && tr.gridChanges === 0 && returnLed.sameSize &&
                       returnLed.maxAlphaChange <= Math.max(4, (ambientLed.maxAlphaChange || 0) * 2);
            FD.tabReturn = tr;
            add(R, G, 'tab return (hidden 5 s, emulated): no visible change to the title', tr.clean ? 'pass' : 'fail', tr);
          } catch (e) { add(R, G, 'tab return check', 'error', { error: String(e && e.stack || e).slice(0, 400) }); }
        }
        if (n < 5) { await clickNav(page, 'Home', isHome); await page.waitForTimeout(1100); }
      }
      const vid = page.video();
      await context.close();
      if (vid) { try { FD.videoArrivals = path.relative(dir, await vid.path()); } catch (e) { /* no video */ } }
      fs.writeFileSync(path.join(fdir, 'video-arrivals', 'clicks.json'), JSON.stringify({ video: FD.videoArrivals || null, clicksMs: FD.videoClicks }));
      const A = FD.arrivals;
      const errsA = classify(sinkA);
      add(R, G, 'no page errors across the five nav arrivals', errsA.real.length ? 'fail' : 'pass', { errors: errsA.real, notOwnedBySite: errsA.env });
      add(R, G, 'page transition on nav arrival: cover and scan line, as the main thread saw them (evidence)', 'info',
          { arrivals: A.map((m) => Object.assign({ n: m.arrival }, m.transition, { series: undefined })) });
      const bad = A.filter((m) => !m.clean);
      add(R, G, 'arrival by nav click, 5 times in a session: title drawn once, in its final face, never blank', bad.length ? 'fail' : 'pass',
          { arrivals: A.map((m) => ({ n: m.arrival, cache: m.cache, builds: m.titleBuilds, fallbackFaceDraws: m.titleDrawsInFallbackFace, blankSpans: m.blankSpans, blankMs: m.blankMs, dotsChanged: m.dotsChanged, clean: m.clean, ms: m.ms })) });
    } catch (e) { add(R, G, 'arrival by nav click', 'error', { error: String(e && e.stack || e).slice(0, 600) }); }
    finally { await browser.close().catch(() => {}); }
  }

  /* ---- C. direct load, cold then warm ---- */
  {
    const browser = await launch(name);
    try {
      const context = await browser.newContext(contextOptions(name, vp));
      await cand(context);
      await context.addInitScript(instrumentation);
      const page = await context.newPage();
      for (const cache of ['cold', 'warm']) {
        await page.goto(urlOf('projects'), { waitUntil: 'load', timeout: 45000 });
        await page.waitForTimeout(2600);
        const d = await exportQa(page);
        const m = arrivalMetrics(d); m.cache = cache;
        FD.direct.push(m);
        if (cache === 'cold') fs.writeFileSync(path.join(fdir, 'direct-cold-log.json'), JSON.stringify({ metrics: m, log: d.log.filter((e) => e.k !== 'read' || /marquee/.test(e.c)), grids: d.grids }));
      }
      await context.close();
      const D = FD.direct;
      add(R, G, 'direct load, cold then warm: title drawn once, in its final face, never blank', D.every((m) => m.clean) ? 'pass' : 'fail',
          { loads: D.map((m) => ({ cache: m.cache, builds: m.titleBuilds, fallbackFaceDraws: m.titleDrawsInFallbackFace, blankSpans: m.blankSpans, blankMs: m.blankMs, dotsChanged: m.dotsChanged, clean: m.clean, ms: m.ms })) });
    } catch (e) { add(R, G, 'direct load', 'error', { error: String(e && e.stack || e).slice(0, 600) }); }
    finally { await browser.close().catch(() => {}); }
  }

  /* ---- D. the same arrival at the display scales Windows laptops use ---- */
  for (const dsf of [1.25, 1.5]) {
    const browser = await launch(name);
    try {
      const context = await browser.newContext(contextOptions(name, vp, { deviceScaleFactor: dsf }));
      await cand(context);
      await context.addInitScript(instrumentation);
      const page = await context.newPage();
      await page.goto(urlOf('home'), { waitUntil: 'load', timeout: 45000 });
      await settle(page, 800);
      for (let n = 1; n <= 2; n++) {
        await clickNav(page, 'Projects', isProjects);
        await page.waitForTimeout(2400);
        const m = arrivalMetrics(await exportQa(page));
        m.arrival = n; m.cache = n === 1 ? 'cold' : 'warm'; m.scale = dsf;
        FD.dpr.push(m);
        if (n < 2) { await clickNav(page, 'Home', isHome); await page.waitForTimeout(900); }
      }
      await context.close();
    } catch (e) { add(R, G, `arrival at display scale ${dsf}`, 'error', { error: String(e && e.stack || e).slice(0, 400) }); }
    finally { await browser.close().catch(() => {}); }
  }
  if (FD.dpr.length) {
    const P = FD.dpr;
    add(R, G, 'arrival by nav click at display scale 125% and 150%', P.every((m) => m.clean) ? 'pass' : 'fail',
        { arrivals: P.map((m) => ({ scale: m.scale, cache: m.cache, builds: m.titleBuilds, fallbackFaceDraws: m.titleDrawsInFallbackFace, blankSpans: m.blankSpans, blankMs: m.blankMs, dotsChanged: m.dotsChanged, clean: m.clean })) });
  }

  /* ---- G. the same arrival with reduced motion on (Windows reports it when "Animation effects" is off) ---- */
  {
    const browser = await launch(name);
    try {
      const context = await browser.newContext(contextOptions(name, vp, { reducedMotion: 'reduce' }));
      await cand(context);
      await context.addInitScript(instrumentation);
      const page = await context.newPage();
      await page.goto(urlOf('home'), { waitUntil: 'load', timeout: 45000 });
      await settle(page, 800);
      FD.reduced = [];
      for (let n = 1; n <= 2; n++) {
        await clickNav(page, 'Projects', isProjects);
        await page.waitForTimeout(2400);
        const m = arrivalMetrics(await exportQa(page));
        m.arrival = n; m.cache = n === 1 ? 'cold' : 'warm';
        FD.reduced.push(m);
        if (n < 2) { await clickNav(page, 'Home', isHome); await page.waitForTimeout(900); }
      }
      await context.close();
      add(R, G, 'arrival by nav click with reduced motion on: title drawn once, in its final face, never blank', FD.reduced.every((m) => m.clean) ? 'pass' : 'fail',
          { arrivals: FD.reduced.map((m) => ({ cache: m.cache, builds: m.titleBuilds, fallbackFaceDraws: m.titleDrawsInFallbackFace, blankSpans: m.blankSpans, blankMs: m.blankMs, dotsChanged: m.dotsChanged, clean: m.clean, cover: m.transition.cover, reducedMotion: m.transition.reducedMotion })) });
    } catch (e) { add(R, G, 'arrival with reduced motion', 'error', { error: String(e && e.stack || e).slice(0, 400) }); }
    finally { await browser.close().catch(() => {}); }
  }

  /* ---- E. frame by frame: what the title canvas held at every frame of the arrival ---- */
  {
    const browser = await launch(name);
    try {
      const context = await browser.newContext(contextOptions(name, vp));
      await cand(context);
      await context.addInitScript(instrumentation);
      const page = await context.newPage();
      await page.goto(urlOf('home'), { waitUntil: 'load', timeout: 45000 });
      await settle(page, 800);
      for (const tag of ['cold', 'warm']) {
        await page.evaluate(() => { window.name = 'qa-capture'; });
        await clickNav(page, 'Projects', isProjects);
        await page.waitForTimeout(3000);
        const d = await exportQa(page);
        const frames = d.frames;
        let saved = 0;
        const index = frames.map((f, i) => {
          const o = { i: i, t: f.t, frame: f.f, cover: f.cover, blank: !!f.blank, drawn: !!f.drawn, same: !!f.same, none: !!f.none };
          if (f.png) { const file = `frame-${tag}-${String(i).padStart(3, '0')}.png`; fs.mkdirSync(path.join(fdir, 'frames'), { recursive: true }); fs.writeFileSync(path.join(fdir, 'frames', file), Buffer.from(f.png.split(',')[1], 'base64')); o.file = file; saved++; }
          return o;
        });
        fs.writeFileSync(path.join(fdir, `frames-${tag}.json`), JSON.stringify({ metrics: arrivalMetrics(d), frames: index }));
        FD.frames[tag] = { frames: frames.length, images: saved, blankFrames: index.filter((f) => f.blank && f.drawn).length };
        await page.evaluate(() => { window.name = ''; });
        if (tag === 'cold') { await clickNav(page, 'Home', isHome); await page.waitForTimeout(900); }
      }
      await context.close();
      add(R, G, 'frame-by-frame capture of the title across the arrival (evidence)', 'info', FD.frames);
    } catch (e) { add(R, G, 'frame-by-frame capture', 'error', { error: String(e && e.stack || e).slice(0, 600) }); }
    finally { await browser.close().catch(() => {}); }
  }

  /* ---- F. control: no instrumentation at all, only a video and a burst of screenshots ---- */
  {
    const browser = await launch(name);
    try {
      const context = await browser.newContext(contextOptions(name, vp, { recordVideo: { dir: path.join(fdir, 'video-control'), size: { width: 1440, height: 900 } } }));
      await cand(context);
      const page = await context.newPage();
      await page.goto(urlOf('home'), { waitUntil: 'load', timeout: 45000 });
      await settle(page, 800);
      const clip = { x: 180, y: 230, width: 1080, height: 280 };
      const shots = [];
      const t0 = Date.now();
      const nav = page.locator('.nav-links a.nav-link', { hasText: 'Projects' }).first().click();
      while (Date.now() - t0 < 2200) {
        const ts = Date.now() - t0;
        try { const buf = await page.screenshot({ clip: clip, timeout: 1500 }); shots.push({ ms: ts, buf: buf }); } catch (e) { /* mid-navigation */ }
      }
      await nav.catch(() => {});
      await page.waitForTimeout(800);
      const finalShot = await page.screenshot({ clip: clip });
      fs.mkdirSync(path.join(fdir, 'burst'), { recursive: true });
      const series = shots.map((s, i) => {
        const file = `burst-${String(i).padStart(3, '0')}-${s.ms}ms.png`;
        fs.writeFileSync(path.join(fdir, 'burst', file), s.buf);
        const d = diffPng(s.buf, finalShot, 24);
        return { ms: s.ms, file: file, vsFinalPct: d.sameSize ? d.changedPct : null };
      });
      fs.writeFileSync(path.join(fdir, 'burst', 'final.png'), finalShot);
      FD.control = { shots: series.length, series: series };
      await context.close();
      add(R, G, 'control run without instrumentation: video and screenshot burst of the arrival (evidence)', 'info', { shots: series.length });
    } catch (e) { add(R, G, 'control run', 'error', { error: String(e && e.stack || e).slice(0, 600) }); }
    finally { await browser.close().catch(() => {}); }
  }
  } finally { ACTIVE_BASE = saved[0]; ACTIVE_LOCAL = saved[1]; }
}

/* the A/B: the same flicker checks through one local proxy, live files, then the fix */
async function checkFlickerAB(args) {
  const { R } = args;
  const upstream = BASE;
  for (const half of [{ group: 'flicker-control', sub: 'flicker-control', key: 'flickerControl', substitute: null },
                      { group: 'flicker-fix', sub: 'flicker-fix', key: 'flickerFix', substitute: CANDIDATE }]) {
    const px = await startProxy(upstream, half.substitute);
    try {
      await checkFlicker(args, { group: half.group, sub: half.sub, key: half.key, base: px.origin, local: LOCAL });
    } finally {
      await px.close();
      R.data[half.key].proxy = px.info;
    }
    const c = px.info;
    if (half.substitute) {
      const ok = !c.errors.length && Object.keys(c.expected).length > 0 && Object.keys(c.expected).every((k) => c.served[k] === c.expected[k]);
      add(R, half.group, 'the fixed file(s) were served in place of the live ones, byte for byte', ok ? 'pass' : 'fail',
          { label: c.label, commit: c.commit, expected: c.expected, served: c.served, errors: c.errors, requests: c.requests });
    } else {
      add(R, half.group, 'control: the live files were passed through the proxy', c.errors.length ? 'fail' : 'info',
          { served: { 'projects-marquee.js': c.served['projects-marquee.js'], 'transitions.js': c.served['transitions.js'] }, errors: c.errors, requests: c.requests });
    }
  }
}

/* ------------------------------------------------------------------ */
/* 7: frame pacing                                                     */
/* ------------------------------------------------------------------ */
function paceStats(dts) {
  if (!dts.length) return { frames: 0 };
  const s = dts.slice().sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const sum = dts.reduce((a, b) => a + b, 0);
  return { frames: dts.length, fps: +(1000 * dts.length / sum).toFixed(1), median: q(0.5), p95: q(0.95), p99: q(0.99), max: s[s.length - 1],
           over33ms: dts.filter((d) => d > 33.4).length, over50ms: dts.filter((d) => d > 50).length, over100ms: dts.filter((d) => d > 100).length };
}
async function checkPacing({ name, R }) {
  const browser = await launch(name);
  try {
    const vp = VIEWPORTS[0];
    const context = await browser.newContext(contextOptions(name, vp));
    await context.addInitScript(pacer);
    R.data.pacing = {};
    /* home hero: the pointer moving over the dot field */
    let page = await context.newPage();
    try {
      await page.goto(urlOf('home'), { waitUntil: 'load', timeout: 45000 });
      await settle(page, 1500);
      await page.mouse.move(300, 300);
      await page.evaluate(() => { window.__pace.dts.length = 0; window.__pace.on = true; });
      const t0 = Date.now();
      let k = 0;
      while (Date.now() - t0 < 3500) { k++; await page.mouse.move(720 + 520 * Math.sin(k / 9), 430 + 260 * Math.cos(k / 13)); await page.waitForTimeout(16); }
      const dts = await page.evaluate(() => { window.__pace.on = false; return window.__pace.dts.slice(); });
      R.data.pacing.homeHero = paceStats(dts);
      const st = R.data.pacing.homeHero;
      add(R, 'pacing', 'home hero with the pointer moving', st.frames > 20 && st.median <= 20 && st.over50ms <= 3 ? 'pass' : 'warn', st);
    } catch (e) { add(R, 'pacing', 'home hero', 'error', { error: String(e).slice(0, 300) }); }
    await page.close();
    /* the corridor: wheel through all six stations */
    page = await context.newPage();
    try {
      await page.goto(urlOf('projects'), { waitUntil: 'load', timeout: 45000 });
      await settle(page, 2000);
      const runway = await page.evaluate(() => (window.__corridor ? Math.round(window.__corridor.stationY(5) + 200) : 0));
      await page.mouse.move(720, 450);
      await page.evaluate(() => { window.__pace.dts.length = 0; window.__pace.on = true; });
      let y = 0;
      while (y < runway) { await page.mouse.wheel(0, 100); y += 100; await page.waitForTimeout(40); }
      await page.waitForTimeout(800);
      const dts = await page.evaluate(() => { window.__pace.on = false; return window.__pace.dts.slice(); });
      R.data.pacing.corridor = Object.assign(paceStats(dts), { wheelDistance: runway, reached: await page.evaluate(() => (window.__corridor ? window.__corridor.active() : null)) });
      const st = R.data.pacing.corridor;
      add(R, 'pacing', 'corridor traverse by wheel through all six stations', st.frames > 20 && st.median <= 20 && st.over50ms <= 5 ? 'pass' : 'warn', st);
    } catch (e) { add(R, 'pacing', 'corridor traverse', 'error', { error: String(e).slice(0, 300) }); }
    await page.close();
    await context.close();
  } finally { await browser.close().catch(() => {}); }
}

/* ------------------------------------------------------------------ */
/* run                                                                 */
/* ------------------------------------------------------------------ */
const GROUPS = [['pages', checkPages], ['fonts', checkFonts], ['visuals', checkVisuals], ['interactions', checkInteractions],
                ['flicker', checkFlicker], ['flicker-ab', checkFlickerAB], ['pacing', checkPacing]];

async function runBrowser(name) {
  const dir = path.join(OUT, OS_LABEL + '-' + name);
  fs.mkdirSync(dir, { recursive: true });
  const R = { os: OS_LABEL, browser: name, base: BASE, started: new Date().toISOString(), version: '', platform: process.platform + ' ' + require('os').release(), checks: [], data: {} };
  const save = () => fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(R, null, 1));
  try {
    const b = await launch(name);
    R.version = b.version();
    const p = await b.newPage();
    R.userAgent = await p.evaluate(() => navigator.userAgent);
    try {
      const sysCtx = await b.newContext({ reducedMotion: null });
      const sp = await sysCtx.newPage();
      R.systemReducedMotion = await sp.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
      await sysCtx.close();
    } catch (e) { R.systemReducedMotion = 'unknown: ' + String(e.message || e).slice(0, 120); }
    R.defaultReducedMotion = await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    R.gl = await p.evaluate(() => { try { const g = document.createElement('canvas').getContext('webgl'); if (!g) return 'no webgl'; const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); } catch (err) { return 'error ' + err; } });
    await b.close();
  } catch (e) {
    R.launchError = String(e && e.message || e).slice(0, 600);
    add(R, 'launch', 'browser starts', 'error', { error: R.launchError });
    save();
    return R;
  }
  console.log(`\n=== ${OS_LABEL} ${name} ${R.version}  (${R.gl})  ->  ${BASE}   reduced motion: system ${R.systemReducedMotion}, test default ${R.defaultReducedMotion}` + (CANDIDATE ? '   candidate: ' + CANDIDATE.label : ''));
  for (const [id, fn] of GROUPS) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    if (id === 'flicker-ab' && !CANDIDATE) continue;
    const t0 = Date.now();
    console.log(` -- ${id}`);
    try { await fn({ name: name, dir: dir, R: R }); }
    catch (e) { add(R, id, 'group did not complete', 'error', { error: String(e && e.stack || e).slice(0, 1200) }); }
    R.data[id + 'Seconds'] = Math.round((Date.now() - t0) / 1000);
    save();
  }
  R.finished = new Date().toISOString();
  const count = (s) => R.checks.filter((c) => c.status === s).length;
  R.totals = { pass: count('pass'), fail: count('fail'), warn: count('warn'), error: count('error'), info: count('info') };
  save();
  console.log(`=== ${OS_LABEL} ${name}: ` + JSON.stringify(R.totals));
  return R;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const all = [];
  for (const name of BROWSERS) all.push(await runBrowser(name));
  fs.writeFileSync(path.join(OUT, `summary-${OS_LABEL}.json`), JSON.stringify(all.map((R) => ({ os: R.os, browser: R.browser, version: R.version, totals: R.totals, launchError: R.launchError })), null, 1));
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
