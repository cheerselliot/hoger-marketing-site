(function () {
  const cfg = window.__LP__ || {};

  function captureUtm() {
    const params = new URLSearchParams(window.location.search);
    const utm = {
      campaign: params.get('utm_campaign') || undefined,
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
    };
    if (utm.campaign || utm.source || utm.medium) {
      sessionStorage.setItem('lp_utm', JSON.stringify(utm));
    }
  }

  function getUtm() {
    try {
      return JSON.parse(sessionStorage.getItem('lp_utm') || 'null');
    } catch {
      return null;
    }
  }

  function loadPostHog() {
    if (!cfg.posthogKey || (window.posthog && window.posthog.__loaded)) {
      return;
    }
    !(function (t, e) {
      var o, n, p, r;
      e.__SV ||
        (window.posthog && window.posthog.__loaded) ||
        ((window.posthog = e),
        (e._i = []),
        (e.init = function (i, s, a) {
          function g(t, e) {
            var o = e.split('.');
            2 == o.length && ((t = t[o[0]]), (e = o[1])),
              (t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
              });
          }
          ((p = t.createElement('script')).type = 'text/javascript'),
            (p.crossOrigin = 'anonymous'),
            (p.async = !0),
            (p.src =
              s.api_host.replace('.i.posthog.com', '-assets.i.posthog.com') +
              '/static/array.js'),
            (r = t.getElementsByTagName('script')[0]).parentNode.insertBefore(p, r);
          var u = e;
          for (
            void 0 !== a ? (u = e[a] = []) : (a = 'posthog'),
              u.people = u.people || [],
              u.toString = function (t) {
                var e = 'posthog';
                return 'posthog' !== a && (e += '.' + a), t || (e += ' (stub)'), e;
              },
              o =
                'init capture register register_once get_distinct_id'.split(' '),
              n = 0;
            n < o.length;
            n++
          )
            g(u, o[n]);
          e._i.push([i, s, a]);
        }),
        (e.__SV = 1));
    })(document, window.posthog || []);

    window.posthog.init(cfg.posthogKey, {
      api_host: cfg.posthogHost || 'https://app.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
    });

    window.posthog.register({
      site: cfg.site,
      hostname: cfg.hostname,
      ...(getUtm() || {}),
    });
  }

  function upgradeWaitlistButton(btn) {
    if (!btn || btn.dataset.waitlistUpgraded === '1') return;

    const legacyLabel = btn.querySelector('.waitlist-submit-text');
    if (legacyLabel && !btn.querySelector('.waitlist-submit-default')) {
      legacyLabel.classList.replace('waitlist-submit-text', 'waitlist-submit-default');
    }

    if (!btn.querySelector('.waitlist-submit-loading')) {
      const loading = document.createElement('span');
      loading.className = 'waitlist-submit-loading';
      loading.setAttribute('aria-hidden', 'true');
      const spinner = btn.querySelector(':scope > .waitlist-submit-spinner');
      if (spinner) {
        spinner.remove();
        loading.appendChild(spinner);
      } else {
        loading.innerHTML = '<span class="waitlist-submit-spinner"></span>';
      }
      btn.appendChild(loading);
    }

    if (!btn.querySelector('.waitlist-submit-success')) {
      const success = document.createElement('span');
      success.className = 'waitlist-submit-success';
      success.setAttribute('aria-hidden', 'true');
      success.innerHTML =
        '<span class="waitlist-submit-check" aria-hidden="true">✓</span>' +
        '<span class="waitlist-submit-success-text"></span>';
      btn.appendChild(success);
    }

    btn.dataset.waitlistUpgraded = '1';
  }

  function getWaitlistSubmitBtn(form) {
    return (
      form.querySelector('[data-waitlist-submit]') ||
      form.querySelector('button[type="submit"]')
    );
  }

  function setWaitlistState(form, state) {
    const submitBtn = getWaitlistSubmitBtn(form);
    const emailInput = form.querySelector('input[type="email"]');
    const msg = form.querySelector('.waitlist-message');

    if (submitBtn && state !== 'idle') {
      upgradeWaitlistButton(submitBtn);
    }

    form.classList.toggle('is-submitting', state === 'loading');

    if (submitBtn) {
      submitBtn.classList.remove('is-loading', 'is-success');
      submitBtn.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');

      if (state === 'loading') {
        submitBtn.classList.add('is-loading');
        submitBtn.disabled = true;
      } else if (state === 'success') {
        submitBtn.classList.add('is-success');
        submitBtn.disabled = true;
      } else {
        submitBtn.disabled = false;
      }
    }

    if (emailInput) {
      emailInput.disabled = state === 'loading' || state === 'success';
    }

    if (state === 'loading' && msg) {
      msg.hidden = true;
    }
  }

  function showWaitlistSuccess(form) {
    const submitBtn = getWaitlistSubmitBtn(form);
    upgradeWaitlistButton(submitBtn);
    const successText = submitBtn?.querySelector('.waitlist-submit-success-text');
    const successEl = submitBtn?.querySelector('.waitlist-submit-success');
    const label =
      form?.dataset?.successMessage ||
      cfg.waitlistSuccess ||
      "You're on the list.";

    if (successText) {
      successText.textContent = label;
    }

    if (successEl) {
      successEl.removeAttribute('aria-hidden');
    }

    setWaitlistState(form, 'success');
  }

  function initWaitlistForms() {
    document.querySelectorAll('[data-waitlist-form]').forEach((form) => {
      upgradeWaitlistButton(getWaitlistSubmitBtn(form));

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = form.querySelector('.waitlist-message');
        const emailInput = form.querySelector('input[type="email"]');
        const honeypot = form.querySelector('.hp-field');
        const email = (emailInput?.value || '').trim();
        const tag = form.dataset.subscribeTag || undefined;

        if (honeypot?.value) return;

        if (!email) {
          showMessage(msg, 'Please enter your email.', 'error');
          emailInput?.focus();
          return;
        }

        setWaitlistState(form, 'loading');

        try {
          const res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              tag,
              utm: getUtm() || undefined,
            }),
          });
          const data = await res.json();
          if (data.ok) {
            if (emailInput) emailInput.value = '';
            showWaitlistSuccess(form);
            if (window.posthog?.__loaded) {
              window.posthog.capture('waitlist_submitted', {
                site: cfg.site,
                hostname: cfg.hostname,
                tag: tag || null,
                ...(getUtm() || {}),
              });
            }
          } else {
            setWaitlistState(form, 'idle');
            showMessage(msg, data.error || 'Something went wrong.', 'error');
          }
        } catch {
          setWaitlistState(form, 'idle');
          showMessage(msg, 'Network error. Try again.', 'error');
        }
      });
    });
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function initCountdowns() {
    document.querySelectorAll('[data-countdown]').forEach((root) => {
      if (root.dataset.countdownReady === '1') return;

      const raw =
        root.getAttribute('data-countdown') ||
        root.getAttribute('data-target') ||
        '';
      const targetMs = Date.parse(raw);
      if (Number.isNaN(targetMs)) return;

      const part = (name) => root.querySelector(`[data-countdown-part="${name}"]`);
      const daysEl = part('days');
      const hoursEl = part('hours');
      const minutesEl = part('minutes');
      const secondsEl = part('seconds');

      const tick = () => {
        const diff = Math.max(0, targetMs - Date.now());
        const totalSec = Math.floor(diff / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;

        if (daysEl) daysEl.textContent = String(days);
        if (hoursEl) hoursEl.textContent = pad2(hours);
        if (minutesEl) minutesEl.textContent = pad2(minutes);
        if (secondsEl) secondsEl.textContent = pad2(seconds);

        if (diff === 0) {
          root.classList.add('is-launched');
        }
      };

      root.dataset.countdownReady = '1';
      tick();
      window.setInterval(tick, 1000);
    });
  }

  function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'waitlist-message ' + type;
    el.hidden = false;
  }

  function initNav() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.getElementById('primary-nav');
    const overlay = document.querySelector('.nav-overlay');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        nav.classList.toggle('open');
        overlay?.classList.toggle('open');
      });
    }
    document.querySelectorAll('nav a[href^="#"]').forEach((link) => {
      link.addEventListener('click', () => {
        nav?.classList.remove('open');
        toggle?.setAttribute('aria-expanded', 'false');
        overlay?.classList.remove('open');
      });
    });
  }

  function initEditorialHeader() {
    const header = document.querySelector('.site-header--editorial');
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /** One hero tool slides out and the next slides in. A new category fades with it. The ERP stays. */
  function initFlowStage() {
    const stack = document.querySelector('[data-swap]');
    if (!stack) return;
    const cards = [...stack.querySelectorAll('.swap-card')];
    const typeEl = stack.querySelector('[data-swap-type]');
    if (cards.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let i = 0;
    window.setInterval(() => {
      const prev = i;
      i = (i + 1) % cards.length;
      cards.forEach((el, n) => {
        el.classList.remove('is-reset');
        el.classList.toggle('is-on', n === i);
        el.classList.toggle('is-out', n === prev);
      });
      const nextKind = cards[i].getAttribute('data-swap-kind');
      const prevKind = cards[prev].getAttribute('data-swap-kind');
      if (typeEl && nextKind && nextKind !== prevKind) {
        typeEl.classList.add('is-out');
        window.setTimeout(() => {
          typeEl.textContent = nextKind;
          void typeEl.offsetWidth;
          typeEl.classList.remove('is-out');
        }, 220);
      }
      window.setTimeout(() => {
        const gone = cards[prev];
        if (!gone || prev === i) return;
        gone.classList.add('is-reset');
        gone.classList.remove('is-out');
      }, 520);
    }, 2600);
  }

  /** Product clips loop. Reduced motion leaves them on the first frame. */
  function initLoopMedia() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('.loop-media video').forEach((node) => {
      const video = node;
      if (reduce) {
        video.removeAttribute('autoplay');
        video.pause();
        return;
      }
      const play = video.play();
      if (play && typeof play.catch === 'function') play.catch(() => {});
    });
  }

  function boot() {
    captureUtm();
    initCountdowns();
    initNav();
    initEditorialHeader();
    initFlowStage();
    initLoopMedia();
    initWaitlistForms();
    loadPostHog();
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
