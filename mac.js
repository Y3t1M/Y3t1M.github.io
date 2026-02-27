/* ================================================================
   MAC.JS  —  Classic Mac OS 9 Desktop Logic
   ================================================================ */

'use strict';

/* ──────────────────────────────────────────
   1. WINDOW MANAGEMENT
────────────────────────────────────────── */
var zTop   = 100;
var activeWin = null;

function focusWindow(win) {
  if (!win) return;
  if (activeWin && activeWin !== win) {
    activeWin.classList.add('inactive');
  }
  win.classList.remove('inactive');
  win.style.zIndex = ++zTop;
  activeWin = win;
  var titleEl = win.querySelector('.mac-titlebar-title');
  if (titleEl) {
    var name = titleEl.textContent.trim();
    updateActiveApp(name);
  }
}

function openWindow(id) {
  var win = document.getElementById(id);
  if (!win) return;
  // Center if first open and no explicit position was set
  if (!win.classList.contains('open')) {
    if (!win.style.left || win.style.left === '') {
      win.style.left = Math.max(20, Math.floor(Math.random() * 200) + 60) + 'px';
      win.style.top  = Math.max(30, Math.floor(Math.random() * 150) + 50) + 'px';
    }
  }
  win.classList.add('open');
  win.style.display = 'flex';
  focusWindow(win);
}

function closeWindow(id) {
  var win = document.getElementById(id);
  if (!win) return;
  win.classList.remove('open');
  win.style.display = 'none';
  if (activeWin === win) {
    activeWin = null;
    updateActiveApp('Finder');
  }
}

function updateActiveApp(name) {
  var el = document.getElementById('active-app-name');
  if (el) el.textContent = name.split('—')[0].trim();
}

/* ── Close boxes ── */
document.querySelectorAll('.mac-close-box').forEach(function(btn) {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var id = btn.getAttribute('data-close');
    if (id) closeWindow(id);
  });
});

/* ── Close buttons elsewhere (alerts, about) ── */
document.querySelectorAll('[data-close]').forEach(function(el) {
  el.addEventListener('click', function(e) {
    var id = el.getAttribute('data-close');
    if (id) {
      var target = document.getElementById(id);
      if (target) {
        if (target.classList.contains('mac-alert')) {
          target.classList.remove('visible');
        } else {
          closeWindow(id);
        }
      }
    }
  });
});

/* ── Zoom box (toggle max size) ── */
document.querySelectorAll('.mac-zoom-box').forEach(function(btn) {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var id = btn.getAttribute('data-zoom');
    var win = document.getElementById(id);
    if (!win) return;
    if (win.dataset.zoomed === '1') {
      win.style.width  = win.dataset.prevW;
      win.style.height = win.dataset.prevH;
      win.style.left   = win.dataset.prevL;
      win.style.top    = win.dataset.prevT;
      win.dataset.zoomed = '0';
    } else {
      win.dataset.prevW = win.style.width  || win.offsetWidth  + 'px';
      win.dataset.prevH = win.style.height || win.offsetHeight + 'px';
      win.dataset.prevL = win.style.left   || '60px';
      win.dataset.prevT = win.style.top    || '50px';
      win.style.left   = '4px';
      win.style.top    = (21 + 4) + 'px';
      win.style.width  = (window.innerWidth  - 8) + 'px';
      win.style.height = (window.innerHeight - 21 - 8) + 'px';
      win.dataset.zoomed = '1';
    }
  });
});

/* ── Focus on mousedown ── */
document.querySelectorAll('.mac-window, .mac-alert').forEach(function(win) {
  win.addEventListener('mousedown', function() { focusWindow(win); });
});

/* ──────────────────────────────────────────
   2. WINDOW DRAGGING
────────────────────────────────────────── */
document.querySelectorAll('.mac-titlebar').forEach(function(tb) {
  var winRef = null, ox = 0, oy = 0;

  tb.addEventListener('mousedown', function(e) {
    if (e.target.classList.contains('mac-close-box') ||
        e.target.classList.contains('mac-zoom-box')) return;
    winRef = tb.closest('.mac-window, .mac-alert');
    if (!winRef) return;
    focusWindow(winRef);
    ox = e.clientX - winRef.offsetLeft;
    oy = e.clientY - winRef.offsetTop;
    e.preventDefault();
  });
});

document.addEventListener('mousemove', function(e) {
  if (!dragWin) return;
  var nx = e.clientX - dragOX;
  var ny = Math.max(21, e.clientY - dragOY);
  dragWin.style.left = nx + 'px';
  dragWin.style.top  = ny + 'px';
});

document.addEventListener('mouseup', function() { dragWin = null; });

var dragWin = null, dragOX = 0, dragOY = 0;
document.querySelectorAll('.mac-titlebar').forEach(function(tb) {
  tb.addEventListener('mousedown', function(e) {
    if (e.target.classList.contains('mac-close-box') ||
        e.target.classList.contains('mac-zoom-box')) return;
    dragWin = tb.closest('.mac-window, .mac-alert');
    if (!dragWin) return;
    dragOX = e.clientX - dragWin.offsetLeft;
    dragOY = e.clientY - dragWin.offsetTop;
    e.preventDefault();
  });
});

/* ──────────────────────────────────────────
   3. RESIZE HANDLES
────────────────────────────────────────── */
document.querySelectorAll('.mac-resize-handle').forEach(function(handle) {
  var win = handle.closest('.mac-window');
  var rsx = 0, rsy = 0, rw0 = 0, rh0 = 0, resizing = false;

  handle.addEventListener('mousedown', function(e) {
    e.preventDefault(); e.stopPropagation();
    resizing = true;
    rsx = e.clientX; rsy = e.clientY;
    rw0 = win.offsetWidth; rh0 = win.offsetHeight;
    focusWindow(win);
  });

  document.addEventListener('mousemove', function(e) {
    if (!resizing) return;
    var nw = Math.max(180, rw0 + (e.clientX - rsx));
    var nh = Math.max(100, rh0 + (e.clientY - rsy));
    win.style.width  = nw + 'px';
    win.style.height = nh + 'px';
  });

  document.addEventListener('mouseup', function() { resizing = false; });
});

/* ──────────────────────────────────────────
   4. MENU BAR
────────────────────────────────────────── */
var openMenu = null;

function closeAllMenus() {
  document.querySelectorAll('.mac-dropdown').forEach(function(d) {
    d.classList.remove('visible');
  });
  document.querySelectorAll('.mac-menu-item').forEach(function(m) {
    m.classList.remove('open');
  });
  openMenu = null;
}

document.querySelectorAll('.mac-menu-item[data-menu]').forEach(function(item) {
  item.addEventListener('mousedown', function(e) {
    e.preventDefault();
    var menuId = 'dropdown-' + item.getAttribute('data-menu');
    var dropdown = document.getElementById(menuId);
    if (!dropdown) return;

    if (openMenu === menuId) {
      closeAllMenus();
      return;
    }
    closeAllMenus();
    var rect = item.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top  = rect.bottom + 'px';
    dropdown.classList.add('visible');
    item.classList.add('open');
    openMenu = menuId;
  });

  item.addEventListener('mouseover', function() {
    if (openMenu !== null) {
      closeAllMenus();
      var menuId = 'dropdown-' + item.getAttribute('data-menu');
      var dropdown = document.getElementById(menuId);
      if (!dropdown) return;
      var rect = item.getBoundingClientRect();
      dropdown.style.left = rect.left + 'px';
      dropdown.style.top  = rect.bottom + 'px';
      dropdown.classList.add('visible');
      item.classList.add('open');
      openMenu = menuId;
    }
  });
});

document.addEventListener('mousedown', function(e) {
  if (openMenu && !e.target.closest('.mac-dropdown') &&
      !e.target.closest('.mac-menu-item')) {
    closeAllMenus();
  }
});

/* ── Dropdown actions ── */
document.querySelectorAll('.mac-drop-item[data-action]').forEach(function(item) {
  item.addEventListener('click', function() {
    var action = item.getAttribute('data-action');
    closeAllMenus();
    handleMacAction(action);
  });
});

function handleMacAction(action) {
  switch (action) {
    case 'open-about':     openWindow('about-win');     break;
    case 'open-finder':    openWindow('finder-win');    break;
    case 'open-calc':      openWindow('calc-win');      break;
    case 'open-stickies':  openWindow('stickies-win');  break;
    case 'open-simpletext':openWindow('simpletext-win');break;
    case 'open-netscape':  openWindow('netscape-win');  break;
    case 'open-tetris':    openWindow('tetris-win'); startMacTetris(); break;
    case 'open-pixos':     openWindow('pixos-win');  break;
    case 'open-ctrlpanel': openWindow('ctrlpanel-win'); break;
    case 'close-front':
      if (activeWin) closeWindow(activeWin.id);
      break;
    case 'empty-trash':
      var alert = document.getElementById('trash-alert');
      if (alert) { alert.classList.add('visible'); alert.style.zIndex = ++zTop; }
      break;
    case 'restart':
      if (confirm('Are you sure you want to restart?')) location.reload();
      break;
    case 'shutdown':
      window.location.href = 'index.html';
      break;
  }
}

/* Custom event from other scripts */
document.addEventListener('mac-action', function(e) { handleMacAction(e.detail); });

/* ──────────────────────────────────────────
   5. DESKTOP ICONS
────────────────────────────────────────── */
var clickTimer = null;

document.querySelectorAll('.mac-desk-icon').forEach(function(icon) {
  /* Single click = select */
  icon.addEventListener('click', function(e) {
    e.stopPropagation();
    document.querySelectorAll('.mac-desk-icon').forEach(function(i) {
      i.classList.remove('selected');
    });
    icon.classList.add('selected');
  });

  /* Double click = open */
  icon.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    var target = icon.getAttribute('data-open');
    if (!target) return;
    if (target.endsWith('-alert')) {
      var al = document.getElementById(target);
      if (al) { al.classList.add('visible'); al.style.zIndex = ++zTop; }
    } else {
      handleMacAction('open-' + target.replace('-win', ''));
    }
  });
});

/* Deselect icons when clicking desktop */
document.getElementById('mac-desktop').addEventListener('click', function() {
  document.querySelectorAll('.mac-desk-icon').forEach(function(i) {
    i.classList.remove('selected');
  });
});

/* ──────────────────────────────────────────
   6. RIGHT-CLICK CONTEXT MENU
────────────────────────────────────────── */
var ctxMenu = document.getElementById('mac-ctx-menu');

document.getElementById('mac-desktop').addEventListener('contextmenu', function(e) {
  e.preventDefault();
  ctxMenu.style.left = Math.min(e.clientX, window.innerWidth  - 170) + 'px';
  ctxMenu.style.top  = Math.min(e.clientY, window.innerHeight - 120) + 'px';
  ctxMenu.classList.add('visible');
});

document.addEventListener('click', function() { ctxMenu.classList.remove('visible'); });

ctxMenu.querySelectorAll('.mac-drop-item[data-action]').forEach(function(item) {
  item.addEventListener('click', function(e) {
    e.stopPropagation();
    ctxMenu.classList.remove('visible');
    handleMacAction(item.getAttribute('data-action'));
  });
});

/* ──────────────────────────────────────────
   7. MENUBAR CLOCK
────────────────────────────────────────── */
(function macClock() {
  var el  = document.getElementById('mac-clock');
  var fmt = document.getElementById('cp-time-fmt');
  if (el) {
    var d  = new Date();
    var h  = d.getHours();
    var m  = d.getMinutes();
    var use24 = fmt && fmt.value === '24';
    if (use24) {
      el.textContent = h.toString().padStart(2,'0') + ':' + (m<10?'0':'') + m;
    } else {
      var ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      el.textContent = h + ':' + (m<10?'0':'') + m + ' ' + ap;
    }
  }
  setTimeout(macClock, 10000);
})();

/* ──────────────────────────────────────────
   8. FINDER — VIRTUAL FILESYSTEM
────────────────────────────────────────── */
var FS = {
  'Macintosh HD': [
    { name:'System Folder', type:'folder', icon:'system', items:['System', 'Finder', 'Extensions', 'Fonts', 'Preferences'] },
    { name:'Applications',  type:'folder', icon:'apps',   items:['SimpleText','Calculator','Stickies','Netscape Navigator','Tetris','PixOS'] },
    { name:'Documents',     type:'folder', icon:'docs',   items:['Read Me.txt','Budget 1999.txt','My Journal.txt'] },
    { name:'Games',         type:'folder', icon:'games',  items:['Tetris','Minesweeper Demo'] },
    { name:'Internet',      type:'folder', icon:'net',    items:['Netscape Navigator','Bookmarks.html'] }
  ],
  'Applications': [
    { name:'SimpleText',        type:'app', action:'open-simpletext' },
    { name:'Calculator',        type:'app', action:'open-calc'       },
    { name:'Stickies',          type:'app', action:'open-stickies'   },
    { name:'Netscape Navigator',type:'app', action:'open-netscape'   },
    { name:'Tetris',            type:'app', action:'open-tetris'     },
    { name:'PixOS',              type:'app', action:'open-pixos'      }
  ],
  'Documents': [
    { name:'Read Me.txt',      type:'doc', action:'open-simpletext', content:'Welcome to Macintosh HD!\n\nThis is a Read Me file.\nEnjoy your Mac!' },
    { name:'Budget 1999.txt',  type:'doc', action:'open-simpletext', content:'Budget 1999\n\n- Floppy disks: $12\n- RAM upgrade: $199\n- New monitor: $400\n\nTotal: $611' },
    { name:'My Journal.txt',   type:'doc', action:'open-simpletext', content:'Dear Journal,\n\nToday I tried to defrag the hard drive.\nIt took 3 hours.\n\n- Me' }
  ],
  'Games': [
    { name:'Tetris',           type:'app', action:'open-tetris' },
    { name:'Minesweeper Demo', type:'app', action:null }
  ],
  'Internet': [
    { name:'Netscape Navigator', type:'app', action:'open-netscape' },
    { name:'Bookmarks.html',     type:'doc', action:'open-netscape' }
  ]
};

function folderSVG(color) {
  color = color || '#f0c040';
  return '<svg width="32" height="32" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="2" y="10" width="28" height="20" fill="' + color + '"/>' +
    '<rect x="2" y="10" width="28" height="1" fill="#888"/>' +
    '<rect x="2" y="29" width="28" height="1" fill="#888"/>' +
    '<rect x="2" y="10" width="1" height="20" fill="#888"/>' +
    '<rect x="29" y="10" width="1" height="20" fill="#555"/>' +
    '<rect x="2" y="6" width="12" height="4" fill="' + color + '"/>' +
    '<rect x="2" y="6" width="12" height="1" fill="#888"/>' +
    '<rect x="2" y="6" width="1" height="4" fill="#888"/>' +
    '<rect x="13" y="6" width="1" height="4" fill="#888"/>' +
    '</svg>';
}
function docSVG() {
  return '<svg width="32" height="32" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="6" y="2" width="18" height="26" fill="white"/>' +
    '<rect x="6" y="2" width="18" height="1" fill="#888"/>' +
    '<rect x="6" y="27" width="18" height="1" fill="#888"/>' +
    '<rect x="6" y="2" width="1" height="26" fill="#888"/>' +
    '<rect x="23" y="2" width="1" height="20" fill="#888"/>' +
    '<rect x="23" y="22" width="1" height="5" fill="#555"/>' +
    '<rect x="18" y="2" width="6" height="6" fill="#c0c0c0"/>' +
    '<rect x="18" y="2" width="1" height="6" fill="#888"/>' +
    '<rect x="18" y="7" width="6" height="1" fill="#888"/>' +
    '<rect x="9" y="10" width="14" height="1" fill="#aaa"/>' +
    '<rect x="9" y="13" width="14" height="1" fill="#aaa"/>' +
    '<rect x="9" y="16" width="10" height="1" fill="#aaa"/>' +
    '</svg>';
}
function appSVG() {
  return '<svg width="32" height="32" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="4" y="4" width="24" height="24" fill="#4488ff"/>' +
    '<rect x="4" y="4" width="24" height="1" fill="#aaccff"/>' +
    '<rect x="4" y="4" width="1" height="24" fill="#aaccff"/>' +
    '<rect x="27" y="4" width="1" height="24" fill="#2244aa"/>' +
    '<rect x="4" y="27" width="24" height="1" fill="#2244aa"/>' +
    '<rect x="12" y="8" width="8" height="8" fill="white"/>' +
    '<rect x="10" y="18" width="12" height="2" fill="white"/>' +
    '<rect x="10" y="22" width="12" height="2" fill="white"/>' +
    '</svg>';
}
function folderIconForType(type) {
  switch(type) {
    case 'system': return folderSVG('#88aacc');
    case 'apps':   return folderSVG('#ccaaff');
    case 'docs':   return folderSVG('#f0c040');
    case 'games':  return folderSVG('#ff9966');
    case 'net':    return folderSVG('#88ddff');
    default:       return folderSVG();
  }
}

function renderFinderBody(folderName) {
  var body    = document.getElementById('finder-body');
  var title   = document.getElementById('finder-title');
  var status  = document.getElementById('finder-status');
  var pathEl  = document.getElementById('finder-path');
  if (!body) return;
  var items = FS[folderName] || [];
  title.textContent   = folderName;
  pathEl.textContent  = folderName;
  status.textContent  = items.length + ' items, 2.1 GB available';
  body.innerHTML = '';
  items.forEach(function(item) {
    var el = document.createElement('div');
    el.className = 'finder-item';
    var iconSVG = item.type === 'folder' ? folderIconForType(item.icon)
                : item.type === 'doc'    ? docSVG()
                : appSVG();
    el.innerHTML = '<div class="fitem-icon">' + iconSVG + '</div>' +
                   '<div class="fitem-label">' + item.name + '</div>';
    el.addEventListener('click', function() {
      body.querySelectorAll('.finder-item').forEach(function(i) { i.classList.remove('selected'); });
      el.classList.add('selected');
    });
    el.addEventListener('dblclick', function() {
      if (item.type === 'folder' && FS[item.name]) {
        renderFinderBody(item.name);
      } else if (item.action) {
        if (item.content) {
          var ta = document.getElementById('simpletext-area');
          if (ta) ta.value = item.content;
        }
        handleMacAction(item.action);
      }
    });
    body.appendChild(el);
  });
}

renderFinderBody('Macintosh HD');

/* Back button in Finder */
document.getElementById('finder-back-btn').addEventListener('click', function() {
  renderFinderBody('Macintosh HD');
});

/* ──────────────────────────────────────────
   9. SIMPLETEXT TOOLBAR
────────────────────────────────────────── */
var stArea = document.getElementById('simpletext-area');
var stFont = document.getElementById('st-font');
var stSize = document.getElementById('st-size');
var stStatus = document.getElementById('st-statusbar');

if (stFont) stFont.addEventListener('change', function() {
  stArea.style.fontFamily = this.value === 'Monaco' ? 'Monaco, "Courier New", monospace'
    : this.value === 'Courier' ? '"Courier New", monospace'
    : this.value === 'Times'   ? 'Georgia, serif'
    : '"Geneva", Arial, sans-serif';
});
if (stSize) stSize.addEventListener('change', function() {
  stArea.style.fontSize = this.value + 'px';
});

if (stArea && stStatus) {
  stArea.addEventListener('keyup', function() {
    var text = this.value.substring(0, this.selectionStart);
    var lines = text.split('\n');
    stStatus.textContent = 'Line ' + lines.length + ', Col ' + lines[lines.length-1].length;
  });
}

document.getElementById('st-bold').addEventListener('click', function() {
  stArea.style.fontWeight = stArea.style.fontWeight === 'bold' ? 'normal' : 'bold';
  this.style.background = stArea.style.fontWeight === 'bold' ? '#bbb' : '';
});
document.getElementById('st-italic').addEventListener('click', function() {
  stArea.style.fontStyle = stArea.style.fontStyle === 'italic' ? 'normal' : 'italic';
  this.style.background = stArea.style.fontStyle === 'italic' ? '#bbb' : '';
});

/* ──────────────────────────────────────────
   10. CALCULATOR
────────────────────────────────────────── */
var calcDisplay = document.getElementById('calc-display');
var calcState = { current: '0', stored: null, op: null, fresh: true };

function calcUpdate() {
  var s = calcState.current;
  if (s.length > 10) s = parseFloat(s).toExponential(4);
  calcDisplay.textContent = s;
}

document.querySelectorAll('button[data-calc]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var v = btn.getAttribute('data-calc');
    btn.classList.add('pressed');
    setTimeout(function() { btn.classList.remove('pressed'); }, 120);

    if (v === 'C') {
      calcState = { current: '0', stored: null, op: null, fresh: true };
    } else if (v === '±') {
      calcState.current = String(-parseFloat(calcState.current));
    } else if (/[0-9]/.test(v)) {
      if (calcState.fresh) { calcState.current = v; calcState.fresh = false; }
      else if (calcState.current === '0') calcState.current = v;
      else calcState.current += v;
    } else if (v === '.') {
      if (calcState.fresh) { calcState.current = '0.'; calcState.fresh = false; }
      else if (calcState.current.indexOf('.') === -1) calcState.current += '.';
    } else if (['+','-','*','/'].indexOf(v) !== -1) {
      if (calcState.op && !calcState.fresh) {
        var r = calcOp(parseFloat(calcState.stored), parseFloat(calcState.current), calcState.op);
        calcState.current = String(r);
      }
      calcState.stored = calcState.current;
      calcState.op     = v;
      calcState.fresh  = true;
    } else if (v === '=') {
      if (calcState.op && calcState.stored !== null) {
        var r2 = calcOp(parseFloat(calcState.stored), parseFloat(calcState.current), calcState.op);
        calcState.current = String(r2);
        calcState.op = null; calcState.stored = null; calcState.fresh = true;
      }
    }
    calcUpdate();
  });
});

function calcOp(a, b, op) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? 'Error' : a / b;
  }
  return b;
}

/* Keyboard support for calc when it's active */
document.addEventListener('keydown', function(e) {
  if (!activeWin || activeWin.id !== 'calc-win') return;
  var key = e.key;
  var map = { 'Enter':'=', 'Escape':'C', 'Backspace':'C' };
  var target = map[key] || key;
  var btn = document.querySelector('button[data-calc="' + target + '"]');
  if (btn) btn.click();
});

/* ──────────────────────────────────────────
   11. TETRIS
────────────────────────────────────────── */
var TET = {
  canvas: null, ctx: null,
  nextCanvas: null, nextCtx: null,
  board: [], cols: 10, rows: 20, cellSize: 10,
  running: false, paused: false,
  score: 0, level: 1, lines: 0,
  piece: null, nextPiece: null,
  dropTimer: null, dropInterval: 700,
  shapes: [
    [[1,1,1,1]],                           // I
    [[1,1],[1,1]],                          // O
    [[0,1,0],[1,1,1]],                     // T
    [[1,0],[1,0],[1,1]],                   // L
    [[0,1],[0,1],[1,1]],                   // J
    [[0,1,1],[1,1,0]],                     // S
    [[1,1,0],[0,1,1]]                      // Z
  ],
  colors: ['#00ffff','#ffff00','#aa00ff','#ff8800','#0000ff','#00ff00','#ff0000']
};

function tetNewBoard() {
  TET.board = [];
  for (var r = 0; r < TET.rows; r++) { TET.board.push(new Array(TET.cols).fill(0)); }
}

function tetNewPiece() {
  var idx = Math.floor(Math.random() * TET.shapes.length);
  return { shape: TET.shapes[idx], color: TET.colors[idx], x: 3, y: 0 };
}

function tetDraw() {
  var c = TET.ctx; var cs = TET.cellSize;
  c.fillStyle = '#000'; c.fillRect(0, 0, TET.canvas.width, TET.canvas.height);
  // board
  for (var r = 0; r < TET.rows; r++) {
    for (var col = 0; col < TET.cols; col++) {
      if (TET.board[r][col]) {
        c.fillStyle = TET.board[r][col];
        c.fillRect(col*cs, r*cs, cs-1, cs-1);
      }
    }
  }
  // piece
  if (TET.piece) {
    c.fillStyle = TET.piece.color;
    TET.piece.shape.forEach(function(row, ri) {
      row.forEach(function(cell, ci) {
        if (cell) c.fillRect((TET.piece.x+ci)*cs, (TET.piece.y+ri)*cs, cs-1, cs-1);
      });
    });
  }
}

function tetDrawNext() {
  var c = TET.nextCtx;
  c.fillStyle = '#000'; c.fillRect(0,0,60,60);
  if (!TET.nextPiece) return;
  c.fillStyle = TET.nextPiece.color;
  var cs = 10;
  var ox = Math.floor((6 - TET.nextPiece.shape[0].length) / 2);
  var oy = Math.floor((6 - TET.nextPiece.shape.length) / 2);
  TET.nextPiece.shape.forEach(function(row, ri) {
    row.forEach(function(cell, ci) {
      if (cell) c.fillRect((ox+ci)*cs, (oy+ri)*cs, cs-1, cs-1);
    });
  });
}

function tetCollides(piece, dx, dy, shape) {
  shape = shape || piece.shape;
  for (var r = 0; r < shape.length; r++) {
    for (var col = 0; col < shape[r].length; col++) {
      if (!shape[r][col]) continue;
      var nx = piece.x + col + (dx||0);
      var ny = piece.y + r   + (dy||0);
      if (nx < 0 || nx >= TET.cols || ny >= TET.rows) return true;
      if (ny >= 0 && TET.board[ny][nx]) return true;
    }
  }
  return false;
}

function tetLock() {
  TET.piece.shape.forEach(function(row, ri) {
    row.forEach(function(cell, ci) {
      if (cell) {
        var ny = TET.piece.y + ri;
        if (ny >= 0) TET.board[ny][TET.piece.x+ci] = TET.piece.color;
      }
    });
  });
  // clear lines
  var cleared = 0;
  for (var r = TET.rows - 1; r >= 0; r--) {
    if (TET.board[r].every(function(c) { return c !== 0; })) {
      TET.board.splice(r, 1);
      TET.board.unshift(new Array(TET.cols).fill(0));
      cleared++; r++;
    }
  }
  if (cleared > 0) {
    TET.lines += cleared;
    TET.score += [0,100,300,500,800][Math.min(cleared,4)] * TET.level;
    TET.level  = Math.floor(TET.lines / 10) + 1;
    TET.dropInterval = Math.max(100, 700 - (TET.level-1)*60);
    document.getElementById('mac-t-score').textContent = TET.score;
    document.getElementById('mac-t-level').textContent = TET.level;
    document.getElementById('mac-t-lines').textContent = TET.lines;
  }
  TET.piece = TET.nextPiece;
  TET.nextPiece = tetNewPiece();
  tetDrawNext();
  if (tetCollides(TET.piece, 0, 0)) {
    tetStop();
    TET.ctx.fillStyle = 'rgba(0,0,0,0.65)';
    TET.ctx.fillRect(0,0,TET.canvas.width,TET.canvas.height);
    TET.ctx.fillStyle = '#fff';
    TET.ctx.font = '10px Arial';
    TET.ctx.textAlign = 'center';
    TET.ctx.fillText('GAME', 50, 90);
    TET.ctx.fillText('OVER', 50, 104);
  }
}

function tetDrop() {
  if (!TET.running || TET.paused) return;
  if (tetCollides(TET.piece, 0, 1)) {
    tetLock();
  } else {
    TET.piece.y++;
  }
  tetDraw();
  TET.dropTimer = setTimeout(tetDrop, TET.dropInterval);
}

function tetStop() {
  TET.running = false;
  clearTimeout(TET.dropTimer);
}

function startMacTetris() {
  TET.canvas     = document.getElementById('mac-tetris-canvas');
  TET.nextCanvas = document.getElementById('mac-t-next');
  if (!TET.canvas) return;
  TET.ctx      = TET.canvas.getContext('2d');
  TET.nextCtx  = TET.nextCanvas.getContext('2d');
  tetStop();
  tetNewBoard();
  TET.score=0; TET.level=1; TET.lines=0; TET.paused=false;
  document.getElementById('mac-t-score').textContent = '0';
  document.getElementById('mac-t-level').textContent = '1';
  document.getElementById('mac-t-lines').textContent = '0';
  TET.nextPiece = tetNewPiece();
  TET.piece     = tetNewPiece();
  TET.running   = true;
  tetDrawNext();
  tetDrop();
}

document.getElementById('mac-t-start').addEventListener('click', function() {
  startMacTetris();
});
document.getElementById('mac-t-pause').addEventListener('click', function() {
  if (!TET.running) return;
  TET.paused = !TET.paused;
  this.textContent = TET.paused ? 'Resume' : 'Pause';
  if (!TET.paused) tetDrop();
});

document.addEventListener('keydown', function(e) {
  if (!TET.running || TET.paused) return;
  if (!activeWin || activeWin.id !== 'tetris-win') return;
  if (e.key === 'ArrowLeft') {
    if (!tetCollides(TET.piece, -1, 0)) TET.piece.x--;
    tetDraw(); e.preventDefault();
  } else if (e.key === 'ArrowRight') {
    if (!tetCollides(TET.piece,  1, 0)) TET.piece.x++;
    tetDraw(); e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    if (!tetCollides(TET.piece, 0, 1)) TET.piece.y++;
    else tetLock();
    tetDraw(); e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    // rotate
    var rot = TET.piece.shape[0].map(function(_, i) {
      return TET.piece.shape.map(function(r) { return r[i]; }).reverse();
    });
    if (!tetCollides(TET.piece, 0, 0, rot)) TET.piece.shape = rot;
    tetDraw(); e.preventDefault();
  } else if (e.key === ' ') {
    while (!tetCollides(TET.piece, 0, 1)) TET.piece.y++;
    tetLock(); tetDraw(); e.preventDefault();
  }
});

/* ──────────────────────────────────────────
   12. OPEN FINDER ON HD ICON DBLCLICK
────────────────────────────────────────── */
var hdIcon = document.getElementById('dicon-hd');
if (hdIcon) {
  hdIcon.addEventListener('dblclick', function() {
    openWindow('finder-win');
    renderFinderBody('Macintosh HD');
  });
}

/* ──────────────────────────────────────────
   13. ICON DRAGGING (desktop icons)
────────────────────────────────────────── */
document.querySelectorAll('.mac-desk-icon').forEach(function(icon) {
  var isDragging = false, startX = 0, startY = 0, initX = 0, initY = 0;

  icon.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    startX = e.clientX; startY = e.clientY;
    var rect = icon.getBoundingClientRect();
    var desk = document.getElementById('mac-desktop').getBoundingClientRect();
    initX = rect.left - desk.left;
    initY = rect.top  - desk.top;
    isDragging = false;

    function onMove(ev) {
      var dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging = true;
        icon.style.position = 'absolute';
        icon.style.right = 'auto';
        icon.style.bottom = 'auto';
      }
      if (isDragging) {
        icon.style.left = (initX + dx) + 'px';
        icon.style.top  = (initY + dy) + 'px';
      }
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
});

/* ──────────────────────────────────────────
   14. BOOT IN — show desktop with a brief fade
────────────────────────────────────────── */
document.body.style.opacity = '0';
document.body.style.transition = 'opacity 0.4s ease';
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() { document.body.style.opacity = '1'; }, 80);
});
window.addEventListener('load', function() {
  document.body.style.opacity = '1';
  /* auto-open the Finder so something is visible on load */
  openWindow('finder-win');
});
