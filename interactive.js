/* ============================================================
   INTERACTIVE VISUAL EFFECTS v2 — interactive.js
   ============================================================ */
(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────────── */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp  = (a, b, t)   => a + (b - a) * t;
  const isTouchOnly = () => !window.matchMedia('(hover: hover)').matches;

  /* ================================================================
     GRAIN / NOISE OVERLAY  (subtle animated film grain)
     ================================================================ */
  const grainCanvas = document.createElement('canvas');
  grainCanvas.id = 'grain-canvas';
  document.body.prepend(grainCanvas);
  const grainCtx = grainCanvas.getContext('2d');
  function resizeGrain() {
    grainCanvas.width  = window.innerWidth;
    grainCanvas.height = window.innerHeight;
  }
  resizeGrain();
  window.addEventListener('resize', resizeGrain);
  (function drawGrain() {
    const img = grainCtx.createImageData(grainCanvas.width, grainCanvas.height);
    const d   = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255 | 0;
      d[i] = d[i+1] = d[i+2] = v;
      d[i+3] = 9;
    }
    grainCtx.putImageData(img, 0, 0);
    setTimeout(drawGrain, 80);
  })();

  /* ================================================================
     1. INTERACTIVE PARTICLE NETWORK CANVAS
        Particles float around, connect with lines to neighbours,
        and are repelled by the cursor with cyan connection threads.
     ================================================================ */
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W, H;
  const mouse = { x: -9999, y: -9999 };

  const PARTICLE_COUNT = window.innerWidth < 768 ? 45 : 85;
  const CONNECT_DIST   = 150;
  const MOUSE_DIST     = 130;
  const REPEL_FORCE    = 0.45;

  function resizeCanvas() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  class Particle {
    constructor() { this.init(); }
    init() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.r  = Math.random() * 1.6 + 0.5;
      this.base_alpha = Math.random() * 0.35 + 0.12;
      this.alpha = this.base_alpha;
      this.hue = Math.random() < 0.6 ? 263 : 191; // purple or cyan
    }
    update() {
      const dx   = this.x - mouse.x;
      const dy   = this.y - mouse.y;
      const dist = Math.hypot(dx, dy);

      if (dist < MOUSE_DIST && dist > 0) {
        const f = ((MOUSE_DIST - dist) / MOUSE_DIST) * REPEL_FORCE;
        this.vx += (dx / dist) * f;
        this.vy += (dy / dist) * f;
      }

      /* velocity cap */
      const spd = Math.hypot(this.vx, this.vy);
      if (spd > 1.8) { this.vx = (this.vx / spd) * 1.8; this.vy = (this.vy / spd) * 1.8; }

      this.vx *= 0.985;
      this.vy *= 0.985;
      this.x  += this.vx;
      this.y  += this.vy;

      /* wrap edges */
      if (this.x < -20) this.x = W + 20;
      if (this.x > W + 20) this.x = -20;
      if (this.y < -20) this.y = H + 20;
      if (this.y > H + 20) this.y = -20;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 70%, 65%, ${this.alpha})`;
      ctx.fill();
    }
  }

  const particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());

  function drawEdges() {
    /* particle ↔ particle */
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < CONNECT_DIST) {
          const a = (1 - dist / CONNECT_DIST) * 0.18;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(124,58,237,${a})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    /* mouse → nearest particles (cyan threads) */
    if (mouse.x > 0) {
      for (let i = 0; i < particles.length; i++) {
        const dx   = particles[i].x - mouse.x;
        const dy   = particles[i].y - mouse.y;
        const dist = Math.hypot(dx, dy);
        const MDIST = 180;
        if (dist < MDIST) {
          const a = (1 - dist / MDIST) * 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(6,182,212,${a})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }
  }

  function tickParticles() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawEdges();
    requestAnimationFrame(tickParticles);
  }
  tickParticles();


  /* ================================================================
     2. MOUSE SPOTLIGHT  –  large radial glow following the cursor
     ================================================================ */
  const spotlight = document.createElement('div');
  spotlight.id = 'mouse-spotlight';
  document.body.prepend(spotlight);

  document.addEventListener('mousemove', e => {
    spotlight.style.background =
      `radial-gradient(700px circle at ${e.clientX}px ${e.clientY}px,
        rgba(124,58,237,0.07) 0%,
        rgba(6,182,212,0.03) 35%,
        transparent 65%)`;
  });


  /* ================================================================
     3. CUSTOM CURSOR  –  dot + lagging ring
        Disabled on touch-only devices.
     ================================================================ */
  if (!isTouchOnly()) {
    const dot  = document.createElement('div');  dot.id  = 'cursor-dot';
    const ring = document.createElement('div');  ring.id = 'cursor-ring';
    document.body.append(dot, ring);

    let rx = 0, ry = 0, cx = 0, cy = 0;

    document.addEventListener('mousemove', e => {
      cx = e.clientX;
      cy = e.clientY;
      dot.style.transform = `translate(${cx}px,${cy}px)`;
    });

    (function animRing() {
      rx += (cx - rx) * 0.22;
      ry += (cy - ry) * 0.22;
      ring.style.transform = `translate(${rx}px,${ry}px)`;
      requestAnimationFrame(animRing);
    })();

    /* ring grows on hover */
    const HOVER_SEL = 'a,button,.project-card,.repo-card,.about-card,.skill-tag,.btn-primary,.btn-secondary,.hero-avatar';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(HOVER_SEL)) ring.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(HOVER_SEL)) ring.classList.remove('cursor-hover');
    });

    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });

    /* click pulse */
    document.addEventListener('mousedown', () => ring.classList.add('cursor-click'));
    document.addEventListener('mouseup',   () => ring.classList.remove('cursor-click'));
  }


  /* ================================================================
     SCROLL PROGRESS BAR
     ================================================================ */
  const progressBar = document.createElement('div');
  progressBar.id = 'scroll-progress';
  document.body.prepend(progressBar);

  /* ================================================================
     SECTION INDICATOR  (floating label, bottom-right)
     ================================================================ */
  const secIndicator = document.createElement('div');
  secIndicator.id = 'section-indicator';
  document.body.append(secIndicator);

  const TRACKED_SECTIONS = [
    { el: document.querySelector('.hero'),            name: 'Intro' },
    { el: document.querySelector('.stats-bar'),       name: 'Overview' },
    { el: document.querySelector('#about'),           name: 'About' },
    { el: document.querySelector('.projects-teaser'), name: 'Projects' },
    { el: document.querySelector('.github-section'),  name: 'Open Source' },
    { el: document.querySelector('.resume-section'),  name: 'Experience' },
  ].filter(s => s.el);

  let lastSec = '';
  function updateScrollUI() {
    const scrollY = window.scrollY;
    const docH    = document.documentElement.scrollHeight - window.innerHeight;
    const pct     = docH > 0 ? (scrollY / docH) * 100 : 0;
    progressBar.style.width = `${pct}%`;
    const hue = lerp(263, 191, pct / 100);
    progressBar.style.background = `linear-gradient(90deg, hsl(${hue},70%,60%), hsl(191,70%,55%))`;

    const mid = scrollY + window.innerHeight / 2;
    let active = TRACKED_SECTIONS[0];
    TRACKED_SECTIONS.forEach(s => { if (mid > s.el.offsetTop) active = s; });
    if (active && active.name !== lastSec) {
      lastSec = active.name;
      secIndicator.classList.remove('sec-visible');
      void secIndicator.offsetWidth;
      secIndicator.textContent = active.name;
      secIndicator.classList.add('sec-visible');
    }
  }
  window.addEventListener('scroll', updateScrollUI, { passive: true });
  updateScrollUI();

  /* ================================================================
     HERO PARALLAX DISSOLVE
     ================================================================ */
  const heroSection  = document.querySelector('.hero');
  const heroTitle    = document.querySelector('.hero-title');
  const heroSubtitle = document.querySelector('.hero-subtitle');
  const heroBadgeEl  = document.querySelector('.hero-role-pill');
  const heroAvatars  = document.querySelector('.hero-avatars');

  function updateHeroParallax() {
    if (!heroSection) return;
    const t = clamp(window.scrollY / heroSection.offsetHeight, 0, 1);
    if (heroTitle) {
      heroTitle.style.transform = `translateY(${-t * 65}px) scale(${1 + t * 0.06})`;
      heroTitle.style.opacity   = String(1 - t * 1.5);
      heroTitle.style.filter    = `blur(${t * 7}px)`;
    }
    if (heroSubtitle) {
      heroSubtitle.style.transform = `translateY(${-t * 42}px)`;
      heroSubtitle.style.opacity   = String(1 - t * 1.8);
    }
    if (heroBadgeEl) {
      heroBadgeEl.style.transform = `translateY(${t * 28}px)`;
      heroBadgeEl.style.opacity   = String(1 - t * 2);
    }
    if (heroAvatars) {
      heroAvatars.style.transform = `translateY(${-t * 55}px)`;
      heroAvatars.style.opacity   = String(1 - t * 1.7);
    }
  }
  window.addEventListener('scroll', updateHeroParallax, { passive: true });
  updateHeroParallax();

  /* ================================================================
     BLOB PARALLAX + HUE SHIFT
     ================================================================ */
  const blob1 = document.querySelector('.bg-blob-1');
  const blob2 = document.querySelector('.bg-blob-2');
  window.addEventListener('scroll', () => {
    const y   = window.scrollY;
    const pct = y / (document.documentElement.scrollHeight - window.innerHeight);
    if (blob1) { blob1.style.transform = `translateY(${y*0.14}px)`; blob1.style.filter = `blur(80px) hue-rotate(${pct*30}deg)`; }
    if (blob2) { blob2.style.transform = `translateY(${y*-0.09}px)`; blob2.style.filter = `blur(80px) hue-rotate(${-pct*20}deg)`; }
  }, { passive: true });

  /* ================================================================
     SPLIT-WORD TITLE ANIMATION
     ================================================================ */
  document.querySelectorAll('.section-title').forEach(titleEl => {
    // Don't double-process
    if (titleEl.querySelector('.word-wrap')) return;
    titleEl.innerHTML = titleEl.innerHTML.split(/(<[^>]+>|\s+)/g).map(tok => {
      if (/^</.test(tok) || /^\s+$/.test(tok) || tok === '') return tok;
      return `<span class="word-wrap"><span class="word-inner">${tok}</span></span>`;
    }).join('');
  });
  document.querySelectorAll('.word-inner').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 5) * 0.07}s`;
  });
  const titleObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.word-inner').forEach(w => w.classList.add('word-in'));
        titleObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.section-title').forEach(el => titleObs.observe(el));

  /* ================================================================
     CLIP-PATH WIPE REVEALS
     ================================================================ */
  const WIPE_SELS = '.stat-item,.about-card,.project-card,.repo-card,.skill-group,.awards-list,.section-label';
  document.querySelectorAll(WIPE_SELS).forEach(el => el.classList.add('reveal-wipe'));
  ['.about-grid','.projects-row','.repo-grid','.timeline','.skills-groups','.stats-bar'].forEach(sel => {
    const p = document.querySelector(sel);
    if (!p) return;
    p.querySelectorAll('.reveal-wipe').forEach((c, i) => { c.dataset.stagger = i; c.style.transitionDelay = `${i * 0.09}s`; });
  });
  const wipeObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('wipe-in'); wipeObs.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
  document.querySelectorAll('.reveal-wipe').forEach(el => wipeObs.observe(el));

  /* ================================================================
     TIMELINE LINE DRAW
     ================================================================ */
  document.querySelectorAll('.tl-item:not(:last-child)').forEach(item => {
    const dot = item.querySelector('.tl-dot');
    if (!dot) return;
    const lo = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { dot.classList.add('tl-line-grow'); lo.disconnect(); }
    }, { threshold: 0.5 });
    lo.observe(item);
  });

  /* ================================================================
     STAT COUNT-UP
     ================================================================ */
  document.querySelectorAll('.stat-number[data-count]').forEach(el => {
    const target   = parseFloat(el.dataset.count);
    const suffix   = el.dataset.suffix || '';
    const decimals = String(target).includes('.') ? 1 : 0;
    const co = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      co.disconnect();
      const start = performance.now();
      (function tick(now) {
        const ease = 1 - Math.pow(1 - clamp((now - start) / 1400, 0, 1), 3);
        el.textContent = (target * ease).toFixed(decimals) + suffix;
        if (ease < 1) requestAnimationFrame(tick);
        else          el.textContent = target + suffix;
      })(performance.now());
    }, { threshold: 0.5 });
    co.observe(el);
  });

  /* ================================================================
     SCROLL HINT INDICATOR
     ================================================================ */
  const scrollHint = document.createElement('div');
  scrollHint.id = 'scroll-hint';
  scrollHint.innerHTML = '<span class="scroll-hint-line"></span><span class="scroll-hint-text">scroll</span>';
  document.body.append(scrollHint);
  let hintGone = false;
  window.addEventListener('scroll', () => {
    if (!hintGone && window.scrollY > 60) {
      hintGone = true;
      scrollHint.classList.add('hint-hide');
      setTimeout(() => scrollHint.remove(), 700);
    }
  }, { passive: true });
  setTimeout(() => scrollHint.classList.add('hint-show'), 2200);


  /* ================================================================
     5. 3D CARD TILT  –  perspective rotation on mousemove
     ================================================================ */
  const tiltCards = document.querySelectorAll('.project-card, .repo-card, .about-card');

  tiltCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const r    = card.getBoundingClientRect();
      const x    = e.clientX - r.left;
      const y    = e.clientY - r.top;
      const rx   = ((y - r.height / 2) / (r.height / 2)) * -7;
      const ry   = ((x - r.width  / 2) / (r.width  / 2)) *  7;
      const dist = Math.hypot(x - r.width / 2, y - r.height / 2);
      const glow = Math.max(0, 1 - dist / (r.width * 0.8));

      card.style.transform   = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px) scale(1.01)`;
      card.style.boxShadow   = `${-ry * 1.5}px ${rx * 1.5}px 40px rgba(0,0,0,0.5), 0 0 ${30 + glow * 30}px rgba(124,58,237,${0.08 + glow * 0.12})`;
      card.style.borderColor = `rgba(124,58,237,${0.2 + glow * 0.25})`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform   = '';
      card.style.boxShadow   = '';
      card.style.borderColor = '';
    });
  });


  /* ================================================================
     6. MAGNETIC BUTTONS  –  elements subtly pull toward cursor
     ================================================================ */
  const magnetEls = document.querySelectorAll('.btn-primary, .btn-secondary');

  magnetEls.forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width  / 2)) * 0.25;
      const y = (e.clientY - (r.top  + r.height / 2)) * 0.3;
      el.style.transform  = `translate(${x}px, ${y}px)`;
      el.style.transition = 'transform 0.1s ease';
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform  = '';
      el.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
    });
  });


  /* ================================================================
     GLITCH FLASH on hero title  (fires once, 800ms after load)
     ================================================================ */
  const glitchTarget = document.querySelector('.hero-title');
  if (glitchTarget) {
    setTimeout(() => {
      glitchTarget.classList.add('glitch-active');
      setTimeout(() => glitchTarget.classList.remove('glitch-active'), 650);
    }, 800);
  }

  /* ================================================================
     TEXT SCRAMBLE  –  hero badge on load, nav logo on hover
     ================================================================ */
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%+-=';

  function scramble(el, duration) {
    /* preserve inner HTML for elements that have child spans (gradient-text) */
    const original = el.textContent;
    const total    = Math.round(duration / 16);
    let   frame    = 0;

    const id = setInterval(() => {
      const progress = frame / total;
      const revealed = Math.floor(progress * original.length);
      let out = '';
      for (let i = 0; i < original.length; i++) {
        const ch = original[i];
        if (ch === ' ' || ch === '\n') { out += ch; continue; }
        out += i < revealed ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      el.textContent = out;
      if (++frame >= total) { clearInterval(id); el.textContent = original; }
    }, 16);
  }

  const roleText = document.getElementById('role-text');
  if (roleText) setTimeout(() => scramble(roleText, 900), 350);
  const navLogo = document.querySelector('.nav-logo-text');
  if (navLogo) navLogo.addEventListener('mouseenter', () => scramble(navLogo, 400));


  /* blob parallax handled above */


  /* ================================================================
     9. TYPING CURSOR on hero subtitle  –  subtle caret pulse at end
     ================================================================ */
  const heroSub = document.querySelector('.hero-subtitle');
  if (heroSub) {
    const caret = document.createElement('span');
    caret.className = 'typing-caret';
    caret.textContent = '|';
    heroSub.appendChild(caret);
    /* auto-remove after 4 s */
    setTimeout(() => {
      caret.style.transition = 'opacity 1s';
      caret.style.opacity = '0';
      setTimeout(() => caret.remove(), 1000);
    }, 4000);
  }


  /* ================================================================
     SCROLL EFFECTS v3
     ================================================================ */


  /* ── Effect #2: Scroll-Driven Typewriter (section descriptions) ── */
  (function () {
    document.querySelectorAll('.section-description').forEach(function (el) {
      if (el.dataset.twDone) return;
      el.dataset.twDone = '1';
      var words = [];

      function wrapWords(node) {
        if (node.nodeType === 3) {
          var parts = node.textContent.split(/(\s+)/);
          var frag  = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (/^\s+$/.test(p) || p === '') {
              frag.appendChild(document.createTextNode(p));
            } else {
              var sp      = document.createElement('span');
              sp.className = 'tw-word';
              sp.textContent = p;
              words.push(sp);
              frag.appendChild(sp);
            }
          });
          node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === 1) {
          Array.from(node.childNodes).forEach(wrapWords);
        }
      }
      wrapWords(el);

      var fired = false;
      var obs   = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting || fired) return;
        fired = true; obs.disconnect();
        words.forEach(function (w, i) {
          setTimeout(function () { w.classList.add('tw-visible'); }, i * 28);
        });
      }, { threshold: 0.05 });
      obs.observe(el);
    });
  }());


  /* ── Effect #8: Scroll-Driven Timeline Draw ──────────────────── */
  (function () {
    var timeline = document.querySelector('.timeline');
    if (!timeline) return;

    /* show all connector track lines immediately as a faint guide */
    document.querySelectorAll('.tl-item:not(:last-child) .tl-dot').forEach(function (d) {
      d.classList.add('tl-line-grow');
    });

    /* glowing fill overlay */
    var fill      = document.createElement('div');
    fill.id       = 'tl-fill-line';
    timeline.style.position = 'relative';
    timeline.insertBefore(fill, timeline.firstChild);

    /* start items hidden */
    var items = Array.from(document.querySelectorAll('.tl-item'));
    items.forEach(function (item) { item.classList.add('tl-init-hidden'); });

    var TRIG = 0.72;
    function update() {
      var tlRect = timeline.getBoundingClientRect();
      var vh     = window.innerHeight;
      var entered = Math.max(0, vh * TRIG - tlRect.top);
      var pct     = Math.min(100, (entered / tlRect.height) * 120);
      fill.style.height = Math.min(100, pct) + '%';

      items.forEach(function (item) {
        var dotEl = item.querySelector('.tl-dot');
        if (!dotEl) return;
        if (dotEl.getBoundingClientRect().top < vh * TRIG + 20) {
          item.classList.add('tl-item-visible');
        }
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }());


  /* ── Effect #4: Section Scroll Progress Bars ─────────────────── */
  (function () {
    var secs = document.querySelectorAll('.about-section, .projects-teaser, .github-section, .resume-section');
    secs.forEach(function (sec) {
      sec.style.position = 'relative';
      var wrap = document.createElement('div');
      wrap.className = 'sec-prog-wrap';
      var bar = document.createElement('div');
      bar.className = 'sec-prog-bar';
      wrap.appendChild(bar);
      sec.insertBefore(wrap, sec.firstChild);
    });

    function update() {
      secs.forEach(function (sec) {
        var bar  = sec.querySelector('.sec-prog-bar');
        if (!bar) return;
        var rect = sec.getBoundingClientRect();
        var pct  = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - window.innerHeight)));
        bar.style.width = (pct * 100) + '%';
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }());


  /* ── Effect #10: Hidden Decode Message at Footer ─────────────── */
  (function () {
    var footer = document.querySelector('.site-footer');
    if (!footer) return;
    var TARGET = '\u2191\u2191\u2193\u2193\u2190\u2192\u2190\u2192 B A  \u2014  the 90s had two icons';
    var HINT   = '// interactive  \u2014  try entering the sequence on your keyboard';
    var CSET   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%\u2191\u2193\u2190\u2192+-=><_';

    var wrapEl = document.createElement('div');
    wrapEl.id  = 'scroll-decode-wrap';

    var hintEl = document.createElement('div');
    hintEl.id  = 'scroll-decode-hint';
    hintEl.textContent = HINT;

    var msgEl  = document.createElement('div');
    msgEl.id   = 'scroll-decode-msg';
    msgEl.setAttribute('aria-hidden', 'true');

    wrapEl.appendChild(hintEl);
    wrapEl.appendChild(msgEl);
    footer.insertBefore(wrapEl, footer.firstChild);

    var running = false;
    var timers  = [];
    var SCRAMBLE_MS  = 60;
    var REVEAL_DELAY = 35;

    function reset() {
      running = false;
      timers.forEach(function (t) { clearInterval(t); });
      timers = [];
      msgEl.textContent  = '';
      msgEl.style.opacity  = '0';
      hintEl.style.opacity = '0';
    }

    function runDecode() {
      if (running) return;
      running = true;
      hintEl.style.opacity = '1';
      msgEl.style.opacity  = '1';

      var revealed = 0;
      var scrambleEnd = Date.now() + 400;
      var scrambleTimer = setInterval(function () {
        msgEl.textContent = TARGET.split('').map(function (ch) {
          if (ch === ' ') return ' ';
          return CSET[Math.floor(Math.random() * CSET.length)];
        }).join('');
        if (Date.now() >= scrambleEnd) {
          clearInterval(scrambleTimer);
          revealNext();
        }
      }, SCRAMBLE_MS);
      timers.push(scrambleTimer);

      function revealNext() {
        if (!running) return;
        if (revealed >= TARGET.length) { msgEl.textContent = TARGET; return; }
        revealed++;
        var revealTimer = setInterval(function () {
          if (!running) { clearInterval(revealTimer); return; }
          msgEl.textContent = TARGET.split('').map(function (ch, i) {
            if (ch === ' ') return ' ';
            if (i < revealed) return TARGET[i];
            return CSET[Math.floor(Math.random() * CSET.length)];
          }).join('');
        }, SCRAMBLE_MS);
        timers.push(revealTimer);
        var t = setTimeout(function () {
          clearInterval(revealTimer);
          revealNext();
        }, REVEAL_DELAY);
        timers.push(t);
      }
    }

    var obs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { runDecode(); }
      else { reset(); }
    }, { threshold: 0.3 });
    obs.observe(footer);
  }());

})();
