// Cookie consent: the preferences dialog, the stored choice, and the gate that
// decides whether Google Tag Manager and the Meta pixel are allowed to run at all.
//
// The gate is the part that matters. Both tags sit in every page's <head>
// (tools/design/tracking.html), where an ordinary <script> would execute during
// parse, long before this module (a deferred ES module) gets a turn. A banner
// alone would therefore be decorative: the cookies would already be set. So the
// tags ship as type="text/plain" with a data-consent attribute, which browsers
// refuse to execute, and activate() below revives the ones the visitor allows by
// copying them into a fresh <script>. Nothing tracking-related runs until then.
//
// Categories are deliberately coarse. "analytics" covers GTM, "marketing" covers
// the Meta pixel; anything strictly needed to serve the page needs no consent and
// no toggle. Denial is the default for both, including for a visitor who dismisses
// the banner without choosing, and "Reject all" is given the same weight as
// "Accept all" rather than being hidden behind the preferences dialog.
//
// The pages draw the design's own cookie bar, whose buttons call acceptAll() and
// rejectAll() here. The banner this module can draw itself stays for any page
// that has no bar of its own (initConsent's `banner` option).

const KEY = 'lk-consent';
const VERSION = 1;
// Re-asking every six months is the usual reading of "consent does not last
// forever"; a stored choice older than this is treated as absent.
const MAX_AGE_DAYS = 182;

const CATEGORIES = [
  {
    id: 'necessary',
    name: 'Strictly necessary',
    locked: true,
    description:
      'Needed for the site to work: remembering your cookie choice and keeping the contact form secure. These are always on and never used to track you.',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description:
      'Google Tag Manager and the analytics it loads, so we can see which pages people read and where they give up. Aggregated, never used to identify you.',
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description:
      'The Meta (Facebook and Instagram) pixel, which measures whether our ads bring anyone here and lets us show ads to people who have visited before.',
  },
];

/* --------------------------------------------------------------- storage */

function read() {
  let raw;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return null; // private mode, or storage blocked outright
  }
  if (!raw) return null;
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!saved || saved.version !== VERSION || typeof saved.at !== 'number') return null;
  if ((Date.now() - saved.at) / 86400000 > MAX_AGE_DAYS) return null;
  return saved;
}

function write(choices) {
  const saved = { version: VERSION, at: Date.now(), ...choices };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // A visitor who blocks storage cannot be remembered, so they will be asked
    // again next time. Applying the choice for this page view still matters.
  }
  return saved;
}

/* ------------------------------------------------------------ the gate */

// Google reads consent state off the dataLayer, so deny everything up front and
// only ever widen it. This runs before GTM is activated, which is the whole point
// of Consent Mode: tags inside the container respect it even if GTM itself loads.
function gtagConsent(state) {
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag('consent', state, {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });
}

function gtagUpdate(choices) {
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  const marketing = choices.marketing ? 'granted' : 'denied';
  gtag('consent', 'update', {
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
    analytics_storage: choices.analytics ? 'granted' : 'denied',
  });
}

// Revive the parked tags whose category the visitor allowed. Document order is
// preserved so GTM's dataLayer bootstrap still precedes anything expecting it.
function activate(choices) {
  const parked = Array.from(document.querySelectorAll('script[type="text/plain"][data-consent]'));
  for (const tag of parked) {
    if (!choices[tag.dataset.consent]) continue;
    const live = document.createElement('script');
    for (const { name, value } of Array.from(tag.attributes)) {
      if (name === 'type' || name === 'data-consent') continue;
      live.setAttribute(name, value);
    }
    live.text = tag.textContent;
    tag.replaceWith(live);
  }
}

function apply(choices) {
  gtagUpdate(choices);
  activate(choices);
}

/* ---------------------------------------------------------------- markup */

const ids = { banner: 'lk-cookie-banner', dialog: 'lk-cookie-dialog' };

function bannerHtml() {
  return `
    <div class="lk-cc-text">
      <h2 class="lk-cc-title">Cookies on linkable.link</h2>
      <p>We use cookies that are needed to run this site. With your permission we would
      also like to use analytics cookies to see how the site is used, and marketing
      cookies to measure our ads. You can change your mind at any time.
      <a href="/legal/cookie-policy">Read our cookie policy</a>.</p>
    </div>
    <div class="lk-cc-actions">
      <button type="button" class="lk-cc-btn lk-cc-btn-primary" data-cc="accept">Accept all</button>
      <button type="button" class="lk-cc-btn lk-cc-btn-primary" data-cc="reject">Reject all</button>
      <button type="button" class="lk-cc-btn lk-cc-btn-quiet" data-cc="manage">Manage cookies</button>
    </div>`;
}

function dialogHtml(current) {
  const rows = CATEGORIES.map((c) => {
    const on = c.locked ? true : !!current[c.id];
    const attrs = c.locked ? 'checked disabled' : on ? 'checked' : '';
    return `
      <div class="lk-cc-row">
        <div class="lk-cc-row-head">
          <label class="lk-cc-switch">
            <input type="checkbox" data-cc-toggle="${c.id}" ${attrs}>
            <span class="lk-cc-track" aria-hidden="true"></span>
            <span class="lk-cc-name">${c.name}${c.locked ? ' <span class="lk-cc-always">Always on</span>' : ''}</span>
          </label>
        </div>
        <p class="lk-cc-desc">${c.description}</p>
      </div>`;
  }).join('');
  return `
    <div class="lk-cc-dialog-inner" role="dialog" aria-modal="true" aria-labelledby="lk-cc-dialog-title">
      <div class="lk-cc-dialog-head">
        <h2 id="lk-cc-dialog-title">Cookie preferences</h2>
        <button type="button" class="lk-cc-close" data-cc="close" aria-label="Close cookie preferences">&times;</button>
      </div>
      <div class="lk-cc-rows">${rows}</div>
      <div class="lk-cc-dialog-foot">
        <p class="lk-cc-note">Full detail of every cookie is in our
          <a href="/legal/cookie-policy">cookie policy</a>.</p>
        <div class="lk-cc-actions">
          <button type="button" class="lk-cc-btn lk-cc-btn-quiet" data-cc="reject">Reject all</button>
          <button type="button" class="lk-cc-btn lk-cc-btn-quiet" data-cc="accept">Accept all</button>
          <button type="button" class="lk-cc-btn lk-cc-btn-primary" data-cc="save">Save preferences</button>
        </div>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------- ui */

let lastFocused = null;

function removeBanner() {
  document.getElementById(ids.banner)?.remove();
}

function closeDialog() {
  document.getElementById(ids.dialog)?.remove();
  document.documentElement.classList.remove('lk-cc-locked');
  lastFocused?.focus?.();
  lastFocused = null;
}

function finish(choices) {
  const saved = write(choices);
  apply(saved);
  removeBanner();
  closeDialog();
  document.dispatchEvent(new CustomEvent('lk:consent', { detail: choices }));
}

const ALL_ON = { analytics: true, marketing: true };
const ALL_OFF = { analytics: false, marketing: false };

// The home page renders its own cookie bar from the design template, so it
// turns this one off; the gate, the dialog and the stored choice stay shared.
let useBanner = true;

function showBanner() {
  if (!useBanner || document.getElementById(ids.banner)) return;
  const el = document.createElement('div');
  el.id = ids.banner;
  el.className = 'lk-cc-banner';
  // Not a modal: it must not trap a keyboard user who wants to read the policy
  // first, so the page stays reachable behind it.
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', 'Cookie consent');
  el.innerHTML = bannerHtml();
  document.body.appendChild(el);
}

function openDialog() {
  if (document.getElementById(ids.dialog)) return;
  lastFocused = document.activeElement;
  const current = read() ?? ALL_OFF;
  const el = document.createElement('div');
  el.id = ids.dialog;
  el.className = 'lk-cc-dialog';
  el.innerHTML = dialogHtml(current);
  document.body.appendChild(el);
  document.documentElement.classList.add('lk-cc-locked');
  el.querySelector('.lk-cc-close')?.focus();

  // Keep focus inside the dialog while it is open, and let Escape dismiss it.
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDialog();
      if (!read()) showBanner();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      el.querySelectorAll('button, a[href], input:not([disabled])'),
    ).filter((n) => n.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  el.addEventListener('click', (e) => {
    if (e.target === el) {
      closeDialog();
      if (!read()) showBanner();
    }
  });
}

function readToggles() {
  const choices = { ...ALL_OFF };
  for (const input of document.querySelectorAll('[data-cc-toggle]')) {
    const id = input.dataset.ccToggle;
    if (id === 'necessary') continue;
    choices[id] = input.checked;
  }
  return choices;
}

function onClick(e) {
  const action = e.target.closest('[data-cc]')?.dataset.cc;
  if (!action) return;
  e.preventDefault();
  if (action === 'accept') finish({ ...ALL_ON });
  else if (action === 'reject') finish({ ...ALL_OFF });
  else if (action === 'save') finish(readToggles());
  else if (action === 'manage') {
    removeBanner();
    openDialog();
  } else if (action === 'close') {
    closeDialog();
    if (!read()) showBanner();
  }
}

/* ---------------------------------------------------------------- public */

export function consentChoice() {
  return read();
}

export function acceptAll() {
  finish({ ...ALL_ON });
}

export function rejectAll() {
  finish({ ...ALL_OFF });
}

// `banner: false` leaves asking the question to the page.
export function initConsent({ banner = true } = {}) {
  useBanner = banner;
  // Deny before anything is revived, so a tag that slips through Consent Mode
  // still finds a denied state rather than an absent one.
  gtagConsent('default');

  const saved = read();
  if (saved) apply(saved);
  else showBanner();

  document.addEventListener('click', (e) => {
    const el = e.target.closest('a[href="#cookie-settings"]');
    if (el) {
      e.preventDefault();
      removeBanner();
      openDialog();
      return;
    }
    onClick(e);
  });

  window.linkableConsent = {
    get: () => read(),
    open: openDialog,
    categories: CATEGORIES.map(({ id, name, locked }) => ({ id, name, locked: !!locked })),
  };
}
