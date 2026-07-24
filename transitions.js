/* Page navigation — the crossfade is done by the View Transitions API in CSS
   (@view-transition). No sound and no artificial delay: the click navigates
   immediately and the browser crossfades the old and new page snapshots, which
   is the smoothest a multi-page transition can be. This file only flags the
   arrival so the destination settles its nav tick. */
(function () {
  'use strict';

  /* @view-transition in the stylesheet only does anything in browsers that
     support CROSS-document view transitions. Firefox does not — it has the
     same-document API but not the navigation one — so there the declaration is
     inert and every page change is a bare reload. The pagereveal event ships
     with the cross-document feature, so it is the honest test for it. */
  var NATIVE = ('onpagereveal' in window);

  /* An opacity crossfade is not what prefers-reduced-motion exists to prevent
     — nothing moves. Under the setting it just runs shorter. Killing it
     outright meant reduced-motion visitors got the hardest transition of all. */
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var OUT = REDUCED ? 90 : 170;

  if (!NATIVE) {
    document.documentElement.classList.add('pt-fade');
    document.documentElement.style.setProperty('--pt-out', OUT + 'ms');
    /* arrive faded, then let it up on the next frame */
    document.documentElement.classList.add('pt-enter');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.remove('pt-enter');
      });
    });
    window.addEventListener('pageshow', function (e) {
      /* back/forward out of the bfcache must not land on a faded page */
      if (e.persisted) document.documentElement.classList.remove('pt-leave', 'pt-enter');
    });
  }

  var leaving = false;

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var url;
    try { url = new URL(a.getAttribute('href'), window.location.href); } catch (err) { return; }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.hash) return; // same-page anchor
    if (!/\.html?$|\/$/.test(url.pathname)) return;                    // PDFs and the like

    // Flag the arrival so the next page settles its nav tick.
    try { sessionStorage.setItem('pt-arrive', '1'); } catch (err2) {}

    // Where the browser can crossfade the navigation itself, let it: native is
    // smoother than anything a timer can do, and it needs no preventDefault.
    if (NATIVE) return;

    if (leaving) return;
    leaving = true;
    e.preventDefault();
    document.documentElement.classList.add('pt-leave');
    var went = false;
    var go = function () { if (!went) { went = true; window.location.href = url.href; } };
    setTimeout(go, OUT);
    /* never let a dropped transitionend strand someone on a faded page */
    setTimeout(go, OUT + 400);
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
