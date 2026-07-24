/* ============================================================
   RHA CURSOR v2 — ring + lock-on + pressure pulse
   Free roam: clean circular ring + dot (professional).
   On interactive elements: ring hands off to corner brackets
   that wrap the element; element leans toward cursor.
   Click: refined double-ring pressure pulse + ring squeeze.
   Auto-disabled on touch and prefers-reduced-motion.
   ============================================================ */
(() => {
  if (!matchMedia('(pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ACCENT = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b5cf6';
  const MAGNETIC = 'a, button, [data-magnetic], input[type=submit], .btn-primary, .btn-ghost, .card, .nav-link, .skill-tag';

  const style = document.createElement('style');
  style.textContent = `
    body.rha-cur, body.rha-cur * { cursor: none !important; }
    #rhaCur { position: fixed; left: 0; top: 0; pointer-events: none; z-index: 99999; will-change: transform;
      opacity: 1; transition: opacity .28s ease; }
    #rhaCur.hid { opacity: 0; }
    #rhaCur .dot { position: absolute; width: 4px; height: 4px; margin: -2px; border-radius: 50%; background: ${ACCENT}; }
    #rhaCur .ring { position: absolute; width: 30px; height: 30px; margin: -15px; border-radius: 50%;
      border: 1.5px solid ${ACCENT}; opacity: .85; transition: opacity .18s;
      will-change: transform; }
    #rhaCur.lock .ring { opacity: 0; }
    #rhaCur .b { position: absolute; width: 10px; height: 10px; border: 0 solid ${ACCENT}; opacity: 0; transition: opacity .18s; }
    #rhaCur.lock .b { opacity: 1; }
    #rhaCur .tl { border-left-width: 1.5px; border-top-width: 1.5px; }
    #rhaCur .tr { border-right-width: 1.5px; border-top-width: 1.5px; }
    #rhaCur .bl { border-left-width: 1.5px; border-bottom-width: 1.5px; }
    #rhaCur .br { border-right-width: 1.5px; border-bottom-width: 1.5px; }
    .rhaWave { position: fixed; pointer-events: none; z-index: 99998; border-radius: 50%;
      border: 1.5px solid ${ACCENT}; width: 12px; height: 12px; margin: -6px;
      animation: rhaWave .55s cubic-bezier(.16,.72,.25,1) forwards; }
    .rhaWave.w2 { animation-delay: .07s; animation-duration: .6s; opacity: .5; }
    @keyframes rhaWave {
      0% { transform: scale(.6); opacity: .7; }
      to { transform: scale(3.4); opacity: 0; border-width: .5px; }
    }
  `;
  document.head.appendChild(style);
  document.body.classList.add('rha-cur');

  const cur = document.createElement('div');
  cur.id = 'rhaCur';
  cur.innerHTML = '<div class="ring"></div><div class="dot"></div><div class="b tl"></div><div class="b tr"></div><div class="b bl"></div><div class="b br"></div>';
  document.body.appendChild(cur);
  const ring = cur.querySelector('.ring'), dot = cur.querySelector('.dot');
  const tl = cur.querySelector('.tl'), tr = cur.querySelector('.tr'), bl = cur.querySelector('.bl'), br = cur.querySelector('.br');

  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  let lockEl = null, lock = null, squeeze = 1;

  /* Hide the cursor while scrolling with no real pointer movement, so a
     scroll-through (the pinned projects showcase especially) stays immersive.
     Wheel/trackpad scroll fires a synthetic mousemove with UNCHANGED coords,
     so only a genuine change in position brings the cursor back. */
  let lastMX = -1, lastMY = -1;
  addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (e.clientX !== lastMX || e.clientY !== lastMY) {
      lastMX = e.clientX; lastMY = e.clientY;
      cur.classList.remove('hid');
    }
  });
  addEventListener('scroll', () => { cur.classList.add('hid'); }, { passive: true });
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest(MAGNETIC);
    if (t && !t.dataset.noMagnet) { lockEl = t; t.style.transition = 'transform .18s cubic-bezier(.2,.7,.3,1)'; }
  });
  document.addEventListener('mouseout', (e) => {
    if (lockEl && !lockEl.contains(e.relatedTarget)) { lockEl.style.transform = ''; lockEl = null; lock = null; }
  });
  addEventListener('mousedown', (e) => {
    squeeze = 0.78;
    for (const cls of ['', 'w2']) {
      const w = document.createElement('div');
      w.className = 'rhaWave ' + cls;
      w.style.left = e.clientX + 'px'; w.style.top = e.clientY + 'px';
      document.body.appendChild(w);
      setTimeout(() => w.remove(), 700);
    }
  });
  addEventListener('mouseup', () => { squeeze = 1; });

  const lerp = (a, b, f) => a + (b - a) * f;
  let hw = 15, hh = 15, sq = 1;
  function frame() {
    if (lockEl && document.contains(lockEl)) {
      const r = lockEl.getBoundingClientRect();
      lock = { x: r.left + r.width / 2, y: r.top + r.height / 2, hw: r.width / 2 + 7, hh: r.height / 2 + 7 };
      const dx = Math.max(-6, Math.min(6, (mx - lock.x) * 0.12));
      const dy = Math.max(-6, Math.min(6, (my - lock.y) * 0.12));
      lockEl.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
      cur.classList.add('lock');
    } else { lock = null; cur.classList.remove('lock'); }

    const tx = lock ? lock.x : mx, ty = lock ? lock.y : my;
    rx = lerp(rx, tx, lock ? 0.3 : 0.24);
    ry = lerp(ry, ty, lock ? 0.3 : 0.24);
    hw = lerp(hw, lock ? lock.hw : 15, 0.28);
    hh = lerp(hh, lock ? lock.hh : 15, 0.28);
    sq = lerp(sq, squeeze, 0.4);

    cur.style.transform = `translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px)`;
    ring.style.transform = `scale(${sq.toFixed(3)})`;
    dot.style.transform = `translate(${(mx - rx).toFixed(1)}px,${(my - ry).toFixed(1)}px)`;
    tl.style.transform = `translate(${-hw}px,${-hh}px)`;
    tr.style.transform = `translate(${hw - 10}px,${-hh}px)`;
    bl.style.transform = `translate(${-hw}px,${hh - 10}px)`;
    br.style.transform = `translate(${hw - 10}px,${hh - 10}px)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
