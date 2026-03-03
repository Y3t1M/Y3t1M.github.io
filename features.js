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
  function toggleBlueprint() {
    document.body.classList.toggle('blueprint');
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
