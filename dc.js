#!/usr/bin/env node
/* Device check for hudsontinch.com: phone, tablet, Mac and Windows browsers.

   Read-only against the live site: it loads pages, clicks, taps, scrolls and
   takes screenshots in a throwaway browser. One target per run.

   env:
     TARGET     iphone | android | ipad | mac-chrome | mac-firefox | win-chrome | win-firefox
     BASE_URL   default https://hudsontinch.com
     OUT        output directory (default ./results); files land in OUT/<target>/
     ONLY       comma list of groups: env,pages,home,readability,nav,projects,rh,taps,perf
     HEADED=1   show the browser
*/
'use strict';
const { chromium, firefox, webkit, devices } = require('playwright');
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const BASE = (process.env.BASE_URL || 'https://hudsontinch.com').replace(/\/$/, '');
const ONLY = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const HEADED = process.env.HEADED === '1';

const TARGETS = {
  iphone: { label: 'iPhone: WebKit 390x844 @3x, touch', engine: 'webkit', touch: true, viewport: { width: 390, height: 844 }, dsf: 3, ua: devices['iPhone 15'].userAgent },
  android: { label: 'Android: Chromium mobile 360x800 @3x, touch', engine: 'chromium', touch: true, viewport: { width: 360, height: 800 }, dsf: 3, ua: devices['Pixel 7'].userAgent },
  ipad: { label: 'iPad: WebKit 820x1180 @2x, touch', engine: 'webkit', touch: true, viewport: { width: 820, height: 1180 }, dsf: 2, ua: devices['iPad (gen 7)'].userAgent },
  'mac-chrome': { label: 'Mac Chrome: Chromium 1440x900 @2x, Metal GPU', engine: 'chromium', viewport: { width: 1440, height: 900 }, dsf: 2 },
  'mac-firefox': { label: 'Mac Firefox: 1440x900 @2x', engine: 'firefox', viewport: { width: 1440, height: 900 }, dsf: 2 },
  'win-chrome': { label: 'Windows Chrome: installed Chrome 1536x864 @1.25x', engine: 'chromium', channel: 'chrome', viewport: { width: 1536, height: 864 }, dsf: 1.25 },
  'win-firefox': { label: 'Windows Firefox: 1536x864 @1.25x', engine: 'firefox', viewport: { width: 1536, height: 864 }, dsf: 1.25 },
};
const TNAME = process.env.TARGET || 'mac-chrome';
const T = TARGETS[TNAME];
if (!T) { console.error('unknown TARGET ' + TNAME); process.exit(2); }
const OUT = path.resolve(process.env.OUT || 'results', TNAME);
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { id: 'home', path: '/' },
  { id: 'projects', path: '/projects' },
  { id: 'rh-agentic', path: '/demos/rh-agentic' },
  { id: 'neatfreak', path: '/demos/neatfreak' },
  { id: 'resume', path: '/resume' },
  { id: 'desktop', path: '/desktop' },
  { id: 'mac', path: '/mac' },
  { id: 'missing', path: '/no-such-page-device-check', expect: 404 },
];
const url = (p) => BASE + p;
/* not the site's: the Cloudflare analytics beacon */
const THIRD_PARTY = /cloudflareinsights|\/cdn-cgi\/rum/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r2 = (v) => Math.round(v * 100) / 100;

/* ------------------------------------------------------------------ */
/* results                                                             */
/* ------------------------------------------------------------------ */
const R = { target: TNAME, label: T.label, base: BASE, started: new Date().toISOString(), platform: process.platform + ' ' + require('os').release(),
            checks: [], data: {} };
function save() { fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1)); }
function add(group, name, status, details) {
  R.checks.push({ group, name, status, details: details == null ? null : details });
  const mark = { pass: 'PASS', fail: 'FAIL', warn: 'WARN', info: 'INFO', error: 'ERR ' }[status] || status;
  const extra = (status === 'fail' || status === 'error' || status === 'warn') ? '  ' + JSON.stringify(details).slice(0, 360) : '';
  console.log(`  [${mark}] ${group}: ${name}${extra}`);
  save();
}
const rel = (f) => path.relative(OUT, f);
function sub(name) { const d = path.join(OUT, name); fs.mkdirSync(d, { recursive: true }); return d; }

/* ------------------------------------------------------------------ */
/* browser plumbing                                                    */
/* ------------------------------------------------------------------ */
async function launch() {
  const o = { headless: !HEADED };
  if (T.engine === 'chromium') {
    o.args = process.platform === 'darwin' ? ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist']
                                           : ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'];
    if (T.channel) {
      try { return await chromium.launch(Object.assign({ channel: T.channel }, o)); }
      catch (e) { R.data.channelFallback = 'channel ' + T.channel + ' failed, used bundled Chromium: ' + String(e.message || e).slice(0, 200); }
    }
    return chromium.launch(o);
  }
  if (T.engine === 'firefox') return firefox.launch(o);
  return webkit.launch(o);
}
function ctxOpts(extra) {
  const o = { viewport: Object.assign({}, T.viewport), deviceScaleFactor: T.dsf };
  if (T.touch) { o.hasTouch = true; if (T.engine !== 'firefox') o.isMobile = true; }
  if (T.ua) o.userAgent = T.ua;
  return Object.assign(o, extra || {});
}
function newSink() { return { console: [], pageerrors: [], failed: [], bad: [] }; }
function watch(page, sink) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    let u = '';
    try { u = (m.location() || {}).url || ''; } catch (e) { /* none */ }
    sink.console.push({ text: String(m.text()).slice(0, 300), url: u });
  });
  page.on('pageerror', (e) => { const st = String((e && e.stack) || '').split('\n').slice(1, 3).map((x) => x.trim()).join(' | '); sink.pageerrors.push((String((e && e.message) || e) + (st ? '  @ ' + st : '')).slice(0, 400)); });
  page.on('requestfailed', (r) => sink.failed.push({ url: r.url(), err: ((r.failure() || {}).errorText || '') }));
  page.on('response', (r) => { if (r.status() >= 400) sink.bad.push({ url: r.url(), status: r.status() }); });
}
function classify(sink, opts) {
  opts = opts || {};
  const real = [], env = [];
  const put = (kind, text, u) => {
    const s = kind + ': ' + text + (u && u !== text ? ' [' + u + ']' : '');
    if (THIRD_PARTY.test(text) || THIRD_PARTY.test(u || '')) env.push(s); else real.push(s);
  };
  sink.pageerrors.forEach((e) => put('uncaught', e, ''));
  sink.bad.forEach((b) => { if (opts.expect404 && b.status === 404 && b.url === opts.expect404) return; put('http ' + b.status, b.url, b.url); });
  sink.failed.forEach((f) => {
    if (/ABORTED|NS_BINDING_ABORTED|cancelled|Load request cancelled|interrupted/i.test(f.err)) return;
    put('request failed (' + f.err + ')', f.url, f.url);
  });
  sink.console.forEach((c) => {
    if (/Failed to load resource/i.test(c.text)) {
      const dup = sink.bad.some((b) => b.url === c.url) || sink.failed.some((f) => f.url === c.url);
      if (dup || (opts.expect404 && c.url === opts.expect404)) return;
    }
    put('console', c.text, c.url);
  });
  return { real, env };
}
/* the home page plays its boot on a fresh arrival: any key ends it */
async function skipBoot(page) {
  const booting = await page.evaluate(() => document.documentElement.classList.contains('booting')).catch(() => false);
  if (booting) { await page.keyboard.press('Shift').catch(() => {}); }
  await page.waitForFunction(() => !document.documentElement.classList.contains('booting') && !document.getElementById('boot'), null, { timeout: SLOW() ? 60000 : 9000 }).catch(() => {});
  return booting;
}
/* a machine drawing WebGL in software (CI runners have no GPU): frame rates there are indicative only */
const softwareGL = () => /SwiftShader|Basic Render|llvmpipe|softpipe|Software/i.test((R.env && R.env.webgl) || '');
const SLOW = () => process.env.FORCE_SLOW === '1' || softwareGL();
const NAV_MS = () => (SLOW() ? 90000 : 25000);
async function tapOrClick(page, x, y) {
  if (T.touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
}
async function tapLocator(loc) { if (T.touch) await loc.tap(); else await loc.click(); }

/* ------------------------------------------------------------------ */
/* image helpers                                                       */
/* ------------------------------------------------------------------ */
const png = (buf) => PNG.sync.read(buf);
function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
const LIN = new Float64Array(256); for (let i = 0; i < 256; i++) LIN[i] = lin(i);
const relLum = (r, g, b) => 0.2126 * LIN[r] + 0.7152 * LIN[g] + 0.0722 * LIN[b];
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
function parseColor(s) {
  const m = /rgba?\(([^)]+)\)/.exec(s || '');
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
function quant(arr, q) { if (!arr.length) return null; const s = Float64Array.from(arr).sort(); return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))]; }
function cropPng(img, x, y, w, h) {
  x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
  w = Math.min(img.width - x, Math.round(w)); h = Math.min(img.height - y, Math.round(h));
  const out = new PNG({ width: w, height: h });
  for (let j = 0; j < h; j++) img.data.copy(out.data, j * w * 4, ((y + j) * img.width + x) * 4, ((y + j) * img.width + x + w) * 4);
  return out;
}
function diffPng(a, b, thr) {
  thr = thr == null ? 8 : thr;
  const A = png(a), B = png(b);
  if (A.width !== B.width || A.height !== B.height) return { sameSize: false };
  const n = A.width * A.height; let changed = 0, sum = 0, max = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const d = Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2]));
    if (d > thr) changed++; sum += d; if (d > max) max = d;
  }
  return { sameSize: true, changedPct: +(100 * changed / n).toFixed(3), mean: +(sum / n).toFixed(3), max };
}
/* colour in a shot: the click's split shows as red/blue fringes on white dots */
function chromaStats(buf) {
  const I = png(buf); const d = I.data; let colored = 0, red = 0, blue = 0, lit = 0, sumL = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    sumL += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (mx > 40) lit++;
    if (mx > 50 && mx - mn > 45) { colored++; if (r === mx) red++; else if (b === mx) blue++; }
  }
  const n = d.length / 4;
  return { colored, red, blue, coloredPct: +(100 * colored / n).toFixed(3), litPct: +(100 * lit / n).toFixed(2), meanLum: +(sumL / n).toFixed(2) };
}
function brightCount(buf, thr) { const I = png(buf); let n = 0; for (let i = 0; i < I.data.length; i += 4) if (Math.max(I.data[i], I.data[i + 1], I.data[i + 2]) > thr) n++; return n; }
function meanLumRegion(buf) { const I = png(buf); let s = 0; for (let i = 0; i < I.data.length; i += 4) s += 0.2126 * I.data[i] + 0.7152 * I.data[i + 1] + 0.0722 * I.data[i + 2]; return s / (I.data.length / 4); }

/* ------------------------------------------------------------------ */
/* in-page probes                                                      */
/* ------------------------------------------------------------------ */
function overflowProbe() {
  const de = document.documentElement, b = document.body;
  const vw = de.clientWidth;
  const out = { vw, innerWidth: window.innerWidth, docScrollWidth: de.scrollWidth, bodyScrollWidth: b ? b.scrollWidth : 0, offscreen: [], clipped: [], overlaps: [] };
  const y0 = window.scrollY;
  window.scrollTo(99999, y0); out.canScrollSideways = window.scrollX > 0; out.maxScrollX = window.scrollX; window.scrollTo(0, y0);
  const skip = (el) => el.closest('.sr-only, [aria-hidden="true"], #showcase .sc-slide[style*="hidden"], .bg-blob, .pt-scan-cover, noscript, script, style, svg, #boot, #boot-overlay, #scroll-hint, .window:not(.active)');
  const els = b ? b.querySelectorAll('*') : [];
  const texts = [];
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (skip(el)) continue;
    let ownText = null;
    for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.textContent.trim().length > 1) { ownText = n; break; }
    const media = /^(IMG|CANVAS|BUTTON|INPUT|VIDEO|TABLE|TEXTAREA|SELECT)$/.test(el.tagName);
    if (!ownText && !media) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const name = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
    const desc = { el: name, left: Math.round(r.left), right: Math.round(r.right), text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) };
    let fixed = false; for (let a = el; a && a !== b; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === 'fixed' || p === 'sticky') { fixed = true; break; } }
    if (!fixed && (r.right > vw + 1.5 || r.left < -1.5) && out.offscreen.length < 12) out.offscreen.push(desc);
    if (ownText && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && el.scrollWidth - el.clientWidth > 2 &&
        !el.closest('.word-wrap') && cs.textOverflow !== 'ellipsis' && out.clipped.length < 12) {
      out.clipped.push(Object.assign({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }, desc));
    }
    if (ownText && !fixed) {
      const rects = [];
      for (let n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const q of rg.getClientRects()) if (q.width > 2 && q.height > 2) rects.push({ l: q.left, t: q.top + window.scrollY, r: q.right, b: q.bottom + window.scrollY });
      }
      if (rects.length) texts.push({ el, name, rects, text: desc.text });
    }
  }
  /* text over text: two different text boxes sharing pixels, neither inside the other */
  for (let i = 0; i < texts.length && out.overlaps.length < 12; i++) {
    for (let j = i + 1; j < texts.length && out.overlaps.length < 12; j++) {
      const A = texts[i], B = texts[j];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      let hit = null;
      for (const a of A.rects) {
        for (const c of B.rects) {
          const w = Math.min(a.r, c.r) - Math.max(a.l, c.l), h = Math.min(a.b, c.b) - Math.max(a.t, c.t);
          if (w > 3 && h > 3) {
            const small = Math.min((a.r - a.l) * (a.b - a.t), (c.r - c.l) * (c.b - c.t));
            if (w * h > 0.2 * small) { hit = { a: A.name + ' "' + A.text + '"', b: B.name + ' "' + B.text + '"', area: Math.round(w * h), at: [Math.round(Math.max(a.l, c.l)), Math.round(Math.max(a.t, c.t))] }; break; }
          }
        }
        if (hit) break;
      }
      if (hit) out.overlaps.push(hit);
    }
  }
  return out;
}

async function fontProbe(page) {
  return page.evaluate(async () => {
    try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* none */ }
    const o = { checks: {}, faces: [] };
    const probes = { sans400: "400 16px 'Site Sans'", sans750: "750 100px 'Site Sans'", mono400: "400 11px 'Site Mono'", mono700: "700 100px 'Site Mono'" };
    for (const k in probes) { try { o.checks[k] = document.fonts.check(probes[k]); } catch (e) { o.checks[k] = 'error ' + e; } }
    try { document.fonts.forEach((f) => o.faces.push(String(f.family).replace(/["']/g, '') + ' ' + f.weight + ':' + f.status)); } catch (e) { /* none */ }
    const c = document.createElement('canvas').getContext('2d');
    const m = (font, text) => { c.font = font; return Math.round(c.measureText(text).width * 100) / 100; };
    o.widths = { sans: m("750 100px 'Site Sans'", 'Projects Hudson Tinch 0123456789'), sansFallback: m('750 100px sans-serif', 'Projects Hudson Tinch 0123456789'),
                 mono: m("400 100px 'Site Mono'", 'SELECTED WORK 2019 2026'), monoFallback: m('400 100px monospace', 'SELECTED WORK 2019 2026') };
    const fam = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim() : null; };
    o.used = { body: fam('body'), sectionLabel: fam('.section-label'), heroTitle: fam('.hero-title') };
    return o;
  });
}

/* a layer's share of what is on screen: shot with it and without it */
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
  const a1 = await page.screenshot({ clip });
  await page.waitForTimeout(90);
  const a2 = await page.screenshot({ clip });
  const found = await hideSel(selector, 'data-qa-vis');
  await page.waitForTimeout(160);
  const b = await page.screenshot({ clip });
  await showSel(selector, 'data-qa-vis');
  if (freeze) await showSel(freeze, 'data-qa-frz');
  await page.waitForTimeout(90);
  const hid = diffPng(a2, b, 10), amb = diffPng(a1, a2, 10);
  const paints = found > 0 && hid.sameSize && hid.changedPct >= 0.15 && hid.max >= 18 &&
                 (hid.changedPct > amb.changedPct * 1.5 || hid.mean > amb.mean * 1.5);
  return { found, withoutLayer: hid, ambient: amb, paints };
}

/* viewport screenshots down the page, as a visitor scrolls it */
async function strips(page, dir, id, max) {
  const shots = [];
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = T.viewport.height, step = Math.round(vh * 0.85);
  for (let y = 0, i = 0; i < max && y < total; y += step, i++) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(softwareGL() ? 1400 : 600);
    const f = path.join(dir, `${id}-${String(i).padStart(2, '0')}.jpg`);
    try { await page.screenshot({ path: f, type: 'jpeg', quality: 72, scale: 'css' }); shots.push(rel(f)); } catch (e) { /* no shot */ }
    if (y + vh >= total) break;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return { scrollHeight: total, shots };
}

/* which build the live site is serving right now: the ?v= stamp on its own scripts */
async function liveBuild(context) {
  try {
    const r = await context.request.get(url('/'), { timeout: 20000, headers: { 'cache-control': 'no-cache' } });
    const m = /transitions\.js\?v=([0-9a-f]{7,40})/.exec(await r.text());
    return m ? m[1] : null;
  } catch (e) { return 'error ' + String(e.message || e).slice(0, 80); }
}
const pageBuild = (page) => page.evaluate(() => { const s = document.querySelector('script[src*="transitions.js"]'); const m = s && /[?&]v=([0-9a-f]+)/.exec(s.getAttribute('src')); return m ? m[1] : null; }).catch(() => null);

/* ------------------------------------------------------------------ */
/* group: environment                                                  */
/* ------------------------------------------------------------------ */
async function gEnv(browser) {
  R.version = browser.version();
  const sysCtx = await browser.newContext(ctxOpts({ reducedMotion: null }));
  const p = await sysCtx.newPage();
  await p.goto(url('/no-such-page-env-probe'), { waitUntil: 'load', timeout: 45000 }).catch(() => {});
  const env = await p.evaluate(() => {
    const mm = (q) => matchMedia(q).matches;
    let gl = '';
    try { const g = document.createElement('canvas').getContext('webgl'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); gl = g ? (e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)) : 'no webgl'; } catch (e) { gl = 'error ' + e; }
    return { ua: navigator.userAgent, dpr: devicePixelRatio, inner: innerWidth + 'x' + innerHeight, pointerCoarse: mm('(pointer: coarse)'), hoverNone: mm('(hover: none)'),
             systemReducedMotion: mm('(prefers-reduced-motion: reduce)'), colorSchemeDark: mm('(prefers-color-scheme: dark)'), pagereveal: 'onpagereveal' in window,
             backdropFilter: CSS.supports('backdrop-filter', 'blur(2px)') || CSS.supports('-webkit-backdrop-filter', 'blur(2px)'), webgl: gl };
  });
  await sysCtx.close();
  const c2 = await browser.newContext(ctxOpts());
  const p2 = await c2.newPage();
  await p2.goto('about:blank');
  env.testContextReducedMotion = await p2.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  R.buildAtStart = env.buildAtStart = await liveBuild(c2);
  await c2.close();
  R.env = env;
  add('env', 'browser and emulation', 'info', Object.assign({ version: R.version, channelFallback: R.data.channelFallback || null }, env));
}

/* ------------------------------------------------------------------ */
/* group: every page loads clean, nothing overflows, fonts             */
/* ------------------------------------------------------------------ */
async function gPages(browser) {
  const dir = sub('pages');
  R.data.pages = {};
  for (const pg of PAGES) {
    const context = await browser.newContext(ctxOpts());
    const page = await context.newPage();
    const sink = newSink(); watch(page, sink);
    let status = null, err = null, finalUrl = null;
    const t0 = Date.now();
    try {
      const resp = await page.goto(url(pg.path), { waitUntil: 'load', timeout: 45000 });
      status = resp ? resp.status() : null;
      finalUrl = page.url();
      if (pg.id === 'home') {
        /* the boot ends by itself; let it, as a visitor who does nothing would see it */
        await page.waitForFunction(() => !document.documentElement.classList.contains('booting'), null, { timeout: 10000 }).catch(() => {});
      }
      await page.waitForTimeout(1800);
    } catch (e) { err = String(e.message || e).slice(0, 300); }
    const loadMs = Date.now() - t0;
    let ov = null, fonts = null, frames = null, title = null;
    try { ov = await page.evaluate(overflowProbe); } catch (e) { ov = { error: String(e).slice(0, 200) }; }
    try { fonts = await fontProbe(page); } catch (e) { fonts = { error: String(e).slice(0, 200) }; }
    try { title = await page.title(); } catch (e) { /* none */ }
    try { frames = page.frames().filter((f) => f !== page.mainFrame()).map((f) => f.url()).filter((u) => u && u !== 'about:blank'); } catch (e) { /* none */ }
    let st = null;
    try { st = await strips(page, dir, pg.id, SLOW() ? 5 : (pg.id === 'projects' && !T.touch ? 6 : 14)); } catch (e) { st = { error: String(e).slice(0, 200) }; }
    const issues = classify(sink, pg.expect === 404 ? { expect404: url(pg.path) } : null);
    R.data.pages[pg.id] = { status, finalUrl, loadMs, title, overflow: ov, fonts, iframes: frames, strips: st, errors: issues.real, notOwnedBySite: issues.env };
    const okStatus = pg.expect ? status === pg.expect : status === 200;
    add('pages', `${pg.id}: loads with no errors (HTTP ${status})`, (err || !okStatus || issues.real.length) ? 'fail' : 'pass',
        { status, err, errors: issues.real, notOwnedBySite: issues.env, loadMs, title });
    if (pg.id === 'missing') {
      const own = await page.evaluate(() => !!document.querySelector('.site-header, .nav-links') && /404|not found|lost|nothing/i.test(document.body.innerText)).catch(() => false);
      add('pages', 'missing URL: the site\'s own 404 page', status === 404 && own ? 'pass' : 'fail', { status, ownPage: own, title });
    }
    const bad = ov && !ov.error && (ov.canScrollSideways || ov.offscreen.length || ov.clipped.length);
    const osPage = pg.id === 'desktop' || pg.id === 'mac';
    add('layout', `${pg.id}: no sideways scroll, nothing off-screen or clipped`, ov && ov.error ? 'error' : (bad ? (osPage && !ov.canScrollSideways ? 'info' : 'fail') : 'pass'),
        ov && !ov.error ? { canScrollSideways: ov.canScrollSideways, maxScrollX: ov.maxScrollX, docScrollWidth: ov.docScrollWidth, vw: ov.vw, offscreen: ov.offscreen, clipped: ov.clipped } : ov);
    if (ov && !ov.error) add('layout', `${pg.id}: no text drawn over other text`, ov.overlaps.length ? (osPage ? 'info' : 'warn') : 'pass', ov.overlaps);
    if (fonts && !fonts.error) {
      if (!fonts.faces.length) add('fonts', `${pg.id}: uses its own font stack (${fonts.used.body}), not the site faces`, 'info', fonts);
      else {
        const loaded = ['Site Sans', 'Site Mono'].every((f) => fonts.faces.some((x) => x.indexOf(f) === 0 && /:loaded$/.test(x)));
        /* Site Sans is proportional: drawn in it, the text measures differently from the fallback.
           Site Mono and the fallback monospace share a 0.6 em advance, so its proof is the loaded face. */
        const real = Math.abs(fonts.widths.sans - fonts.widths.sansFallback) > 1 && fonts.used.body === 'Site Sans';
        add('fonts', `${pg.id}: Site Sans and Site Mono load`, loaded && real && fonts.checks.sans400 === true && fonts.checks.mono400 === true ? 'pass' : 'fail', fonts);
      }
    }
    await context.close();
  }
}

/* ------------------------------------------------------------------ */
/* group: home page: boot, hero, sand, click colour, touch, cue, header, links */
/* ------------------------------------------------------------------ */
async function heroPoint(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('.hero'); if (!hero) return null;
    const c = document.getElementById('pcb-canvas');
    const r = hero.getBoundingClientRect(), cr = c ? c.getBoundingClientRect() : null;
    let alpha = null, cw = 0, ch = 0;
    try { const x = c.getContext('2d'); cw = c.width; ch = c.height; alpha = x.getImageData(0, 0, cw, ch).data; } catch (e) { alpha = null; }
    /* dot ink around a screen point: pixels carrying a dot in a 160x110 window */
    const inkAt = (sx, sy) => {
      if (!alpha) return 0;
      const kx = cw / cr.width, ky = ch / cr.height;
      const x0 = Math.max(0, Math.round((sx - cr.left - 80) * kx)), x1 = Math.min(cw, Math.round((sx - cr.left + 80) * kx));
      const y0 = Math.max(0, Math.round((sy - cr.top - 55) * ky)), y1 = Math.min(ch, Math.round((sy - cr.top + 55) * ky));
      let n = 0; for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) if (alpha[(y * cw + x) * 4 + 3] > 16) n++;
      return n;
    };
    const bad = (x, y) => {
      if (x < 8 || y < 8 || x > innerWidth - 8 || y > innerHeight - 8) return true;
      const el = document.elementFromPoint(x, y); if (!el) return true;
      if (el.closest('a, button, input, .site-header, .hero-panel, #scroll-hint')) return true;
      return !hero.contains(el);
    };
    const cands = [];
    for (let fy = 0.1; fy <= 0.92; fy += 0.04) for (let fx = 0.15; fx <= 0.86; fx += 0.07) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (y < 90) continue;
      const m = 50;
      if (bad(x, y) || bad(x - m, y) || bad(x + m, y) || bad(x, y - m) || bad(x, y + m)) continue;
      cands.push({ x: Math.round(x), y: Math.round(y), fx: +fx.toFixed(2), fy: +fy.toFixed(2), ink: inkAt(x, y) });
    }
    if (!cands.length) return null;
    cands.sort((a, b) => b.ink - a.ink);
    const best = cands[0];
    /* the field's brightest dot anywhere, for scale */
    let maxA = 0; if (alpha) for (let i = 3; i < alpha.length; i += 4) if (alpha[i] > maxA) maxA = alpha[i];
    return Object.assign(best, { heroH: Math.round(r.height), heroTop: Math.round(r.top), candidates: cands.length, fieldMaxAlpha: maxA });
  });
}
function clipAround(pt, w, h) {
  const W = T.viewport.width, H = T.viewport.height;
  w = Math.min(w, W); h = Math.min(h, H);
  const x = Math.max(0, Math.min(W - w, Math.round(pt.x - w / 2))), y = Math.max(0, Math.min(H - h, Math.round(pt.y - h / 2)));
  return { x, y, width: w, height: h };
}
/* a finger dragged across the screen. Chromium: real touch input through CDP
   (it scrolls the page like a phone). WebKit: Playwright has no touch-move, so
   the events the hero listens for are dispatched (no native scroll). */
async function fingerDrag(page, context, from, to, steps, ms, scrollWith) {
  if (T.engine === 'chromium') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f }] });
      await page.waitForTimeout(ms / steps);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach().catch(() => {});
    return 'cdp-touch';
  }
  await page.evaluate(async ([a, b, n, dur, scroll]) => {
    const hero = document.querySelector('.hero');
    const ev = (type, x, y) => {
      const e = new Event(type, { bubbles: true, cancelable: false });
      const t = { identifier: 1, clientX: x, clientY: y, pageX: x + scrollX, pageY: y + scrollY, screenX: x, screenY: y, target: hero };
      Object.defineProperty(e, 'touches', { value: type === 'touchend' ? [] : [t] });
      Object.defineProperty(e, 'changedTouches', { value: [t] });
      return e;
    };
    const pe = (type, x, y) => new PointerEvent(type, { bubbles: true, pointerType: 'touch', pointerId: 7, isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 });
    const el = document.elementFromPoint(a.x, a.y) || hero;
    el.dispatchEvent(pe('pointerdown', a.x, a.y)); el.dispatchEvent(ev('touchstart', a.x, a.y));
    let lastY = a.y;
    for (let i = 1; i <= n; i++) {
      const f = i / n, x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
      if (scroll) { window.scrollBy(0, lastY - y); lastY = y; }
      /* as on iOS: once the drag turns into a scroll, pointer events stop and touchmove carries on */
      if (!scroll || i < 2) el.dispatchEvent(pe('pointermove', x, y));
      else if (i === 2) el.dispatchEvent(pe('pointercancel', x, y));
      el.dispatchEvent(ev('touchmove', x, y));
      await new Promise((r) => setTimeout(r, dur / n));
    }
    el.dispatchEvent(ev('touchend', b.x, b.y));
    if (!scroll) el.dispatchEvent(pe('pointerup', b.x, b.y));
  }, [from, to, steps, ms, !!scrollWith]);
  return 'dispatched-events';
}

async function gHome(browser) {
  const dir = sub('home');
  const H = R.data.home = {};

  /* ---- boot splash: what a fresh arrival sees, and how it ends ---- */
  {
    const context = await browser.newContext(ctxOpts());
    const page = await context.newPage();
    const sink = newSink(); watch(page, sink);
    try {
      await page.goto(url('/'), { waitUntil: 'domcontentloaded', timeout: 45000 });
      const t0 = Date.now();                      /* from DOMContentLoaded: the boot starts with the deferred scripts */
      /* the page's own record of when the boot ended, so slow screenshots cannot hide it */
      await page.evaluate(() => { const t = performance.now(); window.__bootEnd = null; const mo = new MutationObserver(() => { if (!document.documentElement.classList.contains('booting') && window.__bootEnd == null) { window.__bootEnd = performance.now(); mo.disconnect(); } }); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); window.__bootT0 = t; });
      const shots = [];
      for (const at of (SLOW() ? [400] : [400, 1300, 2500])) {
        const wait = at - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
        const st = await page.evaluate(() => ({ booting: document.documentElement.classList.contains('booting'), boot: !!document.getElementById('boot') }));
        const f = path.join(dir, `boot-${at}ms.png`);
        await page.screenshot({ path: f, scale: 'css' });
        shots.push(Object.assign({ atMs: Date.now() - t0, file: rel(f) }, st));
      }
      await page.waitForFunction(() => !document.documentElement.classList.contains('booting'), null, { timeout: SLOW() ? 60000 : 12000 }).catch(() => {});
      const be = await page.evaluate(() => ({ end: window.__bootEnd, t0: window.__bootT0, booting: document.documentElement.classList.contains('booting') }));
      let endedMs = be.booting ? null : (be.end != null ? Math.round(be.end - be.t0) : 0);
      const after = await page.evaluate(() => ({ boot: !!document.getElementById('boot'), scrollable: document.documentElement.scrollHeight > innerHeight, overflow: getComputedStyle(document.documentElement).overflow }));
      H.bootNatural = { shots, endedMs, after };
      H.bootNatural.note = 'endedMs counts from DOMContentLoaded';
      add('home', 'boot splash shows on a fresh arrival and ends by itself', shots[0].booting && endedMs != null && endedMs < (SLOW() ? 30000 : 8000) && !after.boot ? 'pass' : 'fail', H.bootNatural);
    } catch (e) { add('home', 'boot splash (natural)', 'error', { error: String(e.stack || e).slice(0, 400) }); }
    /* the input that ends it: a tap on touch, a click on desktop */
    try {
      const page2 = await context.newPage();
      await page2.goto(url('/'), { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page2.waitForTimeout(700);
      const was = await page2.evaluate(() => document.documentElement.classList.contains('booting'));
      const tIn = Date.now();
      const vw = T.viewport.width, vh = T.viewport.height;
      await tapOrClick(page2, vw / 2, vh / 2);
      let goneMs = null;
      while (Date.now() - tIn < 3000) {
        const b = await page2.evaluate(() => document.documentElement.classList.contains('booting') || !!document.getElementById('boot'));
        if (!b) { goneMs = Date.now() - tIn; break; }
        await page2.waitForTimeout(30);
      }
      const where = await page2.evaluate(() => location.pathname);
      H.bootSkip = { wasBooting: was, input: T.touch ? 'tap' : 'click', goneMs, stayedOnHome: where === '/' };
      add('home', `boot splash ends at once on a ${T.touch ? 'tap' : 'click'}`, was && goneMs != null && goneMs < 800 && where === '/' ? 'pass' : 'fail', H.bootSkip);
      if (T.touch && T.engine === 'chromium') {
        const page3 = await context.newPage();
        await page3.goto(url('/'), { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page3.waitForTimeout(700);
        const was3 = await page3.evaluate(() => document.documentElement.classList.contains('booting'));
        const t3 = Date.now();
        await fingerDrag(page3, context, { x: vw / 2, y: vh * 0.7 }, { x: vw / 2, y: vh * 0.3 }, 10, 250, true);
        let gone3 = null;
        while (Date.now() - t3 < 3000) { const b = await page3.evaluate(() => document.documentElement.classList.contains('booting')); if (!b) { gone3 = Date.now() - t3; break; } await page3.waitForTimeout(30); }
        H.bootSwipe = { wasBooting: was3, goneMs: gone3 };
        add('home', 'boot splash ends on a swipe (scroll gesture)', was3 && gone3 != null && gone3 < 1200 ? 'pass' : 'fail', H.bootSwipe);
        await page3.close();
      }
      await page2.close();
    } catch (e) { add('home', 'boot splash (skip)', 'error', { error: String(e.stack || e).slice(0, 400) }); }
    await context.close();
  }

  /* ---- hero, sand, click colour, finger, cue, header, links ---- */
  const context = await browser.newContext(ctxOpts({ acceptDownloads: true }));
  const page = await context.newPage();
  const sink = newSink(); watch(page, sink);
  try {
    await page.goto(url('/'), { waitUntil: 'load', timeout: 45000 });
    await skipBoot(page);
    await page.waitForTimeout(1500);

    /* the dot field */
    const vw = T.viewport.width, vh = T.viewport.height;
    const hero = await page.evaluate(() => { const b = document.querySelector('.hero').getBoundingClientRect(); return { x: 0, y: Math.max(0, Math.round(b.top)), width: Math.round(Math.min(b.width, innerWidth)), height: Math.round(Math.min(b.bottom, innerHeight) - Math.max(0, b.top)) }; });
    const f0 = await page.evaluate(() => (window.__terrainDiag ? window.__terrainDiag.frames : -1));
    await page.waitForTimeout(1000);
    const f1 = await page.evaluate(() => (window.__terrainDiag ? window.__terrainDiag.frames : -1));
    const heroShot = path.join(dir, 'hero.png');
    await page.screenshot({ path: heroShot, scale: 'css' });
    const dots = await layerContribution(page, '#pcb-canvas', hero, '#sand-canvas');
    const tdiag = await page.evaluate(() => (window.__terrainDiag ? { mode: window.__terrainDiag.mode, w: window.__terrainDiag.w, h: window.__terrainDiag.h } : null));
    /* the field's own canvas, read in the test browser: how many pixels carry a dot */
    const ink = await page.evaluate(() => {
      const c = document.getElementById('pcb-canvas'); if (!c) return { found: false };
      const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data;
      let lit = 0, maxA = 0; for (let i = 3; i < d.length; i += 4) { if (d[i] > 16) lit++; if (d[i] > maxA) maxA = d[i]; }
      const cs = getComputedStyle(c);
      return { found: true, w: c.width, h: c.height, litPixels: lit, litPct: +(100 * lit / (c.width * c.height)).toFixed(3), maxAlpha: maxA, shown: cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 };
    });
    H.hero = { framesPerSecond: f1 - f0, diag: tdiag, clip: hero, canvas: ink, contribution: dots, shot: rel(heroShot) };
    const heroDrawn = ink.found && ink.shown && (ink.litPixels > 1500 || ink.litPct >= 0.2);
    if (softwareGL()) H.hero.note = 'software rendering on this machine: the frame rate is indicative';
    add('home', 'hero dot field paints and animates', heroDrawn && f1 - f0 > 20 ? 'pass' : (heroDrawn && softwareGL() ? 'warn' : 'fail'), H.hero);

    /* the sand, behind the About section */
    await page.evaluate(() => { const a = document.getElementById('about'); window.scrollTo(0, a.getBoundingClientRect().top + scrollY - 60); });
    await page.waitForTimeout(1400);
    const s0 = await page.evaluate(() => (window.__sandDiag ? window.__sandDiag.frames : -1));
    await page.waitForTimeout(1000);
    const sd = await page.evaluate(() => (window.__sandDiag ? { mode: window.__sandDiag.mode, frames: window.__sandDiag.frames, rects: window.__sandDiag.rects, err: window.__sandDiag.err, log: window.__sandDiag.log,
                                                                opacity: (document.getElementById('sand-canvas') || {}).style ? document.getElementById('sand-canvas').style.opacity : null, glass: document.documentElement.classList.contains('sand-glass') } : null));
    const sandShot = path.join(dir, 'sand-about.png');
    await page.screenshot({ path: sandShot, scale: 'css' });
    const sand = await layerContribution(page, '#sand-canvas', { x: 0, y: 0, width: vw, height: vh });
    H.sand = { diag: sd, framesPerSecond: sd ? sd.frames - s0 : null, contribution: sand, shot: rel(sandShot) };
    if (softwareGL()) H.sand.note = 'software rendering on this machine: the frame rate is indicative';
    const sandOk = sd && sd.mode === 'webgl' && (sand.paints || sand.withoutLayer.changedPct > 3);
    add('home', 'sand paints and animates behind the cards', sandOk && sd.frames - s0 > 20 ? 'pass' : (sandOk ? 'warn' : 'fail'), H.sand);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1200);

    /* ---- the click / tap: red and blue fringes that clear to white ---- */
    const pt = await heroPoint(page);
    if (!pt) add('home', 'hero click colour', 'error', { error: 'no clear point in the hero away from text and links' });
    else {
      const clip = clipAround(pt, 420, 300);
      const base = await page.screenshot({ clip });
      await page.evaluate(() => {
        const F = window.__fr = { t0: 0, s: [], on: true };
        document.querySelector('.hero').addEventListener('pointerdown', () => { if (!F.t0) F.t0 = performance.now(); }, { capture: true, once: true });
        (function tick() { if (!F.on) return; const d = window.__terrainDiag || {}; F.s.push([performance.now(), d.split || 0]); requestAnimationFrame(tick); })();
      });
      const tc = Date.now();
      await tapOrClick(page, pt.x, pt.y);
      const series = [];
      for (const at of [150, 450, 800, 1200, 1700, 2200, 2700, 3200, 3800]) {
        const wait = at - (Date.now() - tc); if (wait > 0) await page.waitForTimeout(wait);
        const ms = Date.now() - tc;
        const buf = await page.screenshot({ clip });
        const cs = chromaStats(buf);
        let file = null;
        if (at === 150 || at === 450 || at === 1700 || at === 3200) { file = path.join(dir, `click-${at}ms.png`); fs.writeFileSync(file, buf); file = rel(file); }
        series.push(Object.assign({ ms, file }, cs));
      }
      await page.waitForTimeout(300);
      const rec = await page.evaluate(() => { const F = window.__fr; F.on = false; return { t0: F.t0, s: F.s }; });
      const rel0 = rec.t0 || (rec.s.length ? rec.s[0][0] : 0);
      const splitSeries = rec.s.map(([t, n]) => [Math.round(t - rel0), n]).filter(([t]) => t >= -50);
      const splitOn = splitSeries.filter(([, n]) => n > 0);
      const baseCs = chromaStats(base);
      const peak = series.reduce((m, s) => (s.colored > m.colored ? s : m), series[0]);
      const clearedAt = (() => { for (let i = series.length - 1; i >= 0; i--) { if (series[i].colored > Math.max(12, baseCs.colored * 2 + 6)) return i + 1 < series.length ? series[i + 1].ms : null; } return series[0].ms; })();
      H.click = { point: pt, input: T.touch ? 'tap' : 'click', pointerdownSeen: !!rec.t0, baseline: baseCs, series,
                  split: { maxDots: splitOn.length ? Math.max.apply(null, splitOn.map((x) => x[1])) : 0, firstMs: splitOn.length ? splitOn[0][0] : null, lastMs: splitOn.length ? splitOn[splitOn.length - 1][0] : null, frames: splitSeries.length },
                  peakColoredPx: peak.colored, peakAtMs: peak.ms, colouredGoneByMs: clearedAt };
      const fringe = peak.colored > Math.max(40, baseCs.colored * 4);
      const clears = H.click.split.lastMs != null && H.click.split.lastMs <= 3200 && series[series.length - 1].colored <= Math.max(12, baseCs.colored * 2 + 6);
      add('home', `hero ${H.click.input}: red and blue fringes on the rings, back to white within ~3 s`, fringe && clears ? 'pass' : (fringe ? 'warn' : 'fail'), H.click);
    }

    /* ---- a finger on the hero: a sideways drag, then a scroll ---- */
    if (T.touch && pt) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(3500);
      const band = { x: 0, y: Math.max(0, Math.min(vh - 140, pt.y - 70)), width: vw, height: 140 };
      const ctrl = { x: 0, y: Math.max(0, Math.min(vh - 100, pt.y + 180 < vh - 100 ? pt.y + 180 : pt.y - 260)), width: vw, height: 100 };
      const b0 = await page.screenshot({ clip: band }), c0 = await page.screenshot({ clip: ctrl });
      const y0 = await page.evaluate(() => scrollY);
      const how = await fingerDrag(page, context, { x: vw * 0.12, y: pt.y }, { x: vw * 0.88, y: pt.y }, 14, 420, false);
      const t1 = Date.now();
      const after = [];
      for (const at of [80, 1500, 4000, 7500]) {
        const wait = at - (Date.now() - t1); if (wait > 0) await page.waitForTimeout(wait);
        const b = await page.screenshot({ clip: band }), c = await page.screenshot({ clip: ctrl });
        let file = null;
        if (at === 80 || at === 4000) { file = path.join(dir, `drag-sideways-${at}ms.png`); fs.writeFileSync(file, b); file = rel(file); }
        after.push({ ms: Date.now() - t1, bandBright: brightCount(b, 70), controlBright: brightCount(c, 70), bandLum: r2(meanLumRegion(b)), controlLum: r2(meanLumRegion(c)), bandChanged: diffPng(b0, b, 14).changedPct, controlChanged: diffPng(c0, c, 14).changedPct, file });
      }
      const y1 = await page.evaluate(() => scrollY);
      fs.writeFileSync(path.join(dir, 'drag-sideways-before.png'), b0);
      H.dragSideways = { method: how, scrolledPx: y1 - y0, before: { bandBright: brightCount(b0, 70), controlBright: brightCount(c0, 70), bandLum: r2(meanLumRegion(b0)), controlLum: r2(meanLumRegion(c0)) }, after,
                         note: 'bright = device pixels brighter than 70/255 (dot cores); the band follows the finger, the control band is elsewhere in the hero' };
      const bb = H.dragSideways.before.bandBright, cb = H.dragSideways.before.controlBright;
      const vis = after[0].bandBright > bb * 1.5 + 40 && after[0].bandBright - bb > (after[0].controlBright - cb) * 2;
      add('home', 'finger drag sideways across the hero: the field reacts (trace and glow)', vis ? 'pass' : 'warn', H.dragSideways);

      /* a vertical drag is a scroll: does anything show while the page moves? */
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(2500);
      const fr0 = await page.screenshot({ clip: { x: 0, y: 0, width: vw, height: vh } });
      const yA = await page.evaluate(() => scrollY);
      const how2 = await fingerDrag(page, context, { x: vw * 0.5, y: vh * 0.75 }, { x: vw * 0.55, y: vh * 0.45 }, 12, 360, true);
      await page.waitForTimeout(60);
      const fr1 = path.join(dir, 'drag-scroll-after.png');
      await page.screenshot({ path: fr1, scale: 'css' });
      const yB = await page.evaluate(() => scrollY);
      fs.writeFileSync(path.join(dir, 'drag-scroll-before.png'), fr0);
      H.dragScroll = { method: how2, scrolledPx: yB - yA, shot: rel(fr1) };
      add('home', 'finger drag up the hero scrolls the page', yB - yA > 40 ? 'pass' : (T.engine === 'webkit' ? 'info' : 'warn'), H.dragScroll);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(800);
    }

    /* hover: does the field answer a pointer that only moves (desktop) */
    if (!T.touch) {
      const p2 = pt || { x: vw * 0.7, y: vh * 0.35 };
      const clip = clipAround(p2, 360, 260);
      await page.mouse.move(5, vh - 5);
      await page.waitForTimeout(1500);
      const a = await page.screenshot({ clip });
      await page.mouse.move(p2.x - 40, p2.y - 10); await page.mouse.move(p2.x, p2.y, { steps: 8 });
      await page.waitForTimeout(700);
      const b = await page.screenshot({ clip });
      fs.writeFileSync(path.join(dir, 'hover-bloom.png'), b);
      H.hover = { before: r2(meanLumRegion(a)), under: r2(meanLumRegion(b)) };
      add('home', 'pointer hover blooms the field under the cursor', H.hover.under > H.hover.before * 1.2 ? 'pass' : 'warn', H.hover);
      await page.mouse.move(5, vh - 5);
    }
  } catch (e) { add('home', 'hero interactions', 'error', { error: String(e.stack || e).slice(0, 600) }); }

  /* ---- header: sticky, hides on the way down, back on the way up ---- */
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const hd = async () => page.evaluate(() => { const h = document.querySelector('.site-header'); const r = h.getBoundingClientRect(); const cs = getComputedStyle(h);
      const links = Array.from(document.querySelectorAll('.nav-links a')).map((a) => { const q = a.getBoundingClientRect(); return [a.textContent.trim(), Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]; });
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), position: cs.position, hidden: h.classList.contains('nav-hidden'), transform: cs.transform, y: Math.round(scrollY), links,
               logo: (() => { const l = document.querySelector('.nav-logo-text').getBoundingClientRect(); return [Math.round(l.left), Math.round(l.right)]; })() }; });
    const top = await hd();
    for (let y = 100; y <= 900; y += 100) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(60); }
    await page.waitForTimeout(500);
    const down = await hd();
    for (let y = 860; y >= 700; y -= 40) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(60); }
    await page.waitForTimeout(500);
    const up = await hd();
    const upShot = path.join(dir, 'header-after-scroll-up.png');
    await page.screenshot({ path: upShot, scale: 'css', clip: { x: 0, y: 0, width: vwOf(), height: Math.min(T.viewport.height, 220) } });
    H.header = { atTop: top, scrolledDown: down, scrolledUp: up, shot: rel(upShot) };
    const ok = top.top === 0 && (down.hidden && down.bottom <= 1) && (!up.hidden && up.top === 0);
    add('home', 'header: sticky at the top, hides scrolling down, returns scrolling up', ok ? 'pass' : 'warn', H.header);
    const row = top.links.map((l) => l[2]);
    const oneRow = row.every((y) => Math.abs(y - row[0]) < 4);
    const overlapLogo = top.links.some((l) => l[1] < top.logo[1] + 4);
    add('home', 'header: logo and three links fit on one row', oneRow && !overlapLogo ? 'pass' : 'fail', { links: top.links, logo: top.logo, height: top.height });
  } catch (e) { add('home', 'header behaviour', 'error', { error: String(e.stack || e).slice(0, 400) }); }

  /* ---- the scroll cue ---- */
  await cueCheck(page, 'home', dir).catch((e) => add('home', 'scroll cue', 'error', { error: String(e.stack || e).slice(0, 400) }));

  /* ---- links: GitHub, LinkedIn, Email, Resume ---- */
  try {
    await page.goto(url('/'), { waitUntil: 'load', timeout: 45000 });
    await skipBoot(page);
    await page.waitForTimeout(800);
    const links = await page.evaluate(() => {
      const get = (sel) => Array.from(document.querySelectorAll(sel)).map((a) => { const r = a.getBoundingClientRect(); return { label: (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' '), href: a.getAttribute('href'), abs: a.href, target: a.target, rel: a.rel, w: Math.round(r.width), h: Math.round(r.height) }; });
      return { hero: get('.hero-social a'), heroResume: get('.hero-actions a.btn-primary'), contact: get('.contact-actions a'), footer: get('.footer-links a'), navResume: get('.nav-links a[href*="Resume"]') };
    });
    const want = { GitHub: 'https://github.com/Y3t1M', LinkedIn: 'https://linkedin.com/in/hudsontinch', Email: 'mailto:hudson.tinch@gmail.com' };
    const heroOk = Object.keys(want).every((k) => links.hero.some((a) => a.label === k && a.abs.replace(/\/$/, '') === want[k]));
    const grpOk = (g) => g.some((a) => /github\.com\/Y3t1M$/.test(a.abs)) && g.some((a) => /linkedin\.com\/in\/hudsontinch$/.test(a.abs)) && g.some((a) => a.abs === want.Email);
    const newTab = links.hero.filter((a) => a.label !== 'Email').every((a) => a.target === '_blank' && /noopener/.test(a.rel));
    H.links = links;
    add('home', 'GitHub, LinkedIn and Email links point to the right places (hero, contact, footer)', heroOk && grpOk(links.contact) && grpOk(links.footer) && newTab ? 'pass' : 'fail', links);
    /* does GitHub answer */
    try { const r = await context.request.get('https://github.com/Y3t1M', { timeout: 20000 }); H.github = { status: r.status() }; } catch (e) { H.github = { error: String(e).slice(0, 120) }; }
    add('home', 'GitHub profile answers', H.github.status === 200 ? 'pass' : 'warn', H.github);
    await resumeCheck(context, page, dir, 'home');
  } catch (e) { add('home', 'links', 'error', { error: String(e.stack || e).slice(0, 400) }); }

  const issues = classify(sink);
  add('home', 'no errors during the home checks', issues.real.length ? 'fail' : 'pass', { errors: issues.real, notOwnedBySite: issues.env });
  await context.close();
}
function vwOf() { return T.viewport.width; }

/* The Resume button. Build 02cb82c: it opens the PDF in a new tab everywhere.
   Build 7f50b2a adds a click handler (transitions.js): on a computer it also saves a copy;
   Firefox and Safari save only (they open a downloaded PDF themselves), Chrome and Edge do both;
   phones and tablets only open the tab. The check expects what the served build says. */
async function resumeCheck(context, page, dir, group) {
  const build = await pageBuild(page);
  const env = await page.evaluate(() => ({ desk: matchMedia('(hover: hover) and (pointer: fine)').matches, ua: navigator.userAgent }));
  const kind = /Firefox\//.test(env.ua) ? 'firefox' : ((/Safari\//.test(env.ua) && !/(Chrome|Chromium|CriOS|FxiOS|Edg|OPR)\//.test(env.ua)) ? 'safari' : 'chromium');
  const expect = build === '02cb82c' ? { tab: true, save: false, why: 'build 02cb82c: new tab only' }
    : (!env.desk ? { tab: true, save: false, why: 'touch: new tab only' }
      : (kind === 'chromium' ? { tab: true, save: true, why: 'desktop Chrome/Edge: new tab and a saved copy' }
        : { tab: false, save: true, why: 'desktop ' + kind + ': a saved copy only, the browser opens it itself' }));
  const downloads = [], popups = [], pdfReqs = [];
  const onDl = (from) => (d) => downloads.push({ from, d });
  const pageDl = onDl('page');
  page.on('download', pageDl);
  const onPage = (p) => { if (p === page) return; popups.push(p); p.on('download', onDl('new tab')); };
  context.on('page', onPage);
  const onReq = (r) => { if (!/Resume\.pdf/.test(r.url())) return; let from = null; try { from = r.frame().page() === page ? 'page' : 'new tab'; } catch (e) { from = r.isNavigationRequest() ? 'new-tab navigation' : null; } pdfReqs.push({ url: r.url(), from }); };
  context.on('request', onReq);
  /* what the site itself asks for: a click on a hidden a[download] (the saved copy), and whether the
     original click was cancelled (the tab suppressed). Headless browsers also turn a PDF tab into a
     download event, so download events alone cannot tell the two apart. */
  await page.evaluate(() => {
    window.__qaDl = [];
    const P = HTMLAnchorElement.prototype;
    if (!P.__qaWrapped) {
      const o = P.click;
      P.click = function () { if (this.hasAttribute('download')) window.__qaDl.push({ href: this.href, name: this.getAttribute('download') }); return o.apply(this, arguments); };
      P.__qaWrapped = true;
    }
    window.__qaPrevented = null;
    if (!window.__qaClickHook) {
      window.__qaClickHook = true;
      /* registered after the site's own document listener, so it sees what that listener decided */
      document.addEventListener('click', (e) => { const a = e.target && e.target.closest && e.target.closest('a[href*="Resume"]'); if (a && !a.hasAttribute('download')) window.__qaPrevented = e.defaultPrevented; });
    }
  });
  const btn = page.locator('.hero-actions a.btn-primary, a.btn-primary[href*="Resume"], .nav-links a[href*="Resume"]').first();
  let clickErr = null;
  try { await tapLocator(btn); } catch (e) { clickErr = String(e.message || e).slice(0, 200); }
  await page.waitForTimeout(4500);
  const siteAsked = await page.evaluate(() => ({ saveRequests: window.__qaDl ? window.__qaDl.slice() : null, tabSuppressed: window.__qaPrevented })).catch(() => ({ saveRequests: null, tabSuppressed: null }));
  const tabs = [];
  for (const p of popups) {
    const o = { url: null, closedByBrowser: p.isClosed() };
    try { o.url = p.url(); } catch (e) { /* closed */ }
    if (!p.isClosed()) {
      const f = path.join(dir, `resume-tab-${tabs.length + 1}.png`);
      await p.screenshot({ path: f, scale: 'css', timeout: 8000 }).then(() => { o.shot = rel(f); }).catch(() => {});
      await p.close().catch(() => {});
    }
    tabs.push(o);
  }
  const saved = [];
  for (const x of downloads) {
    const o = { from: x.from, file: x.d.suggestedFilename(), url: x.d.url() };
    try { const pth = await x.d.path(); const buf = fs.readFileSync(pth); o.bytes = buf.length; o.magic = buf.slice(0, 5).toString('latin1'); } catch (e) { o.err = String(e.message || e).slice(0, 120); }
    saved.push(o);
  }
  page.off('download', pageDl); context.off('page', onPage); context.off('request', onReq);
  /* the saved copy is what the site asked for (a[download] clicked); every download that happened must be the PDF */
  const asked = (siteAsked.saveRequests || []).length;
  const observed = { tab: tabs.length > 0, save: asked > 0, tabSuppressed: siteAsked.tabSuppressed, downloadsSeen: saved.length };
  const savedOk = saved.every((x) => x.file === 'Hudson-Tinch-Resume.pdf' && x.magic === '%PDF-') && (!asked || saved.length > 0);
  const res = { build, kind, desktopPointer: env.desk, expected: expect, observed, siteSaveRequests: siteAsked.saveRequests, tabs, downloads: saved, pdfRequests: pdfReqs, clickErr,
                note: 'a saved copy = the site clicking a hidden a[download]; headless browsers also report the PDF tab itself as a download, so raw download events over-count' };
  R.data.resume = R.data.resume || [];
  R.data.resume.push(res);
  add(group, `Resume button (build ${build}): ${expect.why}`, !clickErr && observed.tab === expect.tab && observed.save === expect.save && savedOk ? 'pass' : 'fail', res);
  return res;
}
async function gResume(browser) {
  const dir = sub('resume');
  const context = await browser.newContext(ctxOpts({ acceptDownloads: true }));
  const page = await context.newPage();
  const sink = newSink(); watch(page, sink);
  try {
    await page.goto(url('/'), { waitUntil: 'load', timeout: 45000 });
    await skipBoot(page);
    await page.waitForTimeout(1200);
    await resumeCheck(context, page, dir, 'resume');
    /* the header link on the projects page goes through the same handler */
    await page.goto(url('/projects'), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1500);
    await resumeCheck(context, page, dir, 'resume');
  } catch (e) { add('resume', 'Resume check', 'error', { error: String(e.stack || e).slice(0, 400) }); }
  const iss = classify(sink);
  add('resume', 'no errors during the Resume checks', iss.real.length ? 'fail' : 'pass', { errors: iss.real, notOwnedBySite: iss.env });
  await context.close();
}

/* the cue: where it sits at the top of the page, what text it covers */
async function cueCheck(page, pageId, dir) {
  await page.goto(url(pageId === 'home' ? '/' : '/projects'), { waitUntil: 'load', timeout: 45000 });
  await skipBoot(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(3400);
  const probe = () => page.evaluate(() => {
    const h = document.getElementById('scroll-hint'); if (!h) return null;
    const r = h.getBoundingClientRect(); const cs = getComputedStyle(h);
    const hits = [];
    if (+cs.opacity > 0.05) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode; if (!n.textContent.trim()) continue;
        const el = n.parentElement; if (!el || h.contains(el) || el.closest('.sr-only, [aria-hidden="true"], script, style, noscript')) continue;
        const st = getComputedStyle(el); if (st.visibility !== 'visible' || +st.opacity === 0) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const q of rg.getClientRects()) {
          const w = Math.min(q.right, r.right) - Math.max(q.left, r.left), hh = Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top);
          if (w > 1 && hh > 1) { hits.push({ text: n.textContent.trim().replace(/\s+/g, ' ').slice(0, 50), el: el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0], overlapPx: Math.round(w * hh) }); break; }
        }
      }
    }
    return { rect: [r.left, r.top, r.width, r.height].map(Math.round), opacity: +(+cs.opacity).toFixed(2), cls: h.className, scrollY: Math.round(scrollY), fx: document.documentElement.classList.contains('fx'), hits };
  });
  const atTop = await probe();
  const f = path.join(dir, `cue-${pageId}-top.png`);
  const vh = T.viewport.height;
  await page.screenshot({ path: f, clip: { x: 0, y: Math.max(0, vh - 220), width: T.viewport.width, height: Math.min(220, vh) } });
  /* a little way in: still there? */
  const res = { atTop, topShot: rel(f), steps: [] };
  for (const y of [40, 120, 400, vh, Math.round(vh * 1.6)]) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(900);
    const p = await probe();
    if (p && p.opacity > 0.05 && p.hits.length) {
      const g = path.join(dir, `cue-${pageId}-y${y}.png`);
      await page.screenshot({ path: g, clip: { x: 0, y: Math.max(0, vh - 220), width: T.viewport.width, height: Math.min(220, vh) } });
      p.shot = rel(g);
    }
    res.steps.push(p);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  res.backAtTop = await probe();
  R.data['cue-' + pageId] = res;
  const covering = [atTop].concat(res.steps).filter((p) => p && p.opacity > 0.05 && p.hits.length);
  add(pageId === 'home' ? 'home' : 'projects', `scroll cue (${pageId}): shows at the top and never sits over text`, !atTop ? 'fail' : (covering.length ? 'fail' : (atTop.opacity > 0.5 ? 'pass' : 'warn')),
      { atTop, coveringText: covering.map((p) => ({ scrollY: p.scrollY, opacity: p.opacity, hits: p.hits, shot: p.shot })), backAtTop: res.backAtTop });
}

/* ------------------------------------------------------------------ */
/* group: readability of the home cards                                */
/* ------------------------------------------------------------------ */
async function cardInfo(page, sel, k) {
  return page.evaluate(([s, i]) => {
    const c = document.querySelectorAll(s)[i];
    const r = c.getBoundingClientRect();
    let op = 1; for (let e = c; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const lines = [];
    const roles = [['h3', 'h3'], ['p', 'p'], ['.project-card-tag', 'tag']];
    for (const [q, role] of roles) {
      c.querySelectorAll(q).forEach((el) => {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
          const n = w.currentNode; if (!n.textContent.trim()) continue;
          const pcs = getComputedStyle(n.parentElement);
          const rg = document.createRange(); rg.selectNodeContents(n);
          for (const q2 of rg.getClientRects()) if (q2.width > 2 && q2.height > 2) lines.push({ role, x: q2.left - r.left, y: q2.top - r.top, w: q2.width, h: q2.height, color: pcs.color, size: pcs.fontSize, weight: pcs.fontWeight, opacity: +pcs.opacity });
        }
      });
    }
    const cs = getComputedStyle(c);
    return { rect: { x: r.left, y: r.top, w: r.width, h: r.height }, vh: innerHeight, opacity: op, p: c.style.getPropertyValue('--p'), bg: cs.backgroundColor, backdrop: cs.backdropFilter || cs.webkitBackdropFilter || 'none',
             transform: cs.transform, glass: document.documentElement.classList.contains('sand-glass'), fx: document.documentElement.classList.contains('fx'), title: (c.querySelector('h3') || {}).textContent, lines };
  }, [sel, k]);
}
/* scroll-fx eases a card's opacity toward its scroll position; on a slow machine that takes seconds */
async function settleOpacity(page, sel, k, maxMs) {
  const t0 = Date.now(); let last = -1, op = -1;
  while (Date.now() - t0 < (maxMs || 9000)) {
    op = await page.evaluate(([s, i]) => { const c = document.querySelectorAll(s)[i]; let o = 1; for (let e = c; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; }, [sel, k]);
    if (Math.abs(op - last) < 0.004) break;
    last = op; await page.waitForTimeout(350);
  }
  return { opacity: op, ms: Date.now() - t0 };
}
async function centreCard(page, sel, k, where) {
  await page.evaluate(([s, i, w]) => {
    const c = document.querySelectorAll(s)[i]; const r = c.getBoundingClientRect();
    const top = w === 'centre' ? (innerHeight - r.height) / 2 : (w === 'upper' ? innerHeight * 0.18 : innerHeight * 0.62);
    window.scrollTo(0, Math.max(0, Math.round(r.top + scrollY - top)));
  }, [sel, k, where]);
}
/* one card: text colour against what is behind it, over many frames of moving sand */
async function measureCard(page, sel, k, dir, tag, saveCrop) {
  await centreCard(page, sel, k, 'centre');
  await page.waitForTimeout(700);
  const settled = await settleOpacity(page, sel, k);
  const info = await cardInfo(page, sel, k);
  const vw = T.viewport.width, vh = T.viewport.height;
  const clip = { x: Math.max(0, Math.floor(info.rect.x)), y: Math.max(0, Math.floor(info.rect.y)), width: 0, height: 0 };
  clip.width = Math.min(vw - clip.x, Math.ceil(info.rect.w + (info.rect.x - clip.x)));
  clip.height = Math.min(vh - clip.y, Math.ceil(info.rect.h + (info.rect.y - clip.y)));
  const offX = info.rect.x - clip.x, offY = info.rect.y - clip.y;
  /* text visible: the real thing, and the close-up */
  const vis = [];
  for (let i = 0; i < (SLOW() ? 1 : 3); i++) { vis.push(await page.screenshot({ clip })); await page.waitForTimeout(140); }
  let crop = null;
  if (saveCrop) { crop = path.join(dir, `${tag}-closeup.png`); fs.writeFileSync(crop, vis[0]); crop = rel(crop); }
  /* text hidden: only what is behind it */
  await page.evaluate(([s, i]) => {
    const c = document.querySelectorAll(s)[i]; c.setAttribute('data-qa-bg', '1');
    const st = document.createElement('style'); st.id = 'qa-hide-text';
    st.textContent = '[data-qa-bg] *, [data-qa-bg] { color: transparent !important; text-shadow: none !important; } [data-qa-bg] svg { visibility: hidden !important; }';
    document.head.appendChild(st);
  }, [sel, k]);
  await page.waitForTimeout(150);
  const bgs = [];
  for (let i = 0; i < (SLOW() ? 4 : 10); i++) { bgs.push(await page.screenshot({ clip })); await page.waitForTimeout(SLOW() ? 400 : 260); }
  await page.evaluate(() => { const st = document.getElementById('qa-hide-text'); if (st) st.remove(); document.querySelectorAll('[data-qa-bg]').forEach((e) => e.removeAttribute('data-qa-bg')); });
  const info2 = await cardInfo(page, sel, k);
  /* per role: every background pixel under every line of text, every frame */
  const dsfX = png(bgs[0]).width / clip.width, dsfY = png(bgs[0]).height / clip.height;
  const roles = {};
  for (const L of info.lines) {
    const tc = parseColor(L.color); if (!tc) continue;
    const role = roles[L.role] || (roles[L.role] = { color: L.color, size: L.size, weight: L.weight, alpha: tc.a, ratios: [], bgLum: [], bgMax: 0, textLumModel: [], glyph: [] });
    const o = info.opacity * tc.a * (L.opacity || 1);
    const x0 = Math.max(0, Math.floor((L.x + offX) * dsfX)), y0 = Math.max(0, Math.floor((L.y + offY) * dsfY));
    const x1 = Math.ceil((L.x + offX + L.w) * dsfX), y1 = Math.ceil((L.y + offY + L.h) * dsfY);
    for (const buf of bgs) {
      const I = png(buf);
      for (let y = y0; y < Math.min(y1, I.height); y += 1) {
        for (let x = x0; x < Math.min(x1, I.width); x += 1) {
          const q = (y * I.width + x) * 4, br = I.data[q], bg = I.data[q + 1], bb = I.data[q + 2];
          const Lb = relLum(br, bg, bb);
          const tr = Math.round(o * tc.r + (1 - o) * br), tg = Math.round(o * tc.g + (1 - o) * bg), tb = Math.round(o * tc.b + (1 - o) * bb);
          const Lt = relLum(tr, tg, tb);
          role.ratios.push(ratio(Lt, Lb)); role.bgLum.push(Lb);
          if (Math.max(br, bg, bb) > role.bgMax) role.bgMax = Math.max(br, bg, bb);
          if ((x + y) % 7 === 0) role.textLumModel.push(Lt);
        }
      }
    }
    /* the glyphs as drawn: the brightest pixels inside the line box */
    for (const buf of vis) {
      const I = png(buf); const ls = [];
      for (let y = y0; y < Math.min(y1, I.height); y++) for (let x = x0; x < Math.min(x1, I.width); x++) { const q = (y * I.width + x) * 4; ls.push(relLum(I.data[q], I.data[q + 1], I.data[q + 2])); }
      if (ls.length) role.glyph.push(quant(ls, 0.985));
    }
  }
  const out = { card: tag, title: (info.title || '').trim(), opacity: r2(info.opacity), opacityAfter: r2(info2.opacity), settleMs: settled.ms, p: info.p, bg: info.bg, backdrop: info.backdrop, glass: info.glass, fx: info.fx,
                rect: { x: Math.round(info.rect.x), y: Math.round(info.rect.y), w: Math.round(info.rect.w), h: Math.round(info.rect.h) }, frames: bgs.length, closeup: crop, roles: {} };
  for (const k2 of Object.keys(roles)) {
    const ro = roles[k2];
    const lumToGrey = (L) => { /* the sRGB grey with this luminance */ let lo = 0, hi = 255; while (lo < hi) { const m = (lo + hi) >> 1; if (LIN[m] < L) lo = m + 1; else hi = m; } return lo; };
    const glyphLum = ro.glyph.length ? ro.glyph.reduce((a, b) => a + b, 0) / ro.glyph.length : null;
    const bgMed = quant(ro.bgLum, 0.5);
    out.roles[k2] = { color: ro.color, size: ro.size, weight: ro.weight, effectiveTextOpacity: r2(info.opacity * ro.alpha), pixels: ro.ratios.length,
                      contrast: { min: r2(quant(ro.ratios, 0)), p1: r2(quant(ro.ratios, 0.01)), p5: r2(quant(ro.ratios, 0.05)), median: r2(quant(ro.ratios, 0.5)) },
                      bgGrey: { median: lumToGrey(bgMed), p95: lumToGrey(quant(ro.bgLum, 0.95)), max: lumToGrey(quant(ro.bgLum, 1)), maxChannel: ro.bgMax },
                      textGreyModel: lumToGrey(quant(ro.textLumModel, 0.5)), textGreyMeasured: glyphLum == null ? null : lumToGrey(glyphLum),
                      measuredGlyphContrast: glyphLum == null ? null : r2(ratio(glyphLum, bgMed)) };
  }
  return out;
}
async function gReadability(browser) {
  const dir = sub('readability');
  const context = await browser.newContext(ctxOpts());
  const page = await context.newPage();
  const sink = newSink(); watch(page, sink);
  const RD = R.data.readability = { about: [], project: [], profile: null };
  try {
    await page.goto(url('/'), { waitUntil: 'load', timeout: 45000 });
    await skipBoot(page);
    await page.waitForFunction(() => window.__sandDiag && window.__sandDiag.frames > 30, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    const nA = await page.evaluate(() => document.querySelectorAll('.about-card').length);
    for (let k = 0; k < nA; k++) RD.about.push(await measureCard(page, '.about-card', k, dir, `about-${k + 1}`, k === 1));
    const nP = await page.evaluate(() => document.querySelectorAll('.project-card').length);
    for (let k = 0; k < nP; k++) RD.project.push(await measureCard(page, '.project-card', k, dir, `project-${k + 1}`, k === 0));
    /* how bright a card is at three places on the screen (desktop dims cards that are not yet "arrived") */
    const prof = [];
    for (const where of ['lower', 'centre', 'upper']) {
      await centreCard(page, '.about-card', 1, where);
      await page.waitForTimeout(700);
      await settleOpacity(page, '.about-card', 1);
      const ci = await cardInfo(page, '.about-card', 1);
      prof.push({ where, cardTopPx: Math.round(ci.rect.y), cardTopPctOfScreen: Math.round(100 * ci.rect.y / ci.vh), opacity: r2(ci.opacity), p: ci.p });
    }
    RD.profile = prof;
    /* summary per card type and role */
    const sum = (list) => {
      const o = {};
      for (const c of list) for (const role of Object.keys(c.roles)) {
        const x = c.roles[role];
        const s = o[role] || (o[role] = { color: x.color, size: x.size, mins: [], p1: [], p5: [], med: [], opac: [], bgMax: [], textMeasured: [], textModel: [] });
        s.mins.push(x.contrast.min); s.p1.push(x.contrast.p1); s.p5.push(x.contrast.p5); s.med.push(x.contrast.median); s.opac.push(x.effectiveTextOpacity); s.bgMax.push(x.bgGrey.max);
        if (x.textGreyMeasured != null) s.textMeasured.push(x.textGreyMeasured); s.textModel.push(x.textGreyModel);
      }
      for (const role of Object.keys(o)) {
        const s = o[role];
        o[role] = { color: s.color, size: s.size, worstMin: Math.min.apply(null, s.mins), worstP1: Math.min.apply(null, s.p1), worstP5: Math.min.apply(null, s.p5),
                    typical: r2(s.med.reduce((a, b) => a + b, 0) / s.med.length), opacity: s.opac, brightestBgGrey: Math.max.apply(null, s.bgMax), textGreyMeasured: s.textMeasured, textGreyModel: s.textModel };
      }
      return o;
    };
    RD.summary = { about: sum(RD.about), project: sum(RD.project) };
    const bodyA = RD.summary.about.p, bodyP = RD.summary.project.p;
    const status = (b) => (b && b.worstP1 >= 4.5 ? 'pass' : 'warn');
    add('readability', `About cards: body text contrast (typical ${bodyA ? bodyA.typical : '?'}:1, lowest 1% ${bodyA ? bodyA.worstP1 : '?'}:1)`, status(bodyA), { summary: RD.summary.about, profile: prof });
    add('readability', `Project cards: body text contrast (typical ${bodyP ? bodyP.typical : '?'}:1, lowest 1% ${bodyP ? bodyP.worstP1 : '?'}:1)`, status(bodyP), RD.summary.project);
  } catch (e) { add('readability', 'card measurement', 'error', { error: String(e.stack || e).slice(0, 600) }); }
  const issues = classify(sink);
  if (issues.real.length) add('readability', 'errors during the readability pass', 'fail', issues.real);
  await context.close();
}

/* ------------------------------------------------------------------ */
/* group: navigation, the scan-line transition, the LED title           */
/* ------------------------------------------------------------------ */
/* runs in the test browser before any page script (from xb.js, trimmed):
   per-frame log of the title canvas, the cover and the scan line */
function instrumentation() {
  if (window.__qa || window.top !== window) return;
  const perfNow = performance.now.bind(performance);
  const t = () => Math.round(perfNow() * 10) / 10;
  const LOG = []; let frameNo = 0;
  const push = (k, d) => { if (LOG.length < 6000) LOG.push(Object.assign({ t: t(), f: frameNo, k }, d || {})); };
  const recs = []; const REC = Symbol('qaRec');
  function recOf(canvas) { let r = canvas[REC]; if (!r) { r = { n: recs.length + 1, el: canvas, type: '', blank: true, everDrawn: false, ops: 0, resets: 0, blankFrames: 0, blankSpans: 0, inBlank: false, blankStart: 0 }; try { canvas[REC] = r; } catch (e) { /* frozen */ } recs.push(r); } return r; }
  const nameOf = (r) => { try { return r.el.id ? '#' + r.el.id : (r.el.className ? '.' + String(r.el.className).split(' ')[0] : 'canvas' + r.n); } catch (e) { return 'canvas' + r.n; } };
  const CP = HTMLCanvasElement.prototype; const origGet = CP.getContext;
  CP.getContext = function (type) { const ctx = origGet.apply(this, arguments); if (ctx) { const r = recOf(this); if (!r.type) r.type = String(type); } return ctx; };
  ['width', 'height'].forEach((prop) => {
    const d = Object.getOwnPropertyDescriptor(CP, prop); if (!d || !d.set) return;
    Object.defineProperty(CP, prop, { configurable: true, enumerable: d.enumerable, get() { return d.get.call(this); },
      set(v) { const r = recOf(this); d.set.call(this, v); r.blank = true; r.resets++; if (this.isConnected) push('size', { c: nameOf(r), p: prop, to: d.get.call(this) }); } });
  });
  const P2 = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (P2) {
    ['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage', 'putImageData', 'fillText', 'strokeText'].forEach((name) => {
      const o = P2[name]; if (!o) return;
      P2[name] = function (text) {
        const c = this.canvas;
        if (c) { const r = c[REC] || recOf(c); r.blank = false; r.everDrawn = true; r.ops++;
          if ((name === 'fillText' || name === 'strokeText') && c.id === 'pt-led') { let loaded = null; try { loaded = document.fonts.check(this.font, String(text)); } catch (e) { /* bad font */ } push('text', { c: nameOf(r), loaded }); } }
        return o.apply(this, arguments);
      };
    });
    const oClear = P2.clearRect;
    P2.clearRect = function (x, y, w, h) {
      const c = this.canvas;
      if (c) { const r = c[REC] || recOf(c); let full = false;
        try { const m = this.getTransform(); full = (x * m.a + m.e) <= 0.5 && (y * m.d + m.f) <= 0.5 && ((x + w) * m.a + m.e) >= c.width - 0.5 && ((y + h) * m.d + m.f) >= c.height - 0.5; } catch (e) { full = x <= 0 && y <= 0 && w >= c.width && h >= c.height; }
        if (full) r.blank = true; }
      return oClear.apply(this, arguments);
    };
  }
  ['load', 'pageshow', 'pagereveal'].forEach((ev) => window.addEventListener(ev, (e) => { if (e.target !== window && e.target !== document) return; push('ev', { ev, vt: e.viewTransition ? true : undefined, persisted: e.persisted }); }, true));
  let lastCls = null;
  const clsPoll = () => { const de = document.documentElement; if (!de) return; const c = de.className; if (c !== lastCls) { lastCls = c; push('class', { html: c }); } };
  try { new MutationObserver(clsPoll).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); } catch (e) { /* no root */ }
  const TX = [];
  function txPoll() {
    const de = document.documentElement;
    if (!de) return;
    const covered = de.classList.contains('pt-covered');
    const cov = document.querySelector('.pt-scan-cover'), line = document.querySelector('.pt-scan-line');
    if (!covered && !cov && !line) { if (TX.length && TX[TX.length - 1].on) TX.push({ t: t(), f: frameNo, on: false }); return; }
    const o = { t: t(), f: frameNo, on: true, covered, cover: !!cov };
    try {
      if (cov) { const cs = getComputedStyle(cov); if (cs.transform && cs.transform !== 'none') o.coverY = Math.round(new DOMMatrixReadOnly(cs.transform).m42); }
      if (line) { const ls = getComputedStyle(line); o.lineY = ls.transform && ls.transform !== 'none' ? Math.round(new DOMMatrixReadOnly(ls.transform).m42 * 10) / 10 : 0; }
    } catch (e) { o.err = String(e).slice(0, 80); }
    if (TX.length < 400) TX.push(o);
  }
  const GRIDS = []; let lastGrid = null;
  function afterPaint() {
    clsPoll(); txPoll();
    for (const r of recs) {
      let shown = false; try { shown = r.el.isConnected && r.el.offsetParent !== null; } catch (e) { /* gone */ }
      const blankNow = shown && r.everDrawn && r.blank;
      if (blankNow) { r.blankFrames++; if (!r.inBlank) { r.inBlank = true; r.blankSpans++; r.blankStart = t(); push('blank', { c: nameOf(r), state: 'start' }); } }
      else if (r.inBlank) { r.inBlank = false; push('blank', { c: nameOf(r), state: 'end', ms: Math.round((t() - r.blankStart) * 10) / 10 }); }
    }
    const mq = window.__marquee;
    if (mq && mq.grid) { let g = null; try { g = mq.grid(); } catch (e) { /* not built */ } if (g && g !== lastGrid) { lastGrid = g; push('grid', { cols: g.cols, rows: g.rows, lit: g.lit.length }); if (GRIDS.length < 10) GRIDS.push({ cols: g.cols, rows: g.rows, lit: g.lit.slice() }); } }
  }
  const mc = new MessageChannel(); mc.port1.onmessage = afterPaint;
  const raf = window.requestAnimationFrame.bind(window);
  (function qaFrame() { raf(qaFrame); frameNo++; mc.port2.postMessage(0); })();
  window.__qa = { log: LOG, tx: TX, grids: GRIDS,
    recs: () => recs.map((r) => ({ name: nameOf(r), type: r.type, ops: r.ops, resets: r.resets, blankFrames: r.blankFrames, blankSpans: r.blankSpans })) };
}
async function exportQa(page) {
  return page.evaluate(() => ({ log: window.__qa.log.slice(), recs: window.__qa.recs(), tx: window.__qa.tx.slice(), grids: window.__qa.grids.map((g) => ({ cols: g.cols, rows: g.rows, lit: g.lit })),
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, vh: innerHeight, html: document.documentElement.className, url: location.pathname }));
}
function arrivalMetrics(d) {
  const log = d.log;
  const isLed = (e) => /#pt-led/.test(e.c || '');
  const widthSets = log.filter((e) => e.k === 'size' && isLed(e) && e.p === 'width');
  const blanks = log.filter((e) => e.k === 'blank' && isLed(e));
  const texts = log.filter((e) => e.k === 'text');
  const led = d.recs.find((r) => /#pt-led/.test(r.name)) || {};
  const gridShapes = new Set(d.grids.map((g) => g.cols + 'x' + g.rows + ':' + g.lit.length));
  const tx = d.tx || []; const on = tx.filter((s) => s.on); const lines = on.filter((s) => s.lineY != null);
  let maxGap = 0; for (let i = 1; i < lines.length; i++) maxGap = Math.max(maxGap, lines[i].t - lines[i - 1].t);
  const m = {
    titleBuilds: widthSets.length, titleDrawsInFallbackFace: texts.filter((e) => e.loaded === false).length,
    blankSpans: blanks.filter((e) => e.state === 'start').length, blankFrames: led.blankFrames || 0,
    blankMs: Math.round(blanks.filter((e) => e.state === 'end').reduce((s, e) => s + e.ms, 0) * 10) / 10,
    gridVersions: gridShapes.size, litDots: d.grids.length ? d.grids[d.grids.length - 1].lit.length : 0,
    viewTransition: log.some((e) => e.k === 'ev' && e.ev === 'pagereveal' && e.vt), pagereveal: log.some((e) => e.k === 'ev' && e.ev === 'pagereveal'),
    arrivedCovered: log.some((e) => e.k === 'class' && /pt-covered/.test(e.html)),
    transition: on.length ? { coverFrames: on.filter((s) => s.cover || s.covered).length, firstSeenMs: on[0].t, lineFrames: lines.length, firstLineY: lines.length ? lines[0].lineY : null,
                              lineMaxGapMs: Math.round(maxGap), series: lines.slice(0, 40).map((s) => [Math.round(s.t), Math.round(s.lineY), s.coverY == null ? null : s.coverY]) } : null,
    reduced: d.reduced
  };
  m.clean = m.titleBuilds === 1 && m.titleDrawsInFallbackFace === 0 && m.blankSpans === 0 && m.gridVersions <= 1 && m.litDots > 300;
  return m;
}
async function navClick(page, label) {
  const loc = page.locator('.nav-links a.nav-link', { hasText: label }).first();
  await tapLocator(loc);
}
/* the line in a frame: a bright 1 px row across most of the width; the cover: rows of flat page colour */
function lineInFrame(buf) {
  const img = png(buf); const W = img.width, Hh = img.height, d = img.data;
  const lum = (x, y) => { const o = (y * W + x) * 4; return 0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]; };
  const xs = []; for (let x = Math.round(W * 0.03); x < W * 0.97; x += Math.max(2, Math.round(W / 240))) xs.push(x);
  let best = -1, bestFrac = 0;
  for (let y = 0; y < Hh - 1; y++) { let n = 0; for (const x of xs) if (Math.max(lum(x, y), lum(x, y + 1)) > 150) n++; const f = n / xs.length; if (f > bestFrac) { bestFrac = f; best = y; } }
  const lineY = bestFrac >= 0.6 ? best : null;
  const flatRow = (y) => { let n = 0; for (const x of xs) if (lum(x, y) < 20) n++; return n / xs.length > 0.985; };
  let flat = 0, tot = 0; for (let y = 0; y < Hh; y += 6) { tot++; if (flatRow(y)) flat++; }
  let below = null; if (lineY != null) { let k = 0, t2 = 0; for (let y = lineY + 14; y < Hh; y += 6) { t2++; if (flatRow(y)) k++; } below = t2 ? +(k / t2).toFixed(2) : null; }
  return { lineYcss: lineY == null ? null : Math.round(lineY * T.viewport.height / Hh), lineFrac: +bestFrac.toFixed(2), flatAll: +(flat / tot).toFixed(2), coverBelow: below };
}
async function gNav(browser) {
  const dir = sub('nav');
  const N = R.data.nav = { arrivals: [], returns: [], burst: null };
  /* ---- A. three Home -> Projects -> Home round trips with a video and the per-frame log ---- */
  {
    const vd = path.join(dir, 'video');
    const context = await browser.newContext(ctxOpts({ recordVideo: { dir: vd, size: { width: T.viewport.width, height: T.viewport.height } } }));
    await context.addInitScript(instrumentation);
    const page = await context.newPage();
    const sink = newSink(); watch(page, sink);
    const v0 = Date.now();
    const clicks = [];
    try {
      await page.goto(url('/'), { waitUntil: 'load', timeout: 45000 });
      await skipBoot(page);
      await page.waitForTimeout(1500);
      for (let n = 1; n <= 3; n++) {
        clicks.push({ n, to: 'projects', ms: Date.now() - v0 });
        await Promise.all([page.waitForURL(/projects/, { waitUntil: 'load', timeout: NAV_MS() }), navClick(page, 'Projects')]);
        await page.waitForTimeout(2600);
        const m = arrivalMetrics(await exportQa(page));
        m.n = n; m.cache = n === 1 ? 'cold' : 'warm';
        const st = await page.evaluate(() => ({ url: location.pathname, cover: !!document.querySelector('.pt-scan-cover') || document.documentElement.classList.contains('pt-covered'), led: document.documentElement.classList.contains('pt-led'), lit: window.__marquee && window.__marquee.grid && window.__marquee.grid() ? window.__marquee.grid().lit.length : 0 }));
        m.state = st;
        N.arrivals.push(m);
        if (n === 1) { const f = path.join(dir, 'projects-arrived.png'); await page.screenshot({ path: f, scale: 'css' }); }
        clicks.push({ n, to: 'home', ms: Date.now() - v0 });
        await Promise.all([page.waitForURL((u) => !/projects/.test(u.pathname), { waitUntil: 'load', timeout: NAV_MS() }), navClick(page, 'Home')]);
        await page.waitForTimeout(1800);
        const h = await page.evaluate(() => ({ url: location.pathname, booting: document.documentElement.classList.contains('booting'), cover: !!document.querySelector('.pt-scan-cover') || document.documentElement.classList.contains('pt-covered'), hero: !!document.querySelector('.hero-title'), frames: window.__terrainDiag ? window.__terrainDiag.frames : 0 }));
        const hm = arrivalMetrics(await exportQa(page));
        N.returns.push({ n, state: h, transition: hm.transition, viewTransition: hm.viewTransition, arrivedCovered: hm.arrivedCovered });
        if (n === 1) { const f = path.join(dir, 'home-returned.png'); await page.screenshot({ path: f, scale: 'css' }); }
      }
    } catch (e) { add('nav', 'round trips', 'error', { error: String(e.stack || e).slice(0, 600) }); }
    const vid = page.video();
    await context.close();
    if (vid) { try { N.video = rel(await vid.path()); } catch (e) { /* none */ } }
    N.clicks = clicks;
    fs.writeFileSync(path.join(dir, 'clicks.json'), JSON.stringify({ video: N.video || null, clicks }));
    const iss = classify(sink);
    const A = N.arrivals;
    add('nav', 'Home -> Projects -> Home, three times: each page arrives, nothing stuck', A.length === 3 && A.every((m) => /projects/.test(m.state.url) && !m.state.cover && m.state.led) && N.returns.every((r) => r.state.url === '/' && !r.state.booting && !r.state.cover && r.state.hero) ? 'pass' : 'fail',
        { arrivals: A.map((m) => m.state), returns: N.returns.map((r) => r.state) });
    add('nav', 'no errors across the round trips', iss.real.length ? 'fail' : 'pass', { errors: iss.real, notOwnedBySite: iss.env });
    add('projects', 'LED title on arrival from the nav: drawn once, in the site face, never blank', A.length && A.every((m) => m.clean) ? 'pass' : 'fail',
        A.map((m) => ({ n: m.n, cache: m.cache, builds: m.titleBuilds, fallbackFaceDraws: m.titleDrawsInFallbackFace, blankSpans: m.blankSpans, blankMs: m.blankMs, gridVersions: m.gridVersions, litDots: m.litDots })));
    add('nav', 'page transition as the page saw it (evidence)', 'info', { path: A.length ? (A[0].viewTransition ? 'native view transition' : (A[0].arrivedCovered ? 'cover and sweep (no view transitions)' : (A[0].pagereveal ? 'pagereveal without a view transition: no sweep' : 'none'))) : null,
        arrivals: A.map((m) => ({ n: m.n, viewTransition: m.viewTransition, arrivedCovered: m.arrivedCovered, transition: m.transition })), returns: N.returns.map((r) => ({ n: r.n, viewTransition: r.viewTransition, arrivedCovered: r.arrivedCovered, transition: r.transition })) });
  }
  /* ---- B. a burst of screenshots through one arrival: is the line on screen, and where ---- */
  if (!SLOW()) {
    const context = await browser.newContext(ctxOpts());
    const page = await context.newPage();
    try {
      await page.goto(url('/'), { waitUntil: 'load', timeout: 45000 });
      await skipBoot(page);
      await page.waitForTimeout(1500);
      /* warm the cache, as the second visit of a session */
      await Promise.all([page.waitForURL(/projects/, { waitUntil: 'load', timeout: NAV_MS() }), navClick(page, 'Projects')]);
      await page.waitForTimeout(1500);
      await Promise.all([page.waitForURL((u) => !/projects/.test(u.pathname), { waitUntil: 'load', timeout: NAV_MS() }), navClick(page, 'Home')]);
      await page.waitForTimeout(1500);
      const bd = sub('nav/burst');
      const shots = [];
      const t0 = Date.now();
      const nav = navClick(page, 'Projects').catch(() => {});
      while (Date.now() - t0 < 2200) {
        const ms = Date.now() - t0;
        try { const buf = await page.screenshot({ scale: 'css', timeout: 1500 }); shots.push({ ms, buf }); } catch (e) { /* between documents */ }
      }
      await nav;
      await page.waitForTimeout(600);
      const series = shots.map((s, i) => {
        const f = path.join(bd, `burst-${String(i).padStart(3, '0')}-${s.ms}ms.png`);
        fs.writeFileSync(f, s.buf);
        return Object.assign({ ms: s.ms, file: rel(f) }, lineInFrame(s.buf));
      });
      N.burst = series;
      add('nav', 'screenshot burst through one arrival (evidence)', 'info', { shots: series.length, lineSeenIn: series.filter((s) => s.lineYcss != null).length, series: series.map((s) => [s.ms, s.lineYcss, s.flatAll, s.coverBelow]),
          note: T.engine === 'chromium' ? 'headless Chromium screenshots taken during a view transition show a grey veil that the recorded video does not: the video is the evidence' : undefined });
    } catch (e) { add('nav', 'burst', 'error', { error: String(e.stack || e).slice(0, 400) }); }
    await context.close();
  }
  if (/^win-/.test(TNAME)) await navSystemMotion(browser);
}

/* what an arrival looks like with the machine's own motion setting (Windows: "Animation effects") */
async function navSystemMotion(browser) {
  const N = R.data.nav;
  const context = await browser.newContext(ctxOpts({ reducedMotion: null }));
  await context.addInitScript(instrumentation);
  const page = await context.newPage();
  try {
    await page.goto(url('/'), { waitUntil: 'load', timeout: 45000 });
    await skipBoot(page);
    await page.waitForTimeout(1200);
    await Promise.all([page.waitForURL(/projects/, { waitUntil: 'load', timeout: NAV_MS() }), navClick(page, 'Projects')]);
    await page.waitForTimeout(2400);
    const m = arrivalMetrics(await exportQa(page));
    N.systemMotion = { reduced: m.reduced, viewTransition: m.viewTransition, arrivedCovered: m.arrivedCovered, transition: m.transition, titleClean: m.clean };
    add('nav', `arrival with the machine's own motion setting (prefers-reduced-motion: ${m.reduced ? 'reduce' : 'no-preference'})`, 'info', N.systemMotion);
  } catch (e) { add('nav', 'arrival with system motion setting', 'error', { error: String(e.stack || e).slice(0, 400) }); }
  await context.close();
}

/* ------------------------------------------------------------------ */
/* group: projects                                                     */
/* ------------------------------------------------------------------ */
async function seat(page, i, maxMs) {
  await page.evaluate((k) => window.scrollTo({ top: Math.round(window.__corridor.stationY(k)), behavior: 'instant' }), i);
  const t0 = Date.now(); let last = null, stable = 0, m = null;
  while (Date.now() - t0 < (maxMs || 9000)) {
    await page.waitForTimeout(150);
    m = await page.evaluate((k) => {
      const c = window.__corridor, sl = document.querySelectorAll('#showcase .sc-slide')[k];
      const stage = document.querySelector('#showcase .sc-stage');
      if (!c || !sl || !stage) return null;
      const plate = sl.querySelector('.case, .case-grid') || sl;
      const pr = plate.getBoundingClientRect(), sb = stage.getBoundingClientRect();
      const hd = document.querySelector('.site-header'); const hb = hd ? hd.getBoundingClientRect() : null;
      return { active: c.active(), isActive: sl.classList.contains('active'), op: +sl.style.opacity, cx: pr.left + pr.width / 2, cy: pr.top + pr.height / 2, stageCx: sb.left + sb.width / 2,
               top: pr.top, bottom: pr.bottom, left: pr.left, right: pr.right, vw: innerWidth, vh: innerHeight, headerBottom: hb && !hd.classList.contains('nav-hidden') ? hb.bottom : 0 };
    }, i);
    if (!m) continue;
    if (last && m.active === i && Math.abs(m.cx - last.cx) < 0.3 && Math.abs(m.cy - last.cy) < 0.3) { if (++stable >= 2) break; } else stable = 0;
    last = m;
  }
  return m;
}
async function gProjects(browser) {
  const dir = sub('projects');
  const P = R.data.projects = {};
  const context = await browser.newContext(ctxOpts());
  const page = await context.newPage();
  const sink = newSink(); watch(page, sink);
  try {
    await page.goto(url('/projects'), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500);
    const head = path.join(dir, 'head.png');
    await page.screenshot({ path: head, scale: 'css' });
    const st = await page.evaluate(() => ({ fx: document.documentElement.classList.contains('fx'), mode: window.__corridor ? window.__corridor.mode : null, led: document.documentElement.classList.contains('pt-led'), fail: document.documentElement.classList.contains('pt-fail'),
      lit: window.__marquee && window.__marquee.grid && window.__marquee.grid() ? window.__marquee.grid().lit.length : 0, rows: document.querySelectorAll('#proj-index li button').length,
      title: (() => { const b = document.getElementById('proj-title').getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; })() }));
    P.state = st; P.head = rel(head);
    add('projects', `LED title drawn on a direct load (${st.lit} dots)`, st.led && !st.fail && st.lit > 300 ? 'pass' : 'fail', st);
    if (st.fx) {
      /* the desktop corridor */
      const N = await page.evaluate(() => window.__corridor.N);
      const seats = [];
      for (let i = 0; i < N; i++) {
        const m = await seat(page, i);
        await page.waitForTimeout(i === 0 || i === 4 ? 2300 : 900);
        const f = path.join(dir, `station-${i + 1}.jpg`);
        await page.screenshot({ path: f, type: 'jpeg', quality: 72, scale: 'css' });
        const centred = m && Math.abs(m.cx - m.stageCx) <= 2.5;
        const fits = m && m.top >= m.headerBottom - 1 && m.bottom <= m.vh + 1 && m.left >= -1 && m.right <= m.vw + 1;
        const cue = await page.evaluate(() => { const h = document.getElementById('scroll-hint'); return h ? +getComputedStyle(h).opacity : null; });
        seats.push({ station: i + 1, active: !!(m && m.active === i && m.isActive), centred: !!centred, fits: !!fits, opacity: m ? m.op : null, top: m ? Math.round(m.top) : null, bottom: m ? Math.round(m.bottom) : null, cueOpacity: cue, shot: rel(f) });
        if (i === 0) {
          const fig = await layerContribution(page, '.ghost-led, .sc-ghost canvas', { x: 0, y: 0, width: T.viewport.width, height: T.viewport.height });
          P.figure = fig;
          add('projects', 'corridor: the giant dot-matrix figure paints behind station 1', fig.paints ? 'pass' : 'fail', fig);
        }
        if (i === 4) {
          const views = await page.evaluate(() => (window.__projDots ? window.__projDots.views() : null));
          const pics = await layerContribution(page, '.case-dots', { x: 0, y: 0, width: T.viewport.width, height: T.viewport.height });
          P.hardware = { views, pics };
          const allLit = views && views.length === 3 && views.every((v) => v.ready && !v.dead && v.rev >= 0.99 && v.w > 10);
          add('projects', 'corridor: the three Hardware photos draw as LED dots', pics.paints && allLit ? 'pass' : 'fail', P.hardware);
        }
      }
      P.seats = seats;
      add('projects', `corridor: all ${N} stations seat, centred, fully on screen`, seats.length === 6 && seats.every((s) => s.active && s.centred && s.fits && s.opacity === 1) ? 'pass' : 'fail', seats);
      /* the index jumps */
      const jumps = [];
      for (const k of [2, 5]) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.waitForTimeout(700);
        await page.locator('#proj-index li button').nth(k).click();
        let ok = false; const t0 = Date.now();
        while (Date.now() - t0 < 9000) {
          await page.waitForTimeout(200);
          const a = await page.evaluate((kk) => { const c = window.__corridor; return { active: c.active(), target: Math.round(c.stationY(kk)), y: Math.round(pageYOffset) }; }, k);
          if (a.active === k && Math.abs(a.y - a.target) <= 2) { ok = true; break; }
        }
        jumps.push({ row: k + 1, landed: ok, ms: Date.now() - t0 });
      }
      add('projects', 'index rows jump to their station', jumps.every((j) => j.landed) ? 'pass' : 'fail', jumps);
    } else {
      /* touch: the plain vertical flow */
      const flow = await page.evaluate(() => {
        const slides = Array.from(document.querySelectorAll('#showcase .sc-slide'));
        return { slides: slides.map((s) => { const r = s.getBoundingClientRect(); return { w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), vis: getComputedStyle(s).visibility }; }), vw: innerWidth,
                 caseFont: (() => { const p = document.querySelector('#showcase .case p'); return p ? getComputedStyle(p).fontSize + ' / ' + getComputedStyle(p).lineHeight : null; })(),
                 sand: window.__sandDiag ? window.__sandDiag.mode : null };
      });
      P.flow = flow;
      const inside = flow.slides.length === 6 && flow.slides.every((s) => s.left >= -1 && s.right <= flow.vw + 1 && s.vis === 'visible' && s.w > 200);
      add('projects', 'touch: plain vertical flow, all six projects inside the screen', inside && st.rows === 6 ? 'pass' : 'fail', Object.assign({ rows: st.rows }, flow));
      const shots = [];
      for (let i = 0; i < 6; i++) {
        await page.evaluate((k) => { const s = document.querySelectorAll('#showcase .sc-slide')[k]; window.scrollTo(0, Math.max(0, s.getBoundingClientRect().top + scrollY - 70)); }, i);
        await page.waitForTimeout(700);
        const f = path.join(dir, `slide-${i + 1}.jpg`);
        await page.screenshot({ path: f, type: 'jpeg', quality: 72, scale: 'css' });
        shots.push(rel(f));
      }
      P.slideShots = shots;
      const tapRow = async (k) => {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(600);
        await tapLocator(page.locator('#proj-index li button').nth(k));
        await page.waitForTimeout(2200);
        return page.evaluate((kk) => { const s = document.querySelectorAll('#showcase .sc-slide')[kk].getBoundingClientRect(); const h = document.querySelector('.site-header').getBoundingClientRect(); return { row: kk + 1, top: Math.round(s.top), headerBottom: Math.round(h.bottom), vh: innerHeight }; }, k);
      };
      const j = [await tapRow(2), await tapRow(5)];
      add('projects', 'touch: index rows scroll to their project', j.every((x) => x.top > -5 && x.top < x.vh * 0.5) ? 'pass' : 'fail', j);
      /* the hardware photos still draw on touch */
      await page.evaluate(() => { const s = document.querySelectorAll('#showcase .sc-slide')[4]; window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 70); });
      await page.waitForTimeout(2500);
      const views = await page.evaluate(() => (window.__projDots ? window.__projDots.views() : null));
      P.hardwareViews = views;
      add('projects', 'touch: the Hardware photos draw', views && views.length === 3 && views.every((v) => v.ready && !v.dead) ? 'pass' : 'warn', views);
    }
  } catch (e) { add('projects', 'projects checks', 'error', { error: String(e.stack || e).slice(0, 600) }); }
  /* the scroll cue on this page */
  await cueCheck(page, 'projects', dir).catch((e) => add('projects', 'scroll cue', 'error', { error: String(e.stack || e).slice(0, 400) }));
  const iss = classify(sink);
  add('projects', 'no errors on the projects page', iss.real.length ? 'fail' : 'pass', { errors: iss.real, notOwnedBySite: iss.env });
  await context.close();
}

/* ------------------------------------------------------------------ */
/* group: RH Agentic request link                                      */
/* ------------------------------------------------------------------ */
async function gRh(browser) {
  const dir = sub('rh');
  const context = await browser.newContext(ctxOpts());
  const page = await context.newPage();
  const sink = newSink(); watch(page, sink);
  try {
    await page.goto(url('/demos/rh-agentic'), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1500);
    const link = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a')).find((x) => /request a demo/i.test(x.textContent));
      if (!a) return null;
      a.scrollIntoView({ block: 'center' });
      const r = a.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { text: a.textContent.trim(), href: a.getAttribute('href'), w: Math.round(r.width), h: Math.round(r.height), onTop: !!(top && (top === a || a.contains(top))) };
    });
    const f = path.join(dir, 'rh-agentic.png');
    await page.screenshot({ path: f, scale: 'css' });
    let parsed = null;
    if (link && /^mailto:/.test(link.href)) { const u = new URL(link.href); parsed = { to: decodeURIComponent(u.pathname), subject: u.searchParams.get('subject'), body: u.searchParams.get('body'), rawHasAmpEntity: /&amp;/.test(link.href) }; }
    R.data.rh = { link, parsed, shot: rel(f) };
    const ok = parsed && parsed.to === 'hudson@hollisbloom.com' && /RH Agentic/.test(parsed.subject || '') && (parsed.body || '').length > 10 && !parsed.rawHasAmpEntity && link.onTop;
    add('rh', '"Request a demo" is a working mailto (address, subject and body)', ok ? 'pass' : 'fail', R.data.rh);
  } catch (e) { add('rh', 'request link', 'error', { error: String(e.stack || e).slice(0, 400) }); }
  const iss = classify(sink);
  add('rh', 'no errors on the RH Agentic page', iss.real.length ? 'fail' : 'pass', { errors: iss.real, notOwnedBySite: iss.env });
  await context.close();
}

/* ------------------------------------------------------------------ */
/* group: tap targets (touch) / click targets (desktop, for reference) */
/* ------------------------------------------------------------------ */
async function gTaps(browser) {
  const context = await browser.newContext(ctxOpts());
  const page = await context.newPage();
  R.data.taps = {};
  for (const pg of PAGES.filter((p) => ['home', 'projects', 'rh-agentic', 'neatfreak', 'resume', 'missing'].includes(p.id))) {
    try {
      await page.goto(url(pg.path), { waitUntil: 'load', timeout: 45000 });
      await skipBoot(page);
      await page.waitForTimeout(1500);
      const t = await page.evaluate(() => {
        const out = [];
        const els = document.querySelectorAll('a[href], button, [role="button"], input, select, textarea, summary, label[for]');
        for (const el of els) {
          if (el.closest('.sr-only, [aria-hidden="true"], .hidden, #boot, noscript')) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility !== 'visible' || cs.display === 'none' || +cs.opacity === 0 || cs.pointerEvents === 'none') continue;
          let hid = false; for (let a = el.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) { hid = true; break; } }
          if (hid) continue;
          const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
          const inline = cs.display === 'inline' && el.parentElement && /^(P|LI|SPAN|TD)$/.test(el.parentElement.tagName) && (el.parentElement.textContent || '').trim().length > (el.textContent || '').trim().length + 20;
          out.push({ label: (el.getAttribute('aria-label') || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40), tag: el.tagName.toLowerCase(), cls: String(el.className || '').split(' ')[0], w: Math.round(r.width), h: Math.round(r.height), inline });
        }
        return out;
      });
      const small = t.filter((x) => !x.inline && (x.w < 44 || x.h < 44));
      const tiny = t.filter((x) => !x.inline && (x.w < 24 || x.h < 24));
      R.data.taps[pg.id] = { total: t.length, under44: small.length, under24: tiny.length, smallest: small.sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h)).slice(0, 14), inlineLinks: t.filter((x) => x.inline).length };
    } catch (e) { R.data.taps[pg.id] = { error: String(e).slice(0, 200) }; }
  }
  const tot = Object.values(R.data.taps).reduce((s, x) => s + (x.under44 || 0), 0);
  const tiny = Object.values(R.data.taps).reduce((s, x) => s + (x.under24 || 0), 0);
  add('taps', `${T.touch ? 'tap' : 'click'} targets: ${tot} under 44 px, ${tiny} under 24 px (inline text links excluded)`, T.touch ? (tiny ? 'fail' : (tot ? 'warn' : 'pass')) : 'info', R.data.taps);
  await context.close();
}

/* ------------------------------------------------------------------ */
/* group: frame pacing                                                 */
/* ------------------------------------------------------------------ */
function pacer() {
  if (window.__pace || window.top !== window) return;
  const P = window.__pace = { on: false, dts: [], last: 0, long: 0 };
  const raf = window.requestAnimationFrame.bind(window);
  (function tick(ts) { raf(tick); if (P.on && P.last) P.dts.push(Math.round((ts - P.last) * 100) / 100); P.last = ts; })(0);
  try { new PerformanceObserver((l) => { if (P.on) P.long += l.getEntries().length; }).observe({ type: 'longtask', buffered: false }); } catch (e) { P.long = null; }
}
function paceStats(dts) {
  if (!dts.length) return { frames: 0 };
  const s = dts.slice().sort((a, b) => a - b); const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const sum = dts.reduce((a, b) => a + b, 0);
  return { frames: dts.length, fps: +(1000 * dts.length / sum).toFixed(1), median: q(0.5), p95: q(0.95), max: s[s.length - 1], over33ms: dts.filter((d) => d > 33.4).length, over50ms: dts.filter((d) => d > 50).length };
}
async function gPerf(browser) {
  const context = await browser.newContext(ctxOpts());
  await context.addInitScript(pacer);
  const page = await context.newPage();
  const PF = R.data.perf = {};
  const vw = T.viewport.width, vh = T.viewport.height;
  const run = async (name, fn, ms) => {
    await page.evaluate(() => { window.__pace.dts.length = 0; window.__pace.long = 0; window.__pace.on = true; });
    await fn(ms);
    const r = await page.evaluate(() => { window.__pace.on = false; return { dts: window.__pace.dts.slice(), long: window.__pace.long }; });
    PF[name] = Object.assign(paceStats(r.dts), { longTasks: r.long });
  };
  try {
    await page.goto(url('/'), { waitUntil: 'load', timeout: 45000 });
    await skipBoot(page);
    await page.waitForTimeout(2000);
    await run('homeIdle', (ms) => page.waitForTimeout(ms), 3000);
    if (!T.touch) {
      await run('homeHeroPointer', async (ms) => { const t0 = Date.now(); let k = 0; while (Date.now() - t0 < ms) { k++; await page.mouse.move(vw / 2 + vw * 0.36 * Math.sin(k / 9), vh * 0.45 + vh * 0.25 * Math.cos(k / 13)); await page.waitForTimeout(16); } }, 3500);
    }
    await run('homeScroll', async () => { const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight); for (let y = 0; y < H; y += 24) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(16); } }, 0);
    if (!T.touch) {
      await page.goto(url('/projects'), { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(2500);
      const runway = await page.evaluate(() => (window.__corridor ? Math.round(window.__corridor.stationY(5) + 200) : 0));
      await page.mouse.move(vw / 2, vh / 2);
      await run('corridorWheel', async () => { let y = 0; while (y < runway) { await page.mouse.wheel(0, 100); y += 100; await page.waitForTimeout(40); } await page.waitForTimeout(800); }, 0);
    }
    add('perf', 'frame pacing (rAF intervals; indicative)', 'info', PF);
  } catch (e) { add('perf', 'frame pacing', 'error', { error: String(e.stack || e).slice(0, 400) }); }
  await context.close();
}

/* ------------------------------------------------------------------ */
/* run                                                                 */
/* ------------------------------------------------------------------ */
const GROUPS = [['env', gEnv], ['pages', gPages], ['home', gHome], ['readability', gReadability], ['nav', gNav], ['projects', gProjects], ['rh', gRh], ['taps', gTaps], ['perf', gPerf], ['resume', gResume]];
(async () => {
  console.log(`=== ${TNAME} (${T.label}) -> ${BASE}`);
  let browser;
  try { browser = await launch(); }
  catch (e) { add('launch', 'browser starts', 'error', { error: String(e.message || e).slice(0, 600) }); process.exit(1); }
  const ORDER = (process.env.ORDER || '').split(',').map((x) => x.trim()).filter(Boolean);
  const groups = ORDER.length ? ORDER.map((id) => GROUPS.find((g) => g[0] === id)).filter(Boolean) : GROUPS;
  if (ORDER.length && !ORDER.includes('env')) groups.unshift(GROUPS[0]);
  const BUDGET = +(process.env.BUDGET_MIN || 0) * 60000, runT0 = Date.now();
  for (const [id, fn] of groups) {
    if (ONLY.length && !ONLY.includes(id) && id !== 'env') continue;
    if (BUDGET && Date.now() - runT0 > BUDGET) { add(id, 'skipped: the run reached its time budget', 'info', { budgetMin: BUDGET / 60000 }); continue; }
    const t0 = Date.now();
    console.log(` -- ${id}`);
    try { await fn(browser); } catch (e) { add(id, 'group did not complete', 'error', { error: String(e.stack || e).slice(0, 1200) }); }
    R.data[id + 'Seconds'] = Math.round((Date.now() - t0) / 1000);
    save();
    if (!browser.isConnected()) { try { browser = await launch(); } catch (e) { break; } }
  }
  try { const c = await browser.newContext(); R.buildAtEnd = await liveBuild(c); await c.close(); } catch (e) { R.buildAtEnd = 'error'; }
  await browser.close().catch(() => {});
  R.finished = new Date().toISOString();
  if (R.buildAtStart !== R.buildAtEnd) console.log(`  !! the live build changed during this run: ${R.buildAtStart} -> ${R.buildAtEnd}`);
  const count = (s) => R.checks.filter((c) => c.status === s).length;
  R.totals = { pass: count('pass'), fail: count('fail'), warn: count('warn'), error: count('error'), info: count('info') };
  save();
  console.log(`=== ${TNAME}: ` + JSON.stringify(R.totals));
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
