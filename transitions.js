/* Page navigation — the crossfade is done by the View Transitions API in CSS
   (@view-transition). No sound and no artificial delay: the click navigates
   immediately and the browser crossfades the old and new page snapshots, which
   is the smoothest a multi-page transition can be. This file only flags the
   arrival so the destination settles its nav tick. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var url;
    try { url = new URL(a.getAttribute('href'), window.location.href); } catch (err) { return; }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.hash) return; // same-page anchor
    // Flag the arrival so the next page settles its nav tick, then let the
    // navigation happen natively — no preventDefault, no timer. The View
    // Transition fires on the navigation.
    try { sessionStorage.setItem('pt-arrive', '1'); } catch (err2) {}
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
  logo.addEventListener('click', function () {
    if (busy) return;
    busy = true;
    scrambleTo(FACE, function () {
      setTimeout(function () {
        scrambleTo(orig, function () { busy = false; });
      }, 1100);
    });
  });
})();
