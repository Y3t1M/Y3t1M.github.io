/* ============================================================
   ICONS — icons.js
   The nine Lucide glyphs this site actually uses, vendored.

   This replaces <script src="https://unpkg.com/lucide@latest/...">, which
   was 412 KB of render-blocking third-party JavaScript, fetched from a CDN
   on every load, pinned to nothing. If unpkg was slow the header stalled;
   if it was down (or Lucide shipped a breaking change under @latest) every
   icon on the page silently vanished, because index.html called the global
   `lucide.createIcons()` with no guard.

   Geometry below is copied verbatim from the rendered output of the version
   that was live (lucide 1.26.0), so the icons are pixel-identical. The markup
   this emits matches Lucide's own: same wrapper attributes, same classes.

   Lucide is ISC-licensed. https://github.com/lucide-icons/lucide
   To add an icon, paste its inner SVG geometry here under its kebab-case name.
   ============================================================ */
(function (root) {
  'use strict';

  var GEOMETRY = {
    'briefcase':
      '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path><rect width="20" height="14" x="2" y="6" rx="2"></rect>',
    'cpu':
      '<path d="M12 20v2"></path><path d="M12 2v2"></path><path d="M17 20v2"></path><path d="M17 2v2"></path><path d="M2 12h2"></path><path d="M2 17h2"></path><path d="M2 7h2"></path><path d="M20 12h2"></path><path d="M20 17h2"></path><path d="M20 7h2"></path><path d="M7 20v2"></path><path d="M7 2v2"></path><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="8" y="8" width="8" height="8" rx="1"></rect>',
    'graduation-cap':
      '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path><path d="M22 10v6"></path><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>',
    'lightbulb':
      '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path>',
    'medal':
      '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"></path><path d="M11 12 5.12 2.2"></path><path d="m13 12 5.88-9.8"></path><path d="M8 7h8"></path><circle cx="12" cy="17" r="5"></circle><path d="M12 18v-2h-.5"></path>',
    'star':
      '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>',
    'terminal':
      '<path d="M12 19h8"></path><path d="m4 17 6-6-6-6"></path>',
    'trophy':
      '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"></path><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"></path><path d="M18 9h1.5a1 1 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"></path><path d="M6 9H4.5a1 1 0 0 1 0-5H6"></path>',
    'user':
      '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>'
  };

  var WRAP = 'xmlns="http://www.w3.org/2000/svg" width="24" height="24" ' +
             'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
             'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

  /* Replaces every <i data-lucide="name"> with the matching <svg>, exactly as
     lucide.createIcons() did. Unknown names are left alone rather than throwing,
     so a typo costs one icon instead of the whole call. */
  function createIcons() {
    var nodes = root.document.querySelectorAll('[data-lucide]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var name = el.getAttribute('data-lucide');
      var geo = GEOMETRY[name];
      if (!geo) continue;
      if (el.tagName.toLowerCase() === 'svg') continue;   // already rendered
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.innerHTML = geo;
      var wrap = WRAP.match(/([\w-]+)="([^"]*)"/g) || [];
      for (var w = 0; w < wrap.length; w++) {
        var kv = wrap[w].split('="');
        svg.setAttribute(kv[0], kv[1].slice(0, -1));
      }
      svg.setAttribute('data-lucide', name);
      svg.setAttribute('aria-hidden', 'true');           // decorative: the label sits next to it
      svg.setAttribute('class', 'lucide lucide-' + name);
      /* carry over any styling hooks the markup put on the <i> */
      if (el.className && typeof el.className === 'string' && el.className.trim()) {
        svg.setAttribute('class', 'lucide lucide-' + name + ' ' + el.className.trim());
      }
      el.parentNode.replaceChild(svg, el);
    }
  }

  root.lucide = { createIcons: createIcons, icons: GEOMETRY };

  /* Self-starting. This script is loaded with `defer`, so by the time it runs the
     document is fully parsed and every <i data-lucide> exists — no need for the
     page to call createIcons() itself. index.html used to do that from a bare
     inline <script>, which threw a ReferenceError the moment the CDN failed. */
  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', createIcons);
  } else {
    createIcons();
  }
})(window);
