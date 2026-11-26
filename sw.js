/* ============================================================
   OFFLINE: sw.js

   Hudson, 2026-11-25: "the page should cache the data like
   monkeytype does so if the WiFi goes out the webpage still
   opens". This service worker keeps a copy of the site in the
   visitor's browser:

   - pages (the HTML): from the network first, so a deploy shows
     at once; the copy is used when the network is down or takes
     longer than 3.5 s
   - files the deploy stamps with ?v=<stamp> (css, js), and the
     fonts: kept as they are, since a new deploy gives them a new
     address
   - everything else on the site (images, the PDF, audio): the
     saved copy at once, refreshed in the background

   On install it saves the home page, the Projects page and every
   file those two pages name, so the second visit already works
   offline. Other pages are saved as they are visited. Nothing
   from another site is touched.

   To change how it behaves, bump VERSION: old caches are cleared
   when the new worker takes over. To switch it off for everyone,
   replace this file with one that unregisters itself.
   ============================================================ */
const VERSION = 'v1';
const PAGES = 'ht-pages-' + VERSION, FILES = 'ht-files-' + VERSION;
const CORE = ['/', '/projects.html'];
const NET_WAIT = 3500;

/* one key per page however it was asked for: /, /index.html -> /;  /projects.html, /projects -> /projects */
function pageKey(url) {
  const u = new URL(url, self.location.origin);
  let p = u.pathname.replace(/\.html$/, '');
  if (p === '/index' || p === '') p = '/';
  else if (p.endsWith('/index')) p = p.slice(0, -5);
  return u.origin + p;
}
/* a followed redirect cannot be handed to a page later, so keep a plain copy of it */
async function plain(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}
const ok = res => res && res.ok && res.status === 200 && res.type === 'basic';

/* the files a page names: stylesheets, scripts, fonts, images, the PDF */
function filesIn(html, base) {
  const out = new Set();
  html.replace(/\b(?:src|href)\s*=\s*"([^"#]+)"/g, (m, raw) => {
    let u; try { u = new URL(raw, base); } catch (e) { return m; }
    if (u.origin !== self.location.origin) return m;
    if (/\.(css|js|mjs|woff2?|ttf|otf|png|jpe?g|webp|avif|gif|svg|ico|pdf|json|webmanifest|mp3|ogg|wav|m4a)$/i.test(u.pathname)) out.add(u.href);
    return m;
  });
  return [...out];
}
async function saveFiles(urls) {
  const c = await caches.open(FILES);
  await Promise.all(urls.map(async u => { try { if (await c.match(u, { ignoreVary: true })) return; const r = await fetch(u); if (ok(r)) await c.put(u, await plain(r)); } catch (e) {} }));
}
/* After a deploy the old ?v=<stamp> copies are dead weight, unless a saved page still names them (a page saved before
   the deploy needs its own files to open offline). Runs once per deploy seen, not on every page view. */
let lastStamp = '';
async function prune(html) {
  const m = html.match(/\?v=([0-9a-f]{7,40})"/); if (!m || m[1] === lastStamp) return; lastStamp = m[1];
  const pages = await caches.open(PAGES), files = await caches.open(FILES), keep = new Set();
  for (const req of await pages.keys()) { const r = await pages.match(req); if (r) filesIn(await r.text(), req.url).forEach(u => keep.add(u)); }
  for (const req of await files.keys()) { const v = new URL(req.url).searchParams.get('v'); if (v && /^[0-9a-f]{7,40}$/.test(v) && !keep.has(req.url)) await files.delete(req); }
}
/* keep the worker alive for background saving when the event still allows it; the saving runs either way */
function later(e, job) { try { e.waitUntil(job); } catch (x) {} return job; }
const MATCH = { ignoreVary: true };

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const pages = await caches.open(PAGES);
    for (const path of CORE) {
      try {
        const r = await fetch(path, { cache: 'no-cache' }); if (!r.ok) continue;
        const copy = await plain(r), html = await copy.clone().text();
        await pages.put(pageKey(r.url || path), copy);
        await saveFiles(filesIn(html, r.url || self.location.origin + path));
      } catch (x) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('ht-') && k !== PAGES && k !== FILES) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function page(e) {
  const req = e.request, key = pageKey(req.url), pages = await caches.open(PAGES);
  const net = fetch(req).then(async r => {
    if (ok(r) && !r.redirected) {
      const copy = r.clone(); later(e, (async () => { await pages.put(key, copy.clone()); const html = await copy.text(); await saveFiles(filesIn(html, req.url)); await prune(html); })().catch(() => {}));
    }
    return r;
  });
  const saved = await pages.match(key, MATCH);
  if (!saved) return net;
  /* online and quick: the fresh page. Down or slow: the saved one. */
  return Promise.race([net.catch(() => saved), new Promise(res => setTimeout(() => res(saved), NET_WAIT))]).then(r => r || saved);
}

async function file(e) {
  const req = e.request, c = await caches.open(FILES), u = new URL(req.url);
  const fixed = u.searchParams.has('v') && /\.(css|js|mjs)$/.test(u.pathname) || /\/assets\/fonts\//.test(u.pathname);
  const saved = await c.match(req, MATCH);
  const refresh = () => fetch(req).then(async r => { if (ok(r)) await c.put(req, await plain(r.clone())); return r; });
  if (saved) { if (!fixed) later(e, refresh().catch(() => {})); return saved; }   /* a fixed file is never fetched again */
  return refresh();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.headers.has('range')) return;                 /* audio and video seeking: leave to the browser */
  if (new URL(req.url).pathname === '/sw.js') return;
  /* opening a page is a page; opening a file in its own tab (the résumé PDF) is still that file */
  if (req.mode === 'navigate' && !/\.(?!html?$)[a-z0-9]+$/i.test(new URL(req.url).pathname)) { e.respondWith(page(e)); return; }
  e.respondWith(file(e).catch(() => fetch(req)));
});
