/* Page navigation — the Datum Scan.

   MODE picks the treatment. 'scan' is live for Hudson to test; flipping the
   word back to 'fade' restores the plain crossfade, nothing else to touch.

   The scan is a cover-then-reveal handshake, identical in every browser:

     leaving  — the datum rule detaches and sweeps DOWN, drawing the page
                background behind it until the screen is owned; a timestamped
                sessionStorage flag is set and the navigation fires.
     arriving — an inline head gate on the three nav pages stamps
                html.pt-covered BEFORE first paint, so there is never a flash;
                this file then swaps that for the real cover and the rule
                sweeps down again, uncovering the new page above the line.

   Native cross-document View Transitions are disabled in the stylesheet —
   the handshake owns the screen in Chrome and Firefox alike. Prefetch on
   intent stays, so the document swap under the cover is near-instant. */
(function () {
  'use strict';

  var MODE = 'scan';                                   /* 'scan' | 'fade' */

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var OUT_MS = 360, IN_MS = 440;
  var EASE_OUT = 'cubic-bezier(.2,.7,.2,1)';

  /* the scan runs between the three pages that carry the datum-rule nav;
     everything else (portals, demos, PDFs) navigates plainly */
  var SCAN_PAGES = /(\/|index\.html|projects\.html|404\.html)$/;

  function internal(a2) {
    if (!a2 || a2.target === '_blank' || a2.hasAttribute('download')) return null;
    var url;
    try { url = new URL(a2.getAttribute('href'), window.location.href); } catch (e) { return null; }
    if (url.origin !== window.location.origin) return null;
    if (url.pathname === window.location.pathname) return null;
    if (!/\.html?$|\/$/.test(url.pathname)) return null;
    return url;
  }

  /* ── prefetch on intent — what actually makes navigation feel instant ── */
  var seen = {};
  function prefetch(e) {
    var a2 = e.target && e.target.closest && e.target.closest('a[href]');
    var url = internal(a2);
    if (!url || seen[url.href]) return;
    seen[url.href] = 1;
    var l = document.createElement('link');
    l.rel = 'prefetch';
    l.as = 'document';
    l.href = url.href;
    document.head.appendChild(l);
  }
  ['mouseover', 'touchstart', 'focusin'].forEach(function (ev) {
    document.addEventListener(ev, prefetch, { passive: true, capture: true });
  });

  /* ── the sweeping rule ────────────────────────────────────────────── */
  function buildLine() {
    var line = document.createElement('div');
    line.className = 'pt-scan-line';
    line.innerHTML = '<span></span>';
    document.body.appendChild(line);
    return line;
  }

  /* leaving: cover grows down from the top, the rule at its leading edge */
  function scanOut(href) {
    var cover = document.createElement('div');
    cover.className = 'pt-scan-cover';
    cover.style.clipPath = 'inset(0 0 100% 0)';
    document.body.appendChild(cover);
    var line = buildLine();
    var tag = line.firstChild;
    var H = window.innerHeight;
    var t0 = null, went = false;
    function go() {
      if (went) return;
      went = true;
      try { sessionStorage.setItem('pt-cover', String(Date.now())); } catch (e) {}
      window.location.href = href;
    }
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / OUT_MS);
      var e2 = 1 - Math.pow(1 - p, 3);
      cover.style.clipPath = 'inset(0 0 ' + ((1 - e2) * 100).toFixed(2) + '% 0)';
      line.style.transform = 'translateY(' + (e2 * H).toFixed(1) + 'px)';
      tag.textContent = 'Y ' + String(Math.round(e2 * H)).padStart(4, '0');
      if (p < 1) requestAnimationFrame(frame);
      else go();
    }
    requestAnimationFrame(frame);
    setTimeout(go, OUT_MS + 350);          /* never strand the click */
  }

  /* arriving: swap the pre-paint pseudo cover for the real one, sweep open */
  function scanIn() {
    var root = document.documentElement;
    if (!root.classList.contains('pt-covered')) return;
    var cover = document.createElement('div');
    cover.className = 'pt-scan-cover';
    document.body.appendChild(cover);
    root.classList.remove('pt-covered');   /* the real cover owns it now */

    if (REDUCED) {
      cover.style.transition = 'opacity 140ms ease';
      cover.style.opacity = '0';
      setTimeout(function () { cover.remove(); }, 160);
      return;
    }
    var line = buildLine();
    var tag = line.firstChild;
    var H = window.innerHeight;
    var t0 = null;
    function cleanup() {
      if (cover.parentNode) cover.remove();
      if (line.parentNode) line.remove();
    }
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / IN_MS);
      var e2 = 1 - Math.pow(1 - p, 3);
      cover.style.clipPath = 'inset(' + (e2 * 100).toFixed(2) + '% 0 0 0)';
      line.style.transform = 'translateY(' + (e2 * H).toFixed(1) + 'px)';
      tag.textContent = 'Y ' + String(Math.round(e2 * H)).padStart(4, '0');
      if (p < 1) requestAnimationFrame(frame);
      else cleanup();
    }
    requestAnimationFrame(frame);
    setTimeout(cleanup, IN_MS + 800);      /* dead-man: never a stuck cover */
  }

  /* ── fade mode (the crossfade, kept one flip away) ────────────────── */
  function fadeArrive() {
    var root = document.documentElement;
    root.classList.add('pt-fade', 'pt-enter');
    root.style.setProperty('--pt-out', '120ms');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove('pt-enter'); });
    });
    setTimeout(function () { root.classList.remove('pt-enter'); }, 600);
  }

  /* ── wire up ──────────────────────────────────────────────────────── */
  if (MODE === 'scan') scanIn(); else fadeArrive();

  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;              /* bfcache return: clear everything */
    document.documentElement.classList.remove('pt-covered', 'pt-enter');
    document.querySelectorAll('.pt-scan-cover, .pt-scan-line').forEach(function (el) { el.remove(); });
  });

  var leaving = false;
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var url = internal(e.target.closest && e.target.closest('a[href]'));
    if (!url) return;

    try { sessionStorage.setItem('pt-arrive', '1'); } catch (err) {}

    if (MODE !== 'scan') return;                        /* fade: navigate natively */
    if (REDUCED) return;                                /* reduced: plain instant nav */
    if (!SCAN_PAGES.test(url.pathname)) return;         /* portals/demos: plain nav */
    if (leaving) { e.preventDefault(); return; }
    leaving = true;
    e.preventDefault();
    scanOut(url.href);
  });
})();

/* nav-logo easter egg: click the name, it decodes into the face */
(function () {
  'use strict';
  var logo = document.querySelector('.nav-logo-text');
  if (!logo) return;
  var orig = logo.textContent;
  var FACE = '( ._.)';
  var CS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789#$%&';
  var busy = false;
  function scrambleTo(target, done) {
    var steps = 12, n = 0;
    var iv = setInterval(function () {
      n++;
      var reveal = Math.floor((n / steps) * target.length);
      var out = '';
      for (var i = 0; i < target.length; i++) {
        out += (i < reveal || target[i] === ' ') ? target[i]
             : CS[Math.floor(Math.random() * CS.length)];
      }
      logo.textContent = out;
      if (n >= steps) { clearInterval(iv); logo.textContent = target; if (done) done(); }
    }, 34);
  }
  logo.style.cursor = 'pointer';
  logo.addEventListener('click', function (e) {
    // The logo is a link home. Only play the decode easter egg when you're
    // ALREADY home (where navigating home would just reload) — otherwise let
    // the link carry you to the home page.
    var here = true;
    try { here = new URL(logo.getAttribute('href'), location.href).pathname === location.pathname; } catch (err) {}
    if (!here) return;                 // let the <a href> navigate home
    e.preventDefault();
    e.stopPropagation();               // don't let the nav handler flag an arrival
    if (busy) return;
    busy = true;
    scrambleTo(FACE, function () {
      setTimeout(function () {
        scrambleTo(orig, function () { busy = false; });
      }, 1100);
    });
  });
})();
