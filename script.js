/* ==========================================================
   Wedding invitation — script.js (vanilla JS, no libraries)
   Sections:
     0. CONFIG  <-- the only place you normally need to edit
     1. Helpers
     2. Guest name from URL (?name=...)
     3. Fill text from CONFIG
     4. Envelope opening
     5. Countdown
     6. Scroll reveal
     7. Music
     8. WhatsApp share
     9. RSVP (with pluggable channels)
    10. Floating gold particles
   ========================================================== */
(() => {
  'use strict';

  /* ---------- 0. CONFIG ---------- */
  const CONFIG = {
    groom: 'مصطفى',
    bride: 'سما',
    groomFull: 'مصطفى محمد',
    brideFull: 'سما عبد الناصر',

    // Local time. Format: YYYY-MM-DDTHH:MM:SS  (midnight at the start of the wedding day)
    weddingDate: '2026-10-09T00:00:00',

    venueName: 'قاعة ليلتي',
    venueAddress: 'على الطريق السريع بكفر شكر',

    // Paste the exact Google Maps share link here (Maps > Share > Copy link).
    // While empty, the button opens a Google Maps SEARCH for the venue name + address
    // (no coordinates are guessed).
    mapsUrl: '',

    // Text used when sharing the invitation on WhatsApp
    shareMessage: 'نتشرف بدعوتك لحضور حفل زفاف مصطفى وسما ❤️',

    // Where RSVP answers go. Leave both empty for the first version.
    rsvp: {
      // Full international number, digits only (e.g. Egypt: 20 + number without leading 0).
      // When set, a filled WhatsApp message to this number opens after the guest submits.
      whatsappNumber: '',
      // URL that accepts a POST with JSON (Google Apps Script web app, Firebase Function,
      // Supabase Edge Function, your own API...). When set, the answer is POSTed there.
      endpoint: ''
    },

    // Guest names longer than this are cut off
    maxNameLength: 40
  };

  /* ---------- 1. Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');

  const toastEl = $('#toast');
  let toastTimer;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-shown'), 3500);
  }

  /* ---------- 2. Guest name from URL ---------- */
  // URLSearchParams already decodes Arabic (%D9%85... -> محمد).
  function getGuestName() {
    const raw = new URLSearchParams(window.location.search).get('name');
    if (!raw) return '';
    return raw
      .replace(/[\u0000-\u001F\u007F<>]/g, '') // control chars and angle brackets
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, CONFIG.maxNameLength);
  }
  const guestName = getGuestName();

  // textContent (never innerHTML) keeps the name safe from injected markup.
  $('#guestGreeting').textContent = guestName
    ? `أهلًا بك يا ${guestName}`
    : 'أهلًا بك، ضيفنا العزيز';

  if (guestName) {
    const coverTo = $('#coverTo');
    coverTo.textContent = `دعوة خاصة إلى ${guestName}`;
    coverTo.hidden = false;
  }

  /* ---------- 3. Fill text from CONFIG ---------- */
  const weddingDate = new Date(CONFIG.weddingDate);

  function formatDate(options) {
    try {
      return new Intl.DateTimeFormat('ar-EG-u-nu-latn', options).format(weddingDate);
    } catch (e) {
      return '';
    }
  }

  const bindings = {
    groom: CONFIG.groom,
    bride: CONFIG.bride,
    groomFull: CONFIG.groomFull,
    brideFull: CONFIG.brideFull,
    venueName: CONFIG.venueName,
    venueAddress: CONFIG.venueAddress,
    weekday: formatDate({ weekday: 'long' }),
    dayNumber: String(weddingDate.getDate()),
    month: formatDate({ month: 'long' }),
    year: String(weddingDate.getFullYear()),
    dateShort: `${weddingDate.getDate()} / ${weddingDate.getMonth() + 1} / ${weddingDate.getFullYear()}`
  };

  if (!isNaN(weddingDate)) {
    $$('[data-bind]').forEach((el) => {
      const value = bindings[el.dataset.bind];
      if (value) el.textContent = value;
    });
  }
  document.title = `دعوة زفاف — ${CONFIG.groom} & ${CONFIG.bride}`;

  // Map button: exact link if provided, otherwise a plain Maps search (no invented coordinates)
  $('#mapBtn').href = CONFIG.mapsUrl ||
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(`${CONFIG.venueName} ${CONFIG.venueAddress}`);

  /* ---------- 4. Envelope opening ---------- */
  const cover = $('#cover');
  const openBtn = $('#openBtn');
  const invitation = $('#invitation');
  const musicBtn = $('#musicBtn');
  let opened = false;

  function openInvitation() {
    if (opened) return;
    opened = true;
    openBtn.disabled = true;
    cover.classList.add('is-opening');

    setTimeout(() => {
      invitation.hidden = false;
      musicBtn.hidden = false;
      document.body.classList.remove('is-locked');
      document.body.classList.add('is-open');
      window.scrollTo(0, 0);
      cover.classList.add('is-hidden');
       // تمرير تلقائي سلس ومتوافق مع الموبايل
      const scrollSpeed = 3; 
      let isAutoScrolling = true;

      function smoothAutoScroll() {
        if (!isAutoScrolling) return;
        
        if ((window.innerHeight + window.scrollY) < document.body.offsetHeight) {
          window.scrollBy(0, scrollSpeed);
          requestAnimationFrame(smoothAutoScroll);
        }
      }

      setTimeout(() => {
        requestAnimationFrame(smoothAutoScroll);
      }, 500);

      const stopAutoScroll = () => {
        isAutoScrolling = false;
      };

      window.addEventListener('touchstart', stopAutoScroll, { passive: true });
      window.addEventListener('wheel', stopAutoScroll, { passive: true });
      window.addEventListener('mousedown', stopAutoScroll, { passive: true });
      // متغير لتخزين التمرير التلقائي

      startScrollReveal();
      setTimeout(() => {
        cover.hidden = true;
        const heading = $('#welcomeTitle');
        if (heading) heading.focus({ preventScroll: true });
      }, reducedMotion ? 0 : 750);
    }, reducedMotion ? 150 : 1500);
  }
  openBtn.addEventListener('click', openInvitation);

  /* ---------- 5. Countdown ---------- */
  const cd = {
    box: $('#countdown'),
    message: $('#cdMessage'),
    days: $('#cdDays'), hours: $('#cdHours'), minutes: $('#cdMinutes'), seconds: $('#cdSeconds')
  };

  function setNum(el, value) {
    if (el.textContent === value) return;
    el.textContent = value;
    if (!reducedMotion) {
      el.classList.remove('tick');
      void el.offsetWidth; // restart the animation
      el.classList.add('tick');
    }
  }

  function updateCountdown() {
    const diff = weddingDate - new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    if (diff > 0) {
      setNum(cd.days, pad(Math.floor(diff / dayMs)));
      setNum(cd.hours, pad(Math.floor((diff % dayMs) / 3600000)));
      setNum(cd.minutes, pad(Math.floor((diff % 3600000) / 60000)));
      setNum(cd.seconds, pad(Math.floor((diff % 60000) / 1000)));
      return true;
    }

    // Never show negative numbers
    cd.box.hidden = true;
    cd.message.hidden = false;
    cd.message.textContent = -diff < dayMs
      ? 'اليوم يوم الفرحة — نتشرف بحضوركم'
      : 'بارك الله لهما وجمع بينهما في خير';
    return -diff < dayMs; // keep checking only until the wedding day is over
  }

  if (!isNaN(weddingDate)) {
    if (updateCountdown()) {
      const timer = setInterval(() => { if (!updateCountdown()) clearInterval(timer); }, 1000);
    }
  }

  /* ---------- 6. Scroll reveal ---------- */
  function startScrollReveal() {
    const targets = $$('[data-reveal], .sec--final');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => io.observe(el));
  }

  /* ---------- 7. Music (manual start only) ---------- */
  const audio = $('#music');
  let musicMissing = false;

  audio.addEventListener('error', () => { musicMissing = true; });

  function setMusicUI(playing) {
    musicBtn.setAttribute('aria-pressed', String(playing));
    musicBtn.setAttribute('aria-label', playing ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى');
  }

  musicBtn.addEventListener('click', async () => {
    if (!audio.paused) {
      audio.pause();
      setMusicUI(false);
      return;
    }
    try {
      audio.load();
      await audio.play();
      setMusicUI(true);
    } catch (err) {
      setMusicUI(false);
      toast(musicMissing || err.name === 'NotSupportedError'
        ? 'ملف الموسيقى غير موجود: ضعه في assets/music/wedding.mp3'
        : 'تعذّر تشغيل الموسيقى على هذا الجهاز');
    }
  });

  /* ---------- 8. WhatsApp share ---------- */
  function buildInvitationUrl() {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    if (guestName) url.searchParams.set('name', guestName); // keeps the guest's name
    return url.toString();
  }

  $('#shareBtn').addEventListener('click', () => {
    const text = `${CONFIG.shareMessage}\n${buildInvitationUrl()}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });

  /* ---------- 9. RSVP ---------- */
  const rsvp = {
    toggle: $('#rsvpToggle'),
    panel: $('#rsvpPanel'),
    form: $('#rsvpForm'),
    name: $('#rsvpName'),
    guestsField: $('#guestsField'),
    guests: $('#rsvpGuests'),
    error: $('#rsvpError'),
    done: $('#rsvpDone'),
    submit: $('#rsvpSubmit')
  };

  rsvp.name.value = guestName;

  rsvp.toggle.addEventListener('click', () => {
    const open = rsvp.panel.hidden;
    rsvp.panel.hidden = !open;
    rsvp.toggle.setAttribute('aria-expanded', String(open));
    if (open) rsvp.name.focus({ preventScroll: false });
  });

  // The guest count only matters when attending
  rsvp.form.addEventListener('change', (e) => {
    if (e.target.name === 'attendance') rsvp.guestsField.hidden = e.target.value === 'no';
  });

  /* RSVP channels — each one receives the answer object.
     To connect a new service (Firebase, Supabase, Google Forms...), add a function
     to this array. A channel returns true when it delivered something. */
  const rsvpChannels = [
    // Channel A: your own endpoint / Google Apps Script / Firebase / Supabase function
    async (data) => {
      if (!CONFIG.rsvp.endpoint) return false;
      const res = await fetch(CONFIG.rsvp.endpoint, {
        method: 'POST',
        // text/plain avoids a CORS preflight (needed by Google Apps Script)
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Endpoint responded with ' + res.status);
      return true;
    },
    // Channel B: opens WhatsApp with a ready-made message to the couple
    async (data) => {
      const number = String(CONFIG.rsvp.whatsappNumber).replace(/\D/g, '');
      if (!number) return false;
      const lines = [
        `تأكيد حضور حفل زفاف ${CONFIG.groom} و${CONFIG.bride}`,
        `الاسم: ${data.name}`,
        data.attending ? `الحالة: سأحضر بإذن الله\nعدد الحضور: ${data.guests}` : 'الحالة: أعتذر عن الحضور'
      ];
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
      return true;
    }
  ];

  rsvp.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    rsvp.error.hidden = true;

    const name = rsvp.name.value.replace(/\s+/g, ' ').trim().slice(0, CONFIG.maxNameLength);
    if (!name) {
      rsvp.error.textContent = 'من فضلك اكتب اسمك';
      rsvp.error.hidden = false;
      rsvp.name.focus();
      return;
    }

    const attending = rsvp.form.elements.attendance.value === 'yes';
    const data = {
      name,
      attending,
      guests: attending ? Number(rsvp.guests.value) : 0,
      invitedAs: guestName,
      submittedAt: new Date().toISOString()
    };

    rsvp.submit.disabled = true;
    let delivered = false;
    try {
      for (const channel of rsvpChannels) {
        if (await channel(data)) delivered = true;
      }
    } catch (err) {
      console.error('RSVP failed:', err);
      rsvp.error.textContent = 'تعذّر إرسال الرد، من فضلك حاول مرة أخرى';
      rsvp.error.hidden = false;
      rsvp.submit.disabled = false;
      return;
    }

    // Always keep a copy on this device
    try { localStorage.setItem('wedding-rsvp', JSON.stringify(data)); } catch (err) { /* storage unavailable */ }

    rsvp.form.hidden = true;
    rsvp.done.hidden = false;
    rsvp.done.textContent = attending
      ? 'شكرًا لك، تم تسجيل تأكيد حضورك. بانتظارك بإذن الله'
      : 'شكرًا لك، تم تسجيل اعتذارك. نقدّر ردّك';

    // Development-only hint: no channel is connected yet
    const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
    if (!delivered) {
      console.warn('RSVP was not sent anywhere. Set CONFIG.rsvp.whatsappNumber or CONFIG.rsvp.endpoint in script.js.');
      if (isLocal) {
        const note = document.createElement('small');
        note.textContent = 'وضع التجربة: لم يتم ربط قناة لاستقبال الردود بعد (راجع README)';
        rsvp.done.appendChild(note);
      }
    }
  });

  /* ---------- 10. Floating gold particles ---------- */
  function startParticles() {
    if (reducedMotion) return;
    const canvas = $('#particles');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, particles = [], raf = 0;

    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = w < 600 ? 18 : 30;
      particles = Array.from({ length: count }, () => spawn(true));
    }

    function spawn(anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 10,
        r: 0.8 + Math.random() * 1.8,
        vy: 0.12 + Math.random() * 0.28,
        drift: (Math.random() - 0.5) * 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02
      };
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.y -= p.vy; p.x += p.drift; p.phase += p.speed;
        if (p.y < -10) Object.assign(p, spawn(false));
        const alpha = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(p.phase));
        ctx.beginPath();
        ctx.fillStyle = `rgba(200, 160, 80, ${alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  }
  startParticles();
})();
