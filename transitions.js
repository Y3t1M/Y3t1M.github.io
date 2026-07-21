/* Subtle page transitions — fade out on internal nav, fade in on load. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('pt-ready');

  // restore if the page is resurrected from bfcache mid-fade
  window.addEventListener('pageshow', function () {
    document.documentElement.classList.remove('pt-out');
  });

  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var url;
    try { url = new URL(a.getAttribute('href'), window.location.href); } catch (err) { return; }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.hash) return; // same-page anchor
    e.preventDefault();
    document.documentElement.classList.add('pt-out');
    setTimeout(function () { window.location.href = url.href; }, 180);
  });
})();
