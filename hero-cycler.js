/* ============================================================
   HERO ROLE CYCLER — hero-cycler.js
   Cycles through identities with scramble morphs, per-role
   accent colors, synced gradient title taglines, and a
   particle burst on each transition.
   ============================================================ */

(function () {
  'use strict';

  /* ── Role definitions ────────────────────────────────────────
     Each role has:
       text    → text shown in the pill
       tagline → replaces "actually work" in the hero title
       accent  → pill glow + border + dot color
       grad    → gradient for the hero gradient-text span
  ────────────────────────────────────────────────────────────── */
  const ROLES = [
    {
      text:    'Engineer',
      tagline: 'actually work',
      accent:  '#7c3aed',
      grad:    'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
    },
    {
      text:    'App Developer',
      tagline: 'ship on deadline',
      accent:  '#06b6d4',
      grad:    'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    },
    {
      text:    'Robotics Captain',
      tagline: 'push the limits',
      accent:  '#f59e0b',
      grad:    'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    },
    {
      text:    'Maker & Builder',
      tagline: 'leave a mark',
      accent:  '#10b981',
      grad:    'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    },
    {
      text:    'Honors Scholar',
      tagline: 'think differently',
      accent:  '#3b82f6',
      grad:    'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    },
    {
      text:    'McMillon Fellow',
      tagline: 'build ventures',
      accent:  '#ec4899',
      grad:    'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',
    },
    {
      text:    'Back-End Dev',
      tagline: 'make it scale',
      accent:  '#8b5cf6',
      grad:    'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    },
    {
      text:    '3D Printing',
      tagline: 'prototype fast',
      accent:  '#f97316',
      grad:    'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
    },
  ];

  /* How long each role is displayed (ms) before auto-advancing */
  const HOLD_MS     = 2800;
  /* Duration of one full scramble-out → scramble-in transition */
  const SCRAMBLE_MS = 520;
  /* Scramble charset */
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!%*+-=';

  /* ── DOM refs ────────────────────────────────────────────── */
  const pill        = document.getElementById('hero-role-pill');
  const dotEl       = document.getElementById('role-dot');
  const textEl      = document.getElementById('role-text');
  const gradTextEl  = document.getElementById('hero-gradient-text');

  if (!pill || !dotEl || !textEl || !gradTextEl) return;

  /* ── State ───────────────────────────────────────────────── */
  let current  = 0;
  let timer    = null;
  let morphing = false;
  let paused   = false;

  /* ── Apply a role's colors instantly (no text change) ────── */
  function applyColors(role) {
    dotEl.style.background    = role.accent;
    dotEl.style.boxShadow     = `0 0 8px ${role.accent}, 0 0 18px ${role.accent}66`;
    pill.style.borderColor    = `${role.accent}55`;
    pill.style.boxShadow      = `0 0 0 1px ${role.accent}22, 0 0 28px ${role.accent}18, inset 0 0 20px ${role.accent}08`;
    pill.style.setProperty('--role-accent', role.accent);

    // gradient text
    gradTextEl.style.backgroundImage = role.grad;
    gradTextEl.style.webkitBackgroundClip = 'text';
    gradTextEl.style.backgroundClip      = 'text';
  }

  /* ── Scramble helper ─────────────────────────────────────── */
  function scrambleTo(el, target, duration, fromNoise) {
    return new Promise(resolve => {
      const frames = Math.round(duration / 16);
      let   frame  = 0;

      const id = setInterval(() => {
        const p        = frame / frames;
        const eased    = 1 - Math.pow(1 - p, 2);
        const revealed = Math.floor(eased * target.length);

        let out = '';
        for (let i = 0; i < target.length; i++) {
          const ch = target[i];
          if (ch === ' ') { out += ' '; continue; }
          if (i < revealed || (!fromNoise && i < revealed + 2)) {
            out += ch;
          } else {
            out += CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }
        el.textContent = out;
        frame++;
        if (frame >= frames) {
          clearInterval(id);
          el.textContent = target;
          resolve();
        }
      }, 16);
    });
  }

  /* ── Full morph transition: old → noise → new ─────────────── */
  async function morphTo(nextIndex) {
    if (morphing) return;
    morphing = true;

    const next = ROLES[nextIndex];
    const half = SCRAMBLE_MS / 2;

    /* Phase 1 – scramble OUTWARD: current text → noise */
    const currentText = textEl.textContent;
    await new Promise(resolve => {
      const frames = Math.round(half / 16);
      let frame = 0;
      const id = setInterval(() => {
        const p = frame / frames;
        const keep = Math.floor((1 - p) * currentText.length);
        let out = '';
        for (let i = 0; i < currentText.length; i++) {
          out += i < keep
            ? currentText[i]
            : (currentText[i] === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]);
        }
        textEl.textContent = out;
        frame++;
        if (frame >= frames) { clearInterval(id); resolve(); }
      }, 16);
    });

    /* Swap colors on the crossover point (feels like a flash) */
    textEl.classList.add('role-text-swap');
    applyColors(next);
    spawnBurst(next.accent);

    /* Phase 2 – scramble INWARD: noise → new text */
    await scrambleTo(textEl, next.text, half, true);
    textEl.classList.remove('role-text-swap');

    /* Cycle the tagline in the hero title */
    await morphTagline(next.tagline, next.grad);

    current  = nextIndex;
    morphing = false;
  }

  /* ── Tagline morph (hero title gradient span) ────────────── */
  async function morphTagline(newTagline, grad) {
    const half = SCRAMBLE_MS * 0.8;

    /* fade + blur out */
    gradTextEl.style.transition = `opacity ${half * 0.4}ms ease, filter ${half * 0.4}ms ease`;
    gradTextEl.style.opacity = '0';
    gradTextEl.style.filter  = 'blur(8px)';

    await new Promise(r => setTimeout(r, half * 0.4));

    gradTextEl.textContent = newTagline;
    gradTextEl.style.backgroundImage = grad;

    gradTextEl.style.opacity = '1';
    gradTextEl.style.filter  = 'blur(0px)';

    await new Promise(r => setTimeout(r, half * 0.5));
    gradTextEl.style.transition = '';
  }

  /* ── Canvas burst: small particles explode from the pill ─── */
  function spawnBurst(color) {
    const pc = document.getElementById('particle-canvas');
    if (!pc) return;
    const bCtx = pc.getContext('2d');
    const rect  = pill.getBoundingClientRect();
    const cx    = rect.left + rect.width  / 2;
    const cy    = rect.top  + rect.height / 2;

    const sparks = Array.from({ length: 16 }, () => ({
      x:  cx, y: cy,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5 - 1.5,
      life: 1,
      r:  Math.random() * 2.5 + 1,
    }));

    function drawBurst() {
      sparks.forEach(s => {
        s.x += s.vx; s.y += s.vy;
        s.vy += 0.12;
        s.life -= 0.04;
        if (s.life <= 0) return;
        bCtx.beginPath();
        bCtx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
        bCtx.fillStyle = `${color}${Math.round(s.life * 255).toString(16).padStart(2, '0')}`;
        bCtx.fill();
      });
      if (sparks.some(s => s.life > 0)) requestAnimationFrame(drawBurst);
    }
    requestAnimationFrame(drawBurst);
  }

  /* ── Scheduler ───────────────────────────────────────────── */
  function scheduleNext() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (!paused) advance();
    }, HOLD_MS);
  }

  function advance() {
    const next = (current + 1) % ROLES.length;
    morphTo(next).then(scheduleNext);
  }

  /* ── User interactions ───────────────────────────────────── */
  pill.addEventListener('mouseenter', () => {
    paused = true;
    if (timer) clearTimeout(timer);
    pill.title = 'Click to skip →';
  });

  pill.addEventListener('mouseleave', () => {
    paused = false;
    if (!morphing) scheduleNext();
  });

  pill.addEventListener('click', () => {
    if (morphing) return;
    if (timer) clearTimeout(timer);
    const next = (current + 1) % ROLES.length;
    morphTo(next).then(() => {
      if (!paused) scheduleNext();
    });
  });

  /* ── Init ────────────────────────────────────────────────── */
  /* Boot starts on role 0 — apply colors immediately, then
     let existing scramble in interactive.js handle the badge text
     (we skip scheduling until the page settle time) */
  applyColors(ROLES[0]);

  /* Start cycling after the initial page animations finish */
  setTimeout(scheduleNext, HOLD_MS + 1400);

})();
