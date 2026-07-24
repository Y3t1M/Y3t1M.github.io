/* Page navigation.
   This is a multi-page site, so every link is a real document load — which is
   why the tab spins, the favicon blinks and the scroll resets. No amount of
   fading hides that; the only thing that actually helps is making the load
   short. So: prefetch on intent, and never add a delay of our own.

   An earlier version faded to black for 170ms BEFORE navigating, which stacked
   a deliberate blackout on top of a load that was already visible. Filmed in
   Firefox it read as ~800ms of darkness. That is removed. */
(function () {
  'use strict';

  /* @view-transition in the stylesheet only does anything where CROSS-document
     view transitions are supported. Firefox has the same-document API but not
     the navigation one, so there the declaration is inert. The pagereveal event
     ships with the cross-document feature, so it is the honest test. */
  var NATIVE = ('onpagereveal' in window);

  function internal(a) {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return null;
    var url;
    try { url = new URL(a.getAttribute('href'), window.location.href); } catch (e) { return null; }
    if (url.origin !== window.location.origin) return null;
    if (url.pathname === window.location.pathname) return null;
    if (!/\.html?$|\/$/.test(url.pathname)) return null;      /* PDFs and the like */
    return url;
  }

  /* PREFETCH ON INTENT.
     By the time a click lands, the document is usually already in the cache, so
     the browser paints the next page almost immediately. This is what makes the
     navigation feel instant — not a transition. Hover fires on desktop well
     before the click; touchstart fires ~90ms before it on mobile. */
  var seen = {};
  function prefetch(e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    var url = internal(a);
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

  /* A short fade IN on arrival. It costs nothing — it runs after the new page
     has painted — and it takes the hard edge off the swap. There is
     deliberately no fade OUT: that would only delay the navigation. */
  if (!NATIVE) {
    var root = document.documentElement;
    root.classList.add('pt-fade', 'pt-enter');
    root.style.setProperty('--pt-out', '120ms');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove('pt-enter'); });
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) root.classList.remove('pt-enter');
    });
    /* never leave anyone on a faded page if a frame is dropped */
    setTimeout(function () { root.classList.remove('pt-enter'); }, 600);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var url = internal(e.target.closest && e.target.closest('a[href]'));
    if (!url) return;
    /* Flag the arrival so the next page settles its nav tick, then get out of
       the way — the navigation is native and immediate. */
    try { sessionStorage.setItem('pt-arrive', '1'); } catch (err) {}
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
