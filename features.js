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
      printRaw('<span class="cli-nf-key">Univ:</span>   <span class="cli-nf-val">U of Arkansas  ·  Honors College</span>');
      printRaw('<span class="cli-nf-key">Lang:</span>   <span class="cli-nf-val">C++  Python  JS  TS</span>');
      printRaw('<span class="cli-nf-key">HW:</span>     <span class="cli-nf-val">Arduino  PCB  3D Printing</span>');
      printRaw('<span class="cli-nf-key">GPA:</span>    <span class="cli-nf-val">4.0  ·  Chancellor\'s List</span>');
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
          printLine('  ├── avr-drone       Autonomous AVR competition drone: 4th nationally', 'out');
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
          printLine('  └── desktop/        hidden: try the Konami code ↑↑↓↓←→←→BA', 'dim');
          printLine('', '');
        }
      },

      cat: function (args) {
        if (args[0] === 'about') {
          printLine('', '');
          printLine('  NAME        Hudson Tinch', 'success');
          printLine('  ROLE        Robotics Captain, Engineer, Maker', 'out');
          printLine('  SCHOOL      University of Arkansas · Honors College', 'out');
          printLine('  PROGRAM     McMillon Innovation Studio', 'out');
          printLine('  GPA         4.0 · Chancellor\'s List', 'out');
          printLine('', '');
          printLine('  I build things: robotics, apps, hardware. From leading', 'out');
          printLine('  competition drone teams to founding a 3D printing business', 'out');
          printLine('  at age 9, I turn ideas into real objects.', 'out');
          printLine('', '');
        } else {
          printLine('  cat: ' + (args[0] || '(no file)') + ': No such file. Try "cat about"', 'err');
        }
      },

      whoami: function () {
        printLine('', '');
        printLine('  Hudson Tinch · robotics captain, maker, developer', 'success');
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
          printLine('    hudson · robotics captain, engineer, maker', 'out');
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
          printLine('    Dimensional Design 3D · founded age 8 (2014–2020)', 'out');
          printLine('', '');
          printLine('  AWARDS', 'info');
          printLine('    Bell AVR Nationals · 4th Place', 'out');
          printLine('    Robotics Best Design + Judge\'s Choice', 'out');
          printLine('    Presidential Service Award', 'out');
          printLine('    HP MAPS Scots Tank Winner', 'out');
          printLine('    Chancellor\'s List · 4.0 GPA', 'out');
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
        printLine('  command not found: ' + cmd + '. Type "help" for commands', 'err');
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

  var bpEraseState = null, bpCrumbCanvas = null, bpCrumbCtx = null,
      bpCrumbs = [], bpCrumbRaf = null, bpScratchBtn = null, bpEraseToastShown = false;

  function initBlueprintInteractive() {
    bpSmudgeCount = 0;
    bpRuined = false;
    bpJustDragged = false;
    bpEraseState = null; bpCrumbs = []; bpEraseToastShown = false;

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

    /* crumbs fly above the content, below any overlays */
    bpCrumbCanvas = document.createElement('canvas');
    bpCrumbCanvas.id = 'bp-crumb-canvas';
    bpCrumbCanvas.width = window.innerWidth;
    bpCrumbCanvas.height = window.innerHeight;
    bpCrumbCanvas.style.cssText = 'position:fixed;inset:0;z-index:99000;pointer-events:none;';
    document.body.appendChild(bpCrumbCanvas);
    bpCrumbCtx = bpCrumbCanvas.getContext('2d');

    /* the way out is ON the sheet: a drafting-table control, always there */
    bpScratchBtn = document.createElement('button');
    bpScratchBtn.id = 'bp-scratch-btn';
    bpScratchBtn.type = 'button';
    bpScratchBtn.textContent = '\u27F2 crumple it up';
    bpScratchBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      triggerCrinkle();
    });
    document.body.appendChild(bpScratchBtn);

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
    if (bpCrumbCanvas) { bpCrumbCanvas.remove(); bpCrumbCanvas = null; bpCrumbCtx = null; }
    if (bpScratchBtn)  { bpScratchBtn.remove();  bpScratchBtn = null; }
    if (bpCrumbRaf) { cancelAnimationFrame(bpCrumbRaf); bpCrumbRaf = null; }
    bpCrumbs = []; bpEraseState = null;
    document.removeEventListener('mousedown', bpMouseDown);
    document.removeEventListener('mousemove', bpMouseMove);
    document.removeEventListener('mouseup',   bpMouseUp);
    document.removeEventListener('click',     bpClick);
  }

  function bpMouseDown(e) {
    if (!document.body.classList.contains('blueprint') || bpRuined) return;
    if (e.target.closest('#bp-scratch-btn, .bp-ruined-overlay')) return;
    var el = e.target.closest('[data-bp-drag]');
    if (!el) {
      /* not a draggable: this press might become an ERASE scrub */
      bpEraseState = { x: e.clientX, y: e.clientY, dist: 0, active: false, lastHit: 0 };
      return;
    }
    e.preventDefault();
    var tx = parseFloat(el.dataset.bpTx) || 0;
    var ty = parseFloat(el.dataset.bpTy) || 0;
    bpDragState = { el: el, ox: e.clientX - tx, oy: e.clientY - ty, moved: false };
    el.classList.add('bp-dragging');
  }

  function bpMouseMove(e) {
    if (bpEraseState && (e.buttons & 1)) { bpEraseMove(e); return; }
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
    if (bpEraseState) {
      if (bpEraseState.active) bpJustDragged = true;   /* a scrub is not a click */
      bpEraseState = null;
    }
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

  function bpEraseMove(e) {
    var st = bpEraseState;
    var dx = e.clientX - st.x, dy = e.clientY - st.y;
    var d = Math.hypot(dx, dy);
    st.dist += d;
    if (!st.active && st.dist > 14) {
      st.active = true;
      if (!bpEraseToastShown) { bpEraseToastShown = true; showToast('[ ERASING ]'); }
    }
    if (!st.active) { st.x = e.clientX; st.y = e.clientY; return; }

    /* lift the ink under the stroke */
    if (bpBgCtx) {
      bpBgCtx.save();
      bpBgCtx.globalCompositeOperation = 'destination-out';
      var steps = Math.max(1, Math.ceil(d / 10));
      for (var i = 0; i <= steps; i++) {
        var x = st.x + dx * i / steps, y = st.y + dy * i / steps;
        var grd = bpBgCtx.createRadialGradient(x, y, 0, x, y, 34);
        grd.addColorStop(0, 'rgba(0,0,0,0.8)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        bpBgCtx.fillStyle = grd;
        bpBgCtx.beginPath(); bpBgCtx.arc(x, y, 34, 0, 6.2832); bpBgCtx.fill();
      }
      bpBgCtx.restore();
    }

    /* crumbs off the tip, more when you scrub harder */
    var n = Math.min(6, Math.floor(d / 8));
    for (var j = 0; j < n; j++) {
      bpCrumbs.push({
        x: e.clientX + (Math.random() - 0.5) * 22, y: e.clientY + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 2.6 + dx * 0.05, vy: -Math.random() * 2.2,
        r: 1.2 + Math.random() * 2.4, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
        a: 0.9
      });
    }
    if (bpCrumbs.length > 380) bpCrumbs.splice(0, bpCrumbs.length - 380);
    if (!bpCrumbRaf && bpCrumbs.length) bpCrumbRaf = requestAnimationFrame(bpCrumbFrame);

    /* scrubbing over a smudged element cleans it a level; every 300px of
       honest scrubbing also walks the ruin counter back one */
    var now = performance.now();
    if (now - st.lastHit > 120) {
      st.lastHit = now;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        var sm = el.closest('.bp-smudged-1, .bp-smudged-2, .bp-smudged-3');
        if (sm) {
          var lvl = sm.classList.contains('bp-smudged-3') ? 3 :
                    sm.classList.contains('bp-smudged-2') ? 2 : 1;
          sm.classList.remove('bp-smudged-1', 'bp-smudged-2', 'bp-smudged-3');
          if (lvl > 1) sm.classList.add('bp-smudged-' + (lvl - 1));
          var tx = parseFloat(sm.dataset.bpTx) || 0, ty = parseFloat(sm.dataset.bpTy) || 0;
          sm.style.transform = bpBuildTransform(sm, tx, ty);
          bpSmudgeCount = Math.max(0, bpSmudgeCount - 1);
        }
      }
    }
    if (st.dist > 300) { st.dist = 0; bpSmudgeCount = Math.max(0, bpSmudgeCount - 1); }
    st.x = e.clientX; st.y = e.clientY;
  }

  var bpCrumbLast = 0;
  function bpCrumbFrame(ts) {
    bpCrumbRaf = null;
    if (!bpCrumbCtx || !bpCrumbCanvas) return;
    var dt = Math.min(40, ts - bpCrumbLast || 16); bpCrumbLast = ts;
    var W2 = bpCrumbCanvas.width, H2 = bpCrumbCanvas.height;
    bpCrumbCtx.clearRect(0, 0, W2, H2);
    for (var i = 0; i < bpCrumbs.length; i++) {
      var c2 = bpCrumbs[i];
      c2.vy += dt * 0.011; c2.x += c2.vx * dt / 16; c2.y += c2.vy * dt / 16; c2.rot += c2.vr;
      if (c2.y > H2 - 12) { c2.y = H2 - 12; c2.vy *= -0.25; c2.vx *= 0.7; c2.a -= 0.02; }
      c2.a -= dt * 0.00022;
      if (c2.a <= 0) { bpCrumbs.splice(i, 1); i--; continue; }
      bpCrumbCtx.save();
      bpCrumbCtx.translate(c2.x, c2.y); bpCrumbCtx.rotate(c2.rot);
      bpCrumbCtx.fillStyle = 'rgba(170,200,235,' + c2.a.toFixed(3) + ')';
      bpCrumbCtx.fillRect(-c2.r, -c2.r * 0.5, c2.r * 2, c2.r);
      bpCrumbCtx.restore();
    }
    if (bpCrumbs.length) bpCrumbRaf = requestAnimationFrame(bpCrumbFrame);
    else bpCrumbCtx.clearRect(0, 0, W2, H2);
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
            '<button class="bp-btn bp-btn-crinkle" id="bp-crinkle-btn">crumple it up</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(bpHintEl);

      // Wire button — stopPropagation so bpClick doesn't double-fire.
      // One action only: every crumple lands back on the normal site.
      document.getElementById('bp-crinkle-btn').addEventListener('click', function(e){
        e.stopPropagation(); triggerCrinkle();
      });
    }
  }

  // Build transform preserving drag translate + smudge skew
  function bpBuildTransform(el, tx, ty) {
    var skew = el.classList.contains('bp-smudged-3') ? ' skewX(-6deg) rotate(-2deg)'   :
               el.classList.contains('bp-smudged-2') ? ' skewX(-3deg) rotate(-0.8deg)' :
               el.classList.contains('bp-smudged-1') ? ' skewX(-1.5deg)'               : '';
    return 'translate(' + tx + 'px, ' + ty + 'px)' + skew;
  }

  /* ── Crinkle exit ───────────────────────────────────────────────
     A real WebGL cloth: the blueprint page is rasterized onto a
     44x30 sheet (actual glyphs on the first line of every text node,
     bars for the wraps, the visitor's own smudges baked in), then
     crumpled rim-first into the grab — folds deepening, seeded noise
     so no two crumples fold alike, never compacting to a ball — and
     dissolved while it still reads as paper. The page underneath has
     already switched back to the NORMAL site: every crumple, from
     the sheet button or the ruined overlay, ends there.
  ─────────────────────────────────────────────────────────────── */

  function bpRasterize() {
    var W = window.innerWidth, H = window.innerHeight;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    g.fillStyle = '#04244e';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(144,202,255,0.08)'; g.lineWidth = 1;
    for (var x = 0; x <= W; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (var y = 0; y <= H; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = 'rgba(144,202,255,0.16)';
    for (x = 0; x <= W; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (y = 0; y <= H; y += 120) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

    /* boxes for the card-like things */
    document.querySelectorAll('.about-card, .project-card, .case, .case-sm, .hero-panel, .site-nav').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < 8 || r.bottom < 0 || r.top > H) return;
      g.strokeStyle = 'rgba(144,202,255,0.35)';
      g.strokeRect(r.left, r.top, r.width, r.height);
    });

    /* text: real glyphs on each node's first line box, bars for the rest */
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.textContent || !n.textContent.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p || p.closest('#boot, script, style, .bp-ruined-overlay')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var drawn = 0, node;
    while ((node = walker.nextNode()) && drawn < 260) {
      var range = document.createRange();
      range.selectNodeContents(node);
      var rects = range.getClientRects();
      if (!rects.length) continue;
      var st = getComputedStyle(node.parentElement);
      if (st.visibility === 'hidden' || parseFloat(st.opacity) < 0.05) continue;
      for (var i = 0; i < rects.length && drawn < 260; i++) {
        var r2 = rects[i];
        if (r2.bottom < 0 || r2.top > H || r2.width < 2) continue;
        drawn++;
        if (i === 0) {
          g.font = st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
          g.fillStyle = 'rgba(214,232,255,0.92)';
          g.save();
          g.beginPath(); g.rect(r2.left, r2.top, r2.width + 2, r2.height); g.clip();
          g.fillText(node.textContent.trim(), r2.left, r2.top + r2.height * 0.78);
          g.restore();
        } else {
          g.fillStyle = 'rgba(214,232,255,0.5)';
          g.fillRect(r2.left, r2.top + r2.height * 0.28, r2.width, Math.min(10, r2.height * 0.42));
        }
      }
    }
    /* the visitor's own smears go into the wad */
    if (bpBgCanvas) { try { g.drawImage(bpBgCanvas, 0, 0, W, H); } catch (e) {} }
    return c;
  }

  /* seeded value noise for the lumps */
  function bpNoise(seed) {
    function h(x, y) { var s2 = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return s2 - Math.floor(s2); }
    function n(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var a2 = h(xi, yi), b2 = h(xi + 1, yi), c2 = h(xi, yi + 1), d2 = h(xi + 1, yi + 1);
      var ux = xf * xf * (3 - 2 * xf), uy = yf * yf * (3 - 2 * yf);
      return a2 + (b2 - a2) * ux + (c2 - a2) * uy + (a2 - b2 - c2 + d2) * ux * uy;
    }
    return function (x, y) { return n(x, y) * 0.6 + n(x * 2.3, y * 2.3) * 0.28 + n(x * 5.1, y * 5.1) * 0.12; };
  }
  function bpSS(a2, b2, x) { x = Math.max(0, Math.min(1, (x - a2) / (b2 - a2))); return x * x * (3 - 2 * x); }
  function bpMix(a2, b2, t) { return a2 + (b2 - a2) * t; }

  function triggerCrinkle() {
    if (bpHintEl) { bpHintEl.remove(); bpHintEl = null; }

    var dispEl   = document.getElementById('bp-disp');
    var dispBgEl = document.getElementById('bp-disp-bg');
    var turbEl   = document.getElementById('bp-turb');

    function restoreFilters() {
      if (dispEl)   dispEl.setAttribute('scale', '3');
      if (dispBgEl) dispBgEl.setAttribute('scale', '4');
      if (turbEl)   turbEl.setAttribute('baseFrequency', '0.032');
    }
    function exitTeardown() {
      restoreFilters();
      clearBpStage();
      destroyBlueprintInteractive();
      document.body.classList.remove('blueprint', 'bp-ruined');
      showToast('[ BLUEPRINT MODE OFF ]');
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.style.transition = 'opacity 380ms ease';
      document.body.style.opacity = '0';
      setTimeout(function () {
        document.body.style.transition = '';
        document.body.style.opacity = '';
        exitTeardown();
      }, 400);
      return;
    }

    var W = window.innerWidth, H = window.innerHeight;
    var tex = bpRasterize();
    var seed = Math.floor(Math.random() * 1000) + 1;
    var no = bpNoise(seed);

    /* the overlay: a 2D shadow layer under a GL cloth */
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:999996;pointer-events:none;';
    var sCv = document.createElement('canvas');
    sCv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    var glCv = document.createElement('canvas');
    glCv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    wrap.appendChild(sCv); wrap.appendChild(glCv);
    document.body.appendChild(wrap);
    var sg = sCv.getContext('2d');

    var gl = glCv.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });

    /* if WebGL is refused, fall back to a quick fade — never strand the page */
    if (!gl) {
      wrap.remove();
      document.body.style.transition = 'opacity 320ms ease';
      document.body.style.opacity = '0';
      setTimeout(function () {
        document.body.style.transition = ''; document.body.style.opacity = '';
        exitTeardown();
      }, 340);
      return;
    }

    var VS2 = 'attribute vec3 aPos;attribute vec3 aNrm;attribute vec2 aUV;attribute float aAO;' +
      'uniform vec2 uRes;varying vec2 vUV;varying vec3 vN;varying float vAO;' +
      'void main(){vUV=aUV;vN=aNrm;vAO=aAO;' +
      'float persp=1.0/(1.0+aPos.z*0.0016);' +
      'vec2 xy=(aPos.xy-uRes*0.5)*persp+uRes*0.5;' +
      'vec2 clip=xy/uRes*2.0-1.0;' +
      'gl_Position=vec4(clip.x,-clip.y,aPos.z*0.0004,1.0);}';
    var FS2 = 'precision mediump float;uniform sampler2D uTex;' +
      'varying vec2 vUV;varying vec3 vN;varying float vAO;' +
      'void main(){vec3 N=normalize(vN);' +
      'vec3 L=normalize(vec3(0.35,-0.5,0.79));' +
      'float dif=max(0.0,dot(N,L));' +
      'float back=max(0.0,dot(N,vec3(-0.3,0.4,-0.87)));' +
      'vec4 t=texture2D(uTex,vUV);' +
      'float light=0.36+dif*0.74+back*0.10;' +
      'float spec=pow(max(0.0,dot(N,normalize(L+vec3(0.0,0.0,1.0)))),24.0)*0.15;' +
      'gl_FragColor=vec4(t.rgb*light*vAO+vec3(spec),1.0);}';
    function mkSh(t2, src) { var o = gl.createShader(t2); gl.shaderSource(o, src); gl.compileShader(o);
      return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
    var prog = gl.createProgram();
    var vsh = mkSh(gl.VERTEX_SHADER, VS2), fsh = mkSh(gl.FRAGMENT_SHADER, FS2);
    if (!vsh || !fsh) { wrap.remove(); exitTeardown(); return; }
    gl.attachShader(prog, vsh); gl.attachShader(prog, fsh); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { wrap.remove(); exitTeardown(); return; }
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var COLS = 44, ROWS = 30, vcount = (COLS + 1) * (ROWS + 1);
    var uv = new Float32Array(vcount * 2), k = 0;
    for (var r3 = 0; r3 <= ROWS; r3++) for (var c3 = 0; c3 <= COLS; c3++) {
      uv[k * 2] = c3 / COLS; uv[k * 2 + 1] = r3 / ROWS; k++;
    }
    var idx = new Uint16Array(COLS * ROWS * 6), q = 0;
    for (r3 = 0; r3 < ROWS; r3++) for (c3 = 0; c3 < COLS; c3++) {
      var a3 = r3 * (COLS + 1) + c3, b3 = a3 + 1, c4 = a3 + COLS + 1, d4 = c4 + 1;
      idx[q++] = a3; idx[q++] = c4; idx[q++] = b3; idx[q++] = b3; idx[q++] = c4; idx[q++] = d4;
    }
    var pos = new Float32Array(vcount * 3), nrm = new Float32Array(vcount * 3), ao = new Float32Array(vcount);
    function mkBuf(data, name, size, dyn) {
      var b4 = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b4);
      gl.bufferData(gl.ARRAY_BUFFER, data, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return b4;
    }
    var bPos = mkBuf(pos, 'aPos', 3, true), bNrm = mkBuf(nrm, 'aNrm', 3, true);
    mkBuf(uv, 'aUV', 2, false);
    var bAO = mkBuf(ao, 'aAO', 1, true);
    var bIdx = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    var uRes = gl.getUniformLocation(prog, 'uRes');

    /* ── the crumple, as paper actually does it ──────────────────────
       Not a morph: every vertex carries a COLLAPSE ORDER — rim first,
       centre last, noised so no two runs fold alike — and its own local
       progress. The edges curl up and roll inward while the middle is
       still flat and readable, and the folds pile onto the gathering
       mass. The reference is a crumpled-paper unfurl played backwards. */
    var cx = W * (0.42 + (seed % 17) / 100), cy = H * 0.46;

    /* no throw, no ball, no wad — the crumple IS the whole show. The pull
       is capped so the sheet only ever scrunches to sheet scale, and it
       dissolves while it is still obviously paper, leaving the normal
       site standing. */
    function displace(u, v, t) {
      var grabG = bpSS(0.03, 0.9, t);

      var rim = Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2;
      var ord = 1 - (0.62 * rim + 0.38 * no(u * 3.1 + 9.0, v * 3.1));
      ord = Math.max(0, Math.min(1, ord));
      var g = bpSS(ord * 0.52, ord * 0.52 + 0.44, grabG);

      var px = bpMix(-0.03, 1.03, u) * W, py = bpMix(-0.03, 1.03, v) * H;

      var fistX = cx + Math.sin(grabG * 2.6) * 26, fistY = cy + Math.cos(grabG * 2.1) * 18;
      var pull = g * 0.62;      /* capped: a scrunched sheet, never a fist-sized wad */
      var gx = px - (px - fistX) * pull, gy = py - (py - fistY) * pull;

      var lift = Math.sin(Math.min(1, g * 1.15) * 3.14159);
      var gz = lift * (70 + 150 * no(u * 2.2 + 4.0, v * 2.2)) + g * 40;
      /* creases only ever deepen — rise fast, then hold to the last frame */
      var amp = Math.min(W, H) * 0.17 * bpSS(0, 0.55, g) + g * 30;
      var nz = (no(u * 5.4, v * 5.4) - 0.5) * 2;
      gz += nz * amp;
      gx += (no(u * 4.1 + 2.2, v * 4.1) - 0.5) * amp * 0.7;
      gy += (no(u * 4.1, v * 4.1 + 6.1) - 0.5) * amp * 0.7;
      return [gx, gy, gz];
    }

    document.body.style.pointerEvents = 'none';
    clearTimeout(bpStageTimer);
    bpStageTimer = setTimeout(clearBpStage, 4200);

    /* the page beneath switches state the moment the flat sheet covers it —
       the NORMAL site is what the sheet crumples away to reveal, always */
    var swapped = false;
    function swapUnder() {
      if (swapped) return; swapped = true;
      restoreFilters();
      clearBpStage();
      destroyBlueprintInteractive();
      document.body.classList.remove('blueprint', 'bp-ruined');
    }

    var DURATION = 1500;
    var startTime = null, done = false;
    function finishAll() {
      if (done) return; done = true;
      wrap.remove();
      document.body.style.pointerEvents = '';
      clearBpStage();
      showToast('[ BLUEPRINT MODE OFF ]');
    }

    function frame(ts) {
      if (done) return;
      if (!startTime) startTime = ts;
      var t = Math.min(1, (ts - startTime) / DURATION);
      if (t > 0.04) swapUnder();                 /* one frame of full cover is enough */

      var d2 = Math.min(devicePixelRatio || 1, 1.75);
      var wpx = Math.floor(W * d2), hpx = Math.floor(H * d2);
      if (glCv.width !== wpx) { glCv.width = wpx; glCv.height = hpx; }
      gl.viewport(0, 0, wpx, hpx);
      gl.uniform2f(uRes, wpx, hpx);

      var scale = d2;
      for (var i2 = 0; i2 < vcount; i2++) {
        var u2 = uv[i2 * 2], v2 = uv[i2 * 2 + 1];
        var o2 = displace(u2, v2, t);
        pos[i2 * 3] = o2[0] * scale; pos[i2 * 3 + 1] = o2[1] * scale; pos[i2 * 3 + 2] = o2[2] * scale;
      }
      var eps = 1 / Math.max(COLS, ROWS);
      for (i2 = 0; i2 < vcount; i2++) {
        var u3 = uv[i2 * 2], v3 = uv[i2 * 2 + 1];
        var pa = displace(Math.min(1, u3 + eps), v3, t), pb = displace(Math.max(0, u3 - eps), v3, t);
        var pc = displace(u3, Math.min(1, v3 + eps), t), pd = displace(u3, Math.max(0, v3 - eps), t);
        var tx = [pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]];
        var ty = [pc[0] - pd[0], pc[1] - pd[1], pc[2] - pd[2]];
        var nx = ty[1] * tx[2] - ty[2] * tx[1], ny = ty[2] * tx[0] - ty[0] * tx[2], nz2 = ty[0] * tx[1] - ty[1] * tx[0];
        var ln = Math.hypot(nx, ny, nz2) || 1;
        nrm[i2 * 3] = nx / ln; nrm[i2 * 3 + 1] = ny / ln; nrm[i2 * 3 + 2] = nz2 / ln;
        var here = displace(u3, v3, t);
        var bend = Math.abs(pa[2] + pb[2] - 2 * here[2]) + Math.abs(pc[2] + pd[2] - 2 * here[2]);
        ao[i2] = Math.max(0.42, 1 - bend * 0.011);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, bPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, bNrm); gl.bufferSubData(gl.ARRAY_BUFFER, 0, nrm);
      gl.bindBuffer(gl.ARRAY_BUFFER, bAO);  gl.bufferSubData(gl.ARRAY_BUFFER, 0, ao);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, COLS * ROWS * 6, gl.UNSIGNED_SHORT, 0);
      /* dissolve WHILE it is still a sheet — by the time the pull could
         read as compact, the paper is already gone */
      wrap.style.opacity = String(1 - bpSS(0.6, 0.95, t));

      if (t < 1) requestAnimationFrame(frame);
      else finishAll();
    }
    requestAnimationFrame(frame);
    setTimeout(finishAll, DURATION + 1000);      /* dead-man */
  }

  try { window.__bpCrinkle = triggerCrinkle; } catch (e) {}

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
