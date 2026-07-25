/* ============================================================
   FEATURES — Firmware Flash, CLI Terminal, Blueprint Mode
   features.js
   ============================================================ */
(function () {
  'use strict';

  function init() {
  /* ================================================================
     1. (removed) FIRMWARE FLASH PAGE LOAD
        This printed an Arduino-style `hudson@archlinux` terminal over the
        whole page on the first load of every session, at z-index 999999.
        The PLINTH boot in boot.js is the first-visit load screen now, and
        two of them collided -- the terminal simply covered the mark, so the
        new boot looked like it was never shipping.

        The hero's staggered entrance used to be driven from here via the
        html.fw-boot / html.fw-booted classes. boot.js owns those now, so the
        hero still animates in as the mark clears. Those CSS rules are
        unchanged and still live in styles.css.
     ================================================================ */

  var bpStageTimer = null;
  /* Undo everything that turns <html>/<body> into a containing block, then
     nudge the fixed backgrounds to re-measure themselves against the viewport
     again. Safe to call more than once. */
  function clearBpStage() {
    clearTimeout(bpStageTimer);
    bpStageTimer = null;
    document.body.style.willChange = '';
    document.documentElement.style.perspective = '';
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }

  /* ================================================================
     2. CLI NAVIGATION MODE — Press / to open
     ================================================================ */
  (function initCLI() {
    var overlay = document.createElement('div');
    overlay.id = 'cli-overlay';
    overlay.innerHTML =
      '<div id="cli-window">' +
        '<div id="cli-titlebar">' +
          '<span id="cli-titlebar-label">hudson@archlinux: ~</span>' +
          '<span id="cli-close-btn" title="close">&times;</span>' +
        '</div>' +
        '<div id="cli-output"></div>' +
        '<div id="cli-input-row">' +
          '<span id="cli-prompt"><span class="cli-p-user">hudson</span><span class="cli-p-at">@</span><span class="cli-p-host">archlinux</span> <span class="cli-p-tilde">~</span><span class="cli-p-dollar"> $</span>&nbsp;</span>' +
          '<input id="cli-input" type="text" autocomplete="off" spellcheck="false" placeholder="">' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    /* Slash hint badge */
    var slashHint = document.createElement('div');
    slashHint.id = 'cli-slash-hint';
    slashHint.textContent = '[ / ] terminal';
    slashHint.setAttribute('role', 'button');
    slashHint.setAttribute('aria-label', 'open terminal');
    document.body.appendChild(slashHint);
    slashHint.addEventListener('click', function () { if (!isOpen) open(); });

    var output   = document.getElementById('cli-output');
    var input    = document.getElementById('cli-input');
    var closeBtn = document.getElementById('cli-close-btn');
    var isOpen   = false;
    var history  = [];
    var histIdx  = -1;

    function open() {
      isOpen = true;
      overlay.classList.add('cli-open');
      setTimeout(function () { input.focus(); }, 60);
      if (output.children.length === 0) printWelcome();
    }
    function close() {
      isOpen = false;
      overlay.classList.remove('cli-open');
    }
    closeBtn.addEventListener('click', close);

    function printWelcome() {
      // neofetch-style welcome
      printLine('', '');
      var nfArt = [
        '        .o                                            o.',
        '      .8\'                                              `8.',
        '     .8\'                                                `8.',
        '     88                                                  88',
        '     88                                                  88',
        '     `8.            .o.                       .o.       .8\'',
        '      `8.           Y8P      ooooooooooo      Y8P      .8\'',
        '       `"                                              "\'',
        '',
        '',
      ];
      nfArt.forEach(function(l) { printRaw('<span class="cli-nf-art">' + l + '</span>'); });
      printLine('', '');
      printRaw('<span class="cli-p-user">hudson</span><span style="color:#ccc">@</span><span class="cli-p-host">archlinux</span>');
      printRaw('<span class="cli-nf-key">-------------------------------</span>');
      printRaw('<span class="cli-nf-key">OS:</span>     <span class="cli-nf-val">HudsonInch GNU/Linux x86_64</span>');
      printRaw('<span class="cli-nf-key">Host:</span>   <span class="cli-nf-val">hudsontinch.com</span>');
      printRaw('<span class="cli-nf-key">Role:</span>   <span class="cli-nf-val">Robotics Captain  •  Maker</span>');
      printRaw('<span class="cli-nf-key">Univ:</span>   <span class="cli-nf-val">U of Arkansas  —  Honors College</span>');
      printRaw('<span class="cli-nf-key">Lang:</span>   <span class="cli-nf-val">C++  Python  JS  TS</span>');
      printRaw('<span class="cli-nf-key">HW:</span>     <span class="cli-nf-val">Arduino  PCB  3D Printing</span>');
      printRaw('<span class="cli-nf-key">GPA:</span>    <span class="cli-nf-val">4.0  —  Chancellor\'s List</span>');
      printLine('', '');
      printLine('Type "help" for available commands.  Esc or "exit" to close.', 'dim');
      printLine('', '');
    }

    function printRaw(html) {
      var el = document.createElement('div');
      el.className = 'cli-line cli-out';
      el.innerHTML = html;
      output.appendChild(el);
      output.scrollTop = output.scrollHeight;
    }

    function printLine(text, type) {
      var el = document.createElement('div');
      el.className = 'cli-line cli-' + (type || 'out');
      el.textContent = text;
      output.appendChild(el);
      output.scrollTop = output.scrollHeight;
    }
    function printCmd(raw) {
      var el = document.createElement('div');
      el.className = 'cli-line cli-cmd';
      el.innerHTML = '<span class="cli-p-user">hudson</span><span style="color:#ccc">@</span><span class="cli-p-host">archlinux</span> <span class="cli-p-tilde">~</span><span class="cli-p-dollar"> $</span> ' + raw.replace(/</g,'&lt;').replace(/>/g,'&gt;');
      output.appendChild(el);
      output.scrollTop = output.scrollHeight;
    }

    var CMDS = {
      help: function () {
        printLine('', '');
        printLine('  COMMANDS', 'info');
        printLine('  ─────────────────────────────────────────────', 'dim');
        printLine('  ls                      list sections', 'out');
        printLine('  ls projects             list all projects', 'out');
        printLine('  cat about               about me', 'out');
        printLine('  man hudson              full résumé man page', 'out');
        printLine('  open <name>             open a project', 'out');
        printLine('    names: drone  arduino  helmet  pixos', 'dim');
        printLine('  cd <dest>               navigate', 'out');
        printLine('    dests: desktop  games  projects', 'dim');
        printLine('  whoami                  who is this?', 'out');
        printLine('  blueprint               toggle blueprint mode (or press B)', 'out');
        printLine('  clear                   clear terminal', 'out');
        printLine('  exit                    close terminal', 'out');
        printLine('', '');
      },

      ls: function (args) {
        if (args[0] === 'projects') {
          printLine('', '');
          printLine('  projects/', 'info');
          printLine('  ├── avr-drone       Autonomous AVR competition drone — 8th nationally', 'out');
          printLine('  ├── arduino-r4      Web-based servo/electromagnet controller', 'out');
          printLine('  ├── iron-man-helmet 3D-printed helmet, moving faceplate + electronics', 'out');
          printLine('  └── pixos           Browser pixel art + GIF animation editor', 'out');
          printLine('', '');
        } else {
          printLine('', '');
          printLine('  / (site root)', 'info');
          printLine('  ├── home', 'out');
          printLine('  ├── about', 'out');
          printLine('  ├── projects/       → ls projects', 'out');
          printLine('  ├── github', 'out');
          printLine('  ├── experience', 'out');
          printLine('  ├── games/', 'out');
          printLine('  └── desktop/        hidden — try the Konami code ↑↑↓↓←→←→BA', 'dim');
          printLine('', '');
        }
      },

      cat: function (args) {
        if (args[0] === 'about') {
          printLine('', '');
          printLine('  NAME        Hudson Tinch', 'success');
          printLine('  ROLE        Robotics Captain, Engineer, Maker', 'out');
          printLine('  SCHOOL      University of Arkansas — Honors College', 'out');
          printLine('  PROGRAM     McMillon Innovation Studio', 'out');
          printLine('  GPA         4.0 — Chancellor\'s List', 'out');
          printLine('', '');
          printLine('  I build things — robotics, apps, hardware. From leading', 'out');
          printLine('  competition drone teams to founding a 3D printing business', 'out');
          printLine('  at age 9, I turn ideas into real objects.', 'out');
          printLine('', '');
        } else {
          printLine('  cat: ' + (args[0] || '(no file)') + ': No such file — try "cat about"', 'err');
        }
      },

      whoami: function () {
        printLine('', '');
        printLine('  Hudson Tinch — robotics captain, maker, developer', 'success');
        printLine('  Incoming student @ U of A Honors College', 'out');
        printLine('  Languages : C++  Python  JavaScript  TypeScript', 'out');
        printLine('  Hardware  : Arduino  PCB  KiCad  3D Printing', 'out');
        printLine('  github    : github.com/Y3t1M', 'info');
        printLine('', '');
      },

      man: function (args) {
        if (!args[0] || args[0] === 'hudson') {
          printLine('', '');
          printLine('  HUDSON(1)              Portfolio Manual              HUDSON(1)', 'info');
          printLine('', '');
          printLine('  NAME', 'info');
          printLine('    hudson — robotics captain, engineer, maker', 'out');
          printLine('', '');
          printLine('  SYNOPSIS', 'info');
          printLine('    hudson [project] [--build] [--compete] [--learn]', 'out');
          printLine('', '');
          printLine('  EDUCATION', 'info');
          printLine('    U of A Honors College  ·  McMillon Innovation Studio', 'out');
          printLine('    Wharton Global Youth Program · Best Presentation Award', 'out');
          printLine('    Duke Pre-College · Pitch Competition Winner', 'out');
          printLine('    Georgia Tech Summer Institute · Highest Presentation Score', 'out');
          printLine('', '');
          printLine('  EXPERIENCE', 'info');
          printLine('    Sam\'s Club  ·  Hollis Bloom (back-end dev)', 'out');
          printLine('    Farah Law Firm (C++ programmer)', 'out');
          printLine('    Dimensional Design 3D — founded age 9 (2014–2020)', 'out');
          printLine('', '');
          printLine('  AWARDS', 'info');
          printLine('    Bell AVR Nationals — 8th Place', 'out');
          printLine('    Robotics Best Design + Judge\'s Choice', 'out');
          printLine('    Presidential Service Award', 'out');
          printLine('    HP MAPS Scots Tank Winner', 'out');
          printLine('    Chancellor\'s List — 4.0 GPA', 'out');
          printLine('', '');
          printLine('  SEE ALSO', 'info');
          printLine('    github.com/Y3t1M  ·  linkedin.com/in/hudsontinch', 'out');
          printLine('', '');
        } else {
          printLine('  No manual entry for "' + args[0] + '".  Try "man hudson"', 'err');
        }
      },

      open: function (args) {
        var p = (args[0] || '').toLowerCase();
        var map = {
          drone:      'projects.html',
          avr:        'projects.html',
          'avr-drone':'projects.html',
          arduino:    'https://github.com/Y3t1M/Arduino-R4-Controller-Web-Interface',
          'arduino-r4':'https://github.com/Y3t1M/Arduino-R4-Controller-Web-Interface',
          helmet:     'projects.html',
          pixos:      'https://github.com/Y3t1M/PixOS',
          github:     'https://github.com/Y3t1M'
        };
        if (map[p]) {
          printLine('  > Opening ' + p + ' ...', 'success');
          setTimeout(function () {
            if (map[p].startsWith('http')) { window.open(map[p], '_blank'); }
            else { window.location.href = map[p]; }
          }, 500);
        } else {
          printLine('  open: unknown project "' + (p || '') + '"', 'err');
          printLine('  Available: drone  arduino  helmet  pixos  github', 'dim');
        }
      },

      cd: function (args) {
        var d = (args[0] || '').toLowerCase();
        var nav = { desktop: 'desktop.html', games: 'games/', projects: 'projects.html' };
        if (nav[d]) {
          printLine('  Launching ' + d + ' ...', 'success');
          setTimeout(function () { window.location.href = nav[d]; }, 600);
        } else if (!d || d === '~' || d === '/') {
          printLine('  Already at ~', 'out');
        } else {
          printLine('  cd: ' + d + ': No such directory', 'err');
          printLine('  Available: desktop  games  projects', 'dim');
        }
      },

      blueprint: function () {
        toggleBlueprint();
        printLine(
          '  Blueprint mode ' + (document.body.classList.contains('blueprint') ? 'ON' : 'OFF'),
          'success'
        );
      },

      clear: function () { output.innerHTML = ''; },
      exit:  function () { close(); },
      quit:  function () { close(); },
      q:     function () { close(); }
    };

    function run(raw) {
      var trimmed = raw.trim();
      if (!trimmed) return;
      history.unshift(trimmed);
      histIdx = -1;
      printCmd(trimmed);
      var parts  = trimmed.split(/\s+/);
      var cmd    = parts[0].toLowerCase();
      var args   = parts.slice(1);
      if (CMDS[cmd]) {
        CMDS[cmd](args);
      } else {
        printLine('  command not found: ' + cmd + ' — type "help" for commands', 'err');
      }
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var val = input.value;
        input.value = '';
        run(val);
      } else if (e.key === 'Escape') {
        close();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx]; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx > 0) { histIdx--; input.value = history[histIdx]; }
        else { histIdx = -1; input.value = ''; }
      }
    });

    document.addEventListener('keydown', function (e) {
      var tag = document.activeElement ? document.activeElement.tagName : '';
      if (e.key === '/' && !isOpen && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        open();
      } else if (e.key === 'Escape' && isOpen) {
        close();
      }
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
  })();


  /* ================================================================
     3. BLUEPRINT MODE — Press B to toggle
     ================================================================ */

  /* ── Blueprint interactive state ─────────────────────────────── */
  var bpSmudgeCount = 0;
  var BP_SMUDGE_LIMIT = 12;
  var bpRuined = false;
  var bpSvgWrap = null;
  var bpHintEl = null;
  var bpBgCanvas = null;
  var bpBgCtx = null;
  var bpDragState = null;
  var bpJustDragged = false;

  var BP_DRAGGABLES = [
    '.about-card', '.project-card', '.repo-card',
    '.tl-item', '.stat-item', '.skill-group', '.award-row',
    '.hero-title', '.hero-subtitle', '.section-title', '.section-description',
    '.hero-avatars', '.nav-logo', '.nav-links', '.stats-bar',
    '.awards-list', '.skill-tags', '.footer-inner'
  ].join(', ');

  /* Elements that are too small/inline to drag but can always be smudged */
  var BP_ANY_SMUDGE = true;

  function initBlueprintInteractive() {
    bpSmudgeCount = 0;
    bpRuined = false;
    bpJustDragged = false;

    // Inject SVG turbulence filter for hand-drawn/sketched look
    bpSvgWrap = document.createElement('div');
    bpSvgWrap.id = 'bp-svg-wrap';
    bpSvgWrap.innerHTML =
      '<svg id="bp-svg" xmlns="http://www.w3.org/2000/svg" ' +
      'style="position:absolute;width:0;height:0;overflow:hidden">' +
      '<defs>' +
      '<filter id="bp-sketch" x="-8%" y="-8%" width="116%" height="116%">' +
      '<feTurbulence id="bp-turb" type="fractalNoise" baseFrequency="0.032" numOctaves="3" seed="9" result="noise"/>' +
      '<feDisplacementMap id="bp-disp" in="SourceGraphic" in2="noise" scale="3" ' +
      'xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
      '<filter id="bp-sketch-bg" x="0" y="0" width="100%" height="100%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.065" numOctaves="4" seed="7" result="noise"/>' +
      '<feDisplacementMap id="bp-disp-bg" in="SourceGraphic" in2="noise" scale="4" ' +
      'xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
      '</defs></svg>';
    document.body.appendChild(bpSvgWrap);

    // Background smudge canvas — sits just above the bg grid, below content
    bpBgCanvas = document.createElement('canvas');
    bpBgCanvas.id = 'bp-bg-canvas';
    bpBgCanvas.width  = window.innerWidth;
    bpBgCanvas.height = window.innerHeight;
    bpBgCanvas.style.cssText =
      'position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0.85;';
    document.body.appendChild(bpBgCanvas);
    bpBgCtx = bpBgCanvas.getContext('2d');

    // Tag draggable elements
    document.querySelectorAll(BP_DRAGGABLES).forEach(function (el) {
      el.setAttribute('data-bp-drag', '1');
      el.dataset.bpTx = '0';
      el.dataset.bpTy = '0';
    });

    document.addEventListener('mousedown', bpMouseDown);
    document.addEventListener('mousemove', bpMouseMove);
    document.addEventListener('mouseup',   bpMouseUp);
    document.addEventListener('click',     bpClick);
  }

  function destroyBlueprintInteractive() {
    bpSmudgeCount = 0;
    bpRuined = false;
    bpDragState = null;
    bpJustDragged = false;

    if (bpSvgWrap)   { bpSvgWrap.remove();   bpSvgWrap = null; }
    if (bpHintEl)    { bpHintEl.remove();     bpHintEl = null; }
    if (bpBgCanvas)  { bpBgCanvas.remove();   bpBgCanvas = null; bpBgCtx = null; }

    document.querySelectorAll('[data-bp-drag]').forEach(function (el) {
      el.removeAttribute('data-bp-drag');
      el.removeAttribute('data-bp-tx');
      el.removeAttribute('data-bp-ty');
      el.style.transform = '';
      el.classList.remove('bp-smudged-1', 'bp-smudged-2', 'bp-smudged-3', 'bp-dragging');
    });

    // Remove smudge classes from any element that received them directly
    document.querySelectorAll('.bp-smudged-1, .bp-smudged-2, .bp-smudged-3').forEach(function(el){
      el.classList.remove('bp-smudged-1','bp-smudged-2','bp-smudged-3');
      el.style.transform = '';
    });

    document.body.classList.remove('bp-ruined');
    document.removeEventListener('mousedown', bpMouseDown);
    document.removeEventListener('mousemove', bpMouseMove);
    document.removeEventListener('mouseup',   bpMouseUp);
    document.removeEventListener('click',     bpClick);
  }

  function bpMouseDown(e) {
    if (!document.body.classList.contains('blueprint') || bpRuined) return;
    var el = e.target.closest('[data-bp-drag]');
    if (!el) return;
    e.preventDefault();
    var tx = parseFloat(el.dataset.bpTx) || 0;
    var ty = parseFloat(el.dataset.bpTy) || 0;
    bpDragState = { el: el, ox: e.clientX - tx, oy: e.clientY - ty, moved: false };
    el.classList.add('bp-dragging');
  }

  function bpMouseMove(e) {
    if (!bpDragState) return;
    var dx = e.clientX - bpDragState.ox;
    var dy = e.clientY - bpDragState.oy;
    if (Math.abs(dx - (parseFloat(bpDragState.el.dataset.bpTx)||0)) > 3 ||
        Math.abs(dy - (parseFloat(bpDragState.el.dataset.bpTy)||0)) > 3) {
      bpDragState.moved = true;
    }
    bpDragState.el.dataset.bpTx = dx;
    bpDragState.el.dataset.bpTy = dy;
    bpDragState.el.style.transform = bpBuildTransform(bpDragState.el, dx, dy);
  }

  function bpMouseUp() {
    if (!bpDragState) return;
    if (bpDragState.moved) bpJustDragged = true;
    bpDragState.el.classList.remove('bp-dragging');
    bpDragState = null;
  }

  function bpClick(e) {
    if (!document.body.classList.contains('blueprint')) return;
    // When ruined, only the overlay buttons act — ignore ambient clicks
    if (bpRuined) return;
    if (bpJustDragged) { bpJustDragged = false; return; }

    var el = e.target;
    // If click lands on html/body/canvas/overlay = smudge background
    var ignoreTags = { 'HTML':1,'BODY':1,'CANVAS':1 };
    if (!el || ignoreTags[el.tagName] || el.id === 'bp-bg-canvas') {
      bpSmudgeBackground(e.clientX, e.clientY);
      return;
    }

    // Smudge the actual element clicked (could be a span, h1, icon, card, anything)
    bpSmudgeAny(el, e.clientX, e.clientY);
  }

  function bpSmudgeAny(el, cx, cy) {
    // Walk up one level if the element is too trivial (text nodes, tiny wrappers)
    var tag = el.tagName;
    if (tag === 'A' || tag === 'BUTTON') {
      // prevent navigating
      // smudge the link itself, not its parent
    }

    var cur = el.classList.contains('bp-smudged-3') ? 3 :
              el.classList.contains('bp-smudged-2') ? 2 :
              el.classList.contains('bp-smudged-1') ? 1 : 0;
    var next = Math.min(cur + 1, 3);
    el.classList.remove('bp-smudged-1', 'bp-smudged-2', 'bp-smudged-3');
    el.classList.add('bp-smudged-' + next);

    // Apply transform skew (use existing translate if it's a draggable)
    var tx = parseFloat(el.dataset.bpTx) || 0;
    var ty = parseFloat(el.dataset.bpTy) || 0;
    el.style.transform = bpBuildTransform(el, tx, ty);

    // Also paint a subtle smear on the background canvas at this location
    if (bpBgCtx && cx !== undefined) {
      bpPaintBgSmear(cx, cy, next * 0.18);
    }

    bpSmudgeCount++;
    bpCheckRuined();
  }

  function bpSmudgeBackground(cx, cy) {
    if (bpBgCtx) bpPaintBgSmear(cx, cy, 0.55);
    bpSmudgeCount++;
    bpCheckRuined();
  }

  // Draw an ink-smear blob on the background canvas
  function bpPaintBgSmear(x, y, alpha) {
    if (!bpBgCtx) return;
    var r  = 40 + Math.random() * 80;
    var r2 = r * (0.25 + Math.random() * 0.5);
    var angle = Math.random() * Math.PI * 2;
    var grd = bpBgCtx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0,   'rgba(0,10,30,' + (alpha * 0.9) + ')');
    grd.addColorStop(0.4, 'rgba(0,20,50,' + (alpha * 0.5) + ')');
    grd.addColorStop(1,   'rgba(0,10,30,0)');
    bpBgCtx.save();
    bpBgCtx.translate(x, y);
    bpBgCtx.rotate(angle);
    bpBgCtx.scale(1, r2 / r);
    bpBgCtx.translate(-x, -y);
    bpBgCtx.fillStyle = grd;
    bpBgCtx.beginPath();
    bpBgCtx.arc(x, y, r, 0, Math.PI * 2);
    bpBgCtx.fill();
    bpBgCtx.restore();
  }

  function bpCheckRuined() {
    if (bpSmudgeCount >= BP_SMUDGE_LIMIT && !bpRuined) {
      bpRuined = true;
      document.body.classList.add('bp-ruined');

      bpHintEl = document.createElement('div');
      bpHintEl.className = 'bp-ruined-overlay';
      bpHintEl.innerHTML =
        '<div class="bp-ruined-card">' +
          '<div class="bp-ruined-stamp">\u2593\u2593\u2593</div>' +
          '<h2 class="bp-ruined-title">you ruined it.</h2>' +
          '<p class="bp-ruined-sub">the blueprint is completely smudged.</p>' +
          '<div class="bp-ruined-actions">' +
            '<button class="bp-btn bp-btn-crinkle" id="bp-crinkle-btn">crinkle &amp; exit</button>' +
            '<button class="bp-btn bp-btn-reset"  id="bp-reset-btn">reset blueprint</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(bpHintEl);

      // Wire buttons — stopPropagation so bpClick doesn't double-fire
      document.getElementById('bp-crinkle-btn').addEventListener('click', function(e){
        e.stopPropagation(); triggerCrinkle();
      });
      document.getElementById('bp-reset-btn').addEventListener('click', function(e){
        e.stopPropagation(); triggerReset();
      });
    }
  }

  function bpResetBoard(quiet) {
    // Remove the overlay
    if (bpHintEl) { bpHintEl.remove(); bpHintEl = null; }
    clearBpStage();
    // Tear down interactive state but keep blueprint class on
    bpSmudgeCount = 0;
    bpRuined = false;
    bpDragState = null;
    bpJustDragged = false;
    document.body.classList.remove('bp-ruined');
    // Clear smudge classes and transforms from every element
    document.querySelectorAll('.bp-smudged-1, .bp-smudged-2, .bp-smudged-3').forEach(function(el){
      el.classList.remove('bp-smudged-1','bp-smudged-2','bp-smudged-3');
      el.style.transform = '';
    });
    // Clear background canvas
    if (bpBgCtx && bpBgCanvas) bpBgCtx.clearRect(0,0,bpBgCanvas.width,bpBgCanvas.height);
    // Reset drag position on all draggables
    document.querySelectorAll('[data-bp-drag]').forEach(function(el){
      el.dataset.bpTx = '0';
      el.dataset.bpTy = '0';
      el.style.transform = '';
    });
    if (!quiet) showToast('[ BLUEPRINT RESET ]');
  }

  // Build transform preserving drag translate + smudge skew
  function bpBuildTransform(el, tx, ty) {
    var skew = el.classList.contains('bp-smudged-3') ? ' skewX(-6deg) rotate(-2deg)'   :
               el.classList.contains('bp-smudged-2') ? ' skewX(-3deg) rotate(-0.8deg)' :
               el.classList.contains('bp-smudged-1') ? ' skewX(-1.5deg)'               : '';
    return 'translate(' + tx + 'px, ' + ty + 'px)' + skew;
  }

  /* ── Crinkle exit animation ────────────────────────────────────
     Stages:
       0%–30%  : crease/fold lines draw across the page
       20%–60% : page surface distorts heavily (turbulence up)
       45%–75% : 3D perspective fold — page bends in 3D
       65%–100%: paper crumples to a ball and vanishes
  ─────────────────────────────────────────────────────────────── */
  /* ── Crinkle exit ──────────────────────────────────────────────
     A real sheet of paper being crumpled, not a page spun into a
     blender. What sells it:
       - FOLD SNAPS, not a smooth ease: six discrete crushes, each
         arriving hard and holding, like a fist closing in stages.
       - CREASES that run edge to edge and STAY — each drawn as a
         V-groove (shadow line + light line) the instant its snap
         lands, with faceted light/dark wedges between them.
       - A silhouette that collapses as a jagged polygon, because
         crumpled paper has corners, not a circle.
       - Then the wad: a small tumbling ball, tossed away.
  ─────────────────────────────────────────────────────────────── */
  function triggerCrinkle(after) {
    if (bpHintEl) { bpHintEl.remove(); bpHintEl = null; }

    var dispEl   = document.getElementById('bp-disp');
    var dispBgEl = document.getElementById('bp-disp-bg');
    var turbEl   = document.getElementById('bp-turb');

    function teardown() {
      document.body.style.transform     = '';
      document.body.style.opacity       = '';
      document.body.style.filter        = '';
      document.body.style.pointerEvents = '';
      document.body.style.transformOrigin = '';
      document.body.style.clipPath      = '';
      document.body.style.borderRadius  = '';
      clearBpStage();
      if (dispEl)   dispEl.setAttribute('scale', '3');
      if (dispBgEl) dispBgEl.setAttribute('scale', '4');
      if (turbEl)   turbEl.setAttribute('baseFrequency', '0.032');
      destroyBlueprintInteractive();
      document.body.classList.remove('blueprint', 'bp-ruined');
      showToast('[ BLUEPRINT MODE OFF ]');
    }

    /* reduced motion: no crumple theatre — fade, then whichever ending */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.style.transition = 'opacity 380ms ease';
      document.body.style.opacity = '0';
      setTimeout(function () {
        document.body.style.transition = '';
        (after || teardown)();
      }, 400);
      return;
    }

    var W = window.innerWidth, H = window.innerHeight;

    var cvs = document.createElement('canvas');
    cvs.style.cssText = 'position:fixed;inset:0;z-index:999997;pointer-events:none;';
    cvs.width = W; cvs.height = H;
    document.body.appendChild(cvs);
    var ctx = cvs.getContext('2d');

    /* where the fist closes */
    var fx = W * (0.42 + Math.random() * 0.16);
    var fy = H * (0.38 + Math.random() * 0.18);
    var nuclei = [
      { x: fx, y: fy },
      { x: Math.min(W * 0.9, fx + W * 0.17), y: Math.max(H * 0.1, fy - H * 0.13) },
      { x: Math.max(W * 0.1, fx - W * 0.15), y: Math.min(H * 0.9, fy + H * 0.14) }
    ];

    function lerp(a2, b2, t) { return a2 + (b2 - a2) * t; }
    function clamp01(v) { return Math.max(0, Math.min(1, v)); }
    function jit(n2) { return (Math.random() - 0.5) * n2; }

    /* a random point on one of the sheet's four edges */
    function edgePoint(e) {
      var t = 0.08 + Math.random() * 0.84;
      if (e === 0) return { x: W * t, y: 0 };
      if (e === 1) return { x: W, y: H * t };
      if (e === 2) return { x: W * t, y: H };
      return { x: 0, y: H * t };
    }

    /* MAJOR creases: edge-to-edge polylines bent toward a nucleus.
       Real creases cross the whole sheet — that is what was missing. */
    var majors = [];
    for (var i = 0; i < 14; i++) {
      var e1 = i % 4;
      var e2 = (e1 + 1 + Math.floor(Math.random() * 3)) % 4;
      var p0 = edgePoint(e1), p3 = edgePoint(e2);
      var nu = nuclei[i % 3];
      var pull = 0.55 + Math.random() * 0.28;
      var m1 = { x: lerp(lerp(p0.x, p3.x, 0.33), nu.x, pull) + jit(46),
                 y: lerp(lerp(p0.y, p3.y, 0.33), nu.y, pull) + jit(46) };
      var m2 = { x: lerp(lerp(p0.x, p3.x, 0.67), nu.x, pull) + jit(46),
                 y: lerp(lerp(p0.y, p3.y, 0.67), nu.y, pull) + jit(46) };
      majors.push({ pts: [p0, m1, m2, p3], snap: i % 6, nuc: i % 3, reveal: 0 });
    }

    function pointOnPoly(pts, t) {
      var seg = t * (pts.length - 1);
      var k2 = Math.min(pts.length - 2, Math.floor(seg));
      var f = seg - k2;
      return { x: lerp(pts[k2].x, pts[k2 + 1].x, f), y: lerp(pts[k2].y, pts[k2 + 1].y, f) };
    }

    /* SECONDARY creases: short connectors between majors — the network */
    var seconds = [];
    for (var s2 = 0; s2 < 24; s2++) {
      var A = majors[Math.floor(Math.random() * majors.length)];
      var B = majors[Math.floor(Math.random() * majors.length)];
      if (A === B) continue;
      seconds.push({
        a: pointOnPoly(A.pts, 0.2 + Math.random() * 0.6),
        b: pointOnPoly(B.pts, 0.2 + Math.random() * 0.6),
        snap: Math.min(5, Math.max(A.snap, B.snap) + 1),
        reveal: 0
      });
    }

    /* FACETS: wedges between angle-adjacent creases around each nucleus.
       Alternating light/shadow is what makes folded paper read as planes. */
    var facets = [];
    nuclei.forEach(function (nu, ni) {
      var mine = majors.filter(function (m) { return m.nuc === ni; });
      mine.sort(function (m1x, m2x) {
        var a1 = Math.atan2(pointOnPoly(m1x.pts, 0.5).y - nu.y, pointOnPoly(m1x.pts, 0.5).x - nu.x);
        var a2 = Math.atan2(pointOnPoly(m2x.pts, 0.5).y - nu.y, pointOnPoly(m2x.pts, 0.5).x - nu.x);
        return a1 - a2;
      });
      for (var f2 = 0; f2 < mine.length; f2++) {
        var mA = mine[f2], mB = mine[(f2 + 1) % mine.length];
        facets.push({ nu: nu, a: pointOnPoly(mA.pts, 0.45), b: pointOnPoly(mB.pts, 0.45),
                      light: f2 % 2 === 0, ra: mA, rb: mB });
      }
    });

    /* the collapsing silhouette: ten verts, per-stage targets */
    /* strict perimeter order — an out-of-order vertex makes the clip edge
       slice ACROSS the sheet instead of around it */
    var baseV = [
      { x: 0, y: 0 }, { x: W * 0.5, y: 0 }, { x: W, y: 0 },
      { x: W, y: H * 0.4 }, { x: W, y: H * 0.78 },
      { x: W * 0.55, y: H }, { x: 0, y: H },
      { x: 0, y: H * 0.6 }, { x: 0, y: H * 0.22 }
    ];
    var VIN = [0, 0.05, 0.11, 0.19, 0.30, 0.42, 0.55, 0.86];
    var VP = VIN.map(function (inw, k2) {
      return baseV.map(function (v) {
        var j = k2 === 0 ? 0 : (7 + k2 * 8);
        return { x: lerp(v.x, fx, inw) + jit(j), y: lerp(v.y, fy, inw) + jit(j) };
      });
    });
    var vcur = baseV.map(function (v) { return { x: v.x, y: v.y }; });

    /* the six snaps: where the body lands after each crush */
    function v(n2, s3) { return n2 * (1 + jit(s3)); }
    var TF = [
      { t: 0,    sx: 1,          sy: 1,          r: 0,        kx: 0,        ky: 0 },
      { t: 0.06, sx: v(.965,.02), sy: v(.945,.02), r: v(-1.6,.3), kx: v(1.6,.3),  ky: v(-0.6,.3) },
      { t: 0.13, sx: v(.895,.02), sy: v(.845,.02), r: v(2.3,.3),  kx: v(-2.4,.3), ky: v(1.4,.3) },
      { t: 0.22, sx: v(.795,.02), sy: v(.715,.02), r: v(-3.8,.3), kx: v(3.0,.3),  ky: v(-2.0,.3) },
      { t: 0.33, sx: v(.655,.02), sy: v(.565,.02), r: v(5.2,.3),  kx: v(-3.4,.3), ky: v(2.2,.3) },
      { t: 0.45, sx: v(.50,.03),  sy: v(.415,.03), r: v(-7.0,.3), kx: v(3.8,.3),  ky: v(-2.6,.3) },
      { t: 0.56, sx: v(.355,.03), sy: v(.29,.03),  r: v(9.0,.3),  kx: v(-3.0,.3), ky: v(2.0,.3) },
      { t: 1,    sx: 0.13,        sy: 0.11,        r: v(24,.4),   kx: 0,        ky: 0 }
    ];
    var DS = [6, 18, 30, 46, 62, 80, 88, 26];      /* displacement per stage */
    var SNAPS = [0.05, 0.15, 0.26, 0.38, 0.50, 0.61];

    var cs = { t: 0, sx: 1, sy: 1, r: 0, kx: 0, ky: 0, disp: 6 };

    document.body.style.pointerEvents = 'none';
    document.body.style.transformOrigin = fx + 'px ' + fy + 'px';
    document.body.style.willChange = 'transform, opacity, clip-path, filter';
    clearTimeout(bpStageTimer);
    bpStageTimer = setTimeout(clearBpStage, 4200);

    var DURATION = 2400;
    var startTime = null, lastTs = null;
    var ballVX = 90 + Math.random() * 70, ballVY = -60, ballX = fx, ballY = fy, ballR0 = 30;

    function drawCrease(pts, reveal, wBase) {
      if (reveal <= 0) return;
      var wLine = wBase * (0.4 + 0.6 * reveal);
      /* shadow side */
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = 'rgba(2,10,24,' + (0.30 * reveal).toFixed(3) + ')';
      ctx.lineWidth = wLine * 1.8;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var q = 1; q < pts.length; q++) ctx.lineTo(pts[q].x, pts[q].y);
      ctx.stroke();
      /* lit side, offset a hair — the V-groove */
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = 'rgba(205,232,255,' + (0.22 * reveal).toFixed(3) + ')';
      ctx.lineWidth = Math.max(0.5, wLine * 0.7);
      ctx.beginPath();
      ctx.moveTo(pts[0].x + 1.2, pts[0].y - 1.2);
      for (var q2 = 1; q2 < pts.length; q2++) ctx.lineTo(pts[q2].x + 1.2, pts[q2].y - 1.2);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    function step(ts) {
      if (!startTime) { startTime = ts; lastTs = ts; }
      var dt = Math.min(50, ts - lastTs); lastTs = ts;
      var p = clamp01((ts - startTime) / DURATION);

      var k = 0;
      for (var s3 = 0; s3 < SNAPS.length; s3++) if (p >= SNAPS[s3]) k = s3 + 1;
      var wad = p >= 0.62;
      var stage = wad ? 7 : k;

      /* hard approach — arrives fast, then HOLDS. That is the snap. */
      var blend = 1 - Math.exp(-dt / 42);
      var tf = TF[stage];
      cs.t  += (tf.t  - cs.t)  * blend;
      cs.sx += (tf.sx - cs.sx) * blend;
      cs.sy += (tf.sy - cs.sy) * blend;
      cs.r  += (tf.r  - cs.r)  * blend;
      cs.kx += (tf.kx - cs.kx) * blend;
      cs.ky += (tf.ky - cs.ky) * blend;
      cs.disp += (DS[stage] - cs.disp) * blend;

      var vt = VP[Math.min(stage, VP.length - 1)];
      for (var vi = 0; vi < vcur.length; vi++) {
        vcur[vi].x += (vt[vi].x - vcur[vi].x) * blend;
        vcur[vi].y += (vt[vi].y - vcur[vi].y) * blend;
      }

      /* creases reveal the moment their snap lands */
      majors.forEach(function (m) { if (m.snap < k) m.reveal = clamp01(m.reveal + dt / 90); });
      seconds.forEach(function (m) { if (m.snap < k) m.reveal = clamp01(m.reveal + dt / 110); });

      /* ── canvas ── */
      ctx.clearRect(0, 0, W, H);
      if (!wad || p < 0.7) {
        /* facets first, creases over them */
        facets.forEach(function (f3) {
          var rv = Math.min(f3.ra.reveal, f3.rb.reveal);
          if (rv <= 0) return;
          ctx.fillStyle = f3.light
            ? 'rgba(196,226,255,' + (0.055 * rv).toFixed(3) + ')'
            : 'rgba(2,10,24,'     + (0.085 * rv).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(f3.nu.x, f3.nu.y);
          ctx.lineTo(f3.a.x, f3.a.y);
          ctx.lineTo(f3.b.x, f3.b.y);
          ctx.closePath();
          ctx.fill();
        });
        majors.forEach(function (m) { drawCrease(m.pts, m.reveal, 1.6); });
        seconds.forEach(function (m) { drawCrease([m.a, m.b], m.reveal, 1.0); });

        /* the fist's shadow */
        var g2 = ctx.createRadialGradient(fx, fy, 10, fx, fy, Math.max(W, H) * 0.5);
        g2.addColorStop(0, 'rgba(0,8,20,' + (0.05 + cs.t * 0.22).toFixed(3) + ')');
        g2.addColorStop(1, 'rgba(0,8,20,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, W, H);
      }

      /* the wad: tumbling ball, tossed off */
      if (wad) {
        var bp2 = clamp01((p - 0.62) / 0.38);
        if (p > 0.74) {
          ballVY += dt * 0.5;                       /* gravity */
          ballX += ballVX * dt / 1000 * 8;
          ballY += ballVY * dt / 1000 * 6;
        }
        var br = lerp(ballR0, 16, bp2);
        var fade = p > 0.9 ? 1 - (p - 0.9) / 0.1 : 1;
        var bg2 = ctx.createRadialGradient(ballX - br * 0.4, ballY - br * 0.4, br * 0.1, ballX, ballY, br);
        bg2.addColorStop(0, 'rgba(232,243,255,' + (0.85 * fade).toFixed(3) + ')');
        bg2.addColorStop(0.55, 'rgba(140,178,222,' + (0.75 * fade).toFixed(3) + ')');
        bg2.addColorStop(1, 'rgba(10,24,48,' + (0.9 * fade).toFixed(3) + ')');
        ctx.fillStyle = bg2;
        ctx.beginPath();
        /* a lumpy wad, not a sphere */
        for (var w2 = 0; w2 <= 12; w2++) {
          var aa = (w2 / 12) * Math.PI * 2;
          var rr = br * (0.82 + 0.18 * Math.sin(aa * 3 + p * 9));
          var px2 = ballX + Math.cos(aa + p * 4) * rr;
          var py2 = ballY + Math.sin(aa + p * 4) * rr;
          w2 ? ctx.lineTo(px2, py2) : ctx.moveTo(px2, py2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(4,14,30,' + (0.4 * fade).toFixed(3) + ')';
        ctx.lineWidth = 1;
        for (var c2 = 0; c2 < 5; c2++) {
          ctx.beginPath();
          ctx.arc(ballX + jitStable(c2) * br * 0.3, ballY + jitStable(c2 + 5) * br * 0.3,
                  br * (0.3 + c2 * 0.12), c2, c2 + 2.2);
          ctx.stroke();
        }
      }

      /* ── the sheet itself ── */
      if (dispEl)   dispEl.setAttribute('scale', cs.disp.toFixed(1));
      if (dispBgEl) dispBgEl.setAttribute('scale', (cs.disp * 1.2).toFixed(1));
      if (turbEl)   turbEl.setAttribute('baseFrequency', (0.02 + cs.t * 0.055).toFixed(4));

      var poly = 'polygon(' + vcur.map(function (v2) {
        return v2.x.toFixed(1) + 'px ' + v2.y.toFixed(1) + 'px';
      }).join(',') + ')';
      document.body.style.clipPath = poly;
      document.body.style.transform =
        'scale(' + cs.sx.toFixed(4) + ',' + cs.sy.toFixed(4) + ')' +
        ' rotate(' + cs.r.toFixed(2) + 'deg)' +
        ' skew(' + cs.kx.toFixed(2) + 'deg,' + cs.ky.toFixed(2) + 'deg)';
      document.body.style.filter = 'contrast(' + (1 + cs.t * 0.14).toFixed(3) + ')';
      document.body.style.opacity = String(p < 0.62 ? 1 : clamp01(1 - (p - 0.62) / 0.16));

      if (p < 1) requestAnimationFrame(step);
      else { cvs.remove(); (after || teardown)(); }
    }

    /* stable per-index jitter for the wad's crease arcs */
    var jitCache = {};
    function jitStable(n2) {
      if (!(n2 in jitCache)) jitCache[n2] = (Math.random() - 0.5) * 2;
      return jitCache[n2];
    }

    requestAnimationFrame(step);
  }
  /* RESET: the ruined sheet gets crumpled and tossed exactly like the exit —
     you do not un-smudge a blueprint, you bin it — and then a clean sheet is
     laid on the table. Blueprint mode stays on throughout. */
  function triggerReset() {
    triggerCrinkle(function () {
      /* clear every style the crumple drove */
      document.body.style.transform     = '';
      document.body.style.opacity      = '0';
      document.body.style.filter        = '';
      document.body.style.pointerEvents = '';
      document.body.style.transformOrigin = '';
      document.body.style.clipPath      = '';
      document.body.style.borderRadius  = '';
      clearBpStage();
      var dEl  = document.getElementById('bp-disp');
      var dbEl = document.getElementById('bp-disp-bg');
      var tEl  = document.getElementById('bp-turb');
      if (dEl)  dEl.setAttribute('scale', '3');
      if (dbEl) dbEl.setAttribute('scale', '4');
      if (tEl)  tEl.setAttribute('baseFrequency', '0.032');

      bpResetBoard(true);                       /* wipe smudges, keep the mode */

      /* the fresh sheet: laid in from just above, like a new page on the table */
      document.body.style.opacity = '';
      try {
        document.body.animate([
          { opacity: 0, transform: 'translateY(-20px) scale(0.988)' },
          { opacity: 1, transform: 'none' }
        ], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' });
      } catch (e2) {}
      showToast('[ FRESH SHEET ]');
    });
  }

  try { window.__bpCrinkle = triggerCrinkle; window.__bpReset = triggerReset; } catch (e) {}

  function toggleBlueprint() {
    var turningOn = !document.body.classList.contains('blueprint');
    document.body.classList.toggle('blueprint');
    if (turningOn) {
      initBlueprintInteractive();
    } else {
      destroyBlueprintInteractive();
    }
    showToast(
      document.body.classList.contains('blueprint')
        ? '[ BLUEPRINT MODE ON ]'
        : '[ BLUEPRINT MODE OFF ]'
    );
  }

  function showToast(msg) {
    var toast = document.getElementById('mode-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mode-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('toast-show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.classList.remove('toast-show'); }, 2000);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'b' && e.key !== 'B') return;
    var tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    var cli = document.getElementById('cli-overlay');
    if (cli && cli.classList.contains('cli-open')) return;
    toggleBlueprint();
  });

  /* Konami code — the terminal and the projects card both hint it; make it
     real. The full sequence boots the hidden Windows 95 desktop. */
  var KONAMI = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
  var kPos = 0;
  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    var cli = document.getElementById('cli-overlay');
    if (cli && cli.classList.contains('cli-open')) return;
    var key = e.key.toLowerCase();
    if (key === KONAMI[kPos]) {
      kPos++;
      if (kPos === KONAMI.length) {
        kPos = 0;
        if (typeof toast === 'function') toast('Booting desktop…');
        setTimeout(function () { window.location.href = 'desktop.html'; }, 480);
      }
    } else {
      kPos = (key === KONAMI[0]) ? 1 : 0;   // allow a fresh start on the first key
    }
  });

  } // end init()

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
