/* Dr. Kabir Anand — interactions
   Works without GSAP/Lenis (CDN offline): reveals and counters are vanilla,
   GSAP only adds smooth scroll, the pinned journey rail and parallax. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const root = document.documentElement;

  /* One heartbeat, p in 0..1 → amplitude (P wave, QRS complex, T wave) */
  const g = (p, c, w) => Math.exp(-((p - c) ** 2) / w);
  const beat = (p) =>
    0.12 * g(p, 0.18, 0.0012) - 0.15 * g(p, 0.36, 0.00012) + g(p, 0.4, 0.00018) -
    0.28 * g(p, 0.44, 0.00016) + 0.22 * g(p, 0.66, 0.004);

  /* ---------- word splitting ---------- */
  function splitWords(el, cls) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            if (cls) {
              const s = document.createElement('span');
              s.className = cls; s.textContent = part; frag.append(s);
            } else {
              const o = document.createElement('span'); o.className = 'w';
              const inner = document.createElement('span'); inner.className = 'wi';
              inner.style.setProperty('--i', i++); inner.textContent = part;
              o.append(inner); frag.append(o);
            }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  }
  $$('[data-split]').forEach((el) => splitWords(el));
  $$('[data-words]').forEach((el) => splitWords(el, 'mw'));
  if (!reduced) root.classList.add('js-motion');

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-split]').forEach((el) => io.observe(el));

  /* ---------- counters ---------- */
  const fmt = new Intl.NumberFormat('en-IN');
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const end = +e.target.dataset.count;
      if (reduced) return;
      const t0 = performance.now(), dur = 1900;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        e.target.textContent = fmt.format(Math.round(end * (1 - Math.pow(1 - p, 4))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- manifesto: words light up as you read ---------- */
  const manifesto = $('.manifesto');
  const mWords = $$('.mw', manifesto);
  function lightWords() {
    const r = manifesto.getBoundingClientRect();
    const vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.86 - r.top) / (r.height + vh * 0.42)));
    const n = Math.round(p * mWords.length);
    mWords.forEach((w, i) => w.classList.toggle('is-lit', i < n));
  }
  if (reduced) mWords.forEach((w) => w.classList.add('is-lit'));

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    lenis.stop();
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) { e.preventDefault(); return; }
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.5 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* ---------- nav, progress, scroll-linked bits ---------- */
  const nav = $('.nav'), bar = $('.progress span');
  const sections = $$('main section[id]');
  const navLinks = $$('.nav__links a');
  let lastY = 0, ticking = false;
  function onScroll() {
    const y = scrollY, max = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('is-hidden', y > lastY && y > 500 && !document.body.classList.contains('menu-open'));
    lastY = y;
    if (!reduced) lightWords();
    let current = '';
    sections.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.45) current = '#' + s.id; });
    navLinks.forEach((l) => l.classList.toggle('is-current', l.getAttribute('href') === current));
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  const burger = $('.nav__burger'), menu = $('.menu');
  function closeMenu() {
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis && !document.body.classList.contains('is-loading')) lenis.start();
  }
  burger.addEventListener('click', () => {
    if (document.body.classList.contains('menu-open')) return closeMenu();
    document.body.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Close menu');
    menu.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- preloader → hero entrance ---------- */
  const loader = $('.loader'), bpmEl = $('.loader__bpm');
  const heroLines = $$('.hero .line__in'), heroFades = $$('[data-hero-fade]'), heroTag = $('.hero__tag');
  if (hasGsap && !reduced) {
    gsap.set(heroLines, { yPercent: 115 });
    gsap.set([heroTag, ...heroFades], { autoAlpha: 0, y: 26 });
  }
  function enter() {
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    if (lenis) lenis.start();
    setTimeout(() => loader.remove(), 1300);
    if (hasGsap && !reduced) {
      const tl = gsap.timeline({ delay: 0.35, defaults: { ease: 'expo.out' } });
      tl.to(heroTag, { autoAlpha: 1, y: 0, duration: 1 })
        .to(heroLines, { yPercent: 0, duration: 1.5, stagger: 0.11 }, 0.05)
        .to(heroFades, { autoAlpha: 1, y: 0, duration: 1.3, stagger: 0.1 }, 0.55);
    }
    setTimeout(startRotator, 2600);
  }
  if (reduced) { bpmEl.textContent = '72'; enter(); }
  else {
    const t0 = performance.now(), dur = 1700;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      bpmEl.textContent = Math.round(72 * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick); else setTimeout(enter, 280);
    };
    requestAnimationFrame(tick);
    setTimeout(() => { if (document.body.classList.contains('is-loading')) enter(); }, 4500); // failsafe
  }

  /* ---------- rotating word ---------- */
  function startRotator() {
    const words = $$('.rot em');
    if (reduced || words.length < 2) return;
    let i = 0;
    setInterval(() => {
      const cur = words[i]; i = (i + 1) % words.length; const next = words[i];
      cur.classList.remove('is-active'); cur.classList.add('is-out');
      next.style.transition = 'none'; next.classList.remove('is-out');
      void next.offsetWidth; next.style.transition = '';
      next.classList.add('is-active');
    }, 2600);
  }

  /* ---------- hero ECG monitor sweep ---------- */
  (function ecg() {
    const cv = $('.hero__ecg'); if (!cv) return;
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, visible = true, raf = 0;
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const yAt = (x, beatW) => h * 0.72 - beat((x / beatW) % 1) * h * 0.62;
    function draw(time) {
      ctx.clearRect(0, 0, w, h);
      const beatW = Math.max(240, w / 4.5);
      const head = reduced ? w : ((time * 0.16) % (w + 200));
      const chunk = 10; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (let x0 = 0; x0 < Math.min(head, w); x0 += chunk) {
        const age = head - x0;
        const a = reduced ? 0.5 : Math.max(0, 1 - age / (w * 0.75));
        if (a <= 0.01) continue;
        ctx.strokeStyle = `rgba(255,91,58,${a.toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(x0, yAt(x0, beatW));
        for (let x = x0 + 1; x <= Math.min(x0 + chunk, head, w); x++) ctx.lineTo(x, yAt(x, beatW));
        ctx.stroke();
      }
      if (!reduced && head < w) {
        const y = yAt(head, beatW);
        const grd = ctx.createRadialGradient(head, y, 0, head, y, 22);
        grd.addColorStop(0, 'rgba(255,91,58,.9)'); grd.addColorStop(1, 'rgba(255,91,58,0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(head, y, 22, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ffd9cf'; ctx.beginPath(); ctx.arc(head, y, 2.4, 0, 6.3); ctx.fill();
      }
    }
    const loop = (t) => { draw(t); if (visible && !reduced) raf = requestAnimationFrame(loop); };
    size(); addEventListener('resize', () => { size(); if (reduced) draw(0); });
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting; cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    }).observe(cv);
    if (reduced) draw(0);
  })();

  /* ---------- portrait: contour heart + live BPM ---------- */
  (function contours() {
    const grp = $('.contours'); if (!grp) return;
    const d = 'M50 90C22 66 6 48 6 30 6 16 17 6 29 6c9 0 17 5 21 13 4-8 12-13 21-13 12 0 23 10 23 24 0 18-16 36-44 60Z';
    const n = 11;
    for (let i = 0; i < n; i++) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const s = 1 - i * 0.085;
      p.setAttribute('d', d);
      p.style.setProperty('--s', s.toFixed(3));
      p.style.opacity = (0.16 + (i / n) * 0.7).toFixed(2);
      p.style.animationDelay = `${-i * 0.045}s`;
      if (i === n - 1) { p.style.fill = 'var(--pulse)'; p.style.stroke = 'var(--pulse)'; p.style.opacity = 1; }
      grp.append(p);
    }
    const hud = $('.hud-bpm');
    if (hud && !reduced) setInterval(() => { hud.textContent = 70 + Math.round(Math.random() * 4); }, 1600);
  })();

  /* ---------- journey ECG path ---------- */
  const jPath = $('.journey__line path');
  if (jPath) {
    let d = 'M0 70';
    for (let x = 0; x <= 1000; x += 1) d += `L${x} ${(70 - beat((x / 125) % 1) * 58).toFixed(1)}`;
    jPath.setAttribute('d', d);
  }

  /* ---------- GSAP: pinned horizontal journey + parallax ---------- */
  if (hasGsap && !reduced) {
    gsap.registerPlugin(ScrollTrigger);
    const track = $('.journey__track');
    const steps = $$('.step');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);

    function updateActiveStep(progress) {
      if (!steps.length) return;
      const idx = Math.min(steps.length - 1, Math.floor(progress * steps.length));
      steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.journey',
        pin: '.journey__pin',
        start: 'top top',
        end: () => '+=' + dist(),
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => updateActiveStep(self.progress)
      },
    });
    tl.to(track, { x: () => -dist(), ease: 'none' }, 0)
      .to(jPath, { strokeDashoffset: 0, ease: 'none' }, 0);

    // Tap/touch on step cards on mobile to highlight
    steps.forEach((s) => {
      s.addEventListener('click', () => {
        steps.forEach((other) => other.classList.remove('is-active'));
        s.classList.add('is-active');
      });
    });

    gsap.to('.hero__glow', { yPercent: 28, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__visual', { yPercent: -9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.voices__mark', { yPercent: 22, ease: 'none', scrollTrigger: { trigger: '.voices', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.footer__name', { yPercent: 45, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ---------- expertise accordion ---------- */
  const items = $$('.svc__item');
  items.forEach((item) => {
    $('.svc__head', item).addEventListener('click', () => {
      const open = item.classList.contains('is-open');
      items.forEach((o) => { o.classList.remove('is-open'); $('.svc__head', o).setAttribute('aria-expanded', 'false'); });
      if (!open) { item.classList.add('is-open'); $('.svc__head', item).setAttribute('aria-expanded', 'true'); }
      if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 750);
    });
  });

  /* ---------- testimonials ---------- */
  (function voices() {
    const slides = $$('.voice'); if (!slides.length) return;
    const count = $('.voices__count b'), fill = $('.voices__bar span');
    let i = 0, timer = 0, inView = false;
    const pad = (n) => String(n).padStart(2, '0');
    function restart() {
      clearTimeout(timer); fill.classList.remove('is-running');
      if (reduced || !inView) return;
      void fill.offsetWidth; fill.classList.add('is-running');
      timer = setTimeout(() => go(i + 1), 7000);
    }
    function go(n) {
      slides[i].classList.remove('is-active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-active'); count.textContent = pad(i + 1);
      restart();
    }
    $('[data-voice="prev"]').addEventListener('click', () => go(i - 1));
    $('[data-voice="next"]').addEventListener('click', () => go(i + 1));
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; restart(); }, { threshold: 0.3 }).observe($('.voices__stage'));
  })();

  /* ---------- cursor, magnetic buttons, tilt ---------- */
  if (fine && !reduced) {
    const ring = $('.cursor'), dot = $('.cursor-dot'), label = $('.cursor__label');
    let mx = 0, my = 0, rx = 0, ry = 0;
    addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      ring.classList.add('is-on'); dot.classList.add('is-on');
    });
    document.addEventListener('mouseleave', () => { ring.classList.remove('is-on'); dot.classList.remove('is-on'); });
    (function follow() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    })();
    $$('a, button, .chips label').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        if (el.dataset.cursor) { label.textContent = el.dataset.cursor; ring.classList.add('is-label'); }
        else ring.classList.add('is-link');
      });
      el.addEventListener('mouseleave', () => ring.classList.remove('is-link', 'is-label'));
    });

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.28, y = (e.clientY - r.top - r.height / 2) * 0.4;
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.style.transition = 'transform .15s linear, color .45s, border-color .45s';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform .9s cubic-bezier(.19,1,.22,1), color .45s, border-color .45s';
        el.style.transform = '';
      });
    });

    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 10}deg)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- booking form (front-end only) ---------- */
  const form = $('.form');
  if (form) {
    const ta = $('textarea', form);
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; });
    $$('.field input', form).forEach((inp) => inp.addEventListener('input', () => inp.parentElement.classList.remove('is-bad')));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstBad = null;
      $$('.field input', form).forEach((inp) => {
        const bad = !inp.checkValidity();
        inp.parentElement.classList.toggle('is-bad', bad);
        if (bad && !firstBad) firstBad = inp;
      });
      if (firstBad) { firstBad.focus(); return; }
      // TODO: send new FormData(form) to your booking backend / email service here.
      const first = form.elements.name.value.trim().split(/\s+/)[0];
      $('.form__who', form).textContent = first || 'thank you';
      form.classList.add('is-sent');
    });
  }
})();
