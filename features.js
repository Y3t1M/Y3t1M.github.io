/* ============================================================
   FEATURES — Firmware Flash, CLI Terminal, Blueprint Mode
   features.js
   ============================================================ */
(function () {
  'use strict';

  function init() {
  /* ================================================================
     1. FIRMWARE FLASH PAGE LOAD
        Mimics Arduino IDE upload screen on first visit per session.
     ================================================================ */
  (function initFirmwareFlash() {
    // Only show once per session
    if (sessionStorage.getItem('fw_shown')) return;
    sessionStorage.setItem('fw_shown', '1');

    var overlay = document.createElement('div');
    overlay.id = 'firmware-overlay';
    overlay.innerHTML =
      '<div id="firmware-inner">' +
        '<div class="fw-topbar">' +
          '<div class="fw-dot fw-dot-red"></div>' +
          '<div class="fw-dot fw-dot-yellow"></div>' +
          '<div class="fw-dot fw-dot-green"></div>' +
          '<span class="fw-title">hudson@archlinux: ~</span>' +
        '</div>' +
        '<div class="fw-body" id="fw-body"></div>' +
      '</div>';

    document.body.appendChild(overlay);

    var body = document.getElementById('fw-body');

    var art = [
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

    var lines = [];
    lines.push({ html: '<span class="cli-p-user">hudson</span><span style="color:#888">@</span><span class="cli-p-host">archlinux</span> <span class="cli-p-tilde">~</span><span class="cli-p-dollar"> $</span> <span class="cli-nf-val">neofetch</span>', delay: 0 });
    lines.push({ html: '', delay: 100 });
    for (var i = 0; i < art.length; i++) {
      lines.push({ html: '<span class="cli-nf-art">' + art[i] + '</span>', delay: 48 });
    }
    lines.push({ html: '', delay: 60 });
    lines.push({ html: '<span class="cli-p-user">hudson</span><span style="color:#888">@</span><span class="cli-p-host">archlinux</span>', delay: 0 });
    lines.push({ html: '<span class="cli-nf-key">-------------------------------</span>', delay: 20 });
    lines.push({ html: '<span class="cli-nf-key">OS:</span>     <span class="cli-nf-val">HudsonInch GNU/Linux x86_64</span>', delay: 35 });
    lines.push({ html: '<span class="cli-nf-key">Host:</span>   <span class="cli-nf-val">Y3t1M.github.io</span>', delay: 35 });
    lines.push({ html: '<span class="cli-nf-key">Role:</span>   <span class="cli-nf-val">Robotics Captain  •  Maker</span>', delay: 35 });
    lines.push({ html: '<span class="cli-nf-key">Univ:</span>   <span class="cli-nf-val">U of Arkansas  —  Honors College</span>', delay: 35 });
    lines.push({ html: '<span class="cli-nf-key">Lang:</span>   <span class="cli-nf-val">C++  Python  JS  TS</span>', delay: 35 });
    lines.push({ html: '<span class="cli-nf-key">HW:</span>     <span class="cli-nf-val">Arduino  PCB  3D Printing</span>', delay: 35 });
    lines.push({ html: '<span class="cli-nf-key">GPA:</span>    <span class="cli-nf-val">4.0  —  Chancellor\'s List</span>', delay: 35 });
    lines.push({ html: '', delay: 80 });
    lines.push({ html: '<span class="cli-p-dollar">$</span> <span class="cli-nf-val" style="color:#4ade80">// portfolio loaded — welcome</span>', delay: 160 });

    var idx = 0;
    function printNext() {
      if (idx >= lines.length) {
        setTimeout(function () {
          overlay.classList.add('fw-fade');
          setTimeout(function () { overlay.remove(); }, 520);
        }, 520);
        return;
      }
      var line = lines[idx++];
      var el = document.createElement('div');
      el.className = 'fw-output-line fw-active';
      el.innerHTML = line.html;
      body.appendChild(el);
      setTimeout(printNext, line.delay);
    }
    setTimeout(printNext, 220);
  })();


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
    document.body.appendChild(slashHint);

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
      printRaw('<span class="cli-nf-key">Host:</span>   <span class="cli-nf-val">Y3t1M.github.io</span>');
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
        e.stopPropagation(); bpResetBoard();
      });
    }
  }

  function bpResetBoard() {
    // Remove the overlay
    if (bpHintEl) { bpHintEl.remove(); bpHintEl = null; }
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
    showToast('[ BLUEPRINT RESET ]');
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
  function triggerCrinkle() {
    if (bpHintEl) { bpHintEl.remove(); bpHintEl = null; }

    var W = window.innerWidth;
    var H = window.innerHeight;

    // Full-screen canvas for crease lines drawn on top of page
    var cvs = document.createElement('canvas');
    cvs.style.cssText = 'position:fixed;inset:0;z-index:999997;pointer-events:none;';
    cvs.width  = W;
    cvs.height = H;
    document.body.appendChild(cvs);
    var ctx = cvs.getContext('2d');

    var fx = W * (0.4 + Math.random() * 0.2);
    var fy = H * (0.34 + Math.random() * 0.24);
    var diag = Math.sqrt(W * W + H * H);

    // Fold facets simulate paper planes catching light differently while crumpling.
    var facets = [];
    var FACET_COUNT = Math.max(130, Math.min(230, Math.round((W * H) / 7800)));
    for (var i = 0; i < FACET_COUNT; i++) {
      var fa = Math.random() * Math.PI * 2;
      var fr = Math.pow(Math.random(), 0.7) * diag * 0.58;
      var cx0 = fx + Math.cos(fa) * fr + (Math.random() - 0.5) * 30;
      var cy0 = fy + Math.sin(fa) * fr + (Math.random() - 0.5) * 30;
      facets.push({
        x: cx0,
        y: cy0,
        angle: Math.random() * Math.PI * 2,
        long: 12 + Math.random() * 30,
        short: 6 + Math.random() * 18,
        depth: (Math.random() - 0.5) * 2,
        pull: 0.3 + Math.random() * 1.05,
        spin: (Math.random() - 0.5) * 2.2,
        tw: Math.random() * Math.PI * 2
      });
    }

    // Micro wrinkles add high-frequency detail so folds do not read as cracks.
    var wrinkles = [];
    var WRINKLE_COUNT = Math.max(180, Math.min(320, Math.round((W * H) / 5600)));
    for (var j = 0; j < WRINKLE_COUNT; j++) {
      var wa = Math.random() * Math.PI * 2;
      var wr = Math.pow(Math.random(), 0.66) * diag * 0.62;
      var wx = fx + Math.cos(wa) * wr + (Math.random() - 0.5) * 20;
      var wy = fy + Math.sin(wa) * wr + (Math.random() - 0.5) * 20;
      var tang = wa + Math.PI * 0.5 + (Math.random() - 0.5) * 1.8;
      var len = 10 + Math.random() * 30;
      var bend = (Math.random() - 0.5) * len * 0.65;
      wrinkles.push({
        x: wx,
        y: wy,
        angle: tang,
        len: len,
        bend: bend,
        thick: 0.4 + Math.random() * 1.1,
        alpha: 0.035 + Math.random() * 0.085,
        pull: 0.3 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2
      });
    }

    var dispEl   = document.getElementById('bp-disp');
    var dispBgEl = document.getElementById('bp-disp-bg');
    var turbEl   = document.getElementById('bp-turb');

    document.body.style.pointerEvents  = 'none';
    document.body.style.transformOrigin = fx + 'px ' + fy + 'px';
    document.documentElement.style.perspective = '900px';
    document.body.style.willChange = 'transform, opacity, clip-path, border-radius, filter';

    var startTime = null;
    var DURATION  = 2650;
    var maxR      = Math.hypot(Math.max(fx, W - fx), Math.max(fy, H - fy));
    var fromCx    = W * 0.5;
    var fromCy    = H * 0.5;
    var toCx      = fx;
    var toCy      = fy;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp01(v) { return Math.max(0, Math.min(1, v)); }
    function easeIn(t)  { return t * t * t; }
    function easeIO(t)  { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

    function drawCrumpleField(p, gather, scrunch) {
      ctx.clearRect(0, 0, W, H);

      var bodyShade = ctx.createRadialGradient(fx, fy, 24, fx, fy, diag * 0.62);
      bodyShade.addColorStop(0, 'rgba(8,16,28,' + (0.08 + gather * 0.16).toFixed(3) + ')');
      bodyShade.addColorStop(0.58, 'rgba(8,16,28,' + (0.04 + gather * 0.08).toFixed(3) + ')');
      bodyShade.addColorStop(1, 'rgba(8,16,28,0)');
      ctx.fillStyle = bodyShade;
      ctx.fillRect(0, 0, W, H);

      facets.forEach(function(f) {
        var move = gather * f.pull;
        var cx = lerp(f.x, fx, move);
        var cy = lerp(f.y, fy, move);
        var ang = f.angle + f.spin * gather + Math.sin(p * 5 * Math.PI + f.tw) * 0.12 * (1 - scrunch);
        var ux = Math.cos(ang);
        var uy = Math.sin(ang);
        var vx = -uy;
        var vy = ux;

        var hl = f.long * (1 - gather * 0.28);
        var hs = f.short * (1 - gather * 0.62);
        var depth = f.depth * (0.55 + 0.45 * Math.sin(p * 4 * Math.PI + f.tw));

        var p1x = cx - ux * hl;
        var p1y = cy - uy * hl;
        var p2x = cx + vx * hs;
        var p2y = cy + vy * hs;
        var p3x = cx + ux * hl;
        var p3y = cy + uy * hl;
        var p4x = cx - vx * hs;
        var p4y = cy - vy * hs;

        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.lineTo(p4x, p4y);
        ctx.closePath();

        if (depth >= 0) {
          ctx.fillStyle = 'rgba(178,220,255,' + (0.018 + depth * 0.04 + gather * 0.018).toFixed(3) + ')';
          ctx.globalCompositeOperation = 'screen';
        } else {
          ctx.fillStyle = 'rgba(0,10,22,' + (0.02 + (-depth) * 0.06 + gather * 0.02).toFixed(3) + ')';
          ctx.globalCompositeOperation = 'multiply';
        }
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(184,223,255,' + (0.018 + gather * 0.03).toFixed(3) + ')';
        ctx.lineWidth = 0.45;
        ctx.stroke();
      });

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      wrinkles.forEach(function(w) {
        var moveW = gather * w.pull;
        var cxw = lerp(w.x, fx, moveW);
        var cyw = lerp(w.y, fy, moveW);
        var a = w.angle + Math.sin(p * 6 * Math.PI + w.phase) * 0.12;
        var half = w.len * (1 - gather * 0.35) * 0.5;
        var sx = cxw - Math.cos(a) * half;
        var sy = cyw - Math.sin(a) * half;
        var tx = cxw + Math.cos(a) * half;
        var ty = cyw + Math.sin(a) * half;
        var nx = -Math.sin(a);
        var ny =  Math.cos(a);
        var bend = w.bend * (1 - gather * 0.42);
        var mx = (sx + tx) * 0.5 + nx * bend;
        var my = (sy + ty) * 0.5 + ny * bend;

        ctx.globalCompositeOperation = 'multiply';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(mx, my, tx, ty);
        ctx.strokeStyle = 'rgba(3,10,19,' + (w.alpha + gather * 0.045).toFixed(3) + ')';
        ctx.lineWidth = w.thick;
        ctx.stroke();

        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        ctx.moveTo(sx + nx * 0.9, sy + ny * 0.9);
        ctx.quadraticCurveTo(mx + nx * 0.9, my + ny * 0.9, tx + nx * 0.9, ty + ny * 0.9);
        ctx.strokeStyle = 'rgba(190,226,255,' + (w.alpha * 0.62 + gather * 0.026).toFixed(3) + ')';
        ctx.lineWidth = Math.max(0.35, w.thick * 0.5);
        ctx.stroke();
      });

      ctx.globalCompositeOperation = 'source-over';
      var broadHighlight = ctx.createRadialGradient(fx - diag * 0.08, fy - diag * 0.08, 14, fx - diag * 0.06, fy - diag * 0.06, diag * 0.45);
      broadHighlight.addColorStop(0, 'rgba(174,214,250,' + (0.1 + gather * 0.14).toFixed(3) + ')');
      broadHighlight.addColorStop(1, 'rgba(170,210,250,0)');
      ctx.fillStyle = broadHighlight;
      ctx.fillRect(0, 0, W, H);

      var centerPocket = ctx.createRadialGradient(fx, fy, 0, fx, fy, diag * 0.3);
      centerPocket.addColorStop(0, 'rgba(0,10,20,' + (0.12 + scrunch * 0.24).toFixed(3) + ')');
      centerPocket.addColorStop(1, 'rgba(0,10,20,0)');
      ctx.fillStyle = centerPocket;
      ctx.fillRect(0, 0, W, H);
    }

    function step(ts) {
      if (!startTime) startTime = ts;
      var elapsed = ts - startTime;
      var p = clamp01(elapsed / DURATION);

      var gather = easeIO(clamp01((p - 0.07) / 0.66));
      var foldEase = easeIO(clamp01((p - 0.18) / 0.52));
      var scrunchEase = easeIn(clamp01((p - 0.55) / 0.45));
      drawCrumpleField(p, gather, scrunchEase);

      var turbP = clamp01((p - 0.08) / 0.72);
      var turbEase = easeIO(turbP);
      if (dispEl)   dispEl.setAttribute('scale', (3 + turbEase * 94 + Math.sin(p * 18 * Math.PI) * 3).toFixed(2));
      if (dispBgEl) dispBgEl.setAttribute('scale', (4 + turbEase * 122 + Math.cos(p * 14 * Math.PI) * 3.5).toFixed(2));
      if (turbEl) {
        var freq = 0.028 + turbEase * 0.074 + Math.sin(p * 16 * Math.PI) * 0.0022;
        turbEl.setAttribute('baseFrequency', Math.max(0.01, freq).toFixed(4));
      }

      var centerX = lerp(fromCx, toCx, gather);
      var centerY = lerp(fromCy, toCy, gather);
      var scale = Math.max(0.016, 1 - scrunchEase * 0.984);
      var rotX = Math.sin(p * 6 * Math.PI) * foldEase * (14 + 7 * (1 - scrunchEase));
      var rotY = Math.cos(p * 5 * Math.PI) * foldEase * (11 + 6 * (1 - scrunchEase));
      var rotZ = scrunchEase * 520 + Math.sin(p * 4 * Math.PI) * foldEase * 8;
      var skewX = Math.sin(p * 11 * Math.PI) * foldEase * 6;
      var skewY = Math.cos(p * 9 * Math.PI) * foldEase * 4;
      var drift = (1 - scrunchEase) * (3 + turbEase * 4);
      var shiftX = (toCx - fromCx) * gather + Math.sin(elapsed * 0.04) * drift;
      var shiftY = (toCy - fromCy) * gather + Math.cos(elapsed * 0.037) * drift;
      var radius = lerp(maxR, 16, scrunchEase);
      var roundness = Math.floor(lerp(0, 50, scrunchEase));
      var wobbleR = radius * (1 + Math.sin(p * 10 * Math.PI) * 0.02 * (1 - scrunchEase));

      document.body.style.clipPath = 'circle(' + wobbleR.toFixed(1) + 'px at ' + centerX.toFixed(1) + 'px ' + centerY.toFixed(1) + 'px)';
      document.body.style.borderRadius = roundness + 'px';
      document.body.style.filter =
        'contrast(' + (1 + turbEase * 0.17).toFixed(3) + ') ' +
        'saturate(' + (1 - scrunchEase * 0.18).toFixed(3) + ') ' +
        'brightness(' + (1 - scrunchEase * 0.07).toFixed(3) + ')';

      document.body.style.transform =
        'translate(' + shiftX.toFixed(2) + 'px, ' + shiftY.toFixed(2) + 'px) ' +
        'scale(' + scale.toFixed(4) + ') ' +
        'rotateX(' + rotX.toFixed(2) + 'deg) ' +
        'rotateY(' + rotY.toFixed(2) + 'deg) ' +
        'rotate('  + rotZ.toFixed(2) + 'deg) ' +
        'skewX('   + skewX.toFixed(2) + 'deg) ' +
        'skewY('   + skewY.toFixed(2) + 'deg)';

      document.body.style.opacity = String(clamp01(1 - scrunchEase * 1.16));

      if (foldEase > 0) {
        var shadowAlpha = foldEase * 0.32 + scrunchEase * 0.38;
        ctx.fillStyle = 'rgba(0,8,20,' + shadowAlpha.toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
      }

      if (scrunchEase > 0.3) {
        var ballP = clamp01((scrunchEase - 0.3) / 0.7);
        var ballR = lerp(34, 9, ballP);
        var bx = toCx + Math.sin(elapsed * 0.032) * (1 - ballP) * 5;
        var by = toCy + Math.cos(elapsed * 0.028) * (1 - ballP) * 4;

        var ballGrad = ctx.createRadialGradient(
          bx - ballR * 0.38, by - ballR * 0.42, ballR * 0.1,
          bx, by, ballR
        );
        ballGrad.addColorStop(0, 'rgba(236,245,255,' + (0.72 * (1 - ballP * 0.3)).toFixed(3) + ')');
        ballGrad.addColorStop(0.54, 'rgba(138,176,221,' + (0.66 * (1 - ballP * 0.18)).toFixed(3) + ')');
        ballGrad.addColorStop(1, 'rgba(14,28,52,' + (0.9 * (1 - ballP * 0.05)).toFixed(3) + ')');

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(bx, by, ballR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        var creaseAlpha = 0.25 * (1 - ballP);
        for (var k = 0; k < 6; k++) {
          var a0 = (k / 6) * Math.PI * 2 + elapsed * 0.0018;
          var a1 = a0 + Math.PI * (0.35 + 0.08 * k);
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(6,12,20,' + creaseAlpha.toFixed(3) + ')';
          ctx.lineWidth = Math.max(0.6, ballR * 0.08);
          ctx.arc(bx, by, ballR * (0.5 + k * 0.08), a0, a1);
          ctx.stroke();
        }
      }

      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        // Tear down
        cvs.remove();
        document.body.style.transform    = '';
        document.body.style.opacity      = '';
        document.body.style.filter       = '';
        document.body.style.pointerEvents= '';
        document.body.style.transformOrigin = '';
        document.body.style.clipPath = '';
        document.body.style.borderRadius = '';
        document.body.style.willChange = '';
        document.documentElement.style.perspective = '';
        if (dispEl)   dispEl.setAttribute('scale', '3');
        if (dispBgEl) dispBgEl.setAttribute('scale', '4');
        if (turbEl)   turbEl.setAttribute('baseFrequency', '0.032');
        destroyBlueprintInteractive();
        document.body.classList.remove('blueprint', 'bp-ruined');
        showToast('[ BLUEPRINT MODE OFF ]');
      }
    }

    requestAnimationFrame(step);
  }

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

  } // end init()

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
