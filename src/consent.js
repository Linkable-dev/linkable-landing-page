// Cookie consent: the banner, the preferences dialog, and the gate that decides
// whether Google Tag Manager and the Meta pixel are allowed to run at all.
//
// The gate is the part that matters. Framer hard-codes both tags as inline
// <script> in the <head>, where they execute during parse, long before this
// module (a deferred ES module) gets a turn. A banner alone would therefore be
// decorative: the cookies would already be set. So import-framer.py rewrites
// those tags to type="text/plain" with a data-consent attribute, which browsers
// refuse to execute, and activate() below revives the ones the visitor allows by
// copying them into a fresh <script>. Nothing tracking-related runs until then.
//
// Categories are deliberately coarse. "analytics" covers GTM, "marketing" covers
// the Meta pixel; anything strictly needed to serve the page needs no consent and
// no toggle. Denial is the default for both, including for a visitor who dismisses
// the banner without choosing, and "Reject all" is given the same weight as
// "Accept all" rather than being hidden behind the preferences dialog.

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

function showBanner() {
  if (document.getElementById(ids.banner)) return;
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

// The footer is Framer's, so the way back to this dialog has to be added here.
// Matching the existing legal link by href keeps it working across re-imports,
// which regenerate every class name.
//
// The href alone is not specific enough: the same link also appears in the
// Policies sidebar on the legal pages and inline in the privacy policy prose.
// Cloning those produced a sidebar row labelled "Cookie settingsPrivacy Policy",
// so the search is scoped to <footer> and to one link per footer. Framer ships
// several footers for its breakpoints and hides all but one, which is why the
// count is per element rather than per document.
function addFooterLink() {
  for (const footer of document.querySelectorAll('footer')) {
    if (footer.querySelector('[data-cc="manage-footer"]')) continue;
    const legal = footer.querySelector('a[href="/legal/privacy-policy"]');
    if (!legal) continue;

    // Each footer link sits in its own single-child wrapper, and those wrappers
    // are what the row lays out. Inserting beside the <a> therefore drops the
    // clone inside the privacy link's own wrapper, where it stacks underneath
    // instead of joining the row. Climb to the wrapper whose parent also holds
    // the terms link, which is the row itself, and clone at that level. Found by
    // structure rather than by class, because the hashed names are regenerated
    // on every re-import.
    let wrapper = legal;
    while (
      wrapper.parentElement &&
      wrapper.parentElement !== footer &&
      !wrapper.parentElement.querySelector('a[href="/legal/terms-of-service"]')
    ) {
      wrapper = wrapper.parentElement;
    }
    const row = wrapper.parentElement;
    if (!row) continue;
    // Sit after the last legal link rather than beside the privacy one, so the
    // footer reads Privacy, Terms, Cookie settings in the same order as the
    // Policies sidebar.
    const last = [...row.children].filter((el) => el.querySelector?.('a[href^="/legal/"]')).pop()
      ?? wrapper;

    const clone = wrapper.cloneNode(true);
    const link = clone.matches('a') ? clone : clone.querySelector('a');
    if (!link) continue;
    link.setAttribute('href', '#cookie-settings');
    link.setAttribute('data-cc', 'manage-footer');
    link.removeAttribute('data-framer-page-link-current');
    // Framer wraps the label in its own rich-text <p>; replace only that text so
    // the link keeps the footer's type styles.
    const label = link.querySelector('p') ?? link;
    label.textContent = 'Cookie settings';
    last.insertAdjacentElement('afterend', clone);
  }
}

// The privacy policy and terms pages come from Framer, so their Policies sidebar
// lists only those two. Someone reading the privacy policy should be able to
// reach the cookie policy from there, and editing those files would not survive
// the next import, so the entry is cloned in here. legal/cookie-policy already
// ships the link in its own markup, hence the guard.
function addSidebarEntry() {
  for (const legal of document.querySelectorAll('a[href="/legal/privacy-policy"]')) {
    // Each sidebar row is one framer-bnyjcf block; the footer and the inline
    // prose link have no such ancestor, which is what keeps them out of here.
    const entry = legal.closest('.framer-bnyjcf');
    const list = entry?.parentElement;
    if (!entry || !list) continue;
    // Guard on the list itself, so the generated cookie policy page, which
    // already ships this row, does not gain a second one.
    if (list.querySelector('a[href="/legal/cookie-policy"]')) continue;
    const clone = entry.cloneNode(true);
    const link = clone.querySelector('a[href="/legal/privacy-policy"]');
    if (!link) continue;
    link.setAttribute('href', '/legal/cookie-policy');
    link.removeAttribute('data-framer-page-link-current');
    const label = link.querySelector('p');
    if (label) label.textContent = 'Cookie Policy';
    entry.insertAdjacentElement('afterend', clone);
  }
}

/* ---------------------------------------------------------------- public */

export function initConsent() {
  // Deny before anything is revived, so a tag that slips through Consent Mode
  // still finds a denied state rather than an absent one.
  gtagConsent('default');

  const saved = read();
  if (saved) apply(saved);
  else showBanner();

  addFooterLink();
  addSidebarEntry();
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-cc="manage-footer"], a[href="#cookie-settings"]');
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
