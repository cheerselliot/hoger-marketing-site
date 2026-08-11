import { DateTime } from "https://cdn.jsdelivr.net/npm/luxon@3.5.0/+esm";
import { initPlexusBackground } from "./plexus-bg.js?v=3";

const cfg = window.__HOGER__ || {};

function captureUtm() {
  const params = new URLSearchParams(window.location.search);
  const utm = {
    campaign: params.get("utm_campaign") || undefined,
    source: params.get("utm_source") || undefined,
    medium: params.get("utm_medium") || undefined,
  };
  if (utm.campaign || utm.source || utm.medium) {
    sessionStorage.setItem("hoger_utm", JSON.stringify(utm));
  }
}

function getUtm() {
  try {
    return JSON.parse(sessionStorage.getItem("hoger_utm") || "null");
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
          var o = e.split(".");
          2 == o.length && ((t = t[o[0]]), (e = o[1])),
            (t[e] = function () {
              t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
            });
        }
        ((p = t.createElement("script")).type = "text/javascript"),
          (p.crossOrigin = "anonymous"),
          (p.async = !0),
          (p.src =
            s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") +
            "/static/array.js"),
          (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r);
        var u = e;
        for (
          void 0 !== a ? (u = e[a] = []) : (a = "posthog"),
            u.people = u.people || [],
            u.toString = function (t) {
              var e = "posthog";
              return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e;
            },
            o = "init capture register register_once get_distinct_id".split(" "),
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
    api_host: cfg.posthogHost || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
  });

  window.posthog.register({
    site: cfg.site || "hoger",
    hostname: cfg.hostname || window.location.hostname,
    ...(getUtm() || {}),
  });
}

function loadRedditPixel() {
  const pixelId = cfg.redditPixelId;
  if (!pixelId || window.rdt) return;

  !(function (w, d) {
    if (!w.rdt) {
      var p = (w.rdt = function () {
        p.sendEvent ? p.sendEvent.apply(p, arguments) : p.callQueue.push(arguments);
      });
      p.callQueue = [];
      var t = d.createElement("script");
      t.src = "https://www.redditstatic.com/ads/pixel.js";
      t.async = true;
      var s = d.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(t, s);
    }
  })(window, document);

  window.rdt("init", pixelId);
  window.rdt("track", "PageVisit");
}

function upgradeWaitlistButton(btn) {
  if (!btn || btn.dataset.waitlistUpgraded === "1") return;

  if (!btn.querySelector(".waitlist-submit-loading")) {
    const loading = document.createElement("span");
    loading.className = "waitlist-submit-loading";
    loading.setAttribute("aria-hidden", "true");
    loading.innerHTML = '<span class="waitlist-submit-spinner"></span>';
    btn.appendChild(loading);
  }

  if (!btn.querySelector(".waitlist-submit-success")) {
    const success = document.createElement("span");
    success.className = "waitlist-submit-success";
    success.setAttribute("aria-hidden", "true");
    success.innerHTML =
      '<span class="waitlist-submit-check" aria-hidden="true">✓</span>' +
      '<span class="waitlist-submit-success-text"></span>';
    btn.appendChild(success);
  }

  btn.dataset.waitlistUpgraded = "1";
}

function getWaitlistSubmitBtn(form) {
  return form.querySelector("[data-waitlist-submit]") || form.querySelector('button[type="submit"]');
}

function setWaitlistState(form, state) {
  const submitBtn = getWaitlistSubmitBtn(form);
  const emailInput = form.querySelector('input[type="email"]');
  const msg = form.querySelector(".waitlist-message");

  if (submitBtn && state !== "idle") {
    upgradeWaitlistButton(submitBtn);
  }

  if (submitBtn) {
    submitBtn.classList.remove("is-loading", "is-success");
    submitBtn.setAttribute("aria-busy", state === "loading" ? "true" : "false");

    if (state === "loading") {
      submitBtn.classList.add("is-loading");
      submitBtn.disabled = true;
    } else if (state === "success") {
      submitBtn.classList.add("is-success");
      submitBtn.disabled = true;
    } else {
      submitBtn.disabled = false;
    }
  }

  if (emailInput) {
    emailInput.disabled = state === "loading" || state === "success";
  }

  if (state === "loading" && msg) {
    msg.hidden = true;
  }
}

function showWaitlistSuccess(form) {
  const submitBtn = getWaitlistSubmitBtn(form);
  upgradeWaitlistButton(submitBtn);
  const successText = submitBtn?.querySelector(".waitlist-submit-success-text");
  const successEl = submitBtn?.querySelector(".waitlist-submit-success");
  const label = cfg.waitlistSuccess || "You're on the list.";

  if (successText) successText.textContent = label;
  if (successEl) successEl.removeAttribute("aria-hidden");
  setWaitlistState(form, "success");
}

function showMessage(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = "waitlist-message " + type;
  el.hidden = false;
}

function initWaitlistForms() {
  document.querySelectorAll("[data-waitlist-form]").forEach((form) => {
    upgradeWaitlistButton(getWaitlistSubmitBtn(form));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = form.querySelector(".waitlist-message");
      const emailInput = form.querySelector('input[type="email"]');
      const honeypot = form.querySelector(".hp-field");
      const email = (emailInput?.value || "").trim();

      if (honeypot?.value) return;

      if (!email) {
        showMessage(msg, "Please enter your email.", "error");
        emailInput?.focus();
        return;
      }

      setWaitlistState(form, "loading");

      try {
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            utm: getUtm() || undefined,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          if (emailInput) emailInput.value = "";
          showWaitlistSuccess(form);
          if (window.posthog?.__loaded) {
            window.posthog.capture("waitlist_submitted", {
              site: cfg.site || "hoger",
              hostname: cfg.hostname || window.location.hostname,
              ...(getUtm() || {}),
            });
          }
          if (window.rdt) {
            window.rdt("track", "Lead");
          }
        } else {
          setWaitlistState(form, "idle");
          showMessage(msg, data.error || "Something went wrong.", "error");
        }
      } catch {
        setWaitlistState(form, "idle");
        showMessage(msg, "Network error. Try again.", "error");
      }
    });
  });
}

function initNav() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("primary-nav");
  const overlay = document.querySelector(".nav-overlay");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("open");
      overlay?.classList.toggle("open");
    });
  }

  document.querySelectorAll('nav a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      nav?.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
      overlay?.classList.remove("open");
    });
  });
}

function initCtaTracking() {
  document.querySelectorAll("[data-track-cta]").forEach((el) => {
    el.addEventListener("click", () => {
      if (window.posthog?.__loaded) {
        window.posthog.capture("cta_clicked", {
          site: cfg.site || "hoger",
          label: el.getAttribute("data-track-cta") || el.textContent?.trim(),
        });
      }
    });
  });
}

const LAUNCH = DateTime.fromObject(
  { year: 2026, month: 9, day: 15, hour: 0, minute: 0, second: 0 },
  { zone: "Australia/Sydney" },
);

function pad(n) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function updateCountdown() {
  const dateEl = document.getElementById("launch-date-local");
  const days = document.getElementById("countdown-days");
  const hours = document.getElementById("countdown-hours");
  const minutes = document.getElementById("countdown-minutes");
  const seconds = document.getElementById("countdown-seconds");

  if (dateEl) {
    const local = LAUNCH.setZone("local");
    dateEl.textContent = local.toFormat("MMMM d, yyyy 'at' h:mm a ZZZZ");
  }

  if (!days || !hours || !minutes || !seconds) return;

  const remaining = LAUNCH.diff(DateTime.now());
  if (remaining.toMillis() <= 0) {
    days.textContent = "0";
    hours.textContent = "00";
    minutes.textContent = "00";
    seconds.textContent = "00";
    return;
  }

  const parts = remaining.shiftTo("days", "hours", "minutes", "seconds").toObject();
  days.textContent = String(Math.floor(parts.days ?? 0));
  hours.textContent = pad(Math.floor(parts.hours ?? 0));
  minutes.textContent = pad(Math.floor(parts.minutes ?? 0));
  seconds.textContent = pad(Math.floor(parts.seconds ?? 0));
}

function initCountdown() {
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
}

captureUtm();
loadPostHog();
loadRedditPixel();
initPlexusBackground(document.getElementById("plexus-canvas"));
initNav();
initWaitlistForms();
initCtaTracking();
initCountdown();

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());
